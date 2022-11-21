import { createCipheriv } from "crypto";
import { timeZoneData } from "./const";

import { Device } from "./device";
import { Schedule } from "./interfaces";
import { NotificationSwitchMode, DeviceType, WifiSignalLevel, HB3DetectionTypes } from "./types";

const normalizeVersionString = function (version: string): number[] {
    const trimmed = version ? version.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1") : "";
    const pieces = trimmed.split(RegExp("\\."));
    const parts = [];
    let value,
        piece,
        num,
        i;
    for (i = 0; i < pieces.length; i += 1) {
        piece = pieces[i].replace(RegExp("\\D"), "");
        num = parseInt(piece, 10);

        if (isNaN(num)) {
            num = 0;
        }
        parts.push(num);
    }
    const partsLength = parts.length;
    for (i = partsLength - 1; i >= 0; i -= 1) {
        value = parts[i];
        if (value === 0) {
            parts.length -= 1;
        } else {
            break;
        }
    }
    return parts;
};

export const isGreaterEqualMinVersion = function (minimal_version: string, current_version: string): boolean {

    const x = normalizeVersionString(minimal_version);
    const y = normalizeVersionString(current_version);

    const size = Math.min(x.length, y.length);
    let i;

    for (i = 0; i < size; i += 1) {
        if (x[i] !== y[i]) {
            return x[i] < y[i] ? true : false;
        }
    }
    if (x.length === y.length) {
        return true;
    }
    return (x.length < y.length) ? true : false;
};

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

    } else if (device.isBatteryDoorbell()) {
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

export const getBlocklist = function(directions: Array<number>): Array<number> {
    const result = [];
    for (let distance = 1; distance <= 5; distance++) {
        let i = 0;
        let j = 0;
        let k = 1;
        for (const directionDistance of directions) {
            if (directionDistance >= distance) {
                j += k;
            }
            k <<= 1;
        }
        if (j == 0) {
            i = 65535;
        } else if (!(j == 255 || j == 65535)) {
            i = (j ^ 255) + 65280;
        }
        result.push(65535 & i);
    }
    return result;
}


export const getDistances = function(blocklist: Array<number>): Array<number> {
    const result = [3, 3, 3, 3, 3, 3, 3, 3];
    let calcDistance = 0;
    for (const blockElement of blocklist) {
        let valueOf = blockElement ^ 65535;
        calcDistance++;
        if (valueOf !== 0) {
            for (let i = 0; i < result.length; i++) {
                const intValue = valueOf & 1;
                if (intValue > 0) {
                    result[i] = calcDistance;
                }
                valueOf = valueOf >> 1;
            }
        }
    }
    return result;
}

export const isHB3DetectionModeEnabled = function(value: number, type: HB3DetectionTypes): boolean {
    if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
        return (type & value) == type && (value & 65536) == 65536;
    } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
        return (type & value) == type && (value & 1) == 1;
    }
    return (type & value) == type;
}

export const getHB3DetectionMode = function(value: number, type: HB3DetectionTypes, enable: boolean): number {
    let result = 0;
    if (!enable) {
        if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
            const tmp = (type & value) == type ? type ^ value : value;
            result = (value & 65536) == 65536 ? tmp ^ 65536 : tmp;
        } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
            const tmp = (type & value) == type ? type ^ value : value;
            result = (value & 1) == 1 ? tmp ^ 1 : tmp;
        } else {
            result = type ^ value;
        }
    } else {
        if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
            result =  type | value | 65536;
        } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
            result =  type | value | 1;
        } else {
            result = type | value;
        }
    }
    return result;
}

export interface EufyTimezone {
    timeZoneName: string;
    timeId: string;
    timeSn: string;
    timeZoneGMT: string;
}

export const getEufyTimezone = function(): EufyTimezone | undefined {
    for (const timezone of timeZoneData) {
        if (timezone.timeId === Intl.DateTimeFormat().resolvedOptions().timeZone) {
            return timezone
        }
    }
    return undefined;
};

export const getAdvancedLockTimezone = function(stationSN: string): string {
    const timezone = getEufyTimezone();
    if (timezone !== undefined) {
        if (stationSN.startsWith("T8520") && isGreaterEqualMinVersion("1.2.8.6", stationSN))
            return `${timezone.timeZoneGMT}|1.${timezone.timeSn}`
        else
            return timezone.timeZoneGMT;
    }
    return "";
};

export class SmartSafeByteWriter {

    private split_byte = -95;
    private data = Buffer.from([]);

    public write(bytes: Buffer): void {
        const tmp_data = Buffer.from(bytes);
        this.data = Buffer.concat([ this.data, Buffer.from([this.split_byte]), Buffer.from([tmp_data.length & 255]), tmp_data]);
        this.split_byte += 1;
    }

    public getData(): Buffer {
        return this.data;
    }

}

/*export const generateHash = function(data: Buffer): number {
    let result = 0;
    for (const value of data) {
        result = result ^ value;
    }
    return result;
}

export const encodeSmartSafeData = function(command: number, payload: Buffer): Buffer {
    const header = Buffer.from(SmartSafe.DATA_HEADER);
    const size = Buffer.allocUnsafe(2);
    size.writeInt16LE(payload.length + 9);
    const versionCode = Buffer.from([SmartSafe.VERSION_CODE]);
    const dataType = Buffer.from([-1]);
    const commandCode = Buffer.from([command]);
    const packageFlag = Buffer.from([-64]);
    const data = Buffer.concat([header, size, versionCode, dataType, commandCode, packageFlag, payload]);
    const hash = generateHash(data);
    return Buffer.concat([data, Buffer.from([hash])]);
}*/

export const encodePasscode = function(pass: string): string {
    let result = "";
    for (let i = 0; i < pass.length; i++)
        result += pass.charCodeAt(i).toString(16);
    return result;
}

export const hexDate = function(date: Date): string {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUint8(date.getDate());
    buf.writeUint8(date.getMonth() + 1, 1);
    buf.writeUint16BE(date.getFullYear(), 2);
    return buf.readUInt32LE().toString(16).padStart(8, "0");
}

export const hexTime = function(date: Date): string {
    const buf = Buffer.allocUnsafe(2);
    buf.writeUint8(date.getHours());
    buf.writeUint8(date.getMinutes(), 1);
    return buf.readUInt16BE().toString(16).padStart(4, "0");
}

export const hexWeek = function(schedule: Schedule): string {
    const SUNDAY    = 1;
    const MONDAY    = 2;
    const TUESDAY   = 4;
    const WEDNESDAY = 8;
    const THUERSDAY = 16;
    const FRIDAY    = 32;
    const SATURDAY  = 64;

    let result = 0;

    if (schedule.week !== undefined) {
        if (schedule.week.sunday) {
            result |= SUNDAY;
        }
        if (schedule.week.monday) {
            result |= MONDAY;
        }
        if (schedule.week.tuesday) {
            result |= TUESDAY;
        }
        if (schedule.week.wednesday) {
            result |= WEDNESDAY;
        }
        if (schedule.week.thursday) {
            result |= THUERSDAY;
        }
        if (schedule.week.friday) {
            result |= FRIDAY;
        }
        if (schedule.week.saturday) {
            result |= SATURDAY;
        }
        return result.toString(16);
    }
    return "ff";
}


export const randomNumber = function(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
