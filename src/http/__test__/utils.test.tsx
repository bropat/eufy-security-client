import { Category } from "typescript-logging-category-style";
import {ParameterHelper} from "../parameter";
import {DeviceType, HB3DetectionTypes, NotificationSwitchMode, ParamType, SignalLevel} from "../types";
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
    getAdvancedLockTimezone, WritePayload, ParsePayload
} from "../utils";

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
        // TODO : mock other timezones
        let result = getTimezoneGMTString();
        expect(result).toStrictEqual("GMT+00:00");
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


    test("Testing parse payload" , () => {

        const input = Buffer.from('abc'); // Length 3
        const parser = new ParsePayload(input);

    });
});