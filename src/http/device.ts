import { TypedEmitter } from "tiny-typed-emitter";

import { HTTPApi } from "./api";
import { CommandName, DeviceCommands, DeviceEvent, DeviceProperties, DeviceType, FloodlightMotionTriggeredDistance, GenericDeviceProperties, ParamType, PropertyName, DeviceDogDetectedProperty, DeviceDogLickDetectedProperty, DeviceDogPoopDetectedProperty, DeviceIdentityPersonDetectedProperty, DeviceMotionHB3DetectionTypeAllOtherMotionsProperty, DeviceMotionHB3DetectionTypeHumanProperty, DeviceMotionHB3DetectionTypeHumanRecognitionProperty, DeviceMotionHB3DetectionTypePetProperty, DeviceMotionHB3DetectionTypeVehicleProperty, DeviceStrangerPersonDetectedProperty, DeviceVehicleDetectedProperty, HB3DetectionTypes, DevicePersonDetectedProperty, DeviceMotionDetectedProperty, DevicePetDetectedProperty, DeviceSoundDetectedProperty, DeviceCryingDetectedProperty, DeviceDetectionStatisticsWorkingDaysProperty, DeviceDetectionStatisticsDetectedEventsProperty, DeviceDetectionStatisticsRecordedEventsProperty, DeviceEnabledSoloProperty, FloodlightT8420XDeviceProperties, WiredDoorbellT8200XDeviceProperties, GarageDoorState, SourceType, TrackerType, T8170DetectionTypes, IndoorS350NotificationTypes, SoloCameraDetectionTypes, FloodlightT8425NotificationTypes, DeviceAudioRecordingProperty, DeviceMotionDetectionSensitivityCamera2Property, DeviceVideoRecordingQualitySoloCamerasHB3Property, DeviceNotificationTypeProperty, DeviceMotionDetectionProperty, SmartLockNotification, LockT8510PDeviceProperties, LockT8520PDeviceProperties } from "./types";
import { DeviceListResponse, Voice, GarageDoorSensorsProperty, FloodlightDetectionRangeT8425Property, FloodlightLightSettingsMotionT8425Property, FloodlightLightSettingsBrightnessScheduleT8425Property } from "./models"
import { ParameterHelper } from "./parameter";
import { DeviceEvents, PropertyValue, PropertyValues, PropertyMetadataAny, IndexedProperty, RawValues, PropertyMetadataNumeric, PropertyMetadataBoolean, PropertyMetadataString, Schedule, Voices, PropertyMetadataObject, DeviceConfig } from "./interfaces";
import { CommandType, ESLAnkerBleConstant, TrackerCommandType } from "../p2p/types";
import { calculateCellularSignalLevel, calculateWifiSignalLevel, getAbsoluteFilePath, getDistances, getImagePath, getLockEventType, hexDate, hexTime, hexWeek, isFloodlightT8425NotitficationEnabled, isHB3DetectionModeEnabled, isIndoorNotitficationEnabled, isPrioritySourceType, isSmartLockNotification, isT8170DetectionModeEnabled, loadEventImage, WritePayload } from "./utils";
import { DecimalToRGBColor, eslTimestamp, getCurrentTimeInSeconds, isCharging } from "../p2p/utils";
import { CusPushEvent, DoorbellPushEvent, LockPushEvent, IndoorPushEvent, SmartSafeEvent, HB3PairedDevicePushEvent, GarageDoorPushEvent, SmartDropOpen, SmartDropOpenedBy, SmartDropPushEvent } from "../push/types";
import { PushMessage, SmartSafeEventValueDetail } from "../push/models";
import { getError, isEmpty, validValue } from "../utils";
import { InvalidPropertyError, PropertyNotSupportedError } from "./error";
import { DeviceSmartLockNotifyData } from "../mqtt/model";
import { DynamicLighting, InternalColoredLighting, InternalDynamicLighting, RGBColor, VideoStreamingRecordingQuality } from "../p2p";
import { ensureError } from "../error";
import { rootHTTPLogger } from "../logging"
import { Station } from "./station";

export class Device extends TypedEmitter<DeviceEvents> {

    protected api: HTTPApi;
    protected rawDevice: DeviceListResponse;
    protected eventTimeouts = new Map<DeviceEvent, NodeJS.Timeout>();
    protected pictureEventTimeouts = new Map<string, NodeJS.Timeout>();

    protected properties: PropertyValues = {};
    protected config: DeviceConfig = {};
    private rawProperties: RawValues = {};
    private ready = false;

    protected constructor(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig) {
        super();
        this.api = api;
        this.rawDevice = device;
        this.config = deviceConfig;
    }

    protected initializeState(): void {
        this.update(this.rawDevice);
        this.ready = true;
        setImmediate(() => {
            this.emit("ready", this);
        });
    }

    public initialize(): void {
        this.initializeState();
    }

    public getRawDevice(): DeviceListResponse {
        return this.rawDevice;
    }

    public update(device: DeviceListResponse): void {
        this.rawDevice = device;
        const metadata = this.getPropertiesMetadata(true);
        for (const property of Object.values(metadata)) {
            if (this.rawDevice[property.key] !== undefined && typeof property.key === "string") {
                if (property.key === "cover_path" && !this.getPropertyValue(property.name) && this.rawDevice[property.key] !== "") {
                    // First image initialisation if no image has been set yet and a cloud value is available
                    this.updateProperty(property.name, this.convertRawPropertyValue(property, getImagePath(this.rawDevice[property.key])));
                } else {
                    this.updateProperty(property.name, this.convertRawPropertyValue(property, this.rawDevice[property.key] as string));
                }
            } else if (this.properties[property.name] === undefined && property.default !== undefined && !this.ready) {
                this.updateProperty(property.name, property.default);
            }
        }
        if (this.rawDevice.params) {
            this.rawDevice.params.forEach(param => {
                this.updateRawProperty(param.param_type, param.param_value, "http");
            });
        }
        rootHTTPLogger.debug("Update device cloud properties", { deviceSN: this.getSerial(), properties: this.properties });
    }

    public updateProperty(name: string, value: PropertyValue, force = false): boolean {
        if ((this.properties[name] !== undefined && this.properties[name] !== value)
            || this.properties[name] === undefined || force) {
            const oldValue = this.properties[name];
            this.properties[name] = value;
            this.emit("property changed", this, name, value, this.ready);
            try {
                this.handlePropertyChange(this.getPropertyMetadata(name, true), oldValue, this.properties[name]);
            } catch (err) {
                const error = ensureError(err);
                if (error instanceof InvalidPropertyError) {
                    rootHTTPLogger.error(`Device update property - Invalid Property error`, { error: getError(error), deviceSN: this.getSerial(), propertyName: name, propertyValue: value, force: force });
                } else {
                    rootHTTPLogger.error(`Device update property - Property error`, { error: getError(error), deviceSN: this.getSerial(), propertyName: name, propertyValue: value, force: force });
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
        try {
            if ((metadata.key === ParamType.DETECT_MOTION_SENSITIVE || metadata.key === ParamType.DETECT_MODE) && this.isWiredDoorbell()) {
                //TODO: Not perfectly solved, can in certain cases briefly trigger a double event where the last event is the correct one
                const rawSensitivity = this.getRawProperty(ParamType.DETECT_MOTION_SENSITIVE);
                const rawMode = this.getRawProperty(ParamType.DETECT_MODE);

                if (rawSensitivity !== undefined && rawMode !== undefined && this.hasProperty(PropertyName.DeviceMotionDetectionSensitivity)) {
                    const sensitivity = Number.parseInt(rawSensitivity);
                    const mode = Number.parseInt(rawMode);

                    if (mode === 3 && sensitivity === 2) {
                        this.updateProperty(PropertyName.DeviceMotionDetectionSensitivity, 1);
                    } else if (mode === 1 && sensitivity === 1) {
                        this.updateProperty(PropertyName.DeviceMotionDetectionSensitivity, 2);
                    } else if (mode === 1 && sensitivity === 2) {
                        this.updateProperty(PropertyName.DeviceMotionDetectionSensitivity, 3);
                    } else if (mode === 1 && sensitivity === 3) {
                        this.updateProperty(PropertyName.DeviceMotionDetectionSensitivity, 4);
                    } else if (mode === 2 && sensitivity === 1) {
                        this.updateProperty(PropertyName.DeviceMotionDetectionSensitivity, 5);
                    }
                }
            } else if (metadata.name === PropertyName.DeviceWifiRSSI && this.hasProperty(PropertyName.DeviceWifiSignalLevel)) {
                this.updateProperty(PropertyName.DeviceWifiSignalLevel, calculateWifiSignalLevel(this, newValue as number));
            } else if (metadata.name === PropertyName.DeviceCellularRSSI && this.hasProperty(PropertyName.DeviceCellularSignalLevel)) {
                this.updateProperty(PropertyName.DeviceCellularSignalLevel, calculateCellularSignalLevel(newValue as number));
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error(`Device handle property change - error`, { error: getError(error), deviceSN: this.getSerial(), metadata: metadata, oldValue: oldValue, newValue: newValue });
        }
    }

    public updateRawProperty(type: number, value: string, source: SourceType): boolean {
        const parsedValue = ParameterHelper.readValue(this.getStationSerial(), type, value, rootHTTPLogger);
        if (parsedValue !== undefined &&
            ((this.rawProperties[type] !== undefined && this.rawProperties[type].value !== parsedValue && isPrioritySourceType(this.rawProperties[type].source, source)) || this.rawProperties[type] === undefined)) {

            this.rawProperties[type] = {
                value: parsedValue,
                source: source
            };
            if (this.ready)
                this.emit("raw property changed", this, type, this.rawProperties[type].value);

            const metadata = this.getPropertiesMetadata(true);

            for (const property of Object.values(metadata)) {
                if (property.key === type) {
                    try {
                        this.updateProperty(property.name, this.convertRawPropertyValue(property, this.rawProperties[type].value));
                    } catch (err) {
                        const error = ensureError(err);
                        if (error instanceof PropertyNotSupportedError) {
                            rootHTTPLogger.debug("Device update raw property - Property not supported error", { error: getError(error), deviceSN: this.getSerial(), type: type, value: value, source: source });
                        } else {
                            rootHTTPLogger.error("Device update raw property - Property error", { error: getError(error), deviceSN: this.getSerial(), type: type, value: value, source: source });
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
            if (property.key === ParamType.PRIVATE_MODE || property.key === ParamType.OPEN_DEVICE || property.key === CommandType.CMD_DEVS_SWITCH) {
                if ((this.isIndoorCamera() && !this.isIndoorPanAndTiltCameraS350()) || (this.isWiredDoorbell() && !this.isWiredDoorbellT8200X()) || this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8422 || this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8424) {
                    return value !== undefined ? (value === "true" ? true : false) : false;
                }
                return value !== undefined ? (value === "0" ? true : false) : false;
            } else if (property.key === CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE) {
                switch (property.name) {
                    case PropertyName.DeviceNotificationRing: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined ? (Number.parseInt((value as any).notification_ring_onoff) === 1 ? true : false) : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE DeviceNotificationRing Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceNotificationMotion: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined ? (Number.parseInt((value as any).notification_motion_onoff) === 1 ? true : false) : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE DeviceNotificationMotion Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceNotificationType: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return value !== undefined ? Number.parseInt((value as any).notification_style) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE DeviceNotificationType Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        }
                    }
                }
            } else if (property.key === ParamType.DOORBELL_NOTIFICATION_OPEN) {
                try {
                    switch (property.name) {
                        case PropertyName.DeviceNotificationRing:
                            return value !== undefined ? (Number.parseInt((value as any)) === 3 || Number.parseInt((value as any)) === 1 ? true : false) : false;
                        case PropertyName.DeviceNotificationMotion:
                            return value !== undefined ? (Number.parseInt((value as any)) === 3 || Number.parseInt((value as any)) === 2 ? true : false) : false;
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - DOORBELL_NOTIFICATION_OPEN Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return false;
                }
            } else if (property.key === CommandType.CMD_SET_PIRSENSITIVITY) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    if (this.getDeviceType() === DeviceType.CAMERA || this.getDeviceType() === DeviceType.CAMERA_E) {
                        const convertedValue = ((200 - Number.parseInt(value)) / 2) + 1;
                        return convertedValue;
                    } else if (this.isCamera2Product()) {
                        let convertedValue;
                        switch (Number.parseInt(value)) {
                            case 192:
                                convertedValue = 1;
                                break;
                            case 118:
                                convertedValue = 2;
                                break;
                            case 72:
                                convertedValue = 3;
                                break;
                            case 46:
                                convertedValue = 4;
                                break;
                            case 30:
                                convertedValue = 5;
                                break;
                            case 20:
                                convertedValue = 6;
                                break;
                            case 14:
                                convertedValue = 7;
                                break;
                            default:
                                convertedValue = 4;
                                break;
                        }
                        return convertedValue;
                    } else {
                        return value !== undefined ? Number.parseInt(value) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - CMD_SET_PIRSENSITIVITY Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_STARTTIME || property.key === CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_ENDTIME) {
                const tmpBuffer = Buffer.from(value, "hex")
                return `${tmpBuffer.subarray(0, 1).readInt8().toString().padStart(2, "0")}:${tmpBuffer.subarray(1).readInt8().toString().padStart(2, "0")}`;
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    switch (property.name) {
                        case PropertyName.DeviceMotionDetectionSensitivityMode:
                            return value !== undefined && (value as any).model !== undefined ? (value as any).model as number : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityStandard:
                            return value !== undefined && (value as any).model === 0 ? getDistances((value as any).block_list)[0] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityAdvancedA:
                            return value !== undefined && (value as any).model === 1 ? getDistances((value as any).block_list)[0] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityAdvancedB:
                            return value !== undefined && (value as any).model === 1 ? getDistances((value as any).block_list)[1] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityAdvancedC:
                            return value !== undefined && (value as any).model === 1 ? getDistances((value as any).block_list)[2] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityAdvancedD:
                            return value !== undefined && (value as any).model === 1 ? getDistances((value as any).block_list)[3] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityAdvancedE:
                            return value !== undefined && (value as any).model === 1 ? getDistances((value as any).block_list)[4] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityAdvancedF:
                            return value !== undefined && (value as any).model === 1 ? getDistances((value as any).block_list)[5] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityAdvancedG:
                            return value !== undefined && (value as any).model === 1 ? getDistances((value as any).block_list)[6] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        case PropertyName.DeviceMotionDetectionSensitivityAdvancedH:
                            return value !== undefined && (value as any).model === 1 ? getDistances((value as any).block_list)[7] : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error(`Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY ${property.name} Error`, { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE) {
                switch (property.name) {
                    case PropertyName.DeviceLoiteringCustomResponseTimeFrom: {
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any)?.setting?.length !== undefined && (value as any)?.setting?.length > 0 && (value as any)?.setting[0]?.start_hour !== undefined && (value as any)?.setting[0]?.start_min !== undefined) ? `${(value as any)?.setting[0]?.start_hour?.padStart(2, "0")}:${(value as any)?.setting[0]?.start_min?.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseTimeFrom Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponseTimeTo: {
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any)?.setting?.length !== undefined && (value as any)?.setting?.length > 0 && (value as any)?.setting[0]?.end_hour !== undefined && (value as any)?.setting[0]?.end_min !== undefined) ? `${(value as any)?.setting[0]?.end_hour?.padStart(2, "0")}:${(value as any)?.setting[0]?.end_min?.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseTimeTo Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponsePhoneNotification: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any)?.setting[0]?.push_notify === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponsePhoneNotification Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any)?.setting[0]?.homebase_alert === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseHomeBaseNotification Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any)?.setting[0]?.auto_voice_resp === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseAutoVoiceResponse Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return ((value as any)?.setting?.length !== undefined && (value as any)?.setting?.length > 0 && (value as any)?.setting[0]?.auto_voice_id !== undefined) ? (value as any)?.setting[0]?.auto_voice_id : numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseAutoVoiceResponseVoice Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        }
                    }
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH) {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return value !== undefined && (value as any).ai_bottom_switch !== undefined ? (value as any).ai_bottom_switch === 1024 : (booleanProperty.default !== undefined ? booleanProperty.default : false);
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME) {
                const stringProperty = property as PropertyMetadataString;
                try {
                    return ((value as any)?.start_h !== undefined && (value as any)?.start_m !== undefined) ? `${(value as any)?.start_h?.toString().padStart(2, "0")}:${(value as any)?.start_m?.toString().padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return stringProperty.default !== undefined ? stringProperty.default : "";
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE) {
                switch (property.name) {
                    case PropertyName.DeviceRingAutoResponse: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any)?.setting[0]?.active === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponse Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceRingAutoResponseVoiceResponse: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any)?.setting[0]?.active === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponseVoiceResponse Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceRingAutoResponseTimeFrom: {
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any)?.setting?.length !== undefined && (value as any)?.setting?.length > 0 && (value as any)?.setting[0]?.start_hour !== undefined && (value as any)?.setting[0]?.start_min !== undefined) ? `${(value as any)?.setting[0]?.start_hour?.padStart(2, "0")}:${(value as any)?.setting[0]?.start_min?.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponseTimeFrom Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceRingAutoResponseTimeTo: {
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any)?.setting?.length !== undefined && (value as any)?.setting?.length > 0 && (value as any)?.setting[0]?.end_hour !== undefined && (value as any)?.setting[0]?.end_min !== undefined) ? `${(value as any)?.setting[0]?.end_hour?.padStart(2, "0")}:${(value as any)?.setting[0]?.end_min?.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponseTimeTo Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceRingAutoResponseVoiceResponseVoice: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return ((value as any)?.setting?.length !== undefined && (value as any)?.setting?.length > 0 && (value as any)?.setting[0]?.auto_voice_id !== undefined) ? (value as any)?.setting[0]?.auto_voice_id : numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponseVoiceResponseVoice Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        }
                    }
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME) {
                switch (property.name) {
                    case PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom: {
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any)?.start_h !== undefined && (value as any)?.start_m !== undefined) ? `${(value as any)?.start_h?.toString().padStart(2, "0")}:${(value as any)?.start_m?.toString().padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME DeviceDeliveryGuardPackageGuardingActivatedTimeFrom Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo: {
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any)?.end_h !== undefined && (value as any)?.end_m !== undefined) ? `${(value as any)?.end_h?.toString().padStart(2, "0")}:${(value as any)?.end_m?.toString().padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME DeviceDeliveryGuardPackageGuardingActivatedTimeTo Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined && (value as any).radar_wd_distance !== undefined ? (value as any).radar_wd_distance as number : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_TIME) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined && (value as any).radar_wd_time !== undefined ? (value as any).radar_wd_time as number : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_RADAR_WD_TIME Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined && (value as any).auto_voice_id !== undefined ? (value as any).auto_voice_id as number : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_MOTION_SET_LEAVING_REACTIONS) {
                switch (property.name) {
                    case PropertyName.DeviceLeavingReactionStartTime: {
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return (value !== undefined && (value as any).start_hour !== undefined && (value as any).start_min !== undefined) ? `${(value as any).start_hour.padStart(2, "0")}:${(value as any).start_min.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_MOTION_SET_LEAVING_REACTIONS DeviceLeavingReactionStartTime Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceLeavingReactionEndTime: {
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return (value !== undefined && (value as any).end_hour !== undefined && (value as any).end_min !== undefined) ? `${(value as any).end_hour.padStart(2, "0")}:${(value as any).end_min.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_MOTION_SET_LEAVING_REACTIONS DeviceLeavingReactionEndTime Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceLeavingReactionNotification: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined && (value as any).push_notify === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_MOTION_SET_LEAVING_REACTIONS DeviceLeavingReactionNotification Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                }
            } else if (property.key === CommandType.CMD_SET_SNOOZE_MODE) {
                switch (property.name) {
                    case PropertyName.DeviceSnooze: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined && (value as any).snooze_time !== undefined && (value as any).snooze_time !== "" && Number.parseInt((value as any).snooze_time) !== 0 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_SET_SNOOZE_MODE DeviceSnooze Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceSnoozeTime: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return value !== undefined && (value as any).snooze_time !== undefined && (value as any).snooze_time !== "" ? Number.parseInt((value as any).snooze_time) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_SET_SNOOZE_MODE DeviceSnoozeTime Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        }
                    }
                    case PropertyName.DeviceSnoozeStartTime: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return value !== undefined && (value as any).startTime !== undefined ? Number.parseInt((value as any).startTime) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_SET_SNOOZE_MODE DeviceSnoozeTime Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        }
                    }
                    case PropertyName.DeviceSnoozeHomebase: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined && (value as any).homebase_onoff !== undefined ? ((value as any).homebase_onoff === 1 ? true : false) : (booleanProperty.default !== undefined ? booleanProperty.default : false);
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_SET_SNOOZE_MODE DeviceSnoozeHomebase Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceSnoozeMotion: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined && (value as any).motion_notify_onoff !== undefined ? ((value as any).motion_notify_onoff === 1 ? true : false) : (booleanProperty.default !== undefined ? booleanProperty.default : false);
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_SET_SNOOZE_MODE DeviceSnoozeMotion Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceSnoozeChime: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined && (value as any).chime_onoff !== undefined ? ((value as any).chime_onoff === 1 ? true : false) : (booleanProperty.default !== undefined ? booleanProperty.default : false);
                        } catch (err) {
                            const error = ensureError(err);
                            rootHTTPLogger.error("Device convert raw property - CMD_SET_SNOOZE_MODE DeviceSnoozeChime Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                }
            } else if ((
                property.name === PropertyName.DeviceMotionDetectionTypeHuman ||
                property.name === PropertyName.DeviceMotionDetectionTypeHumanRecognition ||
                property.name === PropertyName.DeviceMotionDetectionTypePet ||
                property.name === PropertyName.DeviceMotionDetectionTypeVehicle ||
                property.name === PropertyName.DeviceMotionDetectionTypeAllOtherMotions
            ) && this.getStationSerial().startsWith("T8030")) {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return isHB3DetectionModeEnabled(Number.parseInt(value), property.name === PropertyName.DeviceMotionDetectionTypeHuman ? HB3DetectionTypes.HUMAN_DETECTION : property.name === PropertyName.DeviceMotionDetectionTypeHumanRecognition ? HB3DetectionTypes.HUMAN_RECOGNITION : property.name === PropertyName.DeviceMotionDetectionTypePet ? HB3DetectionTypes.PET_DETECTION : property.name === PropertyName.DeviceMotionDetectionTypeVehicle ? HB3DetectionTypes.VEHICLE_DETECTION : HB3DetectionTypes.ALL_OTHER_MOTION);
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - HB3 motion detection type Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if ((
                property.name === PropertyName.DeviceMotionDetectionTypeHuman ||
                property.name === PropertyName.DeviceMotionDetectionTypeVehicle ||
                property.name === PropertyName.DeviceMotionDetectionTypeAllOtherMotions
            ) && this.isOutdoorPanAndTiltCamera()) {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return isT8170DetectionModeEnabled(Number.parseInt(value), property.name === PropertyName.DeviceMotionDetectionTypeHuman ? T8170DetectionTypes.HUMAN_DETECTION : property.name === PropertyName.DeviceMotionDetectionTypeVehicle ? T8170DetectionTypes.VEHICLE_DETECTION : T8170DetectionTypes.ALL_OTHER_MOTION);
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - T8170 motion detection type Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if ((
                property.name === PropertyName.DeviceMotionDetectionTypeHuman ||
                property.name === PropertyName.DeviceMotionDetectionTypeAllOtherMotions
            ) && this.isSoloCameras()) {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return property.name === PropertyName.DeviceMotionDetectionTypeHuman ? SoloCameraDetectionTypes.HUMAN_DETECTION === Number.parseInt(value) ? true : false : SoloCameraDetectionTypes.ALL_OTHER_MOTION === Number.parseInt(value) ? true : false;
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - SoloCamera motion detection type Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if ((
                property.name === PropertyName.DeviceNotificationAllOtherMotion ||
                property.name === PropertyName.DeviceNotificationPerson ||
                property.name === PropertyName.DeviceNotificationPet ||
                property.name === PropertyName.DeviceNotificationCrying ||
                property.name === PropertyName.DeviceNotificationAllSound
            ) && this.isIndoorPanAndTiltCameraS350()) {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return isIndoorNotitficationEnabled(Number.parseInt(value), property.name === PropertyName.DeviceNotificationAllOtherMotion ? IndoorS350NotificationTypes.ALL_OTHER_MOTION : property.name === PropertyName.DeviceNotificationPerson ? IndoorS350NotificationTypes.HUMAN : property.name === PropertyName.DeviceNotificationPet ? IndoorS350NotificationTypes.PET : property.name === PropertyName.DeviceNotificationCrying ? IndoorS350NotificationTypes.CRYING : IndoorS350NotificationTypes.ALL_SOUND);
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - IndoorPanAndTiltCameraS350 notification Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if ((
                property.name === PropertyName.DeviceNotificationAllOtherMotion ||
                property.name === PropertyName.DeviceNotificationPerson ||
                property.name === PropertyName.DeviceNotificationPet ||
                property.name === PropertyName.DeviceNotificationVehicle
            ) && this.isFloodLightT8425()) {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return isFloodlightT8425NotitficationEnabled(Number.parseInt(value), property.name === PropertyName.DeviceNotificationAllOtherMotion ? FloodlightT8425NotificationTypes.ALL_OTHER_MOTION : property.name === PropertyName.DeviceNotificationPerson ? FloodlightT8425NotificationTypes.HUMAN : property.name === PropertyName.DeviceNotificationPet ? FloodlightT8425NotificationTypes.PET : FloodlightT8425NotificationTypes.VEHICLE);
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - FloodLightT8425 notification Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if (property.key === CommandType.CELLULAR_INFO) {
                switch (property.name) {
                    case PropertyName.DeviceCellularSignal: {
                        const stringProperty = property as PropertyMetadataString;
                        return value !== undefined && (value as any).Signal !== undefined ? String((value as any).Signal) : (stringProperty.default !== undefined ? stringProperty.default : "");
                    }
                    case PropertyName.DeviceCellularBand: {
                        const stringProperty = property as PropertyMetadataString;
                        return value !== undefined && (value as any).band !== undefined ? String((value as any).band) : (stringProperty.default !== undefined ? stringProperty.default : "");
                    }
                    case PropertyName.DeviceCellularIMEI: {
                        const stringProperty = property as PropertyMetadataString;
                        return value !== undefined && (value as any).imei !== undefined ? String((value as any).imei) : (stringProperty.default !== undefined ? stringProperty.default : "");
                    }
                    case PropertyName.DeviceCellularICCID: {
                        const stringProperty = property as PropertyMetadataString;
                        return value !== undefined && (value as any).iccid !== undefined ? String((value as any).iccid) : (stringProperty.default !== undefined ? stringProperty.default : "");
                    }
                }
            } else if (property.key === CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY2) {
                const numericProperty = property as PropertyMetadataNumeric;
                const quality: VideoStreamingRecordingQuality = value as unknown as VideoStreamingRecordingQuality;
                let mode = quality.mode_1;
                if (quality.cur_mode === 0) {
                    mode = quality.mode_0;
                }
                try {
                    return value !== undefined && mode !== undefined && mode.quality !== undefined ? mode.quality : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - CMD_BAT_DOORBELL_VIDEO_QUALITY2 Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_BAT_DOORBELL_RECORD_QUALITY2) {
                const numericProperty = property as PropertyMetadataNumeric;
                const quality: VideoStreamingRecordingQuality = value as unknown as VideoStreamingRecordingQuality;
                let mode = quality.mode_1;
                if (quality.cur_mode === 0) {
                    mode = quality.mode_0;
                }
                try {
                    return value !== undefined && mode !== undefined && mode.quality !== undefined ? mode.quality : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.error("Device convert raw property - CMD_BAT_DOORBELL_RECORD_QUALITY2 Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_DEV_RECORD_AUTOSTOP && this.isCameraProfessional247()) {
                return value !== undefined ? (value === "0" ? true : false) : false;
            } else if (property.key === CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425) {
                const currentValue = value as unknown as FloodlightDetectionRangeT8425Property;
                switch (property.name) {
                    case PropertyName.DeviceMotionDetectionRange: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        return currentValue !== undefined && currentValue.cur_mode !== undefined ? currentValue.cur_mode : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                    case PropertyName.DeviceMotionDetectionRangeStandardSensitivity: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        return currentValue !== undefined && currentValue.mode0 !== undefined && Array.isArray(currentValue.mode0) && currentValue.mode0.length > 0 && currentValue.mode0.find((element) => element.id === 1) !== undefined ? currentValue.mode0.find((element) => element.id === 1)!.sst : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                    case PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        return currentValue !== undefined && currentValue.mode1 !== undefined && Array.isArray(currentValue.mode1) && currentValue.mode1.length > 0 && currentValue.mode1.find((element) => element.id === 1) !== undefined ? currentValue.mode1.find((element) => element.id === 1)!.sst : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                    case PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        return currentValue !== undefined && currentValue.mode1 !== undefined && Array.isArray(currentValue.mode1) && currentValue.mode1.length > 0 && currentValue.mode1.find((element) => element.id === 2) !== undefined ? currentValue.mode1.find((element) => element.id === 2)!.sst : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                    case PropertyName.DeviceMotionDetectionTestMode: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        return currentValue !== undefined && currentValue.test_mode !== undefined ? currentValue.test_mode === 1 ? true : false : booleanProperty.default !== undefined ? booleanProperty.default : false;
                    }
                }
            } else if (property.key === CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH_T8425) {
                const currentValue = value as unknown as FloodlightLightSettingsBrightnessScheduleT8425Property;
                const numericProperty = property as PropertyMetadataNumeric;
                return currentValue !== undefined && currentValue.brightness !== undefined ? currentValue.brightness : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
            } else if (property.key === CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425) {
                const currentValue = value as unknown as FloodlightLightSettingsMotionT8425Property;
                switch (property.name) {
                    case PropertyName.DeviceLightSettingsBrightnessMotion: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        return currentValue !== undefined && currentValue.brightness !== undefined ? currentValue.brightness : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                    case PropertyName.DeviceLightSettingsMotionActivationMode: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        return currentValue !== undefined && currentValue.mode !== undefined ? currentValue.mode : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                    case PropertyName.DeviceLightSettingsMotionTriggeredTimer: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        return currentValue !== undefined && currentValue.time !== undefined ? currentValue.time : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                    }
                    case PropertyName.DeviceLightSettingsMotionTriggered: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        return currentValue !== undefined && currentValue.enable !== undefined ? currentValue.enable === 1 ? true : false : booleanProperty.default !== undefined ? booleanProperty.default : false;
                    }
                }
            } else if (property.key === CommandType.SUB1G_REP_UNPLUG_POWER_LINE) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    const rawCharging = Number.parseInt(value);
                    return rawCharging !== undefined ? (isCharging(rawCharging) ? 1 : 0) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.warn("Device convert raw property - SUB1G_REP_UNPLUG_POWER_LINE Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.name === PropertyName.Model && this.isLockWifiT8510P()) {
                return "T8510P";
            } else if (property.type === "number") {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined ? Number.parseInt(value) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.warn("Device convert raw property - PropertyMetadataNumeric Convert Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.type === "boolean") {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return value !== undefined ? (typeof value === "number" ? !!value : (value === "1" || value.toLowerCase() === "true" ? true : false)) : (booleanProperty.default !== undefined ? booleanProperty.default : false);
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.warn("Device convert raw property - PropertyMetadataBoolean Convert Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
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
            rootHTTPLogger.error("Device convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
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
            ...DeviceProperties[this.getDeviceType()]
        };
        if (this.isFloodLightT8420X()) {
            metadata = {
                ...FloodlightT8420XDeviceProperties
            };
        } else if (this.isWiredDoorbellT8200X()) {
            metadata = {
                ...WiredDoorbellT8200XDeviceProperties
            };
        } else if (this.isLockWifiT8510P()) {
            metadata = {
                ...LockT8510PDeviceProperties
            };
            (metadata[PropertyName.Type] as PropertyMetadataNumeric).states![this.getDeviceType()] = "Smart Lock S230 (T8510P)";
        } else if (this.isLockWifiT8520P()) {
            metadata = {
                ...LockT8520PDeviceProperties
            };
            (metadata[PropertyName.Type] as PropertyMetadataNumeric).states![this.getDeviceType()] = "Smart Lock S231 (T8520P)";
        } else if (this.isSoloCameras() && Station.isStationHomeBase3BySn(this.getStationSerial())) {
            const newMetadata = {
                ...metadata
            };

            newMetadata[PropertyName.DeviceAudioRecording] = DeviceAudioRecordingProperty;
            newMetadata[PropertyName.DeviceMotionDetectionSensitivity] = DeviceMotionDetectionSensitivityCamera2Property;
            newMetadata[PropertyName.DeviceVideoRecordingQuality] = DeviceVideoRecordingQualitySoloCamerasHB3Property;
            newMetadata[PropertyName.DeviceNotificationType] = DeviceNotificationTypeProperty;
            newMetadata[PropertyName.DeviceMotionDetection] = DeviceMotionDetectionProperty;

            metadata = newMetadata;
        } else if (this.isIndoorPanAndTiltCameraS350() && Station.isStationHomeBase3BySn(this.getStationSerial())) {
            const newMetadata = {
                ...metadata
            };

            newMetadata[PropertyName.DeviceMotionDetection] = DeviceMotionDetectionProperty;

            metadata = newMetadata;
        }
        if (Station.isStationHomeBase3BySn(this.getStationSerial()) && (metadata[PropertyName.DeviceMotionDetectionType] !== undefined || metadata[PropertyName.DeviceMotionDetectionTypeAllOtherMotions] !== undefined) && this.isCamera()) {
            const newMetadata = {
                ...metadata
            };
            delete newMetadata[PropertyName.DeviceMotionDetectionType];
            delete newMetadata[PropertyName.DeviceLastChargingDays];
            delete newMetadata[PropertyName.DeviceLastChargingFalseEvents];
            delete newMetadata[PropertyName.DeviceLastChargingRecordedEvents];
            delete newMetadata[PropertyName.DeviceLastChargingTotalEvents];
            delete newMetadata[PropertyName.DeviceBatteryUsageLastWeek];
            newMetadata[PropertyName.DeviceMotionDetectionTypeHuman] = DeviceMotionHB3DetectionTypeHumanProperty;
            newMetadata[PropertyName.DeviceMotionDetectionTypeHumanRecognition] = DeviceMotionHB3DetectionTypeHumanRecognitionProperty;
            newMetadata[PropertyName.DeviceMotionDetectionTypePet] = DeviceMotionHB3DetectionTypePetProperty;
            newMetadata[PropertyName.DeviceMotionDetectionTypeVehicle] = DeviceMotionHB3DetectionTypeVehicleProperty;
            newMetadata[PropertyName.DeviceMotionDetectionTypeAllOtherMotions] = DeviceMotionHB3DetectionTypeAllOtherMotionsProperty;
            newMetadata[PropertyName.DevicePersonDetected] = DevicePersonDetectedProperty;
            newMetadata[PropertyName.DeviceMotionDetected] = DeviceMotionDetectedProperty;
            newMetadata[PropertyName.DevicePetDetected] = DevicePetDetectedProperty;
            newMetadata[PropertyName.DeviceSoundDetected] = DeviceSoundDetectedProperty;
            newMetadata[PropertyName.DeviceCryingDetected] = DeviceCryingDetectedProperty;
            newMetadata[PropertyName.DeviceIdentityPersonDetected] = DeviceIdentityPersonDetectedProperty;
            newMetadata[PropertyName.DeviceStrangerPersonDetected] = DeviceStrangerPersonDetectedProperty;
            newMetadata[PropertyName.DeviceVehicleDetected] = DeviceVehicleDetectedProperty;
            newMetadata[PropertyName.DeviceDogDetected] = DeviceDogDetectedProperty;
            newMetadata[PropertyName.DeviceDogLickDetected] = DeviceDogLickDetectedProperty;
            newMetadata[PropertyName.DeviceDogPoopDetected] = DeviceDogPoopDetectedProperty;
            newMetadata[PropertyName.DeviceDetectionStatisticsWorkingDays] = DeviceDetectionStatisticsWorkingDaysProperty;
            newMetadata[PropertyName.DeviceDetectionStatisticsDetectedEvents] = DeviceDetectionStatisticsDetectedEventsProperty;
            newMetadata[PropertyName.DeviceDetectionStatisticsRecordedEvents] = DeviceDetectionStatisticsRecordedEventsProperty;

            if (!this.isSmartDrop()) {
                //TODO: Check with future devices if this property overriding is correct (for example with indoor cameras etc.)
                newMetadata[PropertyName.DeviceEnabled] = DeviceEnabledSoloProperty;
            }

            metadata = newMetadata;
        } else if (Object.keys(metadata).length === 0) {
            metadata = {
                ...GenericDeviceProperties
            };
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
        const commands = DeviceCommands[this.getDeviceType()];
        if (commands === undefined)
            return [];
        return commands;
    }

    public hasCommand(name: CommandName): boolean {
        return this.getCommands().includes(name);
    }

    public processPushNotification(_station: Station, _message: PushMessage, _eventDurationSeconds: number): void {
        // Nothing to do
    }

    public setCustomPropertyValue(name: string, value: PropertyValue): void {
        const metadata = this.getPropertyMetadata(name);
        if (typeof metadata.key === "string" && metadata.key.startsWith("custom_")) {
            this.updateProperty(name, value);
        }
    }

    public destroy(): void {
        this.eventTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.eventTimeouts.clear();
        this.pictureEventTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.pictureEventTimeouts.clear();
    }

    protected clearEventTimeout(eventType: DeviceEvent): void {
        const timeout = this.eventTimeouts.get(eventType);
        if (timeout !== undefined) {
            clearTimeout(timeout);
            this.eventTimeouts.delete(eventType);
        }
    }

    static isSupported(type: number): boolean {
        return DeviceProperties[type] !== undefined ? true : false;
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
            type == DeviceType.BATTERY_DOORBELL_PLUS ||
            type == DeviceType.BATTERY_DOORBELL_PLUS_E340 ||
            type == DeviceType.DOORBELL_SOLO ||
            type == DeviceType.CAMERA2C_PRO ||
            type == DeviceType.CAMERA2_PRO ||
            type == DeviceType.CAMERA3 ||
            type == DeviceType.CAMERA3C ||
            type == DeviceType.PROFESSIONAL_247 ||
            type == DeviceType.INDOOR_CAMERA_1080 ||
            type == DeviceType.INDOOR_PT_CAMERA_1080 ||
            type == DeviceType.OUTDOOR_PT_CAMERA ||
            type == DeviceType.SOLO_CAMERA ||
            type == DeviceType.SOLO_CAMERA_PRO ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_1080 ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_2K ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR ||
            type == DeviceType.SOLO_CAMERA_SOLAR ||
            type == DeviceType.SOLO_CAMERA_C210 ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_1080P ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_2K ||
            type == DeviceType.INDOOR_COST_DOWN_CAMERA ||
            type == DeviceType.FLOODLIGHT_CAMERA_8422 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8423 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8424 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8425 ||
            type == DeviceType.WALL_LIGHT_CAM ||
            type == DeviceType.WALL_LIGHT_CAM_81A0 ||
            type == DeviceType.CAMERA_GARAGE_T8453_COMMON ||
            type == DeviceType.CAMERA_GARAGE_T8453 ||
            type == DeviceType.CAMERA_GARAGE_T8452 ||
            type == DeviceType.CAMERA_FG ||
            type == DeviceType.INDOOR_PT_CAMERA_S350 ||
            type == DeviceType.SMART_DROP)
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
            type == DeviceType.BATTERY_DOORBELL_PLUS ||
            type == DeviceType.BATTERY_DOORBELL_PLUS_E340 ||
            type == DeviceType.CAMERA2C_PRO ||
            type == DeviceType.CAMERA2_PRO ||
            type == DeviceType.CAMERA3 ||
            type == DeviceType.CAMERA3C ||
            type == DeviceType.SOLO_CAMERA ||
            type == DeviceType.SOLO_CAMERA_PRO ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_1080 ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_2K ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR ||
            type == DeviceType.SOLO_CAMERA_SOLAR ||
            type == DeviceType.SOLO_CAMERA_C210 ||
            type == DeviceType.LOCK_WIFI ||
            type == DeviceType.LOCK_WIFI_NO_FINGER ||
            type == DeviceType.LOCK_8503 ||
            type == DeviceType.LOCK_8504 ||
            type == DeviceType.LOCK_8530 ||
            type == DeviceType.LOCK_8592 ||
            type == DeviceType.LOCK_85A3 ||
            type == DeviceType.LOCK_8506 ||
            type == DeviceType.LOCK_8502 ||
            type == DeviceType.SMART_SAFE_7400 ||
            type == DeviceType.SMART_SAFE_7401 ||
            type == DeviceType.SMART_SAFE_7402 ||
            type == DeviceType.SMART_SAFE_7403 ||
            type == DeviceType.CAMERA_FG ||
            type == DeviceType.WALL_LIGHT_CAM_81A0 ||
            type == DeviceType.SMART_DROP ||
            type == DeviceType.OUTDOOR_PT_CAMERA)
            //TODO: Add other battery devices
            return true;
        return false;
    }

    static isStation(type: number): boolean {
        if (type == DeviceType.STATION || type === DeviceType.MINIBASE_CHIME)
            return true;
        return false;
    }

    static isCamera1(type: number): boolean {
        return DeviceType.CAMERA == type;
    }

    static isCameraE(type: number): boolean {
        return DeviceType.CAMERA_E == type;
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
            type == DeviceType.BATTERY_DOORBELL_2 ||
            type == DeviceType.BATTERY_DOORBELL_PLUS ||
            type == DeviceType.BATTERY_DOORBELL_PLUS_E340 ||
            type == DeviceType.DOORBELL_SOLO)
            return true;
        return false;
    }

    static isWiredDoorbell(type: number): boolean {
        if (type == DeviceType.DOORBELL)
            return true;
        return false;
    }

    static isWiredDoorbellT8200X(type: number, serialnumber: string): boolean {
        if (type == DeviceType.DOORBELL && serialnumber.startsWith("T8200") && serialnumber.length > 7 && serialnumber.charAt(6) === "6")
            return true;
        return false;
    }

    static isWiredDoorbellDual(type: number): boolean {
        if (type == DeviceType.DOORBELL_SOLO)
            return true;
        return false;
    }

    static isIndoorCamera(type: number): boolean {
        if (type == DeviceType.INDOOR_CAMERA ||
            type == DeviceType.INDOOR_CAMERA_1080 ||
            type == DeviceType.INDOOR_PT_CAMERA ||
            type == DeviceType.INDOOR_PT_CAMERA_1080 ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_1080P ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_2K ||
            type == DeviceType.INDOOR_COST_DOWN_CAMERA ||
            type == DeviceType.INDOOR_PT_CAMERA_S350)
            return true;
        return false;
    }

    static isPanAndTiltCamera(type: number): boolean {
        if (type == DeviceType.INDOOR_PT_CAMERA ||
            type == DeviceType.INDOOR_PT_CAMERA_1080 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8423 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8425 ||
            type == DeviceType.INDOOR_COST_DOWN_CAMERA ||
            type == DeviceType.OUTDOOR_PT_CAMERA ||
            type == DeviceType.INDOOR_PT_CAMERA_S350)
            return true;
        return false;
    }

    static isOutdoorPanAndTiltCamera(type: number): boolean {
        if (type == DeviceType.OUTDOOR_PT_CAMERA)
            return true;
        return false;
    }

    static isIndoorPanAndTiltCameraS350(type: number): boolean {
        if (type == DeviceType.INDOOR_PT_CAMERA_S350)
            return true;
        return false;
    }

    static isFloodLight(type: number): boolean {
        if (type == DeviceType.FLOODLIGHT ||
            type == DeviceType.FLOODLIGHT_CAMERA_8422 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8423 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8424 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8425)
            return true;
        return false;
    }

    static isFloodLightT8420X(type: number, serialnumber: string): boolean {
        if (type == DeviceType.FLOODLIGHT && serialnumber.startsWith("T8420") && serialnumber.length > 7 && serialnumber.charAt(6) === "6")
            return true;
        return false;
    }

    static isFloodLightT8425(type: number): boolean {
        if (type == DeviceType.FLOODLIGHT_CAMERA_8425)
            return true;
        return false;
    }

    static isWallLightCam(type: number): boolean {
        if (type == DeviceType.WALL_LIGHT_CAM || type == DeviceType.WALL_LIGHT_CAM_81A0)
            return true;
        return false;
    }

    static isLock(type: number): boolean {
        return Device.isLockBle(type) ||
            Device.isLockWifi(type, "") ||
            Device.isLockBleNoFinger(type) ||
            Device.isLockWifiNoFinger(type) ||
            Device.isLockWifiR10(type) ||
            Device.isLockWifiR20(type) ||
            Device.isLockWifiVideo(type) ||
            Device.isLockWifiT8506(type) ||
            Device.isLockWifiT8502(type);
    }

    static isLockKeypad(type: number): boolean {
        return Device.isLockWifiR10Keypad(type) || Device.isLockWifiR20Keypad(type);
    }

    static isLockBle(type: number): boolean {
        return DeviceType.LOCK_BLE == type;
    }

    static isLockBleNoFinger(type: number): boolean {
        return DeviceType.LOCK_BLE_NO_FINGER == type;
    }

    static isLockWifi(type: number, serialnumber: string): boolean {
        return DeviceType.LOCK_WIFI == type && !Device.isLockWifiT8510P(type, serialnumber) && !Device.isLockWifiT8520P(type, serialnumber);
    }

    static isLockWifiNoFinger(type: number): boolean {
        return DeviceType.LOCK_WIFI_NO_FINGER == type;
    }

    static isLockWifiR10(type: number): boolean {
        return DeviceType.LOCK_8503 == type;
    }

    static isLockWifiR20(type: number): boolean {
        return DeviceType.LOCK_8504 == type /*|| DeviceType.LOCK_8592 == type*/;
    }

    static isLockWifiVideo(type: number): boolean {
        return DeviceType.LOCK_8530 == type;
    }

    static isLockWifiR10Keypad(type: number): boolean {
        return DeviceType.LOCK_85A3 == type;
    }

    static isLockWifiR20Keypad(type: number): boolean {
        return DeviceType.LOCK_8592 == type;
    }

    static isLockWifiT8506(type: number): boolean {
        return DeviceType.LOCK_8506 == type;
    }

    static isLockWifiT8502(type: number): boolean {
        return DeviceType.LOCK_8502 == type;
    }

    static isLockWifiT8510P(type: number, serialnumber: string): boolean {
        if (type == DeviceType.LOCK_WIFI && serialnumber.startsWith("T8520") && serialnumber.length > 6 && serialnumber.charAt(6) === "8")
            return true;
        return false;
    }

    static isLockWifiT8520P(type: number, serialnumber: string): boolean {
        if (type == DeviceType.LOCK_WIFI && serialnumber.startsWith("T8520") && serialnumber.length > 6 && serialnumber.charAt(6) === "9")
            return true;
        return false;
    }

    static isBatteryDoorbell1(type: number): boolean {
        return DeviceType.BATTERY_DOORBELL == type;
    }

    static isBatteryDoorbell2(type: number): boolean {
        return DeviceType.BATTERY_DOORBELL_2 == type;
    }

    static isBatteryDoorbellDual(type: number): boolean {
        return DeviceType.BATTERY_DOORBELL_PLUS == type;
    }

    static isBatteryDoorbellDualE340(type: number): boolean {
        return DeviceType.BATTERY_DOORBELL_PLUS_E340 == type;
    }

    static isDoorbellDual(type: number): boolean {
        return DeviceType.DOORBELL_SOLO == type;
    }

    static isBatteryDoorbell(type: number): boolean {
        if (type == DeviceType.BATTERY_DOORBELL ||
            type == DeviceType.BATTERY_DOORBELL_2 ||
            type == DeviceType.BATTERY_DOORBELL_PLUS ||
            type == DeviceType.BATTERY_DOORBELL_PLUS_E340)
            return true;
        return false;
    }

    static isSoloCamera(type: number): boolean {
        return DeviceType.SOLO_CAMERA == type;
    }

    static isSoloCameraPro(type: number): boolean {
        return DeviceType.SOLO_CAMERA_PRO == type;
    }

    static isSoloCameraSpotlight1080(type: number): boolean {
        return DeviceType.SOLO_CAMERA_SPOTLIGHT_1080 == type;
    }

    static isSoloCameraSpotlight2k(type: number): boolean {
        return DeviceType.SOLO_CAMERA_SPOTLIGHT_2K == type;
    }

    static isSoloCameraSpotlightSolar(type: number): boolean {
        return DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR == type;
    }

    static isSoloCameraSolar(type: number): boolean {
        return DeviceType.SOLO_CAMERA_SOLAR == type;
    }

    static isSoloCameraC210(type: number): boolean {
        return DeviceType.SOLO_CAMERA_C210 == type;
    }

    static isSoloCameras(type: number): boolean {
        return Device.isSoloCamera(type) ||
            Device.isSoloCameraPro(type) ||
            Device.isSoloCameraSpotlight1080(type) ||
            Device.isSoloCameraSpotlight2k(type) ||
            Device.isSoloCameraSpotlightSolar(type) ||
            Device.isOutdoorPanAndTiltCamera(type) ||
            Device.isSoloCameraSolar(type) ||
            Device.isSoloCameraC210(type);
    }

    static isStarlight4GLTE(type: number): boolean {
        return DeviceType.CAMERA_FG == type;
    }

    static isIndoorOutdoorCamera1080p(type: number): boolean {
        return DeviceType.INDOOR_OUTDOOR_CAMERA_1080P == type;
    }

    static isIndoorOutdoorCamera1080pNoLight(type: number): boolean {
        return DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT == type;
    }

    static isIndoorOutdoorCamera2k(type: number): boolean {
        return DeviceType.INDOOR_OUTDOOR_CAMERA_2K == type;
    }

    static isIndoorCamMini(type: number): boolean {
        return DeviceType.INDOOR_COST_DOWN_CAMERA == type;
    }

    static isCamera1Product(type: number): boolean {
        return Device.isCamera1(type) || Device.isCameraE(type);
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

    static isCamera3(type: number): boolean {
        return DeviceType.CAMERA3 == type;
    }

    static isCamera3C(type: number): boolean {
        return DeviceType.CAMERA3C == type;
    }

    static isCameraProfessional247(type: number): boolean {
        // T8600 - E330
        return DeviceType.PROFESSIONAL_247 == type;
    }

    static isCamera3Product(type: number): boolean {
        return Device.isCamera3(type) || Device.isCamera3C(type) || Device.isCameraProfessional247(type);
    }

    static isEntrySensor(type: number): boolean {
        //T8900
        return DeviceType.SENSOR == type;
    }

    static isMotionSensor(type: number): boolean {
        return DeviceType.MOTION_SENSOR == type;
    }

    static isSmartDrop(type: number): boolean {
        return DeviceType.SMART_DROP == type;
    }

    static isSmartSafe(type: number): boolean {
        if (type == DeviceType.SMART_SAFE_7400 ||
            type == DeviceType.SMART_SAFE_7401 ||
            type == DeviceType.SMART_SAFE_7402 ||
            type == DeviceType.SMART_SAFE_7403)
            return true;
        return false;
    }

    static isGarageCamera(type: number): boolean {
        if (type == DeviceType.CAMERA_GARAGE_T8452 ||
            type == DeviceType.CAMERA_GARAGE_T8453 ||
            type == DeviceType.CAMERA_GARAGE_T8453_COMMON)
            return true;
        return false;
    }

    static isIntegratedDeviceBySn(sn: string): boolean {
        //TODO: Update this implementation!
        return sn.startsWith("T8420") ||
            sn.startsWith("T820") ||
            sn.startsWith("T8410") ||
            sn.startsWith("T8400") ||
            sn.startsWith("T8401") ||
            sn.startsWith("T8411") ||
            sn.startsWith("T8414") ||
            sn.startsWith("T8130") ||
            sn.startsWith("T8131") ||
            sn.startsWith("T8422") ||
            sn.startsWith("T8423") ||
            sn.startsWith("T8424") ||
            sn.startsWith("T8440") ||
            sn.startsWith("T8441") ||
            sn.startsWith("T8442");
    }

    static isSoloCameraBySn(sn: string): boolean {
        return sn.startsWith("T8130") ||
            sn.startsWith("T8131") ||
            sn.startsWith("T8122") ||
            sn.startsWith("T8123") ||
            sn.startsWith("T8124") ||
            sn.startsWith("T8134");
    }

    static isSmartDropBySn(sn: string): boolean {
        return sn.startsWith("T8790");
    }

    static isLockBySn(sn: string): boolean {
        return sn.startsWith("T8510") ||
            sn.startsWith("T8520") ||
            sn.startsWith("T8500") ||
            sn.startsWith("T8501") ||
            sn.startsWith("T8503") ||
            sn.startsWith("T8502") ||
            sn.startsWith("T8504") ||
            sn.startsWith("T8506") ||
            sn.startsWith("T8530");
    }

    static isGarageCameraBySn(sn: string): boolean {
        return sn.startsWith("T8453") ||
            sn.startsWith("T8452");
    }

    static isFloodlightBySn(sn: string): boolean {
        return sn.startsWith("T8420") ||
            sn.startsWith("T8422") ||
            sn.startsWith("T8423") ||
            sn.startsWith("T8424");
        //(sn.startsWith("T8420") && sn.length > 7 && sn[6] == "6");
    }

    static isIndoorCameraBySn(sn: string): boolean {
        return sn.startsWith("T8410") ||
            sn.startsWith("T8400") ||
            sn.startsWith("T8401") ||
            sn.startsWith("T8411") ||
            sn.startsWith("T8440") ||
            sn.startsWith("T8441") ||
            sn.startsWith("T8442") ||
            sn.startsWith("T8414");
    }

    static is4GCameraBySn(sn: string): boolean {
        return sn.startsWith("T8150") ||
            sn.startsWith("T8151") ||
            sn.startsWith("T8152") ||
            sn.startsWith("T8153");
    }

    static isSmartSafeBySn(sn: string): boolean {
        return sn.startsWith("T7400") ||
            sn.startsWith("T7401") ||
            sn.startsWith("T7402");
    }

    static isSmartTrackCard(type: number): boolean {
        if (type == DeviceType.SMART_TRACK_CARD)
            return true;
        return false;
    }

    static isSmartTrackLink(type: number): boolean {
        if (type == DeviceType.SMART_TRACK_LINK)
            return true;
        return false;
    }

    static isSmartTrack(type: number): boolean {
        if (type == DeviceType.SMART_TRACK_LINK ||
            type == DeviceType.SMART_TRACK_CARD)
            return true;
        return false;
    }

    public isCamera(): boolean {
        return Device.isCamera(this.rawDevice.device_type);
    }

    public isFloodLight(): boolean {
        return Device.isFloodLight(this.rawDevice.device_type);
    }

    public isFloodLightT8420X(): boolean {
        return Device.isFloodLightT8420X(this.rawDevice.device_type, this.rawDevice.device_sn);
    }

    public isFloodLightT8425(): boolean {
        return Device.isFloodLightT8425(this.rawDevice.device_type);
    }

    public isWallLightCam(): boolean {
        return Device.isWallLightCam(this.rawDevice.device_type);
    }

    public isDoorbell(): boolean {
        return Device.isDoorbell(this.rawDevice.device_type);
    }

    public isWiredDoorbell(): boolean {
        return Device.isWiredDoorbell(this.rawDevice.device_type);
    }

    public isWiredDoorbellT8200X(): boolean {
        return Device.isWiredDoorbellT8200X(this.rawDevice.device_type, this.rawDevice.device_sn);
    }

    public isWiredDoorbellDual(): boolean {
        return Device.isWiredDoorbellDual(this.rawDevice.device_type);
    }

    public isLock(): boolean {
        return Device.isLock(this.rawDevice.device_type);
    }

    public isLockKeypad(): boolean {
        return Device.isLockKeypad(this.rawDevice.device_type);
    }

    public isLockBle(): boolean {
        return Device.isLockBle(this.rawDevice.device_type);
    }

    public isLockBleNoFinger(): boolean {
        return Device.isLockBleNoFinger(this.rawDevice.device_type);
    }

    public isLockWifi(): boolean {
        return Device.isLockWifi(this.rawDevice.device_type, this.rawDevice.device_sn);
    }

    public isLockWifiNoFinger(): boolean {
        return Device.isLockWifiNoFinger(this.rawDevice.device_type);
    }

    public isLockWifiR10(): boolean {
        return Device.isLockWifiR10(this.rawDevice.device_type);
    }

    public isLockWifiR20(): boolean {
        return Device.isLockWifiR20(this.rawDevice.device_type);
    }

    public isLockWifiVideo(): boolean {
        return Device.isLockWifiVideo(this.rawDevice.device_type);
    }

    public isLockWifiR10Keypad(): boolean {
        return Device.isLockWifiR10Keypad(this.rawDevice.device_type);
    }

    public isLockWifiR20Keypad(): boolean {
        return Device.isLockWifiR20Keypad(this.rawDevice.device_type);
    }

    public isLockWifiT8506(): boolean {
        return Device.isLockWifiT8506(this.rawDevice.device_type);
    }

    public isLockWifiT8502(): boolean {
        return Device.isLockWifiT8502(this.rawDevice.device_type);
    }

    public isLockWifiT8510P(): boolean {
        return Device.isLockWifiT8510P(this.rawDevice.device_type, this.rawDevice.device_sn);
    }

    public isLockWifiT8520P(): boolean {
        return Device.isLockWifiT8520P(this.rawDevice.device_type, this.rawDevice.device_sn);
    }

    public isBatteryDoorbell1(): boolean {
        return Device.isBatteryDoorbell1(this.rawDevice.device_type);
    }

    public isBatteryDoorbell2(): boolean {
        return Device.isBatteryDoorbell2(this.rawDevice.device_type);
    }

    public isBatteryDoorbellDual(): boolean {
        return Device.isBatteryDoorbellDual(this.rawDevice.device_type);
    }

    public isBatteryDoorbellDualE340(): boolean {
        return Device.isBatteryDoorbellDualE340(this.rawDevice.device_type);
    }

    public isDoorbellDual(): boolean {
        return Device.isDoorbellDual(this.rawDevice.device_type);
    }

    public isBatteryDoorbell(): boolean {
        return Device.isBatteryDoorbell(this.rawDevice.device_type);
    }

    public isSoloCamera(): boolean {
        return Device.isSoloCamera(this.rawDevice.device_type);
    }

    public isSoloCameraPro(): boolean {
        return Device.isSoloCameraPro(this.rawDevice.device_type);
    }

    public isSoloCameraSpotlight1080(): boolean {
        return Device.isSoloCameraSpotlight1080(this.rawDevice.device_type);
    }

    public isSoloCameraSpotlight2k(): boolean {
        return Device.isSoloCameraSpotlight2k(this.rawDevice.device_type);
    }

    public isSoloCameraSpotlightSolar(): boolean {
        return Device.isSoloCameraSpotlightSolar(this.rawDevice.device_type);
    }

    public isSoloCameraSolar(): boolean {
        return Device.isSoloCameraSolar(this.rawDevice.device_type);
    }

    public isSoloCameraC210(): boolean {
        return Device.isSoloCameraC210(this.rawDevice.device_type);
    }

    public isStarlight4GLTE(): boolean {
        return Device.isStarlight4GLTE(this.rawDevice.device_type);
    }

    public isIndoorOutdoorCamera1080p(): boolean {
        return Device.isIndoorOutdoorCamera1080p(this.rawDevice.device_type);
    }

    public isIndoorOutdoorCamera1080pNoLight(): boolean {
        return Device.isIndoorOutdoorCamera1080pNoLight(this.rawDevice.device_type);
    }

    public isIndoorOutdoorCamera2k(): boolean {
        return Device.isIndoorOutdoorCamera2k(this.rawDevice.device_type);
    }

    public isIndoorCamMini(): boolean {
        return Device.isIndoorCamMini(this.rawDevice.device_type);
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

    public isCamera3(): boolean {
        return Device.isCamera3(this.rawDevice.device_type);
    }

    public isCamera3C(): boolean {
        return Device.isCamera3C(this.rawDevice.device_type);
    }

    public isCameraProfessional247(): boolean {
        return Device.isCameraProfessional247(this.rawDevice.device_type);
    }

    public isCamera3Product(): boolean {
        return Device.isCamera3Product(this.rawDevice.device_type);
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

    public isPanAndTiltCamera(): boolean {
        return Device.isPanAndTiltCamera(this.rawDevice.device_type);
    }

    public isOutdoorPanAndTiltCamera(): boolean {
        return Device.isOutdoorPanAndTiltCamera(this.rawDevice.device_type);
    }

    public isIndoorPanAndTiltCameraS350(): boolean {
        return Device.isIndoorPanAndTiltCameraS350(this.rawDevice.device_type);
    }

    public isSmartDrop(): boolean {
        return Device.isSmartDrop(this.rawDevice.device_type);
    }

    public isSmartSafe(): boolean {
        return Device.isSmartSafe(this.rawDevice.device_type);
    }

    public isGarageCamera(): boolean {
        return Device.isGarageCamera(this.rawDevice.device_type);
    }

    public isIntegratedDevice(): boolean {
        if (this.isLock() || this.isSmartDrop()) {
            return this.rawDevice.device_sn === this.rawDevice.station_sn;
        }
        return this.isWiredDoorbellDual() || this.isFloodLight() || this.isWiredDoorbell() || this.isIndoorCamera() || this.isSoloCameras() || this.isWallLightCam();
    }

    public isSmartTrack(): boolean {
        return Device.isSmartTrack(this.rawDevice.device_type);
    }

    public isSmartTrackCard(): boolean {
        return Device.isSmartTrackCard(this.rawDevice.device_type);
    }

    public isSmartTrackLink(): boolean {
        return Device.isSmartTrackLink(this.rawDevice.device_type);
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

    //TODO: To remove
    public getStateID(state: string, level = 2): string {
        switch (level) {
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

    public getStateChannel(): string {
        return "devices";
    }

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

    protected constructor(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig) {
        super(api, device, deviceConfig);

        this.properties[PropertyName.DeviceMotionDetected] = false;
        this.properties[PropertyName.DevicePersonDetected] = false;
        this.properties[PropertyName.DevicePersonName] = "";
    }

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<Camera> {
        return new Camera(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "cameras";
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case CommandType.CMD_SET_AUDIO_MUTE_RECORD:
                    return value !== undefined ? (value === "0" ? true : false) : false;
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Camera convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

    public getLastCameraImageURL(): PropertyValue {
        return this.getPropertyValue(PropertyName.DevicePictureUrl);
    }

    public getMACAddress(): string {
        return this.rawDevice.wifi_mac;
    }

    public async startDetection(): Promise<void> {
        // Start camera detection.
        //TODO: Deprecated. Will be removed!
        await this.setParameters([{ paramType: ParamType.DETECT_SWITCH, paramValue: 1 }]).catch(err => {
            const error = ensureError(err);
            rootHTTPLogger.error("Camera start detection - Error", { error: getError(error), deviceSN: this.getSerial() });
        });
    }

    public async stopDetection(): Promise<void> {
        // Stop camera detection.
        await this.setParameters([{ paramType: ParamType.DETECT_SWITCH, paramValue: 0 }])
    }

    public getState(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceState);
    }

    public async close(): Promise<void> {
        //TODO: Stop other things if implemented such as detection feature
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
        return this.getPropertyValue(PropertyName.DeviceMotionDetected) as boolean;
    }

    public isPersonDetected(): boolean {
        return this.getPropertyValue(PropertyName.DevicePersonDetected) as boolean;
    }

    public getDetectedPerson(): string {
        return this.getPropertyValue(PropertyName.DevicePersonName) as string;
    }

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DevicePersonDetected ||
            metadata.name === PropertyName.DeviceIdentityPersonDetected ||
            metadata.name === PropertyName.DeviceStrangerPersonDetected) {
            this.emit("person detected", this, newValue as boolean, this.getPropertyValue(PropertyName.DevicePersonName) as string);
            if (metadata.name === PropertyName.DeviceStrangerPersonDetected)
                this.emit("stranger person detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceMotionDetected) {
            this.emit("motion detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceCryingDetected) {
            this.emit("crying detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceDogDetected) {
            this.emit("dog detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceDogLickDetected) {
            this.emit("dog lick detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceDogPoopDetected) {
            this.emit("dog poop detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DevicePetDetected) {
            this.emit("pet detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceSoundDetected) {
            this.emit("sound detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceVehicleDetected) {
            this.emit("vehicle detected", this, newValue as boolean);
        }
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.SECURITY && message.device_sn === this.getSerial()) {
                try {
                    loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                    if (message.fetch_id !== undefined) {
                        // Person or someone identified
                        this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                        this.updateProperty(PropertyName.DevicePersonDetected, true);
                        this.clearEventTimeout(DeviceEvent.PersonDetected);
                        this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                            this.updateProperty(PropertyName.DevicePersonName, "");
                            this.updateProperty(PropertyName.DevicePersonDetected, false);
                            this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                        }, eventDurationSeconds * 1000));
                    }
                    // Motion detected
                    this.updateProperty(PropertyName.DeviceMotionDetected, true);
                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                        this.updateProperty(PropertyName.DeviceMotionDetected, false);
                        this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                    }, eventDurationSeconds * 1000));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`Camera process push notification - CusPushEvent.SECURITY - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            } else if (message.msg_type === DeviceType.HB3) {
                if (message.device_sn === this.getSerial()) {
                    try {
                        loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                        switch (message.event_type) {
                            case HB3PairedDevicePushEvent.PRESS_DOORBELL:
                                this.updateProperty(PropertyName.DeviceRinging, true);
                                this.clearEventTimeout(DeviceEvent.Ringing);
                                this.eventTimeouts.set(DeviceEvent.Ringing, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceRinging, false);
                                    this.eventTimeouts.delete(DeviceEvent.Ringing);
                                }, eventDurationSeconds * 1000));
                                break;
                            case HB3PairedDevicePushEvent.MOTION_DETECTION:
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                                break;
                            case HB3PairedDevicePushEvent.FACE_DETECTION:
                                this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                                this.updateProperty(PropertyName.DevicePersonDetected, true);
                                this.clearEventTimeout(DeviceEvent.PersonDetected);
                                this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DevicePersonDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                                }, eventDurationSeconds * 1000));

                                if (this.config.simultaneousDetections) {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                        this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                    }, eventDurationSeconds * 1000));
                                }
                                break;
                            case HB3PairedDevicePushEvent.CRYING_DETECTION:
                                this.updateProperty(PropertyName.DeviceCryingDetected, true);
                                this.clearEventTimeout(DeviceEvent.CryingDetected);
                                this.eventTimeouts.set(DeviceEvent.CryingDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceCryingDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.CryingDetected);
                                }, eventDurationSeconds * 1000));
                                break;
                            case HB3PairedDevicePushEvent.DOG_DETECTION:
                                this.updateProperty(PropertyName.DeviceDogDetected, true);
                                this.clearEventTimeout(DeviceEvent.DogDetected);
                                this.eventTimeouts.set(DeviceEvent.DogDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceDogDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.DogDetected);
                                }, eventDurationSeconds * 1000));
                                break;
                            case HB3PairedDevicePushEvent.DOG_LICK_DETECTION:
                                this.updateProperty(PropertyName.DeviceDogLickDetected, true);
                                this.clearEventTimeout(DeviceEvent.DogLickDetected);
                                this.eventTimeouts.set(DeviceEvent.DogLickDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceDogLickDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.DogLickDetected);
                                }, eventDurationSeconds * 1000));
                                break;
                            case HB3PairedDevicePushEvent.DOG_POOP_DETECTION:
                                this.updateProperty(PropertyName.DeviceDogPoopDetected, true);
                                this.clearEventTimeout(DeviceEvent.DogPoopDetected);
                                this.eventTimeouts.set(DeviceEvent.DogPoopDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceDogPoopDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.DogPoopDetected);
                                }, eventDurationSeconds * 1000));
                                break;
                            case HB3PairedDevicePushEvent.PET_DETECTION:
                                this.updateProperty(PropertyName.DevicePetDetected, true);
                                this.clearEventTimeout(DeviceEvent.PetDetected);
                                this.eventTimeouts.set(DeviceEvent.PetDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePetDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.PetDetected);
                                }, eventDurationSeconds * 1000));

                                if (this.config.simultaneousDetections) {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                        this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                    }, eventDurationSeconds * 1000));
                                }
                                break;
                            case HB3PairedDevicePushEvent.SOUND_DETECTION:
                                this.updateProperty(PropertyName.DeviceSoundDetected, true);
                                this.clearEventTimeout(DeviceEvent.SoundDetected);
                                this.eventTimeouts.set(DeviceEvent.SoundDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceSoundDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.SoundDetected);
                                }, eventDurationSeconds * 1000));
                                break;
                            case HB3PairedDevicePushEvent.VEHICLE_DETECTION:
                                this.updateProperty(PropertyName.DeviceVehicleDetected, true);
                                this.clearEventTimeout(DeviceEvent.VehicleDetected);
                                this.eventTimeouts.set(DeviceEvent.VehicleDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceVehicleDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.VehicleDetected);
                                }, eventDurationSeconds * 1000));

                                if (this.config.simultaneousDetections) {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                        this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                    }, eventDurationSeconds * 1000));
                                }
                                break;
                            case HB3PairedDevicePushEvent.IDENTITY_PERSON_DETECTION:
                                this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                                this.updateProperty(PropertyName.DeviceIdentityPersonDetected, true);
                                this.clearEventTimeout(DeviceEvent.IdentityPersonDetected);
                                this.eventTimeouts.set(DeviceEvent.IdentityPersonDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DeviceIdentityPersonDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.IdentityPersonDetected);
                                }, eventDurationSeconds * 1000));

                                if (this.config.simultaneousDetections) {
                                    this.updateProperty(PropertyName.DevicePersonDetected, true);
                                    this.clearEventTimeout(DeviceEvent.PersonDetected);
                                    this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DevicePersonDetected, false);
                                        this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                                    }, eventDurationSeconds * 1000));
                                    this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                        this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                    }, eventDurationSeconds * 1000));
                                }
                                break;
                            case HB3PairedDevicePushEvent.STRANGER_PERSON_DETECTION:
                                this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                                this.updateProperty(PropertyName.DeviceStrangerPersonDetected, true);
                                this.clearEventTimeout(DeviceEvent.StrangerPersonDetected);
                                this.eventTimeouts.set(DeviceEvent.StrangerPersonDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DeviceStrangerPersonDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.StrangerPersonDetected);
                                }, eventDurationSeconds * 1000));
                               
                                if (this.config.simultaneousDetections) {
                                    this.updateProperty(PropertyName.DevicePersonDetected, true);
                                    this.clearEventTimeout(DeviceEvent.PersonDetected);
                                    this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DevicePersonDetected, false);
                                        this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                                    }, eventDurationSeconds * 1000));
                                    this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                        this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                    }, eventDurationSeconds * 1000));
                                }
                                break;
                            default:
                                rootHTTPLogger.debug("Camera process push notification - Unhandled homebase3 camera push event", message);
                                break;
                        }
                    } catch (err) {
                        const error = ensureError(err);
                        rootHTTPLogger.debug(`Camera process push notification - HB3PairedDevicePushEvent - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                    }
                }
            }

        }
    }

}

export class SoloCamera extends Camera {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<SoloCamera> {
        return new SoloCamera(api, device, deviceConfig);
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case CommandType.CMD_DEV_RECORD_AUTOSTOP:
                    return value !== undefined ? (value === "0" ? true : false) : false;
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("SoloCamera convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined && message.msg_type !== DeviceType.HB3) {
            if (message.device_sn === this.getSerial()) {
                try {
                    loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                    switch (message.event_type) {
                        case IndoorPushEvent.MOTION_DETECTION:
                            this.updateProperty(PropertyName.DeviceMotionDetected, true);
                            this.clearEventTimeout(DeviceEvent.MotionDetected);
                            this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.FACE_DETECTION:
                            this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                            this.updateProperty(PropertyName.DevicePersonDetected, true);
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePersonName, "");
                                this.updateProperty(PropertyName.DevicePersonDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));

                            if (this.config.simultaneousDetections) {
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        default:
                            rootHTTPLogger.debug("SoloCamera process push notification - Unhandled solo camera push event", message);
                            break;
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`SoloCamera process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }

}

export class IndoorCamera extends Camera {

    protected constructor(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig) {
        super(api, device, deviceConfig);

        this.properties[PropertyName.DevicePetDetected] = false;
        this.properties[PropertyName.DeviceSoundDetected] = false;
        this.properties[PropertyName.DeviceCryingDetected] = false;
    }

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<IndoorCamera> {
        return new IndoorCamera(api, device, deviceConfig);
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
        return this.getPropertyValue(PropertyName.DevicePetDetected) as boolean;
    }

    public isSoundDetected(): boolean {
        return this.getPropertyValue(PropertyName.DeviceSoundDetected) as boolean;
    }

    public isCryingDetected(): boolean {
        return this.getPropertyValue(PropertyName.DeviceCryingDetected) as boolean;
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined && message.msg_type !== DeviceType.HB3) {
            if (message.device_sn === this.getSerial()) {
                try {
                    loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                    switch (message.event_type) {
                        case IndoorPushEvent.MOTION_DETECTION:
                            this.updateProperty(PropertyName.DeviceMotionDetected, true);
                            this.clearEventTimeout(DeviceEvent.MotionDetected);
                            this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.FACE_DETECTION:
                            this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                            this.updateProperty(PropertyName.DevicePersonDetected, true);
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePersonName, "");
                                this.updateProperty(PropertyName.DevicePersonDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));

                            if (this.config.simultaneousDetections) {
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }

                            break;
                        case IndoorPushEvent.CRYING_DETECTION:
                            this.updateProperty(PropertyName.DeviceCryingDetected, true);
                            this.clearEventTimeout(DeviceEvent.CryingDetected);
                            this.eventTimeouts.set(DeviceEvent.CryingDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceCryingDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.CryingDetected);
                            }, eventDurationSeconds * 1000));
                            this.updateProperty(PropertyName.DeviceSoundDetected, true);
                            this.clearEventTimeout(DeviceEvent.SoundDetected);
                            this.eventTimeouts.set(DeviceEvent.SoundDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceSoundDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.SoundDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.SOUND_DETECTION:
                            this.updateProperty(PropertyName.DeviceSoundDetected, true);
                            this.clearEventTimeout(DeviceEvent.SoundDetected);
                            this.eventTimeouts.set(DeviceEvent.SoundDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceSoundDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.SoundDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.PET_DETECTION:
                            this.updateProperty(PropertyName.DevicePetDetected, true);
                            this.clearEventTimeout(DeviceEvent.PetDetected);
                            this.eventTimeouts.set(DeviceEvent.PetDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePetDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PetDetected);
                            }, eventDurationSeconds * 1000));

                            if (this.config.simultaneousDetections) {
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        default:
                            rootHTTPLogger.debug("IndoorCamera process push notification - Unhandled indoor camera push event", message);
                            break;
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`IndoorCamera process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }

    public destroy(): void {
        super.destroy();
    }

}

export class DoorbellCamera extends Camera {

    protected voices: Voices;

    protected constructor(api: HTTPApi, device: DeviceListResponse, voices: Voices, deviceConfig: DeviceConfig) {
        super(api, device, deviceConfig);

        this.voices = voices;
        this.properties[PropertyName.DeviceRinging] = false;
    }

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<DoorbellCamera> {
        const voices = await api.getVoices(device.device_sn);
        return new DoorbellCamera(api, device, voices, deviceConfig);
    }

    private loadMetadataVoiceStates(propertyName: string, metadata: IndexedProperty): IndexedProperty {
        if (metadata[propertyName] !== undefined) {
            const states: Record<number, string> = {};
            for (const voice of Object.values(this.voices) as Voice[]) {
                states[voice.voice_id] = voice.desc;
            }
            (metadata[propertyName] as PropertyMetadataNumeric).states = states;
        }
        return metadata;
    }

    public getVoiceName(id: number): string {
        if (this.voices[id] !== undefined)
            return this.voices[id].desc;
        return "";
    }

    public getVoices(): Voices {
        return this.voices;
    }

    public getPropertiesMetadata(hidden = false): IndexedProperty {
        let metadata = super.getPropertiesMetadata(hidden);
        metadata = this.loadMetadataVoiceStates(PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice, metadata);
        metadata = this.loadMetadataVoiceStates(PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice, metadata);
        metadata = this.loadMetadataVoiceStates(PropertyName.DeviceRingAutoResponseVoiceResponseVoice, metadata);
        return metadata;
    }

    public isRinging(): boolean {
        return this.getPropertyValue(PropertyName.DeviceRinging) as boolean;
    }

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DeviceRinging) {
            this.emit("rings", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DevicePackageDelivered) {
            this.emit("package delivered", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DevicePackageStranded) {
            this.emit("package stranded", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DevicePackageTaken) {
            this.emit("package taken", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceSomeoneLoitering) {
            this.emit("someone loitering", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceRadarMotionDetected) {
            this.emit("radar motion detected", this, newValue as boolean);
        }
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined && message.msg_type !== DeviceType.HB3) {
            if (message.device_sn === this.getSerial()) {
                try {
                    loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                    switch (message.event_type) {
                        case DoorbellPushEvent.MOTION_DETECTION:
                            this.updateProperty(PropertyName.DeviceMotionDetected, true);
                            this.clearEventTimeout(DeviceEvent.MotionDetected);
                            this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case DoorbellPushEvent.FACE_DETECTION:
                        case DoorbellPushEvent.FAMILY_DETECTION:
                            this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                            this.updateProperty(PropertyName.DevicePersonDetected, true);
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePersonName, "");
                                this.updateProperty(PropertyName.DevicePersonDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));

                            if (this.config.simultaneousDetections) {
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.PRESS_DOORBELL:
                            this.updateProperty(PropertyName.DeviceRinging, true);
                            this.clearEventTimeout(DeviceEvent.Ringing);
                            this.eventTimeouts.set(DeviceEvent.Ringing, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceRinging, false);
                                this.eventTimeouts.delete(DeviceEvent.Ringing);
                            }, eventDurationSeconds * 1000));
                            break;
                        case DoorbellPushEvent.PACKAGE_DELIVERED:
                            this.updateProperty(PropertyName.DevicePackageDelivered, true);
                            this.clearEventTimeout(DeviceEvent.PackageDelivered);
                            this.eventTimeouts.set(DeviceEvent.PackageDelivered, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePackageDelivered, false);
                                this.eventTimeouts.delete(DeviceEvent.PackageDelivered);
                            }, eventDurationSeconds * 1000));
                            break;
                        case DoorbellPushEvent.PACKAGE_STRANDED:
                            this.updateProperty(PropertyName.DevicePackageStranded, true);
                            this.clearEventTimeout(DeviceEvent.PackageStranded);
                            this.eventTimeouts.set(DeviceEvent.PackageStranded, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePackageStranded, false);
                                this.eventTimeouts.delete(DeviceEvent.PackageStranded);
                            }, eventDurationSeconds * 1000));
                            break;
                        case DoorbellPushEvent.PACKAGE_TAKEN:
                            this.updateProperty(PropertyName.DevicePackageTaken, true);
                            this.clearEventTimeout(DeviceEvent.PackageTaken);
                            this.eventTimeouts.set(DeviceEvent.PackageTaken, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePackageTaken, false);
                                this.eventTimeouts.delete(DeviceEvent.PackageTaken);
                            }, eventDurationSeconds * 1000));
                            break;
                        case DoorbellPushEvent.SOMEONE_LOITERING:
                            this.updateProperty(PropertyName.DeviceSomeoneLoitering, true);
                            this.clearEventTimeout(DeviceEvent.SomeoneLoitering);
                            this.eventTimeouts.set(DeviceEvent.SomeoneLoitering, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceSomeoneLoitering, false);
                                this.eventTimeouts.delete(DeviceEvent.SomeoneLoitering);
                            }, eventDurationSeconds * 1000));
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePersonDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));

                            if (this.config.simultaneousDetections) {
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.RADAR_MOTION_DETECTION:
                            this.updateProperty(PropertyName.DeviceRadarMotionDetected, true);
                            this.clearEventTimeout(DeviceEvent.RadarMotionDetected);
                            this.eventTimeouts.set(DeviceEvent.RadarMotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceRadarMotionDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.RadarMotionDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case DoorbellPushEvent.AWAY_FROM_HOME:
                            this.updateProperty(PropertyName.DeviceSomeoneGoing, true);
                            this.clearEventTimeout(DeviceEvent.SomeoneGoing);
                            this.eventTimeouts.set(DeviceEvent.SomeoneGoing, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceSomeoneGoing, false);
                                this.eventTimeouts.delete(DeviceEvent.SomeoneGoing);
                            }, eventDurationSeconds * 1000));
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePersonDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));

                            if (this.config.simultaneousDetections) {
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        default:
                            rootHTTPLogger.debug("DoorbellCamera process push notification - Unhandled doorbell push event", message);
                            break;
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`DoorbellCamera process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }

}

export class WiredDoorbellCamera extends DoorbellCamera {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<WiredDoorbellCamera> {
        const voices = await api.getVoices(device.device_sn);
        return new WiredDoorbellCamera(api, device, voices, deviceConfig);
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

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<BatteryDoorbellCamera> {
        const voices = await api.getVoices(device.device_sn);
        return new BatteryDoorbellCamera(api, device, voices, deviceConfig);
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

}

export class FloodlightCamera extends Camera {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<FloodlightCamera> {
        return new FloodlightCamera(api, device, deviceConfig);
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case CommandType.CMD_DEV_RECORD_AUTOSTOP:
                    if (this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8424 || this.getDeviceType() === DeviceType.FLOODLIGHT)
                        return value !== undefined ? (value === "0" ? true : false) : false;
                    break;
                case CommandType.CMD_FLOODLIGHT_SET_AUTO_CALIBRATION:
                    if (this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423)
                        return value !== undefined ? (value === "0" ? true : false) : false;
                    break;
                case CommandType.CMD_RECORD_AUDIO_SWITCH:
                    return value !== undefined ? (value === "0" ? true : false) : false;
                case CommandType.CMD_SET_AUDIO_MUTE_RECORD:
                    if (this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423)
                        return value !== undefined ? (value === "1" ? true : false) : false;
                    return value !== undefined ? (value === "0" ? true : false) : false;
                case CommandType.CMD_SET_PIRSENSITIVITY:
                    switch (Number.parseInt(value)) {
                        case FloodlightMotionTriggeredDistance.MIN:
                            return 1;
                        case FloodlightMotionTriggeredDistance.LOW:
                            return 2;
                        case FloodlightMotionTriggeredDistance.MEDIUM:
                            return 3;
                        case FloodlightMotionTriggeredDistance.HIGH:
                            return 4;
                        case FloodlightMotionTriggeredDistance.MAX:
                            return 5;
                        default:
                            return 5;
                    }
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("FloodlightCamera convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined && message.msg_type !== DeviceType.HB3) {
            if (message.device_sn === this.getSerial()) {
                try {
                    loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                    switch (message.event_type) {
                        case IndoorPushEvent.MOTION_DETECTION:
                            this.updateProperty(PropertyName.DeviceMotionDetected, true);
                            this.clearEventTimeout(DeviceEvent.MotionDetected);
                            this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.FACE_DETECTION:
                            this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                            this.updateProperty(PropertyName.DevicePersonDetected, true);
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePersonName, "");
                                this.updateProperty(PropertyName.DevicePersonDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));

                            if (this.config.simultaneousDetections) {
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        default:
                            rootHTTPLogger.debug("FloodlightCamera process push notification - Unhandled floodlight push event", message);
                            break;
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`FloodlightCamera process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }

}

export class WallLightCam extends Camera {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<WallLightCam> {
        return new WallLightCam(api, device, deviceConfig);
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case CommandType.CMD_DEV_RECORD_AUTOSTOP:
                    return value !== undefined ? (value === "0" ? true : false) : false;
                case CommandType.CMD_SET_AUDIO_MUTE_RECORD:
                    return value !== undefined ? (value === "1" ? true : false) : false;
                case CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_COLORED_LIGHTING:
                case CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_COLORED_LIGHTING:
                case CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_COLORED_LIGHTING:
                    {
                        const defaultColor: RGBColor = {
                            red: 0,
                            green: 0,
                            blue: 0
                        };
                        const internal = value as unknown as { rgb_color: number; };
                        return internal !== undefined ? (internal.rgb_color !== undefined ? DecimalToRGBColor(internal.rgb_color) : defaultColor) : defaultColor;
                    }
                case CommandType.CMD_WALL_LIGHT_SETTINGS_COLORED_LIGHTING_COLORS: {
                    const result: Array<RGBColor> = [];
                    for (const color of value as unknown as Array<InternalColoredLighting>) {
                        result.push(DecimalToRGBColor(color.color));
                    }
                    return result;
                }
                case CommandType.CMD_WALL_LIGHT_SETTINGS_DYNAMIC_LIGHTING_THEMES: {
                    const result: Array<DynamicLighting> = [];
                    for (const theme of value as unknown as Array<InternalDynamicLighting>) {
                        result.push({
                            colors: theme.colors.map((color) => DecimalToRGBColor(color)),
                            mode: theme.mode,
                            name: theme.name,  // 1 fade 2 blink
                            speed: theme.speed // Control speed 500 msec to 5 sec.; 500 msec steps
                        });
                    }
                    return result;
                }
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("WallLightCam convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

    public getPropertiesMetadata(hidden = false): IndexedProperty {
        const metadata = super.getPropertiesMetadata(hidden);
        const themes = this.getPropertyValue(PropertyName.DeviceLightSettingsDynamicLightingThemes) as Array<DynamicLighting>;
        if (themes !== undefined) {
            const states: Record<number, string> = {};
            for (let i = 0; i < themes.length; i++) {
                states[i] = themes[i].name;
            }
            (metadata[PropertyName.DeviceLightSettingsManualDynamicLighting] as PropertyMetadataNumeric).states = states;
            (metadata[PropertyName.DeviceLightSettingsScheduleDynamicLighting] as PropertyMetadataNumeric).states = states;
            (metadata[PropertyName.DeviceLightSettingsMotionDynamicLighting] as PropertyMetadataNumeric).states = states;
        }
        return metadata;
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                    switch (message.event_type) {
                        case IndoorPushEvent.MOTION_DETECTION:
                            this.updateProperty(PropertyName.DeviceMotionDetected, true);
                            this.clearEventTimeout(DeviceEvent.MotionDetected);
                            this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                            }, eventDurationSeconds * 1000));
                            break;
                        case IndoorPushEvent.FACE_DETECTION:
                            this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                            this.updateProperty(PropertyName.DevicePersonDetected, true);
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePersonName, "");
                                this.updateProperty(PropertyName.DevicePersonDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));

                            if (this.config.simultaneousDetections) {
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        default:
                            rootHTTPLogger.debug("WallLightCam process push notification - Unhandled WallLightCam push event", message);
                            break;
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`WallLightCam process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }
}

export class GarageCamera extends Camera {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<GarageCamera> {
        return new GarageCamera(api, device, deviceConfig);
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case CommandType.CMD_SET_AUDIO_MUTE_RECORD:
                    return value !== undefined ? (value === "1" ? true : false) : false;
                case CommandType.CMD_CAMERA_GARAGE_DOOR_STATUS:
                    if (value != undefined) {
                        const status = Number.parseInt(value);
                        if (status >= 0) {
                            if (property.name === PropertyName.DeviceDoor1Open) {
                                return (status & GarageDoorState.A_OPENED) === GarageDoorState.A_OPENED;
                            } else if (property.name === PropertyName.DeviceDoor2Open) {
                                return (status & GarageDoorState.B_OPENED) === GarageDoorState.B_OPENED;
                            }
                        }
                    }
                    return false;
                case CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS:
                    if (value != undefined) {
                        const sensorsData = value as unknown as GarageDoorSensorsProperty;
                        if (property.name === PropertyName.DeviceDoorSensor1BatteryLevel) {
                            if (sensorsData?.data?.door_1?.power !== undefined && sensorsData?.data?.door_1?.power > 1) {
                                this.updateProperty(PropertyName.DeviceDoorSensor1LowBattery, false);
                            }
                            return sensorsData?.data?.door_1?.power !== undefined ? sensorsData?.data?.door_1?.power : 0;
                        } else if (property.name === PropertyName.DeviceDoorSensor2BatteryLevel) {
                            if (sensorsData?.data?.door_2?.power !== undefined && sensorsData?.data?.door_2?.power > 1) {
                                this.updateProperty(PropertyName.DeviceDoorSensor1LowBattery, false);
                            }
                            return sensorsData?.data?.door_2?.power !== undefined ? sensorsData?.data?.door_2?.power : 0;
                        } else if (property.name === PropertyName.DeviceDoorSensor1MacAddress) {
                            return sensorsData?.data?.door_1?.mac_address !== undefined ? sensorsData?.data?.door_1?.mac_address : "";
                        } else if (property.name === PropertyName.DeviceDoorSensor2MacAddress) {
                            return sensorsData?.data?.door_2?.mac_address !== undefined ? sensorsData?.data?.door_2?.mac_address : "";
                        } else if (property.name === PropertyName.DeviceDoorSensor1Name) {
                            return sensorsData?.data?.door_1?.name !== undefined ? sensorsData?.data?.door_1?.name : "";
                        } else if (property.name === PropertyName.DeviceDoorSensor2Name) {
                            return sensorsData?.data?.door_2?.name !== undefined ? sensorsData?.data?.door_2?.name : "";
                        } else if (property.name === PropertyName.DeviceDoorSensor1SerialNumber) {
                            return sensorsData?.data?.door_1?.sn !== undefined ? sensorsData?.data?.door_1?.sn : "";
                        } else if (property.name === PropertyName.DeviceDoorSensor2SerialNumber) {
                            return sensorsData?.data?.door_2?.sn !== undefined ? sensorsData?.data?.door_2?.sn : "";
                        } else if (property.name === PropertyName.DeviceDoorSensor1Version) {
                            return sensorsData?.data?.door_1?.version !== undefined ? sensorsData?.data?.door_1?.version : "";
                        } else if (property.name === PropertyName.DeviceDoorSensor2Version) {
                            return sensorsData?.data?.door_2?.version !== undefined ? sensorsData?.data?.door_2?.version : "";
                        } else if (property.name === PropertyName.DeviceDoorControlWarning) {
                            return sensorsData?.data?.door_1?.playalarm !== undefined ? sensorsData?.data?.door_1?.playalarm === 1 ? true : false : false;
                        } else if (property.name === PropertyName.DeviceDoorSensor1Status) {
                            return sensorsData?.data?.door_1?.power !== undefined ? sensorsData?.data?.door_1?.power >= 1 && sensorsData?.data?.door_1?.sn !== "" ? 1 : 0 : 0;
                        } else if (property.name === PropertyName.DeviceDoorSensor2Status) {
                            return sensorsData?.data?.door_2?.power !== undefined ? sensorsData?.data?.door_2?.power >= 1 && sensorsData?.data?.door_2?.sn !== "" ? 1 : 0 : 0;
                        }
                    }
                    break;
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("GarageCamera convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                    switch (message.event_type) {
                        case GarageDoorPushEvent.CLOSED_DOOR_BY_APP:
                        case GarageDoorPushEvent.CLOSED_DOOR_WITHOUT_APP:
                        case GarageDoorPushEvent.TIMEOUT_CLOSED_DOOR:
                            if (message.door_id === 1) {
                                this.updateProperty(PropertyName.DeviceDoor1Open, false);
                            } else if (message.door_id === 2) {
                                this.updateProperty(PropertyName.DeviceDoor2Open, false);
                            }
                            break;
                        case GarageDoorPushEvent.OPEN_DOOR_BY_APP:
                        case GarageDoorPushEvent.OPEN_DOOR_WITHOUT_APP:
                        case GarageDoorPushEvent.TIMEOUT_DOOR_OPEN_WARNING:
                        case GarageDoorPushEvent.TIMEOUT_DOOR_OPEN_WARNING_MINUTES:
                            if (message.door_id === 1) {
                                this.updateProperty(PropertyName.DeviceDoor1Open, true);
                            } else if (message.door_id === 2) {
                                this.updateProperty(PropertyName.DeviceDoor2Open, true);
                            }
                            break;
                        case GarageDoorPushEvent.LOW_BATTERY:
                            //TODO: Check if low battery status resets to false after battery change
                            if (message.door_id === 1) {
                                this.updateProperty(PropertyName.DeviceDoorSensor1LowBattery, true);
                            } else if (message.door_id === 2) {
                                this.updateProperty(PropertyName.DeviceDoorSensor2LowBattery, true);
                            }
                            break;
                        default:
                            rootHTTPLogger.debug("GarageCamera process push notification - Unhandled GarageDoor push event", message);
                            break;
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`GarageCamera process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }
}

export class Sensor extends Device {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<Sensor> {
        return new Sensor(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "sensors";
    }

    public getState(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceState);
    }

}

export class EntrySensor extends Sensor {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<EntrySensor> {
        return new EntrySensor(api, device, deviceConfig);
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

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.DOOR_SENSOR && message.device_sn === this.getSerial()) {
                try {
                    if (message.sensor_open !== undefined) {
                        this.updateRawProperty(CommandType.CMD_ENTRY_SENSOR_STATUS, message.sensor_open ? "1" : "0", "push");
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`EntrySensor process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DeviceSensorOpen && metadata.key === CommandType.CMD_ENTRY_SENSOR_STATUS) {
            this.emit("open", this, newValue as boolean);
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
        return MotionSensor.isMotionDetected(this.getMotionSensorPIREvent());
    }*/

    protected constructor(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig) {
        super(api, device, deviceConfig);

        this.properties[PropertyName.DeviceMotionDetected] = false;
    }

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<MotionSensor> {
        return new MotionSensor(api, device, deviceConfig);
    }

    public isMotionDetected(): boolean {
        return this.getPropertyValue(PropertyName.DeviceMotionDetected) as boolean;
    }

    public getMotionSensorPIREvent(): PropertyValue {
        //TODO: Implement P2P Control Event over active station connection
        return this.getPropertyValue(PropertyName.DeviceMotionSensorPIREvent);
    }

    public isBatteryLow(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBatteryLow);
    }

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DeviceMotionDetected) {
            this.emit("motion detected", this, newValue as boolean);
        }
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.MOTION_SENSOR_PIR && message.device_sn === this.getSerial()) {
                try {
                    this.updateProperty(PropertyName.DeviceMotionDetected, true);
                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                        this.updateProperty(PropertyName.DeviceMotionDetected, false);
                        this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                    }, eventDurationSeconds * 1000));
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`MotionSensor process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }

}

export class Lock extends Device {

    public static readonly VERSION_CODE_SMART_LOCK = 3;
    public static readonly VERSION_CODE_LOCKV12 = 18;

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<Lock> {
        return new Lock(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "locks";
    }

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DeviceLocked) {
            this.emit("locked", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceLowBatteryAlert) {
            this.emit("low battery", this, newValue as boolean);
        } else if ((metadata.key === CommandType.CMD_DOORLOCK_GET_STATE || metadata.key === CommandType.CMD_SMARTLOCK_QUERY_STATUS) && ((oldValue !== undefined && ((oldValue === 4 && newValue !== 4) || (oldValue !== 4 && newValue === 4))) || oldValue === undefined)) {
            this.updateProperty(PropertyName.DeviceLocked, newValue === 4 ? true : false);
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
        return param ? (param === 4 ? true : false) : false;
    }

    public getLockStatus(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceLockStatus);
    }

    // public isBatteryLow(): PropertyValue {
    //     return this.getPropertyValue(PropertyName.DeviceBatteryLow);
    // }

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

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.event_type !== undefined) {
            this.processNotification(message.event_type, message.event_time, message.device_sn, message.person_name!, eventDurationSeconds, "push");
        }
    }

    public processMQTTNotification(message: DeviceSmartLockNotifyData, eventDurationSeconds: number): void {
        if (message.eventType === LockPushEvent.STATUS_CHANGE) {
            // Lock state event
            const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
            this.updateRawProperty(cmdType, message.lockState, "mqtt");
        } else if (message.eventType === LockPushEvent.OTA_STATUS) {
            // OTA Status - ignore event
        } else {
            this.processNotification(message.eventType, message.eventTime, this.getSerial(), message.nickName, eventDurationSeconds, "mqtt");
        }
    }

    private processNotification(eventType: number, eventTime: number, deviceSN: string, personName: string, eventDurationSeconds: number, source: SourceType): void {
        if (deviceSN === this.getSerial()) {
            try {
                switch (eventType) {
                    case LockPushEvent.APP_LOCK:
                    case LockPushEvent.AUTO_LOCK:
                    case LockPushEvent.FINGER_LOCK:
                    case LockPushEvent.KEYPAD_LOCK:
                    case LockPushEvent.MANUAL_LOCK:
                    case LockPushEvent.PW_LOCK:
                    case LockPushEvent.TEMPORARY_PW_LOCK:
                        {
                            const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
                            this.updateRawProperty(cmdType, "4", source);

                            if (!isEmpty(personName)) {
                                this.updateProperty(PropertyName.DevicePersonName, personName);
                                this.updateProperty(PropertyName.DeviceLockEventOrigin, getLockEventType(eventType));
                                this.clearEventTimeout(DeviceEvent.Lock);
                                this.eventTimeouts.set(DeviceEvent.Lock, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DeviceLockEventOrigin, 0);
                                    this.eventTimeouts.delete(DeviceEvent.Lock);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        }
                    case LockPushEvent.APP_UNLOCK:
                    case LockPushEvent.AUTO_UNLOCK:
                    case LockPushEvent.FINGERPRINT_UNLOCK:
                    case LockPushEvent.MANUAL_UNLOCK:
                    case LockPushEvent.PW_UNLOCK:
                    case LockPushEvent.TEMPORARY_PW_UNLOCK:
                        {
                            const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
                            this.updateRawProperty(cmdType, "3", source);

                            if (!isEmpty(personName)) {
                                this.updateProperty(PropertyName.DevicePersonName, personName);
                                this.updateProperty(PropertyName.DeviceLockEventOrigin, getLockEventType(eventType));
                                this.clearEventTimeout(DeviceEvent.Lock);
                                this.eventTimeouts.set(DeviceEvent.Lock, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DeviceLockEventOrigin, 0);
                                    this.eventTimeouts.delete(DeviceEvent.Lock);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        }
                    case LockPushEvent.LOCK_MECHANICAL_ANOMALY:
                    case LockPushEvent.MECHANICAL_ANOMALY:
                    case LockPushEvent.VIOLENT_DESTRUCTION:
                    case LockPushEvent.MULTIPLE_ERRORS:
                        {
                            const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
                            this.updateRawProperty(cmdType, "5", source);
                            break;
                        }
                    case LockPushEvent.LOW_POWER:
                    case LockPushEvent.VERY_LOW_POWER:
                        this.updateProperty(PropertyName.DeviceLowBatteryAlert, true);
                        this.clearEventTimeout(DeviceEvent.LowBattery);
                        this.eventTimeouts.set(DeviceEvent.LowBattery, setTimeout(async () => {
                            this.updateProperty(PropertyName.DeviceLowBatteryAlert, false);
                            this.eventTimeouts.delete(DeviceEvent.LowBattery);
                        }, eventDurationSeconds * 1000));
                        break;
                    // case LockPushEvent.LOW_POWE:
                    //     this.updateRawProperty(CommandType.CMD_SMARTLOCK_QUERY_BATTERY_LEVEL, "10");
                    //     break;
                    // case LockPushEvent.VERY_LOW_POWE:
                    //     this.updateRawProperty(CommandType.CMD_SMARTLOCK_QUERY_BATTERY_LEVEL, "5");
                    //     break;
                    default:
                        rootHTTPLogger.debug("Lock process push notification - Unhandled lock notification event", eventType, eventTime, deviceSN);
                        break;
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.debug(`Lock process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), eventType: eventType, eventTime: eventTime, eventDurationSeconds: eventDurationSeconds, source: source });
            }
        }
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

    private static getCurrentTimeInSeconds(): Buffer {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeUint32LE(getCurrentTimeInSeconds());
        return buffer;
    }

    private static getUInt8Buffer(value: number): Buffer {
        const buffer = Buffer.allocUnsafe(1);
        buffer.writeUInt8(value);
        return buffer;
    }

    private static getUint16LEBuffer(value: number): Buffer {
        const buffer = Buffer.allocUnsafe(2);
        buffer.writeUint16LE(value);
        return buffer;
    }

    private static getUint16BEBuffer(value: number): Buffer {
        const buffer = Buffer.allocUnsafe(2);
        buffer.writeUint16BE(value);
        return buffer;
    }

    public static encodeCmdStatus(user_id: string): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(user_id, "hex"));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdUnlock(short_user_id: string, value: number, username: string): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(short_user_id, "hex"));
        payload.write(this.getUInt8Buffer(value));
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(username));
        return payload.getData();
    }

    public static encodeCmdCalibrate(user_id: string): Buffer {
        return this.encodeCmdStatus(user_id);
    }

    public static encodeCmdAddUser(short_user_id: string, passcode: string, username: string, schedule?: Schedule, user_permission = 4): Buffer { // or user_permission 1?
        const payload = new WritePayload();
        payload.write(Buffer.from(short_user_id, "hex"));
        payload.write(Buffer.from(passcode, "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff", "hex"));
        payload.write(this.getUInt8Buffer(user_permission));
        payload.write(Buffer.from(username));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdAddTemporaryUser(schedule?: Schedule, unlimited = false): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff", "hex"));
        payload.write(this.getUInt8Buffer(unlimited === false ? 1 : 2));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdDeleteTemporaryUser(password_id: string): Buffer {
        return this.encodeCmdStatus(password_id);
    }

    public static encodeCmdDeleteUser(short_user_id: string): Buffer {
        return this.encodeCmdStatus(short_user_id);
    }

    public static encodeCmdVerifyPw(password: string): Buffer {
        return this.encodeCmdStatus(password);
    }

    public static encodeCmdQueryLockRecord(index: number): Buffer {
        const payload = new WritePayload();
        payload.write(this.getUint16LEBuffer(index));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdQueryUser(short_user_id: string): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(short_user_id, "hex"));
        payload.write(this.getUInt8Buffer(0));  //TODO: eSLQueryAllUsers.index
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdQueryPassword(password_id: string): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(password_id, "hex"));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdModifyPassword(password_id: string, passcode: string): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(password_id, "hex"));
        payload.write(Buffer.from(passcode, "hex"));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdUpdateSchedule(short_user_id: string, schedule: Schedule): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(short_user_id, "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff", "hex"));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdModifyUsername(username: string, password_id: string): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(password_id, "hex"));
        payload.write(Buffer.from(username));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdGetLockParam(user_id: string): Buffer {
        return this.encodeCmdStatus(user_id);
    }

    public static encodeCmdSetLockParamAutoLock(enabled: boolean, lockTimeSeconds: number): Buffer {
        const payload = new WritePayload();
        payload.write(this.getUint16BEBuffer(CommandType.CMD_SMARTLOCK_AUTO_LOCK));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(this.getUint16LEBuffer(lockTimeSeconds));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    private static hexTime = function (time: string): string {
        const buf = Buffer.allocUnsafe(2);
        buf.writeUint8(Number.parseInt(time.split(":")[0]));
        buf.writeUint8(Number.parseInt(time.split(":")[1]), 1);
        return buf.readUInt16BE().toString(16).padStart(4, "0");
    }

    public static encodeCmdSetLockParamAutoLockSchedule(enabled: boolean, schedule_start: string, schedule_end: string): Buffer {
        const payload = new WritePayload();
        payload.write(this.getUint16BEBuffer(CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(Buffer.from(Lock.hexTime(schedule_start), "hex"));
        payload.write(Buffer.from(Lock.hexTime(schedule_end), "hex"));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdSetLockParamOneTouchLock(enabled: boolean): Buffer {
        const payload = new WritePayload();
        payload.write(this.getUint16BEBuffer(CommandType.CMD_SMARTLOCK_ONE_TOUCH_LOCK));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdSetLockParamWrongTryProtect(enabled: boolean, lockdownTime: number, attempts: number): Buffer {
        const payload = new WritePayload();
        payload.write(this.getUint16BEBuffer(CommandType.CMD_SMARTLOCK_WRONG_TRY_PROTECT));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(this.getUint16LEBuffer(lockdownTime));
        payload.write(this.getUInt8Buffer(attempts));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdSetLockParamScramblePasscode(enabled: boolean): Buffer {
        const payload = new WritePayload();
        payload.write(this.getUint16BEBuffer(CommandType.CMD_SMARTLOCK_SCRAMBLE_PASSCODE));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdSetLockParamSound(value: number): Buffer {
        const payload = new WritePayload();
        payload.write(this.getUint16BEBuffer(CommandType.CMD_SMARTLOCK_LOCK_SOUND));
        payload.write(this.getUInt8Buffer(value));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case CommandType.CMD_DOORLOCK_SET_PUSH_MODE:
                    if (property.name === PropertyName.DeviceNotification) {
                        return value !== undefined ? isSmartLockNotification(Number.parseInt(value), SmartLockNotification.ENABLED) : false;
                    } else if (property.name === PropertyName.DeviceNotificationLocked) {
                        return value !== undefined ? isSmartLockNotification(Number.parseInt(value), SmartLockNotification.LOCKED) : false;
                    } else if (property.name === PropertyName.DeviceNotificationUnlocked) {
                        return value !== undefined ? isSmartLockNotification(Number.parseInt(value), SmartLockNotification.UNLOCKED) : false;
                    }
                    break;
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("WallLightCam convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

    public static encodeCmdSmartLockUnlock(adminUserId: string, lock: boolean, username: string, shortUserId: string): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(this.getUInt8Buffer(lock ? 0 : 1));
        payload.write(Buffer.from(username));
        payload.write(Buffer.from(shortUserId, "hex"));
        return payload.getData();
    }

    public static encodeCmdSmartLockCalibrate(adminUserId: string): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        return payload.getData();
    }

    public static encodeCmdSetSmartLockParamWrongTryProtect(adminUserId: string, enabled: boolean, attempts: number, lockdownTime: number): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(this.getUInt8Buffer(2));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(this.getUInt8Buffer(attempts));
        payload.write(this.getUint16LEBuffer(lockdownTime));
        return payload.getData();
    }

    private static hexTimeSmartLock = function (time: string): Buffer {
        const buf = Buffer.allocUnsafe(2);
        buf.writeUint8(Number.parseInt(time.split(":")[0]));
        buf.writeUint8(Number.parseInt(time.split(":")[1]), 1);
        return buf;
    }

    public static encodeCmdSetSmartLockParamAutoLock(adminUserId: string, enabled: boolean, lockTimeSeconds: number, schedule: boolean, scheduleStart: string, scheduleEnd: string): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(this.getUInt8Buffer(0));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(this.getUint16LEBuffer(lockTimeSeconds));
        payload.write(this.getUInt8Buffer(schedule === true ? 1 : 0));
        payload.write(this.hexTimeSmartLock(scheduleStart));
        payload.write(this.hexTimeSmartLock(scheduleEnd));
        return payload.getData();
    }

    public static encodeCmdSetSmartLockParamOneTouchLock(adminUserId: string, enabled: boolean): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(this.getUInt8Buffer(1));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        return payload.getData();
    }

    public static encodeCmdSetSmartLockParamScramblePasscode(adminUserId: string, enabled: boolean): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(this.getUInt8Buffer(3));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        return payload.getData();
    }

    public static encodeCmdSetSmartLockParamSound(adminUserId: string, value: number): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(this.getUInt8Buffer(4));
        payload.write(this.getUInt8Buffer(value));
        return payload.getData();
    }

    public static encodeCmdSmartLockAddUser(adminUserId: string, shortUserId: string, passcode: string, username: string, schedule?: Schedule, userPermission = 4): Buffer { // or user_permission 1?
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(Buffer.from(passcode, "hex"));
        payload.write(this.getUInt8Buffer(userPermission));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff", "hex"));
        payload.write(this.getUInt8Buffer(userPermission === 5 ? 1 : 0));
        payload.write(Buffer.from(username));
        payload.write(Buffer.from(shortUserId, "hex"));
        return payload.getData();
    }

    public static encodeCmdSmartLockDeleteUser(adminUserId: string, shortUserId: string): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(Buffer.from(shortUserId, "hex"));
        return payload.getData();
    }

    public static encodeCmdSmartLockUpdateSchedule(adminUserId: string, shortUserId: string, username: string, schedule: Schedule, userPermission = 4): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(this.getUInt8Buffer(userPermission));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000", "hex"));
        payload.write(Buffer.from(schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff", "hex"));
        payload.write(this.getUInt8Buffer(userPermission === 5 ? 1 : 0));
        payload.write(Buffer.from(username));
        payload.write(Buffer.from(shortUserId, "hex"));
        return payload.getData();
    }

    public static encodeCmdSmartLockModifyPassword(adminUserId: string, passwordId: string, passcode: string): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(Buffer.from(passwordId, "hex"));
        payload.write(Buffer.from(passcode, "hex"));
        return payload.getData();
    }

    public static encodeCmdSmartLockGetUserList(adminUserId: string): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        payload.write(this.getUInt8Buffer(0));
        return payload.getData();
    }

    public static encodeCmdSmartLockStatus(adminUserId: string): Buffer {
        const payload = new WritePayload();
        payload.write(this.getCurrentTimeInSeconds());
        payload.write(Buffer.from(adminUserId));
        return payload.getData();
    }

    public static encodeCmdSmartLockGetParams(adminUserId: string): Buffer {
        return this.encodeCmdSmartLockStatus(adminUserId);
    }

}

export class LockKeypad extends Device {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<LockKeypad> {
        return new LockKeypad(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "lock_keypads";
    }

}

export class Keypad extends Device {

    //TODO: CMD_KEYPAD_BATTERY_CHARGER_STATE = 1655
    //TODO: CMD_KEYPAD_BATTERY_TEMP_STATE = 1654
    //TODO: CMD_KEYPAD_GET_PASSWORD = 1657
    //TODO: CMD_KEYPAD_GET_PASSWORD_LIST = 1662
    //TODO: CMD_KEYPAD_IS_PSW_SET = 1670
    //TODO: CMD_KEYPAD_SET_CUSTOM_MAP = 1660
    //TODO: CMD_KEYPAD_SET_PASSWORD = 1650

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<Keypad> {
        return new Keypad(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "keypads";
    }

    public getState(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceState);
    }

    public isBatteryLow(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBatteryLow);
    }

    public isBatteryCharging(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceBatteryIsCharging);
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case CommandType.CMD_KEYPAD_BATTERY_CHARGER_STATE:
                    return value !== undefined ? (value === "0" || value === "2" ? false : true) : false;
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Keypad convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

}

export class SmartSafe extends Device {

    public static readonly IV = "052E19EB3F880512E99EBB684D4DC1FE";
    public static readonly DATA_HEADER = [-1, 9];
    public static readonly VERSION_CODE = 1;
    public static readonly PUSH_NOTIFICATION_POSITION: {
        [index: string]: number;
    } = {
            [PropertyName.DeviceNotificationUnlockByKey]: 0,
            [PropertyName.DeviceNotificationUnlockByPIN]: 1,
            [PropertyName.DeviceNotificationUnlockByFingerprint]: 2,
            [PropertyName.DeviceNotificationUnlockByApp]: 3,
            [PropertyName.DeviceNotificationDualUnlock]: 4,
            [PropertyName.DeviceNotificationDualLock]: 5,
            [PropertyName.DeviceNotificationWrongTryProtect]: 6,
            [PropertyName.DeviceNotificationJammed]: 7,
        };

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<SmartSafe> {
        return new SmartSafe(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "smartsafes";
    }

    private static getCurrentTimeInSeconds(): Buffer {
        const timeInSeconds = getCurrentTimeInSeconds();
        const arr = new Uint8Array(4);
        for (let i = 0; i < 4; i++) {
            arr[i] = ((timeInSeconds >> (i * 8)) & 255);
        }
        return Buffer.from(arr);
    }

    private static getUInt8Buffer(value: number): Buffer {
        const buffer = Buffer.allocUnsafe(1);
        buffer.writeUInt8(value);
        return buffer;
    }

    private static getUint16LEBuffer(value: number): Buffer {
        const buffer = Buffer.allocUnsafe(2);
        buffer.writeUint16LE(value);
        return buffer;
    }

    private static encodeCmdSingleUInt8(user_id: string, value: number): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(user_id));
        payload.write(this.getUInt8Buffer(value));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdWrongTryProtect(user_id: string, enabled: boolean, attempts: number, lockdownTime: number): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(user_id));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(this.getUInt8Buffer(attempts));
        payload.write(this.getUInt8Buffer(lockdownTime));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdLeftOpenAlarm(user_id: string, enabled: boolean, duration: number): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(user_id));
        payload.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        payload.write(this.getUint16LEBuffer(duration));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdDualUnlock(user_id: string, enabled: boolean): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, enabled === true ? 1 : 0);
    }

    public static encodeCmdScramblePIN(user_id: string, enabled: boolean): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, enabled === true ? 1 : 0);
    }

    public static encodeCmdPowerSave(user_id: string, enabled: boolean): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, enabled === true ? 1 : 0);
    }

    public static encodeCmdInteriorBrightness(user_id: string, interiorBrightness: number, duration: number): Buffer {
        let convertedinteriorBrightness = 0;
        switch (interiorBrightness) {
            case 25:
                convertedinteriorBrightness = 1;
                break;
            case 60:
                convertedinteriorBrightness = 2;
                break;
            case 100:
                convertedinteriorBrightness = 3;
                break;
        }
        const payload = new WritePayload();
        payload.write(Buffer.from(user_id));
        payload.write(this.getUInt8Buffer(convertedinteriorBrightness));
        payload.write(this.getUInt8Buffer(duration));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdTamperAlarm(user_id: string, option: number): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, option);
    }

    public static encodeCmdRemoteUnlock(user_id: string, option: number): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, option);
    }

    public static encodeCmdAlertVolume(user_id: string, volume: number): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, volume);
    }

    public static encodeCmdPromptVolume(user_id: string, volume: number): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, volume);
    }

    public static encodeCmdPushNotification(user_id: string, modes: number): Buffer {
        const payload = new WritePayload();
        payload.write(Buffer.from(user_id));
        payload.write(this.getUint16LEBuffer(modes));
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    public static encodeCmdUnlock(user_id: string): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, 1);
    }

    public static encodeCmdVerifyPIN(user_id: string, pin: string): Buffer {
        const pinBuffer = Buffer.alloc(8);
        pinBuffer.write(pin);
        const payload = new WritePayload();
        payload.write(Buffer.from(user_id));
        payload.write(pinBuffer);
        payload.write(this.getCurrentTimeInSeconds());
        return payload.getData();
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            if (property.key === CommandType.CMD_SMARTSAFE_REMOTE_OPEN_TYPE) {
                switch (property.name) {
                    case PropertyName.DeviceRemoteUnlock:
                        {
                            const booleanProperty = property as PropertyMetadataBoolean;
                            return value !== undefined ? (value === "0" || value === "1" ? true : false) : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    case PropertyName.DeviceRemoteUnlockMasterPIN:
                        {
                            const booleanProperty = property as PropertyMetadataBoolean;
                            return value !== undefined ? (value === "0" ? true : false) : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                }
            } else if (property.key === CommandType.CMD_SMARTSAFE_NOTIF) {
                const booleanProperty = property as PropertyMetadataBoolean;
                return value !== undefined ? ((Number.parseInt(value) >> SmartSafe.PUSH_NOTIFICATION_POSITION[property.name]) & 1) === 1 : booleanProperty.default !== undefined ? booleanProperty.default : false;
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("SmartSafe convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

    public shakeEvent(event: number, eventDurationSeconds: number): void {
        this.updateProperty(PropertyName.DeviceShakeAlertEvent, event);
        this.updateProperty(PropertyName.DeviceShakeAlert, true);
        this.clearEventTimeout(DeviceEvent.ShakeAlarm);
        this.eventTimeouts.set(DeviceEvent.ShakeAlarm, setTimeout(async () => {
            this.updateProperty(PropertyName.DeviceShakeAlert, false);
            this.eventTimeouts.delete(DeviceEvent.ShakeAlarm);
        }, eventDurationSeconds * 1000));
    }

    public alarm911Event(event: number, eventDurationSeconds: number): void {
        this.updateProperty(PropertyName.Device911AlertEvent, event);
        this.updateProperty(PropertyName.Device911Alert, true);
        this.clearEventTimeout(DeviceEvent.Alarm911);
        this.eventTimeouts.set(DeviceEvent.Alarm911, setTimeout(async () => {
            this.updateProperty(PropertyName.Device911Alert, false);
            this.eventTimeouts.delete(DeviceEvent.Alarm911);
        }, eventDurationSeconds * 1000));
    }

    public jammedEvent(eventDurationSeconds: number): void {
        this.updateProperty(PropertyName.DeviceJammedAlert, true);
        this.clearEventTimeout(DeviceEvent.Jammed);
        this.eventTimeouts.set(DeviceEvent.Jammed, setTimeout(async () => {
            this.updateProperty(PropertyName.DeviceJammedAlert, false);
            this.eventTimeouts.delete(DeviceEvent.Jammed);
        }, eventDurationSeconds * 1000));
    }

    public lowBatteryEvent(eventDurationSeconds: number): void {
        this.updateProperty(PropertyName.DeviceLowBatteryAlert, true);
        this.clearEventTimeout(DeviceEvent.LowBattery);
        this.eventTimeouts.set(DeviceEvent.LowBattery, setTimeout(async () => {
            this.updateProperty(PropertyName.DeviceLowBatteryAlert, false);
            this.eventTimeouts.delete(DeviceEvent.LowBattery);
        }, eventDurationSeconds * 1000));
    }

    public wrongTryProtectAlarmEvent(eventDurationSeconds: number): void {
        this.updateProperty(PropertyName.DeviceWrongTryProtectAlert, true);
        this.clearEventTimeout(DeviceEvent.WrontTryProtectAlarm);
        this.eventTimeouts.set(DeviceEvent.WrontTryProtectAlarm, setTimeout(async () => {
            this.updateProperty(PropertyName.DeviceWrongTryProtectAlert, false);
            this.eventTimeouts.delete(DeviceEvent.WrontTryProtectAlarm);
        }, eventDurationSeconds * 1000));
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.event_type !== undefined) {
            if (message.station_sn === this.getSerial()) {
                try {
                    switch (message.event_type) {
                        //TODO: Finish smart safe push notification handling implementation
                        case SmartSafeEvent.LOCK_STATUS:
                            {
                                const eventValues = message.event_value as SmartSafeEventValueDetail;

                                if (eventValues.action === 0) {
                                    this.updateRawProperty(CommandType.CMD_SMARTSAFE_LOCK_STATUS, "0", "push");
                                    /*
                                        type values:
                                            1: Unlocked by PIN
                                            2: Unlocked by User
                                            3: Unlocked by key
                                            4: Unlocked by App
                                            5: Unlocked by Dual Unlock
                                    */
                                } else if (eventValues.action === 1) {
                                    this.updateRawProperty(CommandType.CMD_SMARTSAFE_LOCK_STATUS, "1", "push");
                                } else if (eventValues.action === 2) {
                                    this.jammedEvent(eventDurationSeconds);
                                } else if (eventValues.action === 3) {
                                    this.lowBatteryEvent(eventDurationSeconds);
                                }
                                break;
                            }
                        case SmartSafeEvent.ALARM_911:
                            {
                                const eventValue = message.event_value as number;
                                this.alarm911Event(eventValue, eventDurationSeconds);
                                break;
                            }
                        case SmartSafeEvent.SHAKE_ALARM:
                            {
                                const eventValue = message.event_value as number;
                                this.shakeEvent(eventValue, eventDurationSeconds);
                                break;
                            }
                        case SmartSafeEvent.LONG_TIME_NOT_CLOSE:
                            {
                                const eventValue = message.event_value as number;
                                if (eventValue === 1) {
                                    this.updateProperty(PropertyName.DeviceLongTimeNotCloseAlert, true);
                                    this.clearEventTimeout(DeviceEvent.LongTimeNotClose);
                                    this.eventTimeouts.set(DeviceEvent.LongTimeNotClose, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DeviceLongTimeNotCloseAlert, false);
                                        this.eventTimeouts.delete(DeviceEvent.LongTimeNotClose);
                                    }, eventDurationSeconds * 1000));
                                }
                                break;
                            }
                        case SmartSafeEvent.LOW_POWER:
                            {
                                this.lowBatteryEvent(eventDurationSeconds);
                                break;
                            }
                        case SmartSafeEvent.INPUT_ERR_MAX:
                            {
                                this.wrongTryProtectAlarmEvent(eventDurationSeconds);
                                break;
                            }
                        default:
                            rootHTTPLogger.debug("SmartSafe process push notification - Unhandled smart safe notification event", message.event_type, message.event_time, message.device_sn);
                            break;
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`SmartSafe process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DeviceLocked && metadata.key === CommandType.CMD_SMARTSAFE_LOCK_STATUS) {
            this.emit("locked", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceJammedAlert) {
            this.emit("jammed", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceLowBatteryAlert) {
            this.emit("low battery", this, newValue as boolean);
        } else if (metadata.name === PropertyName.Device911Alert) {
            this.emit("911 alarm", this, newValue as boolean, this.getPropertyValue(PropertyName.Device911AlertEvent) as number);
        } else if (metadata.name === PropertyName.DeviceShakeAlert) {
            this.emit("shake alarm", this, newValue as boolean, this.getPropertyValue(PropertyName.DeviceShakeAlertEvent) as number);
        } else if (metadata.name === PropertyName.DeviceLongTimeNotCloseAlert) {
            this.emit("long time not close", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceWrongTryProtectAlert) {
            this.emit("wrong try-protect alarm", this, newValue as boolean);
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

    public isLocked(): boolean {
        return this.getPropertyValue(PropertyName.DeviceLocked) as boolean;
    }

}

export class Tracker extends Device {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<Tracker> {
        return new Tracker(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "tracker";
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case TrackerCommandType.COMMAND_NEW_LOCATION:
                    {
                        if (value !== undefined && typeof value === "string") {
                            const items = value.split(",");
                            if (items.length === 3) {
                                switch (property.name) {
                                    case PropertyName.DeviceLocationCoordinates:
                                        return `${items[1]},${items[0]}`;
                                    case PropertyName.DeviceLocationLastUpdate:
                                        return Number.parseInt(items[2]);
                                    default: break;
                                }
                            }
                        }
                        break;
                    }
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Tracker convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
    }

    public async setFindPhone(value: boolean): Promise<boolean> {
        try {
            const property = this.getPropertyMetadata(PropertyName.DeviceFindPhone);
            validValue(property, value);
            return await this.setParameters([{
                paramType: TrackerCommandType.COMMAND_TYPE_FINDMYPHONE,
                paramValue: value ? "1" : "0"
            }]);
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Tracker set find phone - Error", { error: getError(error), deviceSN: this.getSerial(), value: value });
        }
        return false;
    }

    public async setLeftBehindAlarm(value: boolean): Promise<boolean> {
        try {
            const property = this.getPropertyMetadata(PropertyName.DeviceLeftBehindAlarm);
            validValue(property, value);
            return await this.setParameters([{
                paramType: TrackerCommandType.COMMAND_ANTILOST,
                paramValue: value ? "1" : "0"
            }]);
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Tracker set left behind alarm - Error", { error: getError(error), deviceSN: this.getSerial(), value: value });
        }
        return false;
    }

    public async setTrackerType(value: TrackerType): Promise<boolean> {
        try {
            const property = this.getPropertyMetadata(PropertyName.DeviceTrackerType);
            validValue(property, value);
            return await this.setParameters([{
                paramType: TrackerCommandType.TYPE_ICON_INDEX,
                paramValue: value.toString()
            }]);
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Tracker set tracker type - Error", { error: getError(error), deviceSN: this.getSerial(), value: value });
        }
        return false;
    }

}

export class DoorbellLock extends DoorbellCamera {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<DoorbellLock> {
        const voices = await api.getVoices(device.device_sn);
        return new DoorbellLock(api, device, voices, deviceConfig);
    }

    public getStateChannel(): string {
        return "locks";
    }

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DeviceLocked) {
            this.emit("locked", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceLowBatteryAlert) {
            this.emit("low battery", this, newValue as boolean);
        } else if ((metadata.key === CommandType.CMD_DOORLOCK_GET_STATE || metadata.key === CommandType.CMD_SMARTLOCK_QUERY_STATUS) && ((oldValue !== undefined && ((oldValue === 4 && newValue !== 4) || (oldValue !== 4 && newValue === 4))) || oldValue === undefined)) {
            this.updateProperty(PropertyName.DeviceLocked, newValue === 4 ? true : false);
        }
    }

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            switch (property.key) {
                case CommandType.CMD_DEV_RECORD_AUTOSTOP:
                    return value !== undefined ? (value === "0" ? true : false) : false;
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("DoorbellLock convert raw property - Error", { error: getError(error), deviceSN: this.getSerial(), property: property, value: value });
        }
        return super.convertRawPropertyValue(property, value);
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
        return param ? (param === 4 ? true : false) : false;
    }

    public getLockStatus(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceLockStatus);
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.event_type !== undefined && message.device_sn === this.getSerial()) {
            try {
                switch (message.event_type) {
                    case LockPushEvent.APP_LOCK:
                    case LockPushEvent.AUTO_LOCK:
                    case LockPushEvent.FINGER_LOCK:
                    case LockPushEvent.KEYPAD_LOCK:
                    case LockPushEvent.MANUAL_LOCK:
                    case LockPushEvent.PW_LOCK:
                    case LockPushEvent.TEMPORARY_PW_LOCK:
                        {
                            const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
                            this.updateRawProperty(cmdType, "4", "push");

                            if (!isEmpty(message.person_name)) {
                                this.updateProperty(PropertyName.DevicePersonName, message.person_name!);
                                this.updateProperty(PropertyName.DeviceLockEventOrigin, getLockEventType(message.event_type));
                                this.clearEventTimeout(DeviceEvent.Lock);
                                this.eventTimeouts.set(DeviceEvent.Lock, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DeviceLockEventOrigin, 0);
                                    this.eventTimeouts.delete(DeviceEvent.Lock);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        }
                    case LockPushEvent.APP_UNLOCK:
                    case LockPushEvent.AUTO_UNLOCK:
                    case LockPushEvent.FINGERPRINT_UNLOCK:
                    case LockPushEvent.MANUAL_UNLOCK:
                    case LockPushEvent.PW_UNLOCK:
                    case LockPushEvent.TEMPORARY_PW_UNLOCK:
                        {
                            const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
                            this.updateRawProperty(cmdType, "3", "push");

                            if (!isEmpty(message.person_name)) {
                                this.updateProperty(PropertyName.DevicePersonName, message.person_name!);
                                this.updateProperty(PropertyName.DeviceLockEventOrigin, getLockEventType(message.event_type));
                                this.clearEventTimeout(DeviceEvent.Lock);
                                this.eventTimeouts.set(DeviceEvent.Lock, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DeviceLockEventOrigin, 0);
                                    this.eventTimeouts.delete(DeviceEvent.Lock);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        }
                    case LockPushEvent.LOCK_MECHANICAL_ANOMALY:
                    case LockPushEvent.MECHANICAL_ANOMALY:
                    case LockPushEvent.VIOLENT_DESTRUCTION:
                    case LockPushEvent.MULTIPLE_ERRORS:
                        {
                            const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
                            this.updateRawProperty(cmdType, "5", "push");
                            break;
                        }
                    case LockPushEvent.LOW_POWER:
                    case LockPushEvent.VERY_LOW_POWER:
                        this.updateProperty(PropertyName.DeviceLowBatteryAlert, true);
                        this.clearEventTimeout(DeviceEvent.LowBattery);
                        this.eventTimeouts.set(DeviceEvent.LowBattery, setTimeout(async () => {
                            this.updateProperty(PropertyName.DeviceLowBatteryAlert, false);
                            this.eventTimeouts.delete(DeviceEvent.LowBattery);
                        }, eventDurationSeconds * 1000));
                        break;
                    case LockPushEvent.DOOR_OPEN_LEFT: //TODO: Implement event
                        break;
                    case LockPushEvent.DOOR_TAMPER: //TODO: Implement event
                        break;
                    case LockPushEvent.DOOR_STATE_ERROR: //TODO: Implement event
                        break;
                    default:
                        rootHTTPLogger.debug("DoorbellLock process push notification - Unhandled lock notification event", { eventType: message.event_type, eventTime: message.event_time, deviceSN: this.getSerial() });
                        break;
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.debug(`DoorbellLock process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), eventType: message.event_type, eventTime: message.event_time, eventDurationSeconds: eventDurationSeconds });
            }
        }
    }

}
export class SmartDrop extends Camera {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<SmartDrop> {
        return new SmartDrop(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "boxes";
    }

    public processPushNotification(station: Station, message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(station, message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    loadEventImage(station, this.api, this, message, this.pictureEventTimeouts);
                    if (message.event_type === CusPushEvent.SMART_DROP) {
                        switch (message.open) {
                            case SmartDropOpen.OPEN:
                                // Open
                                this.updateRawProperty(CommandType.CMD_SMART_DROP_OPEN, "1", "push");
                                switch (message.openType) {
                                    case SmartDropOpenedBy.APP:
                                        // Open remotely via App
                                        this.updateProperty(PropertyName.DeviceOpenedByType, 1);
                                        break;
                                    case SmartDropOpenedBy.PIN:
                                        // Open with PIN
                                        if (message.pin === "0") {
                                            // Master PIN
                                            this.updateProperty(PropertyName.DeviceOpenedByType, 2);
                                        } else {
                                            // Delivery PIN
                                            // who: message.person_name
                                            this.updateProperty(PropertyName.DeviceOpenedByType, 3);
                                            this.updateProperty(PropertyName.DeviceOpenedByName, message.person_name !== undefined ? message.person_name : "");
                                        }
                                        break;
                                    case SmartDropOpenedBy.WITHOUT_KEY:
                                        // Opened without key
                                        this.updateProperty(PropertyName.DeviceOpenedByType, 4);
                                        break;
                                    case SmartDropOpenedBy.EMERGENCY_RELEASE_BUTTON:
                                        // Opened via emergency release button
                                        this.updateProperty(PropertyName.DeviceOpenedByType, 5);
                                        break;
                                    case SmartDropOpenedBy.KEY:
                                        // Opened with key
                                        this.updateProperty(PropertyName.DeviceOpenedByType, 6);
                                        break;
                                    default:
                                        rootHTTPLogger.debug("SmartDrop process push notification - Unhandled SmartDrop push event (openType)", message);
                                        break;
                                }
                                break;
                            case SmartDropOpen.CLOSED:
                                // Closed
                                this.updateRawProperty(CommandType.CMD_SMART_DROP_OPEN, "0", "push");
                                break;
                            case SmartDropOpen.LID_STUCK:
                                // The lid may be stuck
                                this.updateProperty(PropertyName.DeviceLidStuckAlert, true);
                                this.clearEventTimeout(DeviceEvent.LidStuckAlert);
                                this.eventTimeouts.set(DeviceEvent.LidStuckAlert, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceLidStuckAlert, false);
                                    this.eventTimeouts.delete(DeviceEvent.LidStuckAlert);
                                }, eventDurationSeconds * 1000));
                                break;
                            case SmartDropOpen.PIN_INCORRECT:
                                // Someone had entered incorrect PIN
                                this.updateProperty(PropertyName.DevicePinIncorrectAlert, true);
                                this.clearEventTimeout(DeviceEvent.PinIncorrectAlert);
                                this.eventTimeouts.set(DeviceEvent.PinIncorrectAlert, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePinIncorrectAlert, false);
                                    this.eventTimeouts.delete(DeviceEvent.PinIncorrectAlert);
                                }, eventDurationSeconds * 1000));
                                break;
                            case SmartDropOpen.LEFT_OPENED:
                                // Has been left opened for 1 minute
                                this.updateProperty(PropertyName.DeviceLongTimeNotCloseAlert, true);
                                this.clearEventTimeout(DeviceEvent.LongTimeNotClose);
                                this.eventTimeouts.set(DeviceEvent.LongTimeNotClose, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceLongTimeNotCloseAlert, false);
                                    this.eventTimeouts.delete(DeviceEvent.LongTimeNotClose);
                                }, eventDurationSeconds * 1000));
                                break;
                            case SmartDropOpen.LOW_TEMPERATURE_WARNING:
                                // Low temperature warning
                                this.updateProperty(PropertyName.DeviceLowTemperatureAlert, true);
                                this.clearEventTimeout(DeviceEvent.LowTemperatureAlert);
                                this.eventTimeouts.set(DeviceEvent.LowTemperatureAlert, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceLowTemperatureAlert, false);
                                    this.eventTimeouts.delete(DeviceEvent.LowTemperatureAlert);
                                }, eventDurationSeconds * 1000));
                                break;
                            default:
                                rootHTTPLogger.debug("SmartDrop process push notification - Unhandled SmartDrop push event (1)", message);
                                break;
                        }
                    } else if (message.event_type !== 0) {
                        switch (message.event_type) {
                            case SmartDropPushEvent.LOW_BATTERY:
                                // Low battery warning
                                this.updateProperty(PropertyName.DeviceLowBatteryAlert, true);
                                this.clearEventTimeout(DeviceEvent.LowBattery);
                                this.eventTimeouts.set(DeviceEvent.LowBattery, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceLowBatteryAlert, false);
                                    this.eventTimeouts.delete(DeviceEvent.LowBattery);
                                }, eventDurationSeconds * 1000));
                                break;
                            case SmartDropPushEvent.OVERHEATING_WARNING:
                                // Overheating warning
                                this.updateProperty(PropertyName.DeviceHighTemperatureAlert, true);
                                this.clearEventTimeout(DeviceEvent.HighTemperatureAlert);
                                this.eventTimeouts.set(DeviceEvent.HighTemperatureAlert, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceHighTemperatureAlert, false);
                                    this.eventTimeouts.delete(DeviceEvent.HighTemperatureAlert);
                                }, eventDurationSeconds * 1000));
                                break;
                            case SmartDropPushEvent.TAMPERED_WARNING:
                                if (message.type === 2) {
                                    // Warning have been tampered
                                    this.updateProperty(PropertyName.DeviceTamperingAlert, true);
                                    this.clearEventTimeout(DeviceEvent.TamperingAlert);
                                    this.eventTimeouts.set(DeviceEvent.TamperingAlert, setTimeout(async () => {
                                        this.updateProperty(PropertyName.DeviceTamperingAlert, false);
                                        this.eventTimeouts.delete(DeviceEvent.TamperingAlert);
                                    }, eventDurationSeconds * 1000));
                                }
                                break;
                            case SmartDropPushEvent.BATTERY_FULLY_CHARGED:
                                // Battery fully charged
                                this.updateProperty(PropertyName.DeviceBatteryFullyChargedAlert, true);
                                this.clearEventTimeout(DeviceEvent.BatteryFullyChargedAlert);
                                this.eventTimeouts.set(DeviceEvent.BatteryFullyChargedAlert, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceBatteryFullyChargedAlert, false);
                                    this.eventTimeouts.delete(DeviceEvent.BatteryFullyChargedAlert);
                                }, eventDurationSeconds * 1000));
                                break;
                            case SmartDropPushEvent.PERSON_DETECTED:
                                //Someone has been spotted
                                this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                                this.updateProperty(PropertyName.DevicePersonDetected, true);
                                this.clearEventTimeout(DeviceEvent.PersonDetected);
                                this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DevicePersonDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                                }, eventDurationSeconds * 1000));
                                break;
                            default:
                                rootHTTPLogger.debug("SmartDrop process push notification - Unhandled SmartDrop push event (2)", message);
                        }
                    } else {
                        rootHTTPLogger.debug("SmartDrop process push notification - Unhandled SmartDrop push event type", message);
                    }
                } catch (err) {
                    const error = ensureError(err);
                    rootHTTPLogger.debug(`SmartDrop process push notification - Error`, { error: getError(error), deviceSN: this.getSerial(), message: JSON.stringify(message), eventDurationSeconds: eventDurationSeconds });
                }
            }
        }
    }

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DeviceOpen) {
            const open = (newValue as boolean);
            if (open === false) {
                this.updateProperty(PropertyName.DeviceOpenedByType, 0);
                this.updateProperty(PropertyName.DeviceOpenedByName, "");
            }
            this.emit("open", this, open);
        } else if (metadata.name === PropertyName.DeviceDeliveries) {
            this.updateProperty(PropertyName.DevicePackageDelivered, newValue as number > 0);
        } else if (metadata.name === PropertyName.DevicePackageDelivered) {
            this.emit("package delivered", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceLowBatteryAlert) {
            this.emit("low battery", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceTamperingAlert) {
            this.emit("tampering", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceLongTimeNotCloseAlert) {
            this.emit("long time not close", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceLowTemperatureAlert) {
            this.emit("low temperature", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceHighTemperatureAlert) {
            this.emit("high temperature", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DevicePinIncorrectAlert) {
            this.emit("pin incorrect", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceLidStuckAlert) {
            this.emit("lid stuck", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceBatteryFullyChargedAlert) {
            this.emit("battery fully charged", this, newValue as boolean);
        }
    }
}

export class UnknownDevice extends Device {

    static async getInstance(api: HTTPApi, device: DeviceListResponse, deviceConfig: DeviceConfig): Promise<UnknownDevice> {
        return new UnknownDevice(api, device, deviceConfig);
    }

    public getStateChannel(): string {
        return "unknown";
    }

}
