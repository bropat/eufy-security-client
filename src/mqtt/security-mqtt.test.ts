import { SecurityMQTTService } from "./security-mqtt";

// Access private methods for testing via any cast
type TestableService = SecurityMQTTService & {
  parseBleFrame(buffer: Buffer): { isEncrypted: boolean; isResponse: boolean; commandCode: number; data: Buffer } | null;
  parseHeartbeat(deviceSN: string, data: Buffer): void;
  buildClientId(host: string): string;
  generateSeed(): string;
  getMqttTopic(deviceModel: string, deviceSN: string, direction: "req" | "res"): string;
};

function createService(): TestableService {
  return new SecurityMQTTService("test@test.com", "password", "test-udid", "US") as TestableService;
}

describe("SecurityMQTTService", () => {
  describe("parseBleFrame", () => {
    const service = createService();

    it("returns null for buffer shorter than 10 bytes", () => {
      const buf = Buffer.from([0xff, 0x09, 0x00, 0x00, 0x00]);
      expect(service.parseBleFrame(buf)).toBeNull();
    });

    it("returns null for buffer without FF09 header", () => {
      const buf = Buffer.alloc(12);
      buf[0] = 0xaa;
      buf[1] = 0xbb;
      expect(service.parseBleFrame(buf)).toBeNull();
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

      const result = service.parseBleFrame(buf);
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

      const result = service.parseBleFrame(buf);
      expect(result).not.toBeNull();
      expect(result!.isEncrypted).toBe(true);
      expect(result!.isResponse).toBe(true);
      expect(result!.commandCode).toBe(35);
    });
  });

  describe("parseHeartbeat", () => {
    it("emits lock-status with battery and locked state", () => {
      const service = createService();
      const emitted: { deviceSN: string; locked: boolean; battery: number }[] = [];
      service.on("lock status", (deviceSN, locked, battery) => {
        emitted.push({ deviceSN, locked, battery });
      });

      // TLV: [0xA1, 0x01, 85, 0xA2, 0x01, 0x04] = battery=85, lockStatus=4 (locked)
      const data = Buffer.from([0xa1, 0x01, 85, 0xa2, 0x01, 0x04]);
      service.parseHeartbeat("TEST_SN_001", data);

      expect(emitted).toHaveLength(1);
      expect(emitted[0].deviceSN).toBe("TEST_SN_001");
      expect(emitted[0].locked).toBe(true);
      expect(emitted[0].battery).toBe(85);
    });

    it("emits unlocked state when lockStatus is 3", () => {
      const service = createService();
      const emitted: { locked: boolean; battery: number }[] = [];
      service.on("lock status", (_sn, locked, battery) => {
        emitted.push({ locked, battery });
      });

      const data = Buffer.from([0xa1, 0x01, 50, 0xa2, 0x01, 0x03]);
      service.parseHeartbeat("TEST_SN_002", data);

      expect(emitted).toHaveLength(1);
      expect(emitted[0].locked).toBe(false);
      expect(emitted[0].battery).toBe(50);
    });

    it("skips return code byte when present", () => {
      const service = createService();
      const emitted: { locked: boolean; battery: number }[] = [];
      service.on("lock status", (_sn, locked, battery) => {
        emitted.push({ locked, battery });
      });

      // Leading 0x00 is a return code (below 0xA0), should be skipped
      const data = Buffer.from([0x00, 0xa1, 0x01, 100, 0xa2, 0x01, 0x04]);
      service.parseHeartbeat("TEST_SN_003", data);

      expect(emitted).toHaveLength(1);
      expect(emitted[0].battery).toBe(100);
      expect(emitted[0].locked).toBe(true);
    });

    it("does not emit when no lock status TLV is present", () => {
      const service = createService();
      let emitCount = 0;
      service.on("lock status", () => { emitCount++; });

      // Only battery tag, no lock status
      const data = Buffer.from([0xa1, 0x01, 80]);
      service.parseHeartbeat("TEST_SN_004", data);

      expect(emitCount).toBe(0);
    });
  });

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
      // Set userCenterId via any cast since it's private
      (service as any).userCenterId = "user123";
      const result = service.buildClientId("security-mqtt-us.anker.com");
      expect(result).toBe("android-eufy_security-user123-test-udidsecuritymqttusankercom");
    });
  });

  describe("generateSeed", () => {
    it("generates a 32-character hex string", () => {
      const service = createService();
      const seed = service.generateSeed();
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
