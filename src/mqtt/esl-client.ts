/**
 * Minimal MQTT client for the eufy_security lock command channel (FamiLock C32 / T85L1).
 *
 * Connects to the legacy Anker broker over mutual-TLS, publishes ESL commands on
 * `cmd/eufy_security/<product>/<sn>/req`, and resolves with the lock's reply from `.../res`.
 * The client cert/key are provisioned via MegaApi.registerIotMqtt() (or extracted from the app
 * keystore integration_eufy_security.bks, password "eufy_password").
 */
import mqtt, { MqttClient } from "mqtt";
import { randomBytes } from "crypto";
import { buildLockPayload, decodeResponse, decodeEvent, EslEvent, EslOpcode, ESL_API_ONOFF } from "./esl";

const BROKER_HOST = "security-mqtt-ie.anker.com";
const BROKER_PORT = 8883;

/** Extract the inner `lock_payload` hex from a raw `/res` MQTT envelope, or undefined. */
function extractLockPayload(payload: Buffer): string | undefined {
    try {
        const env = JSON.parse(payload.toString("utf8"));
        const pl = typeof env.payload === "string" ? JSON.parse(env.payload) : env.payload;
        const inner = JSON.parse(Buffer.from(pl?.trans ?? "", "base64").toString("utf8"));
        const lp = inner?.payload?.lock_payload;
        return typeof lp === "string" ? lp : undefined;
    } catch {
        return undefined;
    }
}

export interface EslClientOptions {
    /** Client certificate PEM (CN `<userId>-eufy_security`). */
    cert: string | Buffer;
    /** Client private key PEM. */
    key: string | Buffer;
    /** Our (member or owner) user id — used to form a unique MQTT clientId. */
    userId: string;
    /** Device owner's user id (the key/TLV are derived from this). */
    ownerId: string;
    deviceSn: string;
    /** Product code prefix in the topic, e.g. "T85L1". */
    productCode: string;
    /** Operator name recorded in the lock's event log (defaults to "Autohome"). */
    userName?: string;
    /** Operator slot id recorded in the lock's event log (defaults to 1). */
    shortUserId?: number;
    log?: (msg: string, ...args: unknown[]) => void;
}

export class EslClient {
    private client?: MqttClient;
    private readonly opts: EslClientOptions;
    private readonly reqTopic: string;
    private readonly resTopic: string;
    private readonly log: (msg: string, ...args: unknown[]) => void;
    // The lock allows only one command per connection (a fresh client is used per command),
    // so a single in-flight waiter suffices. The header msgType byte is a constant (0x23), not
    // a counter, so it can't disambiguate concurrent commands anyway.
    private pending?: (hex: string) => void;

    constructor(opts: EslClientOptions) {
        this.opts = opts;
        this.log = opts.log ?? (() => {});
        this.reqTopic = `cmd/eufy_security/${opts.productCode}/${opts.deviceSn}/req`;
        this.resTopic = `cmd/eufy_security/${opts.productCode}/${opts.deviceSn}/res`;
    }

    async connect(): Promise<void> {
        const clientId = `android-eufy_security-${this.opts.userId}-${randomBytes(4).toString("hex")}-${Math.floor(Date.now() / 1000)}`;
        this.client = mqtt.connect(`mqtts://${BROKER_HOST}:${BROKER_PORT}`, {
            cert: this.opts.cert,
            key: this.opts.key,
            clientId,
            protocolVersion: 4,
            reconnectPeriod: 0,
            connectTimeout: 15000,
            // broker presents a public GoDaddy cert -> standard verification works
        });
        await new Promise<void>((resolve, reject) => {
            this.client!.on("connect", () => {
                this.client!.subscribe(this.resTopic, { qos: 1 }, (err) => (err ? reject(err) : resolve()));
            });
            this.client!.on("error", reject);
        });
        this.client.on("message", (topic, payload) => this.onMessage(topic, payload));
        this.log(`ESL connected, clientId=${clientId}`);
    }

    private onMessage(topic: string, payload: Buffer): void {
        if (!topic.endsWith("/res")) return;
        const lp = extractLockPayload(payload);
        if (!lp) return;
        // Ignore async event frames here (handled by EslEventListener); only resolve command ACKs.
        if (decodeEvent(lp)) return;
        const waiter = this.pending;
        if (waiter) {
            this.pending = undefined;
            waiter(lp);
        }
    }

    /** Send a command and wait for the lock's reply (resolves with the decoded ACK, or rejects on timeout). */
    private async send(opcode: EslOpcode, api: number, includeUser: boolean, timeoutMs = 10000): Promise<{ ok: boolean; body: string }> {
        if (!this.client) throw new Error("connect() first");
        const ts = Math.floor(Date.now() / 1000);
        const lockPayload = buildLockPayload({
            accountId: this.opts.ownerId, deviceSn: this.opts.deviceSn, ts, opcode, includeUser,
            userName: this.opts.userName, shortUserId: this.opts.shortUserId,
        });
        const trans = Buffer.from(JSON.stringify({
            cmd: 1940, mChannel: 0, mValue3: 0,
            payload: { apiCommand: api, lock_payload: lockPayload, seq_num: ts, time: ts },
        })).toString("base64");
        const msg = JSON.stringify({
            head: { version: "1.0.0.1", client_id: this.client.options.clientId, sess_id: randomBytes(2).toString("hex"),
                msg_seq: 2, seed: randomBytes(16).toString("hex"), timestamp: ts, cmd_status: 2, cmd: 9, sign_code: 0 },
            payload: JSON.stringify({ account_id: this.opts.ownerId, device_sn: this.opts.deviceSn, trans }),
        });

        const replyHex = await new Promise<string>((resolve, reject) => {
            const t = setTimeout(() => { this.pending = undefined; reject(new Error("ESL command timeout")); }, timeoutMs);
            this.pending = (hex) => { clearTimeout(t); resolve(hex); };
            this.client!.publish(this.reqTopic, msg, { qos: 1 }, (err) => { if (err) { clearTimeout(t); reject(err); } });
        });
        const decoded = decodeResponse(replyHex, this.opts.ownerId, this.opts.deviceSn, ts);
        return { ok: decoded.ok, body: decoded.body.toString("hex") };
    }

    unlock(): Promise<{ ok: boolean; body: string }> { return this.send(EslOpcode.Unlock, ESL_API_ONOFF, true); }
    lock(): Promise<{ ok: boolean; body: string }> { return this.send(EslOpcode.Lock, ESL_API_ONOFF, true); }

    disconnect(): void { this.client?.end(true); }
}

export interface EslEventListenerOptions {
    cert: string | Buffer;
    key: string | Buffer;
    /** Our user id — used to form a unique MQTT clientId. */
    userId: string;
    deviceSn: string;
    /** Product code prefix in the topic, e.g. "T85L1". */
    productCode: string;
    /** Called for each decoded async lock event (state changes incl. the auto-lock). */
    onEvent: (event: EslEvent) => void;
    log?: (msg: string, ...args: unknown[]) => void;
}

/**
 * Persistent subscriber for the FamiLock's asynchronous event frames.
 *
 * The FamiLock has no P2P/station feed and the bridge's standard MQTT push service
 * (eufylife.com) never sees it, so the lock's live state changes — a remote unlock and, a few
 * seconds later, the auto-lock that re-locks the latch — are only observable as plaintext event
 * frames the lock publishes on its `cmd/eufy_security/<product>/<sn>/res` topic. This keeps a
 * long-lived mutual-TLS connection subscribed to that topic and decodes those frames so the
 * device's `lockStatus`/`locked` properties stay in sync with reality. It auto-reconnects.
 */
export class EslEventListener {
    private client?: MqttClient;
    private readonly opts: EslEventListenerOptions;
    private readonly resTopic: string;
    private readonly log: (msg: string, ...args: unknown[]) => void;

    constructor(opts: EslEventListenerOptions) {
        this.opts = opts;
        this.log = opts.log ?? (() => {});
        this.resTopic = `cmd/eufy_security/${opts.productCode}/${opts.deviceSn}/res`;
    }

    start(): void {
        const clientId = `android-eufy_security-${this.opts.userId}-evt-${randomBytes(4).toString("hex")}`;
        this.client = mqtt.connect(`mqtts://${BROKER_HOST}:${BROKER_PORT}`, {
            cert: this.opts.cert,
            key: this.opts.key,
            clientId,
            protocolVersion: 4,
            reconnectPeriod: 5000,
            connectTimeout: 15000,
        });
        this.client.on("connect", () => {
            this.client!.subscribe(this.resTopic, { qos: 1 }, (err) =>
                this.log(err ? `ESL event listener subscribe error: ${err.message}` : `ESL event listener subscribed (${this.resTopic})`)
            );
        });
        this.client.on("message", (_topic, payload) => {
            const lp = extractLockPayload(payload);
            if (!lp) return;
            const ev = decodeEvent(lp);
            if (ev) {
                this.log(`ESL event: status=${ev.status} a1=${ev.a1} a3=${ev.a3}`);
                this.opts.onEvent(ev);
            }
        });
        this.client.on("error", (err) => this.log(`ESL event listener error: ${err.message}`));
    }

    stop(): void {
        this.client?.end(true);
        this.client = undefined;
    }
}
