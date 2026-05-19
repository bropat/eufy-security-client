import { normalizeAdtsFrames } from "../p2p/adts";

/**
 * Helper: build a valid single-RDB ADTS frame (protection_absent=1, no CRC).
 *
 * @param payloadSize - size of the fake AAC raw data block
 * @param profile     - AAC object type (0=Main, 1=LC)
 * @param sampleIndex - sampling_frequency_index (3=48kHz, 4=44.1kHz, 8=16kHz)
 * @param channels    - channel_configuration (1=mono, 2=stereo)
 */
function buildSingleRdbAdts(
  payloadSize: number,
  { profile = 1, sampleIndex = 4, channels = 2 }: { profile?: number; sampleIndex?: number; channels?: number } = {}
): Buffer {
  const frameLength = 7 + payloadSize;
  const header = Buffer.alloc(7);

  // Byte 0: sync word high 8 bits = 0xFF
  header[0] = 0xff;
  // Byte 1: sync word low 4 = 0xF, ID=0(MPEG-4), layer=0, protection_absent=1
  header[1] = 0xf1;
  // Byte 2: profile(2) | sampleIndex(4) | private(1) | channel_high(1)
  header[2] = ((profile & 0x03) << 6) | ((sampleIndex & 0x0f) << 2) | ((channels >> 2) & 0x01);
  // Byte 3: channel_low(2) | orig(1) | home(1) | copyright(1) | copystart(1) | frame_length_high(2)
  header[3] = ((channels & 0x03) << 6) | ((frameLength >> 11) & 0x03);
  // Byte 4: frame_length_mid(8)
  header[4] = (frameLength >> 3) & 0xff;
  // Byte 5: frame_length_low(3) | buffer_fullness_high(5)
  header[5] = ((frameLength & 0x07) << 5) | 0x1f; // buffer fullness = 0x7FF (VBR)
  // Byte 6: buffer_fullness_low(6) | num_rdb(2)
  header[6] = 0xfc; // buffer fullness low 6 bits = all 1, num_rdb = 0

  const payload = Buffer.alloc(payloadSize, 0xaa);
  return Buffer.concat([header, payload]);
}

/**
 * Helper: build a multi-RDB ADTS frame (protection_absent=1, no CRC).
 * Each RDB payload is filled with a distinct byte for identification.
 */
function buildMultiRdbAdts(
  rdbSizes: number[],
  { profile = 1, sampleIndex = 4, channels = 2 }: { profile?: number; sampleIndex?: number; channels?: number } = {}
): Buffer {
  const numRdb = rdbSizes.length;
  if (numRdb < 2 || numRdb > 4) throw new Error("numRdb must be 2-4");

  // Position table: (numRdb - 1) entries × 2 bytes each.
  const posTableSize = (numRdb - 1) * 2;
  const rdbTotalSize = rdbSizes.reduce((a, b) => a + b, 0);
  const frameLength = 7 + posTableSize + rdbTotalSize;

  const header = Buffer.alloc(7);
  header[0] = 0xff;
  header[1] = 0xf1; // protection_absent=1
  header[2] = ((profile & 0x03) << 6) | ((sampleIndex & 0x0f) << 2) | ((channels >> 2) & 0x01);
  header[3] = ((channels & 0x03) << 6) | ((frameLength >> 11) & 0x03);
  header[4] = (frameLength >> 3) & 0xff;
  header[5] = ((frameLength & 0x07) << 5) | 0x1f;
  header[6] = 0xfc | ((numRdb - 1) & 0x03); // num_rdb = numRdb - 1

  // Build position table (byte offsets relative to start of RDB 0).
  const posTable = Buffer.alloc(posTableSize);
  let cumulativeOffset = 0;
  for (let i = 0; i < numRdb - 1; i++) {
    cumulativeOffset += rdbSizes[i];
    posTable.writeUInt16BE(cumulativeOffset, i * 2);
  }

  // Build RDB payloads — each filled with a distinct byte.
  const rdbBuffers = rdbSizes.map((size, i) => Buffer.alloc(size, 0x10 + i));

  return Buffer.concat([header, posTable, ...rdbBuffers]);
}

/**
 * Helper: build a multi-RDB ADTS frame WITH CRC (protection_absent=0).
 */
function buildMultiRdbAdtsWithCrc(
  rdbSizes: number[],
  { profile = 1, sampleIndex = 4, channels = 2 }: { profile?: number; sampleIndex?: number; channels?: number } = {}
): Buffer {
  const numRdb = rdbSizes.length;
  if (numRdb < 2 || numRdb > 4) throw new Error("numRdb must be 2-4");

  const posTableSize = (numRdb - 1) * 2;
  const rdbTotalSize = rdbSizes.reduce((a, b) => a + b, 0);
  const frameLength = 7 + 2 + posTableSize + rdbTotalSize; // +2 for CRC

  const header = Buffer.alloc(7);
  header[0] = 0xff;
  header[1] = 0xf0; // protection_absent=0 (CRC present)
  header[2] = ((profile & 0x03) << 6) | ((sampleIndex & 0x0f) << 2) | ((channels >> 2) & 0x01);
  header[3] = ((channels & 0x03) << 6) | ((frameLength >> 11) & 0x03);
  header[4] = (frameLength >> 3) & 0xff;
  header[5] = ((frameLength & 0x07) << 5) | 0x1f;
  header[6] = 0xfc | ((numRdb - 1) & 0x03);

  // Fake CRC (2 bytes).
  const crc = Buffer.alloc(2, 0x00);

  // Position table.
  const posTable = Buffer.alloc(posTableSize);
  let cumulativeOffset = 0;
  for (let i = 0; i < numRdb - 1; i++) {
    cumulativeOffset += rdbSizes[i];
    posTable.writeUInt16BE(cumulativeOffset, i * 2);
  }

  const rdbBuffers = rdbSizes.map((size, i) => Buffer.alloc(size, 0x10 + i));

  return Buffer.concat([header, crc, posTable, ...rdbBuffers]);
}

describe("normalizeAdtsFrames", () => {
  describe("non-ADTS data", () => {
    it("should return non-ADTS data unchanged", () => {
      const data = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const result = normalizeAdtsFrames(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(data); // same reference
    });

    it("should return too-short buffers unchanged", () => {
      const data = Buffer.from([0xff, 0xf1, 0x50]);
      const result = normalizeAdtsFrames(data);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(data);
    });
  });

  describe("single-RDB frames", () => {
    it("should return a single-RDB frame as-is (zero-copy)", () => {
      const frame = buildSingleRdbAdts(100);
      const result = normalizeAdtsFrames(frame);
      expect(result).toHaveLength(1);
      // subarray shares the underlying ArrayBuffer — verify no copy.
      expect(result[0].buffer).toBe(frame.buffer);
      expect(result[0].length).toBe(frame.length);
    });

    it("should handle multiple concatenated single-RDB frames", () => {
      const frame1 = buildSingleRdbAdts(80);
      const frame2 = buildSingleRdbAdts(120);
      const combined = Buffer.concat([frame1, frame2]);
      const result = normalizeAdtsFrames(combined);
      expect(result).toHaveLength(2);
      expect(result[0].length).toBe(frame1.length);
      expect(result[1].length).toBe(frame2.length);
    });
  });

  describe("multi-RDB frames (no CRC)", () => {
    it("should split a 2-RDB frame into 2 single-RDB frames", () => {
      const rdbSizes = [64, 80];
      const multiFrame = buildMultiRdbAdts(rdbSizes);
      const result = normalizeAdtsFrames(multiFrame);
      expect(result).toHaveLength(2);

      // Each output frame should be 7 (header) + rdbSize.
      expect(result[0].length).toBe(7 + 64);
      expect(result[1].length).toBe(7 + 80);

      // Verify payload content (first RDB filled with 0x10, second with 0x11).
      expect(result[0][7]).toBe(0x10);
      expect(result[1][7]).toBe(0x11);

      // Verify each output has num_rdb=0 and protection_absent=1.
      for (const frame of result) {
        expect(frame[6] & 0x03).toBe(0); // num_rdb = 0
        expect(frame[1] & 0x01).toBe(1); // protection_absent = 1
      }
    });

    it("should split a 3-RDB frame into 3 single-RDB frames", () => {
      const rdbSizes = [50, 60, 70];
      const multiFrame = buildMultiRdbAdts(rdbSizes);
      const result = normalizeAdtsFrames(multiFrame);
      expect(result).toHaveLength(3);
      expect(result[0].length).toBe(7 + 50);
      expect(result[1].length).toBe(7 + 60);
      expect(result[2].length).toBe(7 + 70);
    });

    it("should split a 4-RDB frame into 4 single-RDB frames", () => {
      const rdbSizes = [30, 40, 50, 60];
      const multiFrame = buildMultiRdbAdts(rdbSizes);
      const result = normalizeAdtsFrames(multiFrame);
      expect(result).toHaveLength(4);
      for (let i = 0; i < 4; i++) {
        expect(result[i].length).toBe(7 + rdbSizes[i]);
        expect(result[i][7]).toBe(0x10 + i);
      }
    });

    it("should preserve ADTS header fields in split frames", () => {
      const multiFrame = buildMultiRdbAdts([100, 100], { profile: 1, sampleIndex: 8, channels: 1 });
      const result = normalizeAdtsFrames(multiFrame);
      expect(result).toHaveLength(2);
      for (const frame of result) {
        // profile = 1 (LC) → bits 6-7 of byte 2
        expect((frame[2] >> 6) & 0x03).toBe(1);
        // sampleIndex = 8 (16kHz) → bits 2-5 of byte 2
        expect((frame[2] >> 2) & 0x0f).toBe(8);
      }
    });
  });

  describe("multi-RDB frames (with CRC)", () => {
    it("should split a 2-RDB frame with CRC into 2 single-RDB frames", () => {
      const rdbSizes = [64, 80];
      const multiFrame = buildMultiRdbAdtsWithCrc(rdbSizes);
      const result = normalizeAdtsFrames(multiFrame);
      expect(result).toHaveLength(2);
      expect(result[0].length).toBe(7 + 64);
      expect(result[1].length).toBe(7 + 80);
      // Output frames should NOT have CRC (protection_absent=1).
      for (const frame of result) {
        expect(frame[1] & 0x01).toBe(1);
      }
    });
  });

  describe("mixed concatenated frames", () => {
    it("should handle a single-RDB frame followed by a multi-RDB frame", () => {
      const single = buildSingleRdbAdts(90);
      const multi = buildMultiRdbAdts([50, 60]);
      const combined = Buffer.concat([single, multi]);
      const result = normalizeAdtsFrames(combined);
      expect(result).toHaveLength(3); // 1 + 2
      expect(result[0].length).toBe(7 + 90);
      expect(result[1].length).toBe(7 + 50);
      expect(result[2].length).toBe(7 + 60);
    });
  });

  describe("edge cases", () => {
    it("should handle truncated frame gracefully", () => {
      const frame = buildSingleRdbAdts(100);
      const truncated = frame.subarray(0, 50); // cut short
      const result = normalizeAdtsFrames(truncated);
      expect(result).toHaveLength(1);
      expect(result[0].length).toBe(50);
    });

    it("should handle empty buffer", () => {
      const result = normalizeAdtsFrames(Buffer.alloc(0));
      expect(result).toHaveLength(1);
      expect(result[0].length).toBe(0);
    });
  });
});
