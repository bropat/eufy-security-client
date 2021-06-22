import { Readable } from "stream";

import { StreamMetadata } from "../p2p/interfaces";
import { CommandResult } from "../p2p/models";
import { Camera, Device } from "./device";
import { FullDeviceResponse, HubResponse, Cipher, Voice } from "./models";
import { Station } from "./station";
import { SupportedFeature } from "./types";

export interface PropertyValue {
    value: unknown;
    timestamp: number;
}

export interface PropertyValues {
    [index: string]: PropertyValue;
}

export interface RawValue {
    value: string;
    timestamp: number;
}

export interface RawValues {
    [index: number]: RawValue;
}

/*export interface StringValue {
    value: string;
    timestamp: number;
}

export interface BooleanValue {
    value: boolean;
    timestamp: number;
}

export interface NumberValue {
    value: number;
    timestamp: number;
}

export interface ParameterArray {
    [index: number]: StringValue;
}*/

export interface Devices {
    [index: string]: Device;
}

export interface Cameras {
    [index: string]: Camera;
}

export interface Stations {
    [index: string]: Station;
}

export interface Hubs {
    [index: string]: HubResponse;
}

export interface FullDevices {
    [index: string]: FullDeviceResponse;
}

export interface Ciphers {
    [index: number]: Cipher;
}

export interface Voices {
    [index: number]: Voice;
}

export interface ISupportedFeatures {
    [index: number]: Array<SupportedFeature>;
}

//TODO: Finish implementation

export type PropertyMetadataType =
	| "number"
	| "boolean"
	| "string";

export interface PropertyMetadataAny {
    key: number | string;
    name: string;
    type: PropertyMetadataType;
    default?: any;
    readable: boolean;
    writeable: boolean;
    description?: string;
    label?: string;
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
    default?: number;
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

export interface HTTPApiEvents {
    "devices": (devices: FullDevices) => void;
    "hubs": (hubs: Hubs) => void;
    "connect": () => void;
    "close": () => void;
}

export interface StationEvents {
    "connect": (station: Station) => void;
    "close": (station: Station) => void;
    "raw device property changed": (deviceSN: string, params: RawValues) => void;
    "property changed": (station: Station, name: string, value: PropertyValue) => void;
    "raw property changed": (station: Station, type: number, value: string, modified: number) => void;
    "command result": (station: Station, result: CommandResult) => void;
    "download start": (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "download finish": (station: Station, channel:number) => void;
    "livestream start": (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "livestream stop": (station: Station, channel:number) => void;
    "rtsp url": (station: Station, channel:number, value: string, modified: number) => void;
    "guard mode": (station: Station, guardMode: number, currentMode: number) => void;
    "alarm mode": (station: Station, alarm_type: number) => void;
}

export interface DeviceEvents {
    "property changed": (device: Device, name: string, value: PropertyValue) => void;
    "raw property changed": (device: Device, type: number, value: string, modified: number) => void;
    "motion detected": (device: Device, state: boolean) => void;
    "person detected": (device: Device, state: boolean, person: string) => void;
    "pet detected": (device: Device, state: boolean) => void;
    "sound detected": (device: Device, state: boolean) => void;
    "crying detected": (device: Device, state: boolean) => void;
    "rings": (device: Device, state: boolean) => void;
    "locked": (device: Device, state: boolean) => void;
    "open": (device: Device, state: boolean) => void;
}