import { Readable } from "stream";

import { Device } from "./http/device";
import { HTTPApiPersistentData, PropertyValue } from "./http/interfaces";
import { Station } from "./http/station";
import { DeviceSmartLockMessage } from "./mqtt/model";
import { StreamMetadata } from "./p2p/interfaces";
import { CommandResult } from "./p2p/models";
import { AlarmEvent } from "./p2p/types";
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
    acceptInvitations?: boolean;
}

export interface EufySecurityPersistentData {
    country: string;
    login_hash: string;
    openudid: string;
    serial_number: string;
    cloud_token?: string;
    cloud_token_expiration?: number;
    push_credentials: Credentials | undefined;
    push_persistentIds: string[];
    version: string;
    httpApi?: HTTPApiPersistentData;
}

export interface EufySecurityEvents {
    "device added": (device: Device) => void;
    "device removed": (device: Device) => void;
    "device property changed": (device: Device, name: string, value: PropertyValue) => void;
    "device raw property changed": (device: Device, type: number, value: string) => void;
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
    "station rtsp livestream start": (station: Station, device: Device) => void;
    "station rtsp livestream stop": (station: Station, device: Device) => void;
    "station rtsp url": (station: Station, device: Device, value: string) => void;
    "station guard mode": (station: Station, guardMode: number) => void;
    "station current mode": (station: Station, currentMode: number) => void;
    "station property changed": (station: Station, name: string, value: PropertyValue) => void;
    "station raw property changed": (station: Station, type: number, value: string) => void;
    "station alarm event": (station: Station, alarmEvent: AlarmEvent) => void;
    "station alarm delay event": (station: Station, alarmDelayEvent: AlarmEvent, alarmDelay: number) => void;
    "station connect": (station: Station) => void;
    "station close": (station: Station) => void;
    "push connect": () => void;
    "push close": () => void;
    "push message": (message: PushMessage) => void;
    "connect": () => void;
    "close": () => void;
    "tfa request": () => void;
    "captcha request": (id: string, captcha: string) => void;
    "cloud livestream start": (station: Station, device: Device, url: string) => void;
    "cloud livestream stop": (station: Station, device: Device) => void;
    "mqtt connect": () => void;
    "mqtt close": () => void;
    "mqtt lock message": (message: DeviceSmartLockMessage) => void;
}