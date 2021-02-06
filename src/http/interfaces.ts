import { Readable } from "stream";

import { StreamMetadata } from "../p2p/interfaces";
import { CommandResult } from "../p2p/models";
import { Camera, Device } from "./device";
import { FullDeviceResponse, HubResponse, Cipher } from "./models";
import { Station } from "./station";

export interface IParameter {
    param_type: number;
    param_value: any;
}

export interface ParameterArray {
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

export interface Hubs {
    [index: string]: HubResponse;
}

export interface FullDevices {
    [index: string]: FullDeviceResponse;
}

export interface Ciphers {
    [index: number]: Cipher;
}

export interface HTTPApiInterfaceEvents {
    "devices": (devices: FullDevices) => void;
    "hubs": (hubs: Hubs) => void;
    "not_connected": () => void;
}

export declare interface HTTPApiInterface {

    on<U extends keyof HTTPApiInterfaceEvents>(
        event: U, listener: HTTPApiInterfaceEvents[U]
    ): this;

    emit<U extends keyof HTTPApiInterfaceEvents>(
        event: U, ...args: Parameters<HTTPApiInterfaceEvents[U]>
    ): boolean;

}

export interface StationInterfaceEvents {
    "parameter": (station: Station, type: number, value: string) => void;
    "p2p_command": (station: Station, result: CommandResult) => void;
    "start_download": (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "finish_download": (station: Station, channel:number) => void;
    "start_livestream": (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "stop_livestream": (station: Station, channel:number) => void;
}

export declare interface StationInterface {

    on<U extends keyof StationInterfaceEvents>(
        event: U, listener: StationInterfaceEvents[U]
    ): this;

    emit<U extends keyof StationInterfaceEvents>(
        event: U, ...args: Parameters<StationInterfaceEvents[U]>
    ): boolean;

}

export interface DeviceInterfaceEvents {
    "parameter": (device: Device, type: number, value: string) => void;
}

export declare interface DeviceInterface {

    on<U extends keyof DeviceInterfaceEvents>(
        event: U, listener: DeviceInterfaceEvents[U]
    ): this;

    emit<U extends keyof DeviceInterfaceEvents>(
        event: U, ...args: Parameters<DeviceInterfaceEvents[U]>
    ): boolean;

}