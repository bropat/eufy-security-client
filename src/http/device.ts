import { TypedEmitter } from "tiny-typed-emitter";
import { Logger } from "ts-log";

import { HTTPApi } from "./api";
import { DeviceEvent, DeviceProperties, DeviceType, GenericDeviceProperties, ParamType, PropertyName, SupportedFeature, SupportedFeatures } from "./types";
import { FullDeviceResponse, ResultResponse, StreamResponse } from "./models"
import { ParameterHelper } from "./parameter";
import { DeviceEvents, PropertyValue, PropertyValues, PropertyMetadataAny, IndexedProperty, RawValues, RawValue } from "./interfaces";
import { CommandType, ESLAnkerBleConstant } from "../p2p/types";
import { getAbsoluteFilePath } from "./utils";
import { convertTimestampMs } from "../push/utils";
import { eslTimestamp } from "../p2p/utils";
import { CusPushEvent, DoorbellPushEvent, IndoorPushEvent, PushMessage } from "../push";
import { isEmpty } from "../utils";
import { InvalidPropertyError } from "./error";

export abstract class Device extends TypedEmitter<DeviceEvents> {

    protected api: HTTPApi;
    protected rawDevice: FullDeviceResponse;
    protected log: Logger;
    protected eventTimeouts = new Map<DeviceEvent, NodeJS.Timeout>();

    protected properties: PropertyValues = {};
    private rawProperties: RawValues = {};
    private ready = false;

    constructor(api: HTTPApi, device: FullDeviceResponse) {
        super();
        this.api = api;
        this.rawDevice = device;
        this.log = api.getLog();
        this.update(this.rawDevice);
        this.ready = true;
    }

    public getRawDevice(): FullDeviceResponse {
        return this.rawDevice;
    }

    public update(device: FullDeviceResponse): void {
        this.rawDevice = device;
        const metadata = this.getPropertiesMetadata();
        for(const property of Object.values(metadata)) {
            if (this.rawDevice[property.key] !== undefined && typeof property.key === "string") {
                let timestamp = 0;
                switch(property.key) {
                    case "cover_path":
                        if (this.rawDevice.cover_time !== undefined) {
                            timestamp = convertTimestampMs(this.rawDevice.cover_time);
                            break;
                        }
                    case "main_sw_version":
                        if (this.rawDevice.main_sw_time !== undefined) {
                            timestamp = convertTimestampMs(this.rawDevice.main_sw_time);
                            break;
                        }
                    case "sec_sw_version":
                        if (this.rawDevice.sec_sw_time !== undefined) {
                            timestamp = convertTimestampMs(this.rawDevice.sec_sw_time);
                            break;
                        }
                    default:
                        if (this.rawDevice.update_time !== undefined) {
                            timestamp = convertTimestampMs(this.rawDevice.update_time);
                        }
                        break;
                }
                this.updateProperty(property.name, { value: this.rawDevice[property.key], timestamp: timestamp });
            }
        }
        this.rawDevice.params.forEach(param => {
            this.updateRawProperty(param.param_type, { value: param.param_value, timestamp: convertTimestampMs(param.update_time) });
        });
        this.log.debug("Normalized Properties", { deviceSN: this.getSerial(), properties: this.properties });
    }

    protected updateProperty(name: string, value: PropertyValue): boolean {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected processParameterChanged(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        // nothing to do
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
            if (this.ready)
                this.emit("raw property changed", this, type, this.rawProperties[type].value, this.rawProperties[type].timestamp);

            const metadata = this.getPropertiesMetadata();

            for(const property of Object.values(metadata)) {
                if (property.key === type) {
                    const oldValue = this.properties[property.name];
                    this.properties[property.name] = this.convertRawPropertyValue(property, this.rawProperties[type]);
                    if (this.ready)
                        this.emit("property changed", this, property.name, this.properties[property.name]);

                    this.processParameterChanged(property, oldValue, this.properties[property.name]);
                    break;
                }
            }
            return true;
        }
        return false;
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: RawValue): PropertyValue {
        try {
            if (property.key === ParamType.PRIVATE_MODE || property.key === ParamType.OPEN_DEVICE) {
                if (this.isIndoorCamera() || this.isSoloCameras() || this.isWiredDoorbell() || this.isFloodLight()) {
                    return { value: value !== undefined ? (value.value === "true" ? true : false) : false, timestamp: value !== undefined ? value.timestamp : 0 };
                }
                return { value: value !== undefined ? (value.value === "0" ? true : false) : false, timestamp: value !== undefined ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public getSupportedFeatures(): Array<SupportedFeature> {
        return SupportedFeatures[this.getDeviceType()];
    }

    public isFeatureSupported(feature: SupportedFeature): boolean {
        return SupportedFeatures[this.getDeviceType()].includes(feature);
    }

    public getPropertyMetadata(name: string): PropertyMetadataAny {
        const property = this.getPropertiesMetadata()[name];
        if (property !== undefined)
            return property;
        throw new InvalidPropertyError(`Property ${name} invalid`);
    }

    public getPropertyValue(name: string): PropertyValue {
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
        const metadata = DeviceProperties[this.getDeviceType()];
        if (metadata === undefined)
            return GenericDeviceProperties;
        return metadata;
    }

    public hasProperty(name: string): boolean {
        return this.getPropertiesMetadata()[name] !== undefined;
    }

    public processPushNotification(_message: PushMessage, _eventDurationSeconds: number): void {
        // Nothing to do
    }

    public destroy(): void {
        this.eventTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.eventTimeouts.clear();
    }

    protected clearEventTimeout(eventType: DeviceEvent): void {
        const timeout = this.eventTimeouts.get(eventType);
        if (timeout !== undefined) {
            clearTimeout(timeout);
            this.eventTimeouts.delete(eventType);
        }
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
        return Device.isCamera(this.rawDevice.device_type);
    }

    public isFloodLight(): boolean {
        return DeviceType.FLOODLIGHT == this.rawDevice.device_type;
    }

    public isDoorbell(): boolean {
        return Device.isDoorbell(this.rawDevice.device_type);
    }

    public isWiredDoorbell(): boolean {
        return Device.isWiredDoorbell(this.rawDevice.device_type);
    }

    public isLock(): boolean {
        return Device.isLock(this.rawDevice.device_type);
    }

    public isLockBasic(): boolean {
        return Device.isLockBasic(this.rawDevice.device_type);
    }

    public isLockBasicNoFinger(): boolean {
        return Device.isLockBasicNoFinger(this.rawDevice.device_type);
    }

    public isLockAdvanced(): boolean {
        return Device.isLockAdvanced(this.rawDevice.device_type);
    }

    public isLockAdvancedNoFinger(): boolean {
        return Device.isLockAdvancedNoFinger(this.rawDevice.device_type);
    }

    public isBatteryDoorbell(): boolean {
        return Device.isBatteryDoorbell(this.rawDevice.device_type);
    }

    public isBatteryDoorbell2(): boolean {
        return Device.isBatteryDoorbell2(this.rawDevice.device_type);
    }

    public isSoloCamera(): boolean {
        return Device.isSoloCamera(this.rawDevice.device_type);
    }

    public isSoloCameraPro(): boolean {
        return Device.isSoloCameraPro(this.rawDevice.device_type);
    }

    public isSoloCameras(): boolean {
        return Device.isSoloCameras(this.rawDevice.device_type);
    }

    public isCamera2(): boolean {
        return Device.isCamera2(this.rawDevice.device_type);
    }

    public isCamera2C(): boolean {
        return Device.isCamera2C(this.rawDevice.device_type);
    }

    public isCamera2Pro(): boolean {
        return Device.isCamera2Pro(this.rawDevice.device_type);
    }

    public isCamera2CPro(): boolean {
        return Device.isCamera2CPro(this.rawDevice.device_type);
    }

    public isCamera2Product(): boolean {
        return Device.isCamera2Product(this.rawDevice.device_type);
    }

    public isEntrySensor(): boolean {
        return Device.isEntrySensor(this.rawDevice.device_type);
    }

    public isKeyPad(): boolean {
        return Device.isKeyPad(this.rawDevice.device_type);
    }

    public isMotionSensor(): boolean {
        return Device.isMotionSensor(this.rawDevice.device_type);
    }

    public isIndoorCamera(): boolean {
        return Device.isIndoorCamera(this.rawDevice.device_type);
    }

    public hasBattery(): boolean {
        return Device.hasBattery(this.rawDevice.device_type);
    }

    public getDeviceKey(): string {
        return this.rawDevice.station_sn + this.rawDevice.device_channel;
    }

    public getDeviceType(): number {
        return this.rawDevice.device_type;
    }

    public getHardwareVersion(): string {
        return this.rawDevice.main_hw_version;
    }

    public getSoftwareVersion(): string {
        return this.rawDevice.main_sw_version;
    }

    public getModel(): string {
        return this.rawDevice.device_model;
    }

    public getName(): string {
        return this.rawDevice.device_name;
    }

    public getSerial(): string {
        return this.rawDevice.device_sn;
    }

    public getStationSerial(): string {
        return this.rawDevice.station_sn;
    }

    public async setParameters(params: { paramType: number; paramValue: any; }[]): Promise<boolean> {
        return this.api.setParameters(this.rawDevice.station_sn, this.rawDevice.device_sn, params);
    }

    public getChannel(): number {
        return this.rawDevice.device_channel;
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

    public getWifiRssi(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceWifiRSSI);
    }

    public getStoragePath(filename: string): string {
        return getAbsoluteFilePath(this.rawDevice.device_type, this.rawDevice.device_channel, filename);
    }

    public isEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceEnabled);
    }

}

export class Camera extends Device {

    private _isStreaming = false;

    constructor(api: HTTPApi, device: FullDeviceResponse) {
        super(api, device);

        this.properties[PropertyName.DeviceMotionDetected] = { value: false, timestamp: 0 };
        this.properties[PropertyName.DevicePersonDetected] = { value: false, timestamp: 0 };
        this.properties[PropertyName.DevicePersonName] = { value: "", timestamp: 0 };
    }

    public getStateChannel(): string {
        return "cameras";
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_GET_WIFI_RSSI:
                case CommandType.CMD_GET_DEV_STATUS:
                case CommandType.CMD_GET_BATTERY:
                case CommandType.CMD_GET_BATTERY_TEMP:
                    return { value: Number.parseInt(value !== undefined ? value.value as string : "0"), timestamp: value ? value.timestamp : 0 };
                case CommandType.CMD_SET_DEVS_OSD:
                    //TODO: Check other devices with different watermark settings!
                    return { value: Number.parseInt(value !== undefined ? value.value as string : "0"), timestamp: value ? value.timestamp : 0 };
                case CommandType.CMD_PIR_SWITCH:
                case CommandType.CMD_DEV_LED_SWITCH:
                case CommandType.CMD_IRCUT_SWITCH:
                case CommandType.CMD_NAS_SWITCH:
                case CommandType.CMD_EAS_SWITCH:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public getLastCameraImageURL(): PropertyValue {
        return this.getPropertyValue(PropertyName.DevicePictureUrl);
    }

    public getMACAddress(): string {
        return this.rawDevice.wifi_mac;
    }

    public async startDetection(): Promise<void> {
        // Start camera detection.
        await this.setParameters([{ paramType: ParamType.DETECT_SWITCH, paramValue: 1 }]).catch(error => {
            this.log.error("Error:", error);
        });
    }

    public async startStream(): Promise<string> {
        // Start the camera stream and return the RTSP URL.
        try {
            const response = await this.api.request("post", "web/equipment/start_stream", {
                device_sn: this.rawDevice.device_sn,
                station_sn: this.rawDevice.station_sn,
                proto: 2
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    const dataresult: StreamResponse = result.data;
                    this._isStreaming = true;
                    this.log.info(`Livestream of camera ${this.rawDevice.device_sn} started`);
                    return dataresult.url;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return "";
    }

    public async stopDetection(): Promise<void> {
        // Stop camera detection.
        await this.setParameters([{ paramType: ParamType.DETECT_SWITCH, paramValue: 0 }])
    }

    public async stopStream(): Promise<void> {
        // Stop the camera stream.
        try {
            const response = await this.api.request("post", "web/equipment/stop_stream", {
                device_sn: this.rawDevice.device_sn,
                station_sn: this.rawDevice.station_sn,
                proto: 2
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    this._isStreaming = false;
                    this.log.info(`Livestream of camera ${this.rawDevice.device_sn} stopped`);
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
    }

    public getState(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceState);
    }

    public isStreaming(): boolean {
        return this._isStreaming;
    }

    public async close(): Promise<void> {
        //TODO: Stop other things if implemented such as detection feature
        if (this._isStreaming)
            await this.stopStream().catch();
    }

    public getLastChargingDays(): number {
        return this.rawDevice.charging_days;
    }

    public getLastChargingFalseEvents(): number {
        return this.rawDevice.charging_missing;
    }

    public getLastChargingRecordedEvents(): number {
        return this.rawDevice.charging_reserve;
    }

    public getLastChargingTotalEvents(): number {
        return this.rawDevice.charing_total;
    }

    public getBatteryValue(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBattery);
    }

    public getBatteryTemperature(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBatteryTemp);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isAutoNightVisionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceAutoNightvision);
    }

    public isRTSPStreamEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceRTSPStream);
    }

    public isAntiTheftDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceAntitheftDetection);
    }

    public getWatermark(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceWatermark);
    }

    public isMotionDetected(): boolean {
        return this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean;
    }

    public isPersonDetected(): boolean {
        return this.getPropertyValue(PropertyName.DevicePersonDetected).value as boolean;
    }

    public getDetectedPerson(): string {
        return this.getPropertyValue(PropertyName.DevicePersonName).value as string;
    }

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.SECURITY && message.device_sn === this.getSerial()) {
                try {
                    if (message.fetch_id !== undefined) {
                        // Person or someone identified
                        this.updateProperty(PropertyName.DevicePersonDetected, { value: true, timestamp: message.event_time });
                        this.updateProperty(PropertyName.DevicePersonName, { value: !isEmpty(message.person_name) ? message.person_name! : "Unknown", timestamp: message.event_time });
                        if (!isEmpty (message.pic_url))
                            this.updateProperty(PropertyName.DevicePictureUrl, { value: message.pic_url, timestamp: message.event_time})
                        if (message.push_count === 1 || message.push_count === undefined)
                            this.emit("person detected", this, this.getPropertyValue(PropertyName.DevicePersonDetected).value as boolean, this.getPropertyValue(PropertyName.DevicePersonName).value as string);

                        this.clearEventTimeout(DeviceEvent.PersonDetected);
                        this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                            const timestamp = new Date().getTime();
                            this.updateProperty(PropertyName.DevicePersonDetected, { value: false, timestamp: timestamp });
                            this.updateProperty(PropertyName.DevicePersonName, { value: "", timestamp: timestamp });
                            this.emit("person detected", this, this.getPropertyValue(PropertyName.DevicePersonDetected).value as boolean, this.getPropertyValue(PropertyName.DevicePersonName).value as string);
                            this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                        }, eventDurationSeconds * 1000));
                    } else {
                        // Motion detected
                        this.updateProperty(PropertyName.DeviceMotionDetected, { value: true, timestamp: message.event_time });
                        if (!isEmpty (message.pic_url))
                            this.updateProperty(PropertyName.DevicePictureUrl, { value: message.pic_url, timestamp: message.event_time})
                        if (message.push_count === 1 || message.push_count === undefined)
                            this.emit("motion detected", this, this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean);
                        this.clearEventTimeout(DeviceEvent.MotionDetected);
                        this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                            this.updateProperty(PropertyName.DeviceMotionDetected, { value: false, timestamp: new Date().getTime() });
                            this.emit("motion detected", this, this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean);
                            this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                        }, eventDurationSeconds * 1000));
                    }
                } catch (error) {
                    this.log.debug(`CusPushEvent.SECURITY - Device: ${message.device_sn} Error:`, error);
                }
            }
        }
    }

}

export class SoloCamera extends Camera {

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_INDOOR_LED_SWITCH:
                case CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

}

export class IndoorCamera extends Camera {

    constructor(api: HTTPApi, device: FullDeviceResponse) {
        super(api, device);

        this.properties[PropertyName.DevicePetDetected] = { value: false, timestamp: 0 };
        this.properties[PropertyName.DeviceSoundDetected] = { value: false, timestamp: 0 };
        this.properties[PropertyName.DeviceCryingDetected] = { value: "", timestamp: 0 };
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_INDOOR_LED_SWITCH:
                case CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE:
                case CommandType.CMD_INDOOR_DET_SET_PET_ENABLE:
                case CommandType.CMD_INDOOR_DET_SET_SOUND_DETECT_ENABLE:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

    public isPetDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DevicePetDetection);
    }

    public isSoundDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceSoundDetection);
    }

    public isPetDetected(): boolean {
        return this.getPropertyValue(PropertyName.DevicePetDetected).value as boolean;
    }

    public isSoundDetected(): boolean {
        return this.getPropertyValue(PropertyName.DeviceSoundDetected).value as boolean;
    }

    public isCryingDetected(): boolean {
        return this.getPropertyValue(PropertyName.DeviceCryingDetected).value as boolean;
    }

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    switch (message.event_type) {
                        case IndoorPushEvent.MOTION_DETECTION:
                            this.updateProperty(PropertyName.DeviceMotionDetected, { value: true, timestamp: message.event_time });
                            if (!isEmpty (message.pic_url))
                                this.updateProperty(PropertyName.DevicePictureUrl, { value: message.pic_url, timestamp: message.event_time})
                            if (message.push_count === 1 || message.push_count === undefined)
                                this.emit("motion detected", this, this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean);
                            this.clearEventTimeout(DeviceEvent.MotionDetected);
                            this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceMotionDetected, { value: false, timestamp: new Date().getTime() });
                                this.emit("motion detected", this, this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean);
                                this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.FACE_DETECTION:
                            this.updateProperty(PropertyName.DevicePersonDetected, { value: true, timestamp: message.event_time });
                            this.updateProperty(PropertyName.DevicePersonName, { value: !isEmpty(message.person_name) ? message.person_name! : "Unknown", timestamp: message.event_time });
                            if (!isEmpty (message.pic_url))
                                this.updateProperty(PropertyName.DevicePictureUrl, { value: message.pic_url, timestamp: message.event_time})
                            if (message.push_count === 1 || message.push_count === undefined)
                                this.emit("person detected", this, this.getPropertyValue(PropertyName.DevicePersonDetected).value as boolean, this.getPropertyValue(PropertyName.DevicePersonName).value as string);
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                const timestamp = new Date().getTime();
                                this.updateProperty(PropertyName.DevicePersonDetected, { value: false, timestamp: timestamp });
                                this.updateProperty(PropertyName.DevicePersonName, { value: "", timestamp: timestamp });
                                this.emit("person detected", this, this.getPropertyValue(PropertyName.DevicePersonDetected).value as boolean, this.getPropertyValue(PropertyName.DevicePersonName).value as string);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.CRYING_DETECTION:
                            this.updateProperty(PropertyName.DeviceCryingDetected, { value: true, timestamp: message.event_time });
                            if (message.push_count === 1 || message.push_count === undefined)
                                this.emit("crying detected", this, this.getPropertyValue(PropertyName.DeviceCryingDetected).value as boolean);
                            this.clearEventTimeout(DeviceEvent.CryingDetected);
                            this.eventTimeouts.set(DeviceEvent.CryingDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceCryingDetected, { value: false, timestamp: new Date().getTime() });
                                this.emit("crying detected", this, this.getPropertyValue(PropertyName.DeviceCryingDetected).value as boolean);
                                this.eventTimeouts.delete(DeviceEvent.CryingDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.SOUND_DETECTION:
                            this.updateProperty(PropertyName.DeviceSoundDetected, { value: true, timestamp: message.event_time });
                            if (message.push_count === 1 || message.push_count === undefined)
                                this.emit("sound detected", this, this.getPropertyValue(PropertyName.DeviceSoundDetected).value as boolean);
                            this.clearEventTimeout(DeviceEvent.SoundDetected);
                            this.eventTimeouts.set(DeviceEvent.SoundDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceSoundDetected, { value: false, timestamp: new Date().getTime() });
                                this.emit("sound detected", this, this.getPropertyValue(PropertyName.DeviceSoundDetected).value as boolean);
                                this.eventTimeouts.delete(DeviceEvent.SoundDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.PET_DETECTION:
                            this.updateProperty(PropertyName.DevicePetDetected, { value: true, timestamp: message.event_time });
                            if (!isEmpty (message.pic_url))
                                this.updateProperty(PropertyName.DevicePictureUrl, { value: message.pic_url, timestamp: message.event_time})
                            if (message.push_count === 1 || message.push_count === undefined)
                                this.emit("pet detected", this, this.getPropertyValue(PropertyName.DevicePetDetected).value as boolean);
                            this.clearEventTimeout(DeviceEvent.PetDetected);
                            this.eventTimeouts.set(DeviceEvent.PetDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePetDetected, { value: false, timestamp: new Date().getTime() });
                                this.emit("pet detected", this, this.getPropertyValue(PropertyName.DevicePetDetected).value as boolean);
                                this.eventTimeouts.delete(DeviceEvent.PetDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        default:
                            this.log.debug("Unhandled indoor camera push event", message);
                            break;
                    }
                } catch (error) {
                    this.log.debug(`IndoorPushEvent - Device: ${message.device_sn} Error:`, error);
                }
            }
        }
    }

    public destroy(): void {
        super.destroy();
    }

}

export class DoorbellCamera extends Camera {

    constructor(api: HTTPApi, device: FullDeviceResponse) {
        super(api, device);

        this.properties[PropertyName.DeviceRinging] = { value: false, timestamp: 0 };
    }

    public isRinging(): boolean {
        return this.getPropertyValue(PropertyName.DeviceRinging).value as boolean;
    }

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    switch (message.event_type) {
                        case DoorbellPushEvent.MOTION_DETECTION:
                            this.updateProperty(PropertyName.DeviceMotionDetected, { value: true, timestamp: message.event_time });
                            if (!isEmpty (message.pic_url))
                                this.updateProperty(PropertyName.DevicePictureUrl, { value: message.pic_url, timestamp: message.event_time})
                            if (message.push_count === 1 || message.push_count === undefined)
                                this.emit("motion detected", this, this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean);
                            this.clearEventTimeout(DeviceEvent.MotionDetected);
                            this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceMotionDetected, { value: false, timestamp: new Date().getTime() });
                                this.emit("motion detected", this, this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean);
                                this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case DoorbellPushEvent.FACE_DETECTION:
                            this.updateProperty(PropertyName.DevicePersonDetected, { value: true, timestamp: message.event_time });
                            this.updateProperty(PropertyName.DevicePersonName, { value: !isEmpty(message.person_name) ? message.person_name! : "Unknown", timestamp: message.event_time });
                            if (!isEmpty (message.pic_url))
                                this.updateProperty(PropertyName.DevicePictureUrl, { value: message.pic_url, timestamp: message.event_time})
                            if (message.push_count === 1 || message.push_count === undefined)
                                this.emit("person detected", this, this.getPropertyValue(PropertyName.DevicePersonDetected).value as boolean, this.getPropertyValue(PropertyName.DevicePersonName).value as string);
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                const timestamp = new Date().getTime();
                                this.updateProperty(PropertyName.DevicePersonDetected, { value: false, timestamp: timestamp });
                                this.updateProperty(PropertyName.DevicePersonName, { value: "", timestamp: timestamp });
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case DoorbellPushEvent.PRESS_DOORBELL:
                            this.updateProperty(PropertyName.DeviceRinging, { value: true, timestamp: message.event_time });
                            if (message.push_count === 1 || message.push_count === undefined)
                                this.emit("rings", this, this.getPropertyValue(PropertyName.DeviceRinging).value as boolean);
                            this.clearEventTimeout(DeviceEvent.Ringing);
                            this.eventTimeouts.set(DeviceEvent.Ringing, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceRinging, { value: false, timestamp: new Date().getTime() });
                                this.emit("rings", this, this.getPropertyValue(PropertyName.DeviceRinging).value as boolean);
                                this.eventTimeouts.delete(DeviceEvent.Ringing);
                            }, eventDurationSeconds * 1000));
                            break;
                        default:
                            this.log.debug("Unhandled doorbell push event", message);
                            break;
                    }
                } catch (error) {
                    this.log.debug(`DoorbellPushEvent - Device: ${message.device_sn} Error:`, error);
                }
            }
        }
    }

}

export class WiredDoorbellCamera extends DoorbellCamera {

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case ParamType.DOORBELL_LED_NIGHT_MODE:
                case ParamType.DETECT_SWITCH:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
                case ParamType.NIGHT_VISUAL:
                    return { value: value !== undefined ? (value.value === "true" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isAutoNightVisionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceAutoNightvision);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

}

export class BatteryDoorbellCamera extends DoorbellCamera {

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE:
                    return { value: value !== undefined ? (value.value === "0" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

}

export class FloodlightCamera extends Camera {

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_INDOOR_LED_SWITCH:
                case CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

}

export class Sensor extends Device {

    public getStateChannel(): string {
        return "sensors";
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_GET_DEV_STATUS:
                    return { value: Number.parseInt(value !== undefined ? value.value as string : "0"), timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public getState(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceState);
    }

}

export class EntrySensor extends Sensor {

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_ENTRY_SENSOR_STATUS:
                case CommandType.CMD_ENTRY_SENSOR_BAT_STATE:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
                case CommandType.CMD_ENTRY_SENSOR_CHANGE_TIME:
                    return { value: Number.parseInt(value !== undefined ? value.value as string : "0"), timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public isSensorOpen(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceSensorOpen);
    }

    public getSensorChangeTime(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceSensorChangeTime);
    }

    public isBatteryLow(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBatteryLow);
    }

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.DOOR_SENSOR && message.device_sn === this.getSerial()) {
                try{
                    if (message.sensor_open !== undefined) {
                        this.updateRawProperty(CommandType.CMD_ENTRY_SENSOR_STATUS, { value: message.sensor_open ? "1" : "0", timestamp: convertTimestampMs(message.event_time) });
                        this.emit("open", this, message.sensor_open);
                    }
                } catch (error) {
                    this.log.debug(`CusPushEvent.DOOR_SENSOR - Device: ${message.device_sn} Error:`, error);
                }
            }
        }
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

    /*public static isMotionDetected(millis: number): { motion: boolean, cooldown_ms: number} {
        const delta = new Date().getUTCMilliseconds() - millis;
        if (delta < this.MOTION_COOLDOWN_MS) {
            return { motion: true, cooldown_ms: this.MOTION_COOLDOWN_MS - delta};
        }
        return { motion: false, cooldown_ms: 0};
    }

    public isMotionDetected(): { motion: boolean, cooldown_ms: number} {
        return MotionSensor.isMotionDetected(this.getMotionSensorPIREvent().value);
    }*/

    constructor(api: HTTPApi, device: FullDeviceResponse) {
        super(api, device);

        this.properties[PropertyName.DeviceMotionDetected] = { value: false, timestamp: 0 };
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_MOTION_SENSOR_PIR_EVT:
                    return { value: Number.parseInt(value !== undefined ? value.value as string : "0"), timestamp: value ? value.timestamp : 0 };
                case CommandType.CMD_MOTION_SENSOR_BAT_STATE:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public isMotionDetected(): boolean {
        return this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean;
    }

    public getMotionSensorPIREvent(): PropertyValue {
        //TODO: Implement P2P Control Event over active station connection
        return this.getPropertyValue(PropertyName.DeviceMotionSensorPIREvent);
    }

    public isBatteryLow(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBatteryLow);
    }

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.MOTION_SENSOR_PIR && message.device_sn === this.getSerial()) {
                try {
                    this.updateProperty(PropertyName.DeviceMotionDetection, { value: true, timestamp: message.event_time });
                    if (!isEmpty (message.pic_url))
                        this.updateProperty(PropertyName.DevicePictureUrl, { value: message.pic_url, timestamp: message.event_time})
                    this.emit("motion detected", this, this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean);
                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                        this.updateProperty(PropertyName.DeviceMotionDetection, { value: false, timestamp: new Date().getTime() });
                        this.emit("motion detected", this, this.getPropertyValue(PropertyName.DeviceMotionDetected).value as boolean);
                        this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                    }, eventDurationSeconds * 1000));
                } catch (error) {
                    this.log.debug(`CusPushEvent.MOTION_SENSOR_PIR - Device: ${message.device_sn} Error:`, error);
                }
            }
        }
    }

}

export class Lock extends Device {

    public getStateChannel(): string {
        return "locks";
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_GET_DEV_STATUS:
                case CommandType.CMD_GET_BATTERY:
                case CommandType.CMD_GET_SUB1G_RSSI:
                case CommandType.CMD_DOORLOCK_GET_STATE:
                    return { value: Number.parseInt(value !== undefined ? value.value as string : "0"), timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    protected processParameterChanged(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.processParameterChanged(metadata, oldValue, newValue);
        if (metadata.key === CommandType.CMD_DOORLOCK_GET_STATE && oldValue !== undefined && ((oldValue.value === 4 && newValue.value !== 4) || (oldValue.value !== 4 && newValue.value === 4))) {
            this.updateProperty(PropertyName.DeviceLocked, { value: newValue.value === 4 ? true : false, timestamp: newValue.timestamp});
            this.emit("locked", this as unknown as Lock, "4" ? true : false);
        }
    }

    public getState(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceState);
    }

    public getBatteryValue(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBattery);
    }

    public getWifiRssi(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceWifiRSSI);
    }

    public isLocked(): PropertyValue {
        const param = this.getLockStatus();
        return { value: param ? (param.value === 4 ? true : false) : false, timestamp: param ? param.timestamp : 0 };
    }

    public getLockStatus(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceLockStatus);
    }

    public static encodeESLCmdOnOff(short_user_id: number, nickname: string, lock: boolean): Buffer {
        const buf1 = Buffer.from([ESLAnkerBleConstant.a, 2]);
        const buf2 = Buffer.allocUnsafe(2);
        buf2.writeUInt16BE(short_user_id);
        const buf3 = Buffer.from([ESLAnkerBleConstant.b, 1, lock === true ? 1 : 0, ESLAnkerBleConstant.c, 4]);
        const buf4 = Buffer.from(eslTimestamp());
        const buf5 = Buffer.from([ESLAnkerBleConstant.d, nickname.length]);
        const buf6 = Buffer.from(nickname);
        return Buffer.concat([buf1, buf2, buf3, buf4, buf5, buf6]);
    }

    public static encodeESLCmdQueryStatus(admin_user_id: string): Buffer {
        const buf1 = Buffer.from([ESLAnkerBleConstant.a, admin_user_id.length]);
        const buf2 = Buffer.from(admin_user_id);
        const buf3 = Buffer.from([ESLAnkerBleConstant.b, 4]);
        const buf4 = Buffer.from(eslTimestamp());
        return Buffer.concat([buf1, buf2, buf3, buf4]);
    }

    /*public static decodeCommand(command: number): void {
        switch (command) {
            case ESLCommand.ON_OFF_LOCK:
            case 8:
                break;

            case ESLCommand.QUERY_STATUS_IN_LOCK:
            case 17:
                break;

            case ESLCommand.NOTIFY:
            case 18:
                break;
            default:
                break;
        }
    }*/

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

    protected convertRawPropertyValue(property: PropertyMetadataAny, rvalue: RawValue): PropertyValue {
        const value = super.convertRawPropertyValue(property, rvalue);
        try {
            switch(property.key) {
                case CommandType.CMD_GET_DEV_STATUS:
                    return { value: Number.parseInt(value !== undefined ? value.value as string : "0"), timestamp: value ? value.timestamp : 0 };
                case CommandType.CMD_KEYPAD_BATTERY_CAP_STATE:
                    return { value: value !== undefined ? (value.value === "1" ? true : false) : false, timestamp: value ? value.timestamp : 0 };
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return value;
    }

    public getState(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceState);
    }

    public isBatteryLow(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBatteryLow);
    }

}

export class UnknownDevice extends Device {

    public getStateChannel(): string {
        return "unknown";
    }

}