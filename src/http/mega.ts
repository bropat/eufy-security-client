import { createECDH, ECDH, createHmac, createHash, createCipheriv, createDecipheriv, randomUUID, randomBytes } from "crypto";

/**
 * eufy "mega" cloud API client (app-name: `eufy_mega`).
 *
 * This is the newer Anker/eufy ecosystem used by Tuya-platform devices such as the
 * FamiLock C32 (T85xx). Unlike the legacy eufy ecosystem implemented in {@link HTTPApi},
 * every request to a mega host is signed and body-encrypted with the `algo_ecdh` scheme:
 *
 *  1. A one-time ECDH (P-256) key exchange establishes a per-session `securityKey`.
 *     The exchange request itself is signed with a hard-coded, app-wide `presetKey`.
 *  2. Subsequent request bodies are AES-128-CBC encrypted with the first 16 bytes of the
 *     ECDH shared secret, and signed with HMAC-SHA256 keyed by the hex `securityKey`.
 *
 * The scheme (and the `presetKey` constant) were recovered from the eufy Security Android
 * app's `com.anker.commonkit.aknetwork` layer and verified against live captures.
 */

/** App-wide preset key for the `eufy_mega` brand (AES-128 key via hex, HMAC key via ascii). */
const PRESET_KEY = "2500a7d5617812f9d52515b2c8f20a3d";

/** Fixed server public key the cloud holds the private half of; used for login password encryption. */
const DEFAULT_SERVER_KEY =
    "04c5c00c4f8d1197cc7c3167c52bf7acb054d722f0ef08dcd7e0883236e0d72a3868d9750cb47fa4619248f3d83f0f662671dadc6e2d31c2f41db0161651c7c076";

const APP_NAME = "eufy_mega";

export interface MegaDevice {
    id: string;
    sn: string;
    name: string;
    product_code: string;
    local_key?: string;
    [key: string]: unknown;
}

export interface MegaLoginResult {
    auth_token: string;
    user_id: string;
    [key: string]: unknown;
}

/** Parsed lock command-channel MQTT credentials (see {@link MegaApi.provisionLockMqttCert}). */
export interface LockMqttCredentials {
    /** Client certificate PEM (CN `<user_id>-eufy_security`), for mutual-TLS to the broker. */
    cert: string;
    /** Client private key PEM. */
    key: string;
    /** Broker host, e.g. `security-mqtt-ie.anker.com`. */
    endpoint: string;
    /** AWS-IoT thing name (`<user_id>-eufy_security`). */
    thingName: string;
    userId: string;
    /** Amazon Root CA PEM (the broker presents a public chain; included for completeness). */
    caCert: string;
    certificateId: string;
}

type Json = Record<string, unknown>;

// ---------------------------------------------------------------------------
// crypto helpers (mirror com.anker.commonkit.aknetwork.utils.EncryptUtil)
// ---------------------------------------------------------------------------

const uuidHex = (): string => randomUUID().replace(/-/g, "");

/** Base64( IV(16) ‖ AES-CBC-PKCS7(plain, key, IV) ) — key length selects AES-128/256. */
const aesCbcEncryptIvPrepended = (plain: Buffer, key: Buffer): string => {
    const iv = randomBytes(16);
    const algo = key.length === 32 ? "aes-256-cbc" : "aes-128-cbc";
    const cipher = createCipheriv(algo, key, iv);
    return Buffer.concat([iv, cipher.update(plain), cipher.final()]).toString("base64");
};

/** Inverse of {@link aesCbcEncryptIvPrepended}: IV is the first 16 bytes of the payload. */
const aesCbcDecryptIvPrepended = (b64: string, key: Buffer): Buffer => {
    const raw = Buffer.from(b64, "base64");
    const iv = raw.subarray(0, 16);
    const algo = key.length === 32 ? "aes-256-cbc" : "aes-128-cbc";
    const decipher = createDecipheriv(algo, key, iv);
    return Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]);
};

/** AES-CBC where the IV equals the first 16 bytes of the key (login-password style, no IV prepended). */
const aesCbcKeyIv = (plain: Buffer, key: Buffer): string => {
    const algo = key.length === 32 ? "aes-256-cbc" : "aes-128-cbc";
    const cipher = createCipheriv(algo, key, key.subarray(0, 16));
    return Buffer.concat([cipher.update(plain), cipher.final()]).toString("base64");
};

const hmacHex = (keyAscii: string, msg: string): string =>
    createHmac("sha256", Buffer.from(keyAscii, "utf8")).update(msg, "utf8").digest("hex");

/**
 * Holds the ECDH keypair + negotiated server key for one host group (e.g. *.eufy.com mega).
 * One keypair is reused across all hosts that share the same `securityKey`.
 */
class MegaSession {
    private readonly ecdh: ECDH = createECDH("prime256v1");
    /** Negotiated after key exchange; falls back to the fixed key (login-only flows). */
    public serverPublicKey: string = DEFAULT_SERVER_KEY;
    public exchanged = false;

    constructor() {
        this.ecdh.generateKeys();
    }

    /** Uncompressed app public key (130 hex chars, `04‖X‖Y`). */
    appPublicKeyHex(): string {
        return this.ecdh.getPublicKey("hex");
    }

    /** Full ECDH shared secret (32 bytes) against the current server key. */
    private sharedSecret(): Buffer {
        return this.ecdh.computeSecret(Buffer.from(this.serverPublicKey, "hex"));
    }

    /** 16-byte body-encryption key (first half of the shared secret). */
    bodyKey(): Buffer {
        return this.sharedSecret().subarray(0, 16);
    }

    /** 32-hex-char security key (hex of {@link bodyKey}); used as the HMAC ascii key. */
    securityKeyHex(): string {
        return this.bodyKey().toString("hex");
    }
}

export interface MegaApiOptions {
    region?: "eu" | "us";
    country?: string;
    language?: string;
    /** Stable per-install device id; reuse the value the app registered to keep the session trusted. */
    openudid?: string;
    log?: (msg: string, ...args: unknown[]) => void;
}

export class MegaApi {
    private readonly region: "eu" | "us";
    private readonly country: string;
    private readonly language: string;
    private readonly log: (msg: string, ...args: unknown[]) => void;
    private readonly openudid: string;
    private readonly keyIdent = uuidHex();
    private readonly session = new MegaSession();

    private authToken: string | null = null;
    private userId: string | null = null;
    private gtoken: string | null = null;

    constructor(opts: MegaApiOptions = {}) {
        this.region = opts.region ?? "eu";
        this.country = opts.country ?? "US";
        this.language = opts.language ?? "en";
        this.openudid = opts.openudid ?? randomBytes(8).toString("hex");
        this.log = opts.log ?? (() => {});
    }

    private host(service: string): string {
        return `https://app-${service}-${this.region}-pr.eufy.com`;
    }

    private commonHeaders(): Record<string, string> {
        // Mirror the app's headers EXACTLY — the session token is bound to this device/locale
        // fingerprint, so mismatches yield "token not exist". The app sends both hyphen and
        // underscore variants of several headers.
        const h: Record<string, string> = {
            "app-name": APP_NAME,
            "content-type": "application/json",
            country: this.country,
            language: this.language,
            openudid: this.openudid,
            "model-type": "PHONE",
            "os-type": "android",
            os_type: "android",
            "os-version": "35",
            os_version: "35",
            "phone-model": "ONEPLUS A5010",
            phone_model: "ONEPLUS A5010",
            "app-version": "6.0.51_26722",
            app_version: "6.0.51_26722",
            ab_code: "AE",
            "test-flag": "false",
            accept: "application/json",
            "accept-charset": "UTF-8",
            "x-replay-info": "replay",
            "x-encryption-info": "algo_ecdh",
            "x-key-ident": this.keyIdent,
            "user-agent": "ktor-client",
        };
        if (this.authToken) {
            h["x-auth-token"] = this.authToken;
            h["authorization"] = this.authToken;
        }
        if (this.gtoken) h["gtoken"] = this.gtoken;
        return h;
    }

    /**
     * One-time ECDH key exchange. The request is signed with the {@link PRESET_KEY};
     * the response carries the server public key (encrypted with the same preset key).
     */
    async keyExchange(): Promise<void> {
        const clientPublicKey = aesCbcEncryptIvPrepended(
            Buffer.from(this.session.appPublicKeyHex(), "utf8"),
            Buffer.from(PRESET_KEY, "hex"),
        );
        const ts = Math.floor(Date.now() / 1000).toString();
        const once = uuidHex();
        const signature = hmacHex(PRESET_KEY, `${ts}+${once}+${clientPublicKey}`);

        const url = `${this.host("openapi")}/openapi/oauth/key/exchange`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                ...this.commonHeaders(),
                "x-request-ts": ts,
                "x-request-once": once,
                "x-signature": signature,
            },
            body: JSON.stringify({ client_public_key: clientPublicKey }),
        });
        const body = (await res.json()) as { code: number; msg?: string; data?: { server_public_key: string } };
        this.log(`keyExchange -> code=${body.code} msg=${body.msg ?? ""}`);
        if (body.code !== 0 || !body.data?.server_public_key) {
            throw new Error(`key exchange failed: ${JSON.stringify(body)}`);
        }
        const serverPubHex = aesCbcDecryptIvPrepended(body.data.server_public_key, Buffer.from(PRESET_KEY, "hex")).toString("utf8");
        this.session.serverPublicKey = serverPubHex;
        this.session.exchanged = true;
        this.log(`keyExchange ok, securityKey=${this.session.securityKeyHex()}`);
    }

    /** Signed + body-encrypted request to a mega host. Returns the decrypted `data` payload. */
    private async signedRequest(service: string, path: string, payload: Json | null, baseUrl?: string, extraHeaders?: Record<string, string>): Promise<unknown> {
        if (!this.session.exchanged) throw new Error("keyExchange() must run first");
        const ts = Math.floor(Date.now() / 1000).toString();
        const once = uuidHex();
        let encBody = "";
        if (payload !== null) {
            encBody = aesCbcEncryptIvPrepended(Buffer.from(JSON.stringify(payload), "utf8"), this.session.bodyKey());
        }
        const signMsg = encBody ? `${ts}+${once}+${encBody}` : `${ts}+${once}`;
        const signature = hmacHex(this.session.securityKeyHex(), signMsg);

        const res = await fetch(`${baseUrl ?? this.host(service)}${path}`, {
            method: "POST",
            headers: {
                ...this.commonHeaders(),
                "x-request-ts": ts,
                "x-request-once": once,
                "x-signature": signature,
                ...extraHeaders,
            },
            body: encBody,
        });
        const text = await res.text();
        let env: { code: number; msg?: string; data?: string; signature?: string };
        try {
            env = JSON.parse(text);
        } catch {
            throw new Error(`${path} -> HTTP ${res.status} non-JSON: ${text.slice(0, 200)}`);
        }
        this.log(`${path} -> code=${env.code} msg=${env.msg ?? ""}`);
        if (env.code !== 0) throw new Error(`${path} failed: ${JSON.stringify(env).slice(0, 300)}`);
        if (!env.data) return null;
        const plain = aesCbcDecryptIvPrepended(env.data, this.session.bodyKey()).toString("utf8");
        return JSON.parse(plain);
    }

    /**
     * The account's A/B region group (e.g. "AE"). Returned by {@link getClientRealCode}.
     * CRITICAL: this value MUST be sent as the `ab` field of the login body — without it the
     * passport issues a token that every mega-gateway host rejects with 401 "token not exist".
     */
    async getClientRealCode(email: string): Promise<string> {
        const data = (await this.signedRequest("passport", "/passport/get_client_real_code", { email })) as {
            ab_code?: string;
        };
        return data?.ab_code ?? "";
    }

    /** Pre-login probe; also confirms the email is a registered/activated account. */
    async validateEmail(email: string): Promise<{ status?: string; enc_text?: string; [k: string]: unknown }> {
        return (await this.signedRequest("passport", "/passport/validate_email", { email })) as {
            status?: string;
            enc_text?: string;
        };
    }

    /**
     * Passport login. Mirrors NetworkConfigManager.login: email + ECDH-encrypted password.
     *
     * The `ab` (region group) field is mandatory: the token is only registered in the mega
     * gateway's session store when login carries the account's ab_code. If not supplied it is
     * resolved automatically via {@link getClientRealCode}.
     */
    async login(email: string, password: string, abCode?: string): Promise<MegaLoginResult> {
        const ab = abCode ?? ((await this.getClientRealCode(email)) || "AE");
        await this.validateEmail(email);

        // password encryption: AES-256-CBC(password, key=ECDH(app, fixed-server-key), iv=key[:16])
        const loginEcdh = createECDH("prime256v1");
        loginEcdh.generateKeys();
        const shared = loginEcdh.computeSecret(Buffer.from(DEFAULT_SERVER_KEY, "hex"));
        const encPassword = aesCbcKeyIv(Buffer.from(password, "utf8"), shared);

        const payload: Json = {
            email,
            password: encPassword,
            client_secret_info: { public_key: loginEcdh.getPublicKey("hex") },
            ab,
        };
        const data = (await this.signedRequest("passport", "/passport/login", payload)) as MegaLoginResult;
        this.authToken = data.auth_token;
        this.userId = data.user_id;
        if (this.userId) {
            this.gtoken = createHash("md5").update(Buffer.from(this.userId, "utf8")).digest("hex");
        }
        this.log(`login ok user_id=${this.userId} ab=${ab}`);
        return data;
    }

    /**
     * Fetch thing-model definitions (actions/properties) for the given product codes.
     * For the C32 use `["T85L1"]`. Note: this returns the product *model*, not instances.
     */
    async getThingsList(productCodes: string[]): Promise<unknown[]> {
        const data = (await this.signedRequest("things", "/app/things/get_things_list", { product_codes: productCodes })) as { things_list?: unknown[] };
        return data.things_list ?? [];
    }

    /** AWS-IoT MQTT credentials (mutual-TLS cert + key + endpoint) for the command/event channel. */
    async getUserMqttInfo(): Promise<Record<string, unknown>> {
        return (await this.signedRequest("devicemanage", "/app/devicemanage/get_user_mqtt_info", {})) as Record<string, unknown>;
    }

    /**
     * Inject an existing eufy_security ecosystem session (auth token + user id) — e.g. from the
     * main HTTPApi login. Required for endpoints that authenticate against the eufy_security
     * backend (such as {@link registerIotMqtt}) rather than the mega passport.
     */
    setSession(authToken: string, userId: string): void {
        this.authToken = authToken;
        this.userId = userId;
        this.gtoken = createHash("md5").update(Buffer.from(userId, "utf8")).digest("hex");
    }

    /**
     * Provision the legacy eufy_security MQTT client certificate used for the lock command
     * channel (broker security-mqtt-ie.anker.com, mutual-TLS). Returns the per-user client
     * cert + private key (CN `<user_id>-eufy_security`). Host is mega-<region>-pr.eufy.com.
     * Requires a eufy_security session token (see {@link setSession}).
     */
    async registerIotMqtt(): Promise<Record<string, unknown>> {
        const baseUrl = `https://mega-${this.region}-pr.eufy.com`;
        // the shared mega gateway dispatches this endpoint to the right backend by app-tab/category
        return (await this.signedRequest("", "/app/mqtt/register/iot", {}, baseUrl, { "app-tab": "eufy_security", category: "eufy_security" })) as Record<string, unknown>;
    }

    /**
     * Provision and parse the lock command-channel MQTT credentials in one call, returning a
     * shape ready to hand to {@link EslClient}. Must be called after {@link login} (or
     * {@link setSession}) so the request carries a registered eufy_security token.
     */
    async provisionLockMqttCert(): Promise<LockMqttCredentials> {
        const r = (await this.registerIotMqtt()) as Record<string, string>;
        return {
            cert: r.certificate_pem,
            key: r.private_key,
            endpoint: r.endpoint_addr,
            thingName: r.thing_name,
            userId: r.user_id,
            caCert: r.amazon_root_ca_1_pem,
            certificateId: r.certificate_id,
        };
    }

    /**
     * Fetch the per-device secret keys (DSK) used to encrypt smart-lock commands.
     * NOTE: this is OWNER-ONLY — a shared/member account receives code 20004
     * ("Only the owner can change settings").
     */
    async getDskKeys(deviceSns: string[]): Promise<unknown> {
        return this.signedRequest("devicerelation", "/app/devicerelation/get_dsk_keys", {
            device_dsks: deviceSns.map((sn) => ({ device_sn: sn, invalid_dsk: "" })),
        });
    }
}
