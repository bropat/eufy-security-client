import {
    isPrivateIp,
    isP2PCommandEncrypted,
    getP2PCommandEncryptionKey,
    paddingP2PData,
    encryptP2PData,
    decryptP2PData,
    hasHeader,
    findStartCode,
    isIFrame,
    getVideoCodec,
    checkT8420,
    buildVoidCommandPayload,
    DecimalToRGBColor,
    RGBColorToDecimal,
    getNullTerminatedString,
    isUsbCharging,
    isSolarCharging,
    isPlugSolarCharging,
    isCharging,
    getCurrentTimeInSeconds,
    encodeLockPayload,
    getLockVectorBytes,
    decodeLockPayload,
    decodeBase64,
    eslTimestamp,
    generateAdvancedLockAESKey,
    encryptLockAESData,
    decryptLockAESData,
    encryptPayloadData,
    decryptPayloadData,
    sortP2PMessageParts,
    generateSmartLockAESKey,
    readNullTerminatedBuffer,
    MAGIC_WORD,
    generateBasicLockAESKey,
    eufyKDF,
} from "../utils";
import { VideoCodec } from "../types";

jest.mock("../../logging", () => ({
    rootP2PLogger: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
    rootMainLogger: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

describe("p2p/utils", () => {
    describe("MAGIC_WORD", () => {
        it("should be XZYH", () => {
            expect(MAGIC_WORD).toBe("XZYH");
        });
    });

    describe("isPrivateIp", () => {
        it("should detect 10.x.x.x as private", () => {
            expect(isPrivateIp("10.0.0.1")).toBe(true);
            expect(isPrivateIp("10.255.255.255")).toBe(true);
        });

        it("should detect 192.168.x.x as private", () => {
            expect(isPrivateIp("192.168.0.1")).toBe(true);
            expect(isPrivateIp("192.168.1.100")).toBe(true);
        });

        it("should detect 172.16-31.x.x as private", () => {
            expect(isPrivateIp("172.16.0.1")).toBe(true);
            expect(isPrivateIp("172.31.255.255")).toBe(true);
        });

        it("should reject 172 addresses outside private range", () => {
            expect(isPrivateIp("172.15.0.1")).toBe(false);
            expect(isPrivateIp("172.32.0.1")).toBe(false);
        });

        it("should detect 127.x.x.x (loopback) as private", () => {
            expect(isPrivateIp("127.0.0.1")).toBe(true);
        });

        it("should detect 169.254.x.x (link-local) as private", () => {
            expect(isPrivateIp("169.254.1.1")).toBe(true);
        });

        it("should detect IPv6 loopback ::1 as private", () => {
            expect(isPrivateIp("::1")).toBe(true);
        });

        it("should detect :: as private", () => {
            expect(isPrivateIp("::")).toBe(true);
        });

        it("should detect fe80: (link-local IPv6) as private", () => {
            expect(isPrivateIp("fe80:abcd::1")).toBe(true);
        });

        it("should detect IPv6 unique local (fc/fd) as private", () => {
            expect(isPrivateIp("fc00:1234::1")).toBe(true);
            expect(isPrivateIp("fd12:3456::1")).toBe(true);
        });

        it("should detect IPv4-mapped IPv6 private addresses", () => {
            expect(isPrivateIp("::ffff:10.0.0.1")).toBe(true);
            expect(isPrivateIp("::ffff:192.168.1.1")).toBe(true);
        });

        it("should reject public IPs", () => {
            expect(isPrivateIp("8.8.8.8")).toBe(false);
            expect(isPrivateIp("1.1.1.1")).toBe(false);
            expect(isPrivateIp("203.0.113.1")).toBe(false);
        });
    });

    describe("isP2PCommandEncrypted", () => {
        it("should return true for known encrypted commands", () => {
            expect(isP2PCommandEncrypted(1001)).toBe(true);
            expect(isP2PCommandEncrypted(1200)).toBe(true);
            expect(isP2PCommandEncrypted(1700)).toBe(true);
        });

        it("should return false for non-encrypted commands", () => {
            expect(isP2PCommandEncrypted(0)).toBe(false);
            expect(isP2PCommandEncrypted(999)).toBe(false);
            expect(isP2PCommandEncrypted(9999)).toBe(false);
        });
    });

    describe("getP2PCommandEncryptionKey", () => {
        it("should return last 7 chars of serial + 9 chars from p2pDid around first hyphen", () => {
            const result = getP2PCommandEncryptionKey("T8010P1234567890", "ABCDEF-12345678-GHIJKLMN");
            expect(result).toBe("4567890-12345678");
        });

        it("should handle short serial numbers", () => {
            const result = getP2PCommandEncryptionKey("ABC1234", "XX-99999999-YY");
            expect(result).toBe("ABC1234-99999999");
        });
    });

    describe("paddingP2PData", () => {
        it("should pad data smaller than blocksize to blocksize", () => {
            const data = Buffer.from([1, 2, 3]);
            const result = paddingP2PData(data);
            expect(result.length).toBe(16);
            expect(result[0]).toBe(1);
            expect(result[3]).toBe(0); // padded with zeros
        });

        it("should pad data to next multiple of blocksize", () => {
            const data = Buffer.alloc(17, 0xaa);
            const result = paddingP2PData(data);
            expect(result.length).toBe(32);
        });

        it("should not pad data already aligned to blocksize", () => {
            const data = Buffer.alloc(16, 0xbb);
            const result = paddingP2PData(data);
            expect(result.length).toBe(16);
        });

        it("should support custom blocksize", () => {
            const data = Buffer.from([1, 2, 3]);
            const result = paddingP2PData(data, 8);
            expect(result.length).toBe(8);
        });
    });

    describe("encryptP2PData / decryptP2PData", () => {
        it("should round-trip encrypt and decrypt", () => {
            const key = Buffer.alloc(16, 0x42);
            const data = Buffer.alloc(16, 0xaa);
            const encrypted = encryptP2PData(data, key);
            const decrypted = decryptP2PData(encrypted, key);
            expect(decrypted).toEqual(data);
        });
    });

    describe("hasHeader", () => {
        it("should return true when first 2 bytes match", () => {
            const msg = Buffer.from([0xf1, 0xd0, 0x00, 0x01]);
            const header = Buffer.from([0xf1, 0xd0]);
            expect(hasHeader(msg, header)).toBe(true);
        });

        it("should return false when first 2 bytes do not match", () => {
            const msg = Buffer.from([0xf1, 0xd1, 0x00, 0x01]);
            const header = Buffer.from([0xf1, 0xd0]);
            expect(hasHeader(msg, header)).toBe(false);
        });
    });

    describe("findStartCode", () => {
        it("should detect 3-byte start code 0x000001", () => {
            expect(findStartCode(Buffer.from([0x00, 0x00, 0x01, 0x65]))).toBe(true);
        });

        it("should detect 4-byte start code 0x00000001", () => {
            expect(findStartCode(Buffer.from([0x00, 0x00, 0x00, 0x01, 0x67]))).toBe(true);
        });

        it("should detect 3-byte start code in exactly 3-byte buffer", () => {
            expect(findStartCode(Buffer.from([0x00, 0x00, 0x01]))).toBe(true);
        });

        it("should return false for non-start-code data", () => {
            expect(findStartCode(Buffer.from([0x01, 0x02, 0x03, 0x04]))).toBe(false);
        });

        it("should return false for empty buffer", () => {
            expect(findStartCode(Buffer.from([]))).toBe(false);
        });

        it("should return false for 2-byte buffer", () => {
            expect(findStartCode(Buffer.from([0x00, 0x00]))).toBe(false);
        });
    });

    describe("isIFrame", () => {
        it("should detect I-frame by byte at index 3", () => {
            expect(isIFrame(Buffer.from([0x00, 0x00, 0x00, 0x67, 0x00]))).toBe(true); // 103
            expect(isIFrame(Buffer.from([0x00, 0x00, 0x00, 0x65, 0x00]))).toBe(true); // 101
            expect(isIFrame(Buffer.from([0x00, 0x00, 0x00, 0x40, 0x00]))).toBe(true); // 64
        });

        it("should detect I-frame by byte at index 4", () => {
            expect(isIFrame(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x67]))).toBe(true);
        });

        it("should return false for non-I-frame data", () => {
            expect(isIFrame(Buffer.from([0x00, 0x00, 0x00, 0x01, 0x02]))).toBe(false);
        });

        it("should return false for short buffers", () => {
            expect(isIFrame(Buffer.from([0x00, 0x00, 0x00, 0x67]))).toBe(false);
            expect(isIFrame(Buffer.from([]))).toBe(false);
        });
    });

    describe("getVideoCodec", () => {
        it("should return H265 for H.265 NAL unit types at index 3", () => {
            expect(getVideoCodec(Buffer.from([0x00, 0x00, 0x00, 0x26, 0x00]))).toBe(VideoCodec.H265); // 38
            expect(getVideoCodec(Buffer.from([0x00, 0x00, 0x00, 0x40, 0x00]))).toBe(VideoCodec.H265); // 64
        });

        it("should return H265 for H.265 NAL unit types at index 4", () => {
            expect(getVideoCodec(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x42]))).toBe(VideoCodec.H265); // 66
        });

        it("should return H264 for SPS NAL type 103 at index 3", () => {
            expect(getVideoCodec(Buffer.from([0x00, 0x00, 0x00, 0x67, 0x00]))).toBe(VideoCodec.H264);
        });

        it("should return H264 for SPS NAL type 103 at index 4", () => {
            expect(getVideoCodec(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x67]))).toBe(VideoCodec.H264);
        });

        it("should default to H264 for unrecognized 5+ byte data", () => {
            expect(getVideoCodec(Buffer.from([0x00, 0x00, 0x00, 0x01, 0x02]))).toBe(VideoCodec.H264);
        });

        it("should return H264 for short non-empty data", () => {
            expect(getVideoCodec(Buffer.from([0x01]))).toBe(VideoCodec.H264);
        });

        it("should return UNKNOWN for empty buffer", () => {
            expect(getVideoCodec(Buffer.from([]))).toBe(VideoCodec.UNKNOWN);
        });
    });

    describe("checkT8420", () => {
        it("should return true for valid T8420 with 6 at index 6", () => {
            expect(checkT8420("T8420X6ABC")).toBe(true);
        });

        it("should return false if not starting with T8420", () => {
            expect(checkT8420("T8421X6ABC")).toBe(false);
            expect(checkT8420("ABCDEFGHIJ")).toBe(false);
        });

        it("should return false if length <= 7", () => {
            expect(checkT8420("T842060")).toBe(false);
        });

        it("should return false if char at index 6 is not 6", () => {
            expect(checkT8420("T8420X5ABC")).toBe(false);
        });

        it("should return false for empty string", () => {
            expect(checkT8420("")).toBe(false);
        });
    });

    describe("buildVoidCommandPayload", () => {
        it("should return a 10-byte buffer with default channel 255", () => {
            const result = buildVoidCommandPayload();
            expect(result.length).toBe(10);
            expect(result[0]).toBe(0x00); // header
            expect(result[4]).toBe(0x01); // magic
            expect(result[6]).toBe(0xff); // channel 255
        });

        it("should use provided channel", () => {
            const result = buildVoidCommandPayload(0);
            expect(result[6]).toBe(0x00);
        });
    });

    describe("DecimalToRGBColor / RGBColorToDecimal", () => {
        it("should convert decimal to RGB", () => {
            expect(DecimalToRGBColor(0xff0000)).toEqual({ red: 255, green: 0, blue: 0 });
            expect(DecimalToRGBColor(0x00ff00)).toEqual({ red: 0, green: 255, blue: 0 });
            expect(DecimalToRGBColor(0x0000ff)).toEqual({ red: 0, green: 0, blue: 255 });
            expect(DecimalToRGBColor(0xffffff)).toEqual({ red: 255, green: 255, blue: 255 });
            expect(DecimalToRGBColor(0)).toEqual({ red: 0, green: 0, blue: 0 });
        });

        it("should convert RGB to decimal", () => {
            expect(RGBColorToDecimal({ red: 255, green: 0, blue: 0 })).toBe(0xff0000);
            expect(RGBColorToDecimal({ red: 0, green: 255, blue: 0 })).toBe(0x00ff00);
            expect(RGBColorToDecimal({ red: 0, green: 0, blue: 255 })).toBe(0x0000ff);
        });

        it("should round-trip correctly", () => {
            const color = { red: 128, green: 64, blue: 32 };
            expect(DecimalToRGBColor(RGBColorToDecimal(color))).toEqual(color);
        });
    });

    describe("getNullTerminatedString", () => {
        it("should return string up to null terminator", () => {
            const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x58]);
            expect(getNullTerminatedString(buf)).toBe("Hello");
        });

        it("should return full string if no null terminator", () => {
            const buf = Buffer.from("Hello");
            expect(getNullTerminatedString(buf)).toBe("Hello");
        });

        it("should return empty string for buffer starting with null", () => {
            const buf = Buffer.from([0x00, 0x41, 0x42]);
            expect(getNullTerminatedString(buf)).toBe("");
        });
    });

    describe("isUsbCharging", () => {
        it("should return true when bit 0 is set", () => {
            expect(isUsbCharging(1)).toBe(true);
            expect(isUsbCharging(3)).toBe(true);
            expect(isUsbCharging(0b1111)).toBe(true);
        });

        it("should return false when bit 0 is not set", () => {
            expect(isUsbCharging(0)).toBe(false);
            expect(isUsbCharging(2)).toBe(false);
            expect(isUsbCharging(4)).toBe(false);
        });
    });

    describe("isSolarCharging", () => {
        it("should return true when bit 2 is set", () => {
            expect(isSolarCharging(4)).toBe(true);   // 0b100
            expect(isSolarCharging(5)).toBe(true);   // 0b101
        });

        it("should return false when bit 2 is not set", () => {
            expect(isSolarCharging(0)).toBe(false);
            expect(isSolarCharging(3)).toBe(false);  // 0b011
        });
    });

    describe("isPlugSolarCharging", () => {
        it("should return true when bit 3 is set", () => {
            expect(isPlugSolarCharging(8)).toBe(true);   // 0b1000
            expect(isPlugSolarCharging(9)).toBe(true);   // 0b1001
        });

        it("should return false when bit 3 is not set", () => {
            expect(isPlugSolarCharging(0)).toBe(false);
            expect(isPlugSolarCharging(7)).toBe(false);  // 0b0111
        });
    });

    describe("isCharging", () => {
        it("should return true for USB charging", () => {
            expect(isCharging(1)).toBe(true);
        });

        it("should return true for solar charging", () => {
            expect(isCharging(4)).toBe(true);
        });

        it("should return true for plug solar charging", () => {
            expect(isCharging(8)).toBe(true);
        });

        it("should return false for no charging", () => {
            expect(isCharging(0)).toBe(false);
            expect(isCharging(2)).toBe(false); // only bit 1 set
        });
    });

    describe("getCurrentTimeInSeconds", () => {
        it("should return current time in seconds", () => {
            const before = Math.trunc(Date.now() / 1000);
            const result = getCurrentTimeInSeconds();
            const after = Math.trunc(Date.now() / 1000);
            expect(result).toBeGreaterThanOrEqual(before);
            expect(result).toBeLessThanOrEqual(after);
        });
    });

    describe("encodeLockPayload", () => {
        it("should return buffer aligned to 16 bytes", () => {
            const result = encodeLockPayload("hello");
            expect(result.length % 16).toBe(0);
            expect(result.length).toBe(16);
        });

        it("should not pad if already 16 byte aligned", () => {
            const result = encodeLockPayload("1234567890123456"); // 16 chars
            expect(result.length).toBe(16);
        });

        it("should pad 17-byte input to 32 bytes", () => {
            const result = encodeLockPayload("12345678901234567");
            expect(result.length).toBe(32);
        });

        it("should preserve original data", () => {
            const result = encodeLockPayload("test");
            expect(result.toString("utf8", 0, 4)).toBe("test");
        });
    });

    describe("getLockVectorBytes", () => {
        it("should pad short strings to 16 bytes hex", () => {
            const result = getLockVectorBytes("ABC");
            expect(Buffer.from(result, "hex").length).toBe(16);
        });

        it("should not pad strings >= 16 bytes", () => {
            const input = "ABCDEFGHIJKLMNOP"; // 16 chars
            const result = getLockVectorBytes(input);
            expect(Buffer.from(result, "hex").length).toBe(16);
        });

        it("should return longer hex for strings > 16 bytes", () => {
            const input = "ABCDEFGHIJKLMNOPQ"; // 17 chars
            const result = getLockVectorBytes(input);
            expect(Buffer.from(result, "hex").length).toBe(17);
        });
    });

    describe("decodeLockPayload", () => {
        it("should decode buffer to string", () => {
            const buf = Buffer.from("hello world");
            expect(decodeLockPayload(buf)).toBe("hello world");
        });
    });

    describe("decodeBase64", () => {
        it("should decode valid base64 strings", () => {
            const result = decodeBase64("SGVsbG8=");
            expect(result.toString()).toBe("Hello");
        });

        it("should return buffer from non-base64 strings", () => {
            const result = decodeBase64("not-base64!!!");
            expect(result.toString()).toBe("not-base64!!!");
        });
    });

    describe("eslTimestamp", () => {
        it("should split a timestamp into 4 little-endian bytes", () => {
            const result = eslTimestamp(0x04030201);
            expect(result).toEqual([1, 2, 3, 4]);
        });

        it("should handle zero", () => {
            expect(eslTimestamp(0)).toEqual([0, 0, 0, 0]);
        });

        it("should return 4 elements", () => {
            const result = eslTimestamp(Date.now() / 1000);
            expect(result).toHaveLength(4);
        });
    });

    describe("generateAdvancedLockAESKey", () => {
        it("should return a 32-char uppercase hex string", () => {
            const key = generateAdvancedLockAESKey();
            expect(key).toHaveLength(32);
            expect(key).toMatch(/^[0-9A-F]{32}$/);
        });

        it("should generate unique keys", () => {
            const keys = new Set<string>();
            for (let i = 0; i < 20; i++) {
                keys.add(generateAdvancedLockAESKey());
            }
            expect(keys.size).toBe(20);
        });
    });

    describe("encryptLockAESData / decryptLockAESData", () => {
        it("should round-trip encrypt and decrypt", () => {
            const key = "00112233445566778899aabbccddeeff";
            const iv = "ffeeddccbbaa99887766554433221100";
            const data = Buffer.from("0123456789abcdef", "hex"); // 8 bytes
            const encrypted = encryptLockAESData(key, iv, data);
            const decrypted = decryptLockAESData(key, iv, encrypted);
            expect(decrypted).toEqual(data);
        });
    });

    describe("encryptPayloadData / decryptPayloadData", () => {
        it("should round-trip encrypt and decrypt with AES-128-CBC", () => {
            const key = Buffer.alloc(16, 0x42);
            const iv = Buffer.alloc(16, 0x24);
            const data = Buffer.from("Hello, World!");
            const encrypted = encryptPayloadData(data, key, iv);
            const decrypted = decryptPayloadData(encrypted, key, iv);
            expect(decrypted).toEqual(data);
        });
    });

    describe("sortP2PMessageParts", () => {
        it("should concatenate parts in sequence order", () => {
            const parts = {
                2: Buffer.from("world"),
                0: Buffer.from("hello"),
                1: Buffer.from(" "),
            };
            const result = sortP2PMessageParts(parts);
            expect(result.toString()).toBe("hello world");
        });

        it("should handle sequence number wraparound", () => {
            const parts = {
                65534: Buffer.from("A"),
                65535: Buffer.from("B"),
                0: Buffer.from("C"),
                1: Buffer.from("D"),
            };
            const result = sortP2PMessageParts(parts);
            expect(result.toString()).toBe("ABCD");
        });

        it("should return empty buffer for empty parts", () => {
            const result = sortP2PMessageParts({});
            expect(result.length).toBe(0);
        });
    });

    describe("generateSmartLockAESKey", () => {
        it("should return a 16-byte buffer", () => {
            const result = generateSmartLockAESKey("user1234567890AB", 1000);
            expect(result.length).toBe(16);
        });

        it("should use last 12 chars of adminUserId", () => {
            const result = generateSmartLockAESKey("user1234567890AB", 0);
            expect(result.toString("utf8", 0, 12)).toBe("1234567890AB");
        });

        it("should encode time as big-endian uint32 in last 4 bytes", () => {
            const result = generateSmartLockAESKey("user1234567890AB", 0x01020304);
            expect(result[12]).toBe(0x01);
            expect(result[13]).toBe(0x02);
            expect(result[14]).toBe(0x03);
            expect(result[15]).toBe(0x04);
        });
    });

    describe("generateBasicLockAESKey", () => {
        it("should return a 32-char hex string (16 bytes)", () => {
            const result = generateBasicLockAESKey("admin12345678901234567890123456789012345678", "T8520PABCDEFGHIJ");
            expect(result).toHaveLength(32);
            expect(result).toMatch(/^[0-9a-f]{32}$/);
        });

        it("should produce deterministic output", () => {
            const a = generateBasicLockAESKey("adminUser1234567890123456789012345678901", "T8520P0123456789");
            const b = generateBasicLockAESKey("adminUser1234567890123456789012345678901", "T8520P0123456789");
            expect(a).toBe(b);
        });

        it("should produce different output for different inputs", () => {
            const a = generateBasicLockAESKey("adminAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "T8520PAAAAAAAAAA");
            const b = generateBasicLockAESKey("adminBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", "T8520PBBBBBBBBBB");
            expect(a).not.toBe(b);
        });
    });

    describe("eufyKDF", () => {
        it("should return a 48-byte buffer", () => {
            const key = Buffer.alloc(32, 0x42);
            const result = eufyKDF(key);
            expect(result.length).toBe(48);
        });

        it("should be deterministic", () => {
            const key = Buffer.from("test-key-for-kdf");
            expect(eufyKDF(key)).toEqual(eufyKDF(key));
        });

        it("should produce different output for different keys", () => {
            const a = eufyKDF(Buffer.from("key-a"));
            const b = eufyKDF(Buffer.from("key-b"));
            expect(a.equals(b)).toBe(false);
        });
    });

    describe("readNullTerminatedBuffer", () => {
        it("should return data up to null byte", () => {
            const input = Buffer.from([0x41, 0x42, 0x43, 0x00, 0x44, 0x45]);
            const result = readNullTerminatedBuffer(input);
            expect(result.toString()).toBe("ABC");
            expect(result.length).toBe(3);
        });

        it("should return full copy if no null byte", () => {
            const input = Buffer.from([0x41, 0x42, 0x43]);
            const result = readNullTerminatedBuffer(input);
            expect(result.toString()).toBe("ABC");
            expect(result.length).toBe(3);
        });

        it("should return empty buffer if starts with null", () => {
            const input = Buffer.from([0x00, 0x41, 0x42]);
            const result = readNullTerminatedBuffer(input);
            expect(result.length).toBe(0);
        });

        it("should return a copy, not a reference", () => {
            const input = Buffer.from([0x41, 0x42]);
            const result = readNullTerminatedBuffer(input);
            input[0] = 0x00;
            expect(result[0]).toBe(0x41);
        });
    });
});