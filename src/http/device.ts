import { TypedEmitter } from "tiny-typed-emitter";
import { Logger } from "ts-log";

import { HTTPApi } from "./api";
import { DeviceType, ParamType } from "./types";
import { FullDeviceResponse, ResultResponse, StreamResponse } from "./models"
import { ParameterHelper } from "./parameter";
import { DeviceEvents, StringValue, ParameterArray, BooleanValue, NumberValue } from "./interfaces";
import { CommandType } from "../p2p/types";
import { getAbsoluteFilePath } from "./utils";
import { convertTimestampMs } from "../push/utils";

export abstract class Device extends TypedEmitter<DeviceEvents> {

    protected api: HTTPApi;
    protected device: FullDeviceResponse;
    protected log: Logger;

    private parameters: ParameterArray = {};

    constructor(api: HTTPApi, device: FullDeviceResponse) {
        super();
        this.api = api;
        this.device = device;
        this.log = api.getLog();
        this.update(this.device);
    }

    public getParameter(param_type: number): StringValue {
        return this.parameters[param_type];
    }

    public getParameters(): ParameterArray {
        return this.parameters;
    }

    private _updateParameter(param_type: number, param_value: StringValue): void {
        const tmp_param_value = ParameterHelper.readValue(param_type, param_value.value);
        if ((this.parameters[param_type] !== undefined && (this.parameters[param_type].value != tmp_param_value || this.parameters[param_type].timestamp < param_value.timestamp)) || this.parameters[param_type] === undefined) {
            this.parameters[param_type] = {
                value: tmp_param_value,
                timestamp: param_value.timestamp
            };
            this.emit("parameter", this, param_type, this.parameters[param_type].value, this.parameters[param_type].timestamp);
        }
    }

    public updateParameters(params: ParameterArray):void {
        Object.keys(params).forEach(paramtype => {
            const param_type = Number.parseInt(paramtype);
            this._updateParameter(param_type, params[param_type]);
        });
    }

    public update(device: FullDeviceResponse, force = false):void {
        this.device = device;
        if (force)
            this.parameters = {};
        this.device.params.forEach(param => {
            this._updateParameter(param.param_type, { value: param.param_value, timestamp: convertTimestampMs(param.update_time) });
        });
    }

    static isCamera(type: number): boolean {
        if (type == DeviceType.CAMERA ||
            type == DeviceType.CAMERA2 ||
            type == DeviceType.CAMERA_E ||
            type == DeviceType.CAMERA2C ||
            type == DeviceType.INDOOR_CAMERA ||
            type == DeviceType.INDOOR_PT_CAMERA ||
            type == DeviceType.FLOODLIGHT ||
            type == DeviceType.DOORBELL ||
            type == DeviceType.BATTERY_DOORBELL ||
            type == DeviceType.BATTERY_DOORBELL_2 ||
            type == DeviceType.CAMERA2C_PRO ||
            type == DeviceType.CAMERA2_PRO ||
            type == DeviceType.INDOOR_CAMERA_1080 ||
            type == DeviceType.INDOOR_PT_CAMERA_1080 ||
            type == DeviceType.SOLO_CAMERA ||
            type == DeviceType.SOLO_CAMERA_PRO)
            return true;
        return false;
    }

    static hasBattery(type: number): boolean {
        if (type == DeviceType.CAMERA ||
            type == DeviceType.CAMERA2 ||
            type == DeviceType.CAMERA_E ||
            type == DeviceType.CAMERA2C ||
            type == DeviceType.BATTERY_DOORBELL ||
            type == DeviceType.BATTERY_DOORBELL_2 ||
            type == DeviceType.CAMERA2C_PRO ||
            type == DeviceType.CAMERA2_PRO ||
            type == DeviceType.SOLO_CAMERA ||
            type == DeviceType.SOLO_CAMERA_PRO)
            return true;
        return false;
    }

    static isStation(type: number): boolean {
        if (type == DeviceType.STATION)
            return true;
        return false;
    }

    static isSensor(type: number): boolean {
        if (type == DeviceType.SENSOR ||
            type == DeviceType.MOTION_SENSOR)
            return true;
        return false;
    }

    static isKeyPad(type: number): boolean {
        return DeviceType.KEYPAD == type;
    }

    static isDoorbell(type: number): boolean {
        if (type == DeviceType.DOORBELL ||
            type == DeviceType.BATTERY_DOORBELL ||
            type == DeviceType.BATTERY_DOORBELL_2)
            return true;
        return false;
    }

    static isWiredDoorbell(type: number): boolean {
        if (type == DeviceType.DOORBELL)
            return true;
        return false;
    }

    static isIndoorCamera(type: number): boolean {
        if (type == DeviceType.INDOOR_CAMERA ||
            type == DeviceType.INDOOR_CAMERA_1080 ||
            type == DeviceType.INDOOR_PT_CAMERA ||
            type == DeviceType.INDOOR_PT_CAMERA_1080)
            return true;
        return false;
    }

    static isFloodLight(type: number): boolean {
        return DeviceType.FLOODLIGHT == type;
    }

    static isLock(type: number): boolean {
        return Device.isLockBasic(type) || Device.isLockAdvanced(type) || Device.isLockBasicNoFinger(type) || Device.isLockAdvancedNoFinger(type);
    }

    static isLockBasic(type: number): boolean {
        return DeviceType.LOCK_BASIC == type;
    }

    static isLockBasicNoFinger(type: number): boolean {
        return DeviceType.LOCK_BASIC_NO_FINGER == type;
    }

    static isLockAdvanced(type: number): boolean {
        return DeviceType.LOCK_ADVANCED == type;
    }

    static isLockAdvancedNoFinger(type: number): boolean {
        return DeviceType.LOCK_ADVANCED_NO_FINGER == type;
    }

    static isBatteryDoorbell(type: number): boolean {
        return DeviceType.BATTERY_DOORBELL == type;
    }

    static isBatteryDoorbell2(type: number): boolean {
        return DeviceType.BATTERY_DOORBELL_2 == type;
    }

    static isSoloCamera(type: number): boolean {
        return DeviceType.SOLO_CAMERA == type;
    }

    static isSoloCameraPro(type: number): boolean {
        return DeviceType.SOLO_CAMERA_PRO == type;
    }

    static isSoloCameras(type: number): boolean {
        return Device.isSoloCamera(type) || Device.isSoloCameraPro(type);
    }

    static isCamera2(type: number): boolean {
        //T8114
        return DeviceType.CAMERA2 == type;
    }

    static isCamera2C(type: number): boolean {
        //T8113
        return DeviceType.CAMERA2C == type;
    }

    static isCamera2Pro(type: number): boolean {
        //T8140
        return DeviceType.CAMERA2_PRO == type;
    }

    static isCamera2CPro(type: number): boolean {
        //T8142
        return DeviceType.CAMERA2C_PRO == type;
    }

    static isCamera2Product(type: number): boolean {
        return Device.isCamera2(type) || Device.isCamera2C(type) || Device.isCamera2Pro(type) || Device.isCamera2CPro(type);
    }

    static isEntrySensor(type: number): boolean {
        //T8900
        return DeviceType.SENSOR == type;
    }

    static isMotionSensor(type: number): boolean {
        return DeviceType.MOTION_SENSOR == type;
    }

    static isIntegratedDeviceBySn(sn: string): boolean {
        return sn.startsWith("T8420") || sn.startsWith("T820") || sn.startsWith("T8410") || sn.startsWith("T8400") || sn.startsWith("T8401") || sn.startsWith("T8411") || sn.startsWith("T8130") || sn.startsWith("T8131");
    }

    static isSoloCameraBySn(sn: string): boolean {
        return sn.startsWith("T8130") || sn.startsWith("T8131")
    }

    public isCamera(): boolean {
        return Device.isCamera(this.device.device_type);
    }

    public isFloodLight(): boolean {
        return DeviceType.FLOODLIGHT == this.device.device_type;
    }

    public isDoorbell(): boolean {
        return Device.isDoorbell(this.device.device_type);
    }

    public isWiredDoorbell(): boolean {
        return Device.isWiredDoorbell(this.device.device_type);
    }

    public isLock(): boolean {
        return Device.isLock(this.device.device_type);
    }

    public isLockBasic(): boolean {
        return Device.isLockBasic(this.device.device_type);
    }

    public isLockBasicNoFinger(): boolean {
        return Device.isLockBasicNoFinger(this.device.device_type);
    }

    public isLockAdvanced(): boolean {
        return Device.isLockAdvanced(this.device.device_type);
    }

    public isLockAdvancedNoFinger(): boolean {
        return Device.isLockAdvancedNoFinger(this.device.device_type);
    }

    public isBatteryDoorbell(): boolean {
        return Device.isBatteryDoorbell(this.device.device_type);
    }

    public isBatteryDoorbell2(): boolean {
        return Device.isBatteryDoorbell2(this.device.device_type);
    }

    public isSoloCamera(): boolean {
        return Device.isSoloCamera(this.device.device_type);
    }

    public isSoloCameraPro(): boolean {
        return Device.isSoloCameraPro(this.device.device_type);
    }

    public isSoloCameras(): boolean {
        return Device.isSoloCameras(this.device.device_type);
    }

    public isCamera2(): boolean {
        return Device.isCamera2(this.device.device_type);
    }

    public isCamera2C(): boolean {
        return Device.isCamera2C(this.device.device_type);
    }

    public isCamera2Pro(): boolean {
        return Device.isCamera2Pro(this.device.device_type);
    }

    public isCamera2CPro(): boolean {
        return Device.isCamera2CPro(this.device.device_type);
    }

    public isCamera2Product(): boolean {
        return Device.isCamera2Product(this.device.device_type);
    }

    public isEntrySensor(): boolean {
        return Device.isEntrySensor(this.device.device_type);
    }

    public isKeyPad(): boolean {
        return Device.isKeyPad(this.device.device_type);
    }

    public isMotionSensor(): boolean {
        return Device.isMotionSensor(this.device.device_type);
    }

    public isIndoorCamera(): boolean {
        return Device.isIndoorCamera(this.device.device_type);
    }

    public hasBattery(): boolean {
        return Device.hasBattery(this.device.device_type);
    }

    public getDeviceKey(): string {
        return this.device.station_sn + this.device.device_channel;
    }

    public getDeviceType(): number {
        return this.device.device_type;
    }

    public getHardwareVersion(): string {
        return this.device.main_hw_version;
    }

    public getSoftwareVersion(): string {
        return this.device.main_sw_version;
    }

    public getModel(): string {
        return this.device.device_model;
    }

    public getName(): string {
        return this.device.device_name;
    }

    public getSerial(): string {
        return this.device.device_sn;
    }

    public getStationSerial(): string {
        return this.device.station_sn;
    }

    public async setParameters(params: { param_type: number; param_value: any; }[]): Promise<boolean> {
        return this.api.setParameters(this.device.station_sn, this.device.device_sn, params);
    }

    public getChannel(): number {
        return this.device.device_channel;
    }

    public getStateID(state: string, level = 2): string {
        switch(level) {
            case 0:
                return `${this.getStationSerial()}.${this.getStateChannel()}`
            case 1:
                return `${this.getStationSerial()}.${this.getStateChannel()}.${this.getSerial()}`
            default:
                if (state)
                    return `${this.getStationSerial()}.${this.getStateChannel()}.${this.getSerial()}.${state}`
                throw new Error("No state value passed.");
        }
    }

    public abstract getStateChannel(): string;

    public getWifiRssi(): NumberValue {
        const param = this.getParameter(CommandType.CMD_GET_WIFI_RSSI);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

    public getStoragePath(filename: string): string {
        return getAbsoluteFilePath(this.device.device_type, this.device.device_channel, filename);
    }

    public isEnabled(): BooleanValue {
        let param = this.getParameter(99904);
        if (this.isIndoorCamera() || this.isSoloCameras() || this.isWiredDoorbell() || this.isFloodLight()) {
            param = this.getParameter(ParamType.OPEN_DEVICE);
            return { value: param !== undefined ? (param.value === "true" ? true : false) : false, timestamp: param !== undefined ? param.timestamp : 0 };
        }
        return { value: param !== undefined ? (param.value === "0" ? true : false) : false, timestamp: param !== undefined ? param.timestamp : 0 };
    }

}

export class Camera extends Device {

    private is_streaming = false;

    public getStateChannel(): string {
        return "cameras";
    }

    public getLastCameraImageURL(): StringValue {
        return { value: this.device.cover_path, timestamp: this.device.cover_time ? convertTimestampMs(this.device.cover_time) : 0 };
    }

    public getMACAddress(): string {
        return this.device.wifi_mac;
    }

    public async startDetection(): Promise<void> {
        // Start camera detection.
        await this.setParameters([{ param_type: ParamType.DETECT_SWITCH, param_value: 1 }]).catch(error => {
            this.log.error(`${this.constructor.name}.startDetection(): error: ${JSON.stringify(error)}`);
        });
    }

    public async startStream(): Promise<string> {
        // Start the camera stream and return the RTSP URL.
        try {
            const response = await this.api.request("post", "web/equipment/start_stream", {
                device_sn: this.device.device_sn,
                station_sn: this.device.station_sn,
                proto: 2
            }).catch(error => {
                this.log.error(`${this.constructor.name}.startStream(): error: ${JSON.stringify(error)}`);
                return error;
            });
            this.log.debug(`${this.constructor.name}.startStream(): Response: ${JSON.stringify(response.data)}`);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    const dataresult: StreamResponse = result.data;
                    this.is_streaming = true;
                    this.log.info(`Livestream of camera ${this.device.device_sn} started.`);
                    return dataresult.url;
                } else
                    this.log.error(`${this.constructor.name}.startStream(): Response code not ok (code: ${result.code} msg: ${result.msg})`);
            } else {
                this.log.error(`${this.constructor.name}.startStream(): Status return code not 200 (status: ${response.status} text: ${response.statusText}`);
            }
        } catch (error) {
            this.log.error(`${this.constructor.name}.startStream(): error: ${error}`);
        }
        return "";
    }

    public async stopDetection(): Promise<void> {
        // Stop camera detection.
        await this.setParameters([{ param_type: ParamType.DETECT_SWITCH, param_value: 0 }])
    }

    public async stopStream(): Promise<void> {
        // Stop the camera stream.
        try {
            const response = await this.api.request("post", "web/equipment/stop_stream", {
                device_sn: this.device.device_sn,
                station_sn: this.device.station_sn,
                proto: 2
            }).catch(error => {
                this.log.error(`${this.constructor.name}.stopStream(): error: ${JSON.stringify(error)}`);
                return error;
            });
            this.log.debug(`${this.constructor.name}.stopStream(): Response: ${JSON.stringify(response.data)}`);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    this.is_streaming = false;
                    this.log.info(`Livestream of camera ${this.device.device_sn} stopped.`);
                } else {
                    this.log.error(`${this.constructor.name}.stopStream(): Response code not ok (code: ${result.code} msg: ${result.msg})`);
                }
            } else {
                this.log.error(`${this.constructor.name}.stopStream(): Status return code not 200 (status: ${response.status} text: ${response.statusText}`);
            }
        } catch (error) {
            this.log.error(`${this.constructor.name}.stopStream(): error: ${error}`);
        }
    }

    public getState(): NumberValue {
        const param = this.getParameter(CommandType.CMD_GET_DEV_STATUS);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

    public isStreaming(): boolean {
        return this.is_streaming;
    }

    public async close(): Promise<void> {
        //TODO: Stop other things if implemented such as detection feature
        if (this.is_streaming)
            await this.stopStream().catch();
    }

    public getLastChargingDays(): number {
        return this.device.charging_days;
    }

    public getLastChargingFalseEvents(): number {
        return this.device.charging_missing;
    }

    public getLastChargingRecordedEvents(): number {
        return this.device.charging_reserve;
    }

    public getLastChargingTotalEvents(): number {
        return this.device.charing_total;
    }

    public getBatteryValue(): NumberValue {
        const param = this.getParameter(CommandType.CMD_GET_BATTERY);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

    public getBatteryTemperature(): NumberValue {
        const param = this.getParameter(CommandType.CMD_GET_BATTERY_TEMP);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

    public isMotionDetectionEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_PIR_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isLedEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_DEV_LED_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isAutoNightVisionEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_IRCUT_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isRTSPStreamEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_NAS_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isAntiTheftDetectionEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_EAS_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public getWatermark(): NumberValue {
        const param = this.getParameter(CommandType.CMD_SET_DEVS_OSD);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

}

export class SoloCamera extends Camera {

    public isLedEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_INDOOR_LED_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isMotionDetectionEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

}

export class IndoorCamera extends Camera {

    public isLedEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_INDOOR_LED_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isMotionDetectionEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isPetDetectionEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_INDOOR_DET_SET_PET_ENABLE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isSoundDetectionEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_INDOOR_DET_SET_SOUND_DETECT_ENABLE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

}

export class DoorbellCamera extends Camera {

    public isLedEnabled(): BooleanValue {
        const param = this.getParameter(ParamType.DOORBELL_LED_NIGHT_MODE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isAutoNightVisionEnabled(): BooleanValue {
        const param = this.getParameter(ParamType.NIGHT_VISUAL);
        return { value: param ? (param.value === "true" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isMotionDetectionEnabled(): BooleanValue {
        const param = this.getParameter(ParamType.DETECT_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

}

export class BatteryDoorbellCamera extends Camera {

    public isLedEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE);
        return { value: param ? (param.value === "0" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

}

export class FloodlightCamera extends Camera {

    public isLedEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_INDOOR_LED_SWITCH);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public isMotionDetectionEnabled(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

}

export class Sensor extends Device {

    public getStateChannel(): string {
        return "sensors";
    }

    public getState(): NumberValue {
        const param = this.getParameter(CommandType.CMD_GET_DEV_STATUS);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

}

export class EntrySensor extends Sensor {

    public isSensorOpen(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_ENTRY_SENSOR_STATUS);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public getSensorChangeTime(): NumberValue {
        const param = this.getParameter(CommandType.CMD_ENTRY_SENSOR_CHANGE_TIME);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

    public isBatteryLow(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_ENTRY_SENSOR_BAT_STATE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

}

export class MotionSensor extends Sensor {

    public static readonly MOTION_COOLDOWN_MS = 120000;

    //TODO: CMD_MOTION_SENSOR_ENABLE_LED = 1607
    //TODO: CMD_MOTION_SENSOR_ENTER_USER_TEST_MODE = 1613
    //TODO: CMD_MOTION_SENSOR_EXIT_USER_TEST_MODE = 1610
    //TODO: CMD_MOTION_SENSOR_SET_CHIRP_TONE = 1611
    //TODO: CMD_MOTION_SENSOR_SET_PIR_SENSITIVITY = 1609
    //TODO: CMD_MOTION_SENSOR_WORK_MODE = 1612

    public static isMotionDetected(millis: number): { motion: boolean, cooldown_ms: number} {
        const delta = new Date().getUTCMilliseconds() - millis;
        if (delta < this.MOTION_COOLDOWN_MS) {
            return { motion: true, cooldown_ms: this.MOTION_COOLDOWN_MS - delta};
        }
        return { motion: false, cooldown_ms: 0};
    }

    public isMotionDetected(): { motion: boolean, cooldown_ms: number} {
        return MotionSensor.isMotionDetected(this.getMotionSensorPIREvent().value);
    }

    public getMotionSensorPIREvent(): NumberValue {
        //TODO: Implement P2P Control Event over active station connection
        const param = this.getParameter(CommandType.CMD_MOTION_SENSOR_PIR_EVT);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

    public isBatteryLow(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_MOTION_SENSOR_BAT_STATE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

}

export class Lock extends Device {

    public getStateChannel(): string {
        return "locks";
    }

}

export class Keypad extends Device {

    //TODO: CMD_KEYPAD_BATTERY_CHARGER_STATE = 1655
    //TODO: CMD_KEYPAD_BATTERY_TEMP_STATE = 1654
    //TODO: CMD_KEYPAD_GET_PASSWORD = 1657
    //TODO: CMD_KEYPAD_GET_PASSWORD_LIST = 1662
    //TODO: CMD_KEYPAD_IS_PSW_SET = 1670
    //TODO: CMD_KEYPAD_PSW_OPEN = 1664
    //TODO: CMD_KEYPAD_SET_CUSTOM_MAP = 1660
    //TODO: CMD_KEYPAD_SET_PASSWORD = 1650

    public getStateChannel(): string {
        return "keypads";
    }

    public getState(): NumberValue {
        const param = this.getParameter(CommandType.CMD_GET_DEV_STATUS);
        return { value: Number.parseInt(param ? param.value : "0"), timestamp: param ? param.timestamp : 0 };
    }

    public isBatteryLow(): BooleanValue {
        const param = this.getParameter(CommandType.CMD_KEYPAD_BATTERY_CAP_STATE);
        return { value: param ? (param.value === "1" ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

}

export class UnknownDevice extends Device {

    public getStateChannel(): string {
        return "unknown";
    }

}