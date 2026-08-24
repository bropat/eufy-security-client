import { readFile } from "fs/promises";
import { resolve } from "path";

type FecCallback = (...args: Array<number>) => number;

interface FecModule {
  HEAPU8: Uint8Array;
  addFunction(callback: FecCallback, signature: string): number;
  _set_mxlog_level(level: number): void;
  _sctp_frame_manager_create(
    role: number,
    dataChannelId: number,
    maxDelayMs: number,
    maxPacketCount: number,
    maxPacketBytes: number,
    maxFecGroups: number
  ): number;
  _sctp_frame_manager_destroy(manager: number): void;
  _sctp_frame_manager_set_recv_frame_callback(manager: number, callback: number): void;
  _sctp_frame_manager_set_send_packet_callback(manager: number, callback: number): void;
  _sctp_frame_manager_get_packet_buffer(manager: number, size: number): number;
  _sctp_packet_get_data(packet: number): number;
  _sctp_frame_manager_push_packet_data(manager: number, packet: number): number;
  _sctp_frame_manager_get_frame_buffer(manager: number, size: number): number;
  _sctp_frame_buffer_get_data(frame: number): number;
  _sctp_frame_buffer_set_size(frame: number, size: number): void;
  _sctp_frame_manager_push_frame_data(manager: number, frame: number, channel: number): number;
  _sctp_frame_manager_on_100ms_timer(manager: number, now: number): void;
}

type FecInitializer = (options: { wasmBinary: Buffer }) => Promise<FecModule>;
type PacketHandler = (packet: Buffer) => void;
type FrameHandler = (channel: number, frame: Buffer) => void;

export interface RTCFecPaths {
  modulePath?: string;
  wasmPath?: string;
}

export interface RTCFecReceiver {
  receive(packet: Uint8Array): void;
  close(): void;
}

export interface RTCFecSender {
  send(channel: number, frame: Uint8Array): void;
  close(): void;
}

const getPaths = (paths: RTCFecPaths): Required<RTCFecPaths> => {
  const modulePath = paths.modulePath ?? process.env.EUFY_SECURITY_RTC_SCTP_MODULE;
  if (!modulePath) {
    throw new Error("RTC FEC runtime is unavailable; set EUFY_SECURITY_RTC_SCTP_MODULE");
  }
  const absoluteModulePath = resolve(modulePath);
  return {
    modulePath: absoluteModulePath,
    wasmPath:
      paths.wasmPath ?? process.env.EUFY_SECURITY_RTC_SCTP_WASM ?? absoluteModulePath.replace(/\.js$/i, ".wasm"),
  };
};

const linkToChannel = (link: number): number => {
  switch (link) {
    case 1:
      return 0;
    case 2:
      return 3;
    case 3:
      return 2;
    case 4:
      return 4;
    case 5:
    case 6:
      return 5;
    default:
      throw new Error(`Unsupported RTC FEC link type ${link}`);
  }
};

export class RTCFecRuntime {
  private frameHandler?: FrameHandler;
  private packetHandler?: PacketHandler;
  private readonly receiveCallback: number;
  private readonly sendCallback: number;

  private constructor(private readonly module: FecModule) {
    module._set_mxlog_level(6);
    this.receiveCallback = module.addFunction((_id, channel, pointer, size) => {
      this.frameHandler?.(channel, Buffer.from(module.HEAPU8.slice(pointer, pointer + size)));
      return 0;
    }, "iiiii");
    this.sendCallback = module.addFunction((_id, pointer, size) => {
      this.packetHandler?.(Buffer.from(module.HEAPU8.slice(pointer, pointer + size)));
      return 0;
    }, "iiii");
  }

  public static async load(paths: RTCFecPaths = {}): Promise<RTCFecRuntime> {
    const resolved = getPaths(paths);
    // Each active stream gets its own WASM heap because the runtime's fixed heap
    // cannot hold the browser-sized recovery windows for several cameras.
    const initialize = require(resolved.modulePath) as FecInitializer;
    const module = await initialize({ wasmBinary: await readFile(resolved.wasmPath) });
    return new RTCFecRuntime(module);
  }

  public createReceiver(onFrame: FrameHandler, onPacket: PacketHandler): RTCFecReceiver {
    const manager = this.module._sctp_frame_manager_create(0, 1, 15_000, 5_000, 1_000, 10);
    if (!manager) throw new Error("Unable to create RTC FEC receiver");
    this.module._sctp_frame_manager_set_recv_frame_callback(manager, this.receiveCallback);
    this.module._sctp_frame_manager_set_send_packet_callback(manager, this.sendCallback);

    const timer = setInterval(
      () =>
        this.withHandlers(onFrame, onPacket, () => this.module._sctp_frame_manager_on_100ms_timer(manager, Date.now())),
      100
    );
    let closed = false;
    return {
      receive: (packet) => {
        if (closed) return;
        this.withHandlers(onFrame, onPacket, () => {
          const packetBuffer = this.module._sctp_frame_manager_get_packet_buffer(manager, packet.byteLength);
          if (!packetBuffer) throw new Error("Unable to allocate an RTC FEC packet");
          const data = this.module._sctp_packet_get_data(packetBuffer);
          this.module.HEAPU8.set(packet, data);
          const result = this.module._sctp_frame_manager_push_packet_data(manager, packetBuffer);
          if (result) throw new Error(`RTC FEC packet failed with ${result}`);
        });
      },
      close: () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        this.module._sctp_frame_manager_destroy(manager);
      },
    };
  }

  public createSender(onPacket: PacketHandler): RTCFecSender {
    const manager = this.module._sctp_frame_manager_create(1, 0, 15_000, 1_000, 1_000, 10);
    if (!manager) throw new Error("Unable to create RTC FEC sender");
    this.module._sctp_frame_manager_set_send_packet_callback(manager, this.sendCallback);

    let closed = false;
    return {
      send: (channel, frame) => {
        if (closed) throw new Error("RTC FEC sender is closed");
        this.withHandlers(undefined, onPacket, () => {
          const frameBuffer = this.module._sctp_frame_manager_get_frame_buffer(manager, frame.byteLength);
          if (!frameBuffer) throw new Error("Unable to allocate an RTC FEC frame");
          const data = this.module._sctp_frame_buffer_get_data(frameBuffer);
          this.module.HEAPU8.set(frame, data);
          this.module._sctp_frame_buffer_set_size(frameBuffer, frame.byteLength);
          const result = this.module._sctp_frame_manager_push_frame_data(manager, frameBuffer, linkToChannel(channel));
          if (result) throw new Error(`RTC FEC frame failed with ${result}`);
        });
      },
      close: () => {
        if (closed) return;
        closed = true;
        this.module._sctp_frame_manager_destroy(manager);
      },
    };
  }

  private withHandlers<T>(frameHandler: FrameHandler | undefined, packetHandler: PacketHandler, action: () => T): T {
    const previousFrameHandler = this.frameHandler;
    const previousPacketHandler = this.packetHandler;
    this.frameHandler = frameHandler;
    this.packetHandler = packetHandler;
    try {
      return action();
    } finally {
      this.frameHandler = previousFrameHandler;
      this.packetHandler = previousPacketHandler;
    }
  }
}
