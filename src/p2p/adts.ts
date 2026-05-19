import { rootP2PLogger } from "../logging";

// ADTS header: 7 bytes (protection_absent=1) or 9 bytes (protection_absent=0).
// Byte 6 bits 0-1: number_of_raw_data_blocks_in_frame (0 = 1 RDB, 3 = 4 RDBs).
// Multi-RDB frames pack several AAC raw data blocks into one ADTS frame.
// Most decoders (including FFmpeg's native aac) only support single-RDB frames,
// so we split multi-RDB frames into individual single-RDB ADTS frames.

const ADTS_SYNC_WORD = 0xfff;
const ADTS_MIN_HEADER_SIZE = 7;

/**
 * Returns true when the first two bytes contain an ADTS sync word (0xFFF).
 */
function hasAdtsSyncWord(buf: Buffer, offset: number): boolean {
  if (offset + 1 >= buf.length) return false;
  return ((buf[offset] << 4) | (buf[offset + 1] >> 4)) === ADTS_SYNC_WORD;
}

/**
 * Extract the 13-bit frame_length field from an ADTS header starting at `offset`.
 * frame_length includes the header itself.
 */
function getFrameLength(buf: Buffer, offset: number): number {
  return ((buf[offset + 3] & 0x03) << 11) | (buf[offset + 4] << 3) | ((buf[offset + 5] >> 5) & 0x07);
}

/**
 * Extract the 2-bit number_of_raw_data_blocks_in_frame field (0-indexed, so actual
 * count is value + 1).
 */
function getNumRawDataBlocks(buf: Buffer, offset: number): number {
  return buf[offset + 6] & 0x03;
}

/**
 * Returns true when `protection_absent` is 0 (CRC present).
 */
function hasCrc(buf: Buffer, offset: number): boolean {
  return (buf[offset + 1] & 0x01) === 0;
}

/**
 * Build a single-RDB ADTS frame by prepending a rewritten 7-byte header (without
 * CRC) to a raw data block.  The template header is cloned from the original
 * multi-RDB frame and patched:
 *   - frame_length   → 7 + rdbData.length
 *   - num_rdb        → 0 (meaning 1 block)
 *   - protection_absent → 1 (no CRC, since we don't recompute it)
 */
function buildSingleRdbFrame(templateHeader: Buffer, headerOffset: number, rdbData: Buffer): Buffer {
  const newLen = ADTS_MIN_HEADER_SIZE + rdbData.length;
  const out = Buffer.allocUnsafe(newLen);

  // Copy the 7-byte header template.
  templateHeader.copy(out, 0, headerOffset, headerOffset + ADTS_MIN_HEADER_SIZE);

  // Set protection_absent = 1 (bit 0 of byte 1).
  out[1] |= 0x01;

  // Rewrite frame_length (13 bits spanning bytes 3-5).
  out[3] = (out[3] & 0xfc) | ((newLen >> 11) & 0x03);
  out[4] = (newLen >> 3) & 0xff;
  out[5] = ((newLen & 0x07) << 5) | (out[5] & 0x1f);

  // Set number_of_raw_data_blocks_in_frame = 0 (bits 0-1 of byte 6).
  out[6] &= 0xfc;

  // Append the raw data block.
  rdbData.copy(out, ADTS_MIN_HEADER_SIZE);

  return out;
}

/**
 * Split a single multi-RDB ADTS frame into individual single-RDB frames.
 *
 * For multi-RDB frames the spec (ISO 14496-3 §1.A.3) places a
 * `raw_data_block_position` table after the header (and CRC when present) that
 * gives the byte offset of each RDB relative to the start of the first RDB.
 *
 * Layout:
 *   [7-byte header]
 *   [2-byte CRC]            ← only if protection_absent=0
 *   [2-byte position] × (N) ← N = number_of_raw_data_blocks_in_frame (i.e. num_rdb)
 *   [RDB 0 data ...]
 *   [RDB 1 data ...]
 *   ...
 *
 * The position entries give byte offsets relative to the start of RDB 0.
 * RDB 0 implicitly starts at offset 0.  Position[i] gives the start of RDB i+1.
 */
function splitMultiRdbFrame(buf: Buffer, offset: number, frameLength: number): Buffer[] {
  const numRdbMinusOne = getNumRawDataBlocks(buf, offset); // 1-3
  const numRdb = numRdbMinusOne + 1;
  const crcPresent = hasCrc(buf, offset);

  // Calculate where the position table starts.
  let posTableStart = offset + ADTS_MIN_HEADER_SIZE;
  if (crcPresent) {
    posTableStart += 2; // skip CRC-16
  }

  // We need (numRdb - 1) position entries, each 2 bytes.
  const posTableSize = (numRdb - 1) * 2;
  const rdbDataStart = posTableStart + posTableSize;

  if (rdbDataStart > offset + frameLength) {
    rootP2PLogger.warn("ADTS multi-RDB frame too short for position table", {
      frameLength,
      numRdb,
      rdbDataStart: rdbDataStart - offset,
    });
    return [buf.subarray(offset, offset + frameLength)];
  }

  // Read position table: offsets relative to the start of RDB 0.
  const rdbOffsets: number[] = [0]; // RDB 0 always starts at relative offset 0
  for (let i = 0; i < numRdb - 1; i++) {
    rdbOffsets.push(buf.readUInt16BE(posTableStart + i * 2));
  }

  const rdbSectionEnd = offset + frameLength;
  const result: Buffer[] = [];

  for (let i = 0; i < numRdb; i++) {
    const start = rdbDataStart + rdbOffsets[i];
    const end = i < numRdb - 1 ? rdbDataStart + rdbOffsets[i + 1] : rdbSectionEnd;

    if (start >= end || end > rdbSectionEnd) {
      rootP2PLogger.warn("ADTS multi-RDB frame has invalid RDB boundaries", {
        rdbIndex: i,
        start: start - offset,
        end: end - offset,
        frameLength,
      });
      // Return remaining data as a single frame rather than losing it.
      if (start < rdbSectionEnd) {
        result.push(buildSingleRdbFrame(buf, offset, buf.subarray(start, rdbSectionEnd)));
      }
      break;
    }

    result.push(buildSingleRdbFrame(buf, offset, buf.subarray(start, end)));
  }

  return result;
}

/**
 * Normalize a buffer of ADTS audio data by scanning for ADTS frames and splitting
 * any multi-RDB frames into individual single-RDB frames.
 *
 * The input buffer may contain one or more concatenated ADTS frames.  Non-ADTS
 * data (or data without a valid sync word) is returned unchanged in a
 * single-element array.
 *
 * For the common case of a single-RDB frame, no allocation occurs — the original
 * buffer region is returned via subarray.
 */
export function normalizeAdtsFrames(data: Buffer): Buffer[] {
  if (data.length < ADTS_MIN_HEADER_SIZE || !hasAdtsSyncWord(data, 0)) {
    // Not ADTS data — return as-is.
    return [data];
  }

  const result: Buffer[] = [];
  let pos = 0;

  while (pos + ADTS_MIN_HEADER_SIZE <= data.length) {
    if (!hasAdtsSyncWord(data, pos)) {
      // Lost sync — push remaining bytes and stop.
      rootP2PLogger.debug("ADTS sync lost, pushing remaining bytes as-is", {
        offset: pos,
        remaining: data.length - pos,
      });
      result.push(data.subarray(pos));
      break;
    }

    const frameLength = getFrameLength(data, pos);

    if (frameLength < ADTS_MIN_HEADER_SIZE || pos + frameLength > data.length) {
      // Incomplete or invalid frame — push remaining bytes.
      rootP2PLogger.debug("ADTS frame length invalid or truncated", {
        offset: pos,
        frameLength,
        available: data.length - pos,
      });
      result.push(data.subarray(pos));
      break;
    }

    const numRdbMinusOne = getNumRawDataBlocks(data, pos);

    if (numRdbMinusOne === 0) {
      // Single RDB — zero-copy, return subarray of original buffer.
      result.push(data.subarray(pos, pos + frameLength));
    } else {
      // Multi-RDB — split into individual frames.
      const splitFrames = splitMultiRdbFrame(data, pos, frameLength);
      for (const frame of splitFrames) {
        result.push(frame);
      }
    }

    pos += frameLength;
  }

  return result.length > 0 ? result : [data];
}
