import { HTTPApi } from "./api";
import { MegaHTTPApi, megaLoginHash } from "./megaApi";
import { rootMainLogger } from "../logging";
import type { HTTPApiPersistentData, LoginOptions } from "./interfaces";
import type { EufySecurityConfig, EufySecurityPersistentData } from "../interfaces";
import { ResponseErrorCode } from "./types";
import { ensureError } from "../error";
import { getError } from "../utils";
import type { MegaDeviceInventory } from "./megaInterfaces";

/**
 * Everything specific to the transitional v6 "eufy_mega" backend lives in this single file so it can
 * be removed in one block once a native v6 data layer (the new library) takes over.
 *
 * {@link MegaTransition} is the connect coordinator: v6-first login, legacy as best-effort
 * afterwards, the app-ready signal fired exactly once at the end. It owns all the v6 state (mega
 * client, pending challenge, serialisation) and talks to {@link EufySecurity} only through the
 * narrow {@link MegaTransitionHost} surface, so neither file leaks the other's internals.
 *
 * For now v6 is used only for login + FCM push registration: a migrated account logs in there and
 * receives events over its push channel, while the data layer keeps using the legacy transport. The
 * data endpoints differ on v6 (signed/encrypted, different paths/bodies) and belong in the new lib,
 * so we deliberately do NOT route legacy endpoints through mega here.
 *
 * Nothing here modifies {@link MegaHTTPApi}: this layer only consumes its public API.
 */

/** The result of one v6 login attempt. */
export type MegaLoginResult = "ok" | "tfa_required" | "captcha_required" | "locked" | "failed";

/** Which backend a submitted 2FA code / captcha must be routed to. */
export type ChallengeSource = "mega" | "legacy";

/**
 * The narrow surface {@link MegaTransition} needs from {@link EufySecurity}. It is satisfied with a
 * small closure object (not `this`) so neither side has to expose private members nor import the
 * other — keeping the transition layer self-contained and removable.
 */
export interface MegaTransitionHost {
  readonly config: EufySecurityConfig;
  readonly persistentData: EufySecurityPersistentData;
  /** The live (legacy) transport, set once by {@link MegaTransition.createTransport}. */
  readonly api: HTTPApi;
  writePersistentData(): void;
  /** Re-emit the 2FA prompt to the consumer (ws / plugin). */
  emitTfaRequest(): void;
  /** Re-emit the captcha prompt to the consumer (ws / plugin). */
  emitCaptchaRequest(id: string, captcha: string): void;
  /** The original upstream `connect()` (login + trust device), unchanged. */
  legacyConnect(options?: LoginOptions): Promise<void>;
  /** Signal the app as connected (refresh + push + mqtt). Fired once at the end of the sequence. */
  onAPIConnect(): Promise<void>;
  onConnectionError(error: Error): void;
}

/**
 * Coordinates the v6-first login sequence. The v6 "eufy_mega" backend is the primary login (it
 * carries push and is where the account is heading); the legacy login runs afterwards as
 * best-effort and never blocks. Each backend has its OWN 2FA email + captcha; whichever asks
 * records itself in {@link pendingChallenge} so the code/captcha from the next connect() is routed
 * to the backend that asked for it. The app-ready signal fires ONCE, at the very end, and only if a
 * login succeeded.
 */
export class MegaTransition {
  private readonly host: MegaTransitionHost;
  private megaApi?: MegaHTTPApi;
  /**
   * Which backend a submitted 2FA code / captcha must be routed to. Set when WE emit the challenge,
   * so the next connect({verifyCode|captcha}) goes to the backend that asked for it — no guessing.
   * `undefined` = no challenge outstanding (start a fresh sequence).
   */
  private pendingChallenge?: ChallengeSource;
  /** Whether the v6 login succeeded this sequence (gates signalling the app as connected). */
  private megaLoggedIn = false;
  /** Serialises connect(): concurrent calls await the in-flight one instead of racing the sequence. */
  private connectInProgress?: Promise<void>;

  constructor(host: MegaTransitionHost) {
    this.host = host;
  }

  /** Record that the LEGACY login asked for a code/captcha (called from the host's api-event hooks). */
  public recordLegacyChallenge(): void {
    this.pendingChallenge = "legacy";
  }

  /**
   * Build the live transport. Today this is just the upstream legacy {@link HTTPApi}; the v6 mega
   * client is created lazily on demand (login / push) via {@link getMegaApi}. Kept as a single
   * factory so the transport can be swapped here if v6 ever needs to drive data requests too.
   */
  public async createTransport(persistentHttpApi: HTTPApiPersistentData | undefined): Promise<HTTPApi> {
    return HTTPApi.initialize(
      this.host.config.country!,
      this.host.config.username!,
      this.host.config.password!,
      persistentHttpApi
    );
  }

  /**
   * Lazily create (and restore) the v6 mega client. The persisted session (token ~30 days) is
   * reused so normal startups need no extra login/2FA; it is dropped if the credentials changed.
   */
  public async getMegaApi(): Promise<MegaHTTPApi> {
    if (!this.megaApi) {
      this.megaApi = new MegaHTTPApi({
        ab: this.host.config.country ?? "US",
        osType: "android",
        phoneModel: this.host.config.trustedDeviceName,
        openudid: this.host.persistentData.openudid || undefined,
      });
      await this.megaApi.init();
      const saved = this.host.persistentData.megaApi;
      if (saved) {
        const currentHash = megaLoginHash(
          this.host.config.username,
          this.host.config.password,
          this.host.persistentData.openudid
        );
        if (saved.login_hash && saved.login_hash !== currentHash) {
          rootMainLogger.debug("v6: credentials changed since last login, ignoring stored mega session");
        } else {
          this.megaApi.restoreSession(saved);
        }
      }
    }
    return this.megaApi;
  }

  /**
   * Register the FCM token on the v6 backend, best-effort. No-ops with a log when there is no valid
   * v6 session yet (not-yet-migrated account); a v6 failure is swallowed so legacy push is unaffected.
   */
  public async registerMegaPushToken(token: string): Promise<boolean> {
    try {
      const mega = await this.getMegaApi();
      if (!mega.hasValidSession()) {
        rootMainLogger.debug("v6 push: no valid mega session yet, skipping register (legacy still active)");
        return false;
      }
      const result = await mega.registerPushToken(token);
      if (result.code === 0) {
        rootMainLogger.info("v6 push: FCM token registered on the eufy_mega backend");
        return true;
      }
      rootMainLogger.warn("v6 push: register_push_token returned a non-zero code", {
        code: result.code,
        msg: result.msg,
      });
      return false;
    } catch (err) {
      rootMainLogger.warn("v6 push: register failed (legacy push unaffected)", { error: getError(ensureError(err)) });
      return false;
    }
  }

  /** Fetch the v6 inventory used to discover RTC stations and their signaling inputs. */
  public async getMegaDeviceInventory(): Promise<MegaDeviceInventory | undefined> {
    try {
      const mega = await this.getMegaApi();
      if (!mega.hasValidSession()) return undefined;
      return await mega.getDevsListDecrypted();
    } catch (err) {
      rootMainLogger.warn("v6 device inventory refresh failed (legacy inventory remains active)", {
        error: getError(ensureError(err)),
      });
      return undefined;
    }
  }

  /**
   * Authenticate against the v6 backend.
   *  1. first call -> on `26052` triggers the email code and returns "tfa_required"; on a captcha
   *     challenge it emits "captcha request" and returns "captcha_required".
   *  2. with a code/captcha -> completes login; the session is persisted (token ~30 days) so later
   *     startups reuse it with no relogin/2FA.
   *
   * Backend-enforced lockout (too many incorrect / max login limit) is surfaced as "locked" so the
   * caller stops retrying instead of deepening the lockout.
   */
  public async loginMega(
    verifyCode?: string,
    captcha?: { captchaId: string; answer: string }
  ): Promise<MegaLoginResult> {
    try {
      const mega = await this.getMegaApi();
      if (mega.hasValidSession() && !verifyCode && !captcha) return "ok";

      await mega.estimateDomain();
      await mega.keyExchange(mega.clusterHost("openapi"));
      const result = await mega.login(this.host.config.username!, this.host.config.password!, verifyCode, captcha);

      if (result.code === ResponseErrorCode.CODE_NEED_VERIFY_CODE) {
        await mega.sendVerifyCode();
        this.pendingChallenge = "mega";
        this.host.emitTfaRequest();
        rootMainLogger.info("v6 login: email 2FA required — call loginMega(code) with the received code");
        return "tfa_required";
      }
      if (
        result.code === ResponseErrorCode.LOGIN_NEED_CAPTCHA ||
        result.code === ResponseErrorCode.LOGIN_CAPTCHA_ERROR
      ) {
        const c = await mega.generateCaptcha();
        this.pendingChallenge = "mega";
        this.host.emitCaptchaRequest(c.captcha_id, c.item);
        rootMainLogger.info("v6 login: captcha required — call loginMega(undefined, {captchaId, answer})");
        return "captcha_required";
      }
      if (
        result.code === ResponseErrorCode.CODE_PASSWORD_TOO_MANY_INCORRECT ||
        result.code === ResponseErrorCode.CODE_PASSWORD_WRONG_FIVE_TIMES ||
        result.code === ResponseErrorCode.CODE_MAX_LOGIN_LIMIT
      ) {
        rootMainLogger.warn("v6 login temporarily locked by the backend — stop retrying", {
          code: result.code,
          msg: result.msg,
        });
        return "locked";
      }
      if (result.code !== 0) {
        rootMainLogger.warn("v6 login failed", { code: result.code, msg: result.msg });
        return "failed";
      }
      this.host.persistentData.megaApi = mega.exportSession(
        megaLoginHash(this.host.config.username, this.host.config.password, this.host.persistentData.openudid)
      );
      this.host.writePersistentData();
      rootMainLogger.info("v6 login: success, mega session persisted");
      return "ok";
    } catch (err) {
      rootMainLogger.error("v6 login error", { error: getError(ensureError(err)) });
      return "failed";
    }
  }

  /** Serialised connect(): concurrent callers await the in-flight run instead of racing it. */
  public connect(options?: LoginOptions): Promise<void> {
    if (this.connectInProgress) return this.connectInProgress;
    this.connectInProgress = this.runConnect(options).finally(() => {
      this.connectInProgress = undefined;
    });
    return this.connectInProgress;
  }

  private async runConnect(options?: LoginOptions): Promise<void> {
    const megaCaptcha = options?.captcha
      ? { captchaId: options.captcha.captchaId, answer: options.captcha.captchaCode }
      : undefined;

    // PHASE 1 — v6 first. Run it unless a challenge is currently outstanding for the LEGACY side.
    if (this.pendingChallenge !== "legacy") {
      const megaResult = await this.loginMega(options?.verifyCode, megaCaptcha);
      if (megaResult === "tfa_required" || megaResult === "captcha_required") {
        // loginMega already recorded pendingChallenge="mega" and prompted the consumer.
        return;
      }
      this.megaLoggedIn = megaResult === "ok";
      this.pendingChallenge = undefined;
    }

    // PHASE 2 — legacy afterwards, best-effort. A code/captcha just used by mega is not valid here;
    // the legacy login emits its OWN tfa/captcha event (which records pendingChallenge="legacy" via
    // the host) and we wait for the next connect(). If legacy has been decommissioned, its login
    // simply fails and we carry on with v6 only.
    if (!this.host.api.isConnected()) {
      const legacyOptions =
        this.pendingChallenge === "legacy"
          ? options
          : ({ ...options, verifyCode: undefined, captcha: undefined } as LoginOptions);
      this.pendingChallenge = undefined;
      await this.host.legacyConnect(legacyOptions);
      // legacyConnect may have recorded pendingChallenge="legacy" via the host's api-event hooks.
      if (this.pendingChallenge === "legacy" && !this.host.api.isConnected()) return;
    }

    // PHASE 3 — both backends settled. Signal the app ONCE, only if a login actually succeeded.
    if (this.megaLoggedIn || this.host.api.isConnected()) {
      await this.host.onAPIConnect();
    } else {
      rootMainLogger.warn("connect: neither v6 nor legacy login succeeded — not signalling connected");
      this.host.onConnectionError(new Error("Login failed on both backends"));
    }
  }
}
