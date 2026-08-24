import { Readable } from "stream";
import { TypedEmitter } from "tiny-typed-emitter";
import type { DataChannel, IceServer, PeerConnection } from "node-datachannel";

import { AudioCodec, VideoCodec } from "../p2p/types";
import type { StreamMetadata } from "../p2p/interfaces";
import { RTCFecRuntime, type RTCFecPaths, type RTCFecReceiver, type RTCFecSender } from "./fec";
import { decodeRTCCommandFrame, encodeRTCCommandFrame } from "./frame";
import { decodeRTCAudioFrame, decodeRTCVideoFrame, RTC_AUDIO_FRAME_COMMAND, RTC_VIDEO_FRAME_COMMAND } from "./media";
import type { RTCSignalClient, RTCTurnServer } from "./signaling";

const DATA_CHANNEL_LABELS = ["WebrtcDataChannel", "audio", "idr", "video", "notify", "download"];
const COMMAND_LINK = 1;
const COMMAND_RESPONSE_LINK = 0;
const LIVE_LINK = 5;
const COMMAND_ID = 1350;
const COMMAND_CLOSE_LIVE = 1004;
const COMMAND_OPEN_LIVE = 1003;
const DEVICE_CONTROL_COMMAND_ID = 1700;
const PAN_AND_TILT_COMMAND = 6030;
const HEARTBEAT_COMMAND = 1139;
const COMMAND_TIMEOUT_MS = 5_000;
const SESSION_START_INTERVAL_MS = 3_000;

let nextSessionStartAt = 0;

interface RTCMediaSessionEvents {
  start: (metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => void;
  stop: () => void;
  error: (error: Error) => void;
}

export interface RTCMediaSessionOptions extends RTCFecPaths {
  accountId: string;
  channel: number;
  sensor?: number;
  videoCodec?: VideoCodec;
  getSignalClient: () => Promise<RTCSignalClient>;
  getFecRuntime?: () => Promise<RTCFecRuntime>;
}

interface PendingCommand {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

const asBuffer = (message: string | Buffer | ArrayBuffer): Buffer =>
  typeof message === "string" ? Buffer.from(message) : Buffer.isBuffer(message) ? message : Buffer.from(message);

const isFecPacket = (packet: Buffer): boolean =>
  packet.byteLength >= 4 && packet[0] === 0x50 && packet[1] === 0x54 && packet[2] === 0x43 && packet[3] === 0x53;

const createHeartbeat = (): Buffer => {
  const command = encodeRTCCommandFrame({ commandId: HEARTBEAT_COMMAND, channelId: 0 });
  const heartbeat = Buffer.alloc(20 + command.byteLength);
  heartbeat.set([0x00, 0x09, 0x00, 0x00, command.byteLength, 0x00, 0x00, 0x00], 0);
  heartbeat[12] = 99;
  heartbeat.set(command, 20);
  return heartbeat;
};

export class RTCMediaSession extends TypedEmitter<RTCMediaSessionEvents> {
  private signal?: RTCSignalClient;
  private peer?: PeerConnection;
  private readonly channels: Array<DataChannel> = [];
  private receiver?: RTCFecReceiver;
  private sender?: RTCFecSender;
  private startTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private pendingOffer?: string;
  private remoteDescriptionSet = false;
  private readonly pendingCandidates: Array<string> = [];
  private readonly pendingCommands = new Map<number, PendingCommand>();
  private nextCommandSegment = 1;
  private active = false;
  private started = false;
  private stopping = false;
  private flowStarted = false;
  private videoStream?: Readable;
  private audioStream?: Readable;
  private metadata?: StreamMetadata;

  constructor(private readonly options: RTCMediaSessionOptions) {
    super();
  }

  public start(): void {
    if (this.active) throw new Error("RTC media session is already active");
    this.active = true;
    const now = Date.now();
    const delay = Math.max(0, nextSessionStartAt - now);
    nextSessionStartAt = Math.max(now, nextSessionStartAt) + SESSION_START_INTERVAL_MS;
    if (delay === 0) {
      void this.connect().catch((error: unknown) => this.fail(error));
    } else {
      this.startTimer = setTimeout(() => {
        this.startTimer = undefined;
        if (this.active && !this.stopping) void this.connect().catch((error: unknown) => this.fail(error));
      }, delay);
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public panAndTilt(direction: number, command = 1): void {
    if (!this.active || !this.sender) throw new Error("RTC media session is not ready for camera control");
    const segment = this.nextSegment();
    const frame = encodeRTCCommandFrame({
      commandId: DEVICE_CONTROL_COMMAND_ID,
      channelId: this.options.channel,
      segment,
      payload: {
        commandType: PAN_AND_TILT_COMMAND,
        data: {
          cmd_type: command,
          rotate_type: direction,
          zoom: 1,
        },
      },
    });
    this.sender.send(COMMAND_LINK, frame);
  }

  public stop(): void {
    if (!this.active || this.stopping) return;
    this.stopping = true;
    if (this.flowStarted && this.sender) {
      void this.sendCommand(COMMAND_CLOSE_LIVE, {})
        .catch(() => undefined)
        .finally(() => this.close());
      return;
    }
    this.close();
  }

  private async connect(): Promise<void> {
    this.signal = await this.options.getSignalClient();
    this.signal.once("servers", (servers) => {
      void this.createPeer(servers).catch((error: unknown) => this.fail(error));
    });
    this.signal.on("offer", (offer) => {
      this.pendingOffer = offer;
      this.applyOffer();
    });
    this.signal.on("candidate", (candidate) => {
      if (this.peer && this.remoteDescriptionSet) this.peer.addRemoteCandidate(candidate, "2");
      else this.pendingCandidates.push(candidate);
    });
    this.signal.on("connection limit", () => this.fail(new Error("RTC connection limit reached")));
    this.signal.on("timeout", () => this.fail(new Error("RTC signaling timed out")));
    this.signal.on("error", (error) => this.fail(error));
    this.signal.on("close", () => {
      if (!this.stopping) this.fail(new Error("RTC signaling closed"));
    });
    await this.signal.connect();
  }

  private async createPeer(servers: RTCTurnServer): Promise<void> {
    if (!this.active || this.peer) return;
    const iceServers: Array<IceServer> = [
      {
        hostname: servers.turn_addr,
        port: servers.turn_port,
        username: servers.turn_user,
        password: servers.turn_password,
        relayType: "TurnUdp",
      },
    ];
    const nativeRTC = require("node-datachannel") as typeof import("node-datachannel");
    this.peer = new nativeRTC.PeerConnection("eufy-rtc-media", {
      iceServers,
      disableAutoNegotiation: true,
    });
    this.peer.onLocalDescription((sdp, type) => {
      if (type === "answer") this.signal?.sendSdpAnswer(sdp);
    });
    this.peer.onLocalCandidate((candidate) => this.signal?.sendCandidate(candidate));
    this.peer.onStateChange((state) => {
      if (state === "failed" || state === "disconnected" || state === "closed") {
        if (!this.stopping) this.fail(new Error(`RTC peer connection ${state}`));
      }
    });

    const runtime = this.options.getFecRuntime
      ? await this.options.getFecRuntime()
      : await RTCFecRuntime.load({
          modulePath: this.options.modulePath,
          wasmPath: this.options.wasmPath,
        });
    this.receiver = runtime.createReceiver(
      (channel, frame) => this.handleFrame(channel, frame),
      (packet) => this.sendPacket(packet)
    );
    this.sender = runtime.createSender((packet) => this.sendPacket(packet));

    for (const label of DATA_CHANNEL_LABELS) {
      const channel = this.peer.createDataChannel(label);
      this.channels.push(channel);
      channel.onOpen(() => this.onChannelOpen());
      channel.onClosed(() => {
        if (!this.stopping) this.fail(new Error(`RTC data channel ${label} closed`));
      });
      channel.onError((error) => this.fail(new Error(`RTC data channel ${label} failed: ${error}`)));
      channel.onMessage((message) => this.handlePacket(asBuffer(message)));
    }
    this.applyOffer();
  }

  private applyOffer(): void {
    if (!this.peer || !this.pendingOffer || this.remoteDescriptionSet) return;
    this.peer.setRemoteDescription(this.pendingOffer, "offer");
    this.peer.setLocalDescription("answer");
    this.remoteDescriptionSet = true;
    this.pendingCandidates.splice(0).forEach((candidate) => this.peer?.addRemoteCandidate(candidate, "2"));
  }

  private onChannelOpen(): void {
    if (this.channels.filter((channel) => channel.isOpen()).length !== DATA_CHANNEL_LABELS.length) return;
    if (this.heartbeatTimer || this.flowStarted) return;
    this.sendPacket(createHeartbeat());
    this.heartbeatTimer = setInterval(() => this.sendPacket(createHeartbeat()), 10_000);
    void this.startFlow().catch((error: unknown) => this.fail(error));
  }

  private async startFlow(): Promise<void> {
    await this.sendCommand(COMMAND_CLOSE_LIVE, {});
    if (!this.active || this.stopping) return;
    await this.sendCommand(COMMAND_OPEN_LIVE, {
      ClientOS: "WEB",
      entrytype: 1,
      camera_type: 0,
      streamtype: (this.options.videoCodec ?? VideoCodec.H264) === VideoCodec.H264 ? 1 : 2,
      key: "",
      msg_id: "",
      audio_chn: -1,
      stitch_mode: 1,
      chn_list: [{ index: 0, chn: this.options.channel, sensor: this.options.sensor ?? 0 }],
    });
    this.flowStarted = true;
  }

  private sendCommand(command: number, payload: Record<string, unknown>): Promise<void> {
    if (!this.sender) return Promise.reject(new Error("RTC command transport is not ready"));
    const segment = this.nextSegment();
    const frame = encodeRTCCommandFrame({
      commandId: COMMAND_ID,
      channelId: 255,
      segment,
      deviceType: 2,
      payload: {
        account_id: this.options.accountId,
        cmd: command,
        payload,
      },
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(segment);
        reject(new Error(`RTC command ${command} timed out`));
      }, COMMAND_TIMEOUT_MS);
      this.pendingCommands.set(segment, { resolve, reject, timeout });
      try {
        this.sender!.send(COMMAND_LINK, frame);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingCommands.delete(segment);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private nextSegment(): number {
    const segment = this.nextCommandSegment;
    this.nextCommandSegment = this.nextCommandSegment >= 255 ? 1 : this.nextCommandSegment + 1;
    return segment;
  }

  private sendPacket(packet: Uint8Array): void {
    const channel = this.channels.find((candidate) => candidate.isOpen());
    if (channel) channel.sendMessageBinary(packet);
  }

  private handlePacket(packet: Buffer): void {
    if (packet.byteLength >= 26 && packet.readUInt16LE(24) === HEARTBEAT_COMMAND) return;
    if (isFecPacket(packet)) this.receiver?.receive(packet);
  }

  private handleFrame(link: number, data: Buffer): void {
    if (!this.active) return;
    let frame;
    try {
      frame = decodeRTCCommandFrame(data);
    } catch (error) {
      this.fail(error);
      return;
    }

    if (link === COMMAND_RESPONSE_LINK && frame.commandId === COMMAND_ID && frame.isResponse === 1) {
      const pending = this.pendingCommands.get(frame.segment);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingCommands.delete(frame.segment);
        pending.resolve();
      }
      return;
    }
    if (link !== LIVE_LINK) return;

    if (frame.commandId === RTC_VIDEO_FRAME_COMMAND) {
      const video = decodeRTCVideoFrame(frame);
      if (!this.started) this.startStreams(video.codec, video.fps, video.width, video.height);
      this.videoStream?.push(video.data);
    } else if (frame.commandId === RTC_AUDIO_FRAME_COMMAND) {
      const audio = decodeRTCAudioFrame(frame);
      if (this.metadata) this.metadata.audioCodec = audio.codec;
      this.audioStream?.push(audio.data);
    }
  }

  private startStreams(codec: VideoCodec, fps: number, width: number, height: number): void {
    if (codec === VideoCodec.UNKNOWN) return;
    this.metadata = {
      videoCodec: codec,
      videoFPS: fps,
      videoWidth: width,
      videoHeight: height,
      audioCodec: AudioCodec.NONE,
    };
    this.videoStream = new Readable({ read: () => undefined });
    this.audioStream = new Readable({ read: () => undefined });
    this.started = true;
    this.emit("start", this.metadata, this.videoStream, this.audioStream);
  }

  private fail(error: unknown): void {
    if (!this.active || this.stopping) return;
    const normalized = error instanceof Error ? error : new Error(String(error));
    this.emit("error", normalized);
    this.stopping = true;
    this.close();
  }

  private close(): void {
    if (!this.active) return;
    this.active = false;
    this.stopping = true;
    if (this.startTimer) clearTimeout(this.startTimer);
    this.startTimer = undefined;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    for (const pending of this.pendingCommands.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("RTC media session closed"));
    }
    this.pendingCommands.clear();
    this.videoStream?.push(null);
    this.audioStream?.push(null);
    this.receiver?.close();
    this.sender?.close();
    this.channels.forEach((channel) => channel.close());
    this.channels.length = 0;
    this.peer?.close();
    try {
      this.signal?.hangup();
    } catch {
      // The signaling socket may already be closed when the media peer ends.
    } finally {
      this.signal?.close();
    }
    if (this.started) this.emit("stop");
  }
}
