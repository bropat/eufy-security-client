import { createCipheriv } from "crypto";

import { Device } from "./device";
import { NotificationSwitchMode, DeviceType, WifiSignalLevel } from "./types";

export const isGreaterEqualMinVersion = function(minimal_version: string, current_version: string): boolean {
    if (minimal_version === undefined)
        minimal_version = "";
    if (current_version === undefined)
        current_version = "";

    minimal_version = minimal_version.replace(/\D+/g, "");
    current_version = current_version.replace(/\D+/g, "");

    if (minimal_version === "")
        return false;
    if (current_version === "")
        return false;

    let min_version = 0;
    let curr_version = 0;

    try {
        min_version = Number.parseInt(minimal_version);
    } catch (error) {
    }
    try {
        curr_version = Number.parseInt(current_version);
    } catch (error) {
    }

    if (curr_version === 0 || min_version === 0 || curr_version < min_version) {
        return false;
    }
    return true;
}

export const pad = function(num: number): string {
    const norm = Math.floor(Math.abs(num));
    return (norm < 10 ? "0" : "") + norm;
};

export const getTimezoneGMTString = function(): string {
    const tzo = -new Date().getTimezoneOffset();
    const dif = tzo >= 0 ? "+" : "-";
    return `GMT${dif}${pad(tzo / 60)}:${pad(tzo % 60)}`
}

export const getAbsoluteFilePath = function(device_type:number, channel: number, filename: string): string {
    if (device_type === DeviceType.FLOODLIGHT) {
        return `/mnt/data/Camera${String(channel).padStart(2,"0")}/${filename}.dat`;
    }
    return `/media/mmcblk0p1/Camera${String(channel).padStart(2,"0")}/${filename}.dat`;
}

export const isNotificationSwitchMode = function(value: number, mode: NotificationSwitchMode): boolean {
    if (value === 1)
        value = 240;
    return (value & mode) !== 0;
}

export const switchNotificationMode = function(currentValue: number, mode: NotificationSwitchMode, enable: boolean): number {
    let result = 0;
    if (!enable && currentValue === 1 /* ALL */) {
        currentValue = 240;
    }
    if (enable) {
        result = mode | currentValue;
    } else {
        result = ~mode & currentValue;
    }
    if (isNotificationSwitchMode(result, NotificationSwitchMode.SCHEDULE) && isNotificationSwitchMode(result, NotificationSwitchMode.APP) && isNotificationSwitchMode(result, NotificationSwitchMode.GEOFENCE) && isNotificationSwitchMode(result, NotificationSwitchMode.KEYPAD)) {
        result = 1; /* ALL */
    }
    return result;
}

export const calculateWifiSignalLevel = function(device: Device, rssi: number): WifiSignalLevel {
    if (device.isWiredDoorbell()) {
        if (rssi >= -65) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -75) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -80 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;
    } else if (device.isCamera2Product()) {
        if (rssi >= 0) {
            return WifiSignalLevel.NO_SIGNAL;
        }
        if (rssi >= -65) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -75) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -85 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;

    } else if (device.isFloodLight()) {
        if (rssi >= 0) {
            return WifiSignalLevel.NO_SIGNAL;
        }
        if (rssi >= -60) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -70) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -80 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;

    } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
        if (rssi >= -65) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -75) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -85 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;

    } else {
        if (rssi >= 0) {
            return WifiSignalLevel.NO_SIGNAL;
        }
        if (rssi >= -65) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -75) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -85 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;
    }
}

export const encryptPassword = (password: string, key: Buffer): string => {
    const cipher = createCipheriv("aes-256-cbc", key, key.slice(0, 16));
    return (
        cipher.update(password, "utf8", "base64") +
        cipher.final("base64")
    );
}