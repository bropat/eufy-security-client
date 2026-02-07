import { createCipheriv, createDecipheriv } from "crypto";
import {
  PATH_DATA_CAMERA,
  PATH_DATA_VIDEO,
  PATH_MMC_CAMERA,
  PATH_MMC_VIDEO,
  PhoneModelStructure,
  timeZoneData,
} from "./const";
import md5 from "crypto-js/md5";
import enc_hex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";

import { Device } from "./device";
import { Picture, Schedule } from "./interfaces";
import {
  CommandName,
  DeviceType,
  FloodlightT8425NotificationTypes,
  HB3DetectionTypes,
  IndoorS350DetectionTypes,
  IndoorS350NotificationTypes,
  NotificationSwitchMode,
  NotificationType,
  PropertyName,
  SignalLevel,
  SmartLockNotification,
  SourceType,
  T8170DetectionTypes,
} from "./types";
import { HTTPApi } from "./api";
import { ensureError } from "../error";
import { ImageBaseCodeError } from "./error";
import { LockPushEvent } from "./../push/types";
import { Station } from "./station";
import { rootHTTPLogger } from "../logging";
import { getError, isEmpty } from "../utils";
import { PushMessage } from "../push/models";

export const normalizeVersionString = function (version: string): number[] | null {
  /**
   *
   * Normalise version strings into an array of integers, otherwise if a version was not found it returns null
   * Example of a version is 1.4.30.33
   *
   * @param version
   */

  const match = version.match(/\d+(?:\.\d+)+/);
  if (match == null) return null;
  else {
    return match[0].split(".").map(Number);
  }
};

export const isGreaterEqualMinVersion = function (minimal_version: string, current_version: string): boolean {
  /**
   *
   *  Test the minimal version set is working with the current version by return true if it is equal or greater than min version.
   *
   * @param minimal_version
   * @param current_version
   */
  const min_version = normalizeVersionString(minimal_version);
  const actual_version = normalizeVersionString(current_version);

  // Failed to parse actually version
  if (actual_version === null) return false;
  // Failed to a parse min version but the current did, so we assume it is greater
  if (min_version === null) return true;

  const version_slots = Math.min(min_version.length, actual_version.length);
  let i;

  // Loop for each slot to ensure it is greater or equal
  for (i = 0; i < version_slots; i += 1) {
    if (min_version[i] !== actual_version[i]) {
      return min_version[i] < actual_version[i];
    }
  }

  // If none of the slots are different but the length is the same, it is most likely the slots are the same
  if (min_version.length === actual_version.length) {
    return true;
  }

  return min_version.length < actual_version.length;
};

export const pad = function (num: number): string {
  /**
   *
   *  Convert the number to be absolute, round down and return "0" if lower than 10 or "" otherwise
   *  Seems to be used in a scenario where need to add a zero decimal to format a 2 digit string
   *
   * @param num
   */

  const norm = Math.floor(Math.abs(num));
  return (norm < 10 ? "0" : "") + norm;
};

export const getTimezoneGMTString = function (): string {
  /**
   * Get timezone to string
   *
   */
  const tzo = -new Date().getTimezoneOffset();
  const dif = tzo >= 0 ? "+" : "-";
  return `GMT${dif}${pad(tzo / 60)}:${pad(tzo % 60)}`;
};

export const getAbsoluteFilePath = function (device_type: number, channel: number, filename: string): string {
  /**
   *
   *   Create the path based on two different devices
   *
   * @param device_type
   * @param channel
   * @param filename
   */

  // TODO : might need to extend to others device with local storage? not sure why only floodlight
  const prefix = device_type === DeviceType.FLOODLIGHT ? PATH_DATA_CAMERA : PATH_MMC_CAMERA;
  return `${prefix}${String(channel).padStart(2, "0")}/${filename}.dat`;
};

export const getImageFilePath = function (device_type: number, channel: number, filename: string): string {
  /**
   *
   *  Create the image path from a video filename
   *
   * @param device_type
   * @param channel
   * @param filename
   */
  // TODO : might need to extend to others device with local storage? not sure why only floodlight
  const prefix = device_type === DeviceType.FLOODLIGHT ? PATH_DATA_VIDEO : PATH_MMC_VIDEO;
  return `${prefix}/${filename}_c${String(channel).padStart(2, "0")}.jpg`;
};

export const isNotificationSwitchMode = function (value: number, mode: NotificationSwitchMode): boolean {
  /**
   *
   *   Check if the mode is set to notification
   *
   * @param value
   * @param mode
   */

  if (value === 1) value = 240;

  return (value & mode) !== 0;
};

export const switchNotificationMode = function (
  currentValue: number,
  mode: NotificationSwitchMode,
  enable: boolean
): number {
  let result = 0;
  if (!enable && currentValue === 1 /* ALL */) {
    currentValue = 240;
  }
  if (enable) {
    result = mode | currentValue;
  } else {
    result = ~mode & currentValue;
  }
  if (
    isNotificationSwitchMode(result, NotificationSwitchMode.SCHEDULE) &&
    isNotificationSwitchMode(result, NotificationSwitchMode.APP) &&
    isNotificationSwitchMode(result, NotificationSwitchMode.GEOFENCE) &&
    isNotificationSwitchMode(result, NotificationSwitchMode.KEYPAD)
  ) {
    result = 1; /* ALL */
  }
  return result;
};

// TODO : remove device , not needed
export const calculateWifiSignalLevel = function (device: Device, rssi: number): SignalLevel {
  /**
   *  Calculate the signal strength based on the RSSI
   *
   *  Using this scale for reference
   *  Excellent/Very Strong (-30 dBm to -50 dBm)
   *  Good/Strong (-50 dBm to -60 dBm)
   *  Fair/Good (-60 dBm to -67 dBm)
   *  Weak/Fair (-67 dBm to -70 dBm)
   *  Very Weak/Poor (-70 dBm to -80 dBm)
   *  Unusable (-80 dBm to -90 dBm or lower)
   *
   */

  if (rssi >= -50) return SignalLevel.FULL;
  else if (rssi < -50 && rssi >= -60) return SignalLevel.STRONG;
  else if (rssi < -60 && rssi >= -67) return SignalLevel.NORMAL;
  else if (rssi < -67 && rssi >= -80) return SignalLevel.WEAK;
  else return SignalLevel.NO_SIGNAL;
};

export const calculateCellularSignalLevel = function (rssi: number): SignalLevel {
  /**
   *  Calculate the signal strength from the RSSI ( this has a different scale than wifi )
   *
   * Excellent (>-65 to -70 dBm)
   * Good (-70 to -85 dBm)
   * Fair (-85 to -95 dBm)
   * Poor (-95 to -100 dBm)
   * Unusable/No Signal (<-100 to -110 dBm)
   *
   */
  if (rssi >= 0) return SignalLevel.NO_SIGNAL;
  if (rssi >= -70) return SignalLevel.FULL;
  else if (rssi < -70 && rssi >= -85) return SignalLevel.STRONG;
  else if (rssi < -85 && rssi >= -95) return SignalLevel.NORMAL;
  else if (rssi < -95 && rssi >= -100) return SignalLevel.WEAK;
  else return SignalLevel.NO_SIGNAL;
};

export const encryptAPIData = (data: string, key: Buffer): string => {
  const cipher = createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
  return cipher.update(data, "utf8", "base64") + cipher.final("base64");
};

export const decryptAPIData = (data: string, key: Buffer): Buffer => {
  const cipher = createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
  return Buffer.concat([cipher.update(data, "base64"), cipher.final()]);
};

export const getBlocklist = function (distanceArray: Array<number>): Array<number> {
  /**
   *  It looks like it taken from the decompiled app from Eufy in the file SimpleDetectionGroup.java
   *
   *  From asking, AI, this function it creates a bitmask representing which radar points meet that distance requirement.
   *  Finally, it applies a specific bitwise transformation to that mask.
   *
   *  Potential description: Generates radar configuration parameters based on distance thresholds.
   *
   *  * @param {number[]} distanceArray - An array of integers representing distances.
   *  * @returns {number[]} A list of 5 bitmask integers.
   */
  const requestParams = [];

  for (let threshold = 1; threshold <= 5; threshold++) {
    let bitmask = 0;
    let bitPosition = 1;

    // Iterate through each distance in the array
    for (const distance of distanceArray) {
      if (distance >= threshold) {
        bitmask |= bitPosition;
      }
      // Shift bitPosition left by 1 (multiply by 2)
      bitPosition <<= 1;
    }

    let finalValue = 0;

    // Logic for specific bit patterns
    if (bitmask === 0) {
      finalValue = 0xffff; // 65535
    } else if (bitmask !== 0xff && bitmask !== 0xffff) {
      // Flip the bits and add the 0xFF00 (65280) high-byte padding
      finalValue = (bitmask ^ 0xff) + 0xff00;
    }

    requestParams.push(finalValue);
  }
  return requestParams;
};

export const getDistances = function (rawDistanceData: Array<number>): Array<number> {
  /**
   *  It looks like it taken from the decompiled app from Eufy in the file SimpleDetectionGroup.java
   *
   *  From asking AI:
   *  Processes raw radar sensor data to map object detections into spatial sectors.
   *  This method iterates through a list of distance data, where each element represents
   *  a depth level and its bits represent angular sectors. It inverts the bitmask,
   *  identifies active detections via bit-shifting, and updates a collection of
   *  RadarSelectInfo objects with the corresponding angle and proximity distance.
   *
   *   @param rawDistanceData A list of integers where each bit represents a detection
   *   at a specific angle, and the list index represents depth.
   */
  const radarSectors = [3, 3, 3, 3, 3, 3, 3, 3];
  let distanceStep = 0;

  for (const rawValue of rawDistanceData) {
    // Bitwise NOT/XOR to invert the signal (common in hardware where 0=detected)
    let invertedBits = rawValue ^ 65535;
    distanceStep++;

    if (invertedBits !== 0) {
      for (let i = 0; i < radarSectors.length; i++) {
        const isObjectDetected = invertedBits & 1; // Check if the lowest bit is set
        // If the bit was 1, mark this sector with the current distance
        if (isObjectDetected > 0) {
          radarSectors[i] = distanceStep;
        }
        // Shift bits to check the next angle in the next iteration
        invertedBits = invertedBits >> 1;
      }
    }
  }
  return radarSectors;
};

export const isDeliveryPackageType = function (value: number): boolean {
  /**
   *  Seems to be coming from EventData.java
   *
   */
  return (value & 65536) == 65536;
};

export const isHB3DetectionModeEnabled = function (value: number, type: HB3DetectionTypes): boolean {
  /**
   * Detection if Mode is enabled
   *
   */
  const prefixCode = (type & value) == type;
  if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
    return prefixCode && isDeliveryPackageType(value);
  } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
    return prefixCode && (value & 1) == 1;
  }
  return prefixCode;
};

export const getHB3DetectionMode = function (value: number, type: HB3DetectionTypes, enable: boolean): number {
  let result = 0;
  if (!enable) {
    if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
      const tmp = (type & value) == type ? type ^ value : value;
      result = isDeliveryPackageType(value) ? tmp ^ 65536 : tmp;
    } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
      const tmp = (type & value) == type ? type ^ value : value;
      result = (value & 1) == 1 ? tmp ^ 1 : tmp;
    } else {
      result = type ^ value;
    }
  } else {
    if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
      result = type | value | 65536;
    } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
      result = type | value | 1;
    } else {
      result = type | value;
    }
  }
  return result;
};

export interface EufyTimezone {
  timeZoneName: string;
  timeId: string;
  timeSn: string;
  timeZoneGMT: string;
}

export const getEufyTimezone = function (): EufyTimezone | undefined {
  for (const timezone of timeZoneData) {
    if (timezone.timeId === Intl.DateTimeFormat().resolvedOptions().timeZone) {
      return timezone;
    }
  }
  return undefined;
};

export const getAdvancedLockTimezone = function (stationSN: string): string {
  const timezone = getEufyTimezone();
  if (timezone !== undefined) {
    // TODO: make this a method to check whatever we need to check for the station
    if (stationSN.startsWith("T8520") && isGreaterEqualMinVersion("1.2.8.6", stationSN))
      return `${timezone.timeZoneGMT}|1.${timezone.timeSn}`;
    else return timezone.timeZoneGMT;
  }
  return "";
};

export class WritePayload {
  private split_byte = -95;
  private data = Buffer.from([]);

  public write(bytes: Buffer): void {
    const tmp_data = Buffer.from(bytes);
    this.data = Buffer.concat([
      this.data,
      Buffer.from([this.split_byte]),
      Buffer.from([tmp_data.length & 255]),
      tmp_data,
    ]);
    this.split_byte += 1;
  }

  public getData(): Buffer {
    return this.data;
  }
}

export class ParsePayload {
  /**
   * extract specific pieces of data from a binary buffer
   *
   * @private
   */

  private readonly data;

  constructor(data: Buffer) {
    this.data = data;
  }

  public readUint32BE(indexValue: number): number {
    return this.readData(indexValue).readUint32BE();
  }

  public readUint32LE(indexValue: number): number {
    return this.readData(indexValue).readUint32LE();
  }

  public readUint16BE(indexValue: number): number {
    return this.readData(indexValue).readUint16BE();
  }

  public readUint16LE(indexValue: number): number {
    return this.readData(indexValue).readUint16LE();
  }

  public readString(indexValue: number): string {
    return this.readData(indexValue).toString();
  }

  public readStringHex(indexValue: number): string {
    return this.readData(indexValue).toString("hex");
  }

  public readInt8(indexValue: number): number {
    let dataPosition = this.getDataPosition(indexValue);
    if (dataPosition == -1) {
      return 0;
    }
    dataPosition = dataPosition + 2;
    if (dataPosition >= this.data.length) {
      return 0;
    }
    return this.data.readInt8(dataPosition);
  }

  public readData(indexValue: number): Buffer {
    let dataPosition = this.getDataPosition(indexValue);
    if (dataPosition == -1) {
      return Buffer.from("");
    }
    dataPosition++;
    if (dataPosition >= this.data.length) {
      return Buffer.from("");
    }
    const nextStep = this.getNextStep(indexValue, dataPosition, this.data);
    let tmp;
    if (nextStep == 1) {
      tmp = this.data.readInt8(dataPosition);
    } else {
      tmp = this.data.readUint16LE(dataPosition);
    }
    if (dataPosition + nextStep + tmp > this.data.length) {
      return Buffer.from("");
    }
    return this.data.subarray(dataPosition + nextStep, dataPosition + nextStep + tmp);
  }

  private getDataPosition(indexValue: number): number {
    if (this.data && this.data.length >= 1) {
      for (let currentPosition = 0; currentPosition < this.data.length; ) {
        if (this.data.readInt8(currentPosition) == indexValue) {
          return currentPosition;
        } else {
          const value = this.data.readInt8(currentPosition);
          currentPosition++;
          if (currentPosition >= this.data.length) {
            break;
          }
          const nextStep = this.getNextStep(value, currentPosition, this.data);
          if (currentPosition + nextStep >= this.data.length) {
            break;
          }
          if (nextStep == 1) {
            currentPosition = this.data.readInt8(currentPosition) + currentPosition + nextStep;
          } else {
            currentPosition = this.data.readUint16LE(currentPosition) + currentPosition + nextStep;
          }
        }
      }
    }
    return -1;
  }

  private getNextStep(indexValue: number, position: number, data: Buffer): number {
    const newPosition = position + 1 + data.readUInt8(position);
    return newPosition == data.length || newPosition > data.length || data.readInt8(newPosition) == indexValue + 1
      ? 1
      : 2;
  }
}

export const encodePasscode = function (pass: string): string {
  /**
   *  Encode the passcode for smart lock
   *
   */
  let result = "";
  for (let i = 0; i < pass.length; i++) result += pass.charCodeAt(i).toString(16);
  return result;
};

export const hexDate = function (date: Date): string {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUint8(date.getDate());
  buf.writeUint8(date.getMonth() + 1, 1);
  buf.writeUint16BE(date.getFullYear(), 2);
  return buf.readUInt32LE().toString(16).padStart(8, "0");
};

export const hexTime = function (date: Date): string {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUint8(date.getHours());
  buf.writeUint8(date.getMinutes(), 1);
  return buf.readUInt16BE().toString(16).padStart(4, "0");
};

export const hexWeek = function (schedule: Schedule): string {
  const SUNDAY = 1;
  const MONDAY = 2;
  const TUESDAY = 4;
  const WEDNESDAY = 8;
  const THURSDAY = 16;
  const FRIDAY = 32;
  const SATURDAY = 64;

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
      result |= THURSDAY;
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
};

export const hexStringScheduleToSchedule = function (
  startDay: string,
  startTime: string,
  endDay: string,
  endTime: string,
  week: string
): Schedule {
  const SUNDAY = 1;
  const MONDAY = 2;
  const TUESDAY = 4;
  const WEDNESDAY = 8;
  const THURSDAY = 16;
  const FRIDAY = 32;
  const SATURDAY = 64;

  const weekNumber = Number.parseInt(week, 16);
  return {
    startDateTime:
      startDay === "00000000"
        ? undefined
        : new Date(
            Number.parseInt(`${startDay.substring(2, 4)}${startDay.substring(0, 2)}`, 16),
            Number.parseInt(startDay.substring(4, 6), 16) - 1,
            Number.parseInt(startDay.substring(6, 8), 16),
            Number.parseInt(startTime.substring(0, 2), 16),
            Number.parseInt(startTime.substring(2, 4), 16)
          ),
    endDateTime:
      endDay === "ffffffff"
        ? undefined
        : new Date(
            Number.parseInt(`${endDay.substring(2, 4)}${endDay.substring(0, 2)}`, 16),
            Number.parseInt(endDay.substring(4, 6), 16) - 1,
            Number.parseInt(endDay.substring(6, 8), 16),
            Number.parseInt(endTime.substring(0, 2), 16),
            Number.parseInt(endTime.substring(2, 4), 16)
          ),
    week: {
      monday: (weekNumber & MONDAY) == MONDAY,
      tuesday: (weekNumber & TUESDAY) == TUESDAY,
      wednesday: (weekNumber & WEDNESDAY) == WEDNESDAY,
      thursday: (weekNumber & THURSDAY) == THURSDAY,
      friday: (weekNumber & FRIDAY) == FRIDAY,
      saturday: (weekNumber & SATURDAY) == SATURDAY,
      sunday: (weekNumber & SUNDAY) == SUNDAY,
    },
  };
};

export const randomNumber = function (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getIdSuffix = function (p2pDid: string): number {
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

export const getImageBaseCode = function (serialNumber: string, p2pDid: string): string {
  let nr = 0;
  try {
    nr = Number.parseInt(`0x${serialNumber[serialNumber.length - 1]}`);
  } catch (err) {
    const error = ensureError(err);
    throw new ImageBaseCodeError("Error generating image base code", {
      cause: error,
      context: { serialnumber: serialNumber, p2pDid: p2pDid },
    });
  }
  nr = (nr + 10) % 10;
  const base = serialNumber.substring(nr);
  return `${base}${getIdSuffix(p2pDid)}`;
};

export const getImageSeed = function (p2pDid: string, code: string): string {
  try {
    const nCode = Number.parseInt(code.substring(2));
    const prefix = 1000 - getIdSuffix(p2pDid);
    return md5(`${prefix}${nCode}`).toString(enc_hex).toUpperCase();
  } catch (err) {
    const error = ensureError(err);
    throw new ImageBaseCodeError("Error generating image seed", {
      cause: error,
      context: { p2pDid: p2pDid, code: code },
    });
  }
};

export const getImageKey = function (serialNumber: string, p2pDid: string, code: string): string {
  const baseCode = getImageBaseCode(serialNumber, p2pDid);
  const seed = getImageSeed(p2pDid, code);
  const data = `01${baseCode}${seed}`;
  const hash = sha256(data);
  const hashBytes = [...Buffer.from(hash.toString(enc_hex), "hex")];
  const startByte = hashBytes[10];
  for (let i = 0; i < 32; i++) {
    const byte = hashBytes[i];
    let fixed_byte = startByte;
    if (i < 31) {
      fixed_byte = hashBytes[i + 1];
    }
    if (i == 31 || (i & 1) != 0) {
      hashBytes[10] = fixed_byte;
      if (126 < byte || 126 < hashBytes[10]) {
        if (byte < hashBytes[10] || byte - hashBytes[10] == 0) {
          hashBytes[i] = hashBytes[10] - byte;
        } else {
          hashBytes[i] = byte - hashBytes[10];
        }
      }
    } else if (byte < 125 || fixed_byte < 125) {
      hashBytes[i] = fixed_byte + byte;
    }
  }
  return `${Buffer.from(hashBytes.slice(16)).toString("hex").toUpperCase()}`;
};

export const decodeImage = function (p2pDid: string, data: Buffer): Buffer {
  if (data.length >= 12) {
    const header = data.subarray(0, 12).toString();
    if (header === "eufysecurity") {
      const serialNumber = data.subarray(13, 29).toString();
      const code = data.subarray(30, 40).toString();
      const imageKey = getImageKey(serialNumber, p2pDid, code);
      const otherData = data.subarray(41);
      const encryptedData = otherData.subarray(0, 256);
      const cipher = createDecipheriv("aes-128-ecb", Buffer.from(imageKey, "utf-8").subarray(0, 16), null);
      cipher.setAutoPadding(false);
      const decryptedData = Buffer.concat([cipher.update(encryptedData), cipher.final()]);
      decryptedData.copy(otherData);
      return otherData;
    }
  }
  return data;
};

export const getImagePath = function (path: string): string {
  const splitPath = path.split("~");
  if (splitPath.length === 2) {
    return splitPath[1];
  }
  return path;
};

// TODO: make up some testing
export const getImage = async function (api: HTTPApi, serial: string, url: string): Promise<Picture> {
  const { default: imageType } = await import("image-type");
  const image = await api.getImage(serial, url);
  const type = await imageType(image);
  return {
    data: image,
    type: type !== null && type !== undefined ? type : { ext: "unknown", mime: "application/octet-stream" },
  };
};

export const isPrioritySourceType = function (current: SourceType | undefined, update: SourceType): boolean {
  return (
    ((current === "http" || current === "p2p" || current === "push" || current === "mqtt" || current === undefined) &&
      (update === "p2p" || update === "push" || update === "mqtt")) ||
    ((current === "http" || current === undefined) && update === "http")
  );
};

export const decryptTrackerData = (data: Buffer, key: Buffer): Buffer => {
  const decipher = createDecipheriv("aes-128-ecb", key, null);
  decipher.setAutoPadding(false);
  return Buffer.concat([decipher.update(data), decipher.final()]);
};

// TODO: this seems to be used before above
export const isT8170DetectionModeEnabled = function (value: number, type: T8170DetectionTypes): boolean {
  return (type & value) == type;
};

// TODO this seems like  getHB3DetectionMode
export const getT8170DetectionMode = function (value: number, type: T8170DetectionTypes, enable: boolean): number {
  let result = 0;
  if (
    Object.values(T8170DetectionTypes).includes(type) &&
    Object.values(T8170DetectionTypes).includes(value) &&
    !enable
  )
    return value;
  if (!enable) {
    result = type ^ value;
  } else {
    result = type | value;
  }
  return result;
};
// TODO: this is like isT8170DetectionModeEnabled
export const isIndoorS350DetectionModeEnabled = function (value: number, type: IndoorS350DetectionTypes): boolean {
  return (type & value) == type;
};

// TODO: this is like getT8170DetectionMode
export const getIndoorS350DetectionMode = function (
  value: number,
  type: IndoorS350DetectionTypes,
  enable: boolean
): number {
  let result = 0;
  if (
    Object.values(IndoorS350DetectionTypes).includes(type) &&
    Object.values(IndoorS350DetectionTypes).includes(value) &&
    !enable
  )
    return value;
  if (!enable) {
    result = type ^ value;
  } else {
    result = type | value;
  }
  return result;
};
// TODO: this is like isT8170DetectionModeEnabled

export const isIndoorNotitficationEnabled = function (value: number, type: IndoorS350NotificationTypes): boolean {
  return (type & value) == type;
};

// TODO: this is like getT8170DetectionMode

export const getIndoorNotification = function (
  value: number,
  type: IndoorS350NotificationTypes,
  enable: boolean
): number {
  let result = 0;
  if (!enable) {
    result = (type ^ value) + 800;
  } else {
    result = type | value;
  }
  return result;
};
// TODO: this is like isT8170DetectionModeEnabled

export const isFloodlightT8425NotitficationEnabled = function (
  value: number,
  type: FloodlightT8425NotificationTypes
): boolean {
  return (type & value) == type;
};

// TODO: this is like getT8170DetectionMode

export const getFloodLightT8425Notification = function (
  value: number,
  type: FloodlightT8425NotificationTypes,
  enable: boolean
): number {
  let result = 0;
  if (!enable) {
    result = type ^ value;
  } else {
    result = type | value;
  }
  return result;
};

export const getLockEventType = function (event: LockPushEvent): number {
  switch (event) {
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
};

// TODO: this is like getT8170DetectionMode

export const switchSmartLockNotification = function (
  currentValue: number,
  mode: SmartLockNotification,
  enable: boolean
): number {
  let result = 0;
  if (enable) {
    result = mode | currentValue;
  } else {
    result = ~mode & currentValue;
  }
  return result;
};

// TODO: this is like isT8170DetectionModeEnabled

export const isSmartLockNotification = function (value: number, mode: SmartLockNotification): boolean {
  return (value & mode) !== 0;
};

export const getWaitSeconds = (device: Device): number => {
  let seconds = 60;
  const workingMode = device.getPropertyValue(PropertyName.DevicePowerWorkingMode);
  if (workingMode !== undefined && workingMode === 2) {
    const customValue = device.getPropertyValue(PropertyName.DeviceRecordingClipLength);
    if (customValue !== undefined) {
      seconds = customValue as number;
    }
  }
  return seconds;
};

export const loadImageOverP2P = function (
  station: Station,
  device: Device,
  id: string,
  p2pTimeouts: Map<string, NodeJS.Timeout>
): void {
  if (station.hasCommand(CommandName.StationDatabaseQueryLatestInfo) && p2pTimeouts.get(id) === undefined) {
    const seconds = getWaitSeconds(device);
    p2pTimeouts.set(
      id,
      setTimeout(async () => {
        station.databaseQueryLatestInfo();
        p2pTimeouts.delete(id);
      }, seconds * 1000)
    );
  }
};

export const loadEventImage = function (
  station: Station,
  api: HTTPApi,
  device: Device,
  message: PushMessage,
  p2pTimeouts: Map<string, NodeJS.Timeout>
): void {
  if (message.notification_style === NotificationType.MOST_EFFICIENT) {
    loadImageOverP2P(station, device, device.getSerial(), p2pTimeouts);
  } else {
    if (!isEmpty(message.pic_url)) {
      getImage(api, device.getSerial(), message.pic_url!)
        .then((image) => {
          if (image.data.length > 0) {
            if (p2pTimeouts.get(device.getSerial()) !== undefined) {
              clearTimeout(p2pTimeouts.get(device.getSerial()));
              p2pTimeouts.delete(device.getSerial());
            }
            device.updateProperty(PropertyName.DevicePicture, image, true);
          } else {
            //fallback
            loadImageOverP2P(station, device, device.getSerial(), p2pTimeouts);
          }
        })
        .catch((err) => {
          const error = ensureError(err);
          rootHTTPLogger.debug(`Device load event image - Fallback Error`, {
            error: getError(error),
            stationSN: station.getSerial(),
            deviceSN: device.getSerial(),
            message: JSON.stringify(message),
          });
          loadImageOverP2P(station, device, device.getSerial(), p2pTimeouts);
        });
    } else {
      //fallback
      loadImageOverP2P(station, device, device.getSerial(), p2pTimeouts);
    }
  }
};

export const getRandomPhoneModel = function () {
  /**
   *  Generate a random phone model based on a structure
   */
  const brandKeys = Object.keys(PhoneModelStructure);
  const randomBrandName = brandKeys[Math.floor(Math.random() * brandKeys.length)];

  const pick = (arr: any) => arr[Math.floor(Math.random() * arr.length)];

  let part1 = "";
  let part2 = "";
  const dataBrand = PhoneModelStructure[randomBrandName];

  if (dataBrand.first && dataBrand.second) {
    part1 = pick(dataBrand.first);
    part2 = pick(dataBrand.second);
  }

  if (dataBrand.numbers && dataBrand.letters) {
    const minNum = Math.pow(10, dataBrand.numbers - 1);
    const maxNum = Math.pow(10, dataBrand.numbers) - 1;
    part1 = String(Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum);
    part2 = pick(dataBrand.letters);
  }
  return `${randomBrandName}${part1}${part2}`.trim();
};
