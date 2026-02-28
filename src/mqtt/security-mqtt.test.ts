import { SecurityMQTTService } from "./security-mqtt";
import { BleLockProtocol } from "./ble-lock-protocol";

/* eslint-disable @typescript-eslint/no-explicit-any */

function createService(): any {
  return new SecurityMQTTService("test-auth-token", "test-user-id", "test-udid", "US");
}

describe("BleLockProtocol", () => {
  describe("parseBleFrame", () => {
    it("returns null for buffer shorter than 10 bytes", () => {
      const buf = Buffer.from([0xff, 0x09, 0x00, 0x00, 0x00]);
      expect(BleLockProtocol.parseBleFrame(buf)).toBeNull();
    });

    it("returns null for buffer without FF09 header", () => {
      const buf = Buffer.alloc(12);
      buf[0] = 0xaa;
      buf[1] = 0xbb;
      expect(BleLockProtocol.parseBleFrame(buf)).toBeNull();
    });

    it("parses an unencrypted NOTIFY frame (commandCode=74)", () => {
      // Build a minimal FF09 frame: [FF, 09, 5 header bytes, flags(2), data..., checksum]
      const buf = Buffer.alloc(12);
      buf[0] = 0xff;
      buf[1] = 0x09;
      // flags at bytes 7-8: commandCode=74 (0x4A), no encrypted, no response
      buf.writeUInt16BE(74, 7); // 0x004A
      buf[9] = 0xa1; // TLV data
      buf[10] = 0x01;
      buf[11] = 0x00; // checksum byte

      const result = BleLockProtocol.parseBleFrame(buf);
      expect(result).not.toBeNull();
      expect(result!.isEncrypted).toBe(false);
      expect(result!.isResponse).toBe(false);
      expect(result!.commandCode).toBe(74);
      expect(result!.data.length).toBe(2); // bytes 9..10 (excluding last checksum byte)
    });

    it("parses an encrypted response ON_OFF_LOCK frame (commandCode=35)", () => {
      const buf = Buffer.alloc(11);
      buf[0] = 0xff;
      buf[1] = 0x09;
      // flags: bit 14 (encrypted) | bit 11 (response) | 35
      // bit 14 = 0x4000, bit 11 = 0x0800, 35 = 0x0023
      const flags = 0x4000 | 0x0800 | 35;
      buf.writeUInt16BE(flags, 7);
      buf[9] = 0x00; // data
      buf[10] = 0x00; // checksum

      const result = BleLockProtocol.parseBleFrame(buf);
      expect(result).not.toBeNull();
      expect(result!.isEncrypted).toBe(true);
      expect(result!.isResponse).toBe(true);
      expect(result!.commandCode).toBe(35);
    });
  });

  describe("isHeartbeat", () => {
    it("returns true for unencrypted NOTIFY frame", () => {
      expect(BleLockProtocol.isHeartbeat({
        isEncrypted: false,
        isResponse: false,
        commandCode: 74, // SmartLockBleCommandFunctionType2.NOTIFY
        data: Buffer.alloc(0),
      })).toBe(true);
    });

    it("returns false for encrypted NOTIFY frame", () => {
      expect(BleLockProtocol.isHeartbeat({
        isEncrypted: true,
        isResponse: false,
        commandCode: 74,
        data: Buffer.alloc(0),
      })).toBe(false);
    });
  });

  describe("isLockCommandResponse", () => {
    it("returns true for response ON_OFF_LOCK frame", () => {
      expect(BleLockProtocol.isLockCommandResponse({
        isEncrypted: false,
        isResponse: true,
        commandCode: 35, // SmartLockBleCommandFunctionType2.ON_OFF_LOCK
        data: Buffer.alloc(0),
      })).toBe(true);
    });

    it("returns false for non-response frame", () => {
      expect(BleLockProtocol.isLockCommandResponse({
        isEncrypted: false,
        isResponse: false,
        commandCode: 35,
        data: Buffer.alloc(0),
      })).toBe(false);
    });
  });

  describe("parseHeartbeat", () => {
    it("parses battery and locked state", () => {
      // TLV: [0xA1, 0x01, 85, 0xA2, 0x01, 0x04] = battery=85, lockStatus=4 (locked)
      const data = Buffer.from([0xa1, 0x01, 85, 0xa2, 0x01, 0x04]);
      const result = BleLockProtocol.parseHeartbeat(data);

      expect(result).not.toBeNull();
      expect(result!.battery).toBe(85);
      expect(result!.locked).toBe(true);
      expect(result!.rawLockStatus).toBe(4);
    });

    it("parses unlocked state when lockStatus is 3", () => {
      const data = Buffer.from([0xa1, 0x01, 50, 0xa2, 0x01, 0x03]);
      const result = BleLockProtocol.parseHeartbeat(data);

      expect(result).not.toBeNull();
      expect(result!.locked).toBe(false);
      expect(result!.battery).toBe(50);
    });

    it("skips return code byte when present", () => {
      // Leading 0x00 is a return code (below 0xA0), should be skipped
      const data = Buffer.from([0x00, 0xa1, 0x01, 100, 0xa2, 0x01, 0x04]);
      const result = BleLockProtocol.parseHeartbeat(data);

      expect(result).not.toBeNull();
      expect(result!.battery).toBe(100);
      expect(result!.locked).toBe(true);
    });

    it("returns null when no lock status TLV is present", () => {
      // Only battery tag, no lock status
      const data = Buffer.from([0xa1, 0x01, 80]);
      const result = BleLockProtocol.parseHeartbeat(data);

      expect(result).toBeNull();
    });
  });
});

describe("SecurityMQTTService", () => {
  describe("getMqttTopic", () => {
    it("builds the correct request topic", () => {
      const service = createService();
      expect(service.getMqttTopic("T85D0", "SN123", "req"))
        .toBe("cmd/eufy_security/T85D0/SN123/req");
    });

    it("builds the correct response topic", () => {
      const service = createService();
      expect(service.getMqttTopic("T85D0", "SN123", "res"))
        .toBe("cmd/eufy_security/T85D0/SN123/res");
    });
  });

  describe("buildClientId", () => {
    it("builds client ID matching Android app pattern", () => {
      const service = createService();
      // Set userId via any cast since it's private
      (service as any).userId = "user123";
      const result = service.buildClientId("security-mqtt-us.anker.com");
      expect(result).toBe("android-eufy_security-user123-test-udidsecuritymqttusankercom");
    });
  });

  describe("generateSeed", () => {
    it("generates a 32-character hex string", () => {
      const seed = (SecurityMQTTService as any).generateSeed();
      expect(seed).toHaveLength(32);
      expect(seed).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe("isConnected", () => {
    it("returns false when not connected", () => {
      const service = createService();
      expect(service.isConnected()).toBe(false);
    });
  });

  describe("close", () => {
    it("does not throw when called before connect", () => {
      const service = createService();
      expect(() => service.close()).not.toThrow();
    });
  });
});
