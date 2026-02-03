import { Category } from "typescript-logging-category-style";
import {ParameterHelper} from "../parameter";
import {DeviceType, NotificationSwitchMode, ParamType, SignalLevel} from "../types";
import {
    normalizeVersionString,
    isGreaterEqualMinVersion,
    pad,
    getTimezoneGMTString,
    getAbsoluteFilePath,
    getImageFilePath, isNotificationSwitchMode, calculateWifiSignalLevel, calculateCellularSignalLevel, encryptAPIData
} from "../utils";

describe('Utils file', () => {
    test("Test a valid version to normalise" , () => {
        const version = "1.0.0.0 al t0 30 3";
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


    });