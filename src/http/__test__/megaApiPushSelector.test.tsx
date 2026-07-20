import { MegaHTTPApi, megaLoginHash } from "../megaApi";

jest.mock("../../logging", () => {
  const stub = { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), trace: jest.fn() };
  return new Proxy({}, { get: () => stub });
});

/**
 * Exercises the REAL MegaTransition.registerMegaPushToken with a stubbed mega client, so the
 * best-effort v6-push wiring is genuinely covered:
 *  - no register when there is no valid v6 session (not-yet-migrated account);
 *  - register when a valid session exists;
 *  - a v6 failure is swallowed (never propagates — legacy push is unaffected).
 */
import { MegaTransition, MegaTransitionHost } from "../megaTransition";
import { ResponseErrorCode } from "../types";

type MegaStub = Pick<MegaHTTPApi, "hasValidSession" | "registerPushToken" | "exportSession">;

const openudid = "abc123".padEnd(32, "0");
const session = {
  ab: "US",
  openudid,
  cloud_token: "cloud-token",
  cloud_token_expiration: 9999999999,
  user_id: "user-id",
};

function withSession(mega: Pick<MegaHTTPApi, "hasValidSession" | "registerPushToken">): MegaStub {
  return {
    ...mega,
    exportSession: jest.fn().mockReturnValue(session),
  } as unknown as MegaStub;
}

function makeTransition(mega: MegaStub | undefined, opts?: { failGetMega?: boolean }) {
  const host = {
    config: { username: "user@example.com", password: "pass", country: "US" },
    persistentData: { openudid },
    get api() {
      return undefined as never;
    },
    writePersistentData: jest.fn(),
    emitTfaRequest: jest.fn(),
    emitCaptchaRequest: jest.fn(),
    legacyConnect: jest.fn(async () => {}),
    onAPIConnect: jest.fn(async () => {}),
    onConnectionError: jest.fn(),
  } as unknown as MegaTransitionHost;

  const transition = new MegaTransition(host);
  (transition as unknown as { getMegaApi: () => Promise<MegaHTTPApi> }).getMegaApi = jest.fn(async () => {
    if (opts?.failGetMega) throw new Error("init failed");
    return mega as MegaHTTPApi;
  });
  return { transition, host };
}

describe("MegaTransition.registerMegaPushToken (v6 best-effort)", () => {
  afterEach(() => jest.clearAllMocks());

  it("registers when a valid v6 session exists (returns true)", async () => {
    const mega = withSession({
      hasValidSession: () => true,
      registerPushToken: jest.fn().mockResolvedValue({ code: 0, msg: "ok" }),
    });
    const { transition, host } = makeTransition(mega);
    await expect(transition.registerMegaPushToken("tok")).resolves.toBe(true);
    expect(mega.registerPushToken).toHaveBeenCalledWith("tok");
    expect(mega.exportSession).toHaveBeenCalledWith(megaLoginHash("user@example.com", "pass", openudid));
    expect(host.persistentData.megaApi).toBe(session);
    expect(host.writePersistentData).toHaveBeenCalledTimes(1);
  });

  it("retries once after a cached identity is rejected and persists the refreshed session", async () => {
    const mega = withSession({
      hasValidSession: () => true,
      registerPushToken: jest
        .fn()
        .mockResolvedValueOnce({ code: ResponseErrorCode.CODE_NEED_NEGOTIATE_KEY, msg: "get identity error" })
        .mockResolvedValueOnce({ code: 0, msg: "ok" }),
    });
    const { transition, host } = makeTransition(mega);
    await expect(transition.registerMegaPushToken("tok")).resolves.toBe(true);
    expect(mega.registerPushToken).toHaveBeenCalledTimes(2);
    expect(mega.registerPushToken).toHaveBeenNthCalledWith(1, "tok");
    expect(mega.registerPushToken).toHaveBeenNthCalledWith(2, "tok");
    expect(host.persistentData.megaApi).toBe(session);
    expect(host.writePersistentData).toHaveBeenCalledTimes(1);
  });

  it("skips register when there is no valid session (returns false)", async () => {
    const mega = withSession({ hasValidSession: () => false, registerPushToken: jest.fn() });
    const { transition } = makeTransition(mega);
    await expect(transition.registerMegaPushToken("tok")).resolves.toBe(false);
    expect(mega.registerPushToken).not.toHaveBeenCalled();
    expect(mega.exportSession).not.toHaveBeenCalled();
  });

  it("returns false (never throws) when the v6 register rejects (legacy push unaffected)", async () => {
    const mega = withSession({
      hasValidSession: () => true,
      registerPushToken: jest.fn().mockRejectedValue(new Error("401")),
    });
    const { transition } = makeTransition(mega);
    await expect(transition.registerMegaPushToken("tok")).resolves.toBe(false);
  });

  it("returns false (never throws) when getMegaApi itself fails", async () => {
    const { transition } = makeTransition(undefined, { failGetMega: true });
    await expect(transition.registerMegaPushToken("tok")).resolves.toBe(false);
  });

  it("returns false on a non-zero register code", async () => {
    const mega = withSession({
      hasValidSession: () => true,
      registerPushToken: jest.fn().mockResolvedValue({ code: 10000, msg: "fail" }),
    });
    const { transition } = makeTransition(mega);
    await expect(transition.registerMegaPushToken("tok")).resolves.toBe(false);
  });
});
