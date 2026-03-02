import { SmartLockBleCommandFunctionType2 } from "../p2p/types";

/** BLE frame header magic bytes (FF09 protocol). */
const BLE_FRAME_HEADER_BYTE_0 = 0xff;
const BLE_FRAME_HEADER_BYTE_1 = 0x09;
const BLE_FRAME_MIN_LENGTH = 10;

/** TLV tag for battery level in heartbeat responses. */
const HEARTBEAT_TLV_TAG_BATTERY = 0xa1;
/** TLV tag for lock status in heartbeat responses. */
const HEARTBEAT_TLV_TAG_LOCK_STATUS = 0xa2;

/** Lock status value indicating the lock is locked. */
const LOCK_STATUS_LOCKED = 4;

/** Parsed result from a BLE FF09 frame. */
export interface BleFrame {
  isEncrypted: boolean;
  isResponse: boolean;
  commandCode: number;
  data: Buffer;
}

/** Parsed heartbeat data extracted from a NOTIFY TLV payload. */
export interface HeartbeatData {
  /** Battery percentage (0-100), or -1 if not present in the TLV. */
  battery: number;
  /** Whether the lock is in the locked state. */
  locked: boolean;
  /** Raw lock status byte from the TLV. */
  rawLockStatus: number;
}

/**
 * Handles BLE command frame parsing for the FF09 smart lock protocol.
 *
 * This is the same wire format used by T8506/T8502 smart locks over Bluetooth,
 * but here the frames are transported over MQTT instead of P2P.
 *
 * Frame format: [0xFF, 0x09, ...header(5 bytes), flags(2 bytes), ...data, checksum(1 byte)]
 * Flags: bit 14 = encrypted, bit 11 = response, bits 0-10 = command code
 */
export class BleLockProtocol {
  /**
   * Parses a BLE frame from the FF09 protocol.
   *
   * @returns Parsed frame fields, or null if the buffer is not a valid FF09 frame.
   */
  static parseBleFrame(buffer: Buffer): BleFrame | null {
    if (buffer.length < BLE_FRAME_MIN_LENGTH || buffer[0] !== BLE_FRAME_HEADER_BYTE_0 || buffer[1] !== BLE_FRAME_HEADER_BYTE_1) {
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
   * Checks whether a parsed BLE frame is a heartbeat notification.
   *
   * Heartbeats are unencrypted NOTIFY frames containing TLV-encoded
   * battery level and lock status.
   */
  static isHeartbeat(frame: BleFrame): boolean {
    return !frame.isEncrypted && frame.commandCode === SmartLockBleCommandFunctionType2.NOTIFY;
  }

  /**
   * Checks whether a parsed BLE frame is a lock/unlock command acknowledgment.
   */
  static isLockCommandResponse(frame: BleFrame): boolean {
    return frame.isResponse && frame.commandCode === SmartLockBleCommandFunctionType2.ON_OFF_LOCK;
  }

  /**
   * Parses a heartbeat TLV payload to extract battery level and lock status.
   *
   * The TLV format uses tag 0xA1 for battery percentage and tag 0xA2 for lock status.
   * A leading byte below 0xA0 is a return code and is skipped.
   *
   * @returns Parsed heartbeat data, or null if no lock status TLV was found.
   */
  static parseHeartbeat(data: Buffer): HeartbeatData | null {
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

    if (lockStatus === -1) {
      return null;
    }

    return {
      battery,
      locked: lockStatus === LOCK_STATUS_LOCKED,
      rawLockStatus: lockStatus,
    };
  }
}
