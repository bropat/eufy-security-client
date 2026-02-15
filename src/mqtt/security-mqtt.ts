import * as mqtt from "mqtt";
import * as https from "https";
import { createHash } from "crypto";
import { TypedEmitter } from "tiny-typed-emitter";

import { SecurityMQTTServiceEvents } from "./interface";
import { rootMQTTLogger } from "../logging";
import { ensureError } from "../error";
import { getError } from "../utils";
import { SmartLockP2PCommandPayloadType } from "../p2p/models";
import { getSmartLockP2PCommand } from "../p2p/utils";
import { SmartLockCommand, SmartLockFunctionType, CommandType } from "../p2p/types";
import { Lock } from "../http/device";

// ─── Constants ───────────────────────────────────────────────────────────────

const EUFYHOME_CLIENT_ID = "eufyhome-app";
const EUFYHOME_CLIENT_SECRET = "GQCpr9dSp3uQpsOMgJ4xQ";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MQTTCertInfo {
  certificate_pem: string;
  private_key: string;
  aws_root_ca1_pem: string;
  thing_name: string;
  endpoint_addr: string;
}

// ─── SecurityMQTTService ─────────────────────────────────────────────────────

export class SecurityMQTTService extends TypedEmitter<SecurityMQTTServiceEvents> {
  private client: mqtt.MqttClient | null = null;
  private connected = false;
  private connecting = false;

  private mqttInfo: MQTTCertInfo | null = null;
  private userCenterId = "";
  private clientId = "";

  private email: string;
  private password: string;
  private openudid: string;
  private country: string;

  private subscribedLocks: Set<string> = new Set();
  private pendingLockSubscriptions: Set<string> = new Set();
  private msgSeq = 1;

  constructor(email: string, password: string, openudid: string, country = "US") {
    super();
    this.email = email;
    this.password = password;
    this.openudid = openudid;
    this.country = country;
  }

  // ─── Auth Chain ──────────────────────────────────────────────────────────

  private httpRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: string
  ): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const reqOpts: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: headers,
      };

      const req = https.request(reqOpts, (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, data: data });
          }
        });
      });

      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
  }

  private async authenticate(): Promise<void> {
    // Step 1: EufyHome login
    rootMQTTLogger.debug("SecurityMQTT auth step 1: EufyHome login...");
    const loginRes = await this.httpRequest(
      "https://home-api.eufylife.com/v1/user/email/login",
      "POST",
      { "Content-Type": "application/json", category: "Home" },
      JSON.stringify({
        client_id: EUFYHOME_CLIENT_ID,
        client_secret: EUFYHOME_CLIENT_SECRET,
        email: this.email,
        password: this.password,
      })
    );
    if (!loginRes.data.access_token) {
      throw new Error(`EufyHome login failed: ${JSON.stringify(loginRes.data)}`);
    }
    rootMQTTLogger.debug("SecurityMQTT auth step 1: OK");

    // Step 2: User center token
    rootMQTTLogger.debug("SecurityMQTT auth step 2: user_center_token...");
    const ucRes = await this.httpRequest(
      "https://home-api.eufylife.com/v1/user/user_center_info",
      "GET",
      {
        "Content-Type": "application/json",
        category: "Home",
        token: loginRes.data.access_token,
      }
    );
    if (!ucRes.data.user_center_token) {
      throw new Error(`user_center_info failed: ${JSON.stringify(ucRes.data)}`);
    }
    this.userCenterId = ucRes.data.user_center_id;
    rootMQTTLogger.debug("SecurityMQTT auth step 2: OK", { userCenterId: this.userCenterId });

    // Step 3: MQTT certificates
    rootMQTTLogger.debug("SecurityMQTT auth step 3: MQTT certs...");
    const gtoken = createHash("md5").update(this.userCenterId).digest("hex");
    const mqttRes = await this.httpRequest(
      "https://aiot-clean-api-pr.eufylife.com/app/devicemanage/get_user_mqtt_info",
      "POST",
      {
        "Content-Type": "application/json",
        "X-Auth-Token": ucRes.data.user_center_token,
        GToken: gtoken,
        "User-Agent": "EufySecurity-Android-4.6.0-1630",
        category: "eufy_security",
        "App-name": "eufy_security",
        openudid: this.openudid,
        language: "en",
        country: this.country,
        "Os-version": "Android",
        "Model-type": "PHONE",
        timezone: "America/New_York",
      },
      "{}"
    );
    if (mqttRes.data.code !== 0) {
      throw new Error(`MQTT certs failed: ${JSON.stringify(mqttRes.data)}`);
    }
    this.mqttInfo = mqttRes.data.data as MQTTCertInfo;
    rootMQTTLogger.debug("SecurityMQTT auth step 3: OK", {
      thingName: this.mqttInfo.thing_name,
      endpointAddr: this.mqttInfo.endpoint_addr,
    });
  }

  // ─── Broker URL ──────────────────────────────────────────────────────────

  private getSecurityBrokerHost(apiBase: string): string {
    if (apiBase.includes("-eu.")) {
      return "security-mqtt-eu.anker.com";
    }
    return "security-mqtt-us.anker.com";
  }

  // ─── Connect ─────────────────────────────────────────────────────────────

  public async connect(apiBase: string): Promise<void> {
    if (this.connected || this.connecting) return;

    this.connecting = true;

    try {
      await this.authenticate();
    } catch (err) {
      this.connecting = false;
      const error = ensureError(err);
      rootMQTTLogger.error("SecurityMQTT authentication failed", { error: getError(error) });
      throw error;
    }

    if (!this.mqttInfo) {
      this.connecting = false;
      throw new Error("SecurityMQTT: No MQTT certificates after authentication");
    }

    const host = this.getSecurityBrokerHost(apiBase);
    const endpointNoDashes = host.replace(/[.\-]/g, "");
    this.clientId = `android-eufy_security-${this.userCenterId}-${this.openudid}${endpointNoDashes}`;

    rootMQTTLogger.info(`SecurityMQTT connecting to ${host}:8883`, {
      clientId: this.clientId,
      username: this.mqttInfo.thing_name,
    });

    this.client = mqtt.connect({
      host: host,
      port: 8883,
      protocol: "mqtts",
      clientId: this.clientId,
      username: this.mqttInfo.thing_name,
      cert: this.mqttInfo.certificate_pem,
      key: this.mqttInfo.private_key,
      ca: this.mqttInfo.aws_root_ca1_pem,
      rejectUnauthorized: false,
      clean: true,
      keepalive: 60,
      connectTimeout: 30000,
    });

    this.client.on("connect", () => {
      this.connected = true;
      this.connecting = false;
      rootMQTTLogger.info("SecurityMQTT connected successfully");
      this.emit("connect");

      // Subscribe any pending locks
      for (const deviceSN of this.pendingLockSubscriptions) {
        this._subscribeLock(deviceSN);
      }
      this.pendingLockSubscriptions.clear();
    });

    this.client.on("close", () => {
      this.connected = false;
      rootMQTTLogger.info("SecurityMQTT connection closed");
      this.emit("close");
    });

    this.client.on("error", (error) => {
      this.connecting = false;
      rootMQTTLogger.error("SecurityMQTT error", { error: getError(error) });
    });

    this.client.on("message", (topic, message) => {
      this.handleMessage(topic, message);
    });
  }

  // ─── Lock Subscriptions ──────────────────────────────────────────────────

  private _subscribeLock(deviceSN: string): void {
    if (!this.client || this.subscribedLocks.has(deviceSN)) return;

    const topics = [
      `cmd/eufy_security/T85D0/${deviceSN}/res`,
      `cmd/eufy_security/T85D0/${deviceSN}/req`,
    ];

    for (const topic of topics) {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          rootMQTTLogger.error(`SecurityMQTT subscribe failed: ${topic}`, { error: getError(err) });
        } else {
          rootMQTTLogger.info(`SecurityMQTT subscribed: ${topic}`);
        }
      });
    }

    this.subscribedLocks.add(deviceSN);
  }

  public subscribeLock(deviceSN: string): void {
    if (this.connected) {
      this._subscribeLock(deviceSN);
    } else {
      this.pendingLockSubscriptions.add(deviceSN);
    }
  }

  // ─── Command Publishing ──────────────────────────────────────────────────

  public publishLockCommand(
    userId: string,
    deviceSN: string,
    adminUserId: string,
    shortUserId: string,
    nickName: string,
    channel: number,
    sequence: number,
    lock: boolean,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.client || !this.connected) {
        rootMQTTLogger.error("SecurityMQTT not connected, cannot send lock command");
        resolve(false);
        return;
      }

      // Reuse the existing smart lock command builder
      const command = getSmartLockP2PCommand(
        deviceSN,
        adminUserId,
        SmartLockCommand.ON_OFF_LOCK,
        channel,
        sequence,
        Lock.encodeCmdSmartLockUnlock(adminUserId, lock, nickName, shortUserId),
        SmartLockFunctionType.TYPE_2,
      );

      // Extract the trans payload from the P2P command
      const transPayload: SmartLockP2PCommandPayloadType = JSON.parse(command.payload.value);

      // Build MQTT message envelope
      const sessId = Math.random().toString(16).substring(2, 6);
      const seed = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
      ).join("");
      const now = Math.trunc(Date.now() / 1000);

      const trans = {
        cmd: transPayload.cmd,
        mChannel: transPayload.mChannel,
        mValue3: transPayload.mValue3,
        payload: transPayload.payload,
      };
      const transB64 = Buffer.from(JSON.stringify(trans)).toString("base64");

      const payload = JSON.stringify({
        account_id: transPayload.account_id,
        device_sn: deviceSN,
        trans: transB64,
      });

      const message = JSON.stringify({
        head: {
          version: "1.0.0.1",
          client_id: this.clientId,
          sess_id: sessId,
          msg_seq: this.msgSeq++,
          seed: seed,
          timestamp: now,
          cmd_status: 2,
          cmd: 9,
          sign_code: 0,
        },
        payload: payload,
      });

      const topic = `cmd/eufy_security/T85D0/${deviceSN}/req`;
      rootMQTTLogger.debug("SecurityMQTT publishing lock command", {
        topic: topic,
        deviceSN: deviceSN,
        lock: lock,
      });

      this.client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          rootMQTTLogger.error("SecurityMQTT publish failed", { error: getError(err) });
          resolve(false);
        } else {
          rootMQTTLogger.info("SecurityMQTT lock command published", {
            deviceSN: deviceSN,
            lock: lock,
          });
          resolve(true);
        }
      });
    });
  }

  // ─── Message Handling ────────────────────────────────────────────────────

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const parsed = JSON.parse(message.toString());

      // Only process device responses (cmd=8) on /res topics
      if (!topic.endsWith("/res")) return;

      if (typeof parsed.payload !== "string") return;
      const payload = JSON.parse(parsed.payload);
      if (!payload.trans) return;

      const trans = JSON.parse(Buffer.from(payload.trans, "base64").toString("utf8"));
      if (trans.cmd !== CommandType.CMD_TRANSFER_PAYLOAD) return;

      const lp = trans.payload;
      if (!lp || !lp.lock_payload) return;

      const deviceSN = lp.dev_sn || payload.device_sn;
      const buf = Buffer.from(lp.lock_payload, "hex");

      // Parse FF09 BLE frame
      if (buf.length < 10 || buf[0] !== 0xff || buf[1] !== 0x09) return;

      const flags = buf.readUInt16BE(7);
      const isEncrypted = !!(flags & (1 << 14));
      const isResponse = !!(flags & (1 << 11));
      const cmdCode = flags & 0x7ff;
      const data = buf.subarray(9, buf.length - 1);

      rootMQTTLogger.debug("SecurityMQTT received BLE frame", {
        deviceSN: deviceSN,
        flags: `0x${flags.toString(16)}`,
        encrypted: isEncrypted,
        response: isResponse,
        cmdCode: cmdCode,
      });

      if (!isEncrypted && cmdCode === 74) {
        // NOTIFY heartbeat — unencrypted TLV with battery and lock status
        this.parseHeartbeat(deviceSN, data);
      } else if (isResponse && cmdCode === 35) {
        // ON_OFF_LOCK response — command acknowledgment
        // First byte after encrypted data decryption is return code (0 = success)
        rootMQTTLogger.info("SecurityMQTT received lock command response", {
          deviceSN: deviceSN,
          cmdCode: cmdCode,
        });
        this.emit("command-response", deviceSN, true);
      }
    } catch (err) {
      const error = ensureError(err);
      rootMQTTLogger.error("SecurityMQTT message parse error", { error: getError(error) });
    }
  }

  private parseHeartbeat(deviceSN: string, data: Buffer): void {
    let offset = 0;

    // Skip return code byte if present
    if (data.length > 0 && data[0] < 0xa0) {
      offset = 1;
    }

    let battery = -1;
    let lockStatus = -1;

    while (offset + 2 <= data.length) {
      const tag = data[offset];
      const len = data[offset + 1];
      if (offset + 2 + len > data.length) break;

      if (tag === 0xa1 && len === 1) {
        battery = data[offset + 2];
      } else if (tag === 0xa2 && len === 1) {
        lockStatus = data[offset + 2];
      }

      offset += 2 + len;
    }

    if (lockStatus !== -1) {
      const locked = lockStatus === 4; // 3=unlocked, 4=locked
      rootMQTTLogger.info("SecurityMQTT heartbeat", {
        deviceSN: deviceSN,
        locked: locked,
        battery: battery,
        rawStatus: lockStatus,
      });
      this.emit("lock-status", deviceSN, locked, battery);
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  public isConnected(): boolean {
    return this.connected;
  }

  public close(): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.connected = false;
      this.connecting = false;
    }
  }
}
