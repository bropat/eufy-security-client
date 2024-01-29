import { createCipheriv, createDecipheriv } from "crypto";
import { timeZoneData } from "./const";
import md5 from "crypto-js/md5";
import enc_hex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";

import { Device } from "./device";
import { Picture, Schedule } from "./interfaces";
import { NotificationSwitchMode, DeviceType, SignalLevel, HB3DetectionTypes, SourceType, T8170DetectionTypes, IndoorS350NotificationTypes, FloodlightT8425NotificationTypes } from "./types";
import { HTTPApi } from "./api";
import { ensureError } from "../error";
import { ImageBaseCodeError } from "./error";
import { LockPushEvent } from "..";

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

export const getImageFilePath = function(device_type:number, channel: number, filename: string): string {
    if (device_type === DeviceType.FLOODLIGHT) {
        return `/mnt/data/video/${filename}_c${String(channel).padStart(2,"0")}.jpg`;
    }
    return `/media/mmcblk0p1/video/${filename}_c${String(channel).padStart(2,"0")}.jpg`;
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

export const calculateWifiSignalLevel = function(device: Device, rssi: number): SignalLevel {
    if (device.isWiredDoorbell()) {
        if (rssi >= -65) {
            return SignalLevel.FULL;
        }
        if (rssi >= -75) {
            return SignalLevel.STRONG;
        }
        return rssi >= -80 ? SignalLevel.NORMAL : SignalLevel.WEAK;
    } else if (device.isCamera2Product()) {
        if (rssi >= 0) {
            return SignalLevel.NO_SIGNAL;
        }
        if (rssi >= -65) {
            return SignalLevel.FULL;
        }
        if (rssi >= -75) {
            return SignalLevel.STRONG;
        }
        return rssi >= -85 ? SignalLevel.NORMAL : SignalLevel.WEAK;

    } else if (device.isFloodLight()) {
        if (rssi >= 0) {
            return SignalLevel.NO_SIGNAL;
        }
        if (rssi >= -60) {
            return SignalLevel.FULL;
        }
        if (rssi >= -70) {
            return SignalLevel.STRONG;
        }
        return rssi >= -80 ? SignalLevel.NORMAL : SignalLevel.WEAK;

    } else if (device.isBatteryDoorbell()) {
        if (rssi >= -65) {
            return SignalLevel.FULL;
        }
        if (rssi >= -75) {
            return SignalLevel.STRONG;
        }
        return rssi >= -85 ? SignalLevel.NORMAL : SignalLevel.WEAK;
    } else {
        if (rssi >= 0) {
            return SignalLevel.NO_SIGNAL;
        }
        if (rssi >= -65) {
            return SignalLevel.FULL;
        }
        if (rssi >= -75) {
            return SignalLevel.STRONG;
        }
        return rssi >= -85 ? SignalLevel.NORMAL : SignalLevel.WEAK;
    }
}

export const calculateCellularSignalLevel = function(rssi: number): SignalLevel {
    if (rssi >= 0) {
        return SignalLevel.NO_SIGNAL;
    }
    if (rssi >= -90) {
        return SignalLevel.FULL;
    }
    if (rssi >= -95) {
        return SignalLevel.STRONG;
    }
    return rssi >= -105 ? SignalLevel.NORMAL : SignalLevel.WEAK;
}

export const encryptAPIData = (data: string, key: Buffer): string => {
    const cipher = createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
    return (
        cipher.update(data, "utf8", "base64") +
        cipher.final("base64")
    );
}

export const decryptAPIData = (data: string, key: Buffer): Buffer => {
    const cipher = createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
    return Buffer.concat([
        cipher.update(data, "base64"),
        cipher.final()]
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

export const getIdSuffix = function(p2pDid: string): number {
    let result = 0;
    const match = p2pDid.match(/^[A-Z]+-(\d+)-[A-Z]+$/);
    if (match?.length == 2) {
        const num1 = Number.parseInt(match[1][0]);
        const num2 = Number.parseInt(match[1][1]);
        const num3 = Number.parseInt(match[1][3]);
        const num4 = Number.parseInt(match[1][5]);

        result = num1 + num2 + num3;
        if (num3 < 5) {
            result = result + num3;
        }
        result = result + num4;
    }
    return result;
};

export const getImageBaseCode = function(serialnumber: string, p2pDid: string): string {
    let nr = 0;
    try {
        nr = Number.parseInt(`0x${serialnumber[serialnumber.length - 1]}`);
    } catch (err) {
        const error = ensureError(err);
        throw new ImageBaseCodeError("Error generating image base code", { cause: error, context: { serialnumber: serialnumber, p2pDid: p2pDid } });
    }
    nr = (nr + 10) % 10;
    const base = serialnumber.substring(nr);
    return `${base}${getIdSuffix(p2pDid)}`;
};

export const getImageSeed = function(p2pDid: string, code: string): string {
    try {
        const ncode = Number.parseInt(code.substring(2));
        const prefix = 1000 - getIdSuffix(p2pDid);
        return md5(`${prefix}${ncode}`).toString(enc_hex).toUpperCase();
    } catch(err) {
        const error = ensureError(err);
        throw new ImageBaseCodeError("Error generating image seed", { cause: error, context: { p2pDid: p2pDid, code: code } });
    }
};

export const getImageKey = function(serialnumber: string, p2pDid: string, code: string): string {
    const basecode = getImageBaseCode(serialnumber, p2pDid);
    const seed = getImageSeed(p2pDid, code);
    const data = `01${basecode}${seed}`;
    const hash = sha256(data);
    const hashBytes = [...Buffer.from(hash.toString(enc_hex), "hex")];
    const startByte = hashBytes[10];
    for(let i = 0; i < 32; i++) {
        const byte = hashBytes[i];
        let fixed_byte = startByte;
        if (i < 31) {
            fixed_byte = hashBytes[i + 1];
        }
        if ((i == 31) || ((i & 1) != 0)) {
            hashBytes[10] = fixed_byte;
            if ((126 < byte) || (126 < hashBytes[10])) {
                if (byte < hashBytes[10] || (byte - hashBytes[10]) == 0) {
                    hashBytes[i] = hashBytes[10] - byte;
                } else {
                    hashBytes[i] = byte - hashBytes[10];
                }
            }
        } else if ((byte < 125) || (fixed_byte < 125)) {
            hashBytes[i] = fixed_byte + byte;
        }
    }
    return `${Buffer.from(hashBytes.slice(16)).toString("hex").toUpperCase()}`;
};

export const decodeImage = function(p2pDid: string, data: Buffer): Buffer {
    if (data.length >= 12) {
        const header = data.subarray(0, 12).toString();
        if (header === "eufysecurity") {
            const serialnumber = data.subarray(13, 29).toString();
            const code = data.subarray(30, 40).toString();
            const imageKey = getImageKey(serialnumber, p2pDid, code);
            const otherData = data.subarray(41);
            const encryptedData = otherData.subarray(0, 256);
            const cipher = createDecipheriv("aes-128-ecb", Buffer.from(imageKey, "utf-8").subarray(0, 16), null);
            cipher.setAutoPadding(false);
            const decryptedData =  Buffer.concat([
                cipher.update(encryptedData),
                cipher.final()]
            );
            decryptedData.copy(otherData);
            return otherData;
        }
    }
    return data;
};

export const getImagePath = function(path: string): string {
    const splittedPath = path.split("~");
    if (splittedPath.length === 2) {
        return splittedPath[1];
    }
    return path;
};

export const getImage = async function(api: HTTPApi, serial: string, url: string): Promise<Picture> {
    const { default: imageType } = await import("image-type");
    const image = await api.getImage(serial, url);
    const type = await imageType(image);
    return {
        data: image,
        type: type !== null && type !== undefined ? type : { ext: "unknown", mime: "application/octet-stream" }
    };
};

export const isPrioritySourceType = function(current: SourceType | undefined, update: SourceType): boolean {
    if (((current === "http" || current === "p2p" || current === "push" || current === "mqtt" || current === undefined) && (update === "p2p" || update === "push" || update === "mqtt")) ||
        ((current === "http" || current === undefined) && update === "http")) {
        return true;
    }
    return false;
}

export const decryptTrackerData = (data: Buffer, key: Buffer): Buffer => {
    const decipher = createDecipheriv("aes-128-ecb", key, null);
    decipher.setAutoPadding(false);
    return Buffer.concat([
        decipher.update(data),
        decipher.final()]
    );
}

export const isT8170DetectionModeEnabled = function(value: number, type: T8170DetectionTypes): boolean {
    return (type & value) == type;
}

export const getT8170DetectionMode = function(value: number, type: T8170DetectionTypes, enable: boolean): number {
    let result = 0;
    if (!enable) {
        result = type ^ value;
    } else {
        result = type | value;
    }
    return result;
}

export const isIndoorNotitficationEnabled = function(value: number, type: IndoorS350NotificationTypes): boolean {
    return (type & value) == type;
}

export const getIndoorNotification = function(value: number, type: IndoorS350NotificationTypes, enable: boolean): number {
    let result = 0;
    if (!enable) {
        result = (type ^ value) + 800;
    } else {
        result = type | value;
    }
    return result;
}

export const isFloodlightT8425NotitficationEnabled = function(value: number, type: FloodlightT8425NotificationTypes): boolean {
    return (type & value) == type;
}

export const getFloodLightT8425Notification = function(value: number, type: FloodlightT8425NotificationTypes, enable: boolean): number {
    let result = 0;
    if (!enable) {
        result = (type ^ value);
    } else {
        result = type | value;
    }
    return result;
}

export const getLockEventType = function(event: LockPushEvent): number {
    switch(event) {
        case LockPushEvent.AUTO_LOCK:
        case LockPushEvent.AUTO_UNLOCK:
            return 1;
        case LockPushEvent.MANUAL_LOCK:
        case LockPushEvent.MANUAL_UNLOCK:
            return 2;
        case LockPushEvent.APP_LOCK:
        case LockPushEvent.APP_UNLOCK:
            return 3;
        case LockPushEvent.PW_LOCK:
        case LockPushEvent.PW_UNLOCK:
            return 4;
        case LockPushEvent.FINGER_LOCK:
        case LockPushEvent.FINGERPRINT_UNLOCK:
            return 5;
        case LockPushEvent.TEMPORARY_PW_LOCK:
        case LockPushEvent.TEMPORARY_PW_UNLOCK:
            return 6;
        case LockPushEvent.KEYPAD_LOCK:
            return 7;
    }
    return 0;
}