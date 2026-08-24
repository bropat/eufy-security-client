import { MegaHTTPApi, megaLoginHash, type MegaSession } from "../megaApi";
import { megaEncryptBody, sharedKeyToAesKey, type MegaIdentity } from "../megaCrypto";

jest.mock("../../logging", () => ({
  rootHTTPLogger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

/**
 * Build a MegaHTTPApi whose network layer is fully mocked: a single `got` stub feeds
 * queued responses, and p-throttle is a pass-through. Returns the api + the list of
 * captured requests so tests can assert on headers/body.
 */
async function makeApi(responseQueue: Array<{ statusCode: number; body: string }>) {
  const requests: Array<{ url: string; headers: Record<string, string>; body?: string; json?: unknown }> = [];
  const gotStub = jest.fn(async (url: string, opts: any) => {
    requests.push({ url, headers: opts.headers ?? {}, body: opts.body, json: opts.json });
    const resp = responseQueue.shift() ?? { statusCode: 200, body: "{}" };
    // estimate_domain uses responseType "json" → got returns parsed body.
    if (opts.responseType === "json") return { statusCode: resp.statusCode, body: JSON.parse(resp.body) };
    return { statusCode: resp.statusCode, body: resp.body };
  });

  const api = new MegaHTTPApi({ ab: "fr", osType: "android", minRequestIntervalMs: 0 });
  // Bypass init()'s dynamic imports.
  (api as any).got = gotStub;
  (api as any).throttle = <A extends unknown[], R>(fn: (...a: A) => Promise<R>) => fn;
  return { api, requests, gotStub };
}

/** A deterministic fake cluster identity so we can encrypt/decrypt response bodies in tests. */
function fakeIdentity(): MegaIdentity {
  return {
    keyIdent: "00112233445566778899aabbccddeeff",
    sharedKey: "a379aa6966ef2eac85b65201f85213399ccb9a8692edb9eb333030c8bdfba364",
    clientPublicKey: "04",
  };
}

describe("MegaHTTPApi", () => {
  afterEach(() => jest.clearAllMocks());

  describe("clusterHost", () => {
    it("maps a service to the EU regional host for non-us ab", async () => {
      const { api } = await makeApi([]);
      expect(api.clusterHost("passport")).toBe("app-passport-eu-pr.eufy.com");
      expect(api.clusterHost("openapi")).toBe("app-openapi-eu-pr.eufy.com");
      expect(api.clusterHost("push")).toBe("app-push-eu-pr.eufy.com");
    });

    it("maps to us hosts when ab is us", async () => {
      const api = new MegaHTTPApi({ ab: "us" });
      expect(api.clusterHost("passport")).toBe("app-passport-us-pr.eufy.com");
    });

    it("derives the host from the estimate_domain result (server decides the region)", async () => {
      const { api } = await makeApi([]);
      // Simulate a region the bootstrap guess would NOT produce.
      (api as any).megaDomain = "mega-in-pr.eufy.com";
      expect(api.clusterHost("passport")).toBe("app-passport-in-pr.eufy.com");
      expect(api.clusterHost("openapi")).toBe("app-openapi-in-pr.eufy.com");
    });

    it("derives the browser RTC gateway from the regional security domain", async () => {
      const { api } = await makeApi([]);
      (api as any).domains = { eufy_security: "security-app.eufylife.com" };
      expect(api.getRTCSmartOrigin().href).toBe("https://security-smart.eufylife.com/");
    });
  });

  describe("megaLoginHash", () => {
    it("is salted with the openudid (different device id → different hash)", () => {
      const a = megaLoginHash("a@b.c", "pw", "udidA".padEnd(32, "0"));
      const b = megaLoginHash("a@b.c", "pw", "udidB".padEnd(32, "0"));
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[0-9a-f]{64}$/);
    });

    it("changes when credentials change, stable otherwise", () => {
      const salt = "deadbeef".padEnd(32, "0");
      expect(megaLoginHash("a@b.c", "pw", salt)).toBe(megaLoginHash("a@b.c", "pw", salt));
      expect(megaLoginHash("a@b.c", "pw", salt)).not.toBe(megaLoginHash("a@b.c", "pw2", salt));
    });
  });

  describe("openudid seeding", () => {
    it("uses the provided openudid (stable device id) instead of a fresh random one", async () => {
      const api = new MegaHTTPApi({ ab: "fr", openudid: "deadbeefdeadbeefdeadbeefdeadbeef" });
      expect((api as any).openudid).toBe("deadbeefdeadbeefdeadbeefdeadbeef");
    });

    it("generates a random openudid when none is provided", async () => {
      const api = new MegaHTTPApi({ ab: "fr" });
      expect((api as any).openudid).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe("session persistence", () => {
    it("export/restore round-trips token, user, identities and openudid", async () => {
      const { api } = await makeApi([]);
      api.setAuth("tok123", "user456");
      (api as any).tokenExpiresAt = 9999999999;
      (api as any).identities.set("app-openapi-eu-pr.eufy.com", fakeIdentity());

      const session = api.exportSession("loginhashabc");
      expect(session.cloud_token).toBe("tok123");
      expect(session.user_id).toBe("user456");
      expect(session.login_hash).toBe("loginhashabc");
      expect(session.identities!["app-openapi-eu-pr.eufy.com"].sharedKey).toBe(fakeIdentity().sharedKey);

      const { api: api2 } = await makeApi([]);
      api2.restoreSession(session);
      expect(api2.hasValidSession()).toBe(true);
      expect(api2.getIdentity("app-openapi-eu-pr.eufy.com")?.keyIdent).toBe(fakeIdentity().keyIdent);
    });

    it("hasValidSession is false without a token", async () => {
      const { api } = await makeApi([]);
      expect(api.hasValidSession()).toBe(false);
    });

    it("hasValidSession is false when the token is expired", async () => {
      const { api } = await makeApi([]);
      const session: MegaSession = {
        ab: "fr",
        openudid: "abc",
        cloud_token: "t",
        user_id: "u",
        cloud_token_expiration: 1, // far in the past (unix seconds)
      };
      api.restoreSession(session);
      expect(api.hasValidSession()).toBe(false);
    });

    it("gtoken header = md5(user_id) once authenticated", async () => {
      const { api } = await makeApi([]);
      expect((api as any).gtoken).toBeUndefined();
      api.setAuth("t", "user456");
      expect((api as any).gtoken).toMatch(/^[0-9a-f]{32}$/);
    });

    it("signs RTC WebSocket sessions without logging or returning auth headers", async () => {
      const { api, requests } = await makeApi([
        { statusCode: 200, body: JSON.stringify({ code: 0, msg: "ok", data: "rtc-signature" }) },
      ]);
      api.setAuth("token-local", "user-local");

      await expect(api.getRTCSign(new URL("https://signal.example.test"))).resolves.toBe("rtc-signature");
      expect(requests[0].url).toBe("https://signal.example.test/v1/smart/nvr/ws/sign");
      expect(requests[0].headers).toMatchObject({
        "app-name": "eufy_mega",
        "model-type": "WEB",
        "web-country": "fr",
        "x-auth-token": "token-local",
      });
      expect(api.getRTCAuth()).toMatchObject({
        authToken: "token-local",
        country: "fr",
      });
    });
  });

  describe("identity eviction on signature/negotiate errors", () => {
    it("clears cached identities on a 4404/4416 response to force a re-handshake", async () => {
      const { api } = await makeApi([
        { statusCode: 200, body: JSON.stringify({ code: 4416, msg: "signature error" }) },
      ]);
      api.setAuth("tok", "user456");
      (api as any).identities.set("app-openapi-eu-pr.eufy.com", fakeIdentity());

      await (api as any).signedPost("app-things-eu-pr.eufy.com", "/app/things/x", {}, fakeIdentity());

      expect((api as any).identities.size).toBe(0);
    });

    it("keeps identities on a normal (code:0) response", async () => {
      const { api } = await makeApi([{ statusCode: 200, body: JSON.stringify({ code: 0, msg: "ok" }) }]);
      (api as any).identities.set("app-openapi-eu-pr.eufy.com", fakeIdentity());

      await (api as any).signedPost("app-things-eu-pr.eufy.com", "/app/things/x", {}, fakeIdentity());

      expect((api as any).identities.size).toBe(1);
    });
  });

  describe("estimateDomain", () => {
    it("parses domain + product_domains and posts cleartext {ab, mode:1}", async () => {
      const { api, requests } = await makeApi([
        {
          statusCode: 200,
          body: JSON.stringify({
            code: 0,
            msg: "success!",
            data: { domain: "mega-eu-pr.eufy.com", product_domains: { eufy_security: "security-app-eu.eufylife.com" } },
          }),
        },
      ]);
      const domains = await api.estimateDomain();
      expect(domains.eufy_security).toBe("security-app-eu.eufylife.com");
      expect(requests[0].url).toContain("/passport/estimate_domain");
      expect(requests[0].json).toEqual({ ab: "fr", mode: 1 });
    });
  });

  describe("signed requests (via registerPushToken)", () => {
    beforeEach(() => {
      // Avoid a real key/exchange: pre-seed the cluster identity.
      jest.spyOn(MegaHTTPApi.prototype, "keyExchange").mockImplementation(async function (
        this: MegaHTTPApi,
        host: string
      ) {
        const id = fakeIdentity();
        (this as any).identities.set(host, id);
        return id;
      });
    });

    it("sends the decompiled push body and the full signature header set", async () => {
      const { api, requests } = await makeApi([
        { statusCode: 200, body: JSON.stringify({ code: 0, msg: "success!" }) },
      ]);
      api.setAuth("authtok", "user456");

      const res = await api.registerPushToken("fcmTOKEN123");
      expect(res.code).toBe(0);

      const req = requests.at(-1)!;
      expect(req.url).toBe("https://app-push-eu-pr.eufy.com/app/push/register_push_token");

      // Body is the encrypted blob; decrypt it back and assert the exact decompiled shape.
      const decrypted = JSON.parse(megaDecrypt(req.body!, fakeIdentity().sharedKey));
      expect(decrypted).toEqual({ token: "fcmTOKEN123", is_notification_enable: true, voip_token: "fcmTOKEN123" });

      // Header set required by the APISIX/WAF front + auth.
      expect(req.headers["app-name"]).toBe("eufy_mega");
      expect(req.headers["os-type"]).toBe("android");
      expect(req.headers["x-encryption-info"]).toBe("algo_ecdh");
      expect(req.headers["x-key-ident"]).toBe(fakeIdentity().keyIdent);
      expect(req.headers["x-signature"]).toMatch(/^[0-9a-f]{64}$/);
      expect(req.headers["x-request-ts"]).toMatch(/^\d+$/);
      expect(req.headers["x-request-once"]).toMatch(/^[0-9a-f]{32}$/);
      expect(req.headers.gtoken).toMatch(/^[0-9a-f]{32}$/);
      expect(req.headers["x-auth-token"]).toBe("authtok");
      expect(req.headers.authorization).toBe("authtok");
    });
  });

  describe("login + 2FA flow", () => {
    beforeEach(() => {
      jest.spyOn(MegaHTTPApi.prototype, "keyExchange").mockImplementation(async function (
        this: MegaHTTPApi,
        host: string
      ) {
        const id = fakeIdentity();
        (this as any).identities.set(host, id);
        return id;
      });
    });

    const encReply = (obj: unknown) =>
      JSON.stringify({
        code: 0,
        msg: "success!",
        data: megaEncryptBody(JSON.stringify(obj), sharedKeyToAesKey(fakeIdentity().sharedKey)),
      });

    it("returns code 26052 and stores a provisional token when 2FA is required", async () => {
      const { api } = await makeApi([
        {
          statusCode: 200,
          body: encReply({
            auth_token: "provisional",
            user_id: "u1",
            token_expires_at: 9999999999,
            fa_info: { step: 26052 },
          }),
        },
      ]);
      const res = await api.login("a@b.c", "pw");
      expect(res.code).toBe(26052);
      // provisional token stored so sendVerifyCode can be sent AUTHENTICATED
      expect((api as any).authToken).toBe("provisional");
    });

    it("login body carries login_id:'' (no biometric get_login_id) — decompiled flow", async () => {
      const { api, requests } = await makeApi([
        { statusCode: 200, body: encReply({ auth_token: "t", user_id: "u", token_expires_at: 9999999999 }) },
      ]);
      await api.login("a@b.c", "pw");
      const body = JSON.parse(megaDecrypt(requests.at(-1)!.body!, fakeIdentity().sharedKey));
      expect(body.login_id).toBe("");
      expect(body.email).toBe("a@b.c");
      expect(body).toHaveProperty("password");
      expect(body.client_secret_info).toHaveProperty("public_key");
    });

    it("completes login with a verify code and stores the final token + expiry", async () => {
      const { api } = await makeApi([
        { statusCode: 200, body: encReply({ auth_token: "FINAL", user_id: "u9", token_expires_at: 9999999999 }) },
      ]);
      const res = await api.login("a@b.c", "pw", "123456");
      expect(res.code).toBe(0);
      expect(api.hasValidSession()).toBe(true);
      expect((api as any).authToken).toBe("FINAL");
    });

    it("returns 100032 (captcha required) without storing a token", async () => {
      const { api } = await makeApi([
        { statusCode: 200, body: JSON.stringify({ code: 100032, msg: "captcha required" }) },
      ]);
      const res = await api.login("a@b.c", "pw");
      expect(res.code).toBe(100032);
      expect(api.hasValidSession()).toBe(false);
    });

    it("returns 100033 (captcha incorrect)", async () => {
      const { api } = await makeApi([
        { statusCode: 200, body: JSON.stringify({ code: 100033, msg: "wrong captcha" }) },
      ]);
      const res = await api.login("a@b.c", "pw", undefined, { captchaId: "cid", answer: "WRONG" });
      expect(res.code).toBe(100033);
    });

    it("login body carries the captcha answer + captcha_id when provided", async () => {
      const { api, requests } = await makeApi([
        { statusCode: 200, body: encReply({ auth_token: "t", user_id: "u", token_expires_at: 9999999999 }) },
      ]);
      await api.login("a@b.c", "pw", undefined, { captchaId: "CID7", answer: "AB12" });
      const body = JSON.parse(megaDecrypt(requests.at(-1)!.body!, fakeIdentity().sharedKey));
      expect(body.captcha_id).toBe("CID7");
      expect(body.answer).toBe("AB12");
    });
  });

  describe("getMqttConnectConfig", () => {
    it("assembles the AWS IoT config with the mandatory clientId format and topics", async () => {
      const api = new MegaHTTPApi({ ab: "fr", osType: "android", minRequestIntervalMs: 0 });
      jest.spyOn(api, "getUserMqttInfo").mockResolvedValue({
        endpoint_addr: "aiot-mqtt-eu.anker.com",
        certificate_pem: "CERT",
        private_key: "KEY",
        aws_root_ca1_pem: "CA",
        thing_name: "uid123-eufy_mega",
        certificate_id: "cid",
        user_id: "uid123",
        app_name: "eufy_mega",
      });

      const cfg = await api.getMqttConnectConfig();
      expect(cfg.endpoint).toBe("aiot-mqtt-eu.anker.com");
      expect(cfg.port).toBe(8883);
      // android-{app_name}-{user_id}-{openudid} — openudid is the api's stable 32-hex id.
      expect(cfg.clientId).toMatch(/^android-eufy_mega-uid123-[0-9a-f]{32}$/);
      expect(cfg.thingName).toBe("uid123-eufy_mega");
      expect(cfg.certificatePem).toBe("CERT");
      expect(cfg.privateKey).toBe("KEY");
      expect(cfg.awsRootCaPem).toBe("CA");
      expect(cfg.topics).toEqual({
        subCmd: "cmd/eufy_security/PN/SN/res",
        stateInfo: "synq/eufy_life/PN/SN/state_info",
        pubCmd: "cmd/eufy_security/PN/SN/req",
      });
    });
  });

  describe("generateCaptcha", () => {
    beforeEach(() => {
      jest.spyOn(MegaHTTPApi.prototype, "keyExchange").mockImplementation(async function (
        this: MegaHTTPApi,
        host: string
      ) {
        const id = fakeIdentity();
        (this as any).identities.set(host, id);
        return id;
      });
    });

    it("posts {captcha_type, biz_type} and returns the decrypted {captcha_id, item}", async () => {
      const encrypted = megaEncryptBody(
        JSON.stringify({ captcha_id: "CID", item: "data:image/png;base64,AAAA" }),
        sharedKeyToAesKey(fakeIdentity().sharedKey)
      );
      const { api, requests } = await makeApi([
        { statusCode: 200, body: JSON.stringify({ code: 0, msg: "ok", data: encrypted }) },
      ]);
      api.setAuth("t", "u");

      const c = await api.generateCaptcha();
      expect(c.captcha_id).toBe("CID");
      expect(c.item).toContain("base64");

      expect(requests.at(-1)!.url).toContain("/passport/generate/captcha");
      const sentBody = JSON.parse(megaDecrypt(requests.at(-1)!.body!, fakeIdentity().sharedKey));
      expect(sentBody).toEqual({ captcha_type: "PIC", biz_type: 0 });
    });
  });
});

// Local decrypt helper (mirror of megaDecryptBody) to keep the test self-contained.
import { megaDecryptBody } from "../megaCrypto";
function megaDecrypt(b64: string, sharedKeyHex: string): string {
  return megaDecryptBody(b64, sharedKeyToAesKey(sharedKeyHex));
}
