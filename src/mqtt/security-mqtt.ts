import * as mqtt from "mqtt";
import * as https from "https";
import { createHash } from "crypto";
import { TypedEmitter } from "tiny-typed-emitter";

import { SecurityMQTTServiceEvents } from "./interface";
import { BleLockProtocol } from "./ble-lock-protocol";
import { rootMQTTLogger } from "../logging";
import { ensureError } from "../error";
import { getError } from "../utils";
import { SmartLockP2PCommandPayloadType } from "../p2p/models";
import { getSmartLockP2PCommand } from "../p2p/utils";
import { SmartLockCommand, SmartLockFunctionType, CommandType } from "../p2p/types";
import { Lock } from "../http/device";

const EUFYHOME_CLIENT_ID = "eufyhome-app";
const EUFYHOME_CLIENT_SECRET = "GQCpr9dSp3uQpsOMgJ4xQ";

const EUFYHOME_LOGIN_URL = "https://home-api.eufylife.com/v1/user/email/login";
const EUFYHOME_USER_CENTER_URL = "https://home-api.eufylife.com/v1/user/user_center_info";
const AIOT_MQTT_CERT_URL = "https://aiot-clean-api-pr.eufylife.com/app/devicemanage/get_user_mqtt_info";

/** Connection state for the SecurityMQTT service. */
enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
}

/** Command type in the security MQTT message envelope. */
enum SecurityMqttCmd {
  /** Response from device. */
  DEVICE_RESPONSE = 8,
  /** Command sent to device. */
  SEND_COMMAND = 9,
}

/** Command status in the security MQTT message envelope. */
enum SecurityMqttCmdStatus {
  /** Command request. */
  REQUEST = 2,
}

/** mTLS certificate info returned by the AIOT MQTT endpoint. */
interface MQTTCertInfo {
  /** PEM-encoded client certificate for mTLS. */
  certificate_pem: string;
  /** PEM-encoded private key for mTLS. */
  private_key: string;
  /** PEM-encoded AWS root CA certificate. */
  aws_root_ca1_pem: string;
  /** MQTT username (device "thing name" from AWS IoT). */
  thing_name: string;
  /** MQTT broker endpoint address. */
  endpoint_addr: string;
}

/** Request body for the EufyHome email login endpoint. */
interface EufyHomeLoginRequest {
  client_id: string;
  client_secret: string;
  email: string;
  password: string;
}

/** Transport payload forwarded from the P2P command builder to the MQTT envelope. */
interface TransportPayload {
  cmd: number;
  mChannel: number;
  mValue3: number;
  payload: unknown;
}

/** MQTT message envelope header sent to the security broker. */
interface SecurityMqttMessageHead {
  version: string;
  client_id: string;
  sess_id: string;
  msg_seq: number;
  seed: string;
  timestamp: number;
  /** Command status (e.g. REQUEST = 2). */
  cmd_status: SecurityMqttCmdStatus;
  /** Command type (e.g. SEND_COMMAND = 9, DEVICE_RESPONSE = 8). */
  cmd: SecurityMqttCmd;
  sign_code: number;
}

/** Full MQTT message envelope sent to the security broker. */
interface SecurityMqttMessage {
  head: SecurityMqttMessageHead;
  payload: string;
}

/** Device command payload embedded in the MQTT message envelope. */
interface DeviceCommandPayload {
  account_id: string;
  device_sn: string;
  trans: string;
}

/**
 * Manages BLE-over-MQTT communication with Eufy security locks.
 *
 * Devices that use this service (e.g. Smart Lock C30 / T85D0) send the same
 * BLE command frames as other smart locks (T8506, T8502), but tunneled over
 * a dedicated security MQTT broker instead of P2P or Cloud API.
 *
 * The auth chain is: EufyHome login -> user_center_token -> AIOT mTLS certs -> MQTT connect.
 */
export class SecurityMQTTService extends TypedEmitter<SecurityMQTTServiceEvents> {
  private client: mqtt.MqttClient | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;

  private mqttInfo: MQTTCertInfo | null = null;
  private userCenterId: string = "";
  private clientId: string = "";

  private readonly email: string;
  private readonly password: string;
  private readonly openudid: string;
  private readonly country: string;

  private subscribedLocks: Set<string> = new Set();
  /** Maps device serial number to device model for locks awaiting MQTT subscription. */
  private pendingLockSubscriptions = new Map<string, string>();
  private msgSeq: number = 1;

  /**
   * Creates a new SecurityMQTTService.
   * @param email - Eufy account email address.
   * @param password - Eufy account password.
   * @param openudid - Unique device identifier for the client.
   * @param country - Country code for regional API routing (default: "US").
   */
  constructor(email: string, password: string, openudid: string, country: string = "US") {
    super();
    this.email = email;
    this.password = password;
    this.openudid = openudid;
    this.country = country;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Connects to the Eufy security MQTT broker.
   *
   * Performs the full auth chain (EufyHome login -> user center token -> mTLS certs),
   * then establishes an MQTTS connection. Any locks queued via `subscribeLock()` before
   * connection will be subscribed once the connection is established.
   *
   * @param apiBase - The Eufy API base URL, used to determine the regional broker.
   */
  public async connect(apiBase: string): Promise<void> {
    if (this.connectionState !== ConnectionState.DISCONNECTED) {
      return;
    }

    this.connectionState = ConnectionState.CONNECTING;

    try {
      await this.authenticate();
    } catch (err) {
      this.connectionState = ConnectionState.DISCONNECTED;
      const error = ensureError(err);
      rootMQTTLogger.error("SecurityMQTT authentication failed", { error: getError(error) });
      throw error;
    }

    if (!this.mqttInfo) {
      this.connectionState = ConnectionState.DISCONNECTED;
      throw new Error("SecurityMQTT: No MQTT certificates after authentication");
    }

    const host = this.getSecurityBrokerHost(apiBase);
    this.clientId = this.buildClientId(host);

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
      this.connectionState = ConnectionState.CONNECTED;
      rootMQTTLogger.info("SecurityMQTT connected successfully");
      this.emit("connect");

      for (const [deviceSN, deviceModel] of this.pendingLockSubscriptions) {
        this.subscribeToLockTopics(deviceSN, deviceModel);
      }
      this.pendingLockSubscriptions.clear();
    });

    this.client.on("close", () => {
      this.connectionState = ConnectionState.DISCONNECTED;
      rootMQTTLogger.info("SecurityMQTT connection closed");
      this.emit("close");
    });

    this.client.on("error", (error) => {
      this.connectionState = ConnectionState.DISCONNECTED;
      rootMQTTLogger.error("SecurityMQTT error", { error: getError(error) });
    });

    this.client.on("message", (topic, message) => {
      this.handleMessage(topic, message);
    });
  }

  /** Queues or immediately subscribes to MQTT topics for a lock device. */
  public subscribeLock(deviceSN: string, deviceModel: string): void {
    if (this.connectionState === ConnectionState.CONNECTED) {
      this.subscribeToLockTopics(deviceSN, deviceModel);
    } else {
      this.pendingLockSubscriptions.set(deviceSN, deviceModel);
    }
  }

  /**
   * Sends a lock or unlock command to a device via the security MQTT broker.
   *
   * Builds a BLE command frame using the shared smart lock command builder, wraps it
   * in the security MQTT envelope, and publishes to the device's request topic.
   *
   * @param deviceSN - Serial number of the target lock device.
   * @param deviceModel - Model identifier used in the MQTT topic (e.g. "T85D0").
   * @param adminUserId - Admin user ID for the lock command.
   * @param shortUserId - Short user ID for the lock command.
   * @param nickName - User nickname included in the lock command.
   * @param channel - BLE channel number.
   * @param sequence - Lock command sequence number.
   * @param lock - true to lock, false to unlock.
   * @returns true if the command was published successfully, false otherwise.
   */
  public lockDevice(
    deviceSN: string,
    deviceModel: string,
    adminUserId: string,
    shortUserId: string,
    nickName: string,
    channel: number,
    sequence: number,
    lock: boolean,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.client || this.connectionState !== ConnectionState.CONNECTED) {
        rootMQTTLogger.error("SecurityMQTT not connected, cannot send lock command");
        resolve(false);
        return;
      }

      const command = getSmartLockP2PCommand(
        deviceSN,
        adminUserId,
        SmartLockCommand.ON_OFF_LOCK,
        channel,
        sequence,
        Lock.encodeCmdSmartLockUnlock(adminUserId, lock, nickName, shortUserId),
        SmartLockFunctionType.TYPE_2,
      );

      const transPayload: SmartLockP2PCommandPayloadType = JSON.parse(command.payload.value);
      const message = this.buildCommandMessage(deviceSN, transPayload);

      const topic = this.getMqttTopic(deviceModel, deviceSN, "req");
      rootMQTTLogger.debug("SecurityMQTT publishing lock command", {
        topic: topic,
        deviceSN: deviceSN,
        lock: lock,
      });

      this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
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

  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  public close(): void {
    if (this.client) {
      try {
        this.client.end(true);
      } catch (err) {
        const error = ensureError(err);
        rootMQTTLogger.error("SecurityMQTT close error", { error: getError(error) });
      }
      this.client = null;
      this.connectionState = ConnectionState.DISCONNECTED;
    }
  }

  // ─── Private: Authentication ─────────────────────────────────────────────

  /**
   * Authenticates with EufyHome and retrieves mTLS certificates for the MQTT broker.
   *
   * Steps:
   * 1. EufyHome email login to get an access_token.
   * 2. Exchange access_token for a user_center_token.
   * 3. Use user_center_token to retrieve mTLS certificates from the AIOT endpoint.
   */
  private async authenticate(): Promise<void> {
    const accessToken = await this.authenticateEufyHome();
    const userCenterToken = await this.fetchUserCenterToken(accessToken);
    await this.fetchMqttCertificates(userCenterToken);
  }

  /** Step 1: Logs in to the EufyHome API and returns an access token. */
  private async authenticateEufyHome(): Promise<string> {
    rootMQTTLogger.debug("SecurityMQTT auth step 1: EufyHome login...");
    const loginBody: EufyHomeLoginRequest = {
      client_id: EUFYHOME_CLIENT_ID,
      client_secret: EUFYHOME_CLIENT_SECRET,
      email: this.email,
      password: this.password,
    };
    const loginRes = await this.httpRequest(
      EUFYHOME_LOGIN_URL,
      "POST",
      { "Content-Type": "application/json", category: "Home" },
      JSON.stringify(loginBody),
    );
    if (!loginRes.data.access_token) {
      throw new Error(`EufyHome login failed: ${JSON.stringify(loginRes.data)}`);
    }
    rootMQTTLogger.debug("SecurityMQTT auth step 1: OK");
    return loginRes.data.access_token;
  }

  /** Step 2: Exchanges the access token for a user center token and user center ID. */
  private async fetchUserCenterToken(accessToken: string): Promise<string> {
    rootMQTTLogger.debug("SecurityMQTT auth step 2: user_center_token...");
    const userCenterRes = await this.httpRequest(
      EUFYHOME_USER_CENTER_URL,
      "GET",
      {
        "Content-Type": "application/json",
        category: "Home",
        token: accessToken,
      }
    );
    if (!userCenterRes.data.user_center_token) {
      throw new Error(`user_center_info failed: ${JSON.stringify(userCenterRes.data)}`);
    }
    this.userCenterId = userCenterRes.data.user_center_id;
    rootMQTTLogger.debug("SecurityMQTT auth step 2: OK", { userCenterId: this.userCenterId });
    return userCenterRes.data.user_center_token;
  }

  /** Step 3: Uses the user center token to retrieve mTLS certificates from the AIOT endpoint. */
  private async fetchMqttCertificates(userCenterToken: string): Promise<void> {
    rootMQTTLogger.debug("SecurityMQTT auth step 3: MQTT certs...");
    const gtoken = createHash("md5").update(this.userCenterId).digest("hex");
    const mqttCertRes = await this.httpRequest(
      AIOT_MQTT_CERT_URL,
      "POST",
      {
        "Content-Type": "application/json",
        "X-Auth-Token": userCenterToken,
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
      JSON.stringify({}),
    );
    if (mqttCertRes.data.code !== 0) {
      throw new Error(`MQTT certs failed: ${JSON.stringify(mqttCertRes.data)}`);
    }
    this.mqttInfo = mqttCertRes.data.data as MQTTCertInfo;
    rootMQTTLogger.debug("SecurityMQTT auth step 3: OK", {
      thingName: this.mqttInfo.thing_name,
      endpointAddr: this.mqttInfo.endpoint_addr,
    });
  }

  /**
   * Makes an HTTPS request and returns the parsed response.
   *
   * Uses Node's built-in `https` module rather than a third-party library to avoid
   * adding dependencies. The EufyHome API is a separate service from the main Eufy
   * security API (which uses the `got` library in src/http/api.ts).
   */
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
      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  // ─── Private: MQTT Helpers ───────────────────────────────────────────────

  private getSecurityBrokerHost(apiBase: string): string {
    if (apiBase.includes("-eu.")) {
      return "security-mqtt-eu.anker.com";
    }
    return "security-mqtt-us.anker.com";
  }

  /**
   * Builds the MQTT client ID from the broker host, user center ID, and openudid.
   *
   * The format matches the official EufySecurity Android app's client ID pattern:
   * `android-eufy_security-{userCenterId}-{openudid}{hostWithoutDots}`
   */
  private buildClientId(host: string): string {
    const hostNoPunctuation = host.replace(/[.\-]/g, "");
    return `android-eufy_security-${this.userCenterId}-${this.openudid}${hostNoPunctuation}`;
  }

  private getMqttTopic(deviceModel: string, deviceSN: string, direction: "req" | "res"): string {
    return `cmd/eufy_security/${deviceModel}/${deviceSN}/${direction}`;
  }

  /** Subscribes to request and response MQTT topics for a lock device. */
  private subscribeToLockTopics(deviceSN: string, deviceModel: string): void {
    if (!this.client || this.subscribedLocks.has(deviceSN)) {
      return;
    }

    const topics = [
      this.getMqttTopic(deviceModel, deviceSN, "res"),
      this.getMqttTopic(deviceModel, deviceSN, "req"),
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

  /** Generates a random 32-character hex string for the MQTT message seed. */
  private static generateSeed(): string {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    ).join("");
  }

  // ─── Private: Command Building ───────────────────────────────────────────

  /**
   * Builds the MQTT message envelope for sending a command to a lock device.
   *
   * The message format follows the Eufy security MQTT protocol:
   * - `head`: Contains session metadata, sequence number, and command type.
   * - `payload`: JSON-encoded string containing the device SN, account ID, and base64-encoded
   *   transport payload (which wraps the BLE command frame).
   */
  private buildCommandMessage(deviceSN: string, transPayload: SmartLockP2PCommandPayloadType): SecurityMqttMessage {
    const sessionId = Math.random().toString(16).substring(2, 6);
    const timestamp = Math.trunc(Date.now() / 1000);

    const transportPayload: TransportPayload = {
      cmd: transPayload.cmd,
      mChannel: transPayload.mChannel,
      mValue3: transPayload.mValue3,
      payload: transPayload.payload,
    };
    const transportBase64 = Buffer.from(JSON.stringify(transportPayload)).toString("base64");

    const devicePayload: DeviceCommandPayload = {
      account_id: transPayload.account_id,
      device_sn: deviceSN,
      trans: transportBase64,
    };

    return {
      head: {
        version: "1.0.0.1",
        client_id: this.clientId,
        sess_id: sessionId,
        msg_seq: this.msgSeq++,
        seed: SecurityMQTTService.generateSeed(),
        timestamp: timestamp,
        cmd_status: SecurityMqttCmdStatus.REQUEST,
        cmd: SecurityMqttCmd.SEND_COMMAND,
        sign_code: 0,
      },
      payload: JSON.stringify(devicePayload),
    };
  }

  // ─── Private: Message Handling ───────────────────────────────────────────

  /**
   * Handles incoming MQTT messages from the security broker.
   *
   * Only processes messages on `/res` topics (device responses). Responses containing
   * CMD_TRANSFER_PAYLOAD transport data carry BLE frames from the lock device, which
   * are parsed by {@link BleLockProtocol}.
   */
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const parsed = JSON.parse(message.toString());

      if (!topic.endsWith("/res")) {
        return;
      }

      if (typeof parsed.payload !== "string") {
        return;
      }
      const payload = JSON.parse(parsed.payload);
      if (!payload.trans) {
        return;
      }

      const transportData = JSON.parse(Buffer.from(payload.trans, "base64").toString("utf8"));
      if (transportData.cmd !== CommandType.CMD_TRANSFER_PAYLOAD) {
        return;
      }

      const lockPayload = transportData.payload;
      if (!lockPayload || !lockPayload.lock_payload) {
        return;
      }

      const deviceSN = lockPayload.dev_sn || payload.device_sn;
      const bleBuffer = Buffer.from(lockPayload.lock_payload, "hex");

      const frame = BleLockProtocol.parseBleFrame(bleBuffer);
      if (!frame) {
        return;
      }

      rootMQTTLogger.debug("SecurityMQTT received BLE frame", {
        deviceSN: deviceSN,
        encrypted: frame.isEncrypted,
        response: frame.isResponse,
        commandCode: frame.commandCode,
      });

      if (BleLockProtocol.isHeartbeat(frame)) {
        const heartbeat = BleLockProtocol.parseHeartbeat(frame.data);
        if (heartbeat) {
          rootMQTTLogger.info("SecurityMQTT heartbeat", {
            deviceSN: deviceSN,
            locked: heartbeat.locked,
            battery: heartbeat.battery,
            rawStatus: heartbeat.rawLockStatus,
          });
          this.emit("lock status", deviceSN, heartbeat.locked, heartbeat.battery);
        }
      } else if (BleLockProtocol.isLockCommandResponse(frame)) {
        rootMQTTLogger.info("SecurityMQTT received lock command response", {
          deviceSN: deviceSN,
          commandCode: frame.commandCode,
        });
        this.emit("command response", deviceSN, true);
      }
    } catch (err) {
      const error = ensureError(err);
      rootMQTTLogger.error("SecurityMQTT message parse error", { error: getError(error) });
    }
  }
}
