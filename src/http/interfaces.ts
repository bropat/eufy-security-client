import { Readable } from "stream";

import { StreamMetadata } from "../p2p/interfaces";
import { CommandResult } from "../p2p/models";
import { Camera, Device } from "./device";
import { FullDeviceResponse, HubResponse, Cipher, Voice } from "./models";
import { Station } from "./station";

export interface ParameterValue {
    value: string;
    modified: number;
}

export interface ParameterArray {
    [index: number]: ParameterValue;
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

export interface HTTPApiEvents {
    "devices": (devices: FullDevices) => void;
    "hubs": (hubs: Hubs) => void;
    "connect": () => void;
    "close": () => void;
}

export interface StationEvents {
    "connect": (station: Station) => void;
    "close": (station: Station) => void;
    "device_parameter": (device_sn: string, params: ParameterArray) => void;
    "parameter": (station: Station, type: number, value: string, modified: number) => void;
    "p2p_command": (station: Station, result: CommandResult) => void;
    "start_download": (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "finish_download": (station: Station, channel:number) => void;
    "start_livestream": (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "stop_livestream": (station: Station, channel:number) => void;
}

export interface DeviceEvents {
    "parameter": (device: Device, type: number, value: string, modified: number) => void;
}