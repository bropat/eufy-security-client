import { Readable } from "stream";
import type { Method } from "got" with {
    "resolution-mode": "import"
};
import type { ImageFileExtension } from "image-type" with {
    "resolution-mode": "import"
};
import { DatabaseCountByDate, DatabaseQueryLatestInfo, DatabaseQueryLocal, StreamMetadata } from "../p2p/interfaces";
import { CommandResult, StorageInfoBodyHB3 } from "../p2p/models";
import { AlarmEvent, DatabaseReturnCode, SmartSafeAlarm911Event, SmartSafeShakeAlarmEvent, TFCardStatus } from "../p2p/types";
import { Camera, Device } from "./device";
import { Cipher, Voice, Invite, DeviceListResponse, StationListResponse, HouseListResponse } from "./models";
import { Station } from "./station";
import { CommandName, PropertyName, SourceType } from "./types";
import { TalkbackStream } from "../p2p/talkback";
export type PropertyValue = number | boolean | string | object;
export interface PropertyValues {
    [index: string]: PropertyValue;
}
export interface DeviceConfig {
    simultaneousDetections?: boolean;
}
export interface RawValue {
    value: string;
    source: SourceType;
}
export interface RawValues {
    [index: number]: RawValue;
}
export interface Devices {
    [index: string]: Device;
}
export interface Cameras {
    [index: string]: Camera;
}
export interface Stations {
    [index: string]: Station;
}
export interface Houses {
    [index: string]: HouseListResponse;
}
export interface Hubs {
    [index: string]: StationListResponse;
}
export interface FullDevices {
    [index: string]: DeviceListResponse;
}
export interface Ciphers {
    [index: number]: Cipher;
}
export interface Voices {
    [index: number]: Voice;
}
export interface Invites {
    [index: number]: Invite;
}
export interface HTTPApiRequest {
    method: Method;
    endpoint: string | URL;
    responseType?: "text" | "json" | "buffer";
    data?: any;
}
export type PropertyMetadataType = "number" | "boolean" | "string" | "object";
export interface PropertyMetadataAny {
    key: number | string;
    name: PropertyName;
    type: PropertyMetadataType;
    default?: any;
    readable: boolean;
    writeable: boolean;
    description?: string;
    label?: string;
    commandId?: number;
}
export interface PropertyMetadataNumeric extends PropertyMetadataAny {
    type: "number";
    min?: number;
    max?: number;
    steps?: number;
    default?: number;
    states?: Record<number, string>;
    unit?: string;
}
export interface PropertyMetadataBoolean extends PropertyMetadataAny {
    type: "boolean";
    default?: boolean;
}
export interface PropertyMetadataString extends PropertyMetadataAny {
    type: "string";
    minLength?: number;
    maxLength?: number;
    default?: string;
    format?: RegExp;
}
export interface PropertyMetadataObject extends PropertyMetadataAny {
    type: "object";
    isValidObject?: (obj: any) => boolean;
    default?: any;
}
export interface IndexedProperty {
    [index: string]: PropertyMetadataAny;
}
export interface Properties {
    [index: number]: IndexedProperty;
}
export interface Commands {
    [index: number]: Array<CommandName>;
}
export interface HTTPApiPersistentData {
    user_id: string;
    email: string;
    nick_name: string;
    device_public_keys: {
        [index: string]: string;
    };
    clientPrivateKey: string;
    serverPublicKey: string;
}
export interface CaptchaOptions {
    captchaCode: string;
    captchaId: string;
}
export interface LoginOptions {
    verifyCode?: string;
    captcha?: CaptchaOptions;
    force: boolean;
}
export interface Schedule {
    startDateTime?: Date;
    endDateTime?: Date;
    week?: {
        monday: boolean;
        tuesday: boolean;
        wednesday: boolean;
        thursday: boolean;
        friday: boolean;
        saturday: boolean;
        sunday: boolean;
    };
}
export interface ImageType {
    ext: ImageFileExtension | "unknown";
    mime: string;
}
export interface Picture {
    data: Buffer;
    type: ImageType;
}
export interface HTTPApiEvents {
    "devices": (devices: FullDevices) => void;
    "hubs": (hubs: Hubs) => void;
    "houses": (houses: Houses) => void;
    "connect": () => void;
    "close": () => void;
    "connection error": (error: Error) => void;
    "tfa request": () => void;
    "captcha request": (id: string, captcha: string) => void;
    "auth token invalidated": () => void;
}
export interface StationEvents {
    "connect": (station: Station) => void;
    "close": (station: Station) => void;
    "connection error": (station: Station, error: Error) => void;
    "raw device property changed": (deviceSN: string, params: RawValues) => void;
    "property changed": (station: Station, name: string, value: PropertyValue, ready: boolean) => void;
    "raw property changed": (station: Station, type: number, value: string) => void;
    "command result": (station: Station, result: CommandResult) => void;
    "download start": (station: Station, channel: number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "download finish": (station: Station, channel: number) => void;
    "livestream start": (station: Station, channel: number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "livestream stop": (station: Station, channel: number) => void;
    "livestream error": (station: Station, channel: number, error: Error) => void;
    "rtsp livestream start": (station: Station, channel: number) => void;
    "rtsp livestream stop": (station: Station, channel: number) => void;
    "rtsp url": (station: Station, channel: number, value: string) => void;
    "guard mode": (station: Station, guardMode: number) => void;
    "current mode": (station: Station, currentMode: number) => void;
    "alarm event": (station: Station, alarmEvent: AlarmEvent) => void;
    "ready": (station: Station) => void;
    "runtime state": (station: Station, channel: number, batteryLevel: number, temperature: number) => void;
    "charging state": (station: Station, channel: number, chargeType: number, batteryLevel: number) => void;
    "wifi rssi": (station: Station, channel: number, rssi: number) => void;
    "floodlight manual switch": (station: Station, channel: number, enabled: boolean) => void;
    "alarm delay event": (station: Station, alarmDelayEvent: AlarmEvent, alarmDelay: number) => void;
    "alarm arm delay event": (station: Station, armDelay: number) => void;
    "alarm armed event": (station: Station) => void;
    "talkback started": (station: Station, channel: number, talkbackStream: TalkbackStream) => void;
    "talkback stopped": (station: Station, channel: number) => void;
    "talkback error": (station: Station, channel: number, error: Error) => void;
    "secondary command result": (station: Station, result: CommandResult) => void;
    "device shake alarm": (deviceSN: string, event: SmartSafeShakeAlarmEvent) => void;
    "device 911 alarm": (deviceSN: string, event: SmartSafeAlarm911Event) => void;
    "device jammed": (deviceSN: string) => void;
    "device low battery": (deviceSN: string) => void;
    "device wrong try-protect alarm": (deviceSN: string) => void;
    "device pin verified": (deviceSN: string, successfull: boolean) => void;
    "sd info ex": (station: Station, sdStatus: TFCardStatus, sdCapacity: number, sdCapacityAvailable: number) => void;
    "image download": (station: Station, file: string, image: Buffer) => void;
    "database query latest": (station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLatestInfo>) => void;
    "database query local": (station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLocal>) => void;
    "database count by date": (station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseCountByDate>) => void;
    "database delete": (station: Station, returnCode: DatabaseReturnCode, failedIds: Array<unknown>) => void;
    "sensor status": (station: Station, channel: number, status: number) => void;
    "garage door status": (station: Station, channel: number, doorId: number, status: number) => void;
    "storage info hb3": (station: Station, channel: number, storageInfo: StorageInfoBodyHB3) => void;
}
export interface DeviceEvents {
    "property changed": (device: Device, name: string, value: PropertyValue, ready: boolean) => void;
    "raw property changed": (device: Device, type: number, value: string) => void;
    "motion detected": (device: Device, state: boolean) => void;
    "person detected": (device: Device, state: boolean, person: string) => void;
    "pet detected": (device: Device, state: boolean) => void;
    "sound detected": (device: Device, state: boolean) => void;
    "crying detected": (device: Device, state: boolean) => void;
    "vehicle detected": (device: Device, state: boolean) => void;
    "dog detected": (device: Device, state: boolean) => void;
    "dog lick detected": (device: Device, state: boolean) => void;
    "dog poop detected": (device: Device, state: boolean) => void;
    "stranger person detected": (device: Device, state: boolean) => void;
    "rings": (device: Device, state: boolean) => void;
    "locked": (device: Device, state: boolean) => void;
    "open": (device: Device, state: boolean) => void;
    "ready": (device: Device) => void;
    "package delivered": (device: Device, state: boolean) => void;
    "package stranded": (device: Device, state: boolean) => void;
    "package taken": (device: Device, state: boolean) => void;
    "someone loitering": (device: Device, state: boolean) => void;
    "radar motion detected": (device: Device, state: boolean) => void;
    "911 alarm": (device: Device, state: boolean, detail: SmartSafeAlarm911Event) => void;
    "shake alarm": (device: Device, state: boolean, detail: SmartSafeShakeAlarmEvent) => void;
    "wrong try-protect alarm": (device: Device, state: boolean) => void;
    "long time not close": (device: Device, state: boolean) => void;
    "low battery": (device: Device, state: boolean) => void;
    "jammed": (device: Device, state: boolean) => void;
    "tampering": (device: Device, state: boolean) => void;
    "low temperature": (device: Device, state: boolean) => void;
    "high temperature": (device: Device, state: boolean) => void;
    "pin incorrect": (device: Device, state: boolean) => void;
    "lid stuck": (device: Device, state: boolean) => void;
    "battery fully charged": (device: Device, state: boolean) => void;
}
