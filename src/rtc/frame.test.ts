import {
  decodeRTCCommandFrame,
  decodeRTCJSONPayload,
  encodeRTCCommandFrame,
  RTCCommandFrameDecoder,
  RTCDataChannel,
} from "./frame";

describe("RTC command frames", () => {
  it("encodes the captured little-endian XZYH header", () => {
    const encoded = encodeRTCCommandFrame({
      commandId: 1350,
      channelId: 255,
      segment: 2,
      deviceType: 2,
      payload: { cmd: 1003, payload: { streamtype: 2 } },
    });

    expect([...encoded.slice(0, 6)]).toEqual([0x58, 0x5a, 0x59, 0x48, 0x46, 0x05]);
    const decoded = decodeRTCCommandFrame(encoded);
    expect(decoded.commandId).toBe(1350);
    expect(decoded.channelId).toBe(255);
    expect(decoded.segment).toBe(2);
    expect(decodeRTCJSONPayload(decoded)).toEqual({ cmd: 1003, payload: { streamtype: 2 } });
  });

  it("reassembles a frame split across data-channel messages", () => {
    const encoded = encodeRTCCommandFrame({
      commandId: 1300,
      channelId: 4,
      payload: new Uint8Array([1, 2, 3, 4]),
    });
    const decoder = new RTCCommandFrameDecoder();

    expect(decoder.push(RTCDataChannel.Live, encoded.slice(0, 10))).toEqual([]);
    const frames = decoder.push(RTCDataChannel.Live, encoded.slice(10));

    expect(frames).toHaveLength(1);
    expect([...frames[0].payload]).toEqual([1, 2, 3, 4]);
  });

  it("rejects malformed lengths", () => {
    const encoded = encodeRTCCommandFrame({ commandId: 1, channelId: 0, payload: "abc" });
    expect(() => decodeRTCCommandFrame(encoded.slice(0, -1))).toThrow("length mismatch");
  });
});
