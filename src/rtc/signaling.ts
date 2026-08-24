import { randomUUID } from "crypto";
import { TypedEmitter } from "tiny-typed-emitter";

import { md5 } from "../utils";
import { compactRTCSessionDescription, expandRTCSessionDescription, RTCCompactSessionDescription } from "./sdp";

const WEB_SOURCE = "WEB";
const SIGNAL_ACTION_AUTH = 1;
const SIGNAL_ACTION_MESSAGE = 3;
const SIGNAL_ACTION_LOGOUT = 4;
const SIGNAL_STATUS_TURN = 100;
const SIGNAL_STATUS_OK = 200;
const SIGNAL_STATUS_TIMEOUT = 408;
const SIGNAL_STATUS_CONNECTION_LIMIT = 486;

export interface RTCTurnServer {
  turn_addr: string;
  turn_port: number;
  turn_user: string;
  turn_password: string;
  alt_turn_addr?: string;
  alt_turn_port?: number;
}

export interface RTCSignalClientOptions {
  endpoint: URL;
  stationSerial: string;
  deviceSerial?: string;
  channel?: number;
  accountId: string;
  authToken: string;
  globalToken: string;
  country: string;
  signalingDeviceType: string;
  signalingRequestType: string;
  getSign: () => Promise<string>;
  callTimeoutMs?: number;
  maxCallAttempts?: number;
  webSocketFactory?: RTCWebSocketFactory;
  now?: () => number;
  createMessageId?: () => string;
}

export interface RTCSignalClientEvents {
  authenticated: () => void;
  servers: (servers: RTCTurnServer) => void;
  offer: (sdp: string) => void;
  candidate: (candidate: string) => void;
  "connection limit": () => void;
  timeout: () => void;
  close: () => void;
  error: (error: Error) => void;
}

export interface RTCWebSocketMessageEvent {
  data: string | ArrayBuffer | Blob;
}

export interface RTCWebSocketLike {
  readonly readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: RTCWebSocketMessageEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export type RTCWebSocketFactory = (url: string, protocols: Array<string>) => RTCWebSocketLike;

interface RTCSignalEnvelope {
  msgid?: string;
  data?: string;
}

interface RTCSignalMessage {
  action: number;
  code?: number;
  data?: string;
  dataType?: string;
  status?: number;
}

interface RTCSignalPayload {
  status?: number;
  turn?: RTCTurnServer;
  format?: "SDP" | "CANDIDATE" | string;
  value?: string;
}

const defaultWebSocketFactory: RTCWebSocketFactory = (url, protocols) => {
  if (typeof WebSocket === "undefined") throw new Error("This runtime does not provide a WebSocket client");
  return new WebSocket(url, protocols) as unknown as RTCWebSocketLike;
};

const toBase64Url = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const messageText = async (data: RTCWebSocketMessageEvent["data"]): Promise<string> => {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return data.text();
};

export class RTCSignalClient extends TypedEmitter<RTCSignalClientEvents> {
  private readonly options: Required<
    Pick<RTCSignalClientOptions, "callTimeoutMs" | "maxCallAttempts" | "now" | "createMessageId">
  > &
    RTCSignalClientOptions;
  private socket?: RTCWebSocketLike;
  private sign = "";
  private callAttempts = 0;
  private callTimer?: NodeJS.Timeout;

  constructor(options: RTCSignalClientOptions) {
    super();
    this.options = {
      ...options,
      callTimeoutMs: options.callTimeoutMs ?? 5000,
      maxCallAttempts: options.maxCallAttempts ?? 4,
      now: options.now ?? Date.now,
      createMessageId: options.createMessageId ?? randomUUID,
    };
  }

  public async connect(): Promise<void> {
    if (this.socket) return;
    this.sign = await this.options.getSign();
    if (!this.sign) throw new Error("RTC signaling did not return a session signature");

    const protocol = toBase64Url(
      JSON.stringify({
        region: this.options.country.split("-")[0].toUpperCase(),
        type: this.options.signalingDeviceType,
        sn: this.options.stationSerial,
        token: this.options.authToken,
        gtoken: this.options.globalToken,
        sign: this.sign,
        appName: "eufy_mega",
        modelType: WEB_SOURCE,
      })
    );

    const endpoint = new URL("/v1/rtc/ws/join", this.options.endpoint);
    endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
    endpoint.searchParams.set("reqtype", this.options.signalingRequestType);

    await new Promise<void>((resolve, reject) => {
      const factory = this.options.webSocketFactory ?? defaultWebSocketFactory;
      const socket = factory(endpoint.href, ["v1", protocol]);
      this.socket = socket;
      socket.onopen = () => {
        this.sendAuth();
        resolve();
      };
      socket.onmessage = (event) => {
        void this.onSocketMessage(event).catch((error: unknown) => this.emitError(error));
      };
      socket.onerror = (event) => {
        const error = event instanceof Error ? event : new Error("RTC signaling WebSocket failed");
        this.emit("error", error);
        reject(error);
      };
      socket.onclose = () => {
        this.clearCallTimer();
        this.socket = undefined;
        this.emit("close");
      };
    });
  }

  public sendSdpAnswer(sdp: string): void {
    const compact = compactRTCSessionDescription(sdp);
    this.sendMessage("info", { sdp: JSON.stringify(compact) });
  }

  public sendCandidate(candidate: string): void {
    this.sendMessage("info", { candidate });
  }

  public hangup(): void {
    this.sendMessage("hangup", {});
  }

  public logout(): void {
    this.sendRaw({
      code: SIGNAL_STATUS_OK,
      msgid: "0",
      action: SIGNAL_ACTION_LOGOUT,
      source: WEB_SOURCE,
    });
  }

  public close(): void {
    this.clearCallTimer();
    this.socket?.close();
    this.socket = undefined;
  }

  private sendAuth(): void {
    const timestamp = this.timestamp();
    this.sendEnvelope("0", {
      code: SIGNAL_STATUS_OK,
      action: SIGNAL_ACTION_AUTH,
      data: this.sign,
      sn: this.options.stationSerial,
      source: WEB_SOURCE,
      ts: timestamp,
    });
  }

  private sendCall(): void {
    if (this.callAttempts >= this.options.maxCallAttempts) return;
    this.callAttempts += 1;
    this.sendMessage("scall", {}, this.options.channel ?? 0);
    this.clearCallTimer();
    this.callTimer = setTimeout(() => this.sendCall(), this.options.callTimeoutMs);
  }

  private sendMessage(dataType: string, payload: Record<string, unknown>, channel = this.options.channel ?? 0): void {
    const timestamp = this.timestamp();
    const data = {
      timestamp,
      account: md5(`${channel}${this.options.accountId}${timestamp}`),
      ...payload,
    };
    this.sendEnvelope(`${this.options.authToken}_${this.options.createMessageId()}`, {
      code: SIGNAL_STATUS_OK,
      action: SIGNAL_ACTION_MESSAGE,
      sessionId: this.sign,
      sn: this.options.stationSerial,
      subSn: this.options.deviceSerial ?? "",
      channelId: channel,
      isResponse: 0,
      dataType,
      source: WEB_SOURCE,
      ts: timestamp,
      data: JSON.stringify(data),
    });
  }

  private sendEnvelope(messageId: string, data: Record<string, unknown>): void {
    this.sendRaw({ msgid: messageId, data: JSON.stringify(data) });
  }

  private sendRaw(data: Record<string, unknown>): void {
    if (!this.socket) throw new Error("RTC signaling WebSocket is not connected");
    this.socket.send(JSON.stringify(data));
  }

  private async onSocketMessage(event: RTCWebSocketMessageEvent): Promise<void> {
    const envelope = JSON.parse(await messageText(event.data)) as RTCSignalEnvelope;
    if (typeof envelope.data !== "string") return;
    const message = JSON.parse(envelope.data) as RTCSignalMessage;

    if (message.action === SIGNAL_ACTION_AUTH) {
      this.emit("authenticated");
      this.sendCall();
      return;
    }
    if (message.action !== SIGNAL_ACTION_MESSAGE || typeof message.data !== "string") return;

    const payload = JSON.parse(message.data) as RTCSignalPayload;
    switch (message.dataType) {
      case "call":
      case "scall":
        this.onCallResponse(payload);
        break;
      case "info":
        this.onInfoResponse(payload);
        break;
      case "hangup":
        this.close();
        break;
    }
  }

  private onCallResponse(payload: RTCSignalPayload): void {
    this.clearCallTimer();
    if (payload.status === SIGNAL_STATUS_TURN && payload.turn) {
      this.emit("servers", payload.turn);
      return;
    }
    if (payload.status === SIGNAL_STATUS_OK) {
      this.callAttempts = 0;
      this.sendMessage("ack", {});
      return;
    }
    if (payload.status === SIGNAL_STATUS_CONNECTION_LIMIT) {
      this.emit("connection limit");
      this.sendCall();
      return;
    }
    if (payload.status === SIGNAL_STATUS_TIMEOUT) {
      this.emit("timeout");
      this.sendCall();
    }
  }

  private onInfoResponse(payload: RTCSignalPayload): void {
    if (!payload.value) return;
    if (payload.format === "CANDIDATE") {
      this.emit("candidate", payload.value);
      return;
    }
    if (payload.format !== "SDP") return;

    try {
      const compact = JSON.parse(payload.value) as RTCCompactSessionDescription;
      this.emit("offer", expandRTCSessionDescription(compact, this.options.now()));
    } catch {
      this.emit("offer", payload.value);
    }
  }

  private timestamp(): number {
    return Math.floor(this.options.now() / 1000);
  }

  private clearCallTimer(): void {
    if (this.callTimer) clearTimeout(this.callTimer);
    this.callTimer = undefined;
  }

  private emitError(error: unknown): void {
    this.emit("error", error instanceof Error ? error : new Error(String(error)));
  }
}
