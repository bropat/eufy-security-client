import { AudioCodec, VideoCodec } from "../p2p/types";
import { getVideoCodec } from "../p2p/utils";
import type { RTCCommandFrame } from "./frame";

export const RTC_VIDEO_FRAME_COMMAND = 1300;
export const RTC_AUDIO_FRAME_COMMAND = 1301;

export interface RTCVideoFrame {
  keyFrame: boolean;
  streamType: number;
  sequence: number;
  fps: number;
  width: number;
  height: number;
  timestamp: number;
  codec: VideoCodec;
  data: Buffer;
}

export interface RTCAudioFrame {
  audioType: number;
  sequence: number;
  timestamp: number;
  codec: AudioCodec;
  data: Buffer;
}

export const decodeRTCVideoFrame = (frame: RTCCommandFrame): RTCVideoFrame => {
  if (frame.commandId !== RTC_VIDEO_FRAME_COMMAND) {
    throw new Error(`RTC command ${frame.commandId} is not a video frame`);
  }
  if (frame.payload.byteLength < 22) throw new Error("RTC video frame is shorter than its metadata");

  const payload = Buffer.from(frame.payload);
  const dataLength = payload.readUInt32LE(0);
  if (dataLength < 0 || dataLength > payload.byteLength - 22) {
    throw new Error(`RTC video frame length mismatch (expected ${dataLength}, received ${payload.byteLength - 22})`);
  }

  const data = payload.subarray(22, 22 + dataLength);
  return {
    keyFrame: payload.readUInt8(4) === 1,
    streamType: payload.readUInt8(5),
    sequence: payload.readUInt16LE(6),
    fps: payload.readUInt16LE(8) || 15,
    width: payload.readUInt16LE(10),
    height: payload.readUInt16LE(12),
    timestamp: payload.readUIntLE(14, 6),
    codec: getVideoCodec(data),
    data,
  };
};

export const decodeRTCAudioFrame = (frame: RTCCommandFrame): RTCAudioFrame => {
  if (frame.commandId !== RTC_AUDIO_FRAME_COMMAND) {
    throw new Error(`RTC command ${frame.commandId} is not an audio frame`);
  }
  if (frame.payload.byteLength < 16) throw new Error("RTC audio frame is shorter than its metadata");

  const payload = Buffer.from(frame.payload);
  const dataLength = payload.readUInt32LE(0);
  if (dataLength < 0 || dataLength > payload.byteLength - 16) {
    throw new Error(`RTC audio frame length mismatch (expected ${dataLength}, received ${payload.byteLength - 16})`);
  }

  const audioType = payload.readUInt8(5);
  return {
    audioType,
    sequence: payload.readUInt16LE(6),
    timestamp: payload.readUIntLE(8, 6),
    codec:
      audioType === 0
        ? AudioCodec.AAC
        : audioType === 1
          ? AudioCodec.AAC_LC
          : audioType === 7
            ? AudioCodec.AAC_ELD
            : AudioCodec.UNKNOWN,
    data: payload.subarray(16, 16 + dataLength),
  };
};
