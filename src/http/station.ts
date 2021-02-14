import { TypedEmitter } from "tiny-typed-emitter";
import { Readable } from "stream";
import { Logger } from "ts-log";

import { HTTPApi } from "./api";
import { AlarmMode, DeviceType, GuardMode, ParamType } from "./types";
import { DskKeyResponse, HubResponse, ResultResponse } from "./models"
import { ParameterHelper } from "./parameter";
import { ParameterValue, ParameterArray, StationEvents } from "./interfaces";
import { isGreaterMinVersion } from "./utils";
import { StreamMetadata } from "./../p2p/interfaces";
import { P2PClientProtocol } from "../p2p/session";
import { CommandType, ErrorCode, VideoCodec, WatermarkSetting1, WatermarkSetting2, WatermarkSetting3 } from "../p2p/types";
import { Address, CmdCameraInfoResponse, CommandResult } from "../p2p/models";
import { Device } from "./device";
import { convertTimestampMs } from "../push/utils";

export class Station extends TypedEmitter<StationEvents> {

    private api: HTTPApi;
    private hub: HubResponse;
    private log: Logger;

    private dsk_key = "";
    private dsk_expiration: Date | null = null;

    private p2p_session: P2PClientProtocol | null = null;
    private parameters: ParameterArray = {};

    private currentDelay = 0;
    private reconnectTimeout?: NodeJS.Timeout;

    public static readonly CHANNEL:number = 255;

    constructor(api: HTTPApi, hub: HubResponse) {
        super();
        this.api = api;
        this.hub = hub;
        this.log = api.getLog();
        this.update(this.hub);
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

    private _updateParameter(param_type: number, param_value: ParameterValue): void {
        const tmp_param_value = ParameterHelper.readValue(param_type, param_value.value);
        if (((this.parameters[param_type] !== undefined && (this.parameters[param_type].value != tmp_param_value || this.parameters[param_type].modified < param_value.modified)) || this.parameters[param_type] === undefined) && param_type != 1147) {
            this.parameters[param_type] = {
                value: tmp_param_value,
                modified: param_value.modified
            };
            this.emit("parameter", this, param_type, this.parameters[param_type].value, this.parameters[param_type].modified);
        }
    }

    public update(hub: HubResponse, force = false):void {
        this.hub = hub;
        if (force)
            this.parameters = {};
        this.hub.params.forEach(param => {
            this._updateParameter(param.param_type, { value: param.param_value, modified: convertTimestampMs(param.update_time) });
        });
    }

    public isStation(): boolean {
        return this.hub.device_type == DeviceType.STATION;
    }

    public isDeviceStation(): boolean {
        return this.hub.device_type != DeviceType.STATION;
    }

    public getDeviceType(): number {
        return this.hub.device_type;
    }

    public getHardwareVersion(): string {
        return this.hub.main_hw_version;
    }

    public getMACAddress(): string {
        return this.hub.wifi_mac;
    }

    public getModel(): string {
        return this.hub.station_model;
    }

    public getName(): string {
        return this.hub.station_name;
    }

    public getSerial(): string {
        return this.hub.station_sn;
    }

    public getSoftwareVersion(): string {
        return this.hub.main_sw_version;
    }

    public getIPAddress(): string {
        return this.hub.ip_addr;
    }

    public getParameter(param_type: number): ParameterValue {
        return this.parameters[param_type];
    }

    private async getDSKKeys(): Promise<void> {
        try {
            const response = await this.api.request("post", "app/equipment/get_dsk_keys", {
                station_sns: [this.getSerial()]
            }).catch(error => {
                this.log.error(`${this.constructor.name}.getDSKKeys(): error: ${JSON.stringify(error)}`);
                return error;
            });
            this.log.debug(`${this.constructor.name}.getDSKKeys(): station: ${this.getSerial()} Response: ${JSON.stringify(response.data)}`);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    const dataresult: DskKeyResponse = result.data;
                    dataresult.dsk_keys.forEach(key => {
                        if (key.station_sn == this.getSerial()) {
                            this.dsk_key = key.dsk_key;
                            this.dsk_expiration = new Date(key.expiration * 1000);
                            this.log.debug(`${this.constructor.name}.getDSKKeys(): dsk_key: ${this.dsk_key} dsk_expiration: ${this.dsk_expiration}`);
                        }
                    });
                } else
                    this.log.error(`${this.constructor.name}.getDSKKeys(): station: ${this.getSerial()} Response code not ok (code: ${result.code} msg: ${result.msg})`);
            } else {
                this.log.error(`${this.constructor.name}.getDSKKeys(): station: ${this.getSerial()} Status return code not 200 (status: ${response.status} text: ${response.statusText}`);
            }
        } catch (error) {
            this.log.error(`${this.constructor.name}.getDSKKeys(): station: ${this.getSerial()} error: ${error}`);
        }
    }

    public isConnected(): boolean {
        if (this.p2p_session)
            return this.p2p_session.isConnected();
        return false;
    }

    public close(): void {
        this.log.info(`Disconnect from station ${this.getSerial()}.`);
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
        if (this.p2p_session) {
            this.p2p_session.close();
            this.p2p_session = null;
        }
    }

    public async connect(): Promise<void> {
        if (this.dsk_key == "" || (this.dsk_expiration && (new Date()).getTime() >= this.dsk_expiration.getTime())) {
            this.log.debug(`${this.constructor.name}.connect(): station: ${this.getSerial()} DSK keys not present or expired, get/renew it. (dsk_expiration: ${this.dsk_expiration})`);
            await this.getDSKKeys();
        }

        this.log.debug(`${this.constructor.name}.connect(): station: ${this.getSerial()} p2p_did: ${this.hub.p2p_did} dsk_key: ${this.dsk_key}`);

        if (this.p2p_session) {
            this.p2p_session.removeAllListeners();
            this.p2p_session.close();
            this.p2p_session = null;
        }

        this.p2p_session = new P2PClientProtocol(this.hub.p2p_did, this.dsk_key, this.log);
        this.p2p_session.on("connect", (address: Address) => this.onConnect(address));
        this.p2p_session.on("close", () => this.onDisconnect());
        this.p2p_session.on("command", (cmd_result: CommandResult) => this.onCommandResponse(cmd_result));
        this.p2p_session.on("alarm_mode", (mode: AlarmMode) => this.onAlarmMode(mode));
        this.p2p_session.on("camera_info", (camera_info: CmdCameraInfoResponse) => this.onCameraInfo(camera_info));
        this.p2p_session.on("start_download", (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => this.onStartDownload(channel, metadata, videoStream, audioStream));
        this.p2p_session.on("finish_download", (channel: number) => this.onFinishDownload(channel));
        this.p2p_session.on("start_livestream", (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => this.onStartLivestream(channel, metadata, videoStream, audioStream));
        this.p2p_session.on("stop_livestream", (channel: number) => this.onStopLivestream(channel));
        this.p2p_session.on("wifi_rssi", (channel: number, rssi: number) => this.onWifiRssiChanged(channel, rssi));

        this.p2p_session.connect();
    }

    private onFinishDownload(channel: number): void {
        this.log.trace(`${this.constructor.name}.onFinishDownload(): station: ${this.getSerial()} channel: ${channel}`);
        this.emit("finish_download", this, channel);
    }

    private onStartDownload(channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable): void {
        this.log.trace(`${this.constructor.name}.onStartDownload(): station: ${this.getSerial()} channel: ${channel}`);
        this.emit("start_download", this, channel, metadata, videoStream, audioStream);
    }

    private onStopLivestream(channel: number): void {
        this.log.trace(`${this.constructor.name}.onStopLivestream(): station: ${this.getSerial()} channel: ${channel}`);
        this.emit("stop_livestream", this, channel);
    }

    private onStartLivestream(channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable): void {
        this.log.trace(`${this.constructor.name}.onStartLivestream(): station: ${this.getSerial()} channel: ${channel}`);
        this.emit("start_livestream", this, channel, metadata, videoStream, audioStream);
    }

    private onWifiRssiChanged(channel: number, rssi: number): void {
        this.log.trace(`${this.constructor.name}.onWifiRssiChanged(): station: ${this.getSerial()} channel: ${channel}`);
        this.emit("parameter", this, CommandType.CMD_WIFI_CONFIG, rssi.toString(), +new Date);
    }

    public async setGuardMode(mode: GuardMode): Promise<void> {
        if (mode in GuardMode) {
            if (!this.p2p_session || !this.p2p_session.isConnected()) {
                this.log.debug(`${this.constructor.name}.setGuardMode(): P2P connection to station ${this.getSerial()} not present, establish it.`);
                await this.connect();
            }
            if (this.p2p_session) {
                if (this.p2p_session.isConnected()) {
                    this.log.debug(`${this.constructor.name}.setGuardMode(): P2P connection to station ${this.getSerial()} present, send command mode: ${mode}.`);

                    if ((isGreaterMinVersion("2.0.7.9", this.getSoftwareVersion()) && !Device.isIntegratedDeviceBySn(this.getSerial())) || Device.isSoloCameraBySn(this.getSerial())) {
                        this.log.debug(`${this.constructor.name}.setGuardMode(): Using CMD_SET_PAYLOAD for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
                        await this.p2p_session.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                            "account_id": this.hub.member.admin_user_id,
                            "cmd": CommandType.CMD_SET_ARMING,
                            "mValue3": 0,
                            "payload": {
                                "mode_type": mode,
                                "user_name": this.hub.member.nick_name
                            }
                        }), Station.CHANNEL);
                    } else {
                        this.log.debug(`${this.constructor.name}.setGuardMode(): Using CMD_SET_ARMING for station ${this.getSerial()}`);
                        await this.p2p_session.sendCommandWithInt(CommandType.CMD_SET_ARMING, mode, this.hub.member.admin_user_id, Station.CHANNEL);
                    }
                }
            }
        } else {
            this.log.error(`${this.constructor.name}.setGuardMode(): Trying to set unsupported guard mode "${mode}" for station ${this.getSerial()}`);
        }
    }

    public async getCameraInfo(): Promise<void> {
        if (!this.p2p_session || !this.p2p_session.isConnected()) {
            this.log.debug(`${this.constructor.name}.getCameraInfo(): P2P connection to station ${this.getSerial()} not present, establish it.`);
            await this.connect();
        }
        if (this.p2p_session) {
            if (this.p2p_session.isConnected()) {
                this.log.debug(`${this.constructor.name}.getCameraInfo(): P2P connection to station ${this.getSerial()} present, get device infos.`);
                await this.p2p_session.sendCommandWithInt(CommandType.CMD_CAMERA_INFO, 255, "", Station.CHANNEL);
            }
        }
    }

    public async getStorageInfo(): Promise<void> {
        if (!this.p2p_session || !this.p2p_session.isConnected()) {
            this.log.debug(`${this.constructor.name}.getStorageInfo(): P2P connection to station ${this.getSerial()} not present, establish it.`);
            await this.connect();
        }
        if (this.p2p_session) {
            if (this.p2p_session.isConnected()) {
                this.log.debug(`${this.constructor.name}.getStorageInfo(): P2P connection to station ${this.getSerial()} present, get camera info.`);
                //TODO: Verify channel! Should be 255...
                await this.p2p_session.sendCommandWithIntString(CommandType.CMD_SDINFO_EX, 0, 0, this.hub.member.admin_user_id);
            }
        }
    }

    private onAlarmMode(mode: AlarmMode): void {
        this.log.info(`Alarm mode for station ${this.getSerial()} changed to: ${AlarmMode[mode]}`);
        this.parameters[ParamType.SCHEDULE_MODE] = {
            value: mode.toString(),
            modified: +new Date
        }
        this.emit("parameter", this, ParamType.SCHEDULE_MODE, this.parameters[ParamType.SCHEDULE_MODE].value, this.parameters[ParamType.SCHEDULE_MODE].modified);
        // Trigger refresh Guard Mode
        this.getCameraInfo();
    }

    private _getDeviceSerial(channel: number): string {
        for (const device of this.hub.devices) {
            if (device.device_channel === channel)
                return device.device_sn;
        }
        return "";
    }

    private onCameraInfo(camera_info: CmdCameraInfoResponse): void {
        this.log.debug(`${this.constructor.name}.onCameraInfo(): station: ${this.getSerial()} camera_info: ${JSON.stringify(camera_info)}`);
        const devices: { [index: string]: ParameterArray; } = {};
        const timestamp = +new Date;
        camera_info.params.forEach(param => {
            if (param.dev_type === Station.CHANNEL) {
                this._updateParameter(param.param_type, { value: param.param_value, modified: timestamp });
            } else {
                const device_sn = this._getDeviceSerial(param.dev_type);
                if (device_sn !== "") {
                    if (!devices[device_sn]) {
                        devices[device_sn] = {};
                    }

                    devices[device_sn][param.param_type] = {
                        value: ParameterHelper.readValue(param.param_type, param.param_value),
                        modified: timestamp
                    };
                }
            }
        });
        Object.keys(devices).forEach(device => {
            this.emit("device_parameter", device, devices[device]);
        });
    }

    private onCommandResponse(cmd_result: CommandResult): void {
        this.log.debug(`${this.constructor.name}.onCommandResponse(): station: ${this.getSerial()} command_type: ${cmd_result.command_type} channel: ${cmd_result.channel} return_code: ${ErrorCode[cmd_result.return_code]} (${cmd_result.return_code})`);
        this.emit("p2p_command", this, cmd_result);
    }

    private onConnect(address: Address): void {
        this.resetCurrentDelay();
        this.log.info(`Connected to station ${this.getSerial()} on host ${address.host} and port ${address.port}.`);
        this.emit("connect", this);
    }

    private onDisconnect(): void {
        this.log.info(`Disconnected from station ${this.getSerial()}.`);
        this.emit("close", this);
        if (this.p2p_session)
            this.scheduleReconnect();
    }

    public getParameters(): ParameterArray {
        return this.parameters;
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
        this.log.debug(`${this.constructor.name}.scheduleReconnect(): delay: ${delay}`);
        if (!this.reconnectTimeout)
            this.reconnectTimeout = setTimeout(async () => {
                this.reconnectTimeout = undefined;
                this.connect();
            }, delay);
    }

    public async rebootHUB(): Promise<void> {
        if (!this.p2p_session || !this.p2p_session.isConnected()) {
            this.log.warn(`${this.constructor.name}.rebootHUB(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
            return;
        }
        this.log.debug(`${this.constructor.name}.rebootHUB(): P2P connection to station ${this.getSerial()} present, reboot requested.`);
        await this.p2p_session.sendCommandWithInt(CommandType.CMD_HUB_REBOOT, 0, this.hub.member.admin_user_id, Station.CHANNEL);
    }

    public async setStatusLed(device: Device, value: boolean): Promise<void> {
        //TODO: I'm not sure if other devices support this feature
        if (device.getStationSerial() === this.getSerial()) {
            if (device.isCamera2Product() || device.isIndoorCamera() || device.isSoloCameras() || device.isFloodLight()) {
                if (!this.p2p_session || !this.p2p_session.isConnected()) {
                    this.log.warn(`${this.constructor.name}.setStatusLed(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
                    return;
                }
                this.log.debug(`${this.constructor.name}.setStatusLed(): P2P connection to station ${this.getSerial()} present, set value: ${value}.`);
                await this.p2p_session.sendCommandWithIntString(CommandType.CMD_DEV_LED_SWITCH, value === true ? 1 : 0, device.getChannel(), this.hub.member.admin_user_id, "", device.getChannel());
                if (!device.isFloodLight())
                    await this.p2p_session.sendCommandWithIntString(CommandType.CMD_LIVEVIEW_LED_SWITCH, value === true ? 1 : 0, device.getChannel(), this.hub.member.admin_user_id, "", device.getChannel());
            } else {
                this.log.warn(`${this.constructor.name}.setStatusLed(): This functionality is not implemented or support by this device.`);
            }
        } else {
            this.log.warn(`${this.constructor.name}.setStatusLed(): The device ${device.getSerial()} is not managed by this station ${this.getSerial()}, no action is performed.`);
        }
    }

    public async setAutoNightVision(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() === this.getSerial()) {
            if (device.isCamera()) {
                if (!this.p2p_session || !this.p2p_session.isConnected()) {
                    this.log.warn(`${this.constructor.name}.setAutoNightVision(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
                    return;
                }
                this.log.debug(`${this.constructor.name}.setAutoNightVision(): P2P connection to station ${this.getSerial()} present, set value: ${value}.`);
                await this.p2p_session.sendCommandWithIntString(CommandType.CMD_IRCUT_SWITCH, value === true ? 1 : 0, device.getChannel(), "", "", device.getChannel());
            } else {
                this.log.warn(`${this.constructor.name}.setAutoNightVision(): This functionality is not implemented or support by this device.`);
            }
        } else {
            this.log.warn(`${this.constructor.name}.setAutoNightVision(): The device ${device.getSerial()} is not managed by this station ${this.getSerial()}, no action is performed.`);
        }
    }

    public async setAntiTheftDetection(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() === this.getSerial()) {
            if (device.isCamera2Product()) {
                if (!this.p2p_session || !this.p2p_session.isConnected()) {
                    this.log.warn(`${this.constructor.name}.setAntiTheftDetection(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
                    return;
                }
                this.log.debug(`${this.constructor.name}.setAntiTheftDetection(): P2P connection to station ${this.getSerial()} present, set value: ${value}.`);
                await this.p2p_session.sendCommandWithIntString(CommandType.CMD_EAS_SWITCH, value === true ? 1 : 0, device.getChannel(), this.hub.member.admin_user_id, "", device.getChannel());
            } else {
                this.log.warn(`${this.constructor.name}.setAntiTheftDetection(): This functionality is only enabled for Eufy Camera 2 products.`);
            }
        } else {
            this.log.warn(`${this.constructor.name}.setAntiTheftDetection(): The device ${device.getSerial()} is not managed by this station ${this.getSerial()}, no action is performed.`);
        }
    }

    public async setWatermark(device: Device, value: WatermarkSetting1 | WatermarkSetting2 | WatermarkSetting3): Promise<void> {
        if (device.getStationSerial() === this.getSerial()) {
            if (!this.p2p_session || !this.p2p_session.isConnected()) {
                this.log.warn(`${this.constructor.name}.setWatermark(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
                return;
            }
            if (device.isCamera2Product() || device.isIndoorCamera() || device.isFloodLight()) {
                if (!Object.values(WatermarkSetting3).includes(value as WatermarkSetting3)) {
                    this.log.error(`${this.constructor.name}.setWatermark(): The device ${device.getSerial()} accepts only this type of values: `, WatermarkSetting3);
                    return;
                }
                this.log.debug(`${this.constructor.name}.setWatermark(): P2P connection to station ${this.getSerial()} present, set value: ${WatermarkSetting3[value]}.`);
                await this.p2p_session.sendCommandWithIntString(CommandType.CMD_SET_DEVS_OSD, value, device.getChannel(), this.hub.member.admin_user_id, "", device.getChannel());
            } else if (device.isSoloCameras() || device.getDeviceType() === DeviceType.DOORBELL) {
                if (!Object.values(WatermarkSetting1).includes(value as WatermarkSetting1)) {
                    this.log.error(`${this.constructor.name}.setWatermark(): The device ${device.getSerial()} accepts only this type of values: `, WatermarkSetting1);
                    return;
                }
                this.log.debug(`${this.constructor.name}.setWatermark(): P2P connection to station ${this.getSerial()} present, set value: ${WatermarkSetting1[value]}.`);
                await this.p2p_session.sendCommandWithIntString(CommandType.CMD_SET_DEVS_OSD, value, 0, this.hub.member.admin_user_id, "", 0);
            } else if (device.isBatteryDoorbell() || device.isBatteryDoorbell2() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E) {
                if (!Object.values(WatermarkSetting2).includes(value as WatermarkSetting2)) {
                    this.log.error(`${this.constructor.name}.setWatermark(): The device ${device.getSerial()} accepts only this type of values: `, WatermarkSetting2);
                    return;
                }
                this.log.debug(`${this.constructor.name}.setWatermark(): P2P connection to station ${this.getSerial()} present, set value: ${WatermarkSetting2[value]}.`);
                await this.p2p_session.sendCommandWithIntString(CommandType.CMD_SET_DEVS_OSD, value, device.getChannel(), this.hub.member.admin_user_id, "", device.getChannel());
            } else {
                this.log.warn(`${this.constructor.name}.setWatermark(): This functionality is only enabled for Eufy Camera 2 or Indoor Camera products.`);
            }
        } else {
            this.log.warn(`${this.constructor.name}.setWatermark(): The device ${device.getSerial()} is not managed by this station ${this.getSerial()}, no action is performed.`);
        }
    }

    public async enableDevice(device: Device, value: boolean): Promise<void> {
        if (device.getStationSerial() === this.getSerial()) {
            if (device.isCamera()) {
                if (!this.p2p_session || !this.p2p_session.isConnected()) {
                    this.log.warn(`${this.constructor.name}.enableDevice(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
                    return;
                }

                let param_value = value === true ? 0 : 1;
                if (device.isIndoorCamera() || device.isSoloCameras() || device.getDeviceType() === DeviceType.DOORBELL)
                    param_value = value === true ? 1 : 0;

                this.log.debug(`${this.constructor.name}.enableDevice(): P2P connection to station ${this.getSerial()} present, set value: ${value}.`);
                await this.p2p_session.sendCommandWithIntString(CommandType.CMD_DEVS_SWITCH, param_value, device.getChannel(), this.hub.member.admin_user_id, "", device.getChannel());
            } else {
                this.log.warn(`${this.constructor.name}.enableDevice(): This functionality is only enabled for Eufy Camera products.`);
            }
        } else {
            this.log.warn(`${this.constructor.name}.enableDevice(): The device ${device.getSerial()} is not managed by this station ${this.getSerial()}, no action is performed.`);
        }
    }

    public async startDownload(path: string, cipher_id: number): Promise<void> {
        if (!this.p2p_session || !this.p2p_session.isConnected()) {
            this.log.warn(`${this.constructor.name}.startDownload(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
            return;
        }
        const cipher = await this.api.getCipher(cipher_id, this.hub.member.admin_user_id);
        if (cipher) {
            this.log.debug(`${this.constructor.name}.startDownload(): P2P connection to station ${this.getSerial()} present, download video path: ${path}.`);
            this.p2p_session.setDownloadRSAPrivateKeyPem(cipher.private_key);
            await this.p2p_session.sendCommandWithString(CommandType.CMD_DOWNLOAD_VIDEO, path, this.hub.member.admin_user_id, Station.CHANNEL);
        } else {
            this.log.warn(`Cancelled download of video "${path}" from Station ${this.getSerial()}, because RSA certificate couldn't be loaded.`);
        }
    }

    public async cancelDownload(device: Device): Promise<void> {
        if (device.getStationSerial() === this.getSerial()) {
            if (!this.p2p_session || !this.p2p_session.isConnected()) {
                this.log.warn(`${this.constructor.name}.cancelDownload(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
                return;
            }
            this.log.debug(`${this.constructor.name}.cancelDownload(): P2P connection to station ${this.getSerial()} present, cancel download for channel: ${device.getChannel()}.`);
            await this.p2p_session.sendCommandWithInt(CommandType.CMD_DOWNLOAD_CANCEL, device.getChannel(), this.hub.member.admin_user_id, device.getChannel());
        } else {
            this.log.warn(`${this.constructor.name}.cancelDownload(): The device ${device.getSerial()} is not managed by this station ${this.getSerial()}, no action is performed.`);
        }
    }

    public async startLivestream(device: Device): Promise<void> {
        if (device.getStationSerial() === this.getSerial()) {
            if (!this.p2p_session || !this.p2p_session.isConnected()) {
                this.log.warn(`${this.constructor.name}.startLivestream(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
                return;
            }
            this.log.debug(`${this.constructor.name}.startLivestream(): P2P connection to station ${this.getSerial()} present, start livestream for channel: ${device.getChannel()}.`);
            const rsa_key = this.p2p_session.getRSAPrivateKey();

            if (device.isDoorbell() || device.isFloodLight() || device.isSoloCameras() || device.isIndoorCamera()) {
                this.log.debug(`${this.constructor.name}.startLivestream(): Using CMD_DOORBELL_SET_PAYLOAD for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
                await this.p2p_session.sendCommandWithStringPayload(CommandType.CMD_DOORBELL_SET_PAYLOAD, JSON.stringify({
                    "commandType": 1000,
                    "data": {
                        "account_id": this.hub.member.admin_user_id,
                        "encryptkey": rsa_key?.exportKey("components-public").n.slice(1).toString("hex"),
                        "streamtype": VideoCodec.H264
                    }
                }), Station.CHANNEL);
            } else {
                if ((Device.isIntegratedDeviceBySn(this.getSerial()) || !isGreaterMinVersion("2.0.9.7", this.getSoftwareVersion())) && (!this.getSerial().startsWith("T8420") || !isGreaterMinVersion("1.0.0.25", this.getSoftwareVersion()))) {
                    this.log.debug(`${this.constructor.name}.startLivestream(): Using CMD_START_REALTIME_MEDIA for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
                    await this.p2p_session.sendCommandWithInt(CommandType.CMD_START_REALTIME_MEDIA, device.getChannel(), rsa_key?.exportKey("components-public").n.slice(1).toString("hex"), device.getChannel());
                } else {
                    this.log.debug(`${this.constructor.name}.startLivestream(): Using CMD_SET_PAYLOAD for station ${this.getSerial()} (main_sw_version: ${this.getSoftwareVersion()})`);
                    await this.p2p_session.sendCommandWithStringPayload(CommandType.CMD_SET_PAYLOAD, JSON.stringify({
                        "account_id": this.hub.member.admin_user_id,
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
        } else {
            this.log.warn(`${this.constructor.name}.startLivestream(): The device ${device.getSerial()} is not managed by this station ${this.getSerial()}, no action is performed.`);
        }
    }

    public async stopLivestream(device: Device): Promise<void> {
        if (device.getStationSerial() === this.getSerial()) {
            if (!this.p2p_session || !this.p2p_session.isConnected()) {
                this.log.warn(`${this.constructor.name}.stopLivestream(): P2P connection to station ${this.getSerial()} not present, command aborted.`);
                return;
            }
            this.log.debug(`${this.constructor.name}.stopLivestream(): P2P connection to station ${this.getSerial()} present, start livestream for channel: ${device.getChannel()}.`);
            await this.p2p_session.sendCommandWithInt(CommandType.CMD_STOP_REALTIME_MEDIA, device.getChannel(), undefined, device.getChannel());
        } else {
            this.log.warn(`${this.constructor.name}.stopLivestream(): The device ${device.getSerial()} is not managed by this station ${this.getSerial()}, no action is performed.`);
        }
    }

    public isLiveStreaming(device: Device): boolean {
        if (!this.p2p_session || !this.p2p_session.isConnected()) {
            return false
        }
        if (device.getStationSerial() !== this.getSerial())
            return false;

        return this.p2p_session.isLiveStreaming(device.getChannel());
    }

}