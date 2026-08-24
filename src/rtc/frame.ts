const RTC_COMMAND_HEADER_SIZE = 16;

export enum RTCDataChannel {
  Audio = 1,
  Download = 2,
  Command = 3,
  Playback = 4,
  Live = 5,
  Binary = 6,
  Heartbeat = 99,
}

export interface RTCCommandFrame {
  commandId: number;
  channelId: number;
  segment: number;
  isResponse: number;
  deviceType: number;
  payload: Uint8Array;
}

export interface RTCCommandFrameInput {
  commandId: number;
  channelId: number;
  segment?: number;
  isResponse?: number;
  deviceType?: number;
  payload?: Uint8Array | ArrayBuffer | string | object;
}

const asBytes = (payload: RTCCommandFrameInput["payload"]): Uint8Array => {
  if (payload === undefined) return new Uint8Array();
  if (payload instanceof Uint8Array) return payload;
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  return new TextEncoder().encode(typeof payload === "string" ? payload : JSON.stringify(payload));
};

export const encodeRTCCommandFrame = (input: RTCCommandFrameInput): Uint8Array => {
  const payload = asBytes(input.payload);
  const frame = new Uint8Array(RTC_COMMAND_HEADER_SIZE + payload.byteLength);
  const view = new DataView(frame.buffer);

  frame.set([0x58, 0x5a, 0x59, 0x48], 0);
  view.setUint16(4, input.commandId, true);
  view.setUint32(6, payload.byteLength, true);
  frame[10] = 0;
  frame[11] = input.segment ?? 0;
  frame[12] = input.channelId;
  frame[13] = 0;
  frame[14] = input.isResponse ?? 0;
  frame[15] = input.deviceType ?? 2;
  frame.set(payload, RTC_COMMAND_HEADER_SIZE);
  return frame;
};

export const decodeRTCCommandFrame = (frame: Uint8Array): RTCCommandFrame => {
  if (frame.byteLength < RTC_COMMAND_HEADER_SIZE) throw new Error("RTC command frame is shorter than its header");
  if (frame[0] !== 0x58 || frame[1] !== 0x5a || frame[2] !== 0x59 || frame[3] !== 0x48) {
    throw new Error("RTC command frame has an invalid magic value");
  }

  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const payloadLength = view.getUint32(6, true);
  if (frame.byteLength !== RTC_COMMAND_HEADER_SIZE + payloadLength) {
    throw new Error(`RTC command frame length mismatch (expected ${payloadLength}, received ${frame.byteLength - 16})`);
  }

  return {
    commandId: view.getUint16(4, true),
    channelId: frame[12],
    segment: frame[11],
    isResponse: frame[14],
    deviceType: frame[15],
    payload: frame.slice(RTC_COMMAND_HEADER_SIZE),
  };
};

export const decodeRTCJSONPayload = <T>(frame: RTCCommandFrame): T => {
  const text = new TextDecoder().decode(frame.payload).replace(/\0+$/, "");
  return JSON.parse(text) as T;
};

export class RTCCommandFrameDecoder {
  private readonly pending = new Map<number, Uint8Array>();

  public push(channel: RTCDataChannel, chunk: Uint8Array): Array<RTCCommandFrame> {
    if (channel === RTCDataChannel.Heartbeat) return [];

    const previous = this.pending.get(channel);
    const input = previous ? this.concat(previous, chunk) : chunk;
    const frames: Array<RTCCommandFrame> = [];
    let offset = 0;

    while (input.byteLength - offset >= RTC_COMMAND_HEADER_SIZE) {
      const view = new DataView(input.buffer, input.byteOffset + offset, input.byteLength - offset);
      const payloadLength = view.getUint32(6, true);
      const frameLength = RTC_COMMAND_HEADER_SIZE + payloadLength;
      if (input.byteLength - offset < frameLength) break;
      frames.push(decodeRTCCommandFrame(input.slice(offset, offset + frameLength)));
      offset += frameLength;
    }

    if (offset < input.byteLength) this.pending.set(channel, input.slice(offset));
    else this.pending.delete(channel);
    return frames;
  }

  public reset(): void {
    this.pending.clear();
  }

  private concat(left: Uint8Array, right: Uint8Array): Uint8Array {
    const result = new Uint8Array(left.byteLength + right.byteLength);
    result.set(left, 0);
    result.set(right, left.byteLength);
    return result;
  }
}
