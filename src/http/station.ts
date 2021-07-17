import { TypedEmitter } from "tiny-typed-emitter";
import { Readable } from "stream";
import { Logger } from "ts-log";

import { HTTPApi } from "./api";
import { AlarmMode, AlarmTone, NotificationSwitchMode, DeviceType, FloodlightMotionTriggeredDistance, GuardMode, NotificationType, ParamType, PowerSource, PropertyName, StationProperties, TimeFormat, CommandName, StationCommands } from "./types";
import { DskKeyResponse, HubResponse, ResultResponse } from "./models"
import { ParameterHelper } from "./parameter";
import { IndexedProperty, PropertyMetadataAny, PropertyValue, PropertyValues, RawValue, RawValues, StationEvents } from "./interfaces";
import { isGreaterEqualMinVersion, isNotificationSwitchMode, switchNotificationMode } from "./utils";
import { DeviceSerial, StreamMetadata } from "./../p2p/interfaces";
import { P2PClientProtocol } from "../p2p/session";
import { CommandType, ErrorCode, ESLInnerCommand, P2PConnectionType, PanTiltDirection, VideoCodec, WatermarkSetting1, WatermarkSetting2, WatermarkSetting3, WatermarkSetting4 } from "../p2p/types";
import { Address, CmdCameraInfoResponse, CommandResult, ESLStationP2PThroughData } from "../p2p/models";
import { Device, Lock } from "./device";
import { convertTimestampMs } from "../push/utils";
import { encodeLockPayload, encryptLockAESData, generateLockAESKey, getLockVectorBytes, isPrivateIp } from "../p2p/utils";
import { InvalidCommandValueError, InvalidPropertyValueError, NotConnectedError, NotSupportedError, WrongStationError } from "../error";
import { PushMessage } from "../push/models";
import { CusPushEvent } from "../push/types";
import { InvalidPropertyError, LivestreamAlreadyRunningError, LivestreamNotRunningError, PropertyNotSupportedError } from "./error";
import { validValue } from "../utils";

export class Station extends TypedEmitter<StationEvents> {

    private api: HTTPApi;
    private rawStation: HubResponse;
    private log: Logger;

    private dskKey = "";
    private dskExpiration: Date | null = null;

    private p2pSession: P2PClientProtocol | null = null;
    private properties: PropertyValues = {};
    private rawProperties: RawValues = {};
    private ready = false;

    private currentDelay = 0;
    private reconnectTimeout?: NodeJS.Timeout;

    private p2pConnectionType = P2PConnectionType.PREFER_LOCAL;
    private quickStreamStart = false;

    public static readonly CHANNEL:number = 255;
    public static readonly CHANNEL_INDOOR:number = 1000;

    constructor(api: HTTPApi, station: HubResponse) {
        super();
        this.api = api;
        this.rawStation = station;
        this.log = api.getLog();
        this.update(this.rawStation);
        this.ready = true;
    }

    public getStateID(state: string, level = 2): string {
        switch(level) {
            case 0:
                return `${this.getSerial()}`
            case 1:
                return `${this.getSerial()}.${this.getStateChannel()}`
            default:
                if (state)
                    return `${this.getSerial()}.${this.getStateChannel()}.${state}`
                throw new Error("No state value passed.");
        }
    }

    public getStateChannel(): string {
        return "station";
    }

    public getRawStation(): HubResponse {
        return this.rawStation;
    }

    public update(station: HubResponse): void {
        this.rawStation = station;
        const metadata = this.getPropertiesMetadata();
        for(const property of Object.values(metadata)) {
            if (this.rawStation[property.key] !== undefined && typeof property.key === "string") {
                let timestamp = 0;
                switch(property.key) {
                    case "main_sw_version":
                        if (this.rawStation.main_sw_time !== undefined) {
                            timestamp = convertTimestampMs(this.rawStation.main_sw_time);
                            break;
                        }
                    case "sec_sw_version":
                        if (this.rawStation.sec_sw_time !== undefined) {
                            timestamp = convertTimestampMs(this.rawStation.sec_sw_time);
                            break;
                        }
                    default:
                        if (this.rawStation.update_time !== undefined) {
                            timestamp = convertTimestampMs(this.rawStation.update_time);
                        }
                        break;
                }
                this.updateProperty(property.name, { value: this.rawStation[property.key], timestamp: timestamp });
            }
        }
        this.rawStation.params.forEach(param => {
            this.updateRawProperty(param.param_type, { value: param.param_value, timestamp: convertTimestampMs(param.update_time) });
        });
        this.log.debug("Normalized Properties", { stationSN: this.getSerial(), properties: this.properties });
    }

    private updateProperty(name: string, value: PropertyValue): boolean {
        if (
            (this.properties[name] !== undefined
                && (
                    this.properties[name].value !== value.value
                    && this.properties[name].timestamp <= value.timestamp
                )
            )
            || this.properties[name] === undefined
        ) {

            this.properties[name] = value;
            if (this.ready)
                this.emit("property changed", this, name, value);
            return true;
        }
        return false;
    }

    public updateRawProperties(values: RawValues): void {
        Object.keys(values).forEach(paramtype => {
            const param_type = Number.parseInt(paramtype);
            this.updateRawProperty(param_type, values[param_type]);
        });
    }

    public updateRawProperty(type: number, value: RawValue): boolean {
        const parsedValue = ParameterHelper.readValue(type, value.value);
        if (
            (this.rawProperties[type] !== undefined
                && (
                    this.rawProperties[type].value !== parsedValue
                    && this.rawProperties[type].timestamp <= value.timestamp
                )
            )
            || this.rawProperties[type] === undefined
        ) {

            this.rawProperties[type] = {
                value: parsedValue,
                timestamp: value.timestamp
            };
            if (this.ready) {
                this.emit("raw property changed", this, type, this.rawProperties[type].value, this.rawProperties[type].timestamp);

                try {
                    if (type === ParamType.GUARD_MODE) {
                        this.emit("guard mode", this, Number.parseInt(parsedValue));
                    } else if (type === CommandType.CMD_GET_ALARM_MODE) {
                        this.emit("current mode", this, Number.parseInt(parsedValue));
                    }
                } catch (error) {
                    this.log.error("Number conversion error", error);
                }
            }

            const metadata = this.getPropertiesMetadata();

            for(const property of Object.values(metadata)) {
                if (property.key === type) {
                    try {
                        this.updateProperty(property.name, this.convertRawPropertyValue(property, this.rawProperties[type]));
                    } catch (error) {
                        if (error instanceof PropertyNotSupportedError) {
                            this.log.debug("Property not supported error", error);
                        } else {
                            this.log.error("Property error", error);
                        }
                    }
                }
            }
            return true;
        }
        return false;
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: RawValue): PropertyValue {
        try {
            switch(property.key) {
                case CommandType.CMD_GET_HUB_LAN_IP:
                    return { value: value !== undefined ? (isPrivateIp(value.value) ? value.value : ""): "", timestamp: value !== undefined ? value.timestamp : 0 };
                case CommandType.CMD_SET_ARMING:
                    return { value: Number.parseInt(value !== undefined ? value.value : "-1"), timestamp: value !== undefined ? value.timestamp : 0 };
                case CommandType.CMD_GET_ALARM_MODE:
                {
                    const guard_mode = this.getGuardMode();
                    return { value: Number.parseInt(value !== undefined ? value.value : guard_mode !== undefined && guard_mode.value !== GuardMode.SCHEDULE && guard_mode.value !== GuardMode.GEO ? guard_mode.value as string : GuardMode.UNKNOWN.toString()), timestamp: value !== undefined ? value.timestamp : 0 };
                }
                case CommandType.CMD_HUB_NOTIFY_MODE:
                {
                    switch(property.name) {
                        case PropertyName.StationNotificationSwitchModeSchedule:
                            if (!isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
                                return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value !== undefined ? value.timestamp : 0 };
                            }
                            return { value: value !== undefined ? isNotificationSwitchMode(Number.parseInt(value.value), NotificationSwitchMode.SCHEDULE) : false, timestamp: value !== undefined ? value.timestamp : 0 };
                        case PropertyName.StationNotificationSwitchModeGeofence:
                            if (!isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
                                throw new PropertyNotSupportedError(`Property ${property.name} not supported for station ${this.getSerial()} with software version ${this.getSoftwareVersion()}`);
                            }
                            return { value: value !== undefined ? isNotificationSwitchMode(Number.parseInt(value.value), NotificationSwitchMode.GEOFENCE) : false, timestamp: value !== undefined ? value.timestamp : 0 };
                        case PropertyName.StationNotificationSwitchModeApp:
                            if (!isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
                                throw new PropertyNotSupportedError(`Property ${property.name} not supported for station ${this.getSerial()} with software version ${this.getSoftwareVersion()}`);
                            }
                            return { value: value !== undefined ? isNotificationSwitchMode(Number.parseInt(value.value), NotificationSwitchMode.APP) : false, timestamp: value !== undefined ? value.timestamp : 0 };
                        case PropertyName.StationNotificationSwitchModeKeypad:
                            if (!isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
                                throw new PropertyNotSupportedError(`Property ${property.name} not supported for station ${this.getSerial()} with software version ${this.getSoftwareVersion()}`);
                            }
                            return { value: value !== undefined ? isNotificationSwitchMode(Number.parseInt(value.value), NotificationSwitchMode.KEYPAD) : false, timestamp: value !== undefined ? value.timestamp : 0 };
                    }
                }
                case CommandType.CMD_HUB_NOTIFY_ALARM:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value !== undefined ? value.timestamp : 0 };
                case CommandType.CMD_HUB_ALARM_TONE:
                    try {
                        return { value: value !== undefined ? Number.parseInt(value.value) : 1, timestamp: value !== undefined ? value.timestamp : 0 };
                    } catch (error) {
                        this.log.error("Convert CMD_HUB_ALARM_TONE Error:", { property: property, value: value, error: error });
                        return { value: 1, timestamp: 0 };
                    }
                case CommandType.CMD_SET_HUB_SPK_VOLUME:
                    try {
                        return { value: value !== undefined ? Number.parseInt(value.value) : 26, timestamp: value !== undefined ? value.timestamp : 0 };
                    } catch (error) {
                        this.log.error("Convert CMD_SET_HUB_SPK_VOLUME Error:", { property: property, value: value, error: error });
                        return { value: 26, timestamp: 0 };
                    }
                case CommandType.CMD_SET_PROMPT_VOLUME:
                    try {
                        return { value: value !== undefined ? Number.parseInt(value.value) : 26, timestamp: value !== undefined ? value.timestamp : 0 };
                    } catch (error) {
                        this.log.error("Convert CMD_SET_PROMPT_VOLUME Error:", { property: property, value: value, error: error });
                        return { value: 26, timestamp: 0 };
                    }
                case CommandType.CMD_SET_HUB_OSD:
                    try {
                        return { value: value !== undefined ? Number.parseInt(value.value) : 0, timestamp: value !== undefined ? value.timestamp : 0 };
                    } catch (error) {
                        this.log.error("Convert CMD_SET_HUB_OSD Error:", { property: property, value: value, error: error });
                        return { value: 0, timestamp: 0 };
                    }
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public getPropertyMetadata(name: string): PropertyMetadataAny {
        const property = this.getPropertiesMetadata()[name];
        if (property !== undefined)
            return property;
        throw new InvalidPropertyError(`Property ${name} invalid`);
    }

    public getPropertyValue(name: string): PropertyValue {
        if (name === PropertyName.StationCurrentMode) {
            const guard_mode = this.properties[PropertyName.StationGuardMode];
            return this.properties[PropertyName.StationCurrentMode] !== undefined ? this.properties[PropertyName.StationCurrentMode] : guard_mode !== undefined && guard_mode.value !== GuardMode.SCHEDULE && guard_mode.value !== GuardMode.GEO ? guard_mode : { value: GuardMode.UNKNOWN, timestamp: 0 };
        }
        return this.properties[name];
    }

    public getRawProperty(type: number): RawValue {
        return this.rawProperties[type];
    }

    public getRawProperties(): RawValues {
        return this.rawProperties;
    }

    public getProperties(): PropertyValues {
        return this.properties;
    }

    public getPropertiesMetadata(): IndexedProperty {
        const metadata = StationProperties[this.getDeviceType()];
        if (metadata === undefined)
            return StationProperties[DeviceType.STATION];
        return metadata;
    }

    public hasProperty(name: string): boolean {
        return this.getPropertiesMetadata()[name] !== undefined;
    }

    public getCommands(): Array<CommandName> {
        const commands = StationCommands[this.getDeviceType()];
        if (commands === undefined)
            return [];
        return commands;
    }

    public hasCommand(name: CommandName): boolean {
        return this.getCommands().includes(name);
    }

    public isStation(): boolean {
        return this.rawStation.device_type == DeviceType.STATION;
    }

    public isDeviceStation(): boolean {
        return this.rawStation.device_type != DeviceType.STATION;
    }

    public getDeviceType(): number {
        return this.rawStation.device_type;
    }

    public getHardwareVersion(): string {
        return this.rawStation.main_hw_version;
    }

    public getMACAddress(): string {
        return this.rawStation.wifi_mac;
    }

    public getModel(): string {
        return this.rawStation.station_model;
    }

    public getName(): string {
        return this.rawStation.station_name;
    }

    public getSerial(): string {
        return this.rawStation.station_sn;
    }

    public getSoftwareVersion(): string {
        return this.rawStation.main_sw_version;
    }

    public getIPAddress(): string {
        return this.rawStation.ip_addr;
    }

    public getLANIPAddress(): PropertyValue {
        return this.getPropertyValue(PropertyName.StationLANIpAddress);
    }

    public getGuardMode(): PropertyValue {
        return this.getPropertyValue(PropertyName.StationGuardMode);
    }

    public getCurrentMode(): PropertyValue {
        const guard_mode = this.getGuardMode();
        return this.getPropertyValue(PropertyName.StationCurrentMode) !== undefined ? this.getPropertyValue(PropertyName.StationCurrentMode) : guard_mode !== undefined && guard_mode.value !== GuardMode.SCHEDULE && guard_mode.value !== GuardMode.GEO ? guard_mode : { value: GuardMode.UNKNOWN, timestamp: 0 };
    }

    public processPushNotification(message: PushMessage): void {
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.MODE_SWITCH && message.station_sn === this.getSerial()) {
                this.log.info("Received push notification for changing guard mode", { guard_mode: message.station_guard_mode, current_mode: message.station_current_mode, stationSN: message.station_sn });
                try {
                    if (message.station_guard_mode !== undefined)
                        this.updateRawProperty(ParamType.GUARD_MODE, { value: message.station_guard_mode.toString(), timestamp: convertTimestampMs(message.event_time) });
                    if (message.station_current_mode !== undefined)
                        this.updateRawProperty(CommandType.CMD_GET_ALARM_MODE, { value: message.station_current_mode.toString(), timestamp: convertTimestampMs(message.event_time) });
                } catch (error) {
                    this.log.debug(`Station ${message.station_sn} MODE_SWITCH event (${message.event_type}) - Error:`, error);
                }
            } else if (message.event_type === CusPushEvent.ALARM && message.station_sn === this.getSerial()) {
                this.log.info("Received push notification for alarm event", { stationSN: message.station_sn, alarmType: message.alarm_type });
                if (message.alarm_type !== undefined)
                    this.emit("alarm event", this, message.alarm_type);
            }
        }
    }

    private async getDSKKeys(): Promise<void> {
        try {
            const response = await this.api.request("post", "app/equipment/get_dsk_keys", {
                station_sns: [this.getSerial()]
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug(`Station ${this.getSerial()} - Response:`, response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    const dataresult: DskKeyResponse = result.data;
                    dataresult.dsk_keys.forEach(key => {
                        if (key.station_sn == this.getSerial()) {
                            this.dskKey = key.dsk_key;
                            this.dskExpiration = new Date(key.expiration * 1000);
                            this.log.debug(`${this.constructor.name}.getDSKKeys(): dskKey: ${this.dskKey} dskExpiration: ${this.dskExpiration}`);
                        }
                    });
                } else {
                    this.log.error(`Station ${this.getSerial()} - Response code not ok`, { code: result.code, msg: result.msg });
                }
            } else {
                this.log.error(`Station ${this.getSerial()} - Status return code not 200`, { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error(`Station ${this.getSerial()} - Generic Error:`, error);
        }
    }

    public isConnected(): boolean {
        if (this.p2pSession)
            return this.p2pSession.isConnected();
        return false;
    }

    public close(): void {
        this.log.info(`Disconnect from station ${this.getSerial()}`);
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
        if (this.p2pSession) {
            this.p2pSession.close();
            this.p2pSession = null;
        }
    }

    public async connect(): Promise<void> {
        if (this.dskKey == "" || (this.dskExpiration && (new Date()).getTime() >= this.dskExpiration.getTime())) {
            this.log.debug(`Station ${this.getSerial()} DSK keys not present or expired, get/renew it`, { dskExpiration: this.dskExpiration });
            await this.getDSKKeys();
        }

        this.log.debug(`Connecting to station ${this.getSerial()}...`, { p2p_did: this.rawStation.p2p_did, dskKey: this.dskKey, p2pConnectionType: P2PConnectionType[this.p2pConnectionType], quickStreamStart: this.quickStreamStart });

        if (this.p2pSession) {
            this.p2pSession.removeAllListeners();
            this.p2pSession.close();
            this.p2pSession = null;
        }

        const deviceSNs: DeviceSerial = {};
        if (this.rawStation.devices)
            for (const device of this.rawStation.devices) {
                deviceSNs[device.device_channel] = {
                    sn: device.device_sn,
                    admin_user_id: this.rawStation.member.admin_user_id
                };
            }

        this.p2pSession = new P2PClientProtocol(this.rawStation.p2p_did, this.dskKey, this.getSerial(), deviceSNs, this.log);
        this.p2pSession.setConnectionType(this.p2pConnectionType);
        this.p2pSession.setQuickStreamStart(this.quickStreamStart);
        this.p2pSession.on("connect", (address: Address) => this.onConnect(address));
        this.p2pSession.on("close", () => this.onDisconnect());
        this.p2pSession.on("command", (result: CommandResult) => this.onCommandResponse(result));
        this.p2pSession.on("alarm mode", (mode: AlarmMode) => this.onAlarmMode(mode));
        this.p2pSession.on("camera info", (cameraInfo: CmdCameraInfoResponse) => this.onCameraInfo(cameraInfo));
        this.p2pSession.on("download started", (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => this.onStartDownload(channel, metadata, videoStream, audioStream));
        this.p2pSession.on("download finished", (channel: number) => this.onFinishDownload(channel));
        this.p2pSession.on("livestream started", (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => this.onStartLivestream(channel, metadata, videoStream, audioStream));
        this.p2pSession.on("livestream stopped", (channel: number) => this.onStopLivestream(channel));
        this.p2pSession.on("wifi rssi", (channel: number, rssi: number) => this.onWifiRssiChanged(channel, rssi));
        this.p2pSession.on("rtsp url", (channel: number, rtspUrl: string) => this.onRTSPUrl(channel, rtspUrl));
        this.p2pSession.on("esl parameter", (channel: number, param: number, value: string) => this.onESLParameter(channel, param, value));

        this.p2pSession.connect();
    }

    private onFinishDownload(channel: number): void {
        this.emit("download finish", this, channel);
    }

    private onStartDownload(channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable): void {
        this.emit("download start", this, channel, metadata, videoStream, audioStream);
    }

    private onStopLivestream(channel: number): void {
        this.emit("livestream stop", this, channel);
    }

    private onStartLivestream(channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable): void {
        this.emit("livestream start", this, channel, metadata, videoStream, audioStream);
    }

    private onWifiRssiChanged(channel: number, rssi: number): void {
        //TODO: convert to updateRawProperty?
        this.emit("raw property changed", this, CommandType.CMD_WIFI_CONFIG, rssi.toString(), +new Date);
    }

    private onRTSPUrl(channel: number, rtspUrl: string): void {
        this.emit("rtsp url", this, channel, rtspUrl, +new Date);
    }

    private onESLParameter(channel: number, param: number, value: string): void {
        const params: RawValues = {};
        params[param] = {
            value: ParameterHelper.readValue(param, value),
            timestamp: +new Date
        };
        this.emit("raw device property changed", this._getDeviceSerial(channel), params);
    }

    public async setGuardMode(mode: GuardMode): Promise<void> {
        if (!this.hasProperty(PropertyName.StationGuardMode)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(PropertyName.StationGuardMode);
        if (property !== undefined) {
            validValue(property, mode);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            this.log.debug(`P2P connection to station ${this.getSerial()} not present, establish it`);
            await this.connect();
        }
        if (this.p2pSession) {
            if (this.p2pSession.isConnected()) {
                this.log.debug(`P2P connection to station ${this.getSerial()} present, send command mode: ${mode}`);

                if (mode === GuardMode.OFF && (!Device.isKeyPad(this.getDeviceType()) || (!isGreaterEqualMinVersion("2.0.8.4", this.getSoftwareVersion()) && Device.isKeyPad(this.getDeviceType()))))
                    throw new InvalidPropertyValueError(`Value "${mode}" isn't a valid value for property "${PropertyName.StationGuardMode}"`);

                if ((isGreaterEqualMinVersion("2.0.7.9", this.getSoftwareVersion()) && !Device.isIntegratedDeviceBySn(this.getSerial())) || Device.isSoloCameraBySn(this.getSerial())) {
                    this.log.debug(`Using CMD_SET_PAYLOAD for station ${this.getSerial()}`, { main_sw_version: this.getSoftwareVersion() });
                    await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_ARMING,
                        "mValue3": 0,
                        "payload": {
                            "mode_type": mode,
                            "user_name": this.rawStation.member.nick_name
                        }
                    }), Station.CHANNEL);
                } else {
                    this.log.debug(`Using CMD_SET_ARMING for station ${this.getSerial()}`);
                    await this.p2pSession.sendCommandWithInt(CommandType.CMD_SET_ARMING, mode, this.rawStation.member.admin_user_id, Station.CHANNEL);
                }
            }
        }
    }

    public async getCameraInfo(): Promise<void> {
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            this.log.debug(`P2P connection to station ${this.getSerial()} not present, establish it`);
            await this.connect();
        }
        if (this.p2pSession) {
            if (this.p2pSession.isConnected()) {
                this.log.debug(`P2P connection to station ${this.getSerial()} present, get device infos`);
                await this.p2pSession.sendCommandWithInt(CommandType.CMD_CAMERA_INFO, 255, "", Station.CHANNEL);
            }
        }
    }

    public async getStorageInfo(): Promise<void> {
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            this.log.debug(`P2P connection to station ${this.getSerial()} not present, establish it`);
            await this.connect();
        }
        if (this.p2pSession) {
            if (this.p2pSession.isConnected()) {
                this.log.debug(`P2P connection to station ${this.getSerial()} present, get storage info`);
                //TODO: Verify channel! Should be 255...
                await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SDINFO_EX, 0, 0, this.rawStation.member.admin_user_id);
            }
        }
    }

    private async onAlarmMode(mode: AlarmMode): Promise<void> {
        this.log.info(`Alarm mode for station ${this.getSerial()} changed to: ${AlarmMode[mode]}`);
        this.updateRawProperty(CommandType.CMD_GET_ALARM_MODE, {
            value: mode.toString(),
            timestamp: +new Date
        });

        // Trigger refresh Guard Mode
        await this.getCameraInfo();
    }

    private _getDeviceSerial(channel: number): string {
        if (this.rawStation.devices)
            for (const device of this.rawStation.devices) {
                if (device.device_channel === channel)
                    return device.device_sn;
            }
        return "";
    }

    private onCameraInfo(cameraInfo: CmdCameraInfoResponse): void {
        this.log.debug("Got camera infos", { station: this.getSerial(), cameraInfo: cameraInfo });
        const devices: { [index: string]: RawValues; } = {};
        const timestamp = +new Date;
        cameraInfo.params.forEach(param => {
            if (param.dev_type === Station.CHANNEL || param.dev_type === Station.CHANNEL_INDOOR) {
                if (this.updateRawProperty(param.param_type, { value: param.param_value, timestamp: timestamp })) {
                    if (param.param_type === CommandType.CMD_GET_ALARM_MODE) {
                        if (this.getDeviceType() !== DeviceType.STATION)
                            // Trigger refresh Guard Mode
                            this.api.updateDeviceInfo();
                    }
                }
            } else {
                const device_sn = this._getDeviceSerial(param.dev_type);
                if (device_sn !== "") {
                    if (!devices[device_sn]) {
                        devices[device_sn] = {};
                    }

                    devices[device_sn][param.param_type] = {
                        value: ParameterHelper.readValue(param.param_type, param.param_value),
                        timestamp: timestamp
                    };
                }
            }
        });
        Object.keys(devices).forEach(device => {
            this.emit("raw device property changed", device, devices[device]);
        });
    }

    private onCommandResponse(result: CommandResult): void {
        this.log.debug("Got p2p command response", { station: this.getSerial(), commandType: result.command_type, channel: result.channel, returnCodeName: ErrorCode[result.return_code], returnCode: result.return_code });
        this.emit("command result", this, result);
    }

    private onConnect(address: Address): void {
        this.resetCurrentDelay();
        this.log.info(`Connected to station ${this.getSerial()} on host ${address.host} and port ${address.port}`);
        this.emit("connect", this);
    }

    private onDisconnect(): void {
        this.log.info(`Disconnected from station ${this.getSerial()}`);
        this.emit("close", this);
        if (this.p2pSession)
            this.scheduleReconnect();
    }

    private getCurrentDelay(): number {
        const delay = this.currentDelay == 0 ? 5000 : this.currentDelay;

        if (this.currentDelay < 60000)
            this.currentDelay += 10000;

        if (this.currentDelay >= 60000 && this.currentDelay < 600000)
            this.currentDelay += 60000;

        return delay;
    }

    private resetCurrentDelay(): void {
        this.currentDelay = 0;
    }

    private scheduleReconnect(): void {
        const delay = this.getCurrentDelay();
        this.log.debug("Schedule reconnect...", { delay: delay });
        if (!this.reconnectTimeout)
            this.reconnectTimeout = setTimeout(async () => {
                this.reconnectTimeout = undefined;
                this.connect();
            }, delay);
    }

    public async rebootHUB(): Promise<void> {
        if (!this.hasCommand(CommandName.StationReboot)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }
        this.log.debug(`P2P connection to station ${this.getSerial()} present, reboot requested`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_HUB_REBOOT, 0, this.rawStation.member.admin_user_id, Station.CHANNEL);
    }

    public async setStatusLed(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceStatusLed)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isCamera2Product()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_DEV_LED_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_LIVEVIEW_LED_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        } else if (device.isIndoorCamera() || device.isFloodLight()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_LED_SWITCH,
                "data":{
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": value === true ? 1 : 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "mediaAccountInfo":{
                        "deviceChannel": device.getChannel(),
                        "device_sn": device.getSerial(),
                        "device_type": -1,
                        "mDeviceName": device.getName(),
                        "mDidStr": this.rawStation.p2p_did,
                        "mHubSn": this.getSerial(),
                        "mInitStr": this.rawStation.app_conn,
                        "mReceiveVersion": "",
                        "mTimeInfo": "",
                        "mVersionName": ""
                    },
                    "transaction": `${new Date().getTime()}`
                }
            }), device.getChannel());
        } else if (device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_LED_SWITCH,
                "data":{
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "url": "",
                    "value": value === true ? 1 : 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "mediaAccountInfo":{
                        "deviceChannel": device.getChannel(),
                        "device_sn": device.getSerial(),
                        "device_type": -1,
                        "mDeviceName": device.getName(),
                        "mDidStr": this.rawStation.p2p_did,
                        "mHubSn": this.getSerial(),
                        "mInitStr": this.rawStation.app_conn,
                        "mReceiveVersion": "",
                        "mTimeInfo": "",
                        "mVersionName": ""
                    },
                    "transaction": `${new Date().getTime()}`,
                }
            }), device.getChannel());
        } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE,
                "mValue3": 0,
                "payload": {
                    "light_enable": value === true ? 1 : 0
                }
            }), device.getChannel());
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": ParamType.COMMAND_LED_NIGHT_OPEN,
                "data":{
                    "status": value === true ? 1 : 0
                }
            }), device.getChannel());
        }
    }

    public async setAutoNightVision(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceAutoNightvision)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`${this.constructor.name}.setAutoNightVision(): P2P connection to station ${this.getSerial()} present, set value: ${value}.`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_IRCUT_SWITCH, value === true ? 1 : 0, device.getChannel(), "", "", device.getChannel());
    }

    public async setMotionDetection(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceMotionDetection)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isIndoorCamera() || device.isFloodLight()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE,
                "data":{
                    "enable": 0,
                    "index": 0,
                    "status": value === true ? 1 : 0,
                    "type": 0,
                    "value": 0,
                    "voiceID": 0,
                    "zonecount": 0
                }
            }), device.getChannel());
        } else if (device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE,
                "data":{
                    "enable": 0,
                    "index": 0,
                    "status": value === true ? 1 : 0,
                    "type": 0,
                    "url": "",
                    "value": 0,
                    "voiceID": 0,
                    "zonecount": 0
                }
            }), device.getChannel());
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": ParamType.COMMAND_MOTION_DETECTION_PACKAGE,
                "data":{
                    "enable": value === true ? 1 : 0,
                }
            }), device.getChannel());
        } else {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_PIR_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setSoundDetection(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceSoundDetection)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
            "commandType": CommandType.CMD_INDOOR_DET_SET_SOUND_DETECT_ENABLE,
            "data":{
                "enable": 0,
                "index": 0,
                "status": value === true ? 1 : 0,
                "type": 0,
                "value": 0,
                "voiceID": 0,
                "zonecount": 0
            }
        }), device.getChannel());
    }

    public async setSoundDetectionType(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceSoundDetectionType)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceSoundDetectionType);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
            "commandType": CommandType.CMD_INDOOR_DET_SET_SOUND_DETECT_TYPE,
            "data":{
                "enable": 0,
                "index": 0,
                "status": 0,
                "type": value,
                "value": 0,
                "voiceID": 0,
                "zonecount": 0
            }
        }), device.getChannel());
    }

    public async setSoundDetectionSensivity(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceSoundDetectionSensivity)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceSoundDetectionSensivity);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
            "commandType": CommandType.CMD_INDOOR_DET_SET_SOUND_SENSITIVITY_IDX,
            "data":{
                "enable": 0,
                "index": value,
                "status": 0,
                "type": 0,
                "value": 0,
                "voiceID": 0,
                "zonecount": 0
            }
        }), device.getChannel());
    }

    public async setPetDetection(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DevicePetDetection)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
            "commandType": CommandType.CMD_INDOOR_DET_SET_PET_ENABLE,
            "data":{
                "enable": 0,
                "index": 0,
                "status": value === true ? 1 : 0,
                "type": 0,
                "value": 0,
                "voiceID": 0,
                "zonecount": 0
            }
        }), device.getChannel());
    }

    public async panAndTilt(device: Device, direction: PanTiltDirection, command = 1): Promise<void> {
        //TODO: A Floodlight model seems to support this feature
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.DevicePanAndTilt)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!(direction in PanTiltDirection)) {
            throw new InvalidCommandValueError(`Value "${direction}" isn't a valid value for command "panAndTilt"`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set command: ${command} direction: ${PanTiltDirection[direction]}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
            "commandType": CommandType.CMD_INDOOR_ROTATE,
            "data":{
                "cmd_type": command,
                "rotate_type": direction,
            }
        }), device.getChannel());
    }

    public async switchLight(device: Device, value: boolean): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLight)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setMotionDetectionSensivity(device: Device, sensitivity: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceMotionDetectionSensivity)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceMotionDetectionSensivity);
        if (property !== undefined) {
            validValue(property, sensitivity);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set sensitivity: ${sensitivity}`);
        if (device.isFloodLight() || device.isIndoorCamera() || device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_SENSITIVITY_IDX,
                "data":{
                    "enable":0,
                    "index": sensitivity,
                    "status":0,
                    "type":0,
                    "value":0,
                    "voiceID":0,
                    "zonecount":0
                }
            }), device.getChannel());
        } else if (device.isBatteryDoorbell2() || device.isBatteryDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_MOTION_SENSITIVITY,
                "payload": {
                    "channel": device.getChannel(),
                    "sensitivity": sensitivity,
                }
            }), device.getChannel());
        } else if (device.isCamera2Product()) {
            let convertedValue;
            switch(sensitivity) {
                case 1:
                    convertedValue = 192;
                    break;
                case 2:
                    convertedValue = 118;
                    break;
                case 3:
                    convertedValue = 72;
                    break;
                case 4:
                    convertedValue = 46;
                    break;
                case 5:
                    convertedValue = 30;
                    break;
                case 6:
                    convertedValue = 20;
                    break;
                case 7:
                    convertedValue = 14;
                    break;
                default:
                    convertedValue = 46;
                    break;
            }
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_PIRSENSITIVITY, convertedValue, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setMotionDetectionType(device: Device, type: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceMotionDetectionType)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceMotionDetectionType);
        if (property !== undefined) {
            validValue(property, type);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set type: ${type}`);
        if (device.isFloodLight() || device.isIndoorCamera() || device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_TYPE,
                "data":{
                    "enable":0,
                    "index": 0,
                    "status":0,
                    "type": type,
                    "value":0,
                    "voiceID":0,
                    "zonecount":0
                }
            }), device.getChannel());
        } else if (device.isCamera2Product() || device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithInt(CommandType.CMD_DEV_PUSHMSG_MODE, type, this.rawStation.member.admin_user_id, Station.CHANNEL);
        }
    }

    public async setMotionTracking(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceMotionTracking)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
            "commandType": CommandType.CMD_INDOOR_PAN_MOTION_TRACK,
            "data":{
                "enable":0,
                "index": 0,
                "status":0,
                "type": 0,
                "value": value === true ? 1 : 0,
                "voiceID":0,
                "zonecount":0,
                "transaction": `${new Date().getTime()}`,
            }
        }), device.getChannel());
    }

    public async setPanAndTiltRotationSpeed(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceRotationSpeed)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceMotionDetectionType);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
            "commandType": CommandType.CMD_INDOOR_PAN_SPEED,
            "data":{
                "enable":0,
                "index": 0,
                "status":0,
                "type": 0,
                "value": value,
                "voiceID":0,
                "zonecount":0,
                "transaction": `${new Date().getTime()}`,
            }
        }), device.getChannel());
    }

    public async setMicMute(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceMicrophone)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_DEV_MIC_MUTE, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async setAudioRecording(device: Device, value: boolean): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceAudioRecording)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight() || device.isIndoorCamera() || device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_SET_RECORD_AUDIO_ENABLE,
                "data": {
                    "enable": value === true ? 1 : 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                }
            }), device.getChannel());
        } else if (device.isCamera2Product() || device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            //TODO: Add other cameras (E, etc.)
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_AUDIO_MUTE_RECORD,
                "mValue3": 0,
                "payload": {
                    "channel": device.getChannel(),
                    "record_mute": value === true ? 0 : 1,
                }
            }), device.getChannel());
        }
    }

    public async enableSpeaker(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceSpeaker)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_DEV_SPEAKER_MUTE, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async setSpeakerVolume(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceSpeakerVolume)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceSpeakerVolume);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_DEV_SPEAKER_VOLUME, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async setRingtoneVolume(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceRingtoneVolume)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceRingtoneVolume);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_BAT_DOORBELL_SET_RINGTONE_VOLUME, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async enableIndoorChime(device: Device, value: boolean): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceChimeIndoor)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_BAT_DOORBELL_MECHANICAL_CHIME_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async enableHomebaseChime(device: Device, value: boolean): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceChimeHomebase)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_BAT_DOORBELL_CHIME_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setHomebaseChimeRingtoneVolume(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceChimeHomebaseRingtoneVolume)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceChimeHomebaseRingtoneVolume);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_BAT_DOORBELL_DINGDONG_V,
                "mValue3": 0,
                "payload": {
                    "dingdong_volume": value,
                }
            }), device.getChannel());
        }
    }

    public async setHomebaseChimeRingtoneType(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceChimeHomebaseRingtoneType)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceChimeHomebaseRingtoneType);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_BAT_DOORBELL_DINGDONG_R,
                "mValue3": 0,
                "payload": {
                    "dingdong_ringtone": value,
                }
            }), device.getChannel());
        }
    }

    public async setNotificationType(device: Device, value: NotificationType): Promise<void> {
        //TODO: Check if other devices support this functionality
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceNotificationType)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceNotificationType);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight() || device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_PUSH_NOTIFY_TYPE,
                "data": {
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": value,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                }
            }), device.getChannel());
        } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                "mValue3": 0,
                "payload": {
                    "notification_motion_onoff": device.getPropertyValue(PropertyName.DeviceNotificationMotion).value,
                    "notification_ring_onoff": device.getPropertyValue(PropertyName.DeviceNotificationRing).value,
                    "notification_style": value,
                }
            }), device.getChannel());
        } else if (device.isCamera2Product()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_PUSH_EFFECT,
                "mValue3": 0,
                "payload": {
                    "notification_style": value,
                }
            }), device.getChannel());
        }
    }

    public async setNotificationPerson(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceNotificationPerson)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_AI_PERSON_ENABLE,
                "data": {
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": value === true ? 1 : 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                }
            }), device.getChannel());
        }
    }

    public async setNotificationPet(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceNotificationPet)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_AI_PET_ENABLE,
                "data": {
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": value === true ? 1 : 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                }
            }), device.getChannel());
        }
    }

    public async setNotificationAllOtherMotion(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceNotificationAllOtherMotion)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_AI_MOTION_ENABLE,
                "data": {
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": value === true ? 1 : 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                }
            }), device.getChannel());
        }
    }

    public async setNotificationAllSound(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceNotificationAllSound)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_AI_SOUND_ENABLE,
                "data": {
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": value === true ? 1 : 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                }
            }), device.getChannel());
        }
    }

    public async setNotificationCrying(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceNotificationCrying)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_AI_CRYING_ENABLE,
                "data": {
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": value === true ? 1 : 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                }
            }), device.getChannel());
        }
    }

    public async setNotificationRing(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceNotificationRing)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                "mValue3": 0,
                "payload": {
                    "notification_ring_onoff": value === true ? 1 : 0,
                    "notification_motion_onoff": device.getPropertyValue(PropertyName.DeviceNotificationMotion).value,
                    "notification_style": device.getPropertyValue(PropertyName.DeviceNotificationType).value,
                }
            }), device.getChannel());
        }
    }

    public async setNotificationMotion(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceNotificationMotion)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                "mValue3": 0,
                "payload": {
                    "notification_motion_onoff": value === true ? 1 : 0,
                    "notification_ring_onoff": device.getPropertyValue(PropertyName.DeviceNotificationRing).value,
                    "notification_style": device.getPropertyValue(PropertyName.DeviceNotificationType).value,
                }
            }), device.getChannel());
        }
    }

    public async setPowerSource(device: Device, value: PowerSource): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DevicePowerSource)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DevicePowerSource);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
            "account_id": this.rawStation.member.admin_user_id,
            "cmd": CommandType.CMD_SET_POWER_CHARGE,
            "mValue3": 0,
            "payload": {
                "charge_mode": value,
            }
        }), device.getChannel());
    }

    public async setPowerWorkingMode(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DevicePowerWorkingMode)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DevicePowerWorkingMode);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_PIR_POWERMODE, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async setRecordingClipLength(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceRecordingClipLength)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceRecordingClipLength);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_DEV_RECORD_TIMEOUT, value, this.rawStation.member.admin_user_id, Station.CHANNEL);
    }

    public async setRecordingRetriggerInterval(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceRecordingRetriggerInterval)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceRecordingRetriggerInterval);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_DEV_RECORD_INTERVAL, value, this.rawStation.member.admin_user_id, Station.CHANNEL);
    }

    public async setRecordingEndClipMotionStops(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceRecordingEndClipMotionStops)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_DEV_RECORD_AUTOSTOP, value === true ? 0 : 1, this.rawStation.member.admin_user_id, Station.CHANNEL);
    }

    public async setVideoStreamingQuality(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        //TODO: Add Wired Doorbell support!
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceVideoStreamingQuality)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceVideoStreamingQuality);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isIndoorCamera() || device.isSoloCameras() || device.isFloodLight()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": 1020,
                "data": {
                    "quality": value,
                }
            }), device.getChannel());
        } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setVideoRecordingQuality(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        //TODO: Add support for other 2k devices
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceVideoRecordingQuality)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceVideoRecordingQuality);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": 1023,
                "data": {
                    "quality": value,
                }
            }), device.getChannel());
        }
    }

    public async setWDR(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceVideoWDR)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_BAT_DOORBELL_WDR_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async setFloodlightLightSettingsEnable(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLightSettingsEnable)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_FLOODLIGHT_TOTAL_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setFloodlightLightSettingsBrightnessManual(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLightSettingsBrightnessManual)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceLightSettingsBrightnessManual);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_FLOODLIGHT_BRIGHT_VALUE, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setFloodlightLightSettingsBrightnessMotion(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLightSettingsBrightnessMotion)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceLightSettingsBrightnessMotion);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setFloodlightLightSettingsBrightnessSchedule(device: Device, value: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLightSettingsBrightnessSchedule)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceLightSettingsBrightnessSchedule);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setFloodlightLightSettingsMotionTriggered(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLightSettingsMotionTriggered)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_LIGHT_CTRL_PIR_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setFloodlightLightSettingsMotionTriggeredDistance(device: Device, value: FloodlightMotionTriggeredDistance): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLightSettingsMotionTriggeredDistance)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceLightSettingsMotionTriggeredDistance);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }
        if (!Object.values(FloodlightMotionTriggeredDistance).includes(value)) {
            throw new InvalidPropertyValueError(`Value "${value}" isn't a valid value`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_PIRSENSITIVITY, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async setFloodlightLightSettingsMotionTriggeredTimer(device: Device, seconds: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLightSettingsMotionTriggeredTimer)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceLightSettingsMotionTriggeredTimer);
        if (property !== undefined) {
            validValue(property, seconds);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set seconds: ${seconds}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_LIGHT_CTRL_PIR_TIME, seconds, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        }
    }

    public async triggerStationAlarmSound(seconds: number): Promise<void> {
        if (!this.hasCommand(CommandName.StationTriggerAlarmSound)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, trigger alarm sound for ${seconds} seconds`);
        if (!isGreaterEqualMinVersion("2.0.7.9", this.getSoftwareVersion()) || Device.isIntegratedDeviceBySn(this.getSerial())) {
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_TONE_FILE, 2, seconds, this.rawStation.member.admin_user_id, "", Station.CHANNEL);
        } else {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_TONE_FILE,
                "mValue3": 0,
                "payload": {
                    "time_out": seconds,
                    "user_name": this.rawStation.member.nick_name,
                }
            }), Station.CHANNEL);
        }
    }

    public async resetStationAlarmSound(): Promise<void> {
        await this.triggerStationAlarmSound(0);
    }

    public async triggerDeviceAlarmSound(device: Device, seconds: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.DeviceTriggerAlarmSound)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }
        this.log.debug(`P2P connection to station ${this.getSerial()} present, trigger alarm sound for ${seconds} seconds`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_DEVS_TONE_FILE, seconds, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async resetDeviceAlarmSound(device: Device): Promise<void> {
        await this.triggerDeviceAlarmSound(device, 0);
    }

    public async setStationAlarmRingtoneVolume(value: number): Promise<void> {
        if (!this.hasProperty(PropertyName.StationAlarmVolume)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(PropertyName.StationAlarmVolume);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_SET_HUB_SPK_VOLUME, value, this.rawStation.member.admin_user_id, Station.CHANNEL);
    }

    public async setStationAlarmTone(tone: AlarmTone): Promise<void> {
        if (!this.hasProperty(PropertyName.StationAlarmTone)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(PropertyName.StationAlarmTone);
        if (property !== undefined) {
            validValue(property, tone);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${tone}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
            "account_id": this.rawStation.member.admin_user_id,
            "cmd": CommandType.CMD_HUB_ALARM_TONE,
            "mValue3": 0,
            "payload": {
                "type": tone,
            }
        }), Station.CHANNEL);
    }

    public async setStationPromptVolume(value: number): Promise<void> {
        if (!this.hasProperty(PropertyName.StationPromptVolume)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(PropertyName.StationPromptVolume);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
            "account_id": this.rawStation.member.admin_user_id,
            "cmd": CommandType.CMD_SET_PROMPT_VOLUME,
            "mValue3": 0,
            "payload": {
                "value": value,
            }
        }), Station.CHANNEL);
    }

    public async setStationNotificationSwitchMode(mode: NotificationSwitchMode, value: boolean): Promise<void> {
        if ((!this.hasProperty(PropertyName.StationNotificationSwitchModeApp) && mode === NotificationSwitchMode.APP) ||
            (!this.hasProperty(PropertyName.StationNotificationSwitchModeGeofence) && mode === NotificationSwitchMode.GEOFENCE) ||
            (!this.hasProperty(PropertyName.StationNotificationSwitchModeKeypad) && mode === NotificationSwitchMode.KEYPAD) ||
            (!this.hasProperty(PropertyName.StationNotificationSwitchModeSchedule) && mode === NotificationSwitchMode.SCHEDULE)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
            let oldvalue = 0;
            const rawproperty = this.getRawProperty(CommandType.CMD_HUB_NOTIFY_MODE);
            if (rawproperty !== undefined) {
                try {
                    oldvalue = Number.parseInt(rawproperty.value);
                } catch(error) {
                }
            }

            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                "mValue3": 0,
                "payload": {
                    "arm_push_mode": switchNotificationMode(oldvalue, mode, value),
                    "notify_alarm_delay": this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay) !== undefined ? (this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay).value === true ? 1 : 0) : 0,
                    "notify_mode": 0,
                }
            }), Station.CHANNEL);
        } else {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                "mValue3": 0,
                "payload": {
                    //"arm_push_mode": 0,
                    "notify_alarm_delay": this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay) !== undefined ? (this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay).value === true ? 1 : 0) : 0,
                    "notify_mode": value === true ? 1 : 0, // 0 or 1
                }
            }), Station.CHANNEL);
        }
    }

    public async setStationNotificationStartAlarmDelay(value: boolean): Promise<void> {
        if (!this.hasProperty(PropertyName.StationNotificationStartAlarmDelay)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        let pushmode = 0;
        const rawproperty = this.getRawProperty(CommandType.CMD_HUB_NOTIFY_MODE);
        if (rawproperty !== undefined) {
            try {
                pushmode = Number.parseInt(rawproperty.value);
            } catch(error) {
            }
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_HUB_NOTIFY_ALARM,
                "mValue3": 0,
                "payload": {
                    "arm_push_mode": pushmode,
                    "notify_alarm_delay": value === true ? 1 : 0,
                    "notify_mode": 0,
                }
            }), Station.CHANNEL);
        } else {
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                "mValue3": 0,
                "payload": {
                    //"arm_push_mode": 0,
                    "notify_alarm_delay": value === true ? 1 : 0,
                    "notify_mode": pushmode, // 0 or 1
                }
            }), Station.CHANNEL);
        }
    }

    public async setStationTimeFormat(value: TimeFormat): Promise<void> {
        if (!this.hasProperty(PropertyName.StationTimeFormat)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(PropertyName.StationTimeFormat);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_SET_HUB_OSD, value, this.rawStation.member.admin_user_id, Station.CHANNEL);
    }

    public async setRTSPStream(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceRTSPStream)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_NAS_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async setAntiTheftDetection(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceAntitheftDetection)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_EAS_SWITCH, value === true ? 1 : 0, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async setWatermark(device: Device, value: WatermarkSetting1 | WatermarkSetting2 | WatermarkSetting3 | WatermarkSetting4): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceWatermark)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(PropertyName.DeviceWatermark);
        if (property !== undefined) {
            validValue(property, value);
        } else {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        if (device.isCamera2Product()) {
            if (!Object.values(WatermarkSetting3).includes(value as WatermarkSetting3)) {
                this.log.error(`The device ${device.getSerial()} accepts only this type of values:`, WatermarkSetting3);
                return;
            }
            this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${WatermarkSetting3[value]}.`);
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_DEVS_OSD, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        } else if (device.isIndoorCamera() || device.isFloodLight()) {
            if (!Object.values(WatermarkSetting4).includes(value as WatermarkSetting4)) {
                this.log.error(`The device ${device.getSerial()} accepts only this type of values:`, WatermarkSetting4);
                return;
            }
            this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${WatermarkSetting4[value]}.`);
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_DEVS_OSD, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        } else if (device.isSoloCameras() || device.isWiredDoorbell()) {
            if (!Object.values(WatermarkSetting1).includes(value as WatermarkSetting1)) {
                this.log.error(`The device ${device.getSerial()} accepts only this type of values:`, WatermarkSetting1);
                return;
            }
            this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${WatermarkSetting1[value]}.`);
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_DEVS_OSD, value, 0, this.rawStation.member.admin_user_id, "", 0);
        } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E) {
            if (!Object.values(WatermarkSetting2).includes(value as WatermarkSetting2)) {
                this.log.error(`The device ${device.getSerial()} accepts only this type of values: `, WatermarkSetting2);
                return;
            }
            this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${WatermarkSetting2[value]}.`);
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_SET_DEVS_OSD, value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        } else {
            this.log.warn("This functionality is not implemented or supported by this device");
        }
    }

    public async enableDevice(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceEnabled)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        let param_value = value === true ? 0 : 1;
        if (device.isIndoorCamera() || device.isSoloCameras() || device.isWiredDoorbell() || device.isFloodLight())
            param_value = value === true ? 1 : 0;

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_DEVS_SWITCH, param_value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async startDownload(device: Device, path: string, cipher_id: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.StationDownload)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        const cipher = await this.api.getCipher(cipher_id, this.rawStation.member.admin_user_id);
        if (Object.keys(cipher).length > 0) {
            this.log.debug(`P2P connection to station ${this.getSerial()} present, download video path: ${path}`);
            this.p2pSession.setDownloadRSAPrivateKeyPem(cipher.private_key);
            await this.p2pSession.sendCommandWithString(CommandType.CMD_DOWNLOAD_VIDEO, path, this.rawStation.member.admin_user_id, device.getChannel());
        } else {
            this.log.warn(`Cancelled download of video "${path}" from Station ${this.getSerial()}, because RSA certificate couldn't be loaded`);
        }
    }

    public async cancelDownload(device: Device): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.StationDownload)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, cancel download for channel: ${device.getChannel()}.`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_DOWNLOAD_CANCEL, device.getChannel(), this.rawStation.member.admin_user_id, device.getChannel());
    }

    public async startLivestream(device: Device): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.DeviceStartLivestream)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }
        if (this.isLiveStreaming(device)) {
            throw new LivestreamAlreadyRunningError(`Livestream for device ${device.getSerial()} is already running`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, start livestream for channel: ${device.getChannel()}`);
        const rsa_key = this.p2pSession.getRSAPrivateKey();

        if (device.isWiredDoorbell() || device.isFloodLight() || device.isSoloCameras() || device.isIndoorCamera()) {
            this.log.debug(`Using CMD_DOORBELL_SET_PAYLOAD for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": 1000,
                "data": {
                    "account_id": this.rawStation.member.admin_user_id,
                    "encryptkey": rsa_key?.exportKey("components-public").n.slice(1).toString("hex"),
                    "streamtype": 0
                }
            }), device.getChannel());
        } else {
            if ((Device.isIntegratedDeviceBySn(this.getSerial()) || !isGreaterEqualMinVersion("2.0.9.7", this.getSoftwareVersion())) && (!this.getSerial().startsWith("T8420") || !isGreaterEqualMinVersion("1.0.0.25", this.getSoftwareVersion()))) {
                this.log.debug(`Using CMD_START_REALTIME_MEDIA for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
                await this.p2pSession.sendCommandWithInt(CommandType.CMD_START_REALTIME_MEDIA, device.getChannel(), rsa_key?.exportKey("components-public").n.slice(1).toString("hex"), device.getChannel());
            } else {
                this.log.debug(`Using CMD_SET_PAYLOAD for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
                await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_START_REALTIME_MEDIA,
                    "mValue3": CommandType.CMD_START_REALTIME_MEDIA,
                    "payload": {
                        "ClientOS": "Android",
                        "key": rsa_key?.exportKey("components-public").n.slice(1).toString("hex"),
                        "streamtype": VideoCodec.H264
                    }
                }), device.getChannel());
            }
        }
    }

    public async stopLivestream(device: Device): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.DeviceStopLivestream)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        if (!this.isLiveStreaming(device)) {
            throw new LivestreamNotRunningError(`Livestream for device ${device.getSerial()} is not running`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, stop livestream for channel: ${device.getChannel()}`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_STOP_REALTIME_MEDIA, device.getChannel(), undefined, device.getChannel());
    }

    public isLiveStreaming(device: Device): boolean {
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            return false
        }
        if (device.getStationSerial() !== this.getSerial())
            return false;

        return this.p2pSession.isLiveStreaming(device.getChannel());
    }

    public isDownloading(device: Device): boolean {
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            return false
        }
        if (device.getStationSerial() !== this.getSerial())
            return false;

        return this.p2pSession.isDownloading(device.getChannel());
    }

    public async quickResponse(device: Device, voice_id: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.DeviceQuickResponse)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set voice_id: ${voice_id}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            this.log.debug(`Using CMD_BAT_DOORBELL_QUICK_RESPONSE for station ${this.getSerial()}`);
            await this.p2pSession.sendCommandWithIntString(CommandType.CMD_BAT_DOORBELL_QUICK_RESPONSE, voice_id, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
        } else if (device.isWiredDoorbell()) {
            this.log.debug(`Using CMD_DOORBELL_SET_PAYLOAD for station ${this.getSerial()}`);
            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                "commandType": 1004,
                "data": {
                    "voiceID": voice_id
                }
            }), device.getChannel());
        }
    }

    public async lockDevice(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceLocked)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        if (device.isLockBasicNoFinger() || device.isLockBasic()) {
            const key = generateLockAESKey(this.rawStation.member.admin_user_id, this.getSerial());
            const iv = getLockVectorBytes(this.getSerial());
            const lockCmd = Lock.encodeESLCmdOnOff(Number.parseInt(this.rawStation.member.short_user_id), this.rawStation.member.nick_name, value);
            const payload: ESLStationP2PThroughData = {
                channel: device.getChannel(),
                lock_cmd: ESLInnerCommand.ON_OFF_LOCK,
                lock_payload: lockCmd.toString("base64"),
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const encPayload = encryptLockAESData(key, iv, encodeLockPayload(JSON.stringify(payload)));

            this.log.debug("Locking/unlocking device...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: payload, encPayload: encPayload.toString("hex") });

            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_DOORLOCK_DATA_PASS_THROUGH,
                "mValue3": 0,
                "payload": {
                    "payload": encPayload.toString("base64")
                }
            }), device.getChannel());
        } /*else if (device.isLockAdvanced()) {
            const publicKey = await this.api.getPublicKey(device.getSerial(), PublicKeyType.LOCK);
            const encPublicKey = encryptLockBasicPublicKey(generateLockBasicPublicKeyAESKey(this.rawStation.member.admin_user_id), Buffer.from(publicKey, "hex"));

            //TODO: Generate key from encPublicKey using ECC - ECIES (aes-cbc 128, HMAC_SHA_256_256) - KDF!

            const key = generateLockBasicAESKey();
            const iv = getLockVectorBytes(this.getSerial());
            const payload: LockBasicOnOffRequestPayload = {
                shortUserId: this.rawStation.member.short_user_id,
                slOperation: value === true ? 1 : 0,
                userId: this.rawStation.member.admin_user_id,
                userName: this.rawStation.member.nick_name,
            };

            const encPayload = encryptLockAESData(key, iv, encodeLockPayload(JSON.stringify(payload)));

            await this.p2pSession.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                "key": "",  //TODO: Missing key generation!
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.P2P_ON_OFF_LOCK,
                "mValue3": 0,
                "payload": {
                    "payload": encPayload.toString("base64")
                }
            }), device.getChannel());
        }*/
    }

    public setQuickStreamStart(value: boolean): void {
        this.quickStreamStart = value;
    }

    public getQuickStreamStart(): boolean {
        return this.quickStreamStart;
    }

    public setConnectionType(type: P2PConnectionType): void {
        this.p2pConnectionType = type;
    }

    public getConnectionType(): P2PConnectionType {
        return this.p2pConnectionType;
    }

}