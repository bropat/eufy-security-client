import { MegaIdentity } from "./megaCrypto";

export interface MegaResult {
  code: number;
  msg: string;
  data?: unknown;
  trace_id?: string;
}

export interface MegaDeviceRecord {
  device_sn: string;
  device_name: string;
  device_model: string;
  device_type: number;
  device_channel: number;
  parent_sn?: string;
  app_conn?: string;
  p2p_conn?: string;
  p2p_did?: string;
  p2p_license?: string;
  signaling_servers?: Array<string>;
  webrtc_sdk_version?: string;
  [key: string]: unknown;
}

export interface MegaDeviceInventory {
  devices: Array<MegaDeviceRecord>;
  groups?: unknown;
}

/** Picture-captcha challenge returned by `passport/generate/captcha`. `item` is a base64 image. */
export interface MegaCaptcha {
  captcha_id: string;
  item: string;
}

/** Caller's captcha answer, passed back into the login call. */
export interface MegaCaptchaAnswer {
  captchaId: string;
  answer: string;
}

/** Raw `devicemanage/get_user_mqtt_info` payload (AWS IoT mutual-TLS credentials). */
export interface MegaUserMqttInfo {
  endpoint_addr: string;
  certificate_pem: string;
  private_key: string;
  aws_root_ca1_pem: string;
  thing_name: string;
  certificate_id: string;
  user_id: string;
  app_name: string;
}

/**
 * Everything needed to open the v6 AWS IoT (mutual-TLS) MQTT connection, assembled so a consumer
 * never has to reach into MegaHTTPApi internals. Topics use `PN`/`SN` placeholders to fill per
 * device (`cmd/eufy_security/PN/SN/res`, …) — see SecurityMqttConstant in the v6 app.
 */
export interface MegaMqttConnectConfig {
  endpoint: string;
  port: number;
  clientId: string;
  thingName: string;
  userId: string;
  certificatePem: string;
  privateKey: string;
  awsRootCaPem: string;
  topics: { subCmd: string; stateInfo: string; pubCmd: string };
}

/** Short-lived inputs used to authenticate the RTC signaling WebSocket. */
export interface MegaRTCAuth {
  authToken: string;
  globalToken: string;
  country: string;
}

export interface MegaApiOptions {
  /** Region/AB code, e.g. "fr", "us". Drives estimate_domain. */
  ab: string;
  /** os-type — MUST be "android" for the identity to route events via FCM. */
  osType?: "android" | "iOS";
  appName?: string;
  appVersion?: string;
  osVersion?: string;
  phoneModel?: string;
  /** Stable per-install device id. Seed it from the existing persisted openudid so the v6 client
   *  presents the same device as the legacy path instead of a fresh id each run. */
  openudid?: string;
  /** Min delay between requests in ms (WAF-friendly). Default 3000. */
  minRequestIntervalMs?: number;
}

/**
 * Serializable session for resume-without-relogin (see {@link MegaHTTPApi.exportSession}).
 *
 * Field names intentionally mirror the legacy `EufySecurityPersistentData` / `HTTPApiPersistentData`
 * conventions (`openudid`, `cloud_token`, `cloud_token_expiration`, `login_hash`, `user_id`) so this
 * can slot into the existing persistence layer. `login_hash = md5(user:pass)` lets the consumer
 * invalidate the cached session when credentials change — exactly like HTTPApi does.
 */
export interface MegaSession {
  ab: string;
  openudid: string;
  login_hash?: string;
  cloud_token?: string;
  cloud_token_expiration?: number;
  user_id?: string;
  domains?: Record<string, string>;
  megaDomain?: string;
  /** Per-cluster ECDH identities (keyIdent + sharedKey + clientPublicKey). */
  identities?: Record<string, MegaIdentity>;
}
