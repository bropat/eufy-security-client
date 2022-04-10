import { Readable } from "stream";
import { Method } from "got";

import { StreamMetadata } from "../p2p/interfaces";
import { CommandResult } from "../p2p/models";
import { AlarmEvent, ChargingType } from "../p2p/types";
import { Camera, Device } from "./device";
import { Cipher, Voice, Invite, DeviceListResponse, StationListResponse, HouseListResponse } from "./models";
import { Station } from "./station";
import { CommandName, PropertyName } from "./types";

export type PropertyValue = number | boolean | string;

export interface PropertyValues {
    [index: string]: PropertyValue;
}

export interface RawValues {
    [index: number]: string;
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
    endpoint: string;
    data?: any;
}

export type PropertyMetadataType =
	| "number"
	| "boolean"
	| "string";

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
    }
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

export interface HTTPApiEvents {
    "devices": (devices: FullDevices) => void;
    "hubs": (hubs: Hubs) => void;
    "houses": (houses: Houses) => void;
    "connect": () => void;
    "close": () => void;
    "tfa request": () => void;
    "captcha request": (id: string, captcha: string) => void;
    "auth token invalidated": () => void;
}

export interface StationEvents {
    "connect": (station: Station) => void;
    "close": (station: Station) => void;
    "raw device property changed": (deviceSN: string, params: RawValues) => void;
    "property changed": (station: Station, name: string, value: PropertyValue) => void;
    "raw property changed": (station: Station, type: number, value: string) => void;
    "command result": (station: Station, result: CommandResult) => void;
    "download start": (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "download finish": (station: Station, channel:number) => void;
    "livestream start": (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "livestream stop": (station: Station, channel:number) => void;
    "rtsp livestream start": (station: Station, channel:number) => void;
    "rtsp livestream stop": (station: Station, channel:number) => void;
    "rtsp url": (station: Station, channel:number, value: string) => void;
    "guard mode": (station: Station, guardMode: number) => void;
    "current mode": (station: Station, currentMode: number) => void;
    "alarm event": (station: Station, alarmEvent: AlarmEvent) => void;
    "ready": (station: Station) => void;
    "runtime state": (station: Station, channel: number, batteryLevel: number, temperature: number) => void;
    "charging state": (station: Station, channel: number, chargeType: ChargingType, batteryLevel: number) => void;
    "wifi rssi": (station: Station, channel: number, rssi: number) => void;
    "floodlight manual switch": (station: Station, channel: number, enabled: boolean) => void;
}

export interface DeviceEvents {
    "property changed": (device: Device, name: string, value: PropertyValue) => void;
    "raw property changed": (device: Device, type: number, value: string) => void;
    "motion detected": (device: Device, state: boolean) => void;
    "person detected": (device: Device, state: boolean, person: string) => void;
    "pet detected": (device: Device, state: boolean) => void;
    "sound detected": (device: Device, state: boolean) => void;
    "crying detected": (device: Device, state: boolean) => void;
    "rings": (device: Device, state: boolean) => void;
    "locked": (device: Device, state: boolean) => void;
    "open": (device: Device, state: boolean) => void;
    "ready": (device: Device) => void;
}