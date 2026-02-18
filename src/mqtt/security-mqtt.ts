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
import { SmartLockCommand, SmartLockFunctionType, SmartLockBleCommandFunctionType2, CommandType } from "../p2p/types";
import { Lock } from "../http/device";

const EUFYHOME_CLIENT_ID = "eufyhome-app";
const EUFYHOME_CLIENT_SECRET = "GQCpr9dSp3uQpsOMgJ4xQ";

const EUFYHOME_LOGIN_URL = "https://home-api.eufylife.com/v1/user/email/login";
const EUFYHOME_USER_CENTER_URL = "https://home-api.eufylife.com/v1/user/user_center_info";
const AIOT_MQTT_CERT_URL = "https://aiot-clean-api-pr.eufylife.com/app/devicemanage/get_user_mqtt_info";

/** TLV tag for battery level in heartbeat responses. */
const HEARTBEAT_TLV_TAG_BATTERY = 0xa1;
/** TLV tag for lock status in heartbeat responses. */
const HEARTBEAT_TLV_TAG_LOCK_STATUS = 0xa2;

/** Lock status value indicating the lock is locked. */
const LOCK_STATUS_LOCKED = 4;

/** BLE frame header magic bytes (FF09 protocol). */
const BLE_FRAME_HEADER = [0xff, 0x09];

/** Connection state for the SecurityMQTT service. */
enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
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

/** Request body for the AIOT MQTT certificate endpoint (empty object). */
interface AiotMqttCertRequest {
  [key: string]: never;
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
  /** 2 = command request. */
  cmd_status: number;
  /** 9 = send command to device, 8 = device response. */
  cmd: number;
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
  private pendingLockSubscriptions: Map<string, string> = new Map();
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

  /**
   * Authenticates with EufyHome and retrieves mTLS certificates for the MQTT broker.
   *
   * Steps:
   * 1. EufyHome email login to get an access_token.
   * 2. Exchange access_token for a user_center_token.
   * 3. Use user_center_token to retrieve mTLS certificates from the AIOT endpoint.
   */
  private async authenticate(): Promise<void> {
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

    rootMQTTLogger.debug("SecurityMQTT auth step 2: user_center_token...");
    const userCenterRes = await this.httpRequest(
      EUFYHOME_USER_CENTER_URL,
      "GET",
      {
        "Content-Type": "application/json",
        category: "Home",
        token: loginRes.data.access_token,
      }
    );
    if (!userCenterRes.data.user_center_token) {
      throw new Error(`user_center_info failed: ${JSON.stringify(userCenterRes.data)}`);
    }
    this.userCenterId = userCenterRes.data.user_center_id;
    rootMQTTLogger.debug("SecurityMQTT auth step 2: OK", { userCenterId: this.userCenterId });

    rootMQTTLogger.debug("SecurityMQTT auth step 3: MQTT certs...");
    const gtoken = createHash("md5").update(this.userCenterId).digest("hex");
    const certBody: AiotMqttCertRequest = {};
    const mqttCertRes = await this.httpRequest(
      AIOT_MQTT_CERT_URL,
      "POST",
      {
        "Content-Type": "application/json",
        "X-Auth-Token": userCenterRes.data.user_center_token,
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
      JSON.stringify(certBody),
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
        this._subscribeLock(deviceSN, deviceModel);
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

  private getMqttTopic(deviceModel: string, deviceSN: string, direction: "req" | "res"): string {
    return `cmd/eufy_security/${deviceModel}/${deviceSN}/${direction}`;
  }

  private _subscribeLock(deviceSN: string, deviceModel: string): void {
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

  public subscribeLock(deviceSN: string, deviceModel: string): void {
    if (this.connectionState === ConnectionState.CONNECTED) {
      this._subscribeLock(deviceSN, deviceModel);
    } else {
      this.pendingLockSubscriptions.set(deviceSN, deviceModel);
    }
  }

  /** Generates a random hex seed string for the MQTT message envelope. */
  private generateSeed(): string {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    ).join("");
  }

  /**
   * Builds the MQTT message envelope for sending a command to a lock device.
   *
   * The message format follows the Eufy security MQTT protocol:
   * - `head`: Contains session metadata, sequence number, and command type (cmd=9 for request).
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
        seed: this.generateSeed(),
        timestamp: timestamp,
        cmd_status: 2,
        cmd: 9,
        sign_code: 0,
      },
      payload: JSON.stringify(devicePayload),
    };
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

  /**
   * Parses a BLE frame from the FF09 protocol.
   *
   * The frame format is: [0xFF, 0x09, ...header, flags(2 bytes), ...data, checksum].
   * Flags encode: bit 14 = encrypted, bit 11 = response, bits 0-10 = command code.
   *
   * @returns Parsed frame fields, or null if the buffer is not a valid FF09 frame.
   */
  private parseBleFrame(buffer: Buffer): { isEncrypted: boolean; isResponse: boolean; commandCode: number; data: Buffer } | null {
    if (buffer.length < 10 || buffer[0] !== BLE_FRAME_HEADER[0] || buffer[1] !== BLE_FRAME_HEADER[1]) {
      return null;
    }

    const flags = buffer.readUInt16BE(7);
    return {
      isEncrypted: !!(flags & (1 << 14)),
      isResponse: !!(flags & (1 << 11)),
      commandCode: flags & 0x7ff,
      data: buffer.subarray(9, buffer.length - 1),
    };
  }

  /**
   * Handles incoming MQTT messages from the security broker.
   *
   * Only processes messages on `/res` topics (device responses). Messages on `/req` topics
   * are commands sent by this or other clients and are ignored. Responses with cmd=8 in the
   * head indicate device-originated messages containing BLE frames.
   */
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const parsed = JSON.parse(message.toString());

      // Only process messages on /res topics (device responses)
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
      // CMD_TRANSFER_PAYLOAD indicates a forwarded BLE command/response
      if (transportData.cmd !== CommandType.CMD_TRANSFER_PAYLOAD) {
        return;
      }

      const lockPayload = transportData.payload;
      if (!lockPayload || !lockPayload.lock_payload) {
        return;
      }

      const deviceSN = lockPayload.dev_sn || payload.device_sn;
      const bleBuffer = Buffer.from(lockPayload.lock_payload, "hex");

      const frame = this.parseBleFrame(bleBuffer);
      if (!frame) {
        return;
      }

      rootMQTTLogger.debug("SecurityMQTT received BLE frame", {
        deviceSN: deviceSN,
        encrypted: frame.isEncrypted,
        response: frame.isResponse,
        commandCode: frame.commandCode,
      });

      if (!frame.isEncrypted && frame.commandCode === SmartLockBleCommandFunctionType2.NOTIFY) {
        // Heartbeat notification — unencrypted TLV containing battery level and lock status
        this.parseHeartbeat(deviceSN, frame.data);
      } else if (frame.isResponse && frame.commandCode === SmartLockBleCommandFunctionType2.ON_OFF_LOCK) {
        // Lock/unlock command acknowledgment from the device
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

  /**
   * Parses a heartbeat TLV payload to extract battery level and lock status.
   *
   * The TLV format uses tag 0xA1 for battery percentage and tag 0xA2 for lock status.
   * A leading byte below 0xA0 is a return code and is skipped.
   */
  private parseHeartbeat(deviceSN: string, data: Buffer): void {
    let offset = 0;

    // Skip return code byte if present (return codes are below 0xA0)
    if (data.length > 0 && data[0] < 0xa0) {
      offset = 1;
    }

    let battery = -1;
    let lockStatus = -1;

    while (offset + 2 <= data.length) {
      const tag = data[offset];
      const length = data[offset + 1];
      if (offset + 2 + length > data.length) {
        break;
      }

      if (tag === HEARTBEAT_TLV_TAG_BATTERY && length === 1) {
        battery = data[offset + 2];
      } else if (tag === HEARTBEAT_TLV_TAG_LOCK_STATUS && length === 1) {
        lockStatus = data[offset + 2];
      }

      offset += 2 + length;
    }

    if (lockStatus !== -1) {
      const locked = lockStatus === LOCK_STATUS_LOCKED;
      rootMQTTLogger.info("SecurityMQTT heartbeat", {
        deviceSN: deviceSN,
        locked: locked,
        battery: battery,
        rawStatus: lockStatus,
      });
      this.emit("lock status", deviceSN, locked, battery);
    }
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
}
