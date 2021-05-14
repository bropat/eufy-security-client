import { Readable } from "stream";
import { Device } from "./http/device";
import { PropertyValue } from "./http/interfaces";
import { Station } from "./http/station";
import { StreamMetadata } from "./p2p/interfaces";
import { CommandResult } from "./p2p/models";
import { Credentials, PushMessage } from "./push/models";

export interface EufySecurityConfig {
    username: string;
    password: string;
    country?: string;
    language?: string;
    trustedDeviceName?: string;
    persistentDir?: string;
    p2pConnectionSetup: number;
    pollingIntervalMinutes: number;
    eventDurationSeconds: number;
}

export interface EufySecurityPersistentData {
    login_hash: string;
    openudid: string;
    serial_number: string;
    api_base: string;
    cloud_token: string;
    cloud_token_expiration: number;
    push_credentials: Credentials | undefined;
    push_persistentIds: string[];
    version: string;
}

export interface EufySecurityEvents {
    "device added": (device: Device) => void;
    "device removed": (device: Device) => void;
    "device property changed": (device: Device, name: string, value: PropertyValue) => void;
    "device raw property changed": (device: Device, type: number, value: string, modified: number) => void;
    "device crying detected": (device: Device, state: boolean) => void;
    "device sound detected": (device: Device, state: boolean) => void;
    "device pet detected": (device: Device, state: boolean) => void;
    "device motion detected": (device: Device, state: boolean) => void;
    "device person detected": (device: Device, state: boolean, person: string) => void;
    "device rings": (device: Device, state: boolean) => void;
    "device locked": (device: Device, state: boolean) => void;
    "device open": (device: Device, state: boolean) => void;
    "station added": (station: Station) => void;
    "station removed": (station: Station) => void;
    "station livestream start": (station: Station, device: Device, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => void;
    "station livestream stop": (station: Station, device: Device) => void;
    "station download start": (station: Station, device: Device, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => void;
    "station download finish": (station: Station, device: Device) => void;
    "station command result": (station: Station, result: CommandResult) => void;
    "station rtsp url": (station: Station, device: Device, value: string, modified: number) => void;
    "station guard mode": (station: Station, guardMode: number, currentMode: number) => void;
    "station property changed": (station: Station, name: string, value: PropertyValue) => void;
    "station raw property changed": (station: Station, type: number, value: string, modified: number) => void;
    "push connect": () => void;
    "push close": () => void;
    "push message": (message: PushMessage) => void;
    "connect": () => void;
    "close": () => void;
    "tfa request": () => void;
    "cloud livestream start": (station: Station, device: Device, url: string) => void;
    "cloud livestream stop": (station: Station, device: Device) => void;
}