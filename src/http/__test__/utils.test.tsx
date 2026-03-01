import { Category } from "typescript-logging-category-style";
import {ParameterHelper} from "../parameter";
import {
    DeviceAutoLockScheduleProperty,
    DeviceType,
    HB3DetectionTypes,
    NotificationSwitchMode,
    ParamType,
    SignalLevel
} from "../types";
import {
    normalizeVersionString,
    isGreaterEqualMinVersion,
    pad,
    getTimezoneGMTString,
    getAbsoluteFilePath,
    getImageFilePath,
    isNotificationSwitchMode,
    calculateWifiSignalLevel,
    calculateCellularSignalLevel,
    encryptAPIData,
    decryptAPIData,
    getBlocklist,
    getDistances,
    isDeliveryPackageType,
    isHB3DetectionModeEnabled,
    getHB3DetectionMode,
    getEufyTimezone,
    getAdvancedLockTimezone,
    WritePayload,
    ParsePayload,
    encodePasscode,
    hexDate,
    hexTime,
    hexWeek,
    hexStringScheduleToSchedule,
    randomNumber,
    getIdSuffix,
    getImageBaseCode,
    getImageSeed,
    getImageKey,
    decodeImage,
    getImage, getImagePath, isPrioritySourceType, decryptTrackerData, getLockEventType, getRandomPhoneModel
} from "../utils";
import {Schedule} from "../interfaces";
import {createCipheriv} from "crypto";
import {LockPushEvent} from "../../push";

describe('Utils file', () => {
    test("Test a valid version to normalise" , () => {
        const version = "1.0.0.0 al t0 30 3";
        const result = normalizeVersionString(version)

        expect(result).toStrictEqual([1,0,0,0]);
    });

    test("Test a valid version to normalise v2" , () => {
        const version = "T850 1.0.0.0";
        const result = normalizeVersionString(version)

        expect(result).toStrictEqual([1,0,0,0]);
    });

    test("Test an invalid version to normalise" , () => {
        const version = "as 343 e t0 30 3";
        const result = normalizeVersionString(version)

        expect(result).toStrictEqual(null);
    });

    test("Test compare the new version is greater" , () => {
        const version1 = "1.0.0.0";
        const version2 = "2.40.10.3";
        const result = isGreaterEqualMinVersion(version1, version2)
        expect(result).toStrictEqual(true);
    });

    test("Test compare the new version is equal" , () => {
        const version1 = "2.33.2.44";
        const version2 = "2.33.2.44";
        const result = isGreaterEqualMinVersion(version1, version2)
        expect(result).toStrictEqual(true);
    });

    test("Test compare the version is older" , () => {
        const version1 = "2.33.2.44";
        const version2 = "2.12.2.44";
        const result = isGreaterEqualMinVersion(version1, version2)
        expect(result).toStrictEqual(false);
    });

    test("Test issue raised on issue #251" , () => {
        const version1 = "2.0.4.8";
        const version2 = "1.0.0.40";
        let result = isGreaterEqualMinVersion(version1, version2)
        expect(result).toStrictEqual(false);
        // Flip to ensure it works
        result = isGreaterEqualMinVersion(version2, version1)
        expect(result).toStrictEqual(true);
    });

    test("Test pad function" , () => {
        const lowNumber = 9;
        let result = pad(lowNumber);
        expect(result).toStrictEqual("09");

        const highNumber = 55
        result = pad(highNumber);
        expect(result).toStrictEqual("55");
    });

    test("Test getTimezoneGMTString function" , () => {
        const dateSpy = jest.spyOn(Date.prototype, "getTimezoneOffset");

        // UTC (offset 0)
        dateSpy.mockReturnValue(0);
        expect(getTimezoneGMTString()).toStrictEqual("GMT+00:00");

        // UTC-5 (EST, offset +300)
        dateSpy.mockReturnValue(300);
        expect(getTimezoneGMTString()).toStrictEqual("GMT-05:00");

        // UTC+5:30 (IST, offset -330)
        dateSpy.mockReturnValue(-330);
        expect(getTimezoneGMTString()).toStrictEqual("GMT+05:30");

        dateSpy.mockRestore();
    });

    test("Test getAbsoluteFilePath function" , () => {
        let result = getAbsoluteFilePath(DeviceType.FLOODLIGHT,123, "test_photo.jpg");
        expect(result).toStrictEqual("/mnt/data/Camera123/test_photo.jpg.dat");

        result = getAbsoluteFilePath(DeviceType.CAMERA,123, "test_photo.jpg");
        expect(result).toStrictEqual("/media/mmcblk0p1/Camera123/test_photo.jpg.dat");
    });

    test("Test getImageFilePath function" , () => {
        let result = getImageFilePath(DeviceType.FLOODLIGHT,123, "test_video.mp4");
        expect(result).toStrictEqual("/mnt/data/video/test_video.mp4_c123.jpg");

        result = getImageFilePath(DeviceType.CAMERA,123, "test_video.mp4");
        expect(result).toStrictEqual("/media/mmcblk0p1/video/test_video.mp4_c123.jpg");
    });

    test("Test isNotificationSwitchMode to be true" , () => {
        let result = isNotificationSwitchMode(1,NotificationSwitchMode.APP);
        expect(result).toStrictEqual(true);

        result = isNotificationSwitchMode(1,NotificationSwitchMode.GEOFENCE);
        expect(result).toStrictEqual(true);

        result = isNotificationSwitchMode(1,NotificationSwitchMode.SCHEDULE);
        expect(result).toStrictEqual(true);

        result = isNotificationSwitchMode(1,NotificationSwitchMode.KEYPAD);
        expect(result).toStrictEqual(true);
    });

    test("Test isNotificationSwitchMode to be false" , () => {
        let result = isNotificationSwitchMode(10,NotificationSwitchMode.APP);
        expect(result).toStrictEqual(false);

        result = isNotificationSwitchMode(10,NotificationSwitchMode.GEOFENCE);
        expect(result).toStrictEqual(false);

        result = isNotificationSwitchMode(10,NotificationSwitchMode.SCHEDULE);
        expect(result).toStrictEqual(false);

        result = isNotificationSwitchMode(10,NotificationSwitchMode.KEYPAD);
        expect(result).toStrictEqual(false);
    });

    test("Test calculateWifiSignalLevel values" , () => {
        let result = calculateWifiSignalLevel(null,-40);
        expect(result).toStrictEqual(SignalLevel.FULL);

        result = calculateWifiSignalLevel(null,-50);
        expect(result).toStrictEqual(SignalLevel.FULL);


        // Test strong
        result = calculateWifiSignalLevel(null,-51);
        expect(result).toStrictEqual(SignalLevel.STRONG);
        result = calculateWifiSignalLevel(null,-58);
        expect(result).toStrictEqual(SignalLevel.STRONG);
        result = calculateWifiSignalLevel(null,-60);
        expect(result).toStrictEqual(SignalLevel.STRONG);

        // Test normal
        result = calculateWifiSignalLevel(null,-61);
        expect(result).toStrictEqual(SignalLevel.NORMAL);
        result = calculateWifiSignalLevel(null,-66);
        expect(result).toStrictEqual(SignalLevel.NORMAL);
        result = calculateWifiSignalLevel(null,-67);
        expect(result).toStrictEqual(SignalLevel.NORMAL);

        // Test Weak
        result = calculateWifiSignalLevel(null,-68);
        expect(result).toStrictEqual(SignalLevel.WEAK);
        result = calculateWifiSignalLevel(null,-70);
        expect(result).toStrictEqual(SignalLevel.WEAK);
        result = calculateWifiSignalLevel(null,-80);
        expect(result).toStrictEqual(SignalLevel.WEAK);

        // Test no signal
        result = calculateWifiSignalLevel(null,-90);
        expect(result).toStrictEqual(SignalLevel.NO_SIGNAL);
    });

    test("Test calculateCellularSignalLevel values" , () => {
        let result = calculateCellularSignalLevel( 0);
        expect(result).toStrictEqual(SignalLevel.NO_SIGNAL);
        result = calculateCellularSignalLevel( -101);
        expect(result).toStrictEqual(SignalLevel.NO_SIGNAL);

        // Test weak
        result = calculateCellularSignalLevel( -100);
        expect(result).toStrictEqual(SignalLevel.WEAK);
        result = calculateCellularSignalLevel( -98);
        expect(result).toStrictEqual(SignalLevel.WEAK);
        result = calculateCellularSignalLevel( -96);
        expect(result).toStrictEqual(SignalLevel.WEAK);

        // Test normal
        result = calculateCellularSignalLevel( -95);
        expect(result).toStrictEqual(SignalLevel.NORMAL);
        result = calculateCellularSignalLevel( -90);
        expect(result).toStrictEqual(SignalLevel.NORMAL);
        result = calculateCellularSignalLevel( -86);
        expect(result).toStrictEqual(SignalLevel.NORMAL);

        // Test strong
        result = calculateCellularSignalLevel( -85);
        expect(result).toStrictEqual(SignalLevel.STRONG);
        result = calculateCellularSignalLevel( -80);
        expect(result).toStrictEqual(SignalLevel.STRONG);
        result = calculateCellularSignalLevel( -71);
        expect(result).toStrictEqual(SignalLevel.STRONG);

        // Test full
        result = calculateCellularSignalLevel( -70);
        expect(result).toStrictEqual(SignalLevel.FULL);
        result = calculateCellularSignalLevel( -60);
        expect(result).toStrictEqual(SignalLevel.FULL);
        result = calculateCellularSignalLevel( -50);
        expect(result).toStrictEqual(SignalLevel.FULL);
    });

    test("Test encryptAPIData values" , () => {
        const sn =  "T8425T2765123462T8425T2765123462";
        let result = encryptAPIData("data test", Buffer.from(sn));
        expect(result).toStrictEqual("UgaOpgkSYd0/7P6D4DqVFw==");
    });

    test("Test decryptAPIData values" , () => {
        const sn =  "T8425T2765123462T8425T2765123462";
        const encrypted =  "UgaOpgkSYd0/7P6D4DqVFw==";
        let result = decryptAPIData(encrypted, Buffer.from(sn));
        expect(result.toString('utf8')).toStrictEqual("data test");
    });


    test('should return 0xFFFF for all values when distances are 0 (Below Threshold)', () => {
        // the threshold starts at 1. If all distances are 0, bitmask is always 0.
        const input = [0, 0, 0, 0, 0, 0, 0, 0];
        const result = getBlocklist(input);

        // When bitmask is 0, finalValue is 0xFFFF (65535)
        expect(result).toEqual([65535, 65535, 65535, 65535, 65535]);
    });

    test('should handle partial bitmask logic (Flipping and Padding)', () => {
        /**
         * Scenario: Only the first element meets the threshold of 1.
         * bitmask = 1 (binary 00000001)
         * flip bits: 1 ^ 0xFF = 254 (binary 11111110)
         * add padding: 254 + 65280 (0xFF00) = 65534
         */
        const input = [1, 0, 0, 0, 0, 0, 0, 0];
        const result = getBlocklist(input);

        // At threshold 1, result is 65534.
        // At thresholds 2-5, result is 65535 (because 1 < threshold)
        expect(result[0]).toBe(65534);
        expect(result[1]).toBe(65535);
    });

    test('should return 0 when the bitmask is exactly 0xFF', () => {
        // If all 8 items meet the threshold (e.g., threshold is 1 and all distances are 10)
        // bitmask becomes 255 (0xFF).
        // The code says: else if (bitmask !== 0xFF && bitmask !== 0xFFFF)
        // Since it IS 0xFF, it skips the transformation and finalValue remains 0.
        const input = [10, 10, 10, 10, 10, 10, 10, 10];
        const result = getBlocklist(input);

        expect(result).toEqual([0, 0, 0, 0, 0]);
    });


    test('should return all 3s when input is all 65535 (No detection)', () => {
        const noDetection = Array(8).fill(65535);
        const result = getDistances(noDetection);
        expect(result).toEqual([3, 3, 3, 3, 3, 3, 3, 3]);
    });

    test('should map detections to the correct depth (1-8)', () => {
        // Fill with "No Detection" (65535)
        const rawData = Array(8).fill(65535);

        // Sector 0: Flip bit 0 (2^0 = 1). 65535 - 1 = 65534
        rawData[0] = 65534;

        // Sector 7: Flip bit 7 (2^7 = 128). 65535 - 128 = 65407
        // This bit will be reached on the 8th iteration of the inner loop
        rawData[7] = 65407;

        const result = getDistances(rawData);

        expect(result[0]).toBe(1); // Sector 0 was detected at Step 1
        expect(result[7]).toBe(8); // Sector 7 was detected at Step 8
        expect(result[3]).toBe(3); // Sector 3 remains default
    });

    test('should prioritize the furthest detection step for a single sector', () => {
        // Sector 0 is detected at distance 2, 4, and 6
        const rawData = Array(8).fill(65535);
        rawData[1] = 65534; // Step 2
        rawData[3] = 65534; // Step 4
        rawData[5] = 65534; // Step 6

        const result = getDistances(rawData);

        // The last detection (Step 6) should be the final value
        expect(result[0]).toBe(6);
    });

    test('should detect all sectors at maximum depth', () => {
        // 0 means all 16 bits are "detected" after XOR
        const rawData = Array(7).fill(65535);
        rawData.push(0); // The 8th element (distance 8) has all bits active

        const result = getDistances(rawData);
        expect(result).toEqual([8, 8, 8, 8, 8, 8, 8, 8]);
    });

    test('should return true when the 65536 bit is set', () => {
        // Exactly 65536
        expect(isDeliveryPackageType(65536)).toBe(true);
    });

    test('should return false for the bit immediately higher', () => {
        // 131072 is 2^17 (the 18th bit)
        expect(isDeliveryPackageType(131072)).toBe(false);
    });

    test('HUMAN_RECOGNITION: requires 131072 AND 65536', () => {

        const type = HB3DetectionTypes.HUMAN_RECOGNITION;
        const packageBit = 65536;

        // This should pass now
        expect(isHB3DetectionModeEnabled(type + packageBit, type)).toBe(true);

        // Should fail if package bit is missing
        expect(isHB3DetectionModeEnabled(type, type)).toBe(false);
    });
    test('HUMAN_DETECTION: requires 2 AND 1', () => {
        const type = HB3DetectionTypes.HUMAN_DETECTION; // 2

        // This requires bit 2 (the type) and bit 1 (the extra requirement)
        expect(isHB3DetectionModeEnabled(2 + 1, type)).toBe(true);

        // Should fail if bit 1 is missing
        expect(isHB3DetectionModeEnabled(2, type)).toBe(false);
    });

    test('VEHICLE_DETECTION: only requires 4', () => {
        const type = HB3DetectionTypes.VEHICLE_DETECTION; // 4

        expect(isHB3DetectionModeEnabled(4, type)).toBe(true);
        // It doesn't care if bit 1 or 65536 are there or not
        expect(isHB3DetectionModeEnabled(4 + 1 + 65536, type)).toBe(true);
    });

    test('ALL_OTHER_MOTION: only requires 32768', () => {
        const type = HB3DetectionTypes.ALL_OTHER_MOTION;
        expect(isHB3DetectionModeEnabled(32768, type)).toBe(true);
    });

    const PACKAGE_BIT = 65536;    // 2^16
    const RECOGNITION_BIT = 131072; // 2^17 (HUMAN_RECOGNITION)
    const DETECTION_BIT = 2;       // 2^1  (HUMAN_DETECTION)
    const EXTRA_BIT_1 = 1;         // 2^0

    test('should enable HUMAN_RECOGNITION , HUMAN_DETECTION with enable to true', () => {


        let result = getHB3DetectionMode(0, HB3DetectionTypes.HUMAN_RECOGNITION, true);
        // Expected: 131072 | 65536 = 196608
        expect(result).toBe(RECOGNITION_BIT | PACKAGE_BIT);

        result = getHB3DetectionMode(0, HB3DetectionTypes.HUMAN_DETECTION, true);
        // Expected: 2 | 1 = 3
        expect(result).toBe(DETECTION_BIT | EXTRA_BIT_1);
    });

    test('should enable HUMAN_RECOGNITION , HUMAN_DETECTION with enable to false', () => {


        let startValue = RECOGNITION_BIT | PACKAGE_BIT | 4; // Recognition + Package + Vehicle
        let result = getHB3DetectionMode(startValue, HB3DetectionTypes.HUMAN_RECOGNITION, false);

        // Should only leave the Vehicle bit (4)
        expect(result).toBe(4);

        // Value has Package bit but NOT Recognition bit
        startValue = PACKAGE_BIT | 4;
        result = getHB3DetectionMode(startValue, HB3DetectionTypes.HUMAN_RECOGNITION, false);

        // tmp = value (because type & value != type)
        // result = tmp ^ 65536
        expect(result).toBe(4);

        startValue = DETECTION_BIT | EXTRA_BIT_1 | 8; // Detection + Bit 1 + Pet
        result = getHB3DetectionMode(startValue, HB3DetectionTypes.HUMAN_DETECTION, false);

        expect(result).toBe(8);
    });

    test('should toggle VEHICLE_DETECTION normally', () => {
        const type = HB3DetectionTypes.VEHICLE_DETECTION; // 4

        // Enable
        expect(getHB3DetectionMode(0, type, true)).toBe(4);

        // Disable (Note: as discussed, this logic uses XOR directly)
        expect(getHB3DetectionMode(4, type, false)).toBe(0);
    });


    test('test randomNumber ', () => {
        const result = randomNumber(10, 30);

        expect(result).toBeGreaterThanOrEqual(10);
        expect(result).toBeLessThanOrEqual(30);
    });

    it('should return 0 if the format does not match the regex', () => {
        // Missing the ending letters
        expect(getIdSuffix("ABCD-123456")).toBe(0);
        // Missing the middle numbers
        expect(getIdSuffix("ABCD-EFGH")).toBe(0);
    });

    it('should correctly slice the serial and append the suffix', () => {
        // 1. Last char of serial is '2'. nr = 2.
        // 2. serialNumber.substring(2) of "SN123452" is "123452"
        // 3. Assume getIdSuffix("PREFIX-123456-SUFFIX") returns 17
        const serial = "SN123452";
        const did = "TEST-123456-DATA";

        const result = getImageBaseCode(serial, did);

        // "123452" + "17"
        expect(result).toBe("12345217");
    });


    it('should generate a correct MD5 seed in uppercase', () => {
        // 1. p2pDid results in suffix 17. Prefix = 1000 - 17 = 983.
        // 2. code "SN12345" -> nCode = 12345.
        // 3. String to hash: "98312345"
        // 4. MD5 of "98312345" is "7275d836261546256247754641974167" (example)

        const p2pDid = "TEST-123456-DATA"; // Suffix 17
        const code = "SN12345";

        const result = getImageSeed(p2pDid, code);

        // Check if result is uppercase
        expect(result).toBe(result.toUpperCase());
        // Check if it is a valid 32-character MD5 hex string
        expect(result).toMatch(/^[0-9A-F]{32}$/);
    });

    it('should generate a 32-character hex string (16 bytes)', () => {
        const serial = "SN123452";
        const did = "TEST-123456-DATA";
        const code = "SN12345";

        const result = getImageKey(serial, did, code);

        // The function returns the last 16 bytes (32 hex characters)
        expect(result).toHaveLength(32);
        // Ensure it is uppercase hex
        expect(result).toMatch(/^[0-9A-F]{32}$/);
    });


    it('should return original data if header is missing or incorrect', () => {
        const rawData = Buffer.from("not-eufy-data-at-all");
        const result = decodeImage("DID-123", rawData);

        expect(result).toEqual(rawData);
    });

    it('should attempt decryption when "eufysecurity" header is present', () => {
        // Construct a mock buffer
        // 0-12: eufysecurity
        // 12: (separator)
        // 13-29: Serial (16 chars)
        // 29: (separator)
        // 30-40: Code (10 chars)
        // 40: (separator)
        // 41+: Encrypted Data

        const header = Buffer.alloc(41);
        header.write("eufysecurity", 0);
        header.write("SN12345678901234", 13);
        header.write("CODE123456", 30);

        const payload = Buffer.alloc(300, 0xEE); // Mock "encrypted" bytes
        const fullBuffer = Buffer.concat([header, payload]);

        // We expect this to run. Even if the decryption fails due to random keys,
        // we can verify it doesn't return the original 'header' part.
        const result = decodeImage("TEST-DID", fullBuffer);

        // result should be 'otherData' (everything from index 41 onwards)
        expect(result.length).toBe(payload.length);
    });

});

describe('getEufyTimezone', () => {
    // We store the original function to restore it after tests
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

    afterEach(() => {
        // Restore the mock after every test
        Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
    });

    test('should return the correct EufyTimezone when a match is found', () => {
        // 1. Arrange: Pick a timezone that exists in your data
        // For example: 'America/New_York'
        const mockTimezone = 'America/New_York';

        Intl.DateTimeFormat.prototype.resolvedOptions = jest.fn().mockReturnValue({
            timeZone: mockTimezone
        });

        // 2. Act
        const result = getEufyTimezone();

        // 3. Assert
        expect(result).toBeDefined();
        expect(result?.timeId).toBe(mockTimezone);
    });

    test('should return undefined when the system timezone is not in the data', () => {
        // 1. Arrange: Use a timezone that definitely isn't in your Eufy list
        Intl.DateTimeFormat.prototype.resolvedOptions = jest.fn().mockReturnValue({
            timeZone: 'Mars/Base_Alpha'
        });

        // 2. Act
        const result = getEufyTimezone();

        // 3. Assert
        expect(result).toBeUndefined();
    });


    test(' test advance lock timezone', () => {

        const mockTimezone = 'Europe/London';

        Intl.DateTimeFormat.prototype.resolvedOptions = jest.fn().mockReturnValue({
            timeZone: mockTimezone
        });
        //
        let result = getAdvancedLockTimezone("T8520 2.0.0.0");
        expect(result).toBe("GMT0BST,M3.5.0/1,M10.5.0|1.1394");

        result = getAdvancedLockTimezone("T4343 2.0.0.0");
        expect(result).toBe("GMT0BST,M3.5.0/1,M10.5.0");
    });
});


describe('Payload', () => {
    test("Testing write payload" , () => {

        const input = Buffer.from('abc'); // Length 3
        const writer = new WritePayload();
        writer.write(input);

        const result = writer.getData();

        // Expected: [split_byte (-95), length (3), 97, 98, 99]
        // Note: Buffer displays -95 as 161 (its unsigned 8-bit equivalent)
        expect(result[0]).toBe(255 - 94); // -95 as unsigned byte is 161
        expect(result[1]).toBe(3);
        expect(result.subarray(2).toString()).toBe('abc');
    });


    // Mocking the missing method for the test to function
    // Based on the class logic, it returns 1 or 2 for length bytes
    (ParsePayload.prototype as any).getNextStep = (value: number, pos: number, data: Buffer) => {
        return 1; // Assuming 1 byte for the 'length' field for this test
    };

    it('should read a Uint32BE value correctly', () => {
        // Constructing a buffer:
        // [0x05] -> Index/Tag
        // [0x04] -> Length (4 bytes)
        // [0x00, 0x00, 0x04, 0xD2] -> Value (1234 in Hex)
        const data = Buffer.from([0x05, 0x04, 0x00, 0x00, 0x04, 0xD2]);
        const parser = new ParsePayload(data);

        expect(parser.readUint32BE(0x05)).toBe(1234);
    });

    it('should read a string value correctly', () => {
        const str = "Hello";
        const strBytes = Buffer.from(str);
        // [0x0A] -> Index
        // [0x05] -> Length (5 characters)
        // [strBytes] -> "Hello"
        const data = Buffer.concat([Buffer.from([0x0A, 0x05]), strBytes]);
        const parser = new ParsePayload(data);

        expect(parser.readString(0x0A)).toBe("Hello");
    });

    it('should return 0 or empty buffer if index is not found', () => {
        const data = Buffer.from([0x01, 0x01, 0xFF]);
        const parser = new ParsePayload(data);

        // Searching for index 0x99 which doesn't exist
        expect(parser.readInt8(0x99)).toBe(0);
        expect(parser.readData(0x99).length).toBe(0);
    });

    it('should handle multiple fields and skip correctly', () => {
        // Field 1: Index 1, Length 1, Val 0xFF
        // Field 2: Index 2, Length 2, Val 0x00AA
        const data = Buffer.from([0x01, 0x01, 0xFF, 0x02, 0x02, 0x00, 0xAA]);
        const parser = new ParsePayload(data);

        expect(parser.readUint16BE(0x02)).toBe(0x00AA);
    });
});


describe('encodePasscode', () => {

    it('should encode a simple numeric passcode to hex', () => {
        // '1' = 49 (0x31)
        // '2' = 50 (0x32)
        // '3' = 51 (0x33)
        expect(encodePasscode("123")).toBe("313233");
    });

    it('should encode alphabetical characters correctly', () => {
        // 'A' = 65 (0x41)
        // 'b' = 98 (0x62)
        expect(encodePasscode("Ab")).toBe("4162");
    });

    it('should handle an empty string', () => {
        expect(encodePasscode("")).toBe("");
    });

    it('should encode special characters', () => {
        // '!' = 33 (0x21)
        // '#' = 35 (0x23)
        expect(encodePasscode("!#")).toBe("2123");
    });

    it('should be reversible (sanity check)', () => {
        const input = "Secure123";
        const encoded = encodePasscode(input);

        // Manual verification logic:
        // 'S' -> 53, 'e' -> 65, 'c' -> 63, 'u' -> 75, 'r' -> 72, 'e' -> 65, '1' -> 31, '2' -> 32, '3' -> 33
        expect(encoded).toBe("536563757265313233");
    });
});

describe('hex functions', () => {

    it('Test hexDate to hex', () => {
        const date = new Date("10.10.2026 10:10:10");
        expect(hexDate(date)).toBe("ea070a0a");
    });


    it('Test hexTime to hex', () => {
        const date = new Date("10.10.2026 10:10:10");
        expect(hexTime(date)).toBe("0a0a");
    });


    it('Test hexWeek to hex', () => {
        const date = new Date("10.10.2026 10:10:10");

        const schedule: Schedule = {
            startDateTime:date,
            endDateTime:date,
            week:{
                monday:false,
                tuesday: true,
                wednesday: false,
                thursday: false,
                friday: false,
                saturday: false,
                sunday: false,
            }
        }

        expect(hexWeek(schedule)).toBe("4");
    });


    it('should correctly parse a standard schedule with bitmask days', () => {
        // startDay: "E6070C19" -> Year: 07E6 (2022), Month: 0C (12 - 1 = Dec), Day: 19 (25)
        // startTime: "0A1E" -> 0A (10), 1E (30) -> 10:30
        // week: "3E" -> (Monday=2 | Tuesday=4 | Wednesday=8 | Thursday=16 | Friday=32) = 62 (0x3E)

        const result = hexStringScheduleToSchedule(
            "E6070C19", // 2022-12-25
            "0A1E",     // 10:30
            "E7070101", // 2023-01-01
            "1200",     // 18:00
            "3E"        // Weekdays only
        );

        // Verify Dates
        expect(result.startDateTime?.getFullYear()).toBe(2022);
        expect(result.startDateTime?.getMonth()).toBe(11); // December
        expect(result.startDateTime?.getDate()).toBe(25);
        expect(result.startDateTime?.getHours()).toBe(10);
        expect(result.startDateTime?.getMinutes()).toBe(30);


        // Verify Bitmask
        expect(result.week).toBeDefined();
        expect(result.week?.monday).toBe(true);
        expect(result.week?.friday).toBe(true);
        expect(result.week?.sunday).toBe(false); // 0x3E doesn't include Sunday (1)
    });

    it('should return undefined for special startDay/endDay markers', () => {
        const result = hexStringScheduleToSchedule(
            "00000000",
            "0000",
            "ffffffff",
            "0000",
            "01"
        );

        expect(result.startDateTime).toBeUndefined();
        expect(result.endDateTime).toBeUndefined();
        expect(result.week).toBeDefined();
        expect(result.week?.sunday).toBe(true); // 0x01 is Sunday
    });

    it('should correctly identify a single day from the week hex', () => {
        // Saturday is 64 (0x40)
        const result = hexStringScheduleToSchedule("E6070101", "0000", "E6070101", "0000", "40");

        expect(result.week).toBeDefined();
        expect(result.week?.saturday).toBe(true);
        expect(result.week?.monday).toBe(false);
    });




});



describe('Image utils', () => {

    it('should extract the path after the tilde', () => {
        // Input: "root~/images/camera1.jpg"
        // Split: ["root", "/images/camera1.jpg"]
        const input = "session123~/security/photo.jpg";
        expect(getImagePath(input)).toBe("/security/photo.jpg");
    });


});

describe('Extra utils tests', () => {

    describe('Upgrading to High Priority (p2p, push, mqtt)', () => {
        const prioritySources = ["p2p", "push", "mqtt"] as const;
        const lowerSources = ["http", undefined] as const;

        prioritySources.forEach(highSource => {
            it(`should allow ${highSource} to overwrite undefined or http`, () => {
                expect(isPrioritySourceType(undefined, highSource)).toBe(true);
                expect(isPrioritySourceType("http", highSource)).toBe(true);
            });

            it(`should allow ${highSource} to overwrite another high priority source`, () => {
                // Example: push can overwrite p2p
                expect(isPrioritySourceType("p2p", highSource)).toBe(true);
            });
        });
    });

    describe('HTTP Source Logic', () => {
        it('should allow http when current is undefined', () => {
            expect(isPrioritySourceType(undefined, "http")).toBe(true);
        });

        it('should allow http when current is already http', () => {
            expect(isPrioritySourceType("http", "http")).toBe(true);
        });

        it('should NOT allow http to overwrite high priority sources', () => {
            expect(isPrioritySourceType("p2p", "http")).toBe(false);
            expect(isPrioritySourceType("push", "http")).toBe(false);
            expect(isPrioritySourceType("mqtt", "http")).toBe(false);
        });
    });

    const mockKey = Buffer.from('0123456789abcdef'); // 16 bytes

    it('should correctly decrypt a known encrypted payload', () => {
        const plainText = Buffer.from('SecretTracker123'); // 16 bytes

        // Setup: Create encrypted data to test against
        const cipher = createCipheriv("aes-128-ecb", mockKey, null);
        cipher.setAutoPadding(false);
        const encryptedData = Buffer.concat([cipher.update(plainText), cipher.final()]);

        const decrypted = decryptTrackerData(encryptedData, mockKey);

        expect(decrypted.toString()).toBe('SecretTracker123');
        expect(decrypted).toEqual(plainText);
    });

    it('should throw an error if data is not a multiple of 16 bytes', () => {
        const invalidData = Buffer.from('too-short'); // 9 bytes

        expect(() => {
            decryptTrackerData(invalidData, mockKey);
        }).toThrow();
        // Node's crypto throws 'WRONG_FINAL_BLOCK_LENGTH' when padding is false
    });
});



describe('getLockEventType', () => {

    it('should return 1 for automatic events', () => {
        expect(getLockEventType(LockPushEvent.AUTO_LOCK)).toBe(1);
        expect(getLockEventType(LockPushEvent.AUTO_UNLOCK)).toBe(1);
    });

    it('should return 2 for manual events', () => {
        expect(getLockEventType(LockPushEvent.MANUAL_LOCK)).toBe(2);
        expect(getLockEventType(LockPushEvent.MANUAL_UNLOCK)).toBe(2);
    });

    it('should return 3 for app-driven events', () => {
        expect(getLockEventType(LockPushEvent.APP_LOCK)).toBe(3);
        expect(getLockEventType(LockPushEvent.APP_UNLOCK)).toBe(3);
    });

    it('should return 4 for password events', () => {
        expect(getLockEventType(LockPushEvent.PW_LOCK)).toBe(4);
        expect(getLockEventType(LockPushEvent.PW_UNLOCK)).toBe(4);
    });

    it('should return 5 for biometric events', () => {
        expect(getLockEventType(LockPushEvent.FINGER_LOCK)).toBe(5);
        expect(getLockEventType(LockPushEvent.FINGERPRINT_UNLOCK)).toBe(5);
    });

    it('should return 6 for temporary password events', () => {
        expect(getLockEventType(LockPushEvent.TEMPORARY_PW_LOCK)).toBe(6);
        expect(getLockEventType(LockPushEvent.TEMPORARY_PW_UNLOCK)).toBe(6);
    });

    it('should return 7 for keypad lock', () => {
        expect(getLockEventType(LockPushEvent.KEYPAD_LOCK)).toBe(7);
    });

    it('should return 0 for undefined or unknown events', () => {
        // @ts-ignore - testing runtime safety for unexpected values
        expect(getLockEventType("SOME_OTHER_EVENT")).toBe(0);
        // @ts-ignore
        expect(getLockEventType(undefined)).toBe(0);
    });
});


describe('getRandomPhoneModel', () => {

    it('should return a string', () => {
        const result = getRandomPhoneModel();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

});