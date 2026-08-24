import { AudioCodec, VideoCodec } from "../p2p/types";
import { decodeRTCCommandFrame, encodeRTCCommandFrame } from "./frame";
import { decodeRTCAudioFrame, decodeRTCVideoFrame, RTC_AUDIO_FRAME_COMMAND, RTC_VIDEO_FRAME_COMMAND } from "./media";

describe("RTC media frames", () => {
  it("decodes video metadata and Annex B payload", () => {
    const video = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x40, 0x01, 0x0c]);
    const payload = Buffer.alloc(22 + video.byteLength);
    payload.writeUInt32LE(video.byteLength, 0);
    payload.writeUInt8(1, 4);
    payload.writeUInt8(1, 5);
    payload.writeUInt16LE(12, 6);
    payload.writeUInt16LE(0, 8);
    payload.writeUInt16LE(1920, 10);
    payload.writeUInt16LE(1080, 12);
    payload.writeUIntLE(123456, 14, 6);
    video.copy(payload, 22);

    const frame = decodeRTCCommandFrame(
      encodeRTCCommandFrame({
        commandId: RTC_VIDEO_FRAME_COMMAND,
        channelId: 101,
        payload,
      })
    );
    const decoded = decodeRTCVideoFrame(frame);

    expect(decoded.keyFrame).toBe(true);
    expect(decoded.sequence).toBe(12);
    expect(decoded.fps).toBe(15);
    expect(decoded.width).toBe(1920);
    expect(decoded.height).toBe(1080);
    expect(decoded.timestamp).toBe(123456);
    expect(decoded.codec).toBe(VideoCodec.H265);
    expect(decoded.data).toEqual(video);
  });

  it("decodes AAC metadata and payload", () => {
    const audio = Buffer.from([0xff, 0xf1, 0x50, 0x80]);
    const payload = Buffer.alloc(16 + audio.byteLength);
    payload.writeUInt32LE(audio.byteLength, 0);
    payload.writeUInt8(1, 5);
    payload.writeUInt16LE(9, 6);
    payload.writeUIntLE(654321, 8, 6);
    audio.copy(payload, 16);

    const frame = decodeRTCCommandFrame(
      encodeRTCCommandFrame({
        commandId: RTC_AUDIO_FRAME_COMMAND,
        channelId: 101,
        payload,
      })
    );
    const decoded = decodeRTCAudioFrame(frame);

    expect(decoded.codec).toBe(AudioCodec.AAC_LC);
    expect(decoded.sequence).toBe(9);
    expect(decoded.timestamp).toBe(654321);
    expect(decoded.data).toEqual(audio);
  });

  it("rejects truncated media payloads", () => {
    const frame = decodeRTCCommandFrame(
      encodeRTCCommandFrame({
        commandId: RTC_VIDEO_FRAME_COMMAND,
        channelId: 101,
        payload: Buffer.alloc(4),
      })
    );

    expect(() => decodeRTCVideoFrame(frame)).toThrow("shorter than its metadata");
  });
});
