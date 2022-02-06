import { TypedEmitter } from "tiny-typed-emitter";
import { Readable } from "stream";
import { Logger } from "ts-log";

import { HTTPApi } from "./api";
import { AlarmMode, AlarmTone, NotificationSwitchMode, DeviceType, FloodlightMotionTriggeredDistance, GuardMode, NotificationType, ParamType, PowerSource, PropertyName, StationProperties, TimeFormat, CommandName, StationCommands, StationGuardModeKeyPadProperty, StationCurrentModeKeyPadProperty, StationAutoEndAlarmProperty, StationSwitchModeWithAccessCodeProperty, StationTurnOffAlarmWithButtonProperty, PublicKeyType } from "./types";
import { StationListResponse } from "./models"
import { ParameterHelper } from "./parameter";
import { IndexedProperty, PropertyMetadataAny, PropertyValue, PropertyValues, RawValue, RawValues, StationEvents, PropertyMetadataNumeric, PropertyMetadataBoolean } from "./interfaces";
import { isGreaterEqualMinVersion, isNotificationSwitchMode, switchNotificationMode } from "./utils";
import { StreamMetadata } from "../p2p/interfaces";
import { P2PClientProtocol } from "../p2p/session";
import { ChargingType, CommandType, ErrorCode, ESLInnerCommand, P2PConnectionType, PanTiltDirection, VideoCodec, WatermarkSetting1, WatermarkSetting2, WatermarkSetting3, WatermarkSetting4 } from "../p2p/types";
import { Address, CmdCameraInfoResponse, CommandResult, ESLStationP2PThroughData, LockAdvancedOnOffRequestPayload, AdvancedLockSetParamsType, PropertyData } from "../p2p/models";
import { Device, Lock } from "./device";
import { convertTimestampMs } from "../push/utils";
import { getAdvancedLockKey, encodeLockPayload, encryptLockAESData, generateBasicLockAESKey, generateAdvancedLockAESKey, getLockVectorBytes, isPrivateIp } from "../p2p/utils";
import { InvalidCommandValueError, InvalidPropertyValueError, NotSupportedError, RTSPPropertyNotEnabled, WrongStationError } from "../error";
import { PushMessage } from "../push/models";
import { CusPushEvent } from "../push/types";
import { InvalidPropertyError, LivestreamAlreadyRunningError, LivestreamNotRunningError, PropertyNotSupportedError } from "./error";
import { validValue } from "../utils";

export class Station extends TypedEmitter<StationEvents> {

    private api: HTTPApi;
    private rawStation: StationListResponse;
    private log: Logger;

    private p2pSession: P2PClientProtocol;
    private properties: PropertyValues = {};
    private rawProperties: RawValues = {};
    private ready = false;

    private currentDelay = 0;
    private reconnectTimeout?: NodeJS.Timeout;
    private terminating = false;

    private p2pConnectionType = P2PConnectionType.PREFER_LOCAL;

    public static readonly CHANNEL: number = 255;
    public static readonly CHANNEL_INDOOR: number = 1000;

    constructor(api: HTTPApi, station: StationListResponse) {
        super();
        this.api = api;
        this.rawStation = station;
        this.log = api.getLog();
        this.p2pSession = new P2PClientProtocol(this.rawStation, this.api);
        this.p2pSession.on("connect", (address: Address) => this.onConnect(address));
        this.p2pSession.on("close", () => this.onDisconnect());
        this.p2pSession.on("timeout", () => this.onTimeout());
        this.p2pSession.on("command", (result: CommandResult) => this.onCommandResponse(result));
        this.p2pSession.on("alarm mode", (mode: AlarmMode) => this.onAlarmMode(mode));
        this.p2pSession.on("camera info", (cameraInfo: CmdCameraInfoResponse) => this.onCameraInfo(cameraInfo));
        this.p2pSession.on("download started", (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => this.onStartDownload(channel, metadata, videoStream, audioStream));
        this.p2pSession.on("download finished", (channel: number) => this.onFinishDownload(channel));
        this.p2pSession.on("livestream started", (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => this.onStartLivestream(channel, metadata, videoStream, audioStream));
        this.p2pSession.on("livestream stopped", (channel: number) => this.onStopLivestream(channel));
        this.p2pSession.on("wifi rssi", (channel: number, rssi: number) => this.onWifiRssiChanged(channel, rssi));
        this.p2pSession.on("rtsp livestream started", (channel: number) => this.onStartRTSPLivestream(channel));
        this.p2pSession.on("rtsp livestream stopped", (channel: number) => this.onStopRTSPLivestream(channel));
        this.p2pSession.on("rtsp url", (channel: number, rtspUrl: string) => this.onRTSPUrl(channel, rtspUrl));
        this.p2pSession.on("esl parameter", (channel: number, param: number, value: string) => this.onESLParameter(channel, param, value));
        this.p2pSession.on("runtime state", (channel: number, batteryLevel: number, temperature: number) => this.onRuntimeState(channel, batteryLevel, temperature));
        this.p2pSession.on("charging state", (channel: number, chargeType: ChargingType, batteryLevel: number) => this.onChargingState(channel, chargeType, batteryLevel));
        this.p2pSession.on("floodlight manual switch", (channel: number, enabled: boolean) => this.onFloodlightManualSwitch(channel, enabled));
        this.update(this.rawStation);
        this.ready = true;
        setImmediate(() => {
            this.emit("ready", this);
        });
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

    public getRawStation(): StationListResponse {
        return this.rawStation;
    }

    public update(station: StationListResponse): void {
        this.rawStation = station;
        this.p2pSession.updateRawStation(station);

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
            } else if (this.properties[property.name] === undefined && property.default !== undefined && !this.ready) {
                this.updateProperty(property.name, { value: property.default, timestamp: new Date().getTime() });
            }
        }
        this.rawStation.params.forEach(param => {
            this.updateRawProperty(param.param_type, { value: param.param_value, timestamp: convertTimestampMs(param.update_time) });
        });
        this.log.debug("Normalized Properties", { stationSN: this.getSerial(), properties: this.properties });
    }

    public updateProperty(name: string, value: PropertyValue): boolean {
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
        } else if (this.rawProperties[type] !== undefined && (
            this.rawProperties[type].value === parsedValue
            && this.rawProperties[type].timestamp < value.timestamp)
        ) {
            this.rawProperties[type].timestamp = value.timestamp;
            if (this.ready)
                this.emit("raw property renewed", this, type, this.rawProperties[type].value, this.rawProperties[type].timestamp);

            const metadata = this.getPropertiesMetadata();

            for (const property of Object.values(metadata)) {
                if (property.key === type && this.properties[property.name] !== undefined) {
                    this.properties[property.name].timestamp = value.timestamp;
                    if (this.ready)
                        this.emit("property changed", this, property.name, this.properties[property.name]);
                }
            }
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
                case CommandType.CMD_SET_HUB_ALARM_AUTO_END:
                    return { value: value !== undefined ? value.value !== "0" ? false : true : false, timestamp: value !== undefined ? value.timestamp : 0 };
                case CommandType.CMD_SET_HUB_ALARM_CLOSE:
                    return { value: value !== undefined ? value.value === "1" ? false : true : false, timestamp: value !== undefined ? value.timestamp : 0 };
            }
            if (property.type === "number") {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return { value: value !== undefined ? Number.parseInt(value.value) : (property.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0)), timestamp: value ? value.timestamp : 0 };
                } catch (error) {
                    this.log.warn("PropertyMetadataNumeric Convert Error:", { property: property, value: value, error: error });
                    return { value: property.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0), timestamp: value ? value.timestamp : 0 };
                }
            } else if (property.type === "boolean") {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return { value: value !== undefined ? (value.value === "1" || value.value.toLowerCase() === "true" ? true : false) : (property.default !== undefined ? booleanProperty.default : false), timestamp: value ? value.timestamp : 0 };
                } catch (error) {
                    this.log.warn("PropertyMetadataBoolean Convert Error:", { property: property, value: value, error: error });
                    return { value: property.default !== undefined ? booleanProperty.default : false, timestamp: value ? value.timestamp : 0 };
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
        let metadata = StationProperties[this.getDeviceType()];
        if (metadata === undefined) {
            metadata = StationProperties[DeviceType.STATION];
        }
        if (this.hasDeviceWithType(DeviceType.KEYPAD)) {
            metadata[PropertyName.StationGuardMode] = StationGuardModeKeyPadProperty;
            metadata[PropertyName.StationCurrentMode] = StationCurrentModeKeyPadProperty;
            metadata[PropertyName.StationSwitchModeWithAccessCode] = StationSwitchModeWithAccessCodeProperty;
            metadata[PropertyName.StationAutoEndAlarm] = StationAutoEndAlarmProperty;
            metadata[PropertyName.StationTurnOffAlarmWithButton] = StationTurnOffAlarmWithButtonProperty;
        }
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

    public isConnected(): boolean {
        return this.p2pSession.isConnected();
    }

    public close(): void {
        this.terminating = true;
        this.log.info(`Disconnect from station ${this.getSerial()}`);
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
        if (this.p2pSession.isConnected()) {
            this.p2pSession.close();
        }
    }

    public isEnergySavingDevice(): boolean {
        return this.p2pSession.isEnergySavingDevice();
    }

    public async connect(): Promise<void> {
        this.log.debug(`Connecting to station ${this.getSerial()}...`, { p2pConnectionType: P2PConnectionType[this.p2pConnectionType] });
        this.p2pSession.setConnectionType(this.p2pConnectionType);
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

    private onStopRTSPLivestream(channel: number): void {
        this.emit("rtsp livestream stop", this, channel);
    }

    private onStartRTSPLivestream(channel: number): void {
        this.emit("rtsp livestream start", this, channel);
    }

    private onWifiRssiChanged(channel: number, rssi: number): void {
        this.emit("wifi rssi", this, channel, rssi, +new Date);
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
        const propertyData: PropertyData = {
            name: PropertyName.StationGuardMode,
            value: mode
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, mode);

        this.log.debug(`Sending guard mode command to station ${this.getSerial()} with value: ${GuardMode[mode]}`);
        if ((isGreaterEqualMinVersion("2.0.7.9", this.getSoftwareVersion()) && !Device.isIntegratedDeviceBySn(this.getSerial())) || Device.isSoloCameraBySn(this.getSerial())) {
            this.log.debug(`Using CMD_SET_PAYLOAD for station ${this.getSerial()}`, { main_sw_version: this.getSoftwareVersion() });
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_ARMING,
                    "mValue3": 0,
                    "payload": {
                        "mode_type": mode,
                        "user_name": this.rawStation.member.nick_name
                    }
                }),
                channel: Station.CHANNEL
            }, {
                name: property.name,
                value: mode
            } as PropertyData);
        } else {
            this.log.debug(`Using CMD_SET_ARMING for station ${this.getSerial()}`);
            await this.p2pSession.sendCommandWithInt({
                commandType: CommandType.CMD_SET_ARMING,
                value: mode,
                strValue: this.rawStation.member.admin_user_id,
                channel: Station.CHANNEL
            }, {
                name: property.name,
                value: mode
            });
        }
    }

    public async getCameraInfo(): Promise<void> {
        this.log.debug(`Sending get camera infos command to station ${this.getSerial()}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_CAMERA_INFO,
            value: 255,
            channel: Station.CHANNEL
        });
    }

    public async getStorageInfo(): Promise<void> {
        this.log.debug(`Sending get storage info command to station ${this.getSerial()}`);
        //TODO: Verify channel! Should be 255...
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SDINFO_EX,
            value: 0,
            valueSub: 0,
            strValue: this.rawStation.member.admin_user_id
        });
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
        this.log.debug("Got p2p command response", { station: this.getSerial(), commandType: result.command_type, channel: result.channel, returnCodeName: ErrorCode[result.return_code], returnCode: result.return_code, property: result.property });
        this.emit("command result", this, result);
    }

    private onConnect(address: Address): void {
        this.terminating = false;
        this.resetCurrentDelay();
        this.log.info(`Connected to station ${this.getSerial()} on host ${address.host} and port ${address.port}`);
        this.emit("connect", this);
    }

    private onDisconnect(): void {
        this.log.info(`Disconnected from station ${this.getSerial()}`);
        this.emit("close", this);
        if (!this.isEnergySavingDevice() && !this.terminating)
            this.scheduleReconnect();
    }

    private onTimeout(): void {
        this.log.info(`Timeout connecting to station ${this.getSerial()}`);
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
        if (!this.reconnectTimeout) {
            const delay = this.getCurrentDelay();
            this.log.debug(`Schedule reconnect to station ${this.getSerial()}...`, { delay: delay });
            this.reconnectTimeout = setTimeout(async () => {
                this.reconnectTimeout = undefined;
                this.connect();
            }, delay);
        }
    }

    public async rebootHUB(): Promise<void> {
        if (!this.hasCommand(CommandName.StationReboot)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        this.log.debug(`Sending reboot command to station ${this.getSerial()}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_HUB_REBOOT,
            value: 0,
            strValue: this.rawStation.member.admin_user_id,
            channel: Station.CHANNEL
        });
    }

    public async setStatusLed(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceStatusLed,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending status led command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isCamera2Product() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_DEV_LED_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_LIVEVIEW_LED_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.getDeviceType() === DeviceType.FLOODLIGHT) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_DEV_LED_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isIndoorCamera() || device.isFloodLight()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                    },
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE,
                    "mValue3": 0,
                    "payload": {
                        "light_enable": value === true ? 1 : 0
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_LED_NIGHT_OPEN,
                    "data":{
                        "status": value === true ? 1 : 0
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setAutoNightVision(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoNightvision,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending autonightvision command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_IRCUT_SWITCH,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setNightVision(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNightvision,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending nightvision command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_NIGHT_VISION_TYPE,
                "mValue3": 0,
                "payload": {
                    "channel": device.getChannel(),
                    "night_sion": value,
                }
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setMotionDetection(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending motion detection command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isIndoorCamera() || (device.isFloodLight() && device.getDeviceType() !== DeviceType.FLOODLIGHT)) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_MOTION_DETECTION_PACKAGE,
                    "data":{
                        "enable": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_PIR_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setSoundDetection(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSoundDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending sound detection command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
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
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setSoundDetectionType(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSoundDetectionType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending sound detection type command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
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
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setSoundDetectionSensitivity(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSoundDetectionSensitivity,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending sound detection sensitivity command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
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
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setPetDetection(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DevicePetDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending pet detection command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
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
            }),
            channel: device.getChannel()
        }, propertyData);
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
        this.log.debug(`Sending pan and tilt command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${PanTiltDirection[direction]}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_INDOOR_ROTATE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "cmd_type": direction === PanTiltDirection.ROTATE360 ? -1 : command,
                        "rotate_type": direction,
                    }
                }),
                channel: device.getChannel()
            });
        } else {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_ROTATE,
                    "data":{
                        "cmd_type": command,
                        "rotate_type": direction,
                    }
                }),
                channel: device.getChannel()
            });
        }
    }

    public async switchLight(device: Device, value: boolean): Promise<void> {
        //TODO: Check if other devices support this functionality
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLight,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending switch light command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isFloodLight() || device.isSoloCameraSpotlight1080() || device.isSoloCameraSpotlight2k() ||
            device.isSoloCameraSpotlightSolar() || device.isCamera2C() || device.isCamera2CPro() ||
            device.isIndoorOutdoorCamera1080p() || device.isIndoorOutdoorCamera2k()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionDetectionSensitivity(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivity,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending motion detection sensitivity command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if ((device.isFloodLight() && device.getDeviceType() !== DeviceType.FLOODLIGHT) || device.isIndoorCamera() ) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_SENSITIVITY_IDX,
                    "data":{
                        "enable":0,
                        "index": value,
                        "status":0,
                        "type":0,
                        "value":0,
                        "voiceID":0,
                        "zonecount":0
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_PIR_SENSITIVITY,
                    "data":{
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isBatteryDoorbell2() || device.isBatteryDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_MOTION_SENSITIVITY,
                    "payload": {
                        "channel": device.getChannel(),
                        "sensitivity": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isCamera2Product()) {
            let convertedValue;
            switch(value) {
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
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIRSENSITIVITY,
                value: convertedValue,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E) {
            const convertedValue = 200 - ((value - 1) * 2);
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIRSENSITIVITY,
                value: convertedValue,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            let intMode: number;
            let intSensitivity: number;
            switch(value) {
                case 1:
                    intMode = 3;
                    intSensitivity = 2;
                    break;
                case 2:
                    intMode = 1;
                    intSensitivity = 1;
                    break;
                case 3:
                    intMode = 1;
                    intSensitivity = 2;
                    break;
                case 4:
                    intMode = 1;
                    intSensitivity = 3;
                    break;
                case 5:
                    intMode = 2;
                    intSensitivity = 1;
                    break;
                default:
                    intMode = 1;
                    intSensitivity = 3;
                    break;
            }
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_MOTION_DETECTION_PACKAGE,
                    "data":{
                        "mode": intMode,
                        "sensitivity": intSensitivity,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.getDeviceType() === DeviceType.FLOODLIGHT) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_MDSENSITIVITY,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionDetectionType(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending motion detection type command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isCamera2Product() || device.isBatteryDoorbell() || device.isBatteryDoorbell2() ||
            device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E || device.isSoloCameras() ||
            device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithInt({
                commandType: CommandType.CMD_DEV_PUSHMSG_MODE,
                value: value,
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isFloodLight() || device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_TYPE,
                    "data":{
                        "enable":0,
                        "index": 0,
                        "status":0,
                        "type": value,
                        "value":0,
                        "voiceID":0,
                        "zonecount":0
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionTracking(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionTracking,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending motion tracking command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
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
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setPanAndTiltRotationSpeed(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRotationSpeed,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending pan and tilt rotation speed command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
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
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setMicMute(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMicrophone,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending mic mute command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_DEV_MIC_MUTE,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setAudioRecording(device: Device, value: boolean): Promise<void> {
        //TODO: Check if other devices support this functionality
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAudioRecording,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending audio recording command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_AUDIO_MUTE_RECORD,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "enable": value === true ? 1 : 0,
                        "index": 0,
                        "status": 0,
                        "type": 0,
                        "value": 0,
                        "voiceID": 0,
                        "zonecount": 0,
                        "transaction": `${new Date().getTime()}`,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.getDeviceType() === DeviceType.FLOODLIGHT) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_RECORD_AUDIO_SWITCH,
                    "payload": {
                        "storage_audio_switch": value === true ? 0 : 1,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isFloodLight() || device.isIndoorCamera() || device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isCamera2Product() || device.isBatteryDoorbell() || device.isBatteryDoorbell2() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_AUDIO_MUTE_RECORD,
                    "mValue3": 0,
                    "payload": {
                        "channel": device.getChannel(),
                        "record_mute": value === true ? 0 : 1,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_AUDIO_RECORDING,
                    "data":{
                        "status": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async enableSpeaker(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSpeaker,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending enable speaker command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_DEV_SPEAKER_MUTE,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setSpeakerVolume(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSpeakerVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending speaker volume command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_DEV_SPEAKER_VOLUME,
            value: value,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setRingtoneVolume(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRingtoneVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending ringtone volume command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_SET_RINGTONE_VOLUME,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_RINGTONE_VOLUME,
                    "data":{
                        "volume": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async enableIndoorChime(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChimeIndoor,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending enable indoor chime command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_MECHANICAL_CHIME_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_INDOOR_CHIME,
                    "data":{
                        "status": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async enableHomebaseChime(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChimeHomebase,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending enable homebase chime command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_CHIME_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setHomebaseChimeRingtoneVolume(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChimeHomebaseRingtoneVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending homebase chime ringtone volume command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_DINGDONG_V,
                    "mValue3": 0,
                    "payload": {
                        "dingdong_volume": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setHomebaseChimeRingtoneType(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChimeHomebaseRingtoneType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending homebase chime ringtone type command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_DINGDONG_R,
                    "mValue3": 0,
                    "payload": {
                        "dingdong_ringtone": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setNotificationType(device: Device, value: NotificationType): Promise<void> {
        //TODO: Check if other devices support this functionality
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending notification type command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isFloodLight() || device.isIndoorCamera() || device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mValue3": 0,
                    "payload": {
                        "notification_motion_onoff": device.getPropertyValue(PropertyName.DeviceNotificationMotion).value,
                        "notification_ring_onoff": device.getPropertyValue(PropertyName.DeviceNotificationRing).value,
                        "notification_style": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isCamera2Product() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_PUSH_EFFECT,
                    "mValue3": 0,
                    "payload": {
                        "notification_style": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_NOTIFICATION_TYPE,
                    "data":{
                        "style": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setNotificationPerson(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationPerson,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending notification person command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setNotificationPet(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationPet,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending notification pet command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setNotificationAllOtherMotion(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationAllOtherMotion,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending notification all other motion command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setNotificationAllSound(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationAllSound,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending notification all sound command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setNotificationCrying(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationCrying,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending notification crying command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isIndoorCamera()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
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
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setNotificationRing(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationRing,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending notification ring command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mValue3": 0,
                    "payload": {
                        "notification_ring_onoff": value === true ? 1 : 0,
                        "notification_motion_onoff": device.getPropertyValue(PropertyName.DeviceNotificationMotion).value,
                        "notification_style": device.getPropertyValue(PropertyName.DeviceNotificationType).value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_NOTIFICATION_RING,
                    "data":{
                        "type": value === true ? ((device.getPropertyValue(PropertyName.DeviceNotificationMotion).value as boolean) === true ? 3 : 1) : ((device.getPropertyValue(PropertyName.DeviceNotificationMotion).value as boolean) === true ? 2 : 0),
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setNotificationMotion(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationMotion,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending notification motion command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mValue3": 0,
                    "payload": {
                        "notification_motion_onoff": value === true ? 1 : 0,
                        "notification_ring_onoff": device.getPropertyValue(PropertyName.DeviceNotificationRing).value,
                        "notification_style": device.getPropertyValue(PropertyName.DeviceNotificationType).value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_NOTIFICATION_RING,
                    "data":{
                        "type": value === true ? ((device.getPropertyValue(PropertyName.DeviceNotificationRing).value as boolean) === true ? 3 : 2) : ((device.getPropertyValue(PropertyName.DeviceNotificationRing).value as boolean) === true ? 1 : 0),
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setPowerSource(device: Device, value: PowerSource): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DevicePowerSource,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending power source command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_POWER_CHARGE,
                "mValue3": 0,
                "payload": {
                    "charge_mode": value,
                }
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setPowerWorkingMode(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DevicePowerWorkingMode,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending power working mode command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_PIR_POWERMODE,
            value: value,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setRecordingClipLength(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRecordingClipLength,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending recording clip length command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DEV_RECORD_TIMEOUT,
            value: value,
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setRecordingRetriggerInterval(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRecordingRetriggerInterval,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending recording retrigger interval command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DEV_RECORD_INTERVAL,
            value: value,
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setRecordingEndClipMotionStops(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRecordingEndClipMotionStops,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending recording end clip motion stops command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DEV_RECORD_AUTOSTOP,
            value: value === true ? 0 : 1,
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setVideoStreamingQuality(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoStreamingQuality,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending video streaming quality command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isIndoorCamera() || device.isSoloCameras() || device.isFloodLight() || device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_VIDEO_QUALITY,
                    "data": {
                        "quality": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2() || device.isCamera2CPro()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setVideoRecordingQuality(device: Device, value: number): Promise<void> {
        //TODO: Check if other devices support this functionality
        //TODO: Add support for other 2k devices
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoRecordingQuality,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending video recording quality command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isIndoorCamera() || device.isWiredDoorbell() || device.isFloodLight() || device.isSoloCameras()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
                    "data": {
                        "quality": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isCamera2CPro()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_RECORD_QUALITY,
                    "mValue3": 0,
                    "payload": {
                        "record_quality": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setWDR(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoWDR,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending wdr command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_BAT_DOORBELL_WDR_SWITCH,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setFloodlightLightSettingsEnable(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsEnable,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending floodlight light settings enable command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_FLOODLIGHT_TOTAL_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setFloodlightLightSettingsBrightnessManual(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsBrightnessManual,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending floodlight light settings brightness manual command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isFloodLight() || device.isSoloCameraSpotlight1080() || device.isSoloCameraSpotlight2k() ||
            device.isSoloCameraSpotlightSolar() || device.isCamera2C() || device.isCamera2CPro() ||
            device.isIndoorOutdoorCamera1080p() || device.isIndoorOutdoorCamera2k()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_FLOODLIGHT_BRIGHT_VALUE,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setFloodlightLightSettingsBrightnessMotion(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsBrightnessMotion,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending floodlight light settings brightness motion command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setFloodlightLightSettingsBrightnessSchedule(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsBrightnessSchedule,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending floodlight light settings brightness schedule command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setFloodlightLightSettingsMotionTriggered(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionTriggered,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending floodlight light settings motion triggered command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_LIGHT_CTRL_PIR_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setFloodlightLightSettingsMotionTriggeredDistance(device: Device, value: FloodlightMotionTriggeredDistance): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionTriggeredDistance,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        let newValue: FloodlightMotionTriggeredDistance;
        switch (value as number) {
            case 1: newValue = FloodlightMotionTriggeredDistance.MIN;
                break;
            case 2: newValue = FloodlightMotionTriggeredDistance.LOW;
                break;
            case 3: newValue = FloodlightMotionTriggeredDistance.MEDIUM;
                break;
            case 4: newValue = FloodlightMotionTriggeredDistance.HIGH;
                break;
            case 5: newValue = FloodlightMotionTriggeredDistance.MAX;
                break;
            default:
                throw new InvalidPropertyValueError(`Device ${device.getSerial()} not supported value "${value}" for property named "${PropertyName.DeviceLightSettingsMotionTriggeredDistance}"`);
        }

        this.log.debug(`Sending floodlight light settings motion triggered distance command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${newValue}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIRSENSITIVITY,
                value: newValue,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setFloodlightLightSettingsMotionTriggeredTimer(device: Device, seconds: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionTriggeredTimer,
            value: seconds
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, seconds);

        this.log.debug(`Sending floodlight light settings motion triggered timer command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${seconds}`);
        if (device.isFloodLight()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_LIGHT_CTRL_PIR_TIME,
                value: seconds,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async triggerStationAlarmSound(seconds: number): Promise<void> {
        if (!this.hasCommand(CommandName.StationTriggerAlarmSound)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        this.log.debug(`Sending trigger station alarm sound command to station ${this.getSerial()} with value: ${seconds}`);
        if (!isGreaterEqualMinVersion("2.0.7.9", this.getSoftwareVersion()) || Device.isIntegratedDeviceBySn(this.getSerial())) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_TONE_FILE,
                value: 2,
                valueSub: seconds,
                strValue: this.rawStation.member.admin_user_id,
                channel: Station.CHANNEL
            });
        } else {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_TONE_FILE,
                    "mValue3": 0,
                    "payload": {
                        "time_out": seconds,
                        "user_name": this.rawStation.member.nick_name,
                    }
                }),
                channel: Station.CHANNEL
            });
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
        this.log.debug(`Sending trigger device alarm sound command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${seconds}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_DEVS_TONE_FILE,
            value: seconds,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        });
    }

    public async resetDeviceAlarmSound(device: Device): Promise<void> {
        await this.triggerDeviceAlarmSound(device, 0);
    }

    public async setStationAlarmRingtoneVolume(value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.StationAlarmVolume,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending station alarm ringtone volume command to station ${this.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_SET_HUB_SPK_VOLUME,
            value: value,
            strValue: this.rawStation.member.admin_user_id,
            channel: Station.CHANNEL
        }, propertyData);
    }

    public async setStationAlarmTone(value: AlarmTone): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.StationAlarmTone,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending station alarm tone command to station ${this.getSerial()} with value: ${AlarmTone[value]}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_HUB_ALARM_TONE,
                "mValue3": 0,
                "payload": {
                    "type": value,
                }
            }),
            channel: Station.CHANNEL
        }, propertyData);
    }

    public async setStationPromptVolume(value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.StationPromptVolume,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending station prompt volume command to station ${this.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_PROMPT_VOLUME,
                "mValue3": 0,
                "payload": {
                    "value": value,
                }
            }),
            channel: Station.CHANNEL
        }, propertyData);
    }

    public async setStationNotificationSwitchMode(mode: NotificationSwitchMode, value: boolean): Promise<void> {
        if ((!this.hasProperty(PropertyName.StationNotificationSwitchModeApp) && mode === NotificationSwitchMode.APP) ||
            (!this.hasProperty(PropertyName.StationNotificationSwitchModeGeofence) && mode === NotificationSwitchMode.GEOFENCE) ||
            (!this.hasProperty(PropertyName.StationNotificationSwitchModeKeypad) && mode === NotificationSwitchMode.KEYPAD) ||
            (!this.hasProperty(PropertyName.StationNotificationSwitchModeSchedule) && mode === NotificationSwitchMode.SCHEDULE)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const propertyData: PropertyData = {
            name: mode === NotificationSwitchMode.APP ? PropertyName.StationNotificationSwitchModeApp : mode === NotificationSwitchMode.GEOFENCE ? PropertyName.StationNotificationSwitchModeGeofence : mode === NotificationSwitchMode.KEYPAD ? PropertyName.StationNotificationSwitchModeKeypad : mode === NotificationSwitchMode.SCHEDULE ? PropertyName.StationNotificationSwitchModeSchedule : "" as PropertyName,
            value: value
        };
        this.log.debug(`Sending station notification switch mode command to station ${this.getSerial()} with value: ${value}`);
        if (isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
            let oldvalue = 0;
            const rawproperty = this.getRawProperty(CommandType.CMD_HUB_NOTIFY_MODE);
            if (rawproperty !== undefined) {
                try {
                    oldvalue = Number.parseInt(rawproperty.value);
                } catch(error) {
                }
            }

            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                    "mValue3": 0,
                    "payload": {
                        "arm_push_mode": switchNotificationMode(oldvalue, mode, value),
                        "notify_alarm_delay": this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay) !== undefined ? (this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay).value === true ? 1 : 0) : 0,
                        "notify_mode": 0,
                    }
                }),
                channel: Station.CHANNEL
            }, propertyData);
        } else {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                    "mValue3": 0,
                    "payload": {
                        //"arm_push_mode": 0,
                        "notify_alarm_delay": this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay) !== undefined ? (this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay).value === true ? 1 : 0) : 0,
                        "notify_mode": value === true ? 1 : 0, // 0 or 1
                    }
                }),
                channel: Station.CHANNEL
            }, propertyData);
        }
    }

    public async setStationNotificationStartAlarmDelay(value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.StationNotificationStartAlarmDelay,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        let pushmode = 0;
        const rawproperty = this.getRawProperty(CommandType.CMD_HUB_NOTIFY_MODE);
        if (rawproperty !== undefined) {
            try {
                pushmode = Number.parseInt(rawproperty.value);
            } catch(error) {
            }
        }
        this.log.debug(`Sending station notification start alarm delay command to station ${this.getSerial()} with value: ${value}`);
        if (isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_HUB_NOTIFY_ALARM,
                    "mValue3": 0,
                    "payload": {
                        "arm_push_mode": pushmode,
                        "notify_alarm_delay": value === true ? 1 : 0,
                        "notify_mode": 0,
                    }
                }),
                channel: Station.CHANNEL
            }, propertyData);
        } else {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                    "mValue3": 0,
                    "payload": {
                        //"arm_push_mode": 0,
                        "notify_alarm_delay": value === true ? 1 : 0,
                        "notify_mode": pushmode, // 0 or 1
                    }
                }),
                channel: Station.CHANNEL
            }, propertyData);
        }
    }

    public async setStationTimeFormat(value: TimeFormat): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.StationTimeFormat,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending station time format command to station ${this.getSerial()} with value: ${TimeFormat[value]}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_SET_HUB_OSD,
            value: value,
            strValue: this.rawStation.member.admin_user_id,
            channel: Station.CHANNEL
        }, propertyData);
    }

    public async setRTSPStream(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRTSPStream,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending rtsp stream command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_NAS_SWITCH,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setAntiTheftDetection(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAntitheftDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending antitheft detection command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_EAS_SWITCH,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setWatermark(device: Device, value: WatermarkSetting1 | WatermarkSetting2 | WatermarkSetting3 | WatermarkSetting4): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceWatermark,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        if (device.isCamera2Product()) {
            if (!Object.values(WatermarkSetting3).includes(value as WatermarkSetting3)) {
                this.log.error(`The device ${device.getSerial()} accepts only this type of values:`, WatermarkSetting3);
                return;
            }
            this.log.debug(`Sending watermark command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${WatermarkSetting3[value]}`);
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isSoloCameras() || device.isWiredDoorbell() || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            if (!Object.values(WatermarkSetting1).includes(value as WatermarkSetting1)) {
                this.log.error(`The device ${device.getSerial()} accepts only this type of values:`, WatermarkSetting1);
                return;
            }
            this.log.debug(`Sending watermark command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${WatermarkSetting1[value]}`);
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: 0,
                strValue: this.rawStation.member.admin_user_id,
                channel: 0
            }, propertyData);
        } else if (device.isIndoorCamera() || device.isFloodLight()) {
            if (!Object.values(WatermarkSetting4).includes(value as WatermarkSetting4)) {
                this.log.error(`The device ${device.getSerial()} accepts only this type of values:`, WatermarkSetting4);
                return;
            }
            this.log.debug(`Sending watermark command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${WatermarkSetting4[value]}`);
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E) {
            if (!Object.values(WatermarkSetting2).includes(value as WatermarkSetting2)) {
                this.log.error(`The device ${device.getSerial()} accepts only this type of values: `, WatermarkSetting2);
                return;
            }
            this.log.debug(`Sending matermark command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${WatermarkSetting2[value]}`);
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async enableDevice(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceEnabled,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        let param_value = value === true ? 0 : 1;
        if (device.isIndoorCamera() || device.isWiredDoorbell() || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8422 || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8424)
            param_value = value === true ? 1 : 0;

        this.log.debug(`Sending enable device command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_DEVS_SWITCH,
            value: param_value,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async startDownload(device: Device, path: string, cipher_id: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.DeviceStartDownload)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const cipher = await this.api.getCipher(cipher_id, this.rawStation.member.admin_user_id);
        if (Object.keys(cipher).length > 0) {
            this.log.debug(`Sending start download command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${path}`);
            this.p2pSession.setDownloadRSAPrivateKeyPem(cipher.private_key);
            await this.p2pSession.sendCommandWithString({
                commandType: CommandType.CMD_DOWNLOAD_VIDEO,
                strValue: path,
                strValueSub: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            });
        } else {
            this.log.warn(`Cancelled download of video "${path}" from Station ${this.getSerial()}, because RSA certificate couldn't be loaded`);
        }
    }

    public async cancelDownload(device: Device): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.DeviceCancelDownload)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending cancel download command to station ${this.getSerial()} for device ${device.getSerial()}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DOWNLOAD_CANCEL,
            value: device.getChannel(),
            strValueSub: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        });
    }

    public async startLivestream(device: Device, videoCodec: VideoCodec = VideoCodec.H264): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasCommand(CommandName.DeviceStartLivestream)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (this.isLiveStreaming(device)) {
            throw new LivestreamAlreadyRunningError(`Livestream for device ${device.getSerial()} is already running`);
        }
        this.log.debug(`Sending start livestream command to station ${this.getSerial()} for device ${device.getSerial()}`);
        const rsa_key = this.p2pSession.getRSAPrivateKey();

        if (device.isSoloCameras() || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.log.debug(`Using CMD_DOORBELL_SET_PAYLOAD (solo cams) for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_START_LIVESTREAM,
                    "data": {
                        "accountId": this.rawStation.member.admin_user_id,
                        "encryptkey": rsa_key?.exportKey("components-public").n.slice(1).toString("hex"),
                        "streamtype": videoCodec
                    }
                }),
                channel: device.getChannel()
            });
        } else if (device.isWiredDoorbell() || (device.isFloodLight() && device.getDeviceType() !== DeviceType.FLOODLIGHT) || device.isIndoorCamera()) {
            this.log.debug(`Using CMD_DOORBELL_SET_PAYLOAD for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_START_LIVESTREAM,
                    "data": {
                        "account_id": this.rawStation.member.admin_user_id,
                        "encryptkey": rsa_key?.exportKey("components-public").n.slice(1).toString("hex"),
                        "streamtype": videoCodec
                    }
                }),
                channel: device.getChannel()
            });
        } else {
            if ((Device.isIntegratedDeviceBySn(this.getSerial()) || !isGreaterEqualMinVersion("2.0.9.7", this.getSoftwareVersion())) && (!this.getSerial().startsWith("T8420") || !isGreaterEqualMinVersion("1.0.0.25", this.getSoftwareVersion()))) {
                this.log.debug(`Using CMD_START_REALTIME_MEDIA for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
                await this.p2pSession.sendCommandWithInt({
                    commandType: CommandType.CMD_START_REALTIME_MEDIA,
                    value: device.getChannel(),
                    strValue: rsa_key?.exportKey("components-public").n.slice(1).toString("hex"),
                    channel: device.getChannel()
                });
            } else {
                this.log.debug(`Using CMD_SET_PAYLOAD for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
                await this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_START_REALTIME_MEDIA,
                        "mValue3": CommandType.CMD_START_REALTIME_MEDIA,
                        "payload": {
                            "ClientOS": "Android",
                            "key": rsa_key?.exportKey("components-public").n.slice(1).toString("hex"),
                            "streamtype": videoCodec === VideoCodec.H264 ? 1 : 2,
                        }
                    }),
                    channel: device.getChannel()
                });
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
        if (!this.isLiveStreaming(device)) {
            throw new LivestreamNotRunningError(`Livestream for device ${device.getSerial()} is not running`);
        }
        this.log.debug(`Sending stop livestream command to station ${this.getSerial()} for device ${device.getSerial()}`);
        await this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_STOP_REALTIME_MEDIA,
            value: device.getChannel(),
            channel: device.getChannel()
        });
    }

    public isLiveStreaming(device: Device): boolean {
        if (device.getStationSerial() !== this.getSerial())
            return false;
        return this.p2pSession.isLiveStreaming(device.getChannel());
    }

    public isDownloading(device: Device): boolean {
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
        this.log.debug(`Sending quick response command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${voice_id}`);
        if (device.isBatteryDoorbell() || device.isBatteryDoorbell2()) {
            this.log.debug(`Using CMD_BAT_DOORBELL_QUICK_RESPONSE for station ${this.getSerial()}`);
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_QUICK_RESPONSE,
                value: voice_id,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            });
        } else if (device.isWiredDoorbell()) {
            this.log.debug(`Using CMD_DOORBELL_SET_PAYLOAD for station ${this.getSerial()}`);
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_QUICK_RESPONSE,
                    "data": {
                        "voiceID": voice_id
                    }
                }),
                channel: device.getChannel()
            });
        }
    }

    public async setContinuousRecording(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceContinuousRecording,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending continuous recording command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_SET_CONTINUE_ENABLE,
                "data":{
                    "enable": value === true ? 1 : 0
                },
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setContinuousRecordingType(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceContinuousRecordingType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending continuous recording type command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        await this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_SET_CONTINUE_TYPE,
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
            }),
            channel: device.getChannel()
        }, propertyData);
    }

    public async setChirpVolume(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChirpVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending chirp volume command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isEntrySensor()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SENSOR_SET_CHIRP_VOLUME,
                    "mValue3": 0,
                    "payload": {
                        "channel": device.getChannel(),
                        "volume": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setChirpTone(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChirpTone,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending chirp tone command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isEntrySensor()) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SENSOR_SET_CHIRP_TONE,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setHDR(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoHDR,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending hdr command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_HDR,
                    "data":{
                        "status": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setDistortionCorrection(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoDistortionCorrection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending distortion correction command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_DISTORTION_CORRECTION,
                    "data":{
                        "status": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setRingRecord(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoRingRecord,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending ring record command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isWiredDoorbell()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_VIDEO_RING_RECORD,
                    "data":{
                        "status": value
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async lockDevice(device: Device, value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLocked,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending lock device command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.isLockBasicNoFinger() || device.isLockBasic()) {
            const key = generateBasicLockAESKey(this.rawStation.member.admin_user_id, this.getSerial());
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

            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORLOCK_DATA_PASS_THROUGH,
                    "mValue3": 0,
                    "payload": {
                        "payload": encPayload.toString("base64")
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        } else if (device.isLockAdvanced()) {
            const publicKey = await this.api.getPublicKey(device.getSerial(), PublicKeyType.LOCK);

            const key = generateAdvancedLockAESKey();
            const ecdhKey = getAdvancedLockKey(key, publicKey);
            const iv = getLockVectorBytes(this.getSerial());
            const payload: LockAdvancedOnOffRequestPayload = {
                shortUserId: this.rawStation.member.short_user_id,
                slOperation: value === true ? 1 : 0,
                userId: this.rawStation.member.admin_user_id,
                userName: this.rawStation.member.nick_name,
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const encPayload = encryptLockAESData(key, iv, Buffer.from(JSON.stringify(payload)));

            const p2pCommandData = JSON.stringify({
                "key": ecdhKey,
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.P2P_ON_OFF_LOCK,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": encPayload.toString("base64")
            }).replace("=", "\\u003d");

            this.log.debug("Locking/unlocking device...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: payload, encPayload: encPayload.toString("hex"), p2pCommandData: p2pCommandData });

            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: p2pCommandData,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setStationSwitchModeWithAccessCode(value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.StationNotificationSwitchModeGeofence,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        this.log.debug(`Sending station switch mode with access code command to station ${this.getSerial()} with value: ${value}`);
        if (this.isStation()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_KEYPAD_PSW_OPEN,
                    "mValue3": 0,
                    "payload": {
                        "psw_required": value === true ? 1 : 0,
                    }
                }),
                channel: Station.CHANNEL
            }, propertyData);
        }
    }

    public async setStationAutoEndAlarm(value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.StationAutoEndAlarm,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        this.log.debug(`Sending station auto end alarm command to station ${this.getSerial()} with value: ${value}`);
        if (this.isStation()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_HUB_ALARM_AUTO_END,
                    "mValue3": 0,
                    "payload": {
                        "value": value === true ? 0 : 2147483647,
                    }
                }),
                channel: Station.CHANNEL
            }, propertyData);
        }
    }

    public async setStationTurnOffAlarmWithButton(value: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.StationTurnOffAlarmWithButton,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${this.getSerial()}`);
        }
        this.log.debug(`Sending station turn off alarm with button command to station ${this.getSerial()} with value: ${value}`);
        if (this.isStation()) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_HUB_ALARM_CLOSE,
                    "mValue3": 0,
                    "payload": {
                        "value": value === true ? 0 : 1,
                    }
                }),
                channel: Station.CHANNEL
            }, propertyData);
        }
    }

    public async startRTSPStream(device: Device): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceRTSPStream)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const rtspStreamProperty = device.getPropertyValue(PropertyName.DeviceRTSPStream);
        if (rtspStreamProperty !== undefined && rtspStreamProperty.value !== true) {
            throw new RTSPPropertyNotEnabled(`RTSP setting for device ${device.getSerial()} must be enabled first, to enable this functionality!`);
        }
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRTSPStream,
            value: rtspStreamProperty.value
        };

        this.log.debug(`Start RTSP stream command to station ${this.getSerial()} for device ${device.getSerial()}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_NAS_TEST,
            value: 1,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async stopRTSPStream(device: Device): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(PropertyName.DeviceRTSPStream)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const rtspStreamProperty = device.getPropertyValue(PropertyName.DeviceRTSPStream);
        if (rtspStreamProperty !== undefined && rtspStreamProperty.value !== true) {
            throw new RTSPPropertyNotEnabled(`RTSP setting for device ${device.getSerial()} must be enabled first, to enable this functionality!`);
        }
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRTSPStream,
            value: rtspStreamProperty.value
        };

        this.log.debug(`Stop RTSP stream command to station ${this.getSerial()} for device ${device.getSerial()}`);
        await this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_NAS_TEST,
            value: 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, propertyData);
    }

    public async setMotionDetectionRange(device: Device, type: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRange,
            value: type
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, type);

        this.log.debug(`Sending motion detection range command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${type}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE,
                    "data":{
                        "value": type,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionDetectionRangeStandardSensitivity(device: Device, sensitivity: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRangeStandardSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        this.log.debug(`Sending motion detection range standard sensitivity command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${sensitivity}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_STD_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionDetectionRangeAdvancedLeftSensitivity(device: Device, sensitivity: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        this.log.debug(`Sending motion detection range advanced left sensitivity command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${sensitivity}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_LEFT_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionDetectionRangeAdvancedMiddleSensitivity(device: Device, sensitivity: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRangeAdvancedMiddleSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        this.log.debug(`Sending motion detection range advanced middle sensitivity command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${sensitivity}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_MIDDLE_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionDetectionRangeAdvancedRightSensitivity(device: Device, sensitivity: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        this.log.debug(`Sending motion detection range advanced right sensitivity command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${sensitivity}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_RIGHT_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionDetectionTestMode(device: Device, enabled: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionTestMode,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        this.log.debug(`Sending motion detection test mode command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${enabled}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.getDeviceType() === DeviceType.FLOODLIGHT) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIR_TEST_MODE,
                value: enabled === true ? 1 : 2,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionTrackingSensitivity(device: Device, sensitivity: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionTrackingSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        this.log.debug(`Sending motion tracking sensitivity command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${sensitivity}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_MOTION_TRACKING_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionAutoCruise(device: Device, enabled: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionAutoCruise,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        this.log.debug(`Sending motion auto cruise command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${enabled}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_MOTION_AUTO_CRUISE,
                    "data":{
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setMotionOutOfViewDetection(device: Device, enabled: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionOutOfViewDetection,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        this.log.debug(`Sending motion out-of-view detection command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${enabled}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_MOTION_OUT_OF_VIEW_DETECTION,
                    "data":{
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setLightSettingsColorTemperatureManual(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsColorTemperatureManual,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending light setting color temperature manual command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_MANUAL,
                    "data":{
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setLightSettingsColorTemperatureMotion(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsColorTemperatureMotion,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending light setting color temperature motion command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_MOTION,
                    "data":{
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setLightSettingsColorTemperatureSchedule(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsColorTemperatureSchedule,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending light setting color temperature schedule command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_SCHEDULE,
                    "data":{
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setLightSettingsMotionActivationMode(device: Device, value: number): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionActivationMode,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        this.log.debug(`Sending light setting motion activation mode command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${value}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_FLOODLIGHT_STREET_LAMP,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setVideoNightvisionImageAdjustment(device: Device, enabled: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoNightvisionImageAdjustment,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        this.log.debug(`Sending video nightvision image adjustment command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${enabled}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_VIDEO_NIGHTVISION_IMAGE_ADJUSTMENT,
                    "data":{
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setVideoColorNightvision(device: Device, enabled: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoColorNightvision,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        this.log.debug(`Sending video color nightvision command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${enabled}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_VIDEO_COLOR_NIGHTVISION,
                    "data":{
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public async setAutoCalibration(device: Device, enabled: boolean): Promise<void> {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoCalibration,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        this.log.debug(`Sending auto calibration command to station ${this.getSerial()} for device ${device.getSerial()} with value: ${enabled}`);
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_AUTO_CALIBRATION,
                    "data":{
                        "value": enabled === true ? 0 : 1,
                    }
                }),
                channel: device.getChannel()
            }, propertyData);
        }
    }

    public isRTSPLiveStreaming(device: Device): boolean {
        return this.p2pSession.isRTSPLiveStreaming(device.getChannel());
    }

    public setConnectionType(type: P2PConnectionType): void {
        this.p2pConnectionType = type;
    }

    public getConnectionType(): P2PConnectionType {
        return this.p2pConnectionType;
    }

    private onRuntimeState(channel: number, batteryLevel: number, temperature: number): void {
        this.emit("runtime state", this, channel, batteryLevel, temperature, +new Date);
    }

    private onChargingState(channel: number, chargeType: ChargingType, batteryLevel: number): void {
        this.emit("charging state", this, channel, chargeType, batteryLevel, +new Date);
    }

    public hasDevice(deviceSN: string): boolean {
        if (this.rawStation.devices)
            for (const device of this.rawStation.devices) {
                if (device.device_sn === deviceSN)
                    return true;
            }
        return false;
    }

    public hasDeviceWithType(deviceType: DeviceType): boolean {
        if (this.rawStation.devices)
            for (const device of this.rawStation.devices) {
                if (device.device_type === deviceType)
                    return true;
            }
        return false;
    }

    private onFloodlightManualSwitch(channel: number, enabled: boolean): void {
        this.emit("floodlight manual switch", this, channel, enabled, +new Date);
    }

    public async calibrateLock(device: Device): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!this.hasCommand(CommandName.DeviceLockCalibration)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending calibrate lock command to station ${this.getSerial()} for device ${device.getSerial()}`);
        if (device.isLockAdvanced()) {
            const publicKey = await this.api.getPublicKey(device.getSerial(), PublicKeyType.LOCK);

            const key = generateAdvancedLockAESKey();
            const ecdhKey = getAdvancedLockKey(key, publicKey);
            const iv = getLockVectorBytes(this.getSerial());
            const payload = {
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const encPayload = encryptLockAESData(key, iv, Buffer.from(JSON.stringify(payload)));

            const p2pCommandData = JSON.stringify({
                "key": ecdhKey,
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.P2P_CALIBRATE_LOCK,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": encPayload.toString("base64")
            }).replace("=", "\\u003d");

            this.log.debug("Calibrate lock...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: payload, encPayload: encPayload.toString("hex"), p2pCommandData: p2pCommandData });

            await this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: p2pCommandData,
                channel: device.getChannel()
            });
        }
    }

    private convertAdvancedLockSettingValue(property: PropertyName, value: unknown): number | string {
        switch (property) {
            case PropertyName.DeviceLockSettingsAutoLock:
            case PropertyName.DeviceLockSettingsNotification:
            case PropertyName.DeviceLockSettingsNotificationLocked:
            case PropertyName.DeviceLockSettingsOneTouchLocking:
            case PropertyName.DeviceLockSettingsAutoLockSchedule:
            case PropertyName.DeviceLockSettingsScramblePasscode:
            case PropertyName.DeviceLockSettingsNotificationUnlocked:
            case PropertyName.DeviceLockSettingsWrongTryProtection:
                return value as boolean === true ? 1 : 0;
            case PropertyName.DeviceLockSettingsWrongTryLockdownTime:
            case PropertyName.DeviceLockSettingsSound:
            case PropertyName.DeviceLockSettingsWrongTryAttempts:
            case PropertyName.DeviceLockSettingsAutoLockTimer:
                return value as number;
            case PropertyName.DeviceLockSettingsAutoLockScheduleEndTime:
            case PropertyName.DeviceLockSettingsAutoLockScheduleStartTime:
                const autoLockSchedule = (value as string).split(":");
                return `${Number.parseInt(autoLockSchedule[0]).toString(16).padStart(2, "0")}${Number.parseInt(autoLockSchedule[1]).toString(16).padStart(2, "0")}`;
        }
        return "";
    }

    private getAdvancedLockSettingsPayload(command: CommandType, device: Device): AdvancedLockSetParamsType {
        switch(command) {
            case CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_STARTTIME:
            case CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_ENDTIME:
                command = CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE;
                break;
            case CommandType.CMD_SMARTLOCK_AUTO_LOCK_TIMER:
                command = CommandType.CMD_SMARTLOCK_AUTO_LOCK;
                break;
            case CommandType.CMD_SMARTLOCK_WRONG_TRY_ATTEMPTS:
            case CommandType.CMD_SMARTLOCK_WRONG_TRY_LOCKDOWN:
                command = CommandType.CMD_SMARTLOCK_WRONG_TRY_PROTECT;
                break;
            case CommandType.CMD_SMARTLOCK_NOTIFICATION_LOCKED:
            case CommandType.CMD_SMARTLOCK_NOTIFICATION_UNLOCKED:
                command = CommandType.CMD_SMARTLOCK_NOTIFICATION;
                break;
        }
        return {
            autoLockTime: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsAutoLockTimer, device.getPropertyValue(PropertyName.DeviceLockSettingsAutoLockTimer).value) as number,
            isAutoLock: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsAutoLock, device.getPropertyValue(PropertyName.DeviceLockSettingsAutoLock).value) as number,
            isLockNotification: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsNotificationLocked, device.getPropertyValue(PropertyName.DeviceLockSettingsNotificationLocked).value) as number,
            isNotification: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsNotification, device.getPropertyValue(PropertyName.DeviceLockSettingsNotification).value) as number,
            isOneTouchLock: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsOneTouchLocking, device.getPropertyValue(PropertyName.DeviceLockSettingsOneTouchLocking).value) as number,
            isSchedule: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsAutoLockSchedule, device.getPropertyValue(PropertyName.DeviceLockSettingsAutoLockSchedule).value) as number,
            isScramblePasscode: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsScramblePasscode, device.getPropertyValue(PropertyName.DeviceLockSettingsScramblePasscode).value) as number,
            isUnLockNotification: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsNotificationUnlocked, device.getPropertyValue(PropertyName.DeviceLockSettingsNotificationUnlocked).value) as number,
            isWrongTryProtect: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsWrongTryProtection, device.getPropertyValue(PropertyName.DeviceLockSettingsWrongTryProtection).value) as number,
            lockDownTime: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsWrongTryLockdownTime, device.getPropertyValue(PropertyName.DeviceLockSettingsWrongTryLockdownTime).value) as number,
            lockSound: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsSound, device.getPropertyValue(PropertyName.DeviceLockSettingsSound).value) as number,
            paramType: command,
            scheduleEnd: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsAutoLockScheduleEndTime, device.getPropertyValue(PropertyName.DeviceLockSettingsAutoLockScheduleEndTime).value) as string,
            scheduleStart: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsAutoLockScheduleStartTime, device.getPropertyValue(PropertyName.DeviceLockSettingsAutoLockScheduleStartTime).value) as string,
            wrongTryTime: this.convertAdvancedLockSettingValue(PropertyName.DeviceLockSettingsWrongTryAttempts, device.getPropertyValue(PropertyName.DeviceLockSettingsWrongTryAttempts).value) as number,
            seq_num: this.p2pSession.incLockSequenceNumber()
        };
    }

    private getAdvancedLockSettingName(property: PropertyName): string {
        switch (property) {
            case PropertyName.DeviceLockSettingsAutoLock: return "isAutoLock";
            case PropertyName.DeviceLockSettingsAutoLockTimer: return "autoLockTime";
            case PropertyName.DeviceLockSettingsNotification: return "isNotification";
            case PropertyName.DeviceLockSettingsNotificationLocked: return "isLockNotification";
            case PropertyName.DeviceLockSettingsOneTouchLocking: return "isOneTouchLock";
            case PropertyName.DeviceLockSettingsAutoLockSchedule: return "isSchedule";
            case PropertyName.DeviceLockSettingsScramblePasscode: return "isScramblePasscode";
            case PropertyName.DeviceLockSettingsNotificationUnlocked: return "isUnLockNotification";
            case PropertyName.DeviceLockSettingsWrongTryProtection: return "isWrongTryProtect";
            case PropertyName.DeviceLockSettingsWrongTryLockdownTime: return "lockDownTime";
            case PropertyName.DeviceLockSettingsSound: return "lockSound";
            case PropertyName.DeviceLockSettingsAutoLockScheduleEndTime: return "scheduleEnd";
            case PropertyName.DeviceLockSettingsAutoLockScheduleStartTime: return "scheduleStart";
            case PropertyName.DeviceLockSettingsWrongTryAttempts: return "wrongTryTime";
        }
        return "";
    }

    public async setAdvancedLockParams(device: Device, property: PropertyName, value: unknown): Promise<void> {
        const propertyData: PropertyData = {
            name: property,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        this.log.debug(`Sending set advanced lock settings command to station ${this.getSerial()} for device ${device.getSerial()} property ${property}`);
        if (device.isLockAdvanced()) {
            const publicKey = await this.api.getPublicKey(device.getSerial(), PublicKeyType.LOCK);

            const key = generateAdvancedLockAESKey();
            const ecdhKey = getAdvancedLockKey(key, publicKey);
            const iv = getLockVectorBytes(this.getSerial());
            const payload = this.getAdvancedLockSettingsPayload(device.getPropertyMetadata(property).key as number, device);
            const p2pParamName = this.getAdvancedLockSettingName(property);
            if (p2pParamName !== "") {
                payload[p2pParamName] = this.convertAdvancedLockSettingValue(property, value);
                const encPayload = encryptLockAESData(key, iv, Buffer.from(JSON.stringify(payload)));

                const p2pCommandData = JSON.stringify({
                    "key": ecdhKey,
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.P2P_SET_LOCK_PARAM,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": encPayload.toString("base64")
                }).replace("=", "\\u003d");

                this.log.debug("Set lock param...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, property: property, value: value, payload: payload, encPayload: encPayload.toString("hex"), p2pCommandData: p2pCommandData });

                await this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: p2pCommandData,
                    channel: device.getChannel()
                }, propertyData);
            } else {
                this.log.debug();
            }
        }
    }

}