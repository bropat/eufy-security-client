import { TypedEmitter } from "tiny-typed-emitter";
import { Readable } from "stream";
import date from "date-and-time";

import { HTTPApi } from "./api";
import { AlarmMode, AlarmTone, NotificationSwitchMode, DeviceType, FloodlightMotionTriggeredDistance, GuardMode, NotificationType, ParamType, PowerSource, PropertyName, StationProperties, TimeFormat, CommandName, StationCommands, StationGuardModeKeyPadProperty, StationCurrentModeKeyPadProperty, StationAutoEndAlarmProperty, StationSwitchModeWithAccessCodeProperty, StationTurnOffAlarmWithButtonProperty, PublicKeyType, MotionDetectionMode, VideoTypeStoreToNAS, HB3DetectionTypes, WalllightNotificationType, DailyLightingType, MotionActivationMode, BaseStationProperties, LightingActiveMode, SourceType, T8170DetectionTypes, IndoorS350NotificationTypes, SoloCameraDetectionTypes, MotionDetectionRangeType, ViewModeType, FloodlightT8425NotificationTypes, PresetPositionType, SmartLockNotification, IndoorS350DetectionTypes } from "./types";
import { FloodlightDetectionRangeT8425Property, FloodlightLightSettingsMotionT8425Property, SnoozeDetail, StationListResponse, StationSecuritySettings } from "./models"
import { ParameterHelper } from "./parameter";
import { IndexedProperty, PropertyMetadataAny, PropertyValue, PropertyValues, RawValues, StationEvents, PropertyMetadataNumeric, PropertyMetadataBoolean, PropertyMetadataString, Schedule, PropertyMetadataObject } from "./interfaces";
import { encodePasscode, getAdvancedLockTimezone, getBlocklist, getFloodLightT8425Notification, getHB3DetectionMode, getIndoorNotification, getIndoorS350DetectionMode, getT8170DetectionMode, hexDate, hexTime, hexWeek, isGreaterEqualMinVersion, isNotificationSwitchMode, isPrioritySourceType, switchNotificationMode, switchSmartLockNotification } from "./utils";
import { CrossTrackingGroupEntry, DatabaseCountByDate, DatabaseQueryLatestInfo, DatabaseQueryLocal, DynamicLighting, InternalColoredLighting, InternalDynamicLighting, MotionZone, P2PCommand, RGBColor, StreamMetadata } from "../p2p/interfaces";
import { P2PClientProtocol } from "../p2p/session";
import { AlarmEvent, CalibrateGarageType, CommandType, DatabaseReturnCode, ErrorCode, ESLBleCommand, ESLCommand, FilterDetectType, FilterEventType, FilterStorageType, IndoorSoloSmartdropCommandType, LockV12P2PCommand, P2PConnectionType, PanTiltDirection, SmartLockCommand, SmartSafeAlarm911Event, SmartSafeCommandCode, SmartSafeShakeAlarmEvent, TFCardStatus, VideoCodec, WatermarkSetting1, WatermarkSetting2, WatermarkSetting3, WatermarkSetting4, WatermarkSetting5 } from "../p2p/types";
import { Address, CmdCameraInfoResponse, CommandResult, ESLStationP2PThroughData, LockAdvancedOnOffRequestPayload, AdvancedLockSetParamsType, PropertyData, CustomData, CommandData, StorageInfoBodyHB3, AdvancedLockSetParamsTypeT8520 } from "../p2p/models";
import { Device, DoorbellCamera, Lock, SmartSafe } from "./device";
import { encodeLockPayload, encryptLockAESData, generateBasicLockAESKey, getLockVectorBytes, isPrivateIp, getSmartSafeP2PCommand, getLockV12P2PCommand, getLockP2PCommand, RGBColorToDecimal, getSmartLockP2PCommand, } from "../p2p/utils";
import { InvalidCommandValueError, InvalidPropertyValueError, NotSupportedError, RTSPPropertyNotEnabledError, WrongStationError, StationConnectTimeoutError, PinNotVerifiedError, ensureError } from "../error";
import { PushMessage } from "../push/models";
import { CusPushEvent } from "../push/types";
import { InvalidPropertyError, LivestreamAlreadyRunningError, LivestreamNotRunningError, PropertyNotSupportedError } from "./error";
import { getError, validValue } from "../utils";
import { TalkbackStream } from "../p2p/talkback";
import { start } from "repl";
import { rootHTTPLogger } from "../logging"

export class Station extends TypedEmitter<StationEvents> {

    private api: HTTPApi;
    private rawStation: StationListResponse;

    private p2pSession: P2PClientProtocol;
    private properties: PropertyValues = {};
    private rawProperties: RawValues = {};
    private ready = false;
    private lockPublicKey: string;

    private currentDelay = 0;
    private reconnectTimeout?: NodeJS.Timeout;
    private terminating = false;

    private p2pConnectionType = P2PConnectionType.QUICKEST;

    public static readonly CHANNEL: number = 255;
    public static readonly CHANNEL_INDOOR: number = 1000;

    private pinVerified = false;

    protected constructor(api: HTTPApi, station: StationListResponse, ipAddress?: string, listeningPort = 0, publicKey = "", enableEmbeddedPKCS1Support = false) {
        super();
        this.api = api;
        this.rawStation = station;
        this.lockPublicKey = publicKey;
        this.p2pSession = new P2PClientProtocol(this.rawStation, this.api, ipAddress, listeningPort, publicKey, enableEmbeddedPKCS1Support);
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
        this.p2pSession.on("livestream error", (channel: number, error: Error) => this.onErrorLivestream(channel, error));
        this.p2pSession.on("wifi rssi", (channel: number, rssi: number) => this.onWifiRssiChanged(channel, rssi));
        this.p2pSession.on("rtsp livestream started", (channel: number) => this.onStartRTSPLivestream(channel));
        this.p2pSession.on("rtsp livestream stopped", (channel: number) => this.onStopRTSPLivestream(channel));
        this.p2pSession.on("rtsp url", (channel: number, rtspUrl: string) => this.onRTSPUrl(channel, rtspUrl));
        this.p2pSession.on("parameter", (channel: number, param: number, value: string) => this.onParameter(channel, param, value));
        this.p2pSession.on("runtime state", (channel: number, batteryLevel: number, temperature: number) => this.onRuntimeState(channel, batteryLevel, temperature));
        this.p2pSession.on("charging state", (channel: number, chargeType: number, batteryLevel: number) => this.onChargingState(channel, chargeType, batteryLevel));
        this.p2pSession.on("floodlight manual switch", (channel: number, enabled: boolean) => this.onFloodlightManualSwitch(channel, enabled));
        this.p2pSession.on("alarm delay", (alarmDelayEvent: AlarmEvent, alarmDelay: number) => this.onAlarmDelay(alarmDelayEvent, alarmDelay));
        this.p2pSession.on("alarm armed", () => this.onAlarmArmed());
        this.p2pSession.on("alarm event", (alarmEvent: AlarmEvent) => this.onAlarmEvent(alarmEvent));
        this.p2pSession.on("talkback started", (channel: number, talkbackStream: TalkbackStream) => this.onTalkbackStarted(channel, talkbackStream));
        this.p2pSession.on("talkback stopped", (channel: number) => this.onTalkbackStopped(channel));
        this.p2pSession.on("talkback error", (channel: number, error: Error) => this.onTalkbackError(channel, error));
        this.p2pSession.on("secondary command", (result: CommandResult) => this.onSecondaryCommandResponse(result));
        this.p2pSession.on("shake alarm", (channel: number, event: SmartSafeShakeAlarmEvent) => this.onDeviceShakeAlarm(channel, event));
        this.p2pSession.on("911 alarm", (channel: number, event: SmartSafeAlarm911Event) => this.onDevice911Alarm(channel, event));
        this.p2pSession.on("jammed", (channel: number) => this.onDeviceJammed(channel));
        this.p2pSession.on("low battery", (channel: number) => this.onDeviceLowBattery(channel));
        this.p2pSession.on("wrong try-protect alarm", (channel: number) => this.onDeviceWrongTryProtectAlarm(channel));
        this.p2pSession.on("sd info ex", (sdStatus, sdCapacity, sdCapacityAvailable) => this.onSdInfoEx(sdStatus, sdCapacity, sdCapacityAvailable));
        this.p2pSession.on("image download", (file, image) => this.onImageDownload(file, image));
        this.p2pSession.on("tfcard status", (channel, status) => this.onTFCardStatus(channel, status));
        this.p2pSession.on("database query latest", (returnCode, data) => this.onDatabaseQueryLatest(returnCode, data));
        this.p2pSession.on("database query local", (returnCode, data) => this.onDatabaseQueryLocal(returnCode, data));
        this.p2pSession.on("database count by date", (returnCode, data) => this.onDatabaseCountByDate(returnCode, data));
        this.p2pSession.on("database delete", (returnCode, failedIds) => this.onDatabaseDelete(returnCode, failedIds));
        this.p2pSession.on("sensor status", (channel: number, status: number) => this.onSensorStatus(channel, status));
        this.p2pSession.on("garage door status", (channel: number, doorId: number, status: number) => this.onGarageDoorStatus(channel, doorId, status));
        this.p2pSession.on("storage info hb3", (channel: number, storageInfo: StorageInfoBodyHB3) => this.onStorageInfoHB3(channel, storageInfo));
        this.p2pSession.on("sequence error", (channel: number, command: number, sequence: number, serialnumber: string) => this.onSequenceError(channel, command, sequence, serialnumber));
    }

    protected initializeState(): void {
        this.update(this.rawStation);
        this.ready = true;
        setImmediate(() => {
            this.emit("ready", this);
        });
    }

    public initialize(): void {
        this.initializeState();
    }

    static async getInstance(api: HTTPApi, stationData: StationListResponse, ipAddress?: string, listeningPort?: number, enableEmbeddedPKCS1Support?: boolean): Promise<Station> {
        let publicKey: string | undefined;
        if (Device.isLock(stationData.device_type) && !Device.isLockWifiT8506(stationData.device_type) && !Device.isLockWifiT8502(stationData.device_type) && !Device.isLockWifiT8510P(stationData.device_type, stationData.station_sn) && !Device.isLockWifiT8520P(stationData.device_type, stationData.station_sn)) {
            publicKey = await api.getPublicKey(stationData.station_sn, PublicKeyType.LOCK);
        }
        return new Station(api, stationData, ipAddress, listeningPort, publicKey, enableEmbeddedPKCS1Support);
    }

    //TODO: To remove
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

        const metadata = this.getPropertiesMetadata(true);
        for(const property of Object.values(metadata)) {
            if (this.rawStation[property.key] !== undefined && typeof property.key === "string") {
                this.updateProperty(property.name, this.convertRawPropertyValue(property, this.rawStation[property.key] as string));
            } else if (this.properties[property.name] === undefined && property.default !== undefined && !this.ready) {
                this.updateProperty(property.name, property.default);
            }
        }
        if (this.rawStation.params) {
            this.rawStation.params.forEach(param => {
                this.updateRawProperty(param.param_type, param.param_value, "http");
            });
        }
        rootHTTPLogger.debug("Update station cloud properties", { stationSN: this.getSerial(), properties: this.properties });
    }

    public updateProperty(name: string, value: PropertyValue, force = false): boolean {
        if (
            (this.properties[name] !== undefined && this.properties[name] !== value)
            || this.properties[name] === undefined || force) {
            const oldValue = this.properties[name];
            this.properties[name] = value;
            this.emit("property changed", this, name, value, this.ready);
            try {
                this.handlePropertyChange(this.getPropertyMetadata(name, true), oldValue, this.properties[name]);
            } catch (err) {
                const error = ensureError(err);
                if (error instanceof InvalidPropertyError) {
                    rootHTTPLogger.error(`Station update property - Invalid Property error`, { error: getError(error), stationSN: this.getSerial(), propertyName: name, propertyValue: value, force: force });
                } else {
                    rootHTTPLogger.error(`Station update property - Property error`, { error: getError(error), stationSN: this.getSerial(), propertyName: name, propertyValue: value, force: force });
                }
            }
            return true;
        }
        return false;
    }

    public updateRawProperties(values: RawValues): void {
        Object.keys(values).forEach(paramtype => {
            const param_type = Number.parseInt(paramtype);
            this.updateRawProperty(param_type, values[param_type].value, values[param_type].source);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        if (metadata.name === PropertyName.StationCurrentMode) {
            //TODO: Finish implementation!
            if (newValue === AlarmMode.DISARMED) {
                if (this.hasProperty(PropertyName.StationAlarmArmed)) {
                    this.updateProperty(PropertyName.StationAlarmArmed, false);
                }
                if (this.hasProperty(PropertyName.StationAlarmDelay)) {
                    this.updateProperty(PropertyName.StationAlarmDelay, 0);
                }
                if (this.hasProperty(PropertyName.StationAlarmDelayType)) {
                    this.updateProperty(PropertyName.StationAlarmDelayType, 0);
                }
                if (this.hasProperty(PropertyName.StationAlarm)) {
                    this.updateProperty(PropertyName.StationAlarm, false);
                }
                if (this.hasProperty(PropertyName.StationAlarmType)) {
                    this.updateProperty(PropertyName.StationAlarmType, 0);
                }
            } /*else if (this.hasProperty(PropertyName.StationAlarmArmed)) { //TODO: Type !== HB3 or STATION
                this.updateProperty(PropertyName.StationAlarmArmed, this.isAlarmArmable(newValue as AlarmMode));
            }*/
        }
    }

    public updateRawProperty(type: number, value: string, source: SourceType): boolean {
        const parsedValue = ParameterHelper.readValue(this.getSerial(), type, value, rootHTTPLogger);
        if (parsedValue !== undefined &&
            ((this.rawProperties[type] !== undefined && this.rawProperties[type].value !== parsedValue && isPrioritySourceType(this.rawProperties[type].source, source)) || this.rawProperties[type] === undefined)) {

            this.rawProperties[type] = {
                value: parsedValue,
                source: source
            };
            if (this.ready) {
                this.emit("raw property changed", this, type, this.rawProperties[type].value);

                try {
                    if (type === ParamType.GUARD_MODE) {
                        this.emit("guard mode", this, Number.parseInt(parsedValue));
                    } else if (type === CommandType.CMD_GET_ALARM_MODE) {
                        this.emit("current mode", this, Number.parseInt(parsedValue));
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Station update raw property - Number conversion error", { error: getError(error), stationSN: this.getSerial(), type: type, value: value, source: source });
                }
            }

            const metadata = this.getPropertiesMetadata(true);

            for(const property of Object.values(metadata)) {
                if (property.key === type) {
                    try {
                        this.updateProperty(property.name, this.convertRawPropertyValue(property, this.rawProperties[type].value));
                    } catch (err) {
                        const error = ensureError(err);
                        if (error instanceof PropertyNotSupportedError) {
                            rootHTTPLogger.debug("Station update raw property - Property not supported error", { error: getError(error), stationSN: this.getSerial(), type: type, value: value, source: source });
                        } else {
                            rootHTTPLogger.error("Station update raw property - Property error", { error: getError(error), stationSN: this.getSerial(), type: type, value: value, source: source });
                        }
                    }
                }
            }
            return true;
        }
        return false;
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch(property.key) {
                case CommandType.CMD_GET_HUB_LAN_IP:
                    return value !== undefined ? (isPrivateIp(value) ? value : ""): "";
                case CommandType.CMD_SET_ARMING:
                    return Number.parseInt(value !== undefined ? value : "-1");
                case CommandType.CMD_GET_ALARM_MODE:
                {
                    const guard_mode = this.getGuardMode();
                    return Number.parseInt(value !== undefined ? value : guard_mode !== undefined && guard_mode !== GuardMode.SCHEDULE && guard_mode !== GuardMode.GEO ? guard_mode as string : GuardMode.UNKNOWN.toString());
                }
                case CommandType.CMD_HUB_NOTIFY_MODE:
                {
                    switch(property.name) {
                        case PropertyName.StationNotificationSwitchModeSchedule:
                            if (!isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
                                return value !== undefined ? (value === "1" ? true : false) : false;
                            }
                            return value !== undefined ? isNotificationSwitchMode(Number.parseInt(value), NotificationSwitchMode.SCHEDULE) : false;
                        case PropertyName.StationNotificationSwitchModeGeofence:
                            if (!isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
                                throw new PropertyNotSupportedError("Property not supported for station with this software version", { context: { propertName: property.name, station: this.getSerial(), softwareVersion: this.getSoftwareVersion() } });
                            }
                            return value !== undefined ? isNotificationSwitchMode(Number.parseInt(value), NotificationSwitchMode.GEOFENCE) : false;
                        case PropertyName.StationNotificationSwitchModeApp:
                            if (!isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
                                throw new PropertyNotSupportedError("Property not supported for station with this software version", { context: { propertName: property.name, station: this.getSerial(), softwareVersion: this.getSoftwareVersion() } });
                            }
                            return value !== undefined ? isNotificationSwitchMode(Number.parseInt(value), NotificationSwitchMode.APP) : false;
                        case PropertyName.StationNotificationSwitchModeKeypad:
                            if (!isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
                                throw new PropertyNotSupportedError("Property not supported for station with this software version", { context: { propertName: property.name, station: this.getSerial(), softwareVersion: this.getSoftwareVersion() } });
                            }
                            return value !== undefined ? isNotificationSwitchMode(Number.parseInt(value), NotificationSwitchMode.KEYPAD) : false;
                    }
                }
                case CommandType.CMD_HUB_NOTIFY_ALARM:
                    return value !== undefined ? (value === "1" ? true : false) : false;
                case CommandType.CMD_HUB_ALARM_TONE:
                    try {
                        return value !== undefined ? Number.parseInt(value) : 1;
                    } catch (err) {
                        const error = ensureError(err);
                        rootHTTPLogger.error("Station convert raw property - CMD_HUB_ALARM_TONE Error", { error: getError(error), stationSN: this.getSerial(), property: property, value: value });
                        return 1;
                    }
                case CommandType.CMD_SET_HUB_SPK_VOLUME:
                    try {
                        return value !== undefined ? Number.parseInt(value) : 26;
                    } catch (err) {
                        const error = ensureError(err);
                        rootHTTPLogger.error("Station convert raw property - CMD_SET_HUB_SPK_VOLUME Error", { error: getError(error), stationSN: this.getSerial(), property: property, value: value });
                        return 26;
                    }
                case CommandType.CMD_SET_PROMPT_VOLUME:
                    try {
                        return value !== undefined ? Number.parseInt(value) : 26;
                    } catch (err) {
                        const error = ensureError(err);
                        rootHTTPLogger.error("Station convert raw property - CMD_SET_PROMPT_VOLUME Error", { error: getError(error), stationSN: this.getSerial(), property: property, value: value });
                        return 26;
                    }
                case CommandType.CMD_SET_HUB_OSD:
                    try {
                        return value !== undefined ? Number.parseInt(value) : 0;
                    } catch (err) {
                        const error = ensureError(err);
                        rootHTTPLogger.error("Station convert raw property - CMD_SET_HUB_OSD Error", { error: getError(error), stationSN: this.getSerial(), property: property, value: value });
                        return 0;
                    }
                case CommandType.CMD_SET_HUB_ALARM_AUTO_END:
                    return value !== undefined ? value !== "0" ? false : true : false;
                case CommandType.CMD_SET_HUB_ALARM_CLOSE:
                    return value !== undefined ? value === "1" ? false : true : false;
            }
            if (property.name === PropertyName.Model && Device.isLockWifiT8510P(this.getDeviceType(), this.getSerial())) {
                return "T8510P";
            } else if (property.type === "number") {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined ? Number.parseInt(value) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.warn("Station convert raw property - PropertyMetadataNumeric Convert Error", { error: getError(error), stationSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.type === "boolean") {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return value !== undefined ? (typeof value === "number" ? !!value : (value === "1" || value.toLowerCase() === "true" ? true : false)) : (booleanProperty.default !== undefined ? booleanProperty.default : false);
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.warn("Station convert raw property - PropertyMetadataBoolean Convert Error", { error: getError(error), stationSN: this.getSerial(), property: property, value: value });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if (property.type === "string") {
                const stringProperty = property as PropertyMetadataString;
                return value !== undefined ? value : (stringProperty.default !== undefined ? stringProperty.default : "");
            } else if (property.type === "object") {
                const objectProperty = property as PropertyMetadataObject;
                return value !== undefined ? value : (objectProperty.default !== undefined ? objectProperty.default : undefined);
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Station convert raw property - Error", { error: getError(error), stationSN: this.getSerial(), property: property, value: value });
        }
        return value;
    }

    public getPropertyMetadata(name: string, hidden = false): PropertyMetadataAny {
        const property = this.getPropertiesMetadata(hidden)[name];
        if (property !== undefined)
            return property;
        throw new InvalidPropertyError("Property name is not valid", { context: { name: name } });
    }

    public getPropertyValue(name: string): PropertyValue {
        if (name === PropertyName.StationCurrentMode) {
            const guard_mode = this.properties[PropertyName.StationGuardMode];
            return this.properties[PropertyName.StationCurrentMode] !== undefined ? this.properties[PropertyName.StationCurrentMode] : guard_mode !== undefined && guard_mode !== GuardMode.SCHEDULE && guard_mode !== GuardMode.GEO ? guard_mode : GuardMode.UNKNOWN;
        }
        return this.properties[name];
    }

    public hasPropertyValue(name: string): boolean {
        return this.getPropertyValue(name) !== undefined;
    }

    public getRawProperty(type: number): string | undefined {
        return this.rawProperties[type]?.value;
    }

    public getRawProperties(): RawValues {
        return this.rawProperties;
    }

    public getProperties(): PropertyValues {
        const result: PropertyValues = {};
        for (const property of Object.keys(this.properties)) {
            if (!property.startsWith("hidden-"))
                result[property] = this.properties[property];
        }
        return result;
    }

    public getPropertiesMetadata(hidden = false): IndexedProperty {
        let metadata = {
            ...StationProperties[this.getDeviceType()]
        };
        if (Object.keys(metadata).length === 0) {
            metadata = {
                ...BaseStationProperties
            };
        }
        if (this.hasDeviceWithType(DeviceType.KEYPAD)) {
            metadata[PropertyName.StationGuardMode] = StationGuardModeKeyPadProperty;
            metadata[PropertyName.StationCurrentMode] = StationCurrentModeKeyPadProperty;
            metadata[PropertyName.StationSwitchModeWithAccessCode] = StationSwitchModeWithAccessCodeProperty;
            metadata[PropertyName.StationAutoEndAlarm] = StationAutoEndAlarmProperty;
            metadata[PropertyName.StationTurnOffAlarmWithButton] = StationTurnOffAlarmWithButtonProperty;
        }
        if (!hidden) {
            for (const property of Object.keys(metadata)) {
                if (property.startsWith("hidden-"))
                    delete metadata[property];
            }
        }
        return metadata;
    }

    public hasProperty(name: string, hidden = false): boolean {
        return this.getPropertiesMetadata(hidden)[name] !== undefined;
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

    public static getChannel(type: number): number {
        return Station.isStation(type) === true ? (Device.isIndoorCamera(type) ? Station.CHANNEL_INDOOR : Station.CHANNEL) : 0;
    }

    public static isStation(type: number): boolean {
        return type === DeviceType.STATION || type === DeviceType.HB3 || type === DeviceType.MINIBASE_CHIME;
    }

    public isStation(): boolean {
        return Station.isStation(this.rawStation.device_type);
    }

    public static isStationHomeBase3(type: number): boolean {
        return type === DeviceType.HB3;
    }

    public static isStationHomeBase3BySn(sn: string): boolean {
        return sn.startsWith("T8030");
    }

    public isStationHomeBase3(): boolean {
        return Station.isStationHomeBase3(this.rawStation.device_type);
    }

    public isIntegratedDevice(): boolean {
        //TODO: Recheck this implementation considering HomeBase 3 integration
        if (Device.isLock(this.getDeviceType()) || Device.isSmartDrop(this.getDeviceType()) || Device.isSmartSafe(this.getDeviceType())) {
            if (this.rawStation.devices?.length === 1)
                return this.rawStation.devices[0]?.device_sn === this.rawStation.station_sn;
            else
                return true;
        }
        return Device.isWiredDoorbellDual(this.getDeviceType()) || Device.isFloodLight(this.getDeviceType()) || Device.isWiredDoorbell(this.getDeviceType()) || Device.isIndoorCamera(this.getDeviceType()) || Device.isSoloCameras(this.getDeviceType()) || Device.isWallLightCam(this.getDeviceType()) || Device.isStarlight4GLTE(this.getDeviceType()) || Device.isSoloCameraPro(this.getDeviceType());
    }

    public isP2PConnectableDevice(): boolean {
        if (Device.isSmartTrack(this.getDeviceType()) || (!Device.isSupported(this.getDeviceType()) && !this.isStation())) {
            if (!Device.isSupported(this.getDeviceType()) && !this.isStation()) {
                rootHTTPLogger.debug("Station not supported, no connection over p2p will be initiated", { stationSN: this.getSerial(), type: this.getDeviceType() });
            }
            return false;
        }
        return true;
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
        return this.getPropertyValue(PropertyName.StationCurrentMode) !== undefined ? this.getPropertyValue(PropertyName.StationCurrentMode) : guard_mode !== undefined && guard_mode !== GuardMode.SCHEDULE && guard_mode !== GuardMode.GEO ? guard_mode : GuardMode.UNKNOWN;
    }

    public processPushNotification(message: PushMessage): void {
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.MODE_SWITCH && message.station_sn === this.getSerial()) {
                rootHTTPLogger.info("Received push notification for changing guard mode", { guard_mode: message.station_guard_mode, current_mode: message.station_current_mode, stationSN: message.station_sn });
                try {
                    if (message.station_guard_mode !== undefined)
                        this.updateRawProperty(ParamType.GUARD_MODE, message.station_guard_mode.toString(), "push");
                    if (message.station_current_mode !== undefined)
                        this.updateRawProperty(CommandType.CMD_GET_ALARM_MODE, message.station_current_mode.toString(), "push");
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`Station process push notification - MODE_SWITCH event error`, { error: getError(error), stationSN: this.getSerial(), message: JSON.stringify(message) });
                }
            } else if (message.event_type === CusPushEvent.ALARM && message.station_sn === this.getSerial() && !this.isStation()) {
                rootHTTPLogger.info("Received push notification for alarm event", { stationSN: message.station_sn, alarmType: message.alarm_type });
                if (message.alarm_type !== undefined) {
                    this.onAlarmEvent(message.alarm_type)
                }
            }
        } else if (message.msg_type === CusPushEvent.TFCARD && message.station_sn === this.getSerial() && message.tfcard_status !== undefined) {
            this.updateRawProperty(CommandType.CMD_GET_TFCARD_STATUS, message.tfcard_status.toString(), "push");
        }
    }

    public isConnected(): boolean {
        return this.p2pSession.isConnected();
    }

    public close(): void {
        this.terminating = true;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
        if (this.p2pSession.isConnected()) {
            rootHTTPLogger.info(`Disconnect from station ${this.getSerial()}`);
            this.p2pSession.close();
        }
    }

    public isEnergySavingDevice(): boolean {
        return this.p2pSession.isEnergySavingDevice();
    }

    public async connect(): Promise<void> {
        if (!this.p2pSession.isConnected() && !this.p2pSession.isConnecting()) {
            rootHTTPLogger.debug(`Connecting to station ${this.getSerial()}...`, { stationSN: this.getSerial(), p2pConnectionType: P2PConnectionType[this.p2pConnectionType] });
            this.p2pSession.setConnectionType(this.p2pConnectionType);
            await this.p2pSession.connect();
        }
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

    private onErrorLivestream(channel: number, error: Error): void {
        this.emit("livestream error", this, channel, error);
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
        this.emit("wifi rssi", this, channel, rssi);
    }

    private onRTSPUrl(channel: number, rtspUrl: string): void {
        this.emit("rtsp url", this, channel, rtspUrl);
    }

    private onParameter(channel: number, param: number, value: string): void {
        const params: RawValues = {};
        const parsedValue = ParameterHelper.readValue(this.getSerial(), param, value, rootHTTPLogger);
        if (parsedValue !== undefined) {
            params[param] = {
                value: parsedValue,
                source: "p2p"
            };
            this.emit("raw device property changed", this._getDeviceSerial(channel), params);
        }
    }

    private onAlarmDelay(alarmDelayEvent: AlarmEvent, alarmDelay: number): void {
        this.emit("alarm delay event", this, alarmDelayEvent, alarmDelay);
        if (this.hasProperty(PropertyName.StationAlarmDelay)) {
            this.updateProperty(PropertyName.StationAlarmDelay, alarmDelay);
        }
        if (this.hasProperty(PropertyName.StationAlarmDelayType)) {
            this.updateProperty(PropertyName.StationAlarmDelayType, alarmDelayEvent);
        }
    }

    private onAlarmArmed(): void {
        this.emit("alarm armed event", this);
        if (this.hasProperty(PropertyName.StationAlarmArmDelay)) {
            this.updateProperty(PropertyName.StationAlarmArmDelay, 0);
        }
        /*if (this.hasProperty(PropertyName.StationAlarmArmed) && this.hasProperty(PropertyName.StationCurrentMode)) {
            this.updateProperty(PropertyName.StationAlarmArmed, this.isAlarmArmable(this.getPropertyValue(PropertyName.StationCurrentMode) as AlarmMode));
        }*/
        if (this.hasProperty(PropertyName.StationAlarmArmed)) {
            this.updateProperty(PropertyName.StationAlarmArmed, true);
        }
        if (this.hasProperty(PropertyName.StationAlarmDelay)) {
            this.updateProperty(PropertyName.StationAlarmDelay, 0);
        }
        if (this.hasProperty(PropertyName.StationAlarmDelayType)) {
            this.updateProperty(PropertyName.StationAlarmDelayType, 0);
        }
        if (this.hasProperty(PropertyName.StationAlarm)) {
            this.updateProperty(PropertyName.StationAlarm, false);
        }
        if (this.hasProperty(PropertyName.StationAlarmType)) {
            this.updateProperty(PropertyName.StationAlarmType, 0);
        }
    }

    private onAlarmEvent(alarmEvent: AlarmEvent): void {
        this.emit("alarm event", this, alarmEvent);
        if (this.hasProperty(PropertyName.StationAlarmDelay)) {
            this.updateProperty(PropertyName.StationAlarmDelay, 0);
        }
        if (this.hasProperty(PropertyName.StationAlarmDelayType)) {
            this.updateProperty(PropertyName.StationAlarmDelayType, 0);
        }
        switch (alarmEvent) {
            case AlarmEvent.DEV_STOP:
            case AlarmEvent.HUB_STOP:
            case AlarmEvent.HUB_STOP_BY_APP:
            case AlarmEvent.HUB_STOP_BY_HAND:
            case AlarmEvent.HUB_STOP_BY_KEYPAD:
                if (this.hasProperty(PropertyName.StationAlarm)) {
                    this.updateProperty(PropertyName.StationAlarm, false);
                }
                if (this.hasProperty(PropertyName.StationAlarmType)) {
                    this.updateProperty(PropertyName.StationAlarmType, 0);
                }
                break;
            default:
                if (this.hasProperty(PropertyName.StationAlarm)) {
                    this.updateProperty(PropertyName.StationAlarm, true);
                }
                if (this.hasProperty(PropertyName.StationAlarmType)) {
                    this.updateProperty(PropertyName.StationAlarmType, alarmEvent);
                }
                break;
        }
    }

    public setGuardMode(mode: GuardMode): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationGuardMode,
            value: mode
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, mode);

        rootHTTPLogger.debug(`Station set guard mode - sending command`, { stationSN: this.getSerial(), mode: mode });
        if (((isGreaterEqualMinVersion("2.0.7.9", this.getSoftwareVersion()) && !Device.isIntegratedDeviceBySn(this.getSerial())) || Device.isSoloCameraBySn(this.getSerial())) || this.rawStation.device_type === DeviceType.HB3) {
            rootHTTPLogger.debug(`Station set guard mode - Using CMD_SET_PAYLOAD`, { stationSN: this.getSerial(), mode: mode, main_sw_version: this.getSoftwareVersion() });
            this.p2pSession.sendCommandWithStringPayload({
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
                property: propertyData
            });
        } else {
            rootHTTPLogger.debug(`Station set guard mode - Using CMD_SET_ARMING`, { stationSN: this.getSerial(), mode: mode });
            this.p2pSession.sendCommandWithInt({
                commandType: CommandType.CMD_SET_ARMING,
                value: mode,
                strValue: this.rawStation.member.admin_user_id,
                channel: Station.CHANNEL
            }, {
                property: propertyData
            });
        }
    }

    public getCameraInfo(): void {
        rootHTTPLogger.debug(`Station send get camera info command`, { stationSN: this.getSerial() });
        this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_CAMERA_INFO,
            value: 255,
            channel: Station.CHANNEL
        });
    }

    public getStorageInfoEx(): void {
        rootHTTPLogger.debug(`Station send get storage info command`, { stationSN: this.getSerial() });
        if (this.isStation() && this.rawStation.device_type !== DeviceType.HB3 && isGreaterEqualMinVersion("3.2.7.6", this.getSoftwareVersion())) {
            this.p2pSession.sendCommandWithoutData(CommandType.CMD_SDINFO_EX, Station.CHANNEL);
        } else if (this.rawStation.device_type === DeviceType.HB3) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_STORAGE_INFO_HB3,
                    "mChannel": 0,
                    "mValue3": 0,
                    "payload": {
                        "version":0.0,
                        "cmd":11001.0,
                    }}),
            });
        } else {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SDINFO_EX,
                value: 0,
                valueSub: 0,
                channel: Station.CHANNEL,
                strValue: this.rawStation.member.admin_user_id
            });
        }
    }

    private onAlarmMode(mode: AlarmMode): void {
        rootHTTPLogger.debug(`Station alarm mode changed`, { stationSN: this.getSerial(), mode: mode });
        this.updateRawProperty(CommandType.CMD_GET_ALARM_MODE, mode.toString(), "p2p");
        const armDelay = this.getArmDelay(mode);
        if (armDelay > 0) {
            this.emit("alarm arm delay event", this, armDelay);
            if (this.hasProperty(PropertyName.StationAlarmArmDelay)) {
                this.updateProperty(PropertyName.StationAlarmArmDelay, armDelay);
            }
        }

        if (mode === AlarmMode.DISARMED) {
            if (this.hasProperty(PropertyName.StationAlarmArmDelay)) {
                this.updateProperty(PropertyName.StationAlarmArmDelay, 0);
            }
            if (this.hasProperty(PropertyName.StationAlarmArmed)) {
                this.updateProperty(PropertyName.StationAlarmArmed, false);
            }
            if (this.hasProperty(PropertyName.StationAlarmDelay)) {
                this.updateProperty(PropertyName.StationAlarmDelay, 0);
            }
            if (this.hasProperty(PropertyName.StationAlarmDelayType)) {
                this.updateProperty(PropertyName.StationAlarmDelayType, 0);
            }
            if (this.hasProperty(PropertyName.StationAlarm)) {
                this.updateProperty(PropertyName.StationAlarm, false);
            }
            if (this.hasProperty(PropertyName.StationAlarmType)) {
                this.updateProperty(PropertyName.StationAlarmType, 0);
            }
        }

        // Trigger refresh Guard Mode
        this.getCameraInfo();
    }

    private getArmDelay(mode: AlarmMode): number {
        let propertyName;
        switch (mode) {
            case AlarmMode.HOME:
                propertyName = PropertyName.StationHomeSecuritySettings;
                break;
            case AlarmMode.AWAY:
                propertyName = PropertyName.StationAwaySecuritySettings;
                break;
            case AlarmMode.CUSTOM1:
                propertyName = PropertyName.StationCustom1SecuritySettings;
                break;
            case AlarmMode.CUSTOM2:
                propertyName = PropertyName.StationCustom2SecuritySettings;
                break;
            case AlarmMode.CUSTOM3:
                propertyName = PropertyName.StationCustom3SecuritySettings;
                break;
        }

        if (propertyName !== undefined && this.hasPropertyValue(propertyName) && this.getPropertyValue(propertyName) !== "") {
            const settings: StationSecuritySettings = (this.getPropertyValue(propertyName) as any) as StationSecuritySettings;
            try {
                if (settings.count_down_arm?.channel_list?.length > 0 && settings.count_down_arm?.delay_time > 0) {
                    return settings.count_down_arm.delay_time;
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.debug(`Station get arm delay - Error`, { error: getError(error), stationSN: this.getSerial(), mode: mode, propertyName: propertyName, settings: settings });
            }
        }
        return 0;
    }

    /*private getGuardModeActionSetting(mode: AlarmMode): number {
        //TODO: This settings are only available on the device properties...
        let value = 0;
        try {
            switch (mode) {
                case AlarmMode.HOME:
                    value = Number.parseInt(this.getRawProperty(CommandType.CMD_GET_HOME_ACTION));
                    break;
                case AlarmMode.AWAY:
                    value = Number.parseInt(this.getRawProperty(CommandType.CMD_GET_AWAY_ACTION));
                    break;
                case AlarmMode.CUSTOM1:
                    value = Number.parseInt(this.getRawProperty(CommandType.CMD_GET_CUSTOM1_ACTION));
                    break;
                case AlarmMode.CUSTOM2:
                    value = Number.parseInt(this.getRawProperty(CommandType.CMD_GET_CUSTOM2_ACTION));
                    break;
                case AlarmMode.CUSTOM3:
                    value = Number.parseInt(this.getRawProperty(CommandType.CMD_GET_CUSTOM3_ACTION));
                    break;
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.debug(`Station get guard mode action setting - Error`, { error: getError(error), stationSN: this.getSerial(), mode: mode });
        }
        return value;
    }

    private isAlarmArmable(mode: AlarmMode): boolean {
        const action = this.getGuardModeActionSetting(mode);
        if ((action & GuardModeSecuritySettingsAction.CAMERA_ALARM) == GuardModeSecuritySettingsAction.CAMERA_ALARM ||
            (action & GuardModeSecuritySettingsAction.HOMEBASE_ALARM) == GuardModeSecuritySettingsAction.HOMEBASE_ALARM ||
            (action & GuardModeSecuritySettingsAction.LIGHT_ALARM) == GuardModeSecuritySettingsAction.LIGHT_ALARM) {
            return true;
        }
        return false;
    }*/

    private _getDeviceSerial(channel: number): string {
        if (this.rawStation.devices)
            for (const device of this.rawStation.devices) {
                if (device.device_channel === channel)
                    return device.device_sn;
            }
        return "";
    }

    private _handleCameraInfoParameters(devices: { [index: string]: RawValues; }, channel: number, type: number, value: string): void {
        if (channel === Station.CHANNEL || channel === Station.CHANNEL_INDOOR || (this.isIntegratedDevice() && this.getDeviceType() !== DeviceType.HB3)) {
            this.updateRawProperty(type, value, "p2p");
            if (type === CommandType.CMD_GET_ALARM_MODE) {
                if (this.getDeviceType() !== DeviceType.STATION && this.getDeviceType() !== DeviceType.HB3)
                    // Trigger refresh Guard Mode
                    this.api.refreshStationData();
            }
            if (this.isIntegratedDevice()) {
                const device_sn = this.getSerial();
                if (!devices[device_sn]) {
                    devices[device_sn] = {};
                }
                const parsedValue = ParameterHelper.readValue(device_sn, type, value, rootHTTPLogger);
                if (parsedValue !== undefined) {
                    devices[device_sn][type] = {
                        value: parsedValue,
                        source: "p2p"
                    };
                }
            }
        } else {
            const device_sn = this._getDeviceSerial(channel);
            if (device_sn !== "") {
                if (!devices[device_sn]) {
                    devices[device_sn] = {};
                }
                const parsedValue = ParameterHelper.readValue(device_sn, type, value, rootHTTPLogger);
                if (parsedValue !== undefined) {
                    devices[device_sn][type] = {
                        value: parsedValue,
                        source: "p2p"
                    };
                }
            }
        }
    }

    private onCameraInfo(cameraInfo: CmdCameraInfoResponse): void {
        rootHTTPLogger.debug("Station got camera info", { station: this.getSerial(), cameraInfo: cameraInfo });
        const devices: { [index: string]: RawValues; } = {};
        cameraInfo.params.forEach(param => {
            this._handleCameraInfoParameters(devices, param.dev_type, param.param_type, param.param_value);
        });
        if (Array.isArray(cameraInfo.db_bypass_str)) {
            cameraInfo.db_bypass_str?.forEach(param => {
                this._handleCameraInfoParameters(devices, param.channel, param.param_type, Buffer.from(param.param_value, "base64").toString());
            });
        }
        Object.keys(devices).forEach(device => {
            this.emit("raw device property changed", device, devices[device]);
        });
    }

    private onCommandResponse(result: CommandResult): void {
        rootHTTPLogger.debug("Station got p2p command response", { station: this.getSerial(), commandType: result.command_type, channel: result.channel, returnCodeName: ErrorCode[result.return_code], returnCode: result.return_code, customData: result.customData });
        this.emit("command result", this, result);
    }

    private onSecondaryCommandResponse(result: CommandResult): void {
        rootHTTPLogger.debug("Station got p2p secondary command response", { station: this.getSerial(), commandType: result.command_type, channel: result.channel, returnCode: result.return_code, customData: result.customData });
        this.emit("secondary command result", this, result);
        if (result.command_type === CommandType.CMD_SMARTSAFE_SETTINGS && result.customData?.command?.name === "deviceVerifyPIN") {
            if (result.return_code === 0) {
                // Verify PIN was successfull for this session
                this.pinVerified = true;
            } else {
                this.pinVerified = false;
            }
            this.emit("device pin verified", this.getSerial(), this.pinVerified);
        }
    }

    private onConnect(address: Address): void {
        this.terminating = false;
        this.resetCurrentDelay();
        rootHTTPLogger.info(`Connected to station ${this.getSerial()} on host ${address.host} and port ${address.port}`);
        if (this.hasCommand(CommandName.StationDatabaseQueryLatestInfo)) {
            this.databaseQueryLatestInfo();
        }
        this.emit("connect", this);
    }

    private onDisconnect(): void {
        rootHTTPLogger.info(`Disconnected from station ${this.getSerial()}`);
        this.emit("close", this);
        this.pinVerified = false;
        if (!this.isEnergySavingDevice() && !this.terminating)
            this.scheduleReconnect();
    }

    private onTimeout(): void {
        rootHTTPLogger.info(`Timeout connecting to station ${this.getSerial()}`);
        this.emit("connection error", this, new StationConnectTimeoutError("Timeout connecting to station", { context: { station: this.getSerial() } }));
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
            rootHTTPLogger.debug(`Station schedule reconnect`, { stationSN: this.getSerial(), delay: delay });
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = undefined;
                this.connect();
            }, delay);
        }
    }

    public rebootHUB(): void {
        const commandData: CommandData = {
            name: CommandName.StationReboot
        };
        if (!this.hasCommand(CommandName.StationReboot)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, station: this.getSerial()} });
        }
        rootHTTPLogger.debug(`Station reboot - sending command`, { stationSN: this.getSerial() });
        this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_HUB_REBOOT,
            value: 0,
            strValue: this.rawStation.member.admin_user_id,
            channel: Station.CHANNEL
        }, {
            command: commandData
        });
    }

    public setStatusLed(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceStatusLed,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set status led - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isCamera2Product() || device.isCamera3Product() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E || device.isCameraProfessional247()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_DEV_LED_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_LIVEVIEW_LED_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8424) {
            this.p2pSession.sendCommandWithStringPayload({
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
                        "transaction": `${new Date().getTime()}`,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.isFloodLightT8425() || (device.getDeviceType() === DeviceType.FLOODLIGHT && !device.isFloodLightT8420X()) || device.isGarageCamera() || (device.isIndoorPanAndTiltCameraS350() && this.isStationHomeBase3()) || (device.isSoloCameras() && this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_DEV_LED_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isIndoorPanAndTiltCameraS350()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_LED_SWITCH,
                    "data":{
                        "enable": 0,
                        "quality": 0,
                        "status": 0,
                        "value": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isStarlight4GLTE()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_LED_SWITCH,
                    "data":{
                        "value": value === true ? 1 : 0,
                        "transaction": `${new Date().getTime()}`
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isIndoorCamera() || device.isFloodLight()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_DEV_LED_SWITCH,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isSoloCameras() && !this.isStationHomeBase3()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbellDualE340() || device.isBatteryDoorbellC30() || device.isBatteryDoorbellC31()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "light_enable": value === true ? 1 : 0
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbell() || device.isWiredDoorbellDual()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_LED_NIGHT_OPEN,
                    "data":{
                        "status": value === true ? 1 : 0
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setAutoNightVision(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoNightvision,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set auto night vision - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_NIGHT_VISION_TYPE,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isSoloCameraC210() || device.isSoloCameraSolar()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_NIGHT_VISION_TYPE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "channel": device.getChannel(),
                        "night_sion": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_IRCUT_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        }
    }

    public setNightVision(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNightvision,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set night vision - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isCameraProfessional247() || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_NIGHT_VISION_TYPE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "channel": device.getChannel(),
                        "night_sion": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        }
    }

    public setMotionDetection(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion detection - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isSoloCameraSolar() || device.isOutdoorPanAndTiltCamera() || device.isSoloCameraC210() || (device.isIndoorPanAndTiltCameraS350() && !this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE,
                    "data": {
                        "enable": 0,
                        "quality": 0,
                        "status": value === true ? 1 : 0,
                        "value": 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isCameraProfessional247()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE,
                    "data": {
                        "channel": device.getChannel(),
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
            }, {
                property: propertyData
            });
        } else if ((device.isIndoorCamera() && !device.isIndoorPanAndTiltCameraS350()) || (device.isFloodLight() && device.getDeviceType() !== DeviceType.FLOODLIGHT) || device.isFloodLightT8420X() || device.isWiredDoorbellT8200X() || device.isStarlight4GLTE() || device.isGarageCamera() || device.isSoloCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE,
                    "data": {
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
            }, {
                property: propertyData
            });
        } else if (device.isSoloCameras() || device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_MOTION_DETECTION_PACKAGE,
                    "data": {
                        "enable": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_PIR_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        }
    }

    public setSoundDetection(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSoundDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set sound detection - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
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
        }, {
            property: propertyData
        });
    }

    public setSoundDetectionType(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSoundDetectionType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set sound detection type - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
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
        }, {
            property: propertyData
        });
    }

    public setSoundDetectionSensitivity(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSoundDetectionSensitivity,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set sound detection sensitivity - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
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
        }, {
            property: propertyData
        });
    }

    public setPetDetection(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DevicePetDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set pet detection - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
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
        }, {
            property: propertyData
        });
    }

    public panAndTilt(device: Device, direction: PanTiltDirection, command = 1): void {
        const commandData: CommandData = {
            name: CommandName.DevicePanAndTilt,
            value: direction
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DevicePanAndTilt)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!(direction in PanTiltDirection)) {
            throw new InvalidCommandValueError("Invalid value for this command", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }

        rootHTTPLogger.debug(`Station pan and tilt - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), direction: PanTiltDirection[direction], command });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                command: commandData
            });
        } else if (device.isOutdoorPanAndTiltCamera() || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
            if (direction === PanTiltDirection.ROTATE360) {
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                    value: JSON.stringify({
                        "commandType": CommandType.CMD_OUTDOOR_ROTATE,
                        "data":{
                            "curise_type": 10,
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    command: commandData
                });
            } else {
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                    value: JSON.stringify({
                        "commandType": CommandType.CMD_INDOOR_ROTATE,
                        "data":{
                            "cmd_type": command,
                            "rotate_type": direction,
                            "zoom": 1.0,
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    command: commandData
                });
            }
        } else {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_ROTATE,
                    "data":{
                        "cmd_type": command,
                        "rotate_type": direction,
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        }
    }

    public switchLight(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLight,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station switch light - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if ((device.isFloodLight() && !device.isFloodLightT8425()) || device.isSoloCameraSpotlight1080() || device.isSoloCameraSpotlight2k() ||
            device.isSoloCameraSpotlightSolar() || device.isCamera2C() || device.isCamera2CPro() ||
            device.isIndoorOutdoorCamera1080p() || device.isIndoorOutdoorCamera2k() || device.isCamera3() || device.isCamera3C() || device.isCameraProfessional247() || device.isCamera3Pro()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbellDualE340() || device.isOutdoorPanAndTiltCamera() || device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH,
                    "data": {
                        "time": 0,
                        "type": 2,
                        "value": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isStarlight4GLTE()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH,
                    "data": {
                        "time": 60,
                        "type": 2,
                        "value": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH,
                    "data": {
                        "value": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionSensitivity(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivity,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion detection sensitivity - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if ((device.isFloodLight() && device.getDeviceType() !== DeviceType.FLOODLIGHT && !device.isFloodLightT8425()) || (device.isIndoorCamera() && !device.isIndoorPanAndTiltCameraS350()) || device.isFloodLightT8420X() || device.isGarageCamera() || (device.isIndoorPanAndTiltCameraS350() && !this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_DET_SET_MOTION_SENSITIVITY_IDX,
                    "data": {
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
            }, {
                property: propertyData
            });
        } else if (device.isOutdoorPanAndTiltCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_PIR_SENSITIVITY,
                    "data": {
                        "enable": 0,
                        "quality": 0,
                        "status": 0,
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if ((device.isSoloCameras() && !this.isStationHomeBase3()) || device.isWiredDoorbellT8200X() || device.isStarlight4GLTE()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_PIR_SENSITIVITY,
                    "data": {
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_MOTION_SENSITIVITY,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbellDualE340() || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_MOTION_SENSITIVITY,
                    "mChannel": device.getChannel(),
                    "mValue3":0,
                    "payload": {
                        "channel": device.getChannel(),
                        "sensitivity": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if ((device.isBatteryDoorbell() && !device.isBatteryDoorbellDual()) || device.isWiredDoorbellDual() || device.isBatteryDoorbell() && device.isBatteryDoorbellC30()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
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
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIRSENSITIVITY,
                value: convertedValue,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E) {
            const convertedValue = 200 - ((value - 1) * 2);
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIRSENSITIVITY,
                value: convertedValue,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
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
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_MOTION_DETECTION_PACKAGE,
                    "data": {
                        "mode": intMode,
                        "sensitivity": intSensitivity,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.getDeviceType() === DeviceType.FLOODLIGHT) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_MDSENSITIVITY,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isCamera3Product() || device.isSmartDrop() || (device.isSoloCameras() && this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIRSENSITIVITY,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionType(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion detection type - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isCamera2Product() || device.isBatteryDoorbell() || device.getDeviceType() === DeviceType.CAMERA ||
            device.getDeviceType() === DeviceType.CAMERA_E || device.isSoloCameras() ||
            device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.isWiredDoorbellDual() || device.isStarlight4GLTE() || device.isGarageCamera() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithInt({
                commandType: CommandType.CMD_DEV_PUSHMSG_MODE,
                value: value,
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isFloodLight() || device.isIndoorCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbellT8200X()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_DETECT_TYPE,
                    "data":{
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionTypeHB3(device: Device, type: HB3DetectionTypes | T8170DetectionTypes | SoloCameraDetectionTypes | IndoorS350DetectionTypes, value: boolean): void {
        const propertyData: PropertyData = {
            name: type === HB3DetectionTypes.HUMAN_RECOGNITION ? PropertyName.DeviceMotionDetectionTypeHumanRecognition : type === HB3DetectionTypes.HUMAN_DETECTION || type === T8170DetectionTypes.HUMAN_DETECTION ? PropertyName.DeviceMotionDetectionTypeHuman : type === HB3DetectionTypes.PET_DETECTION ? PropertyName.DeviceMotionDetectionTypePet : type === HB3DetectionTypes.VEHICLE_DETECTION ? PropertyName.DeviceMotionDetectionTypeVehicle : PropertyName.DeviceMotionDetectionTypeAllOtherMotions,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion detection type HB3 - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), type: type, value: value });
        if (this.getDeviceType() === DeviceType.HB3) {
            try {
                if (!Object.values(HB3DetectionTypes).includes(type as HB3DetectionTypes)) {
                    rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(HB3DetectionTypes).filter((value) => typeof value === "number"));
                    return;
                }
                const aiDetectionType = device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number) !== undefined ? device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number)! : "0";
                let newAiDetectionType = getHB3DetectionMode(Number.parseInt(aiDetectionType), type as HB3DetectionTypes, value);
                if (newAiDetectionType === 0) {
                    newAiDetectionType = type;
                }
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
                        "mChannel": 0, //device.getChannel(),
                        "mValue3": 0,
                        "payload": {
                            "ai_detect_type": newAiDetectionType,
                            "channel": device.getChannel(),
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3, newAiDetectionType.toString(), "p2p");
                    }
                });
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error(`setMotionDetectionTypeHB3 Error`, { error: getError(error), stationSN: this.getSerial(), deviceSN: device.getSerial() });
            }
        } else if (device.isOutdoorPanAndTiltCamera()) {
            try {
                if (!Object.values(T8170DetectionTypes).includes(type as T8170DetectionTypes)) {
                    rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(T8170DetectionTypes).filter((value) => typeof value === "number"));
                    return;
                }
                const aiDetectionType = device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number) !== undefined ? device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number)! : "0";
                let newAiDetectionType = getT8170DetectionMode(Number.parseInt(aiDetectionType), type as T8170DetectionTypes, value);
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": {
                            "ai_detect_type": newAiDetectionType,
                            "channel": device.getChannel(),
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3, newAiDetectionType.toString(), "p2p");
                    }
                });
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error(`setMotionDetectionTypeHB3 T8170DetectionTypes Error`, { error: getError(error), stationSN: this.getSerial(), deviceSN: device.getSerial() });
            }
        } else if (device.isSoloCameras()) {
            try {
                if (!Object.values(SoloCameraDetectionTypes).includes(type as SoloCameraDetectionTypes)) {
                    rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(SoloCameraDetectionTypes).filter((value) => typeof value === "number"));
                    return;
                }
                let newAiDetectionType = type;
                if (!value) {
                    newAiDetectionType = type === SoloCameraDetectionTypes.ALL_OTHER_MOTION ? SoloCameraDetectionTypes.HUMAN_DETECTION : SoloCameraDetectionTypes.ALL_OTHER_MOTION;
                }
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": {
                            "ai_detect_type": newAiDetectionType,
                            "channel": device.getChannel(),
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3, newAiDetectionType.toString(), "p2p");
                    }
                });
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error(`setMotionDetectionTypeHB3 SoloCameraDetectionTypes Error`, { error: getError(error), stationSN: this.getSerial(), deviceSN: device.getSerial() });
            }
        } else if (device.isIndoorPanAndTiltCameraS350()) {
            try {
                if (!Object.values(IndoorS350DetectionTypes).includes(type as IndoorS350DetectionTypes)) {
                    rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(IndoorS350DetectionTypes).filter((value) => typeof value === "number"));
                    return;
                }
                const aiDetectionType = device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number) !== undefined ? device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number)! : "0";
                let newAiDetectionType = getIndoorS350DetectionMode(Number.parseInt(aiDetectionType), type as IndoorS350DetectionTypes, value);
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": {
                            "ai_detect_type": newAiDetectionType,
                            "channel": device.getChannel(),
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3, newAiDetectionType.toString(), "p2p");
                    }
                });
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error(`setMotionDetectionTypeHB3 IndoorS350DetectionTypes Error`, { error: getError(error), stationSN: this.getSerial(), deviceSN: device.getSerial() });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionZone(device: Device, value: MotionZone): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionZone,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion zone - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_DET_SET_ACTIVE_ZONE,
                "data": value
            }),
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setMotionTracking(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionTracking,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion tracking - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
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
        }, {
            property: propertyData
        });
    }

    public setPanAndTiltRotationSpeed(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRotationSpeed,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set pan and tilt rotation speed - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
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
        }, {
            property: propertyData
        });
    }

    public setMicMute(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMicrophone,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set mic mute - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_DEV_MIC_MUTE,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setAudioRecording(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAudioRecording,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set audio recording - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.isGarageCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.getDeviceType() === DeviceType.FLOODLIGHT && !device.isFloodLightT8420X()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_RECORD_AUDIO_SWITCH,
                    "payload": {
                        "storage_audio_switch": value === true ? 0 : 1,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isOutdoorPanAndTiltCamera() || (device.isIndoorPanAndTiltCameraS350() && !this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_SET_RECORD_AUDIO_ENABLE,
                    "data": {
                        "enable": value === true ? 1 : 0,
                        "quality": 0,
                        "status": 0,
                        "value": 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if ((device.isFloodLight() && !device.isFloodLightT8425()) || (device.isIndoorCamera() && !device.isIndoorPanAndTiltCameraS350()) || (device.isSoloCameras() && !this.isStationHomeBase3()) || device.isStarlight4GLTE()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_AUDIO_MUTE_RECORD,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbellDualE340() || device.isSmartDrop() || device.isLockWifiVideo() || device.isCameraProfessional247() || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425() || (device.isSoloCameras() && this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_AUDIO_MUTE_RECORD,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "channel": device.getChannel(),
                        "record_mute": value === true ? 0 : 1,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isCamera2Product() || device.isCamera3Product() || device.isBatteryDoorbell() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E || device.isWiredDoorbellDual()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbellT8200X()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_SET_RECORD_AUDIO_ENABLE,
                    "data":{
                        "enable": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_AUDIO_RECORDING,
                    "data":{
                        "status": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public enableSpeaker(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSpeaker,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station enable speaker - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_DEV_SPEAKER_MUTE,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setSpeakerVolume(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSpeakerVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set speaker volume - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SPEAKER_VOLUME,
                    "data": value
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEV_SPEAKER_VOLUME,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        }
    }

    public setRingtoneVolume(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRingtoneVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set ringtone volume - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbell() || device.isWiredDoorbellDual() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_SET_RINGTONE_VOLUME,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbellT8200X()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_T8200X_SET_RINGTONE_VOLUME,
                    "data":{
                        "status": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_RINGTONE_VOLUME,
                    "data":{
                        "volume": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public enableIndoorChime(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChimeIndoor,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station enable indoor chime - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbell()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_MECHANICAL_CHIME_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_INDOOR_CHIME,
                    "data":{
                        "status": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public enableHomebaseChime(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChimeHomebase,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station enable homebase chime - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbell() || device.isLockWifiVideo() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_CHIME_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setHomebaseChimeRingtoneVolume(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChimeHomebaseRingtoneVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set homebase chime ringtone volume - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_DINGDONG_V,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "dingdong_volume": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setHomebaseChimeRingtoneType(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChimeHomebaseRingtoneType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set homebase chime ringtone type - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_DINGDONG_R,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "dingdong_ringtone": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationType(device: Device, value: NotificationType | WalllightNotificationType): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification type - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if ((device.isFloodLight() && !device.isFloodLightT8425()) || (device.isIndoorCamera() && !device.isIndoorPanAndTiltCameraS350()) || (device.isSoloCameras() && !this.isStationHomeBase3()) || device.isStarlight4GLTE() || device.isGarageCamera()) {
            if (!Object.values(NotificationType).includes(value as NotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(NotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isIndoorPanAndTiltCameraS350() && !this.isStationHomeBase3()) {
            if (!Object.values(NotificationType).includes(value as NotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(NotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_PUSH_NOTIFY_TYPE,
                    "data": {
                        "enable": 0,
                        "quality": 0,
                        "status": 0,
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbellT8200X()) {
            if (!Object.values(NotificationType).includes(value as NotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(NotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_PUSH_NOTIFY_TYPE,
                    "data": {
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            if (!Object.values(WalllightNotificationType).includes(value as WalllightNotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(WalllightNotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_NOTIFICATION_TYPE,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbellDualE340() || device.isLockWifiVideo()) {
            if (!Object.values(NotificationType).includes(value as NotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(NotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "notification_motion_onoff": device.getPropertyValue(PropertyName.DeviceNotificationMotion) === true ? 1 : 0,
                        "notification_ring_onoff": device.getPropertyValue(PropertyName.DeviceNotificationRing) === true ? 1 : 0,
                        "notification_style": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbell() || device.isWiredDoorbellDual()) {
            if (!Object.values(NotificationType).includes(value as NotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(NotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mValue3": 0,
                    "payload": {
                        "notification_motion_onoff": device.getPropertyValue(PropertyName.DeviceNotificationMotion) === true ? 1 : 0,
                        "notification_ring_onoff": device.getPropertyValue(PropertyName.DeviceNotificationRing) === true ? 1 : 0,
                        "notification_style": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isCameraProfessional247() || (device.isIndoorPanAndTiltCameraS350() && this.isStationHomeBase3()) || device.isFloodLightT8425() || (device.isSoloCameras() && this.isStationHomeBase3())) {
            if (!Object.values(NotificationType).includes(value as NotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(NotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_PUSH_EFFECT,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "notification_style": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isCamera2Product() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E || device.isCamera3Product()) {
            if (!Object.values(NotificationType).includes(value as NotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(NotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbell()) {
            if (!Object.values(NotificationType).includes(value as NotificationType)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(NotificationType).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_NOTIFICATION_TYPE,
                    "data":{
                        "style": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationPerson(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationPerson,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification person - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isIndoorCamera() || device.isGarageCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_NOTIFICATION_TYPE_HUMAN,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationPet(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationPet,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification pet - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isIndoorCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationAllOtherMotion(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationAllOtherMotion,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification all other motion - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isIndoorCamera() || device.isGarageCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_NOTIFICATION_TYPE_ALL,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationAllSound(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationAllSound,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification all sound - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isIndoorCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationCrying(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationCrying,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification crying - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isIndoorCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationRing(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationRing,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification ring - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbell() || device.isWiredDoorbellDual()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mValue3": 0,
                    "payload": {
                        "notification_ring_onoff": value === true ? 1 : 0,
                        "notification_motion_onoff": device.getPropertyValue(PropertyName.DeviceNotificationMotion) === true ? 1 : 0,
                        "notification_style": device.getPropertyValue(PropertyName.DeviceNotificationType),
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "notification_ring_onoff": value === true ? 1 : 0,
                        "notification_motion_onoff": device.getPropertyValue(PropertyName.DeviceNotificationMotion) === true ? 1 : 0,
                        "notification_style": device.getPropertyValue(PropertyName.DeviceNotificationType),
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_NOTIFICATION_RING,
                    "data":{
                        "type": value === true ? ((device.getPropertyValue(PropertyName.DeviceNotificationMotion) as boolean) === true ? 3 : 1) : ((device.getPropertyValue(PropertyName.DeviceNotificationMotion) as boolean) === true ? 2 : 0),
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationMotion(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationMotion,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification motion - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbell() || device.isWiredDoorbellDual()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mValue3": 0,
                    "payload": {
                        "notification_motion_onoff": value === true ? 1 : 0,
                        "notification_ring_onoff": device.getPropertyValue(PropertyName.DeviceNotificationRing) === true ? 1 : 0,
                        "notification_style": device.getPropertyValue(PropertyName.DeviceNotificationType),
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "notification_motion_onoff": value === true ? 1 : 0,
                        "notification_ring_onoff": device.getPropertyValue(PropertyName.DeviceNotificationRing) === true ? 1 : 0,
                        "notification_style": device.getPropertyValue(PropertyName.DeviceNotificationType),
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_NOTIFICATION_RING,
                    "data":{
                        "type": value === true ? ((device.getPropertyValue(PropertyName.DeviceNotificationRing) as boolean) === true ? 3 : 2) : ((device.getPropertyValue(PropertyName.DeviceNotificationRing) as boolean) === true ? 1 : 0),
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setPowerSource(device: Device, value: PowerSource): void {
        const propertyData: PropertyData = {
            name: PropertyName.DevicePowerSource,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set power source - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isStarlight4GLTE()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_POWER_CHARGE,
                    "data":{
                        "enable": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isOutdoorPanAndTiltCamera() || (device.isSoloCameras() && !this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_POWER_CHARGE,
                    "data":{
                        "enable": value,
                        "quality": 0,
                        "status": 0,
                        "value": 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        }
    }

    public setPowerWorkingMode(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DevicePowerWorkingMode,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set power working mode - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_PIR_POWERMODE,
            value: value,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setRecordingClipLength(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRecordingClipLength,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set recording clip length - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DEV_RECORD_TIMEOUT,
            value: value,
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setRecordingRetriggerInterval(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRecordingRetriggerInterval,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set recording retrigger interval - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DEV_RECORD_INTERVAL,
            value: value,
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setRecordingEndClipMotionStops(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRecordingEndClipMotionStops,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set recording end clip motion stops - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DEV_RECORD_AUTOSTOP,
            value: value === true ? 0 : 1,
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setVideoStreamingQuality(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoStreamingQuality,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set video streaming quality - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });

        if (device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY2,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "mode": -1,
                        "primary_view": -1,
                        "quality": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isOutdoorPanAndTiltCamera() || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY2,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "channel": device.getChannel(),
                        "mode": 0,
                        "primary_view": 0,
                        "quality": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isIndoorCamera() || (device.isSoloCameras() && !this.isStationHomeBase3()) || device.isFloodLight() || device.isWiredDoorbell() || device.isStarlight4GLTE() || device.isGarageCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_VIDEO_QUALITY,
                    "data": {
                        "quality": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_RESOLUTION,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbell() || device.isCamera2CPro() || device.isWiredDoorbellDual() || device.isCamera3() || device.isCamera3C() || device.isCamera3Pro() || device.isSmartDrop() || device.isLockWifiVideo() || device.isCameraProfessional247() || (device.isSoloCameras() && this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setVideoRecordingQuality(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoRecordingQuality,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set video recording quality - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_RECORD_QUALITY2,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "mode": -1,
                        "primary_view": -1,
                        "quality": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isOutdoorPanAndTiltCamera() || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_RECORD_QUALITY2,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "channel": device.getChannel(),
                        "mode": 0,
                        "primary_view": 0,
                        "quality": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isIndoorCamera() || device.isWiredDoorbell() || device.isFloodLight() || (device.isSoloCameras() && !this.isStationHomeBase3()) || device.isStarlight4GLTE() || device.isGarageCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
                    "data": {
                        "quality": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_RECORD_QUALITY,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isCamera2CPro() || device.isCamera3() || device.isCamera3C() || device.isCameraProfessional247() || device.isCamera3Pro()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if ((device.isSoloCameras() && this.isStationHomeBase3()) || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_RECORD_QUALITY,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "record_quality": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setWDR(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoWDR,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set wdr - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_BAT_DOORBELL_WDR_SWITCH,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setFloodlightLightSettingsEnable(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsEnable,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings enable - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_FLOODLIGHT_TOTAL_SWITCH,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setFloodlightLightSettingsBrightnessManual(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsBrightnessManual,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings brightness manual - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isFloodLight() || device.isSoloCameraSpotlight1080() || device.isSoloCameraSpotlight2k() ||
            device.isSoloCameraSpotlightSolar() || device.isCamera2C() || device.isCamera2CPro() ||
            device.isIndoorOutdoorCamera1080p() || device.isIndoorOutdoorCamera2k() || device.isCamera3() || device.isCamera3C() || device.isCamera3Pro() || device.isOutdoorPanAndTiltCamera() || device.isCameraProfessional247()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_FLOODLIGHT_BRIGHT_VALUE,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_FLOODLIGHT_BRIGHT_VALUE,
                    "data": {
                        "type": 0,
                        "value": value,
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setFloodlightLightSettingsBrightnessMotion(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsBrightnessMotion,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings brightness motion - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425) as unknown as FloodlightLightSettingsMotionT8425Property;
            if (rawProperty !== undefined) {
                const payload: FloodlightLightSettingsMotionT8425Property = {
                    ...rawProperty,
                    brightness: value,
                };
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": payload
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425, payload as unknown as string, "p2p");
                    }
                });
            } else {
                rootHTTPLogger.error(`Station set light settings brightness motion - Needed raw property "${CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else if (device.isFloodLight()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR,
                    "data": {
                        "type": 0,
                        "value": value,
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setFloodlightLightSettingsBrightnessSchedule(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsBrightnessSchedule,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings brightness schedule - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH_T8425,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "brightness": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isFloodLight()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH,
                    "data": {
                        "type": 0,
                        "value": value,
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setFloodlightLightSettingsMotionTriggered(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionTriggered,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings motion triggered - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425) as unknown as FloodlightLightSettingsMotionT8425Property;
            if (rawProperty !== undefined) {
                const payload: FloodlightLightSettingsMotionT8425Property = {
                    ...rawProperty,
                    enable: value === true ? 1 : 0,
                };
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": payload
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425, payload as unknown as string, "p2p");
                    }
                });
            } else {
                rootHTTPLogger.error(`Station set light settings motion triggered - Needed raw property "${CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else if (device.isFloodLight()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_LIGHT_CTRL_PIR_SWITCH,
                value: value === true ? 1 : 0,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_LIGHT_CTRL_PIR_SWITCH,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setFloodlightLightSettingsMotionTriggeredDistance(device: Device, value: FloodlightMotionTriggeredDistance): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionTriggeredDistance,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
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
                throw new InvalidPropertyValueError("Invalid value for this property", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }

        rootHTTPLogger.debug(`Station set light settings motion triggered distance - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: newValue });
        if (device.isFloodLight()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIRSENSITIVITY,
                value: newValue,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setFloodlightLightSettingsMotionTriggeredTimer(device: Device, seconds: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionTriggeredTimer,
            value: seconds
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, seconds);

        rootHTTPLogger.debug(`Station set light settings motion triggered timer - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: seconds });
        if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425) as unknown as FloodlightLightSettingsMotionT8425Property;
            if (rawProperty !== undefined) {
                const payload: FloodlightLightSettingsMotionT8425Property = {
                    ...rawProperty,
                    time: seconds
                };
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": payload
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425, payload as unknown as string, "p2p");
                    }
                });
            } else {
                rootHTTPLogger.error(`Station set light settings motion triggered timer - Needed raw property "${CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else if (device.isFloodLight()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_LIGHT_CTRL_PIR_TIME,
                value: seconds,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_LIGHT_CTRL_PIR_TIME,
                    "data": seconds,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public triggerStationAlarmSound(seconds: number): void {
        const commandData: CommandData = {
            name: CommandName.StationTriggerAlarmSound,
            value: seconds
        };
        if (!this.hasCommand(CommandName.StationTriggerAlarmSound)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, station: this.getSerial()} });
        }
        rootHTTPLogger.debug(`Station trigger station alarm sound - sending command`, { stationSN: this.getSerial(), value: seconds });
        if (!isGreaterEqualMinVersion("2.0.7.9", this.getSoftwareVersion()) || Device.isIntegratedDeviceBySn(this.getSerial())) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_TONE_FILE,
                value: 2,
                valueSub: seconds,
                strValue: this.rawStation.member.admin_user_id,
                channel: Station.CHANNEL
            }, {
                command: commandData
            });
        } else {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                command: commandData
            });
        }
    }

    public resetStationAlarmSound(): void {
        this.triggerStationAlarmSound(0);
    }

    public triggerDeviceAlarmSound(device: Device, seconds: number): void {
        const commandData: CommandData = {
            name: CommandName.DeviceTriggerAlarmSound,
            value: seconds
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceTriggerAlarmSound)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station trigger device alarm sound - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: seconds });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_DEVS_TONE_FILE,
            value: seconds,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            command: commandData
        });
    }

    public resetDeviceAlarmSound(device: Device): void {
        this.triggerDeviceAlarmSound(device, 0);
    }

    public setStationAlarmRingtoneVolume(value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationAlarmVolume,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set station alarm ringtone volume - sending command`, { stationSN: this.getSerial(), value: value });
        if (Device.isWallLightCam(this.getDeviceType())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_ALERT_VOLUME,
                    "data": value
                }),
                channel: 0
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithInt({
                commandType: CommandType.CMD_SET_HUB_SPK_VOLUME,
                value: value,
                strValue: this.rawStation.member.admin_user_id,
                channel: Station.CHANNEL
            }, {
                property: propertyData
            });
        }
    }

    public setStationAlarmTone(value: AlarmTone): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationAlarmTone,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set station alarm tone - sending command`, { stationSN: this.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
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
        }, {
            property: propertyData
        });
    }

    public setStationPromptVolume(value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationPromptVolume,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set station prompt volume - sending command`, { stationSN: this.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
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
        }, {
            property: propertyData
        });
    }

    public setStationNotificationSwitchMode(mode: NotificationSwitchMode, value: boolean): void {
        const propertyData: PropertyData = {
            name: mode === NotificationSwitchMode.APP ? PropertyName.StationNotificationSwitchModeApp : mode === NotificationSwitchMode.GEOFENCE ? PropertyName.StationNotificationSwitchModeGeofence : mode === NotificationSwitchMode.KEYPAD ? PropertyName.StationNotificationSwitchModeKeypad : mode === NotificationSwitchMode.SCHEDULE ? PropertyName.StationNotificationSwitchModeSchedule : "" as PropertyName,
            value: value
        };
        if ((!this.hasProperty(PropertyName.StationNotificationSwitchModeApp) && mode === NotificationSwitchMode.APP) ||
        (!this.hasProperty(PropertyName.StationNotificationSwitchModeGeofence) && mode === NotificationSwitchMode.GEOFENCE) ||
        (!this.hasProperty(PropertyName.StationNotificationSwitchModeKeypad) && mode === NotificationSwitchMode.KEYPAD) ||
        (!this.hasProperty(PropertyName.StationNotificationSwitchModeSchedule) && mode === NotificationSwitchMode.SCHEDULE)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set station notification switch mode - sending command`, { stationSN: this.getSerial(), mode: mode, value: value });
        if (this.isStation() && isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
            let oldvalue = 0;
            const rawproperty = this.getRawProperty(CommandType.CMD_HUB_NOTIFY_MODE);
            if (rawproperty !== undefined) {
                try {
                    oldvalue = Number.parseInt(rawproperty);
                } catch(error) {
                }
            }
            const pushMode = switchNotificationMode(oldvalue, mode, value);
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                    "mValue3": 0,
                    "payload": {
                        "arm_push_mode": pushMode,
                        "notify_alarm_delay": this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay) !== undefined ? (this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay) === true ? 1 : 0) : 0,
                        "notify_mode": 0,
                    }
                }),
                channel: Station.CHANNEL
            }, {
                property: propertyData,
                onSuccess: () => {
                    this.updateRawProperty(CommandType.CMD_HUB_NOTIFY_MODE, pushMode.toString(), "p2p");
                }
            });
        } else if (this.getDeviceType() === DeviceType.OUTDOOR_PT_CAMERA || Device.isSoloCameraC210(this.getDeviceType())) {
            let oldvalue = 0;
            const rawproperty = this.getRawProperty(CommandType.CMD_HUB_NOTIFY_MODE);
            if (rawproperty !== undefined) {
                try {
                    oldvalue = Number.parseInt(rawproperty);
                } catch(error) {
                }
            }
            const pushMode = switchNotificationMode(oldvalue, mode, value);
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                    "mChannel": 0,
                    "mValue3": 0,
                    "payload": {
                        "arm_push_mode": pushMode,
                        "notify_alarm_delay": 0,
                        "notify_mode": 0,
                    }
                }),
                channel: Station.CHANNEL
            }, {
                property: propertyData,
                onSuccess: () => {
                    this.updateRawProperty(CommandType.CMD_HUB_NOTIFY_MODE, pushMode.toString(), "p2p");
                }
            });
        } else {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_HUB_NOTIFY_MODE,
                    "mValue3": 0,
                    "payload": {
                        //"arm_push_mode": 0,
                        "notify_alarm_delay": this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay) !== undefined ? (this.getPropertyValue(PropertyName.StationNotificationStartAlarmDelay) === true ? 1 : 0) : 0,
                        "notify_mode": value === true ? 1 : 0, // 0 or 1
                    }
                }),
                channel: Station.CHANNEL
            }, {
                property: propertyData,
                onSuccess: () => {
                    this.updateRawProperty(CommandType.CMD_HUB_NOTIFY_MODE, String(value === true ? 1 : 0), "p2p");
                }
            });
        }
    }

    public setStationNotificationStartAlarmDelay(value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationNotificationStartAlarmDelay,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        let pushmode = 0;
        const rawproperty = this.getRawProperty(CommandType.CMD_HUB_NOTIFY_MODE);
        if (rawproperty !== undefined) {
            try {
                pushmode = Number.parseInt(rawproperty);
            } catch(error) {
            }
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set station notification start alarm delay - sending command`, { stationSN: this.getSerial(), value: value });
        if (isGreaterEqualMinVersion("2.1.1.6", this.getSoftwareVersion())) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        }
    }

    public setStationTimeFormat(value: TimeFormat): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationTimeFormat,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set station time format - sending command`, { stationSN: this.getSerial(), value: value });
        if (Device.isWallLightCam(this.getDeviceType())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_HUB_OSD,
                    "data": value
                }),
                channel: 0
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithInt({
                commandType: CommandType.CMD_SET_HUB_OSD,
                value: value,
                strValue: this.rawStation.member.admin_user_id,
                channel: Station.CHANNEL
            }, {
                property: propertyData
            });
        }
    }

    public setRTSPStream(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRTSPStream,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set rtsp stream - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_NAS_SWITCH,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setAntiTheftDetection(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAntitheftDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set anti theft detection - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_EAS_SWITCH,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setWatermark(device: Device, value: WatermarkSetting1 | WatermarkSetting2 | WatermarkSetting3 | WatermarkSetting4 | WatermarkSetting5): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceWatermark,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set watermark - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isCamera2Product() || device.isCamera3Product() || device.isSoloCameraSolar() || device.isOutdoorPanAndTiltCamera() || device.isCameraProfessional247() || device.isIndoorPanAndTiltCameraS350() || device.isSoloCameraC210() || device.isFloodLightT8425()) {
            if (!Object.values(WatermarkSetting3).includes(value as WatermarkSetting3)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(WatermarkSetting3).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isSoloCameras() || device.isWiredDoorbell() || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.isStarlight4GLTE()) {
            if (!Object.values(WatermarkSetting1).includes(value as WatermarkSetting1)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(WatermarkSetting1).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: 0,
                strValue: this.rawStation.member.admin_user_id,
                channel: 0
            }, {
                property: propertyData
            });
        } else if (device.isIndoorCamera() || device.isFloodLight()) {
            if (!Object.values(WatermarkSetting4).includes(value as WatermarkSetting4)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(WatermarkSetting4).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbell() || device.getDeviceType() === DeviceType.CAMERA || device.getDeviceType() === DeviceType.CAMERA_E || device.isWiredDoorbellDual() || device.isLockWifiVideo()) {
            if (!Object.values(WatermarkSetting2).includes(value as WatermarkSetting2)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values: `, Object.values(WatermarkSetting2).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            if (!Object.values(WatermarkSetting1).includes(value as WatermarkSetting1)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(WatermarkSetting1).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_DEVS_OSD,
                    "data": value
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isGarageCamera()) {
            if (!Object.values(WatermarkSetting5).includes(value as WatermarkSetting5)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, Object.values(WatermarkSetting5).filter((value) => typeof value === "number"));
                return;
            }
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isSmartDrop()) {
            if (!Object.values(WatermarkSetting1).includes(value as WatermarkSetting1)) {
                rootHTTPLogger.error(`The device ${device.getSerial()} accepts only this type of values:`, WatermarkSetting1);
                return;
            }
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_DEVS_OSD,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public enableDevice(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceEnabled,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        let param_value = value === true ? 0 : 1;

        if ((device.isIndoorCamera() && !device.isIndoorCamMini() && !device.isIndoorPanAndTiltCameraS350()) || (device.isWiredDoorbell() && !device.isWiredDoorbellT8200X()) || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8422 || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8424 || device.isFloodLightT8420X())
            param_value = value === true ? 1 : 0;

        rootHTTPLogger.debug(`Station enable device - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isIndoorCamMini()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_ENABLE_PRIVACY_MODE,
                    "data":{
                        "value": param_value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isIndoorPanAndTiltCameraS350()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_INDOOR_ENABLE_PRIVACY_MODE_S350,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload":{
                        "switch": param_value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isIndoorCamera() && isGreaterEqualMinVersion("2.3.1.0", device.getSoftwareVersion()) && Station.isStationHomeBase3BySn(device.getStationSerial())) {
            param_value = value === true ? 0 : 1;
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_INDOOR_ENABLE_PRIVACY_MODE_S350,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload":{
                        "switch": param_value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_DEVS_SWITCH,
                value: param_value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        }
    }

    public async startDownload(device: Device, path: string, cipher_id?: number): Promise<void> {
        const commandData: CommandData = {
            name: CommandName.DeviceStartDownload,
            value: {
                path: path,
                cipher_id: cipher_id
            }
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceStartDownload)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station start download - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), path: path, cipherID: cipher_id });
        if (this.getDeviceType() === DeviceType.HB3) {
            //TODO: Implement HB3 Support! Actually doesn't work and returns return_code -104 (ERROR_INVALID_ACCOUNT). It could be that we need the new encrypted p2p protocol to make this work...
            const rsa_key = this.p2pSession.getDownloadRSAPrivateKey();
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOWNLOAD_VIDEO,
                value: JSON.stringify({
                    account_id: this.rawStation.member.admin_user_id,
                    cmd: CommandType.CMD_DOWNLOAD_VIDEO,
                    mChannel: device.getChannel(),
                    mValue3: CommandType.CMD_DOWNLOAD_VIDEO,
                    payload: {
                        filepath: path,
                        key: rsa_key?.exportKey("components-public").n.subarray(1).toString("hex").toUpperCase(),
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (cipher_id !== undefined) {
            const cipher = await this.api.getCipher(/*this.rawStation.station_sn, */cipher_id, this.rawStation.member.admin_user_id);
            if (Object.keys(cipher).length > 0) {
                this.p2pSession.setDownloadRSAPrivateKeyPem(cipher.private_key);
                this.p2pSession.sendCommandWithString({
                    commandType: CommandType.CMD_DOWNLOAD_VIDEO,
                    strValue: path,
                    strValueSub: this.rawStation.member.admin_user_id,
                    channel: device.getChannel()
                }, {
                    command: commandData
                });
            } else {
                rootHTTPLogger.warn(`Cancelled download of video "${path}" from Station ${this.getSerial()}, because RSA certificate couldn't be loaded`);
                this.emit("command result", this, {
                    channel: device.getChannel(),
                    command_type: CommandType.CMD_DOWNLOAD_VIDEO,
                    return_code: ErrorCode.ERROR_INVALID_PARAM,
                    customData: {
                        command: commandData
                    }
                });
            }
        } else {
            this.p2pSession.sendCommandWithString({
                commandType: CommandType.CMD_DOWNLOAD_VIDEO,
                strValue: path,
                strValueSub: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                command: commandData
            });
        }
        /* else {
            rootHTTPLogger.warn(`Cancelled download of video "${path}" from Station ${this.getSerial()}, because cipher_id is missing`);
            this.emit("command result", this, {
                channel: device.getChannel(),
                command_type: CommandType.CMD_DOWNLOAD_VIDEO,
                return_code: ErrorCode.ERROR_INVALID_PARAM,
                customData: {
                    command: commandData
                }
            });
        }*/
    }

    public cancelDownload(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceCancelDownload
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceCancelDownload)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station cancel download - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DOWNLOAD_CANCEL,
            value: device.getChannel(),
            strValueSub: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            command: commandData
        });
    }

    public startLivestream(device: Device, videoCodec: VideoCodec = VideoCodec.H264): void {
        const commandData: CommandData = {
            name: CommandName.DeviceStartLivestream,
            value: videoCodec
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceStartLivestream)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (this.isLiveStreaming(device)) {
            throw new LivestreamAlreadyRunningError("Livestream for device is already running", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station start livestream - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec });
        const rsa_key = this.p2pSession.getRSAPrivateKey();

        if (device.isSmartDrop()) {
            rootHTTPLogger.debug(`Station start livestream - sending command (smart drop)`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_START_REALTIME_MEDIA,
                    "mChannel": 0,
                    "mValue3": CommandType.CMD_START_REALTIME_MEDIA,
                    "payload": {
                        "ClientOS": "Android",
                        "camera_type": 0,
                        "entrytype": 0,
                        "key": rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                        "streamtype": videoCodec === VideoCodec.H264 ? 1 : 2,
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isOutdoorPanAndTiltCamera()) {
            rootHTTPLogger.debug(`Station start livestream - sending command using CMD_DOORBELL_SET_PAYLOAD (1)`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_START_LIVESTREAM,
                    "data": {
                        "accountId": this.rawStation.member.admin_user_id,
                        "camera_type": 0,
                        "encryptkey": rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                        "entrytype": 0,
                        "streamtype": videoCodec
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isSoloCameras() || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8424 || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8424 || device.isWiredDoorbellT8200X() || device.isWallLightCam() || device.isGarageCamera()) {
            rootHTTPLogger.debug(`Station start livestream - sending command using CMD_DOORBELL_SET_PAYLOAD (2)`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_START_LIVESTREAM,
                    "data": {
                        "accountId": this.rawStation.member.admin_user_id,
                        "encryptkey": rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                        "streamtype": videoCodec
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if ((device.isIndoorPanAndTiltCameraS350() && this.isStationHomeBase3()) || device.isFloodLightT8425()) {
            rootHTTPLogger.debug(`Station start livestream - sending command using CMD_SET_PAYLOAD`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_START_REALTIME_MEDIA,
                    "mChannel": device.getChannel(),
                    "mValue3": CommandType.CMD_START_REALTIME_MEDIA,
                    "payload": {
                        "ClientOS": "Android",
                        "accountId": this.rawStation.member.admin_user_id,
                        "camera_type": 0,
                        "entrytype": 0,
                        "key": rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                        "streamtype": videoCodec === VideoCodec.H264 ? 1 : 2,
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isIndoorPanAndTiltCameraS350()) {
            rootHTTPLogger.debug(`Station start livestream - sending command using CMD_DOORBELL_SET_PAYLOAD (4)`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_START_LIVESTREAM,
                    "data": {
                        "accountId": this.rawStation.member.admin_user_id,
                        "camera_type": 0,
                        "encryptkey": rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                        "entrytype": 0,
                        "msg_id": 86,
                        "streamtype": videoCodec
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isWiredDoorbell() || (device.isFloodLight() && device.getDeviceType() !== DeviceType.FLOODLIGHT) || device.isIndoorCamera() || (device.getSerial().startsWith("T8420") && isGreaterEqualMinVersion("2.0.4.8", this.getSoftwareVersion()))) {
            rootHTTPLogger.debug(`Station start livestream - sending command using CMD_DOORBELL_SET_PAYLOAD (3)`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_START_LIVESTREAM,
                    "data": {
                        "account_id": this.rawStation.member.admin_user_id,
                        "encryptkey": rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                        "streamtype": videoCodec
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isCameraProfessional247()) {
            rootHTTPLogger.debug(`Station start livestream - sending command using CMD_SET_PAYLOAD`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_START_REALTIME_MEDIA,
                    "mValue3": CommandType.CMD_START_REALTIME_MEDIA,
                    "payload": {
                        "ClientOS": "Android",
                        "camera_type": 0,
                        "entrytype": 0,
                        "key": rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                        "streamtype": videoCodec === VideoCodec.H264 ? 1 : 2,
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else {
            if ((Device.isIntegratedDeviceBySn(this.getSerial()) || !isGreaterEqualMinVersion("2.0.9.7", this.getSoftwareVersion())) && (!this.getSerial().startsWith("T8420") || !isGreaterEqualMinVersion("1.0.0.25", this.getSoftwareVersion())) || device.isLockWifiVideo()) {
                rootHTTPLogger.debug(`Station start livestream - sending command using CMD_START_REALTIME_MEDIA`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
                this.p2pSession.sendCommandWithInt({
                    commandType: CommandType.CMD_START_REALTIME_MEDIA,
                    value: device.getChannel(),
                    strValue: rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                    channel: device.getChannel()
                }, {
                    command: commandData
                });
            } else {
                rootHTTPLogger.debug(`Station start livestream - sending command using CMD_SET_PAYLOAD`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), videoCodec: videoCodec, main_sw_version: this.getSoftwareVersion() });
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_START_REALTIME_MEDIA,
                        "mValue3": CommandType.CMD_START_REALTIME_MEDIA,
                        "payload": {
                            "ClientOS": "Android",
                            "key": rsa_key?.exportKey("components-public").n.subarray(1).toString("hex"),
                            "streamtype": videoCodec === VideoCodec.H264 ? 1 : 2,
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    command: commandData
                });
            }
        }
    }

    public stopLivestream(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceStopLivestream
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceStopLivestream)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!this.isLiveStreaming(device)) {
            throw new LivestreamNotRunningError("Livestream for device is not running", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station stop livestream - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_STOP_REALTIME_MEDIA,
            value: device.getChannel(),
            channel: device.getChannel()
        }, {
            command: commandData
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

    public quickResponse(device: Device, voice_id: number): void {
        const commandData: CommandData = {
            name: CommandName.DeviceQuickResponse,
            value: voice_id
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceQuickResponse)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station quick response - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), voiceID: voice_id });
        if (device.isBatteryDoorbell() || device.isLockWifiVideo()) {
            rootHTTPLogger.debug(`Station quick response - sending command using CMD_BAT_DOORBELL_QUICK_RESPONSE`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), voiceID: voice_id });
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_BAT_DOORBELL_QUICK_RESPONSE,
                value: voice_id,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isWiredDoorbell()) {
            rootHTTPLogger.debug(`Station quick response - sending command using CMD_DOORBELL_SET_PAYLOAD`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), voiceID: voice_id });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_QUICK_RESPONSE,
                    "data": {
                        "voiceID": voice_id
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
    }

    public setChirpVolume(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChirpVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set chirp volume - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isEntrySensor()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setChirpTone(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceChirpTone,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set chirp tone - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isEntrySensor()) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SENSOR_SET_CHIRP_TONE,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setHDR(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoHDR,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set hdr - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_HDR,
                    "data":{
                        "status": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setDistortionCorrection(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoDistortionCorrection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set distortion correction - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_DISTORTION_CORRECTION,
                    "data":{
                        "status": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setRingRecord(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoRingRecord,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set ring record - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWiredDoorbell()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": ParamType.COMMAND_VIDEO_RING_RECORD,
                    "data":{
                        "status": value
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public lockDevice(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLocked,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station lock device - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockBleNoFinger() || device.isLockBle()) {
            const key = generateBasicLockAESKey(this.rawStation.member.admin_user_id, this.getSerial());
            const iv = getLockVectorBytes(this.getSerial());
            const lockCmd = Lock.encodeESLCmdOnOff(Number.parseInt(this.rawStation.member.short_user_id), this.rawStation.member.nick_name, value);
            const payload: ESLStationP2PThroughData = {
                channel: device.getChannel(),
                lock_cmd: ESLBleCommand.ON_OFF_LOCK,
                lock_payload: lockCmd.toString("base64"),
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const encPayload = encryptLockAESData(key, iv, encodeLockPayload(JSON.stringify(payload)));

            rootHTTPLogger.debug("Station lock device - Locking/unlocking device...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: payload, encPayload: encPayload.toString("hex") });

            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            const nestedPayload: LockAdvancedOnOffRequestPayload = {
                shortUserId: this.rawStation.member.short_user_id,
                slOperation: value === true ? 1 : 0,
                userId: this.rawStation.member.admin_user_id,
                userName: this.rawStation.member.nick_name,
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const command = getLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                CommandType.P2P_ON_OFF_LOCK,
                device.getChannel(),
                this.lockPublicKey,
                nestedPayload
            );
            this.p2pSession.setLockAESKey(CommandType.P2P_ON_OFF_LOCK, command.aesKey);
            rootHTTPLogger.debug("Station lock device - Locking/unlocking device...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command, nestedPayload: nestedPayload });

            this.p2pSession.sendCommandWithStringPayload(command, {
                property: propertyData
            });
        } else if (device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.P2P_ON_OFF_LOCK,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "shortUserId": this.rawStation.member.short_user_id,
                        "slOperation": value === true ? 1 : 0,
                        "userId": this.rawStation.member.admin_user_id,
                        "userName": this.rawStation.member.nick_name,
                    }
                }),
                channel: device.getChannel(),
            }, {
                property: propertyData
            });
            rootHTTPLogger.debug("Station lock device - Locking/unlocking device...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id });
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.ON_OFF_LOCK,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdUnlock(this.rawStation.member.short_user_id, value === true ? 1 : 0, this.rawStation.member.nick_name)
            );
            rootHTTPLogger.debug("Station lock device - Locking/unlocking device...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this._sendLockV12P2PCommand(command, {
                property: propertyData
            });
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.ON_OFF_LOCK,
                device.getChannel(),
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockUnlock(this.rawStation.member.admin_user_id, value, this.rawStation.member.nick_name, this.rawStation.member.short_user_id)
            );
            rootHTTPLogger.debug("Station lock device - Locking/unlocking device...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this.p2pSession.sendCommandWithStringPayload(command.payload, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setStationSwitchModeWithAccessCode(value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationNotificationSwitchModeGeofence,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set station switch mode with access code - sending command`, { stationSN: this.getSerial(), value: value });
        if (this.isStation()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
    }

    public setStationAutoEndAlarm(value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationAutoEndAlarm,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station station auto end alarm - sending command`, { stationSN: this.getSerial(), value: value });
        if (this.isStation()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
    }

    public setStationTurnOffAlarmWithButton(value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationTurnOffAlarmWithButton,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set station turn off alarm with button - sending command`, { stationSN: this.getSerial(), value: value });
        if (this.isStation()) {
            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { propertyName: propertyData.name, propertyValue: propertyData.value, station: this.getSerial()} });
        }
    }

    public startRTSPStream(device: Device): void {
        const rtspStreamProperty = device.getPropertyValue(PropertyName.DeviceRTSPStream);
        if (rtspStreamProperty !== undefined && rtspStreamProperty !== true) {
            throw new RTSPPropertyNotEnabledError("RTSP setting for this device must be enabled first, to enable this functionality!", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: PropertyName.DeviceRTSPStream, propertyValue: rtspStreamProperty } });
        }
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRTSPStream,
            value: rtspStreamProperty
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(PropertyName.DeviceRTSPStream)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station start rtsp stream - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_NAS_TEST,
            value: 1,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public stopRTSPStream(device: Device): void {
        const rtspStreamProperty = device.getPropertyValue(PropertyName.DeviceRTSPStream);
        if (rtspStreamProperty !== undefined && rtspStreamProperty !== true) {
            throw new RTSPPropertyNotEnabledError("RTSP setting for this device must be enabled first, to enable this functionality!", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: PropertyName.DeviceRTSPStream, propertyValue: rtspStreamProperty } });
        }
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRTSPStream,
            value: rtspStreamProperty
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(PropertyName.DeviceRTSPStream)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station stop rtsp stream - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_NAS_TEST,
            value: 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setMotionDetectionRange(device: Device, type: MotionDetectionRangeType): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRange,
            value: type
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, type);

        rootHTTPLogger.debug(`Station set motion detection range - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: type });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE,
                    "data": {
                        "value": type,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425) as unknown as FloodlightDetectionRangeT8425Property;
            if (rawProperty !== undefined) {
                const payload: FloodlightDetectionRangeT8425Property = {
                    ...rawProperty,
                };
                const currentMode = type === 0 ? payload.mode0 : type === 1 ? payload.mode1 : type === 2 ? payload.mode2 : undefined;
                if (currentMode !== undefined && Array.isArray(currentMode) && currentMode.length === 4) {
                    payload.cur_mode = type;
                    this.p2pSession.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_SET_PAYLOAD,
                        value: JSON.stringify({
                            "account_id": this.rawStation.member.admin_user_id,
                            "cmd": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
                            "mChannel": device.getChannel(),
                            "mValue3": 0,
                            "payload": {
                                "cur_mode": payload.cur_mode,
                                "param": currentMode,
                                "test_mode": 2,
                            }
                        }),
                        channel: device.getChannel()
                    }, {
                        property: propertyData,
                        onSuccess: () => {
                            device.updateRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425, payload as unknown as string, "p2p");
                        }
                    });
                } else {
                    rootHTTPLogger.error(`Station set motion detection range - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} has unexpected value`, { stationSN: this.getSerial(), rawProperty: rawProperty });
                }
            } else {
                rootHTTPLogger.error(`Station set motion detection range - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionRangeStandardSensitivity(device: Device, sensitivity: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRangeStandardSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        rootHTTPLogger.debug(`Station set motion detection range standard sensitivity - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: sensitivity });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_STD_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425) as unknown as FloodlightDetectionRangeT8425Property;
            if (rawProperty !== undefined) {
                if (rawProperty.mode0 !== undefined && Array.isArray(rawProperty.mode0) && rawProperty.mode0.length === 4) {
                    const payload: FloodlightDetectionRangeT8425Property = {
                        ...rawProperty,
                    };
                    payload.cur_mode = MotionDetectionRangeType.STANDARD;
                    payload.mode0[payload.mode0.findIndex((element) => element.id === 1)].sst = sensitivity;
                    this.p2pSession.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_SET_PAYLOAD,
                        value: JSON.stringify({
                            "account_id": this.rawStation.member.admin_user_id,
                            "cmd": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
                            "mChannel": device.getChannel(),
                            "mValue3": 0,
                            "payload": {
                                "cur_mode": payload.cur_mode,
                                "param": payload.mode0.slice(0, 2),
                                "test_mode": 2,
                            }
                        }),
                        channel: device.getChannel()
                    }, {
                        property: propertyData,
                        onSuccess: () => {
                            device.updateRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425, payload as unknown as string, "p2p");
                        }
                    });
                } else {
                    rootHTTPLogger.error(`Station set motion detection range standard sensitivity - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} has unexpected value`, { stationSN: this.getSerial(), rawProperty: rawProperty });
                }
            } else {
                rootHTTPLogger.error(`Station set motion detection range standard sensitivity - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionRangeAdvancedLeftSensitivity(device: Device, sensitivity: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        rootHTTPLogger.debug(`Station motion detection range advanced left sensitivity - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: sensitivity });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_LEFT_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425) as unknown as FloodlightDetectionRangeT8425Property;
            if (rawProperty !== undefined) {
                if (rawProperty.mode1 !== undefined && Array.isArray(rawProperty.mode1) && rawProperty.mode1.length === 4) {
                    const payload: FloodlightDetectionRangeT8425Property = {
                        ...rawProperty,
                    };
                    payload.cur_mode = MotionDetectionRangeType.ADVANCED;
                    payload.mode1[payload.mode0.findIndex((element) => element.id === 1)].sst = sensitivity;
                    this.p2pSession.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_SET_PAYLOAD,
                        value: JSON.stringify({
                            "account_id": this.rawStation.member.admin_user_id,
                            "cmd": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
                            "mChannel": device.getChannel(),
                            "mValue3": 0,
                            "payload": {
                                "cur_mode": payload.cur_mode,
                                "param": payload.mode1,
                                "test_mode": 2,
                            }
                        }),
                        channel: device.getChannel()
                    }, {
                        property: propertyData,
                        onSuccess: () => {
                            device.updateRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425, payload as unknown as string, "p2p");
                        }
                    });
                } else {
                    rootHTTPLogger.error(`Station set motion detection range advanced left sensitivity - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} has unexpected value`, { stationSN: this.getSerial(), rawProperty: rawProperty });
                }
            } else {
                rootHTTPLogger.error(`Station set motion detection range advanced left sensitivity - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionRangeAdvancedMiddleSensitivity(device: Device, sensitivity: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRangeAdvancedMiddleSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        rootHTTPLogger.debug(`Station set motion detection range advanced middle sensitivity - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: sensitivity });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_MIDDLE_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionRangeAdvancedRightSensitivity(device: Device, sensitivity: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        rootHTTPLogger.debug(`Station set motion detection range advanced right sensitivity - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: sensitivity });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_RIGHT_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425) as unknown as FloodlightDetectionRangeT8425Property;
            if (rawProperty !== undefined) {
                if (rawProperty.mode1 !== undefined && Array.isArray(rawProperty.mode1) && rawProperty.mode1.length === 4) {
                    const payload: FloodlightDetectionRangeT8425Property = {
                        ...rawProperty,
                    };
                    payload.cur_mode = MotionDetectionRangeType.ADVANCED;
                    payload.mode1[payload.mode0.findIndex((element) => element.id === 2)].sst = sensitivity;
                    this.p2pSession.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_SET_PAYLOAD,
                        value: JSON.stringify({
                            "account_id": this.rawStation.member.admin_user_id,
                            "cmd": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
                            "mChannel": device.getChannel(),
                            "mValue3": 0,
                            "payload": {
                                "cur_mode": payload.cur_mode,
                                "param": payload.mode1,
                                "test_mode": 2,
                            }
                        }),
                        channel: device.getChannel()
                    }, {
                        property: propertyData,
                        onSuccess: () => {
                            device.updateRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425, payload as unknown as string, "p2p");
                        }
                    });
                } else {
                    rootHTTPLogger.error(`Station set motion detection range advanced right sensitivity - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} has unexpected value`, { stationSN: this.getSerial(), rawProperty: rawProperty });
                }
            } else {
                rootHTTPLogger.error(`Station set motion detection range advanced right sensitivity - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionTestMode(device: Device, enabled: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionTestMode,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        rootHTTPLogger.debug(`Station set motion detection test mode - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: enabled });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.getDeviceType() === DeviceType.FLOODLIGHT) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_PIR_TEST_MODE,
                value: enabled === true ? 1 : 2,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425) as unknown as FloodlightDetectionRangeT8425Property;
            if (rawProperty !== undefined && rawProperty.cur_mode !== undefined) {
                const payload: FloodlightDetectionRangeT8425Property = {
                    ...rawProperty,
                };
                const currentMode = payload.cur_mode === 0 ? payload.mode0 : payload.cur_mode === 1 ? payload.mode1 : payload.cur_mode === 2 ? payload.mode2 : undefined;
                if (currentMode !== undefined && Array.isArray(currentMode) && currentMode.length === 4) {
                    payload.test_mode = enabled === true ? 1 : 0;
                    this.p2pSession.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_SET_PAYLOAD,
                        value: JSON.stringify({
                            "account_id": this.rawStation.member.admin_user_id,
                            "cmd": CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
                            "mChannel": device.getChannel(),
                            "mValue3": 0,
                            "payload": {
                                "cur_mode": payload.cur_mode,
                                "param": currentMode,
                                "test_mode": payload.test_mode,
                            }
                        }),
                        channel: device.getChannel()
                    }, {
                        property: propertyData,
                        onSuccess: () => {
                            device.updateRawProperty(CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425, payload as unknown as string, "p2p");
                        }
                    });
                } else {
                    rootHTTPLogger.error(`Station set motion detection test mode - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} has unexpected value`, { stationSN: this.getSerial(), rawProperty: rawProperty });
                }
            } else {
                rootHTTPLogger.error(`Station set motion detection test mode - Needed raw property "${CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionTrackingSensitivity(device: Device, sensitivity: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionTrackingSensitivity,
            value: sensitivity
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, sensitivity);

        rootHTTPLogger.debug(`Station set motion tracking sensitivity - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: sensitivity });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_MOTION_TRACKING_SENSITIVITY,
                    "data":{
                        "value": sensitivity,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionAutoCruise(device: Device, enabled: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionAutoCruise,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        rootHTTPLogger.debug(`Station set motion auto cruise - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: enabled });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_MOTION_AUTO_CRUISE,
                    "data":{
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionOutOfViewDetection(device: Device, enabled: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionOutOfViewDetection,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        rootHTTPLogger.debug(`Station set motion out of view detection - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: enabled });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_MOTION_OUT_OF_VIEW_DETECTION,
                    "data":{
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_FLOODLIGHT_SET_MOTION_OUT_OF_VIEW_DETECTION,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "deviceSn": device.getSerial(),
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsColorTemperatureManual(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsColorTemperatureManual,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings color temperature manual - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_MANUAL,
                    "data":{
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsColorTemperatureMotion(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsColorTemperatureMotion,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings color temperature motion - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_MOTION,
                    "data":{
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsColorTemperatureSchedule(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsColorTemperatureSchedule,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings color temperature schedule - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_SCHEDULE,
                    "data":{
                        "value": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsMotionActivationMode(device: Device, value: MotionActivationMode): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionActivationMode,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings motion activation mode - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isFloodLightT8425()) {
            const rawProperty = device.getRawProperty(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425) as unknown as FloodlightLightSettingsMotionT8425Property;
            if (rawProperty !== undefined) {
                const payload: FloodlightLightSettingsMotionT8425Property = {
                    ...rawProperty,
                    mode: value,
                };
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": payload
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425, payload as unknown as string, "p2p");
                    }
                });
            } else {
                rootHTTPLogger.error(`Station set light settings motion activation mode - Needed raw property "${CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425}" on device ${device.getSerial()} is undefined`, { stationSN: this.getSerial() });
            }
        } else if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithIntString({
                commandType: CommandType.CMD_SET_FLOODLIGHT_STREET_LAMP,
                value: value,
                valueSub: device.getChannel(),
                strValue: this.rawStation.member.admin_user_id,
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_SET_FLOODLIGHT_STREET_LAMP,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setVideoNightvisionImageAdjustment(device: Device, enabled: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoNightvisionImageAdjustment,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        rootHTTPLogger.debug(`Station set video night vision image adjustment - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: enabled });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_VIDEO_NIGHTVISION_IMAGE_ADJUSTMENT,
                    "data":{
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setVideoColorNightvision(device: Device, enabled: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoColorNightvision,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        rootHTTPLogger.debug(`Station set video color night vision - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: enabled });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_VIDEO_COLOR_NIGHTVISION,
                    "data":{
                        "value": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setAutoCalibration(device: Device, enabled: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoCalibration,
            value: enabled
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, enabled);

        rootHTTPLogger.debug(`Station set auto calibration - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: enabled });
        if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_AUTO_CALIBRATION,
                    "data":{
                        "value": enabled === true ? 0 : 1,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_AUTO_CALIBRATION,
                    "data":{
                        "onoff": enabled === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
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
        this.emit("runtime state", this, channel, batteryLevel, temperature);
    }

    private onChargingState(channel: number, chargeType: number, batteryLevel: number): void {
        this.emit("charging state", this, channel, chargeType, batteryLevel);
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
        this.emit("floodlight manual switch", this, channel, enabled);
    }

    public calibrateLock(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceLockCalibration
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!this.hasCommand(CommandName.DeviceLockCalibration)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station calibrate lock - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            const nestedPayload = {
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const command = getLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                CommandType.P2P_CALIBRATE_LOCK,
                device.getChannel(),
                this.lockPublicKey,
                nestedPayload
            );
            this.p2pSession.setLockAESKey(CommandType.P2P_CALIBRATE_LOCK, command.aesKey);
            rootHTTPLogger.debug("Station calibrate lock - Calibrate lock...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command, nestedPayload: nestedPayload });

            this.p2pSession.sendCommandWithStringPayload(command, {
                command: commandData
            });
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.CALIBRATE_LOCK,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdCalibrate(this.rawStation.member.admin_user_id)
            );
            rootHTTPLogger.debug("Station calibrate lock - Calibrate lock...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this._sendLockV12P2PCommand(command, {
                command: commandData
            });
        } else if (device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.P2P_CALIBRATE_LOCK,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                    }
                }),
                channel: device.getChannel(),
            }, {
                command: commandData
            });
            rootHTTPLogger.debug("Station calibrate lock - Calibrate lock...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id });
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.ON_OFF_LOCK,
                device.getChannel(),
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockCalibrate(this.rawStation.member.admin_user_id)
            );
            rootHTTPLogger.debug("Station calibrate lock - Calibrate lock...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this.p2pSession.sendCommandWithStringPayload(command.payload, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
    }

    private convertAdvancedLockSettingValue(property: PropertyName, value: unknown): number | string {
        switch (property) {
            case PropertyName.DeviceAutoLock:
            case PropertyName.DeviceNotification:
            case PropertyName.DeviceNotificationLocked:
            case PropertyName.DeviceOneTouchLocking:
            case PropertyName.DeviceAutoLockSchedule:
            case PropertyName.DeviceScramblePasscode:
            case PropertyName.DeviceNotificationUnlocked:
            case PropertyName.DeviceWrongTryProtection:
                return value as boolean === true ? 1 : 0;
            case PropertyName.DeviceWrongTryLockdownTime:
            case PropertyName.DeviceSound:
            case PropertyName.DeviceWrongTryAttempts:
            case PropertyName.DeviceAutoLockTimer:
                return value as number;
            case PropertyName.DeviceAutoLockScheduleEndTime:
            case PropertyName.DeviceAutoLockScheduleStartTime:
                const autoLockSchedule = (value as string).split(":");
                return `${Number.parseInt(autoLockSchedule[0]).toString(16).padStart(2, "0")}${Number.parseInt(autoLockSchedule[1]).toString(16).padStart(2, "0")}`;
        }
        return "";
    }

    private convertAdvancedLockSettingValueT8530(property: PropertyName, value: unknown): number | string {
        switch (property) {
            case PropertyName.DeviceAutoLock:
            case PropertyName.DeviceNotificationLocked:
            case PropertyName.DeviceNotificationUnlocked:
            case PropertyName.DeviceOneTouchLocking:
            case PropertyName.DeviceAutoLockSchedule:
            case PropertyName.DeviceScramblePasscode:
            case PropertyName.DeviceWrongTryProtection:
            case PropertyName.DeviceNightvisionOptimization:
                return value as boolean === true ? 1 : 0;
            case PropertyName.DeviceWrongTryLockdownTime:
            case PropertyName.DeviceBeepVolume:
            case PropertyName.DeviceWrongTryAttempts:
            case PropertyName.DeviceAutoLockTimer:
            case PropertyName.DeviceNightvisionOptimizationSide:
                return value as number;
            case PropertyName.DeviceAutoLockScheduleEndTime:
            case PropertyName.DeviceAutoLockScheduleStartTime:
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
            autoLockTime: this.convertAdvancedLockSettingValue(PropertyName.DeviceAutoLockTimer, device.getPropertyValue(PropertyName.DeviceAutoLockTimer)) as number,
            isAutoLock: this.convertAdvancedLockSettingValue(PropertyName.DeviceAutoLock, device.getPropertyValue(PropertyName.DeviceAutoLock)) as number,
            isLockNotification: this.convertAdvancedLockSettingValue(PropertyName.DeviceNotificationLocked, device.getPropertyValue(PropertyName.DeviceNotificationLocked)) as number,
            isNotification: this.convertAdvancedLockSettingValue(PropertyName.DeviceNotification, device.getPropertyValue(PropertyName.DeviceNotification)) as number,
            isOneTouchLock: this.convertAdvancedLockSettingValue(PropertyName.DeviceOneTouchLocking, device.getPropertyValue(PropertyName.DeviceOneTouchLocking)) as number,
            isSchedule: this.convertAdvancedLockSettingValue(PropertyName.DeviceAutoLockSchedule, device.getPropertyValue(PropertyName.DeviceAutoLockSchedule)) as number,
            isScramblePasscode: this.convertAdvancedLockSettingValue(PropertyName.DeviceScramblePasscode, device.getPropertyValue(PropertyName.DeviceScramblePasscode)) as number,
            isUnLockNotification: this.convertAdvancedLockSettingValue(PropertyName.DeviceNotificationUnlocked, device.getPropertyValue(PropertyName.DeviceNotificationUnlocked)) as number,
            isWrongTryProtect: this.convertAdvancedLockSettingValue(PropertyName.DeviceWrongTryProtection, device.getPropertyValue(PropertyName.DeviceWrongTryProtection)) as number,
            lockDownTime: this.convertAdvancedLockSettingValue(PropertyName.DeviceWrongTryLockdownTime, device.getPropertyValue(PropertyName.DeviceWrongTryLockdownTime)) as number,
            lockSound: this.convertAdvancedLockSettingValue(PropertyName.DeviceSound, device.getPropertyValue(PropertyName.DeviceSound)) as number,
            paramType: command,
            scheduleEnd: this.convertAdvancedLockSettingValue(PropertyName.DeviceAutoLockScheduleEndTime, device.getPropertyValue(PropertyName.DeviceAutoLockScheduleEndTime)) as string,
            scheduleStart: this.convertAdvancedLockSettingValue(PropertyName.DeviceAutoLockScheduleStartTime, device.getPropertyValue(PropertyName.DeviceAutoLockScheduleStartTime)) as string,
            wrongTryTime: this.convertAdvancedLockSettingValue(PropertyName.DeviceWrongTryAttempts, device.getPropertyValue(PropertyName.DeviceWrongTryAttempts)) as number,
            seq_num: this.p2pSession.incLockSequenceNumber()
        };
    }

    private getAdvancedLockSettingsPayloadT8530(command: CommandType, device: Device): AdvancedLockSetParamsTypeT8520 {
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
            case CommandType.CMD_SMARTLOCK_VOLUME:
                command = CommandType.CMD_SMARTLOCK_VOLUME;
                break;
        }
        return {
            autoLockTime: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceAutoLockTimer, device.getPropertyValue(PropertyName.DeviceAutoLockTimer)) as number,
            isAutoLock: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceAutoLock, device.getPropertyValue(PropertyName.DeviceAutoLock)) as number,
            isLockNotification: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceNotificationLocked, device.getPropertyValue(PropertyName.DeviceNotificationLocked)) as number,
            isNotification: 1, // unused constant
            isOneTouchLock: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceOneTouchLocking, device.getPropertyValue(PropertyName.DeviceOneTouchLocking)) as number,
            isSchedule: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceAutoLockSchedule, device.getPropertyValue(PropertyName.DeviceAutoLockSchedule)) as number,
            isScramblePasscode: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceScramblePasscode, device.getPropertyValue(PropertyName.DeviceScramblePasscode)) as number,
            isUnLockNotification: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceNotificationUnlocked, device.getPropertyValue(PropertyName.DeviceNotificationUnlocked)) as number,
            isWrongTryProtect: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceWrongTryProtection, device.getPropertyValue(PropertyName.DeviceWrongTryProtection)) as number,
            lockDownTime: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceWrongTryLockdownTime, device.getPropertyValue(PropertyName.DeviceWrongTryLockdownTime)) as number,
            lockOpenDirection: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceNightvisionOptimizationSide, device.getPropertyValue(PropertyName.DeviceNightvisionOptimizationSide)) as number,
            lockSound: 1, // unused constant
            lockVolume: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceBeepVolume, device.getPropertyValue(PropertyName.DeviceBeepVolume)) as number,
            nightVisionEnhance: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceNightvisionOptimization, device.getPropertyValue(PropertyName.DeviceNightvisionOptimization)) as number,
            openLeftAlarmEnable: 0, // unused constant
            openLeftAlarmScheduleEnd: "0600", // unused constant
            openLeftAlarmScheduleStart: "1700", // unused constant
            openLeftAlarmScheduled: 0, // unused constant
            openLeftAlarmTimer: 3, // unused constant
            openLeftAlarmWays: 5, // unused constant
            paramType: command,
            scheduleEnd: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceAutoLockScheduleEndTime, device.getPropertyValue(PropertyName.DeviceAutoLockScheduleEndTime)) as string,
            scheduleStart: this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceAutoLockScheduleStartTime, device.getPropertyValue(PropertyName.DeviceAutoLockScheduleStartTime)) as string,
            tamperAlarmEnable: 0, // unused constant
            tamperAlarmScheduleEnd: "0600", // unused constant
            tamperAlarmScheduleStart: "1700", // unused constant
            tamperAlarmScheduled: 0, // unused constant
            tamperAlarmWays: 5, // unused constant
            wrongTryTime:  this.convertAdvancedLockSettingValueT8530(PropertyName.DeviceWrongTryAttempts, device.getPropertyValue(PropertyName.DeviceWrongTryAttempts)) as number,
        };
    }

    private getAdvancedLockSettingName(property: PropertyName): string {
        switch (property) {
            case PropertyName.DeviceAutoLock: return "isAutoLock";
            case PropertyName.DeviceAutoLockTimer: return "autoLockTime";
            case PropertyName.DeviceNotification: return "isNotification";
            case PropertyName.DeviceNotificationLocked: return "isLockNotification";
            case PropertyName.DeviceOneTouchLocking: return "isOneTouchLock";
            case PropertyName.DeviceAutoLockSchedule: return "isSchedule";
            case PropertyName.DeviceScramblePasscode: return "isScramblePasscode";
            case PropertyName.DeviceNotificationUnlocked: return "isUnLockNotification";
            case PropertyName.DeviceWrongTryProtection: return "isWrongTryProtect";
            case PropertyName.DeviceWrongTryLockdownTime: return "lockDownTime";
            case PropertyName.DeviceSound: return "lockSound";
            case PropertyName.DeviceAutoLockScheduleEndTime: return "scheduleEnd";
            case PropertyName.DeviceAutoLockScheduleStartTime: return "scheduleStart";
            case PropertyName.DeviceWrongTryAttempts: return "wrongTryTime";
        }
        return "";
    }

    private getAdvancedLockSettingNameT8530(property: PropertyName): string {
        switch (property) {
            case PropertyName.DeviceAutoLock: return "isAutoLock";
            case PropertyName.DeviceAutoLockTimer: return "autoLockTime";
            case PropertyName.DeviceNotificationLocked: return "isLockNotification";
            case PropertyName.DeviceNotificationUnlocked: return "isUnLockNotification";
            case PropertyName.DeviceOneTouchLocking: return "isOneTouchLock";
            case PropertyName.DeviceAutoLockSchedule: return "isSchedule";
            case PropertyName.DeviceScramblePasscode: return "isScramblePasscode";
            case PropertyName.DeviceWrongTryProtection: return "isWrongTryProtect";
            case PropertyName.DeviceWrongTryLockdownTime: return "lockDownTime";
            case PropertyName.DeviceAutoLockScheduleEndTime: return "scheduleEnd";
            case PropertyName.DeviceAutoLockScheduleStartTime: return "scheduleStart";
            case PropertyName.DeviceWrongTryAttempts: return "wrongTryTime";
            case PropertyName.DeviceNightvisionOptimizationSide: return "lockOpenDirection";
            case PropertyName.DeviceBeepVolume: return "lockVolume";
            case PropertyName.DeviceNightvisionOptimization: return "nightVisionEnhance";
        }
        return "";
    }

    public setAdvancedLockParams(device: Device, property: PropertyName, value: PropertyValue): void {
        const propertyData: PropertyData = {
            name: property,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const propertyMetadata = device.getPropertyMetadata(propertyData.name);
        validValue(propertyMetadata, value);

        rootHTTPLogger.debug(`Station set advanced lock params - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), property: property, value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            const payload = this.getAdvancedLockSettingsPayload(device.getPropertyMetadata(property).key as number, device);
            const p2pParamName = this.getAdvancedLockSettingName(property);
            if (p2pParamName !== "") {
                payload[p2pParamName] = this.convertAdvancedLockSettingValue(property, value);
                const command = getLockP2PCommand(
                    this.rawStation.station_sn,
                    this.rawStation.member.admin_user_id,
                    CommandType.P2P_SET_LOCK_PARAM,
                    device.getChannel(),
                    this.lockPublicKey,
                    payload
                );
                this.p2pSession.setLockAESKey(CommandType.P2P_SET_LOCK_PARAM, command.aesKey);
                rootHTTPLogger.debug("Station set advanced lock params - Set lock param...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, property: property, value: value, payload: command, nestedPayload: payload });

                this.p2pSession.sendCommandWithStringPayload(command, {
                    property: propertyData
                });
            } else {
                rootHTTPLogger.warn(`Internal lock property for property ${property} not identified for ${device.getSerial()}`, { p2pParamName: p2pParamName });
                throw new InvalidPropertyError("Internal lock property for property not identified for this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
            }
        } else if (device.isLockWifiVideo()) {
            const payload = this.getAdvancedLockSettingsPayloadT8530(device.getPropertyMetadata(property).key as number, device);
            const p2pParamName = this.getAdvancedLockSettingNameT8530(property);
            if (p2pParamName !== "") {
                payload[p2pParamName] = this.convertAdvancedLockSettingValueT8530(property, value);
                rootHTTPLogger.debug("Station set advanced lock params - Set lock param...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, property: property, value: value, payload: payload });
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.P2P_SET_LOCK_PARAM,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": payload,
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData
                });
            } else {
                rootHTTPLogger.warn(`Internal lock property for property ${property} not identified for ${device.getSerial()}`, { p2pParamName: p2pParamName });
                throw new InvalidPropertyError("Internal lock property for property not identified for this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLoiteringDetection(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set loitering detection - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_RADAR_WD_SWITCH,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "radar_wd_switch": value === true ? 1 : 0
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLoiteringDetectionRange(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringDetectionRange,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set loitering detection range - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "radar_wd_distance": value
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLoiteringDetectionLength(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringDetectionLength,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set loitering detection length - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_RADAR_WD_TIME,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "radar_wd_time": value
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private _setMotionDetectionSensitivity(device: Device, propertyData: PropertyData, mode: number, blocklist: Array<number>): void {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, propertyData.value);

        rootHTTPLogger.debug(`Station set motion detection sensitivty - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), propertyData: propertyData, mode: mode, blocklist: blocklist });
        if (device.isBatteryDoorbellDual() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "block_list": blocklist,
                        "model": mode,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private _getMotionDetectionSensitivityAdvanced(device: Device): Array<number> {
        return [
            device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityAdvancedA) as number,
            device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityAdvancedB) as number,
            device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityAdvancedC) as number,
            device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityAdvancedD) as number,
            device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityAdvancedE) as number,
            device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityAdvancedF) as number,
            device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityAdvancedG) as number,
            device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityAdvancedH) as number,
        ];
    }

    public setMotionDetectionSensitivityMode(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityMode,
            value: value
        };
        let distances: Array<number>;
        if (device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityMode) === MotionDetectionMode.STANDARD) {
            distances = Array(8).fill(device.getPropertyValue(PropertyName.DeviceMotionDetectionSensitivityStandard));
        } else {
            distances = this._getMotionDetectionSensitivityAdvanced(device);
        }
        this._setMotionDetectionSensitivity(device, propertyData, value, getBlocklist(distances));
    }

    public setMotionDetectionSensitivityStandard(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityStandard,
            value: value
        };
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.STANDARD, getBlocklist(Array(8).fill(value)));
    }

    public setMotionDetectionSensitivityAdvancedA(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityAdvancedA,
            value: value
        };
        const blocklist = this._getMotionDetectionSensitivityAdvanced(device);
        blocklist[0] = value;
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.ADVANCED, getBlocklist(blocklist));
    }

    public setMotionDetectionSensitivityAdvancedB(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityAdvancedB,
            value: value
        };
        const blocklist = this._getMotionDetectionSensitivityAdvanced(device);
        blocklist[1] = value;
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.ADVANCED, getBlocklist(blocklist));
    }

    public setMotionDetectionSensitivityAdvancedC(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityAdvancedC,
            value: value
        };
        const blocklist = this._getMotionDetectionSensitivityAdvanced(device);
        blocklist[2] = value;
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.ADVANCED, getBlocklist(blocklist));
    }

    public setMotionDetectionSensitivityAdvancedD(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityAdvancedD,
            value: value
        };
        const blocklist = this._getMotionDetectionSensitivityAdvanced(device);
        blocklist[3] = value;
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.ADVANCED, getBlocklist(blocklist));
    }

    public setMotionDetectionSensitivityAdvancedE(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityAdvancedE,
            value: value
        };
        const blocklist = this._getMotionDetectionSensitivityAdvanced(device);
        blocklist[4] = value;
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.ADVANCED, getBlocklist(blocklist));
    }

    public setMotionDetectionSensitivityAdvancedF(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityAdvancedF,
            value: value
        };
        const blocklist = this._getMotionDetectionSensitivityAdvanced(device);
        blocklist[5] = value;
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.ADVANCED, getBlocklist(blocklist));
    }

    public setMotionDetectionSensitivityAdvancedG(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityAdvancedG,
            value: value
        };
        const blocklist = this._getMotionDetectionSensitivityAdvanced(device);
        blocklist[6] = value;
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.ADVANCED, getBlocklist(blocklist));
    }

    public setMotionDetectionSensitivityAdvancedH(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionSensitivityAdvancedH,
            value: value
        };
        const blocklist = this._getMotionDetectionSensitivityAdvanced(device);
        blocklist[7] = value;
        this._setMotionDetectionSensitivity(device, propertyData, MotionDetectionMode.ADVANCED, getBlocklist(blocklist));
    }

    private _setLoiteringCustomResponse(device: Device, propertyData: PropertyData, voiceID: number,
        autoVoiceResponse: boolean, homebaseAlert: boolean, pushNotification: boolean, startTime: string, endTime: string): void {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, propertyData.value);

        rootHTTPLogger.debug(`Station set loitering custom response - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), propertyData: propertyData, voiceID: voiceID, autoVoiceResponse: autoVoiceResponse, homebaseAlert: homebaseAlert, pushNotification: pushNotification, startTime: startTime, endTime: endTime });
        if (device.isBatteryDoorbellDual() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "num": 1,
                        "setting": [{
                            "active": 0,
                            "auto_voice_id": voiceID,
                            "auto_voice_name": (device as DoorbellCamera).getVoiceName(voiceID),
                            "auto_voice_resp": autoVoiceResponse === true ? 1 : 0,
                            "end_hour": endTime.split(":")[0],
                            "end_min": endTime.split(":")[1],
                            "familiar_id": 0,
                            "homebase_alert": homebaseAlert === true ? 1 : 0,
                            "push_notify": pushNotification === true ? 1 : 0,
                            "start_hour": startTime.split(":")[0],
                            "start_min": startTime.split(":")[1],
                        }]
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLoiteringCustomResponseAutoVoiceResponse(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse,
            value: value
        };
        this._setLoiteringCustomResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice) as number,
            value,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponsePhoneNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeFrom) as string,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeTo) as string
        );
    }

    public setLoiteringCustomResponseAutoVoiceResponseVoice(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice,
            value: value
        };
        this._setLoiteringCustomResponse(
            device,
            propertyData,
            value,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponsePhoneNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeFrom) as string,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeTo) as string
        );
    }

    public setLoiteringCustomResponseHomeBaseNotification(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification,
            value: value
        };
        this._setLoiteringCustomResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice) as number,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse) as boolean,
            value,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponsePhoneNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeFrom) as string,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeTo) as string
        );
    }

    public setLoiteringCustomResponsePhoneNotification(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringCustomResponsePhoneNotification,
            value: value
        };
        this._setLoiteringCustomResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice) as number,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification) as boolean,
            value,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeFrom) as string,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeTo) as string
        );
    }

    public setLoiteringCustomResponseTimeFrom(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringCustomResponseTimeFrom,
            value: value
        };
        this._setLoiteringCustomResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice) as number,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponsePhoneNotification) as boolean,
            value,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeTo) as string
        );
    }

    public setLoiteringCustomResponseTimeTo(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLoiteringCustomResponseTimeTo,
            value: value
        };
        this._setLoiteringCustomResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice) as number,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponsePhoneNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLoiteringCustomResponseTimeFrom) as string,
            value
        );
    }

    public setDeliveryGuard(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDeliveryGuard,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set delivery guard - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual() || device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "ai_bottom_switch": value === true ? 1024: 0,
                        "ai_front_switch": 0
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setDeliveryGuardPackageGuarding(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDeliveryGuardPackageGuarding,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set delivery guard package guarding - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual() || device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_SWITCH,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "package_guard_switch": value === true ? 1: 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setDeliveryGuardPackageGuardingVoiceResponseVoice(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, propertyData.value);

        rootHTTPLogger.debug(`Station set delivery guard package guarding voice response voice - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual() || device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "auto_voice_id": value,
                        "auto_voice_name": (device as DoorbellCamera).getVoiceName(value),
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private setDeliveryGuardPackageGuardingActivatedTime(device: Device, propertyData: PropertyData, startTime: string, endTime: string): void {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, propertyData.value);

        rootHTTPLogger.debug(`Station set delivery guard guarding activated time - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), propertyData: propertyData, startTime: start, endTime: endTime });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual() || device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "end_h": endTime.split(":")[0],
                        "end_m": endTime.split(":")[1],
                        "start_h": startTime.split(":")[0],
                        "start_m": startTime.split(":")[1],
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setDeliveryGuardPackageGuardingActivatedTimeFrom(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom,
            value: value
        };
        this.setDeliveryGuardPackageGuardingActivatedTime(
            device,
            propertyData,
            value,
            device.getPropertyValue(PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo) as string
        );
    }

    public setDeliveryGuardPackageGuardingActivatedTimeTo(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo,
            value: value
        };
        this.setDeliveryGuardPackageGuardingActivatedTime(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom) as string,
            value
        );
    }

    public setDeliveryGuardUncollectedPackageAlert(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDeliveryGuardUncollectedPackageAlert,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set delivery guard uncollected package alert - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual() || device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_SWITCH,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "package_strand_switch": value === true ? 1: 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setDeliveryGuardUncollectedPackageAlertTimeToCheck(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, propertyData.value);

        rootHTTPLogger.debug(`Station set delivery guard uncollected package alert time to check - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual() || device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "start_h": value.split(":")[0],
                        "start_m": value.split(":")[1],
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setDeliveryGuardPackageLiveCheckAssistance(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set delivery guard package live check assistance - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual() || device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_PACKAGE_ASSISTANT_SWITCH,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "package_assitant_switch": value === true ? 1: 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setDualCamWatchViewMode(device: Device, value: ViewModeType): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDualCamWatchViewMode,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, propertyData.value);

        rootHTTPLogger.debug(`Station set dual cam watch view mode - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_VIEW_MODE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "restore": 1,
                        "video_type": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isBatteryDoorbellDualE340() || device.isOutdoorPanAndTiltCamera() || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_VIEW_MODE2,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "restore": 1,
                        "video_type": value,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private _setRingAutoResponse(device: Device, propertyData: PropertyData, enabled: boolean, voiceID: number,
        autoVoiceResponse: boolean, startTime: string, endTime: string): void {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, propertyData.value);

        rootHTTPLogger.debug(`Station set ring auto response - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), propertyData: propertyData, enabled: enabled, voiceID: voiceID, autoVoiceResponse: autoVoiceResponse, startTime: startTime, endTime: endTime });
        if (device.isBatteryDoorbellDual() || device.isWiredDoorbellDual() || device.isBatteryDoorbellDualE340()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "num": 1,
                        "setting": [{
                            "active": enabled === true ? 1 : 0,
                            "auto_voice_id": voiceID,
                            "auto_voice_name": (device as DoorbellCamera).getVoiceName(voiceID),
                            "auto_voice_resp": autoVoiceResponse === true ? 1 : 0,
                            "end_hour": endTime.split(":")[0],
                            "end_min": endTime.split(":")[1],
                            "familiar_id": 0,
                            "start_hour": startTime.split(":")[0],
                            "start_min": startTime.split(":")[1],
                        }]
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setRingAutoResponse(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRingAutoResponse,
            value: value
        };
        this._setRingAutoResponse(
            device,
            propertyData,
            value,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseVoiceResponseVoice) as number,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseVoiceResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseTimeFrom) as string,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseTimeTo) as string,
        );
    }

    public setRingAutoResponseVoiceResponse(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRingAutoResponseVoiceResponse,
            value: value
        };
        this._setRingAutoResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseVoiceResponseVoice) as number,
            value,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseTimeFrom) as string,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseTimeTo) as string,
        );
    }

    public setRingAutoResponseVoiceResponseVoice(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRingAutoResponseVoiceResponseVoice,
            value: value
        };
        this._setRingAutoResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponse) as boolean,
            value,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseVoiceResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseTimeFrom) as string,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseTimeTo) as string,
        );
    }

    public setRingAutoResponseTimeFrom(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRingAutoResponseTimeFrom,
            value: value
        };
        this._setRingAutoResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseVoiceResponseVoice) as number,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseVoiceResponse) as boolean,
            value,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseTimeTo) as string,
        );
    }

    public setRingAutoResponseTimeTo(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceRingAutoResponseTimeTo,
            value: value
        };
        this._setRingAutoResponse(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseVoiceResponseVoice) as number,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseVoiceResponse) as boolean,
            device.getPropertyValue(PropertyName.DeviceRingAutoResponseTimeFrom) as string,
            value
        );
    }

    public setNotificationRadarDetector(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationRadarDetector,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification radar detector - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isBatteryDoorbellDual()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORBELL_DUAL_NOTIFICATION_HUMAN_DETECT,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "radar_human_detect": value === true ? 1 : 0,
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public calibrate(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceCalibrate
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceCalibrate)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station calibrate - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        if (device.isPanAndTiltCamera()) {
            if (device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_INDOOR_PAN_CALIBRATION,
                        "mValue3": 0,
                        "payload": {},
                    }),
                    channel: device.getChannel()
                }, {
                    command: commandData
                });
            } else if (device.isOutdoorPanAndTiltCamera()) {
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_OUTDOOR_PAN_CALIBRATION,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": {
                            "res": 0,
                        },
                    }),
                    channel: device.getChannel()
                }, {
                    command: commandData
                });
            } else if (device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425()) {
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                    value: JSON.stringify({
                        "commandType": CommandType.CMD_INDOOR_PAN_CALIBRATION,
                        "data": {
                            "enable": 0,
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
                }, {
                    command: commandData
                });
            } else {
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                    value: JSON.stringify({
                        "commandType": CommandType.CMD_INDOOR_PAN_CALIBRATION
                    }),
                    channel: device.getChannel()
                }, {
                    command: commandData
                });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
    }

    public setContinuousRecording(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceContinuousRecording,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set continuous recording - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_SET_CONTINUE_ENABLE,
                "data":{
                    "enable": value === true ? 1 : 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                },
            }),
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setContinuousRecordingType(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceContinuousRecordingType,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set continuous recording type - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_SET_CONTINUE_TYPE,
                "data": {
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": value,
                    "value": 0,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                }
            }),
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public enableDefaultAngle(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDefaultAngle,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station enable default angle - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_DEFAULT_ANGLE_ENABLE,
                "data":{
                    "value": value === true ? device.getPropertyValue(PropertyName.DeviceDefaultAngleIdleTime) : 0,
                },
            }),
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setDefaultAngleIdleTime(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDefaultAngleIdleTime,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set default angle idle time - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_DEFAULT_ANGLE_IDLE_TIME,
                "data":{
                    "value": value,
                },
            }),
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setDefaultAngle(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceSetDefaultAngle
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceSetDefaultAngle)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station set default angle - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_DEFAULT_ANGLE_SET,
                "data":{
                    "value": 0,
                },
            }),
            channel: device.getChannel()
        }, {
            command: commandData
        });
    }

    public setPrivacyAngle(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceSetPrivacyAngle
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceSetPrivacyAngle)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station set privacy angle - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_SET_PRIVACY_ANGLE,
                "data":{
                    "value": 0,
                },
            }),
            channel: device.getChannel()
        }, {
            command: commandData
        });
    }

    public setNotificationIntervalTime(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationIntervalTime,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification interval time - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithInt({
            commandType: CommandType.CMD_DEV_RECORD_INTERVAL,
            value: value,
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setSoundDetectionRoundLook(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSoundDetectionRoundLook,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set sound detection round look - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isIndoorPanAndTiltCameraS350()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_INDOOR_SET_SOUND_DETECT_ROUND_LOOK_S350,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload":{
                        "onoff": value === true ? 1 : 0,
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_INDOOR_SET_SOUND_DETECT_ROUND_LOOK,
                    "data":{
                        "value": value === true ? 1 : 0,
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        }
    }

    public startTalkback(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceStartTalkback
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceStartTalkback)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!this.isLiveStreaming(device)) {
            throw new LivestreamNotRunningError("Livestream for device is not running", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station start talkback - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        if ((device.isIndoorCamera() && !device.isIndoorPanAndTiltCameraS350()) || (device.isSoloCamera() && !this.isStationHomeBase3()) || (device.isFloodLight() && !device.isFloodLightT8425()) || device.isWiredDoorbell() || device.isStarlight4GLTE() || device.isWallLightCam() || device.isGarageCamera() || device.isOutdoorPanAndTiltCamera() || (device.isIndoorPanAndTiltCameraS350() && !this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": IndoorSoloSmartdropCommandType.CMD_START_SPEAK,
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if ((device.isBatteryDoorbell() && isGreaterEqualMinVersion("2.0.6.8", this.getSoftwareVersion())) || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425() || (device.isSoloCamera() && this.isStationHomeBase3()) || device.isLockWifiVideo() || device.isSmartDrop()) {
            this.p2pSession.sendCommandWithInt({
                commandType: CommandType.CMD_START_TALKBACK,
                value: 0,
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else {
            this.p2pSession.startTalkback(device.getChannel());
            this.emit("command result", this, {
                channel: device.getChannel(),
                command_type: CommandType.CMD_START_TALKBACK,
                return_code: 0,
                customData: {
                    command: commandData
                }
            });
        }
    }

    public stopTalkback(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceStopTalkback
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceStopTalkback)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!this.isLiveStreaming(device)) {
            throw new LivestreamNotRunningError("Livestream for device is not running", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station stop talkback - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        if ((device.isIndoorCamera() && !device.isIndoorPanAndTiltCameraS350()) || (device.isSoloCamera() && !this.isStationHomeBase3()) || (device.isFloodLight() && !device.isFloodLightT8425()) || device.isWiredDoorbell() || device.isStarlight4GLTE() || device.isWallLightCam() || device.isGarageCamera() || device.isOutdoorPanAndTiltCamera() || (device.isIndoorPanAndTiltCameraS350() && !this.isStationHomeBase3())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": IndoorSoloSmartdropCommandType.CMD_END_SPEAK,
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if ((device.isBatteryDoorbell() && isGreaterEqualMinVersion("2.0.6.8", this.getSoftwareVersion())) || device.isIndoorPanAndTiltCameraS350() || device.isFloodLightT8425() || (device.isSoloCamera() && this.isStationHomeBase3()) || device.isLockWifiVideo() || device.isSmartDrop()) {
            this.p2pSession.sendCommandWithInt({
                commandType: CommandType.CMD_STOP_TALKBACK,
                value: 0,
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else {
            this.p2pSession.stopTalkback(device.getChannel());
            this.emit("command result", this, {
                channel: device.getChannel(),
                command_type: CommandType.CMD_STOP_TALKBACK,
                return_code: 0,
                customData: {
                    command: commandData
                }
            });
        }
    }

    private onTalkbackStarted(channel: number, talkbackStream: TalkbackStream): void {
        this.emit("talkback started", this, channel, talkbackStream);
    }

    private onTalkbackStopped(channel: number): void {
        this.emit("talkback stopped", this, channel);
    }

    private onTalkbackError(channel: number, error: Error): void {
        this.emit("talkback error", this, channel, error);
    }

    public isTalkbackOngoing(device: Device): boolean {
        if (device.getStationSerial() !== this.getSerial())
            return false;
        return this.p2pSession.isTalkbackOngoing(device.getChannel());
    }

    public setScramblePasscode(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceScramblePasscode,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set scramble passcode - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceScramblePasscode, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceScramblePasscode, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceScramblePasscode, value);
        } else if (device.isSmartSafe()) {
            this.setSmartSafeParams(device, PropertyName.DeviceScramblePasscode, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setWrongTryProtection(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceWrongTryProtection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set wrong try protection - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceWrongTryProtection, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceWrongTryProtection, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceWrongTryProtection, value);
        } else if (device.isSmartSafe()) {
            this.setSmartSafeParams(device, PropertyName.DeviceWrongTryProtection, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setWrongTryAttempts(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceWrongTryAttempts,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set wrong try attempts - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceWrongTryAttempts, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceWrongTryAttempts, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceWrongTryAttempts, value);
        } else if (device.isSmartSafe()) {
            this.setSmartSafeParams(device, PropertyName.DeviceWrongTryAttempts, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setWrongTryLockdownTime(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceWrongTryLockdownTime,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set wrong try lockdown time - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceWrongTryLockdownTime, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceWrongTryLockdownTime, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceWrongTryLockdownTime, value);
        } else if (device.isSmartSafe()) {
            this.setSmartSafeParams(device, PropertyName.DeviceWrongTryLockdownTime, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private _sendSmartSafeCommand(device: Device, command: SmartSafeCommandCode, data: Buffer, customData?: CustomData): void {
        const payload = getSmartSafeP2PCommand(
            device.getSerial(),
            this.rawStation.member.admin_user_id,
            CommandType.CMD_SMARTSAFE_SETTINGS,
            command,
            device.getChannel(),
            this.p2pSession.incLockSequenceNumber(),
            data
        );
        this.p2pSession.sendCommandWithStringPayload(payload, customData);
    }

    public setSmartSafeParams(device: Device, property: PropertyName, value: PropertyValue): void {
        const propertyData: PropertyData = {
            name: property,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const propertyMetadata = device.getPropertyMetadata(propertyData.name);
        validValue(propertyMetadata, value);

        rootHTTPLogger.debug(`Station set smart safe params - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), property: property, value: value });
        if (device.isSmartSafe()) {
            let payload: Buffer;
            let command: number;
            switch (property) {
                case PropertyName.DeviceWrongTryProtection:
                    payload = SmartSafe.encodeCmdWrongTryProtect(
                        this.rawStation.member.admin_user_id,
                        value as boolean,
                        device.getPropertyValue(PropertyName.DeviceWrongTryAttempts) as number,
                        device.getPropertyValue(PropertyName.DeviceWrongTryLockdownTime) as number / 60
                    );
                    command = SmartSafeCommandCode.SET_CRACK_PROTECT;
                    break;
                case PropertyName.DeviceWrongTryAttempts:
                    payload = SmartSafe.encodeCmdWrongTryProtect(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceWrongTryProtection) as boolean,
                        value as number,
                        device.getPropertyValue(PropertyName.DeviceWrongTryLockdownTime) as number / 60
                    );
                    command = SmartSafeCommandCode.SET_CRACK_PROTECT;
                    break;
                case PropertyName.DeviceWrongTryLockdownTime:
                    payload = SmartSafe.encodeCmdWrongTryProtect(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceWrongTryProtection) as boolean,
                        device.getPropertyValue(PropertyName.DeviceWrongTryAttempts) as number,
                        value as number / 60
                    );
                    command = SmartSafeCommandCode.SET_CRACK_PROTECT;
                    break;
                case PropertyName.DeviceLeftOpenAlarm:
                    payload = SmartSafe.encodeCmdLeftOpenAlarm(
                        this.rawStation.member.admin_user_id,
                        value as boolean,
                        device.getPropertyValue(PropertyName.DeviceLeftOpenAlarmDuration) as number
                    );
                    command = SmartSafeCommandCode.SET_LOCK_ALARM;
                    break;
                case PropertyName.DeviceLeftOpenAlarmDuration:
                    payload = SmartSafe.encodeCmdLeftOpenAlarm(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceLeftOpenAlarm) as boolean,
                        value as number
                    );
                    command = SmartSafeCommandCode.SET_LOCK_ALARM;
                    break;
                case PropertyName.DeviceDualUnlock:
                    payload = SmartSafe.encodeCmdDualUnlock(
                        this.rawStation.member.admin_user_id,
                        value as boolean
                    );
                    command = SmartSafeCommandCode.SET_DUAL_UNLOCK;
                    break;
                case PropertyName.DevicePowerSave:
                    payload = SmartSafe.encodeCmdPowerSave(
                        this.rawStation.member.admin_user_id,
                        value as boolean
                    );
                    command = SmartSafeCommandCode.SET_POWERSAVE;
                    break;
                case PropertyName.DeviceInteriorBrightness:
                    payload = SmartSafe.encodeCmdInteriorBrightness(
                        this.rawStation.member.admin_user_id,
                        value as number,
                        device.getPropertyValue(PropertyName.DeviceInteriorBrightnessDuration) as number
                    );
                    command = SmartSafeCommandCode.SET_LIGHT;
                    break;
                case PropertyName.DeviceInteriorBrightnessDuration:
                    payload = SmartSafe.encodeCmdInteriorBrightness(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceInteriorBrightness) as number,
                        value as number
                    );
                    command = SmartSafeCommandCode.SET_LIGHT;
                    break;
                case PropertyName.DeviceTamperAlarm:
                    payload = SmartSafe.encodeCmdTamperAlarm(
                        this.rawStation.member.admin_user_id,
                        value as number
                    );
                    command = SmartSafeCommandCode.SET_SHAKE;
                    break;
                case PropertyName.DeviceRemoteUnlock:
                case PropertyName.DeviceRemoteUnlockMasterPIN:
                {
                    if (!this.pinVerified && value as boolean === true) {
                        throw new PinNotVerifiedError("You need to call verifyPIN with correct PIN first to enable this property", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
                    }
                    let newValue = 2;
                    const remoteUnlock = property === PropertyName.DeviceRemoteUnlock ? value as boolean : device.getPropertyValue(PropertyName.DeviceRemoteUnlock) as boolean;
                    const remoteUnlockMasterPIN = property === PropertyName.DeviceRemoteUnlockMasterPIN ? value as boolean : device.getPropertyValue(PropertyName.DeviceRemoteUnlockMasterPIN) as boolean;
                    if (remoteUnlock && remoteUnlockMasterPIN) {
                        newValue = 0;
                    } else if (remoteUnlock) {
                        newValue = 1;
                    }
                    payload = SmartSafe.encodeCmdRemoteUnlock(
                        this.rawStation.member.admin_user_id,
                        newValue
                    );
                    command = SmartSafeCommandCode.SET_UNLOCK_MODE;
                    break;
                }
                case PropertyName.DevicePromptVolume:
                    payload = SmartSafe.encodeCmdPromptVolume(
                        this.rawStation.member.admin_user_id,
                        value as number
                    );
                    command = SmartSafeCommandCode.SET_VOLUME;
                    break;
                case PropertyName.DeviceAlarmVolume:
                    payload = SmartSafe.encodeCmdAlertVolume(
                        this.rawStation.member.admin_user_id,
                        value as number
                    );
                    command = SmartSafeCommandCode.SET_VOLUME_ALERT;
                    break;
                case PropertyName.DeviceNotificationUnlockByKey:
                case PropertyName.DeviceNotificationUnlockByPIN:
                case PropertyName.DeviceNotificationUnlockByFingerprint:
                case PropertyName.DeviceNotificationUnlockByApp:
                case PropertyName.DeviceNotificationDualUnlock:
                case PropertyName.DeviceNotificationDualLock:
                case PropertyName.DeviceNotificationWrongTryProtect:
                case PropertyName.DeviceNotificationJammed:
                    const settingsValues: Array<boolean> = [
                        property === PropertyName.DeviceNotificationUnlockByKey ? value as boolean : device.getPropertyValue(PropertyName.DeviceNotificationUnlockByKey) as boolean,
                        property === PropertyName.DeviceNotificationUnlockByPIN ? value as boolean : device.getPropertyValue(PropertyName.DeviceNotificationUnlockByPIN) as boolean,
                        property === PropertyName.DeviceNotificationUnlockByFingerprint ? value as boolean : device.getPropertyValue(PropertyName.DeviceNotificationUnlockByFingerprint) as boolean,
                        property === PropertyName.DeviceNotificationUnlockByApp ? value as boolean : device.getPropertyValue(PropertyName.DeviceNotificationUnlockByApp) as boolean,
                        property === PropertyName.DeviceNotificationDualUnlock ? value as boolean : device.getPropertyValue(PropertyName.DeviceNotificationDualUnlock) as boolean,
                        property === PropertyName.DeviceNotificationDualLock ? value as boolean : device.getPropertyValue(PropertyName.DeviceNotificationDualLock) as boolean,
                        property === PropertyName.DeviceNotificationWrongTryProtect ? value as boolean : device.getPropertyValue(PropertyName.DeviceNotificationWrongTryProtect) as boolean,
                        property === PropertyName.DeviceNotificationJammed ? value as boolean : device.getPropertyValue(PropertyName.DeviceNotificationJammed) as boolean,
                    ];

                    let modes = 0;
                    for (let pos = 0; pos < settingsValues.length; pos++) {
                        if (settingsValues[pos]) {
                            modes = (modes | (1 << pos));
                        }
                    }

                    payload = SmartSafe.encodeCmdPushNotification(
                        this.rawStation.member.admin_user_id,
                        modes
                    );
                    command = SmartSafeCommandCode.SET_PUSH;
                    break;
                case PropertyName.DeviceScramblePasscode:
                    payload = SmartSafe.encodeCmdScramblePIN(
                        this.rawStation.member.admin_user_id,
                        value as boolean
                    );
                    command = SmartSafeCommandCode.SET_SCRAMBLE_PASSWORD;
                    break;
                default:
                    payload = Buffer.from([]);
                    command = SmartSafeCommandCode.DEFAULT;
                    break;
            }

            rootHTTPLogger.debug(`Station set smart safe params - payload`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), property: property, value: value, payload: payload.toString("hex") });
            this._sendSmartSafeCommand(device, command, payload, { property: propertyData });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public unlock(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceUnlock
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceUnlock)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        const payload = SmartSafe.encodeCmdUnlock(this.rawStation.member.admin_user_id);
        rootHTTPLogger.debug(`Station unlock - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), payload: payload.toString("hex") });
        this._sendSmartSafeCommand(device, SmartSafeCommandCode.UNLOCK, payload, { command: commandData });
    }

    public verifyPIN(device: Device, pin: string): void {
        const commandData: CommandData = {
            name: CommandName.DeviceVerifyPIN
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceVerifyPIN)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!/^[1-6]{4,8}$/.test(pin)) {
            throw new InvalidCommandValueError("PIN should contain only numbers (1-6) and be between 4 and 8 long", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        const payload = SmartSafe.encodeCmdVerifyPIN(this.rawStation.member.admin_user_id, pin);
        rootHTTPLogger.debug(`Station verify pin - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), payload: payload.toString("hex") });
        this._sendSmartSafeCommand(device, SmartSafeCommandCode.SET_VERIFY_PIN, payload, { command: commandData });
    }

    private onDeviceShakeAlarm(channel: number, event: SmartSafeShakeAlarmEvent): void {
        this.emit("device shake alarm", this._getDeviceSerial(channel), event);
    }

    private onDevice911Alarm(channel: number, event: SmartSafeAlarm911Event): void {
        this.emit("device 911 alarm", this._getDeviceSerial(channel), event);
    }

    private onDeviceJammed(channel: number): void {
        this.emit("device jammed", this._getDeviceSerial(channel));
    }

    private onDeviceLowBattery(channel: number): void {
        this.emit("device low battery", this._getDeviceSerial(channel));
    }

    private onDeviceWrongTryProtectAlarm(channel: number): void {
        this.emit("device wrong try-protect alarm", this._getDeviceSerial(channel));
    }

    private onSdInfoEx(sdStatus: number, sdCapacity: number, sdAvailableCapacity: number): void {
        this.emit("sd info ex", this, sdStatus, sdCapacity, sdAvailableCapacity);
    }

    public setVideoTypeStoreToNAS(device: Device, value: VideoTypeStoreToNAS): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceVideoTypeStoreToNAS,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        if (device.getPropertyValue(PropertyName.DeviceContinuousRecording) !== true && value === VideoTypeStoreToNAS.ContinuousRecording) {
            this.setContinuousRecording(device, true);
        }

        rootHTTPLogger.debug(`Station set video type store to nas - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
            value: JSON.stringify({
                "commandType": CommandType.CMD_INDOOR_NAS_STORAGE_TYPE,
                "data":{
                    "enable": 0,
                    "index": 0,
                    "status": 0,
                    "type": 0,
                    "value": value,
                    "voiceID": 0,
                    "zonecount": 0,
                    "transaction": `${new Date().getTime()}`,
                },
            }),
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public snooze(device: Device, value: SnoozeDetail): void {
        const commandData: CommandData = {
            name: CommandName.DeviceSnooze,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceSnooze)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station snooze - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isDoorbell() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_SNOOZE_MODE,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "snooze_time": value.snooze_time,
                    "startTime": `${Math.trunc(new Date().getTime() / 1000)}`,
                    "chime_onoff": value.snooze_chime !== undefined && value.snooze_chime ? 1 : 0,
                    "motion_notify_onoff": value.snooze_motion !== undefined && value.snooze_motion ? 1 : 0,
                    "homebase_onoff": value.snooze_homebase !== undefined && value.snooze_homebase ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_SNOOZE_MODE,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "snooze_time": value.snooze_time
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        }
    }

    public addUser(device: Device, username: string, shortUserId: string, passcode: string, schedule?: Schedule): void {
        const commandData: CommandData = {
            name: CommandName.DeviceAddUser,
            value: {
                username: username,
                shortUserId: shortUserId,
                passcode: passcode,
                schedule: schedule,
                deviceSN: device.getSerial()
            }
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceAddUser)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!/^\d{4,8}$/.test(passcode)) {
            throw new InvalidCommandValueError("Passcode should contain only numbers and be between 4 and 8 long", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station add user  - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), username: username, shortUserId: shortUserId, schedule: schedule });
        if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            // passcode: min 4 max 8
            // passcode: 13579753 =>  3133353739373533
            // 04.09.2022 11:36
            // 01.01.2023 19:36
            // Mon-Sunday Wednsday No!
            // {"endDay":"e7070101","endTime":"1324","passcode":"3133353739373533","startDay":"00000000","startTime":"0b24","userId":"0009","week":"77","seq_num":662}
            //log.b 2: payloadStr: {"endDay":"ffffffff","endTime":"ffff","passcode":"3233353438333333","startDay":"00000000","startTime":"0000","userId":"0008","week":"ff","seq_num":657}
            //log.b 2: ESLP2pResponse: {"channel":0,"command_type":1950,"payload":"w36zICk5a8pXZ8I6L4ldeI6ZQPWmbEEVZHctBfW0Zx0\u003d","payloadLen":30,"sn":"T8520Q2021340AD6"}
            //log.b 2: payload full:{"code":0,"passwordId":"0008"} payloadLength:30
            const nestedPayload = {
                endDay: schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff",
                endTime: schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff",
                passcode: encodePasscode(passcode),
                startDay: schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000",
                startTime: schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000",
                userId: shortUserId,
                week: schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff",
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const command = getLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                CommandType.P2P_ADD_PW,
                device.getChannel(),
                this.lockPublicKey,
                nestedPayload
            );
            this.p2pSession.setLockAESKey(CommandType.P2P_ADD_PW, command.aesKey);
            rootHTTPLogger.debug("Add user...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command, nestedPayload: nestedPayload });

            this.p2pSession.sendCommandWithStringPayload(command, {
                command: commandData
            });
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.ADD_PW,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdAddUser(shortUserId, encodePasscode(passcode).padEnd(16, "0"), username, schedule)
            );
            rootHTTPLogger.debug("Add user...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });

            this._sendLockV12P2PCommand(command, {
                command: commandData
            });
        } else if (device.isLockWifiVideo()) {
            const command = {
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.P2P_ADD_PW,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": {
                    "endDay": schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff",
                    "endTime": schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff",
                    "passcode": encodePasscode(passcode).padEnd(16, "0"),
                    "startDay": schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000",
                    "startTime": schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000",
                    "userId": shortUserId,
                    "week": schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff",
                }
            };
            rootHTTPLogger.debug("Add user...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify(command),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.ADD_PW,
                device.getChannel(),
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockAddUser(
                    this.rawStation.member.admin_user_id,
                    shortUserId,
                    encodePasscode(passcode),
                    username,
                    schedule
                )
            );
            rootHTTPLogger.debug("Station smart lock device - Add user...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this.p2pSession.sendCommandWithStringPayload(command.payload, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
    }

    public deleteUser(device: Device, username: string, shortUserId: string): void {
        const commandData: CommandData = {
            name: CommandName.DeviceDeleteUser,
            value: {
                username: username,
                shortUserId: shortUserId,
            }
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceDeleteUser)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station delete user - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), username: username, shortUserId: shortUserId });
        if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            const nestedPayload = {
                userId: shortUserId,
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const command = getLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                CommandType.P2P_DELETE_USER,
                device.getChannel(),
                this.lockPublicKey,
                nestedPayload
            );
            this.p2pSession.setLockAESKey(CommandType.P2P_DELETE_USER, command.aesKey);
            rootHTTPLogger.debug("Station delete user - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command, nestedPayload: nestedPayload });

            this.p2pSession.sendCommandWithStringPayload(command, {
                command: commandData
            });
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.DELETE_USER,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdDeleteUser(shortUserId)
            );
            rootHTTPLogger.debug("Station delete user - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });

            this._sendLockV12P2PCommand(command, {
                command: commandData
            });
        } else if (device.isLockWifiVideo()) {
            const command = {
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.P2P_DELETE_USER,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": {
                    "userId": shortUserId,
                }
            };
            rootHTTPLogger.debug("Station delete user - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify(command),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.DELETE_USER,
                device.getChannel(),
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockDeleteUser(
                    this.rawStation.member.admin_user_id,
                    shortUserId
                )
            );
            rootHTTPLogger.debug("Station delete user - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this.p2pSession.sendCommandWithStringPayload(command.payload, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
    }

    public updateUserSchedule(device: Device, username: string, shortUserId: string, schedule: Schedule): void {
        const commandData: CommandData = {
            name: CommandName.DeviceUpdateUserSchedule,
            value: {
                username: username,
                shortUserId: shortUserId,
                schedule: schedule
            }
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceUpdateUserSchedule)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station update user schedule - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), username: username, shortUserId: shortUserId, schedule: schedule });
        if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            const nestedPayload = {
                endDay: schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff",
                endTime: schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff",
                startDay: schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000",
                startTime: schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000",
                userId: shortUserId,
                week: schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff",
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const command = getLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                CommandType.P2P_UPDATE_USER_TIME,
                device.getChannel(),
                this.lockPublicKey,
                nestedPayload
            );
            this.p2pSession.setLockAESKey(CommandType.P2P_UPDATE_USER_TIME, command.aesKey);
            rootHTTPLogger.debug("Station update user schedule - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command, nestedPayload: nestedPayload });

            this.p2pSession.sendCommandWithStringPayload(command, {
                command: commandData
            });
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.UPDATE_USER_TIME,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdUpdateSchedule(shortUserId, schedule)
            );
            rootHTTPLogger.debug("Station update user schedule - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });

            this._sendLockV12P2PCommand(command, {
                command: commandData
            });
        } else if (device.isLockWifiVideo()) {
            const command = {
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.P2P_UPDATE_USER_TIME,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": {
                    "endDay": schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff",
                    "endTime": schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff",
                    "startDay": schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000",
                    "startTime": schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000",
                    "userId": shortUserId,
                    "week": schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff",
                }
            };
            rootHTTPLogger.debug("Station update user schedule - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify(command),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.UPDATE_USER_TIME,
                device.getChannel(),
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockUpdateSchedule(
                    this.rawStation.member.admin_user_id,
                    shortUserId,
                    username,
                    schedule
                )
            );
            rootHTTPLogger.debug("Station update user schedule - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this.p2pSession.sendCommandWithStringPayload(command.payload, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
    }

    public updateUserPasscode(device: Device, username: string, passwordId: string, passcode: string): void {
        const commandData: CommandData = {
            name: CommandName.DeviceUpdateUserPasscode,
            value: {
                username: username,
                passwordId: passwordId,
                passcode: passcode
            }
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceUpdateUserPasscode)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commonValue: commandData.value } });
        }
        if (passcode.length < 4 || passcode.length > 8 || !/^\d+$/.test(passcode)) {
            throw new InvalidCommandValueError("Passcode should contain only numbers and be between 4 and 8 long", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station update user passcode - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), username: username, passwordId: passwordId });
        if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            const nestedPayload = {
                passcode: encodePasscode(passcode),
                passwordId: passwordId,
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const command = getLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                CommandType.P2P_UPDATE_PW,
                device.getChannel(),
                this.lockPublicKey,
                nestedPayload
            );
            this.p2pSession.setLockAESKey(CommandType.P2P_UPDATE_PW, command.aesKey);
            rootHTTPLogger.debug("Station update user passcode - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command, nestedPayload: nestedPayload });

            this.p2pSession.sendCommandWithStringPayload(command, {
                command: commandData
            });
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.UPDATE_PW,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdModifyPassword(passwordId, encodePasscode(passcode).padEnd(16, "0"))
            );
            rootHTTPLogger.debug("Station update user passcode - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });

            this._sendLockV12P2PCommand(command, {
                command: commandData
            });
        } else if (device.isLockWifiVideo()) {
            const command = {
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.P2P_UPDATE_PW,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": {
                    "passcode": encodePasscode(passcode).padEnd(16, "0"),
                    "passwordId": passwordId,
                }
            };
            rootHTTPLogger.debug("Station update user passcode - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify(command),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.UPDATE_PW,
                device.getChannel(),
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockModifyPassword(
                    this.rawStation.member.admin_user_id,
                    passwordId,
                    encodePasscode(passcode)
                )
            );
            rootHTTPLogger.debug("Station update user passcode - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this.p2pSession.sendCommandWithStringPayload(command.payload, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
    }

    public setLockV12Params(device: Device, property: PropertyName, value: PropertyValue): void {
        const propertyData: PropertyData = {
            name: property,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const propertyMetadata = device.getPropertyMetadata(propertyData.name);
        validValue(propertyMetadata, value);

        rootHTTPLogger.debug(`Station set lock v12 settings - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), property: property, value: value });
        if (device.isLockWifiR10() || device.isLockWifiR20()) {
            let payload: Buffer;
            switch (property) {
                case PropertyName.DeviceWrongTryProtection:
                    payload = Lock.encodeCmdSetLockParamWrongTryProtect(
                        value as boolean,
                        device.getPropertyValue(PropertyName.DeviceWrongTryLockdownTime) as number,
                        device.getPropertyValue(PropertyName.DeviceWrongTryAttempts) as number,
                    );
                    break;
                case PropertyName.DeviceWrongTryAttempts:
                    payload = Lock.encodeCmdSetLockParamWrongTryProtect(
                        device.getPropertyValue(PropertyName.DeviceWrongTryProtection) as boolean,
                        device.getPropertyValue(PropertyName.DeviceWrongTryLockdownTime) as number,
                        value as number
                    );
                    break;
                case PropertyName.DeviceWrongTryLockdownTime:
                    payload = Lock.encodeCmdSetLockParamWrongTryProtect(
                        device.getPropertyValue(PropertyName.DeviceWrongTryProtection) as boolean,
                        value as number,
                        device.getPropertyValue(PropertyName.DeviceWrongTryAttempts) as number,
                    );
                    break;
                case PropertyName.DeviceAutoLock:
                    payload = Lock.encodeCmdSetLockParamAutoLock(
                        value as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockTimer) as number,
                    );
                    break;
                case PropertyName.DeviceAutoLockTimer:
                    payload = Lock.encodeCmdSetLockParamAutoLock(
                        device.getPropertyValue(PropertyName.DeviceAutoLock) as boolean,
                        value as number,
                    );
                    break;
                case PropertyName.DeviceAutoLockSchedule:
                    payload = Lock.encodeCmdSetLockParamAutoLockSchedule(
                        value as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleStartTime) as string,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleEndTime) as string,
                    );
                    break;
                case PropertyName.DeviceAutoLockScheduleStartTime:
                    payload = Lock.encodeCmdSetLockParamAutoLockSchedule(
                        device.getPropertyValue(PropertyName.DeviceAutoLockSchedule) as boolean,
                        value as string,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleEndTime) as string,
                    );
                    break;
                case PropertyName.DeviceAutoLockScheduleEndTime:
                    payload = Lock.encodeCmdSetLockParamAutoLockSchedule(
                        device.getPropertyValue(PropertyName.DeviceAutoLockSchedule) as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleStartTime) as string,
                        value as string,
                    );
                    break;
                case PropertyName.DeviceOneTouchLocking:
                    payload = Lock.encodeCmdSetLockParamOneTouchLock(
                        value as boolean,
                    );
                    break;
                case PropertyName.DeviceScramblePasscode:
                    payload = Lock.encodeCmdSetLockParamScramblePasscode(
                        value as boolean,
                    );
                    break;
                case PropertyName.DeviceSound:
                    payload = Lock.encodeCmdSetLockParamSound(
                        value as number,
                    );
                    break;
                default:
                    payload = Buffer.from([]);
                    break;
            }

            rootHTTPLogger.debug(`Station set lock v12 settings - payload`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), property: property, value: value, payload: payload.toString("hex") });
            const lockCommand = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.SET_LOCK_PARAM,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                payload
            );
            this._sendLockV12P2PCommand(lockCommand, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setSmartLockParams(device: Device, property: PropertyName, value: PropertyValue): void {
        const propertyData: PropertyData = {
            name: property,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const propertyMetadata = device.getPropertyMetadata(propertyData.name);
        validValue(propertyMetadata, value);

        rootHTTPLogger.debug(`Station set smart lock settings - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), property: property, value: value });
        if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            let payload: Buffer;
            switch (property) {
                case PropertyName.DeviceWrongTryProtection:
                    payload = Lock.encodeCmdSetSmartLockParamWrongTryProtect(
                        this.rawStation.member.admin_user_id,
                        value as boolean,
                        device.getPropertyValue(PropertyName.DeviceWrongTryAttempts) as number,
                        device.getPropertyValue(PropertyName.DeviceWrongTryLockdownTime) as number
                    );
                    break;
                case PropertyName.DeviceWrongTryAttempts:
                    payload = Lock.encodeCmdSetSmartLockParamWrongTryProtect(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceWrongTryProtection) as boolean,
                        value as number,
                        device.getPropertyValue(PropertyName.DeviceWrongTryLockdownTime) as number
                    );
                    break;
                case PropertyName.DeviceWrongTryLockdownTime:
                    payload = Lock.encodeCmdSetSmartLockParamWrongTryProtect(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceWrongTryProtection) as boolean,
                        device.getPropertyValue(PropertyName.DeviceWrongTryAttempts) as number,
                        value as number
                    );
                    break;
                case PropertyName.DeviceAutoLock:
                    payload = Lock.encodeCmdSetSmartLockParamAutoLock(
                        this.rawStation.member.admin_user_id,
                        value as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockTimer) as number,
                        device.getPropertyValue(PropertyName.DeviceAutoLockSchedule) as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleStartTime) as string,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleEndTime) as string,
                    );
                    break;
                case PropertyName.DeviceAutoLockTimer:
                    payload = Lock.encodeCmdSetSmartLockParamAutoLock(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceAutoLock) as boolean,
                        value as number,
                        device.getPropertyValue(PropertyName.DeviceAutoLockSchedule) as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleStartTime) as string,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleEndTime) as string,
                    );
                    break;
                case PropertyName.DeviceAutoLockSchedule:
                    payload = Lock.encodeCmdSetSmartLockParamAutoLock(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceAutoLock) as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockTimer) as number,
                        value as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleStartTime) as string,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleEndTime) as string,
                    );
                    break;
                case PropertyName.DeviceAutoLockScheduleStartTime:
                    payload = Lock.encodeCmdSetSmartLockParamAutoLock(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceAutoLock) as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockTimer) as number,
                        device.getPropertyValue(PropertyName.DeviceAutoLockSchedule) as boolean,
                        value as string,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleEndTime) as string,
                    );
                    break;
                case PropertyName.DeviceAutoLockScheduleEndTime:
                    payload = Lock.encodeCmdSetSmartLockParamAutoLock(
                        this.rawStation.member.admin_user_id,
                        device.getPropertyValue(PropertyName.DeviceAutoLock) as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockTimer) as number,
                        device.getPropertyValue(PropertyName.DeviceAutoLockSchedule) as boolean,
                        device.getPropertyValue(PropertyName.DeviceAutoLockScheduleStartTime) as string,
                        value as string,
                    );
                    break;
                case PropertyName.DeviceOneTouchLocking:
                    payload = Lock.encodeCmdSetSmartLockParamOneTouchLock(
                        this.rawStation.member.admin_user_id,
                        value as boolean,
                    );
                    break;
                case PropertyName.DeviceScramblePasscode:
                    payload = Lock.encodeCmdSetSmartLockParamScramblePasscode(
                        this.rawStation.member.admin_user_id,
                        value as boolean,
                    );
                    break;
                case PropertyName.DeviceSound:
                    payload = Lock.encodeCmdSetSmartLockParamSound(
                        this.rawStation.member.admin_user_id,
                        value as number,
                    );
                    break;
                default:
                    payload = Buffer.from([]);
                    break;
            }

            rootHTTPLogger.debug(`Station set smart lock settings - payload`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), property: property, value: value, payload: payload.toString("hex") });
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.SET_LOCK_PARAM,
                device.getChannel(),
                this.p2pSession.incLockSequenceNumber(),
                payload
            );

            this.p2pSession.sendCommandWithStringPayload(command.payload, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setAutoLock(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoLock,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set auto lock - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceAutoLock, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceAutoLock, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceAutoLock, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setAutoLockSchedule(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoLockSchedule,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set auto lock schedule - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceAutoLockSchedule, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceAutoLockSchedule, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceAutoLockSchedule, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setAutoLockScheduleStartTime(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoLockScheduleStartTime,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set auto lock schedule start time - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceAutoLockScheduleStartTime, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceAutoLockScheduleStartTime, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceAutoLockScheduleStartTime, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setAutoLockScheduleEndTime(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoLockScheduleEndTime,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set auto lock schedule end time - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceAutoLockScheduleEndTime, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceAutoLockScheduleEndTime, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceAutoLockScheduleEndTime, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setAutoLockTimer(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceAutoLockTimer,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set auto lock timer - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceAutoLockTimer, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceAutoLockTimer, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceAutoLockTimer, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setOneTouchLocking(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceOneTouchLocking,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set one touch locking - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceOneTouchLocking, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceOneTouchLocking, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceOneTouchLocking, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setSound(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceSound,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set sound - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceSound, value);
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            this.setLockV12Params(device, PropertyName.DeviceSound, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            this.setSmartLockParams(device, PropertyName.DeviceSound, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotification(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotification,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set notification - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceNotification, value);
        } else if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_NOTIFICATION,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P() || device.isLockWifiR10() || device.isLockWifiR20()) {
            let oldvalue = 0;
            const rawproperty = device.getRawProperty(CommandType.CMD_DOORLOCK_SET_PUSH_MODE);
            if (rawproperty !== undefined) {
                try {
                    oldvalue = Number.parseInt(rawproperty);
                } catch(error) {
                }
            }
            const notification = switchSmartLockNotification(oldvalue, SmartLockNotification.ENABLED, value);
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORLOCK_SET_PUSH_MODE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "mode": notification,
                    }
                }),
                channel: 0
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateRawProperty(CommandType.CMD_DOORLOCK_SET_PUSH_MODE, notification.toString(), "p2p");
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationLocked(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationLocked,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set notification locked - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceNotificationLocked, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P() || device.isLockWifiR10() || device.isLockWifiR20()) {
            let oldvalue = 0;
            const rawproperty = device.getRawProperty(CommandType.CMD_DOORLOCK_SET_PUSH_MODE);
            if (rawproperty !== undefined) {
                try {
                    oldvalue = Number.parseInt(rawproperty);
                } catch(error) {
                }
            }
            const notification = switchSmartLockNotification(oldvalue, SmartLockNotification.LOCKED, value);
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORLOCK_SET_PUSH_MODE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "mode": notification,
                    }
                }),
                channel: 0
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateRawProperty(CommandType.CMD_DOORLOCK_SET_PUSH_MODE, notification.toString(), "p2p");
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationUnlocked(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNotificationUnlocked,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set notification unlocked - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifi() || device.isLockWifiNoFinger() || device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceNotificationUnlocked, value);
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P() || device.isLockWifiR10() || device.isLockWifiR20()) {
            let oldvalue = 0;
            const rawproperty = device.getRawProperty(CommandType.CMD_DOORLOCK_SET_PUSH_MODE);
            if (rawproperty !== undefined) {
                try {
                    oldvalue = Number.parseInt(rawproperty);
                } catch(error) {
                }
            }
            const notification = switchSmartLockNotification(oldvalue, SmartLockNotification.UNLOCKED, value);
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_DOORLOCK_SET_PUSH_MODE,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "mode": notification,
                    }
                }),
                channel: 0
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateRawProperty(CommandType.CMD_DOORLOCK_SET_PUSH_MODE, notification.toString(), "p2p");
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private _sendLockV12P2PCommand(command: LockV12P2PCommand, customData?: CustomData): void {
        this.p2pSession.setLockAESKey(command.bleCommand, command.aesKey);
        this.p2pSession.sendCommandWithStringPayload(command.payload, customData);
    }

    public queryAllUserId(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceQueryAllUserId
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(commandData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station query all user id - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        if (device.isLockBleNoFinger() || device.isLockBle()) {
            throw new NotSupportedError("This functionality is not implemented by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
            //TODO: Finish implementation of query all user id for LockBleNoFinger / LockBle
            /*const key = generateBasicLockAESKey(this.rawStation.member.admin_user_id, this.getSerial());
            const iv = getLockVectorBytes(this.getSerial());
            const lockCmd = Lock.encodeESLCmdOnOff(Number.parseInt(this.rawStation.member.short_user_id), this.rawStation.member.nick_name, value);
            const payload: ESLStationP2PThroughData = {
                channel: device.getChannel(),
                lock_cmd: ESLBleCommand.ON_OFF_LOCK,
                lock_payload: lockCmd.toString("base64"),
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const encPayload = encryptLockAESData(key, iv, encodeLockPayload(JSON.stringify(payload)));

            rootHTTPLogger.debug("Locking/unlocking device...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: payload, encPayload: encPayload.toString("hex") });

            this.p2pSession.sendCommandWithStringPayload({
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
            }, {
                property: propertyData
            });*/
        } else if (device.isLockWifi() || device.isLockWifiNoFinger()) {
            const nestedPayload = {
                seq_num: this.p2pSession.incLockSequenceNumber()
            };
            const command = getLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                CommandType.P2P_GET_USER_AND_PW_ID,
                device.getChannel(),
                this.lockPublicKey,
                nestedPayload
            );
            this.p2pSession.setLockAESKey(CommandType.P2P_GET_USER_AND_PW_ID, command.aesKey);
            rootHTTPLogger.debug("Querying all user id...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command, nestedPayload: nestedPayload });

            this.p2pSession.sendCommandWithStringPayload(command, {
                command: commandData
            });
        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
            throw new NotSupportedError("This functionality is not implemented by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
            //TODO: Finish implementation of query all user id for r10 / r20
            /*const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.GET_USER_ID_AND_PW_ID,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmd(this.rawStation.member.short_user_id, value === true ? 1 : 0, this.rawStation.member.nick_name)
            );
            rootHTTPLogger.debug("Querying all user id...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this._sendLockV12P2PCommand(command, {
                command: commandData
            });*/
        } else if (device.isLockWifiVideo()) {
            rootHTTPLogger.debug("Querying all user id...", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id });
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.P2P_GET_USER_AND_PW_ID,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {}
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else if (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) {
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.QUERY_ALL_USERS,
                device.getChannel(),
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockGetUserList(this.rawStation.member.admin_user_id)
            );
            rootHTTPLogger.debug("Station get user list - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command.payload });

            this.p2pSession.sendCommandWithStringPayload(command.payload, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
    }

    public chimeHomebase(value: number): void {
        const commandData: CommandData = {
            name: CommandName.StationChime,
            value: value
        };
        if (!this.hasCommand(commandData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, station: this.getSerial()} });
        }
        if (this.rawStation.devices !== undefined) {
            this.rawStation.devices.forEach((device) => {
                if (Device.isDoorbell(device.device_type)) {
                    throw new NotSupportedError("This functionality is only supported on stations without registered Doorbells on it", { context: { commandName: commandData.name, station: this.getSerial()} });
                }
            });
        }
        rootHTTPLogger.debug(`Station chime homebase - sending command`, { stationSN: this.getSerial(), value: value });
        if (this.isStation()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_BAT_DOORBELL_DINGDONG_R,
                    "mValue3": 0,
                    "payload": {
                        "dingdong_ringtone": value,
                    }
                }),
                channel: 0
            }, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, commandValue: commandData.value, station: this.getSerial()} });
        }
    }

    private onImageDownload(file: string, image: Buffer): void {
        this.emit("image download", this, file, image);
    }

    public downloadImage(cover_path: string): void {
        const commandData: CommandData = {
            name: CommandName.StationDownloadImage,
            value: cover_path
        };
        if (!this.hasCommand(CommandName.StationDownloadImage)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, commandValue: commandData.value, station: this.getSerial()} });
        }
        rootHTTPLogger.debug(`Station download image - sending command`, { stationSN: this.getSerial(), value: cover_path });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                account_id: this.rawStation.member.admin_user_id,
                cmd: CommandType.CMD_DATABASE_IMAGE,
                mChannel: Station.CHANNEL, //TODO: Check indoor devices
                payload: [{ "file": cover_path }],
                "transaction": cover_path
            }),
            channel: Station.CHANNEL, //TODO: Check indoor devices
            strValueSub: this.rawStation.member.admin_user_id,
        }, {
            command: commandData,
        });
    }

    private onTFCardStatus(channel: number, status: TFCardStatus): void {
        this.updateRawProperty(CommandType.CMD_GET_TFCARD_STATUS, status.toString(), "p2p");
    }

    public databaseQueryLatestInfo(failureCallback?: () => void): void {
        const commandData: CommandData = {
            name: CommandName.StationDatabaseQueryLatestInfo,
        };
        if (!this.hasCommand(commandData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, station: this.getSerial()} });
        }

        rootHTTPLogger.debug(`Station database query latest info - sending command`, { stationSN: this.getSerial() });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_DATABASE,
                "mChannel": 0,
                "mValue3": 0,
                "payload": {
                    "cmd": CommandType.CMD_DATABASE_QUERY_LATEST_INFO,
                    "table": "history_record_info",
                    "transaction": `${new Date().getTime()}`
                }
            }),
            channel: 0
        }, {
            command: commandData,
            onFailure: failureCallback
        });
    }

    public databaseQueryLocal(serialNumbers: Array<string>, startDate: Date, endDate: Date, eventType: FilterEventType = 0, detectionType: FilterDetectType = 0, storageType: FilterStorageType = 0): void {
        const commandData: CommandData = {
            name: CommandName.StationDatabaseQueryLocal,
            value: {
                serialNumbers: serialNumbers,
                eventType: eventType,
                detectionType: detectionType
            }
        };
        if (!this.hasCommand(commandData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, commandValue: commandData.value, station: this.getSerial()} });
        }

        rootHTTPLogger.debug(`Station database query local - sending command`, { stationSN: this.getSerial(), serialNumbers: serialNumbers, startDate: startDate, endDate: endDate, eventType: eventType, detectionType:detectionType, storageType: storageType });
        const devices: Array<{ device_sn: string; }> = [];
        for(const serial of serialNumbers) {
            devices.push({ device_sn: serial });
        }
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_DATABASE,
                "mChannel": 0,
                "mValue3": 0,
                "payload": {
                    "cmd": CommandType.CMD_DATABASE_QUERY_LOCAL,
                    "payload":{
                        "count": 20,
                        "detection_type": detectionType,
                        "device_info": devices,
                        "end_date": date.format(endDate, "YYYYMMDD"),
                        "event_type": eventType,
                        "flag": 0,
                        "res_unzip": 1,
                        "start_date": date.format(startDate, "YYYYMMDD"),
                        "start_time": `${date.format(endDate, "YYYYMMDD")}000000`,
                        "storage_cloud": storageType === FilterStorageType.NONE || (storageType !== FilterStorageType.LOCAL && storageType !== FilterStorageType.CLOUD) ? -1 : storageType,
                        "ai_type": 0
                    },
                    "table": "history_record_info",
                    "transaction": `${new Date().getTime()}`
                }
            }),
            channel: 0
        }, {
            command: commandData
        });
    }

    public databaseDelete(ids: Array<number>): void {
        const commandData: CommandData = {
            name: CommandName.StationDatabaseDelete,
            value: ids
        };
        if (!this.hasCommand(commandData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, commandValue: commandData.value, station: this.getSerial()} });
        }

        rootHTTPLogger.debug(`Station database delete - sending command`, { stationSN: this.getSerial(), ids: ids });
        const lids: Array<{ "id": number; }> = [];
        for (const id of ids) {
            lids.push({ "id": id });
        }
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_DATABASE,
                "mChannel": 0,
                "mValue3": 0,
                "payload": {
                    "cmd": CommandType.CMD_DATABASE_DELETE,
                    "payload": lids,
                    "table": "history_record_info",
                    "transaction": `${new Date().getTime()}`
                }
            }),
            channel: 0
        }, {
            command: commandData
        });
    }

    public databaseCountByDate(startDate: Date, endDate: Date): void {
        const commandData: CommandData = {
            name: CommandName.StationDatabaseCountByDate,
            value: {
                startDate: startDate,
                endDate: endDate
            }
        };
        if (!this.hasCommand(commandData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported", { context: { commandName: commandData.name, commandValue: commandData.value, station: this.getSerial()} });
        }

        rootHTTPLogger.debug(`Station database count by date - sending command`, { stationSN: this.getSerial(), startDate: startDate, endDate: endDate });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_DATABASE,
                "mChannel": 0,
                "mValue3": 0,
                "payload": {
                    "cmd": CommandType.CMD_DATABASE_COUNT_BY_DATE,
                    "payload": {
                        "end_date": date.format(endDate, "YYYYMMDD"),
                        "start_date": date.format(startDate, "YYYYMMDD"),
                    },
                    "table": "history_record_info",
                    "transaction": `${new Date().getTime()}`
                }
            }),
            channel: 0
        }, {
            command: commandData
        });
    }

    private onDatabaseQueryLatest(returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLatestInfo>): void {
        this.emit("database query latest", this, returnCode, data);
    }

    private onDatabaseQueryLocal(returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLocal>): void {
        this.emit("database query local", this, returnCode, data);
    }

    private onDatabaseCountByDate(returnCode: DatabaseReturnCode, data: Array<DatabaseCountByDate>): void {
        this.emit("database count by date", this, returnCode, data);
    }

    private onDatabaseDelete(returnCode: DatabaseReturnCode, failedIds: Array<unknown>): void {
        this.emit("database delete", this, returnCode, failedIds);
    }

    private onSensorStatus(channel: number, status: number): void {
        this.emit("sensor status", this, channel, status);
    }

    public setMotionDetectionTypeHuman(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionTypeHuman,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion detection type human - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_MOTION_DETECTION_TYPE_HUMAN,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setMotionDetectionTypeAllOtherMotions(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionDetectionTypeAllOtherMotions,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion detection type all other motions - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_MOTION_DETECTION_TYPE_ALL,
                    "data": value === true ? 1 : 0,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private _setLightSettingsLightingActiveMode(device: Device, propertyName: PropertyName, value: LightingActiveMode, type: "manual" | "schedule" | "motion"): void {
        const propertyData: PropertyData = {
            name: propertyName,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set set light settings lighting active mode - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), propertyName: propertyName, value: value, type: type });
        if (device.isWallLightCam()) {
            switch(value) {
                case LightingActiveMode.DAILY: {
                    let currentProperty = PropertyName.DeviceLightSettingsManualDailyLighting;
                    if (type === "schedule") {
                        currentProperty = PropertyName.DeviceLightSettingsScheduleDailyLighting;
                    } else if (type === "motion") {
                        currentProperty = PropertyName.DeviceLightSettingsMotionDailyLighting;
                    }
                    let currentPropertyValue = device.getPropertyValue(currentProperty) as number;
                    if (!(currentPropertyValue in DailyLightingType)) {
                        currentPropertyValue = DailyLightingType.COLD;
                    }
                    //TODO: Force cloud api refresh or updateProperty of currentPropertyValue?
                    this.p2pSession.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                        value: JSON.stringify({
                            "commandType": type === "manual" ? CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_DAILY_LIGHTING : type === "schedule" ? CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_DAILY_LIGHTING : CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_DAILY_LIGHTING,
                            "data": currentPropertyValue,
                        }),
                        channel: device.getChannel()
                    }, {
                        property: propertyData,
                        onSuccess: () => {
                            device.updateProperty(currentProperty, currentPropertyValue);
                        }
                    });
                    break;
                }
                case LightingActiveMode.COLORED: {
                    let currentProperty = PropertyName.DeviceLightSettingsManualColoredLighting;
                    if (type === "schedule") {
                        currentProperty = PropertyName.DeviceLightSettingsScheduleColoredLighting;
                    } else if (type === "motion") {
                        currentProperty = PropertyName.DeviceLightSettingsMotionColoredLighting;
                    }
                    let currentPropertyValue = device.getPropertyValue(currentProperty) as RGBColor;
                    const colors: Array<RGBColor> = (device.getPropertyValue(PropertyName.DeviceLightSettingsColoredLightingColors) as Array<RGBColor>);
                    if (!colors.some(color => color.red === currentPropertyValue.red && color.green === currentPropertyValue.green && color.blue === currentPropertyValue.blue)) {
                        currentPropertyValue = colors[0];
                    }
                    //TODO: Force cloud api refresh or updateProperty of currentPropertyValue?
                    this.p2pSession.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                        value: JSON.stringify({
                            "commandType": type === "manual" ? CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_COLORED_LIGHTING : type === "schedule" ? CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_COLORED_LIGHTING : CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_COLORED_LIGHTING,
                            "data": {
                                "rgb_color": RGBColorToDecimal(currentPropertyValue)
                            },
                        }),
                        channel: device.getChannel()
                    }, {
                        property: propertyData,
                        onSuccess: () => {
                            device.updateProperty(currentProperty, currentPropertyValue);
                        }
                    });
                    break;
                }
                case LightingActiveMode.DYNAMIC: {
                    let currentProperty = PropertyName.DeviceLightSettingsManualDynamicLighting;
                    if (type === "schedule") {
                        currentProperty = PropertyName.DeviceLightSettingsScheduleDynamicLighting;
                    } else if (type === "motion") {
                        currentProperty = PropertyName.DeviceLightSettingsMotionDynamicLighting;
                    }
                    let currentPropertyValue = device.getPropertyValue(currentProperty) as number;
                    const range: number = (device.getPropertyValue(PropertyName.DeviceLightSettingsDynamicLightingThemes) as Array<DynamicLighting>).length;
                    if (currentPropertyValue < 0 || currentPropertyValue >= range) {
                        currentPropertyValue = 0;
                    }
                    //TODO: Force cloud api refresh or updateProperty of currentPropertyValue?
                    this.p2pSession.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                        value: JSON.stringify({
                            "commandType": type === "manual" ? CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_DYNAMIC_LIGHTING : type === "schedule" ? CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_DYNAMIC_LIGHTING : CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_DYNAMIC_LIGHTING,
                            "data": currentPropertyValue,
                        }),
                        channel: device.getChannel()
                    }, {
                        property: propertyData,
                        onSuccess: () => {
                            device.updateProperty(currentProperty, currentPropertyValue);
                        }
                    });
                    break;
                }
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsManualLightingActiveMode(device: Device, value: LightingActiveMode): void {
        this._setLightSettingsLightingActiveMode(device, PropertyName.DeviceLightSettingsManualLightingActiveMode, value , "manual");
    }

    public setLightSettingsManualDailyLighting(device: Device, value: DailyLightingType): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsManualDailyLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings manual daily lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_DAILY_LIGHTING,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsManualLightingActiveMode, LightingActiveMode.DAILY);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsManualColoredLighting(device: Device, value: RGBColor): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsManualColoredLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        const colors: Array<RGBColor> = (device.getPropertyValue(PropertyName.DeviceLightSettingsColoredLightingColors) as Array<RGBColor>);
        if (!colors.some(color => color.red === value.red && color.green === value.green && color.blue === value.blue)) {
            throw new InvalidPropertyValueError("Invalid value for this property", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }

        rootHTTPLogger.debug(`Station set light settings manual colored lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_COLORED_LIGHTING,
                    "data": {
                        "rgb_color": RGBColorToDecimal(value)
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsManualLightingActiveMode, LightingActiveMode.COLORED);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsManualDynamicLighting(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsManualDynamicLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings manual dynamic lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_DYNAMIC_LIGHTING,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsManualLightingActiveMode, LightingActiveMode.DYNAMIC);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsMotionLightingActiveMode(device: Device, value: LightingActiveMode): void {
        this._setLightSettingsLightingActiveMode(device, PropertyName.DeviceLightSettingsMotionLightingActiveMode, value , "motion");
    }

    public setLightSettingsMotionDailyLighting(device: Device, value: DailyLightingType): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionDailyLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings motion daily lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_DAILY_LIGHTING,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsMotionActivationMode, LightingActiveMode.DAILY);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsMotionColoredLighting(device: Device, value: RGBColor): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionColoredLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        const colors: Array<RGBColor> = (device.getPropertyValue(PropertyName.DeviceLightSettingsColoredLightingColors) as Array<RGBColor>);
        if (!colors.some(color => color.red === value.red && color.green === value.green && color.blue === value.blue)) {
            throw new InvalidPropertyValueError("Invalid value for this property", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }

        rootHTTPLogger.debug(`Station set light settings motion colored lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_COLORED_LIGHTING,
                    "data": {
                        "rgb_color": RGBColorToDecimal(value)
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsMotionActivationMode, LightingActiveMode.COLORED);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsMotionDynamicLighting(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsMotionDynamicLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings motion dynamic lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_DYNAMIC_LIGHTING,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsMotionActivationMode, LightingActiveMode.DYNAMIC);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsScheduleLightingActiveMode(device: Device, value: LightingActiveMode): void {
        this._setLightSettingsLightingActiveMode(device, PropertyName.DeviceLightSettingsScheduleLightingActiveMode, value , "schedule");
    }

    public setLightSettingsScheduleDailyLighting(device: Device, value: DailyLightingType): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsScheduleDailyLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings schedule daily lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_DAILY_LIGHTING,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsScheduleLightingActiveMode, LightingActiveMode.DAILY);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsScheduleColoredLighting(device: Device, value: RGBColor): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsScheduleColoredLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        const colors: Array<RGBColor> = (device.getPropertyValue(PropertyName.DeviceLightSettingsColoredLightingColors) as Array<RGBColor>);
        if (!colors.some(color => color.red === value.red && color.green === value.green && color.blue === value.blue)) {
            throw new InvalidPropertyValueError("Invalid value for this property", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }

        rootHTTPLogger.debug(`Station set light settings schedule colored lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_COLORED_LIGHTING,
                    "data": {
                        "rgb_color": RGBColorToDecimal(value)
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsScheduleLightingActiveMode, LightingActiveMode.COLORED);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsScheduleDynamicLighting(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsScheduleDynamicLighting,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings schedule dynamic lighting - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_DYNAMIC_LIGHTING,
                    "data": value,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData,
                onSuccess: () => {
                    device.updateProperty(PropertyName.DeviceLightSettingsScheduleLightingActiveMode, LightingActiveMode.DYNAMIC);
                }
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsColoredLightingColors(device: Device, value: Array<RGBColor>): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsColoredLightingColors,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings colored lighting colors - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            const colors: Array<InternalColoredLighting> = [{"color":16760832}, {"color":16744448}, {"color":16728320}, {"color":16720384}, {"color":16711696}, {"color":3927961}, {"color":1568995}, {"color":485368}, {"color":9983}, {"color":4664060}];
            if (value.length > 0 && value.length <= 15) {
                let count = 0;
                for (let i = 0; i < colors.length; i++) {
                    if (RGBColorToDecimal(value[i]) === colors[i].color) {
                        count++;
                    } else {
                        break;
                    }
                }
                if (value.length - count + colors.length > 15) {
                    throw new InvalidPropertyValueError("This property can contain a maximum of 15 items, of which the first 10 are fixed. You can either deliver the first 10 static items with the maximum 5 freely selectable items or only the maximum 5 freely selectable items.", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
                } else {
                    for(let i = count; i < value.length - count + 10; i++) {
                        colors.push({ color: RGBColorToDecimal(value[i]) });
                    }
                }
            } else {
                throw new InvalidPropertyValueError("This property can contain a maximum of 15 items, of which the first 10 are fixed. You can either deliver the first 10 static items with the maximum 5 freely selectable items or only the maximum 5 freely selectable items.", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_COLORED_LIGHTING_COLORS,
                    "data": colors,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLightSettingsDynamicLightingThemes(device: Device, value: Array<DynamicLighting>): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLightSettingsDynamicLightingThemes,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set light settings dynamic lighting themes - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isWallLightCam()) {
            const themes:Array<InternalDynamicLighting> = [{"name":"Aurora","mode":1,"id":0,"speed":4000,"colors":[65321,65468,28671,9215,42239]},{"name":"Warmth","mode":1,"id":1,"speed":4000,"colors":[16758528,16744448,16732160,16719360,16742144]},{"name":"Let's Party","mode":2,"id":2,"speed":500,"colors":[16718080,16756736,65298,40703,4980991]}];
            if (value.length > 0 && value.length <= 23) {
                let count = 0;
                for (let i = 0; i < themes.length; i++) {
                    if (value[i].name === themes[i].name) {
                        count++;
                    } else {
                        break;
                    }
                }
                if (value.length - count + themes.length > 23) {
                    throw new InvalidPropertyValueError("This property can contain a maximum of 23 items, of which the first 3 are fixed. You can either deliver the first 3 static items with the maximum 20 freely selectable items or only the maximum 20 freely selectable items.", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
                } else {
                    for(let i = count; i < value.length - count + 3; i++) {
                        themes.push({
                            id: i,
                            colors: value[i].colors.map((color) => RGBColorToDecimal(color)),
                            mode: value[i].mode,
                            name: value[i].name,
                            speed: value[i].speed
                        });
                    }
                }
            } else {
                throw new InvalidPropertyValueError("This property can contain a maximum of 23 items, of which the first 3 are fixed. You can either deliver the first 3 static items with the maximum 20 freely selectable items or only the maximum 20 freely selectable items.", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
            }
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_WALL_LIGHT_SETTINGS_DYNAMIC_LIGHTING_THEMES,
                    "data": themes,
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setDoorControlWarning(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceDoorControlWarning,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set door control warning - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isGarageCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_CAMERA_GARAGE_DOOR_CONTROL_WARNING,
                    "data": {
                        "doorid": 1,
                        "value": value === true ? 1 : 0,
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public openDoor(device: Device, value: boolean, doorId = 1): void {
        const propertyData: PropertyData = {
            name: doorId === 1 ? PropertyName.DeviceDoor1Open : PropertyName.DeviceDoor2Open,
            value: {
                value: value,
                doorId: doorId
            }
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station open door - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value, doorId: doorId });
        if (device.isGarageCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_CAMERA_GARAGE_DOOR_STATUS,
                    "data": {
                        "cmdType": 0,
                        "disable_push": 0,
                        "source": 0,
                        "type": doorId === 1 ? (value === true ? 1 : 0) : (value === true ? 3 : 2),
                        "user_name": this.rawStation.member.nick_name,
                    },
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private onGarageDoorStatus(channel: number, doorId: number, status: number): void {
        this.emit("garage door status", this, channel, doorId, status);
    }

    public calibrateGarageDoor(device: Device, doorId: number, type: CalibrateGarageType): void {
        const commandData: CommandData = {
            name: CommandName.DeviceCalibrateGarageDoor
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceCalibrateGarageDoor)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station calibrate garage door  - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), doorId: doorId, type: type });
        if (device.isGarageCamera()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_CAMERA_GARAGE_DOOR_CALIBRATE,
                    "data": {
                        "door_id": doorId,
                        "type": type
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
    }

    private onStorageInfoHB3(channel: number, storageInfo: StorageInfoBodyHB3): void {
        this.emit("storage info hb3", this, channel, storageInfo);
    }

    public setMirrorMode(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceImageMirrored,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set mirror mode - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithIntString({
            commandType: CommandType.CMD_SET_MIRRORMODE,
            value: value === true ? 1 : 0,
            valueSub: device.getChannel(),
            strValue: this.rawStation.member.admin_user_id,
            channel: device.getChannel()
        }, {
            property: propertyData
        });
    }

    public setFlickerAdjustment(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceFlickerAdjustment,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set flicker adjustment - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_FLICKER_ADJUSTMENT,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": {
                    "channel": device.getChannel(),
                    "value": value
                }
            }),
            channel: device.getChannel(),
        }, {
            property: propertyData
        });
    }

    public setCrossCameraTracking(value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationCrossCameraTracking,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set cross camera tracking - sending command`, { stationSN: this.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_CROSS_CAMERA_TRACKING,
                "mChannel": 0,
                "mValue3": 0,
                "payload": {
                    "value": value === true ? 1 : 0,
                }
            }),
            channel: 0,
        }, {
            property: propertyData
        });
    }

    public setContinuousTrackingTime(value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationContinuousTrackingTime,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);
        rootHTTPLogger.debug(`Station set continuous tracking time - sending command`, { stationSN: this.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_CONTINUOUS_TRACKING_TIME,
                "mChannel": 0,
                "mValue3": 0,
                "payload": {
                    "value": value
                }
            }),
            channel: 0,
        }, {
            property: propertyData
        });
    }

    public setTrackingAssistance(value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationTrackingAssistance,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set tracking assistance - sending command`, { stationSN: this.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_TRACKING_ASSISTANCE,
                "mChannel": 0,
                "mValue3": 0,
                "payload": {
                    "value": value === true ? 1 : 0,
                }
            }),
            channel: 0,
        }, {
            property: propertyData
        });
    }

    public setCrossTrackingCameraList(value: Array<string>): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationCrossTrackingCameraList,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set cross tracking camera list - sending command`, { stationSN: this.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_CROSS_TRACKING_CAMERA_LIST,
                "mChannel": 0,
                "mValue3": 0,
                "payload": value
            }),
            channel: 0,
        }, {
            property: propertyData
        });
    }

    public setCrossTrackingGroupList(value: Array<CrossTrackingGroupEntry>): void {
        const propertyData: PropertyData = {
            name: PropertyName.StationCrossTrackingGroupList,
            value: value
        };
        if (!this.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = this.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set cross tracking group list - sending command`, { stationSN: this.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_CROSS_TRACKING_GROUP_LIST,
                "mChannel": 0,
                "mValue3": 0,
                "payload": value
            }),
            channel: 0,
        }, {
            property: propertyData
        });
    }

    public setNotificationIndoor(device: Device, type: IndoorS350NotificationTypes, value: boolean): void {
        const propertyData: PropertyData = {
            name: type === IndoorS350NotificationTypes.ALL_OTHER_MOTION ? PropertyName.DeviceNotificationAllOtherMotion : type === IndoorS350NotificationTypes.HUMAN ? PropertyName.DeviceNotificationPerson : type === IndoorS350NotificationTypes.PET ? PropertyName.DeviceNotificationPet : type === IndoorS350NotificationTypes.CRYING ? PropertyName.DeviceNotificationCrying : PropertyName.DeviceNotificationAllSound,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification type indoor - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), type: type, value: value });
        if (device.isIndoorPanAndTiltCameraS350()) {
            try {
                const notification = device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number) !== undefined ? device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number)! : "0";
                let newNotification = getIndoorNotification(Number.parseInt(notification), type as IndoorS350NotificationTypes, value);
                if (newNotification === 0) {
                    newNotification = type;
                }
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": {
                            "onoff": newNotification,
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE, newNotification.toString(), "p2p");
                    }
                });
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error(`setNotificationIndoor Error`, { error: getError(error), stationSN: this.getSerial(), deviceSN: device.getSerial() });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNotificationFloodlightT8425(device: Device, type: FloodlightT8425NotificationTypes, value: boolean): void {
        const propertyData: PropertyData = {
            name: type === FloodlightT8425NotificationTypes.ALL_OTHER_MOTION ? PropertyName.DeviceNotificationAllOtherMotion : type === FloodlightT8425NotificationTypes.HUMAN ? PropertyName.DeviceNotificationPerson : type === FloodlightT8425NotificationTypes.PET ? PropertyName.DeviceNotificationPet : PropertyName.DeviceNotificationVehicle,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set notification type floodlight T8425 - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), type: type, value: value });
        if (device.isFloodLightT8425()) {
            try {
                const notification = device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number) !== undefined ? device.getRawProperty(device.getPropertyMetadata(propertyData.name).key as number)! : "0";
                let newNotification = getFloodLightT8425Notification(Number.parseInt(notification), type as FloodlightT8425NotificationTypes, value);
                if (newNotification < 312) {
                    newNotification = 312;
                }
                this.p2pSession.sendCommandWithStringPayload({
                    commandType: CommandType.CMD_SET_PAYLOAD,
                    value: JSON.stringify({
                        "account_id": this.rawStation.member.admin_user_id,
                        "cmd": CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE,
                        "mChannel": device.getChannel(),
                        "mValue3": 0,
                        "payload": {
                            "onoff": newNotification,
                        }
                    }),
                    channel: device.getChannel()
                }, {
                    property: propertyData,
                    onSuccess: () => {
                        device.updateRawProperty(CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE, newNotification.toString(), "p2p");
                    }
                });
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error(`setNotificationFloodlightT8425 Error`, { error: getError(error), stationSN: this.getSerial(), deviceSN: device.getSerial() });
            }
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public presetPosition(device: Device, position: PresetPositionType): void {
        const commandData: CommandData = {
            name: CommandName.DevicePresetPosition,
            value: position
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DevicePresetPosition)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!(position in PresetPositionType)) {
            throw new InvalidCommandValueError("Invalid value for this command", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }

        rootHTTPLogger.debug(`Station preset position - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), preset: PresetPositionType[position] });
        if (device.isFloodLightT8425() || device.isIndoorPanAndTiltCameraS350() || device.isOutdoorPanAndTiltCamera() || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SET_MOTION_PRESET_POSITION,
                    "data":{
                        "value": position,
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        }
    }

    public savePresetPosition(device: Device, position: PresetPositionType): void {
        const commandData: CommandData = {
            name: CommandName.DeviceSavePresetPosition,
            value: position
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceSavePresetPosition)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!(position in PresetPositionType)) {
            throw new InvalidCommandValueError("Invalid value for this command", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }

        rootHTTPLogger.debug(`Station save preset position - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), preset: PresetPositionType[position] });
        if (device.isFloodLightT8425() || device.isIndoorPanAndTiltCameraS350() || device.isOutdoorPanAndTiltCamera() || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_SAVE_MOTION_PRESET_POSITION,
                    "data":{
                        "value": position,
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        }
    }

    public deletePresetPosition(device: Device, position: PresetPositionType): void {
        const commandData: CommandData = {
            name: CommandName.DeviceDeletePresetPosition,
            value: position
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceDeletePresetPosition)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!(position in PresetPositionType)) {
            throw new InvalidCommandValueError("Invalid value for this command", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }

        rootHTTPLogger.debug(`Station delete preset position - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), preset: PresetPositionType[position] });
        if (device.isFloodLightT8425() || device.isIndoorPanAndTiltCameraS350() || device.isOutdoorPanAndTiltCamera() || device.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_DOORBELL_SET_PAYLOAD,
                value: JSON.stringify({
                    "commandType": CommandType.CMD_FLOODLIGHT_DELETE_MOTION_PRESET_POSITION,
                    "data":{
                        "value": position,
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        }
    }

    public setLeavingDetection(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLeavingDetection,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set leaving detection - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isGarageCamera() || device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_MOTION_SET_LEAVING_DETECTION,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "leaving_detection_switch": value ? 1 : 0
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    private _setLeavingReactions(device: Device, propertyData: PropertyData, pushNotification: boolean, startTime: string, endTime: string): void {
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, propertyData.value);

        rootHTTPLogger.debug(`Station set leaving reactions - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), propertyData: propertyData, pushNotification: pushNotification, startTime: startTime, endTime: endTime });
        if (device.isLockWifiVideo()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_MOTION_SET_LEAVING_REACTIONS,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "end_hour": endTime.split(":")[0],
                        "end_min": endTime.split(":")[1],
                        "push_notify": pushNotification === true ? 1 : 0,
                        "start_hour": startTime.split(":")[0],
                        "start_min": startTime.split(":")[1],
                    }
                }),
                channel: device.getChannel()
            }, {
                property: propertyData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setLeavingReactionNotification(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLeavingReactionNotification,
            value: value
        };
        this._setLeavingReactions(
            device,
            propertyData,
            value,
            device.getPropertyValue(PropertyName.DeviceLeavingReactionStartTime) as string,
            device.getPropertyValue(PropertyName.DeviceLeavingReactionEndTime) as string
        );
    }

    public setLeavingReactionStartTime(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLeavingReactionStartTime,
            value: value
        };
        this._setLeavingReactions(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceLeavingReactionNotification) as boolean,
            value,
            device.getPropertyValue(PropertyName.DeviceLeavingReactionEndTime) as string
        );
    }

    public setLeavingReactionEndTime(device: Device, value: string): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceLeavingReactionEndTime,
            value: value
        };
        this._setLeavingReactions(
            device,
            propertyData,
            device.getPropertyValue(PropertyName.DeviceLeavingReactionNotification) as boolean,
            device.getPropertyValue(PropertyName.DeviceLeavingReactionStartTime) as string,
            value
        );
    }

    public setBeepVolume(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceBeepVolume,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set beep volume - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceBeepVolume, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNightvisionOptimization(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNightvisionOptimization,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set nightvision optimization - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceNightvisionOptimization, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public setNightvisionOptimizationSide(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceNightvisionOptimizationSide,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        rootHTTPLogger.debug(`Station set nightvision optimization - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        if (device.isLockWifiVideo()) {
            this.setAdvancedLockParams(device, PropertyName.DeviceNightvisionOptimizationSide, value);
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
    }

    public getLockParameters(): void {
        //TODO: Implement support for other Locks
        if (Device.isLockWifiT8506(this.getDeviceType()) || Device.isLockWifiT8502(this.getDeviceType()) || Device.isLockWifiT8510P(this.getDeviceType(), this.getSerial()) || Device.isLockWifiT8520P(this.getDeviceType(), this.getSerial())) {
            rootHTTPLogger.debug(`Station smart lock send get lock parameters command`, { stationSN: this.getSerial() });
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.GET_LOCK_PARAM,
                0,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockGetParams(this.rawStation.member.admin_user_id)
            );
            this.p2pSession.sendCommandWithStringPayload(command.payload);
        } else if (Device.isLockWifiR10(this.getDeviceType()) || Device.isLockWifiR20(this.getDeviceType())) {
            rootHTTPLogger.debug(`Station lock v12 send get lock parameters command`, { stationSN: this.getSerial() });
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.GET_LOCK_PARAM,
                0,
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdGetLockParam(this.rawStation.member.admin_user_id)
            );
            this._sendLockV12P2PCommand(command);
        }
    }

    public getLockStatus(): void {
        //TODO: Implement support for other Locks
        if (Device.isLockWifiT8506(this.getDeviceType()) || Device.isLockWifiT8502(this.getDeviceType()) || Device.isLockWifiT8510P(this.getDeviceType(), this.getSerial()) || Device.isLockWifiT8520P(this.getDeviceType(), this.getSerial())) {
            rootHTTPLogger.debug(`Station smart lock send get lock status command`, { stationSN: this.getSerial() });
            const command = getSmartLockP2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                SmartLockCommand.QUERY_STATUS_IN_LOCK,
                0,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdSmartLockStatus(this.rawStation.member.admin_user_id)
            );
            this.p2pSession.sendCommandWithStringPayload(command.payload);
        } else if (Device.isLockWifiR10(this.getDeviceType()) || Device.isLockWifiR20(this.getDeviceType())) {
            rootHTTPLogger.debug(`Station lock v12 send get lock status command`, { stationSN: this.getSerial() });
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.QUERY_STATUS_IN_LOCK,
                0,
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdStatus(this.rawStation.member.admin_user_id)
            );
            this._sendLockV12P2PCommand(command);
        } else if (Device.isLockWifi(this.getDeviceType(), this.getSerial()) || Device.isLockWifiNoFinger(this.getDeviceType())) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.P2P_QUERY_STATUS_IN_LOCK,
                    "mChannel": 0,
                    "mValue3": 0,
                    "payload": {
                        "timezone": this.rawStation.time_zone === undefined || this.rawStation.time_zone === "" ? getAdvancedLockTimezone(this.rawStation.station_sn) : this.rawStation.time_zone,
                    }}),
                channel: 0
            } as P2PCommand);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private onSequenceError(channel: number, command: number, sequence: number, serialnumber: string): void {
        //TODO: Implement command retry for lock devices in case von sequence mismatch error
        rootHTTPLogger.debug(`Station lock sequence error`, { stationSN: this.getSerial(), channel: channel, command: command, sequence: sequence, serialnumber: serialnumber });
    }

    public updateUsername(device: Device, username: string, passwordId: string): void {
        const commandData: CommandData = {
            name: CommandName.DeviceUpdateUsername,
            value: {
                username: username,
                passwordId: passwordId,
            }
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        if (!device.hasCommand(CommandName.DeviceUpdateUsername)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
        rootHTTPLogger.debug(`Station update username - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), username: username, passwordId: passwordId });
        if (device.isLockWifiR10() || device.isLockWifiR20()) {
            const command = getLockV12P2PCommand(
                this.rawStation.station_sn,
                this.rawStation.member.admin_user_id,
                ESLCommand.MODIFY_NAME,
                device.getChannel(),
                this.lockPublicKey,
                this.p2pSession.incLockSequenceNumber(),
                Lock.encodeCmdModifyUsername(username, passwordId)
            );
            rootHTTPLogger.debug("Station update username - payload", { station: this.getSerial(), device: device.getSerial(), admin_user_id: this.rawStation.member.admin_user_id, payload: command });

            this._sendLockV12P2PCommand(command, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name, commandValue: commandData.value } });
        }
    }


    public setOpenMethod(device: Device, value: number): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceOpenMethod,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set open method - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SMART_DROP_DELIVERY_MODE,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": {
                    "isDeniedDelivery": 0,
                    "userIndex": 0,
                    "workmode": value,
                }
            }),
            channel: device.getChannel(),
        }, {
            property: propertyData
        });
    }

    public setMotionActivatedPrompt(device: Device, value: boolean): void {
        const propertyData: PropertyData = {
            name: PropertyName.DeviceMotionActivatedPrompt,
            value: value
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        if (!device.hasProperty(propertyData.name)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), propertyName: propertyData.name, propertyValue: propertyData.value } });
        }
        const property = device.getPropertyMetadata(propertyData.name);
        validValue(property, value);

        rootHTTPLogger.debug(`Station set motion activated prompt - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial(), value: value });
        this.p2pSession.sendCommandWithStringPayload({
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                "account_id": this.rawStation.member.admin_user_id,
                "cmd": CommandType.CMD_SET_AUDIO_MOTION_ACTIVATED_PROMPT,
                "mChannel": device.getChannel(),
                "mValue3": 0,
                "payload": {
                    "channel": device.getChannel(),
                    "enable": value === true ? 1 : 0,
                }
            }),
            channel: device.getChannel(),
        }, {
            property: propertyData
        });
    }

    public open(device: Device): void {
        const commandData: CommandData = {
            name: CommandName.DeviceOpen
        };
        if (device.getStationSerial() !== this.getSerial()) {
            throw new WrongStationError("Device is not managed by this station", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        if (!device.hasCommand(CommandName.DeviceOpen)) {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
        rootHTTPLogger.debug(`Station open - sending command`, { stationSN: this.getSerial(), deviceSN: device.getSerial() });
        if (device.isSmartDrop()) {
            this.p2pSession.sendCommandWithStringPayload({
                commandType: CommandType.CMD_SET_PAYLOAD,
                value: JSON.stringify({
                    "account_id": this.rawStation.member.admin_user_id,
                    "cmd": CommandType.CMD_SMART_DROP_OPEN_LID,
                    "mChannel": device.getChannel(),
                    "mValue3": 0,
                    "payload": {
                        "isOpen": 1,
                        "userIndex": 0.
                    }
                }),
                channel: device.getChannel()
            }, {
                command: commandData
            });
        } else {
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: device.getSerial(), station: this.getSerial(), commandName: commandData.name } });
        }
    }

}
