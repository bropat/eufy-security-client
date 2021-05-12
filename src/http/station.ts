import { TypedEmitter } from "tiny-typed-emitter";
import { Readable } from "stream";
import { Logger } from "ts-log";

import { HTTPApi } from "./api";
import { AlarmMode, DeviceType, GuardMode, ParamType, PropertyName, StationProperties, SupportedFeature } from "./types";
import { DskKeyResponse, HubResponse, ResultResponse } from "./models"
import { ParameterHelper } from "./parameter";
import { IndexedProperty, PropertyMetadataAny, PropertyValue, PropertyValues, RawValue, RawValues, StationEvents } from "./interfaces";
import { isGreaterMinVersion } from "./utils";
import { DeviceSerial, StreamMetadata } from "./../p2p/interfaces";
import { P2PClientProtocol } from "../p2p/session";
import { CommandType, ErrorCode, ESLInnerCommand, P2PConnectionType, VideoCodec, WatermarkSetting1, WatermarkSetting2, WatermarkSetting3, WatermarkSetting4 } from "../p2p/types";
import { Address, CmdCameraInfoResponse, CommandResult, ESLStationP2PThroughData } from "../p2p/models";
import { Device, Lock } from "./device";
import { convertTimestampMs } from "../push/utils";
import { encodeLockPayload, encryptLockAESData, generateLockAESKey, getLockVectorBytes, isPrivateIp } from "../p2p/utils";
import { NotConnectedError, NotSupportedFeatureError, NotSupportedGuardModeError, WrongStationError } from "../error";
import { PushMessage } from "../push/models";
import { CusPushEvent } from "../push/types";
import { InvalidPropertyError } from "./error";

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

    private p2pCurrentModeChanged = false;

    public static readonly CHANNEL:number = 255;

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
                let timestamp: number;
                switch(property.key) {
                    case "main_sw_version":
                        timestamp = convertTimestampMs(this.rawStation.main_sw_time);
                        break;
                    case "sec_sw_version":
                        timestamp = convertTimestampMs(this.rawStation.sec_sw_time);
                        break;
                    default:
                        timestamp = convertTimestampMs(this.rawStation.update_time);
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
                    && this.properties[name].timestamp < value.timestamp
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
                    && this.rawProperties[type].timestamp < value.timestamp
                )
            )
            || this.rawProperties[type] === undefined
        ) {

            this.rawProperties[type] = {
                value: parsedValue,
                timestamp: value.timestamp
            };
            if (this.ready)
                this.emit("raw property changed", this, type, this.rawProperties[type].value, this.rawProperties[type].timestamp);

            const metadata = this.getPropertiesMetadata();

            for(const property of Object.values(metadata)) {
                if (property.key === type) {
                    this.properties[property.name] = this.convertRawPropertyValue(property, this.rawProperties[type]);
                    if (this.ready)
                        this.emit("property changed", this, property.name, this.properties[property.name]);
                    break;
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
                    let guardModeChanged = false;
                    let currentModeChanged = false;
                    if (message.station_guard_mode !== undefined)
                        guardModeChanged = this.updateRawProperty(ParamType.GUARD_MODE, { value: message.station_guard_mode.toString(), timestamp: convertTimestampMs(message.event_time) })
                    if (message.station_current_mode !== undefined)
                        currentModeChanged = this.updateRawProperty(CommandType.CMD_GET_ALARM_MODE, { value: message.station_current_mode.toString(), timestamp: convertTimestampMs(message.event_time) })

                    if (message.station_guard_mode !== undefined && message.station_current_mode !== undefined && (guardModeChanged || currentModeChanged)) {
                        this.emit("guard mode", this, message.station_guard_mode, message.station_current_mode);
                    }
                } catch (error) {
                    this.log.debug(`Station ${message.station_sn} MODE_SWITCH event (${message.event_type}) - Error:`, error);
                }
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

    public async connect(p2pConnectionType = P2PConnectionType.PREFER_LOCAL, quickStreamStart = false): Promise<void> {
        if (this.dskKey == "" || (this.dskExpiration && (new Date()).getTime() >= this.dskExpiration.getTime())) {
            this.log.debug(`Station ${this.getSerial()} DSK keys not present or expired, get/renew it`, { dskExpiration: this.dskExpiration });
            await this.getDSKKeys();
        }

        this.log.debug(`Connecting to station ${this.getSerial()}...`, { p2p_did: this.rawStation.p2p_did, dskKey: this.dskKey });

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
        this.p2pSession.setConnectionType(p2pConnectionType);
        this.p2pSession.setQuickStreamStart(quickStreamStart);
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
        if (mode in GuardMode) {
            if (!this.p2pSession || !this.p2pSession.isConnected()) {
                this.log.debug(`P2P connection to station ${this.getSerial()} not present, establish it`);
                await this.connect();
            }
            if (this.p2pSession) {
                if (this.p2pSession.isConnected()) {
                    this.log.debug(`P2P connection to station ${this.getSerial()} present, send command mode: ${mode}`);

                    if ((isGreaterMinVersion("2.0.7.9", this.getSoftwareVersion()) && !Device.isIntegratedDeviceBySn(this.getSerial())) || Device.isSoloCameraBySn(this.getSerial())) {
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
        } else {
            throw new NotSupportedGuardModeError(`Tried to set unsupported guard mode "${mode}" for station ${this.getSerial()}`)
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
        const oldValue = this.getRawProperty(CommandType.CMD_GET_ALARM_MODE);
        this.updateRawProperty(CommandType.CMD_GET_ALARM_MODE, {
            value: mode.toString(),
            timestamp: +new Date
        });

        if (oldValue === undefined || (oldValue !== undefined && oldValue.value !== mode.toString()))
            this.p2pCurrentModeChanged = true;

        this.emit("raw property changed", this, CommandType.CMD_GET_ALARM_MODE, this.rawProperties[CommandType.CMD_GET_ALARM_MODE].value, this.rawProperties[CommandType.CMD_GET_ALARM_MODE].timestamp);
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
        let guardModeChanged = false;
        const rawCurrentMode = this.getRawProperty(CommandType.CMD_GET_ALARM_MODE);
        cameraInfo.params.forEach(param => {
            if (param.dev_type === Station.CHANNEL) {
                const updated = this.updateRawProperty(param.param_type, { value: param.param_value, timestamp: timestamp });
                if ((param.param_type === ParamType.GUARD_MODE || (param.param_type === CommandType.CMD_GET_ALARM_MODE && rawCurrentMode !== undefined)) && updated) {
                    guardModeChanged = true;
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
        if (guardModeChanged || this.p2pCurrentModeChanged) {
            this.p2pCurrentModeChanged = false;
            this.emit("guard mode", this, this.getGuardMode().value as number, this.getCurrentMode().value as number);
        }
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
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            this.log.warn(`P2P connection to station ${this.getSerial()} not present, command aborted`);
            return;
        }
        this.log.debug(`P2P connection to station ${this.getSerial()} present, reboot requested`);
        await this.p2pSession.sendCommandWithInt(CommandType.CMD_HUB_REBOOT, 0, this.rawStation.member.admin_user_id, Station.CHANNEL);
    }

    public async setStatusLed(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.isFeatureSupported(SupportedFeature.StatusLED)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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
                    "transaction": `${new Date().getTime()}`
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
        if (!device.isFeatureSupported(SupportedFeature.AutoNightVision)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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
        if (!device.isFeatureSupported(SupportedFeature.MotionDetection)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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
        if (!device.isFeatureSupported(SupportedFeature.SoundDetection)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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

    public async setPetDetection(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.isFeatureSupported(SupportedFeature.PetDetection)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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

    public async setRTSPStream(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!device.isFeatureSupported(SupportedFeature.RTSP)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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
        if (!device.isFeatureSupported(SupportedFeature.AntiTheftDetection)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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
        if (!device.isFeatureSupported(SupportedFeature.Watermarking)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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
        if (!device.isCamera()) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        let param_value = value === true ? 0 : 1;
        if (device.isIndoorCamera() || device.isSoloCameras() || device.isWiredDoorbell())
            param_value = value === true ? 1 : 0;

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);
        await this.p2pSession.sendCommandWithIntString(CommandType.CMD_DEVS_SWITCH, param_value, device.getChannel(), this.rawStation.member.admin_user_id, "", device.getChannel());
    }

    public async startDownload(device: Device, path: string, cipher_id: number): Promise<void> {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError(`Device ${device.getSerial()} is not managed by this station ${this.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        const cipher = await this.api.getCipher(cipher_id, this.rawStation.member.admin_user_id);
        if (cipher) {
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
        if (!device.isFeatureSupported(SupportedFeature.Livestreaming)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
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
            if ((Device.isIntegratedDeviceBySn(this.getSerial()) || !isGreaterMinVersion("2.0.9.7", this.getSoftwareVersion())) && (!this.getSerial().startsWith("T8420") || !isGreaterMinVersion("1.0.0.25", this.getSoftwareVersion()))) {
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
        if (!device.isFeatureSupported(SupportedFeature.Livestreaming)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, start livestream for channel: ${device.getChannel()}`);
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
        if (!device.isFeatureSupported(SupportedFeature.QuickResponse)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
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
        if (!device.isFeatureSupported(SupportedFeature.Locking)) {
            throw new NotSupportedFeatureError(`This functionality is not implemented or supported by ${device.getSerial()}`);
        }
        if (!this.p2pSession || !this.p2pSession.isConnected()) {
            throw new NotConnectedError(`No p2p connection to station ${this.getSerial()}`);
        }

        this.log.debug(`P2P connection to station ${this.getSerial()} present, set value: ${value}`);

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
    }

}