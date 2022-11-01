import { TypedEmitter } from "tiny-typed-emitter";
import { Logger } from "ts-log";

import { HTTPApi } from "./api";
import { CommandName, DeviceCommands, DeviceEvent, DeviceProperties, DeviceType, FloodlightMotionTriggeredDistance, GenericDeviceProperties, ParamType, PropertyName } from "./types";
import { ResultResponse, StreamResponse, DeviceListResponse, Voice } from "./models"
import { ParameterHelper } from "./parameter";
import { DeviceEvents, PropertyValue, PropertyValues, PropertyMetadataAny, IndexedProperty, RawValues, PropertyMetadataNumeric, PropertyMetadataBoolean, PropertyMetadataString } from "./interfaces";
import { CommandType, ESLAnkerBleConstant } from "../p2p/types";
import { calculateWifiSignalLevel, getAbsoluteFilePath, getCurrentTimeInSeconds, getDistances, SmartSafeByteWriter } from "./utils";
import { eslTimestamp } from "../p2p/utils";
import { CusPushEvent, DoorbellPushEvent, LockPushEvent, IndoorPushEvent, SmartSafeEvent } from "../push/types";
import { PushMessage, SmartSafeEventValueDetail } from "../push/models";
import { isEmpty } from "../utils";
import { InvalidPropertyError, PropertyNotSupportedError } from "./error";
import { DeviceSmartLockNotifyData } from "../mqtt/model";
import { Voices } from ".";

export class Device extends TypedEmitter<DeviceEvents> {

    protected api: HTTPApi;
    protected rawDevice: DeviceListResponse;
    protected log: Logger;
    protected eventTimeouts = new Map<DeviceEvent, NodeJS.Timeout>();

    protected properties: PropertyValues = {};
    private rawProperties: RawValues = {};
    private ready = false;

    protected constructor(api: HTTPApi, device: DeviceListResponse) {
        super();
        this.api = api;
        this.rawDevice = device;
        this.log = api.getLog();
    }

    protected initializeState(): void {
        this.update(this.rawDevice);
        this.ready = true;
        setImmediate(() => {
            this.emit("ready", this);
        });
    }

    public getRawDevice(): DeviceListResponse {
        return this.rawDevice;
    }

    public update(device: DeviceListResponse, cloudOnlyProperties = false): void {
        this.rawDevice = device;
        const metadata = this.getPropertiesMetadata();
        for (const property of Object.values(metadata)) {
            if (this.rawDevice[property.key] !== undefined && typeof property.key === "string") {
                this.updateProperty(property.name, this.rawDevice[property.key] as PropertyValue);
            } else if (this.properties[property.name] === undefined && property.default !== undefined && !this.ready) {
                this.updateProperty(property.name, property.default);
            }
        }
        if (!cloudOnlyProperties) {
            this.rawDevice.params.forEach(param => {
                this.updateRawProperty(param.param_type, param.param_value);
            });
        }
        this.log.debug("Normalized Properties", { deviceSN: this.getSerial(), properties: this.properties });
    }

    public updateProperty(name: string, value: PropertyValue): boolean {
        if ((this.properties[name] !== undefined && this.properties[name] !== value)
            || this.properties[name] === undefined) {
            const oldValue = this.properties[name];
            this.properties[name] = value;
            if (!name.startsWith("hidden-")) {
                if (this.ready)
                    this.emit("property changed", this, name, value);
            }
            try {
                this.handlePropertyChange(this.getPropertyMetadata(name), oldValue, this.properties[name]);
            } catch (error) {
                if (error instanceof InvalidPropertyError) {
                    this.log.error(`Invalid Property ${name} error`, error);
                } else {
                    this.log.error(`Property  ${name} error`, error);
                }
            }
            /*} catch (error) {
                this.log.error("updateProperty Error:", { name: name, value: value, error: error });
            }*/
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
    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        if ((metadata.key === ParamType.DETECT_MOTION_SENSITIVE || metadata.key === ParamType.DETECT_MODE) && this.isWiredDoorbell()) {
            //TODO: Not perfectly solved, can in certain cases briefly trigger a double event where the last event is the correct one
            const rawSensitivity = this.getRawProperty(ParamType.DETECT_MOTION_SENSITIVE);
            const rawMode = this.getRawProperty(ParamType.DETECT_MODE);

            if (rawSensitivity !== undefined && rawMode !== undefined) {
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
        } else if (metadata.name === PropertyName.DeviceWifiRSSI) {
            this.updateProperty(PropertyName.DeviceWifiSignalLevel, calculateWifiSignalLevel(this, newValue as number));
        }
    }

    public updateRawProperty(type: number, value: string): boolean {
        const parsedValue = ParameterHelper.readValue(type, value, this.log);
        if ((this.rawProperties[type] !== undefined && this.rawProperties[type] !== parsedValue)
            || this.rawProperties[type] === undefined) {

            this.rawProperties[type] = parsedValue;
            if (this.ready)
                this.emit("raw property changed", this, type, this.rawProperties[type] as string);

            const metadata = this.getPropertiesMetadata();

            for (const property of Object.values(metadata)) {
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

    protected convertRawPropertyValue(property: PropertyMetadataAny, value: string): PropertyValue {
        try {
            if (property.key === ParamType.PRIVATE_MODE || property.key === ParamType.OPEN_DEVICE || property.key === CommandType.CMD_DEVS_SWITCH) {
                if (this.isIndoorCamera() || this.isWiredDoorbell() || this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8422 || this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8424) {
                    return value !== undefined ? (value === "true" ? true : false) : false;
                }
                return value !== undefined ? (value === "0" ? true : false) : false;
            } else if (property.key === CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE) {
                switch (property.name) {
                    case PropertyName.DeviceNotificationRing: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined ? (Number.parseInt((value as any).notification_ring_onoff) === 1 ? true : false) : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (error) {
                            this.log.error("Convert CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE DeviceNotificationRing Error:", { property: property, value: value, error: error });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceNotificationMotion: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined ? (Number.parseInt((value as any).notification_motion_onoff) === 1 ? true : false) : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (error) {
                            this.log.error("Convert CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE DeviceNotificationMotion Error:", { property: property, value: value, error: error });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceNotificationType: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return value !== undefined ? Number.parseInt((value as any).notification_style) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        } catch (error) {
                            this.log.error("Convert CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE DeviceNotificationType Error:", { property: property, value: value, error: error });
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
                } catch (error) {
                    this.log.error("Convert DOORBELL_NOTIFICATION_OPEN Error:", { property: property, value: value, error: error });
                    return false;
                }
            } else if (property.key === CommandType.CMD_SET_PIRSENSITIVITY) {
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
                    }
                } catch (error) {
                    this.log.error("Convert CMD_SET_PIRSENSITIVITY Error:", { property: property, value: value, error: error });
                    return value;
                }
            } else if (property.key === CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_STARTTIME || property.key === CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_ENDTIME) {
                const tmpBuffer = Buffer.from(value, "hex")
                return `${tmpBuffer.slice(0, 1).readInt8().toString().padStart(2, "0")}:${tmpBuffer.slice(1).readInt8().toString().padStart(2, "0")}`;
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
                } catch (error) {
                    this.log.error(`Convert CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY ${property.name} Error:`, { property: property, value: value, error: error });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE) {
                switch (property.name) {
                    case PropertyName.DeviceLoiteringCustomResponseTimeFrom:{
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any).setting !== undefined && (value as any).setting.length > 0 !== undefined && (value as any).setting[0].start_hour !== undefined && (value as any).setting[0].start_min !== undefined) ? `${(value as any).setting[0].start_hour.padStart(2, "0")}:${(value as any).setting[0].start_min.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseTimeFrom Error:", { property: property, value: value, error: error });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponseTimeTo:{
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any).setting !== undefined && (value as any).setting.length > 0 !== undefined && (value as any).setting[0].end_hour !== undefined && (value as any).setting[0].end_min !== undefined) ? `${(value as any).setting[0].end_hour.padStart(2, "0")}:${(value as any).setting[0].end_min.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseTimeTo Error:", { property: property, value: value, error: error });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponsePhoneNotification: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any).setting[0].push_notify === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponsePhoneNotification Error:", { property: property, value: value, error: error });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any).setting[0].homebase_alert === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseHomeBaseNotification Error:", { property: property, value: value, error: error });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any).setting[0].auto_voice_resp === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseAutoVoiceResponse Error:", { property: property, value: value, error: error });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice:{
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return ((value as any).setting !== undefined && (value as any).setting.length > 0 !== undefined && (value as any).setting[0].auto_voice_id !== undefined) ? (value as any).setting[0].auto_voice_id : numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE DeviceLoiteringCustomResponseAutoVoiceResponseVoice Error:", { property: property, value: value, error: error });
                            return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        }
                    }
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH) {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return value !== undefined && (value as any).ai_bottom_switch !== undefined ? (value as any).ai_bottom_switch === 1024 : (booleanProperty.default !== undefined ? booleanProperty.default : false);
                } catch (error) {
                    this.log.error("Convert CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH Error:", { property: property, value: value, error: error });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME) {
                const stringProperty = property as PropertyMetadataString;
                try {
                    return ((value as any).start_h !== undefined && (value as any).start_m !== undefined) ? `${(value as any).start_h.toString().padStart(2, "0")}:${(value as any).start_m.toString().padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                } catch (error) {
                    this.log.error("Convert CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME Error:", { property: property, value: value, error: error });
                    return stringProperty.default !== undefined ? stringProperty.default : "";
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE) {
                switch (property.name) {
                    case PropertyName.DeviceRingAutoResponse: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any).setting[0].active === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponse Error:", { property: property, value: value, error: error });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceRingAutoResponseVoiceResponse: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return (value as any).setting[0].active === 1 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponseVoiceResponse Error:", { property: property, value: value, error: error });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceRingAutoResponseTimeFrom:{
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any).setting !== undefined && (value as any).setting.length > 0 !== undefined && (value as any).setting[0].start_hour !== undefined && (value as any).setting[0].start_min !== undefined) ? `${(value as any).setting[0].start_hour.padStart(2, "0")}:${(value as any).setting[0].start_min.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponseTimeFrom Error:", { property: property, value: value, error: error });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceRingAutoResponseTimeTo:{
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any).setting !== undefined && (value as any).setting.length > 0 !== undefined && (value as any).setting[0].end_hour !== undefined && (value as any).setting[0].end_min !== undefined) ? `${(value as any).setting[0].end_hour.padStart(2, "0")}:${(value as any).setting[0].end_min.padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponseTimeTo Error:", { property: property, value: value, error: error });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceRingAutoResponseVoiceResponseVoice:{
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return ((value as any).setting !== undefined && (value as any).setting.length > 0 !== undefined && (value as any).setting[0].auto_voice_id !== undefined) ? (value as any).setting[0].auto_voice_id : numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE DeviceRingAutoResponseVoiceResponseVoice Error:", { property: property, value: value, error: error });
                            return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        }
                    }
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME) {
                switch (property.name) {
                    case PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom:{
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any).start_h !== undefined && (value as any).start_m !== undefined) ? `${(value as any).start_h.toString().padStart(2, "0")}:${(value as any).start_m.toString().padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME DeviceDeliveryGuardPackageGuardingActivatedTimeFrom Error:", { property: property, value: value, error: error });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                    case PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo:{
                        const stringProperty = property as PropertyMetadataString;
                        try {
                            return ((value as any).end_h !== undefined && (value as any).end_m !== undefined) ? `${(value as any).end_h.toString().padStart(2, "0")}:${(value as any).end_m.toString().padStart(2, "0")}` : stringProperty.default !== undefined ? stringProperty.default : "";
                        } catch (error) {
                            this.log.error("Convert CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME DeviceDeliveryGuardPackageGuardingActivatedTimeTo Error:", { property: property, value: value, error: error });
                            return stringProperty.default !== undefined ? stringProperty.default : "";
                        }
                    }
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined && (value as any).radar_wd_distance !== undefined ? (value as any).radar_wd_distance as number : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (error) {
                    this.log.error("Convert CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE Error:", { property: property, value: value, error: error });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_TIME) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined && (value as any).radar_wd_time !== undefined ? (value as any).radar_wd_time as number : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (error) {
                    this.log.error("Convert CMD_DOORBELL_DUAL_RADAR_WD_TIME Error:", { property: property, value: value, error: error });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE) {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined && (value as any).auto_voice_id !== undefined ? (value as any).auto_voice_id as number : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (error) {
                    this.log.error("Convert CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE Error:", { property: property, value: value, error: error });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.key === CommandType.CMD_SET_SNOOZE_MODE) {
                switch (property.name) {
                    case PropertyName.DeviceSnooze: {
                        const booleanProperty = property as PropertyMetadataBoolean;
                        try {
                            return value !== undefined && (value as any).snooze_time !== undefined && (value as any).snooze_time !== "" && Number.parseInt((value as any).snooze_time) !== 0 ? true : booleanProperty.default !== undefined ? booleanProperty.default : false;
                        } catch (error) {
                            this.log.error("Convert CMD_SET_SNOOZE_MODE DeviceSnooze Error:", { property: property, value: value, error: error });
                            return booleanProperty.default !== undefined ? booleanProperty.default : false;
                        }
                    }
                    case PropertyName.DeviceSnoozeTime: {
                        const numericProperty = property as PropertyMetadataNumeric;
                        try {
                            return value !== undefined && (value as any).snooze_time !== undefined && (value as any).snooze_time !== "" ? Number.parseInt((value as any).snooze_time) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                        } catch (error) {
                            this.log.error("Convert CMD_SET_SNOOZE_MODE DeviceSnoozeTime Error:", { property: property, value: value, error: error });
                            return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                        }
                    }
                }
            } else if (property.type === "number") {
                const numericProperty = property as PropertyMetadataNumeric;
                try {
                    return value !== undefined ? Number.parseInt(value) : (numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0));
                } catch (error) {
                    this.log.warn("PropertyMetadataNumeric Convert Error:", { property: property, value: value, error: error });
                    return numericProperty.default !== undefined ? numericProperty.default : (numericProperty.min !== undefined ? numericProperty.min : 0);
                }
            } else if (property.type === "boolean") {
                const booleanProperty = property as PropertyMetadataBoolean;
                try {
                    return value !== undefined ? (value === "1" || value.toLowerCase() === "true" ? true : false) : (booleanProperty.default !== undefined ? booleanProperty.default : false);
                } catch (error) {
                    this.log.warn("PropertyMetadataBoolean Convert Error:", { property: property, value: value, error: error });
                    return booleanProperty.default !== undefined ? booleanProperty.default : false;
                }
            } else if (property.type === "string") {
                const stringProperty = property as PropertyMetadataString;
                return value !== undefined ? value : (stringProperty.default !== undefined ? stringProperty.default : "");
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
        return this.properties[name];
    }

    public hasPropertyValue(name: string): boolean {
        return this.getPropertyValue(name) !== undefined;
    }

    public getRawProperty(type: number): string {
        return this.rawProperties[type];
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

    public getPropertiesMetadata(): IndexedProperty {
        const metadata = DeviceProperties[this.getDeviceType()];
        if (metadata === undefined)
            return GenericDeviceProperties;
        return metadata;
    }

    public hasProperty(name: string): boolean {
        return this.getPropertiesMetadata()[name] !== undefined;
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

    public processPushNotification(_message: PushMessage, _eventDurationSeconds: number): void {
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
            type == DeviceType.BATTERY_DOORBELL_PLUS ||
            type == DeviceType.DOORBELL_SOLO ||
            type == DeviceType.CAMERA2C_PRO ||
            type == DeviceType.CAMERA2_PRO ||
            type == DeviceType.INDOOR_CAMERA_1080 ||
            type == DeviceType.INDOOR_PT_CAMERA_1080 ||
            type == DeviceType.SOLO_CAMERA ||
            type == DeviceType.SOLO_CAMERA_PRO ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_1080 ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_2K ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_1080P ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT ||
            type == DeviceType.INDOOR_OUTDOOR_CAMERA_2K ||
            type == DeviceType.INDOOR_COST_DOWN_CAMERA ||
            type == DeviceType.FLOODLIGHT_CAMERA_8422 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8423 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8424)
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
            type == DeviceType.CAMERA2C_PRO ||
            type == DeviceType.CAMERA2_PRO ||
            type == DeviceType.SOLO_CAMERA ||
            type == DeviceType.SOLO_CAMERA_PRO ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_1080 ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_2K ||
            type == DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR ||
            type == DeviceType.LOCK_WIFI ||
            type == DeviceType.LOCK_WIFI_NO_FINGER ||
            type == DeviceType.SMART_SAFE_7400 ||
            type == DeviceType.SMART_SAFE_7401 ||
            type == DeviceType.SMART_SAFE_7402 ||
            type == DeviceType.SMART_SAFE_7403)
            //TODO: Add other battery devices
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
            type == DeviceType.BATTERY_DOORBELL_2 ||
            type == DeviceType.BATTERY_DOORBELL_PLUS ||
            type == DeviceType.DOORBELL_SOLO)
            return true;
        return false;
    }

    static isWiredDoorbell(type: number): boolean {
        if (type == DeviceType.DOORBELL)
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
            type == DeviceType.INDOOR_COST_DOWN_CAMERA)
            return true;
        return false;
    }

    static isPanAndTiltCamera(type: number): boolean {
        if (type == DeviceType.INDOOR_PT_CAMERA ||
            type == DeviceType.INDOOR_PT_CAMERA_1080 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8423 ||
            type == DeviceType.INDOOR_COST_DOWN_CAMERA)
            return true;
        return false;
    }

    static isFloodLight(type: number): boolean {
        if (type == DeviceType.FLOODLIGHT ||
            type == DeviceType.FLOODLIGHT_CAMERA_8422 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8423 ||
            type == DeviceType.FLOODLIGHT_CAMERA_8424)
            return true;
        return false;
    }

    static isLock(type: number): boolean {
        return Device.isLockBle(type) || Device.isLockWifi(type) || Device.isLockBleNoFinger(type) || Device.isLockWifiNoFinger(type);
    }

    static isLockBle(type: number): boolean {
        return DeviceType.LOCK_BLE == type;
    }

    static isLockBleNoFinger(type: number): boolean {
        return DeviceType.LOCK_BLE_NO_FINGER == type;
    }

    static isLockWifi(type: number): boolean {
        return DeviceType.LOCK_WIFI == type;
    }

    static isLockWifiNoFinger(type: number): boolean {
        return DeviceType.LOCK_WIFI_NO_FINGER == type;
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

    static isDoorbellDual(type: number): boolean {
        return DeviceType.DOORBELL_SOLO == type;
    }

    static isBatteryDoorbell(type: number): boolean {
        if (type == DeviceType.BATTERY_DOORBELL ||
            type == DeviceType.BATTERY_DOORBELL_2 ||
            type == DeviceType.BATTERY_DOORBELL_PLUS)
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

    static isSoloCameras(type: number): boolean {
        return Device.isSoloCamera(type) ||
            Device.isSoloCameraPro(type) ||
            Device.isSoloCameraSpotlight1080(type) ||
            Device.isSoloCameraSpotlight2k(type) ||
            Device.isSoloCameraSpotlightSolar(type);
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

    static isIntegratedDeviceBySn(sn: string): boolean {
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
            sn.startsWith("T8124");
    }

    public isCamera(): boolean {
        return Device.isCamera(this.rawDevice.device_type);
    }

    public isFloodLight(): boolean {
        return Device.isFloodLight(this.rawDevice.device_type);
    }

    public isDoorbell(): boolean {
        return Device.isDoorbell(this.rawDevice.device_type);
    }

    public isWiredDoorbell(): boolean {
        return Device.isWiredDoorbell(this.rawDevice.device_type);
    }

    public isWiredDoorbellDual(): boolean {
        return Device.isWiredDoorbellDual(this.rawDevice.device_type);
    }

    public isLock(): boolean {
        return Device.isLock(this.rawDevice.device_type);
    }

    public isLockBle(): boolean {
        return Device.isLockBle(this.rawDevice.device_type);
    }

    public isLockBleNoFinger(): boolean {
        return Device.isLockBleNoFinger(this.rawDevice.device_type);
    }

    public isLockWifi(): boolean {
        return Device.isLockWifi(this.rawDevice.device_type);
    }

    public isLockWifiNoFinger(): boolean {
        return Device.isLockWifiNoFinger(this.rawDevice.device_type);
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

    public isSmartDrop(): boolean {
        return Device.isSmartDrop(this.rawDevice.device_type);
    }

    public isSmartSafe(): boolean {
        return Device.isSmartSafe(this.rawDevice.device_type);
    }

    public isIntegratedDevice(): boolean {
        if (this.isLock() || this.isSmartDrop()) {
            return this.rawDevice.device_sn === this.rawDevice.station_sn;
        }
        return this.isWiredDoorbellDual() || this.isFloodLight() ||this.isWiredDoorbell() || this.isIndoorCamera() || this.isSoloCameras();
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

    private _isStreaming = false;

    protected constructor(api: HTTPApi, device: DeviceListResponse) {
        super(api, device);

        this.properties[PropertyName.DeviceMotionDetected] = false ;
        this.properties[PropertyName.DevicePersonDetected] = false ;
        this.properties[PropertyName.DevicePersonName] = "";
    }

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<Camera> {
        const camera = new Camera(api, device);
        camera.initializeState();
        return camera;
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
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
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
        await this.setParameters([{ paramType: ParamType.DETECT_SWITCH, paramValue: 1 }]).catch(error => {
            this.log.error("Error:", error);
        });
    }

    public async startStream(): Promise<string> {
        // Start the camera stream and return the RTSP URL.
        try {
            const response = await this.api.request({
                method: "post",
                endpoint: "v1/web/equipment/start_stream",
                data: {
                    device_sn: this.rawDevice.device_sn,
                    station_sn: this.rawDevice.station_sn,
                    proto: 2
                }
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
                    this.log.error("Response code not ok", { code: result.code, msg: result.msg });
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
            const response = await this.api.request({
                method: "post",
                endpoint: "v1/web/equipment/stop_stream",
                data: {
                    device_sn: this.rawDevice.device_sn,
                    station_sn: this.rawDevice.station_sn,
                    proto: 2
                }
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
                    this.log.error("Response code not ok", { code: result.code, msg: result.msg });
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
        if (metadata.name === PropertyName.DevicePersonDetected) {
            this.emit("person detected", this, newValue as boolean, this.getPropertyValue(PropertyName.DevicePersonName) as string);
        } else if (metadata.name === PropertyName.DeviceMotionDetected) {
            this.emit("motion detected", this, newValue as boolean);
        }
    }

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.SECURITY && message.device_sn === this.getSerial()) {
                try {
                    if (message.fetch_id !== undefined) {
                        // Person or someone identified
                        if (message.push_count === 1 || message.push_count === undefined) {
                            this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                            if (!isEmpty(message.pic_url))
                                this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                            this.updateProperty(PropertyName.DevicePersonDetected, true);
                            this.clearEventTimeout(DeviceEvent.PersonDetected);
                            this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DevicePersonName, "");
                                this.updateProperty(PropertyName.DevicePersonDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                            }, eventDurationSeconds * 1000));
                        }
                    } else {
                        // Motion detected
                        if (message.push_count === 1 || message.push_count === undefined) {
                            if (!isEmpty(message.pic_url))
                                this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                            this.updateProperty(PropertyName.DeviceMotionDetected, true);
                            this.clearEventTimeout(DeviceEvent.MotionDetected);
                            this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                            }, eventDurationSeconds * 1000));
                        }
                    }
                } catch (error) {
                    this.log.debug(`CusPushEvent.SECURITY - Device: ${message.device_sn} Error:`, error);
                }
            }
        }
    }

}

export class SoloCamera extends Camera {

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<SoloCamera> {
        const camera = new SoloCamera(api, device);
        camera.initializeState();
        return camera;
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

    public isMotionDetectionEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceMotionDetection);
    }

    /*protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
    }*/

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    switch (message.event_type) {
                        case IndoorPushEvent.MOTION_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case IndoorPushEvent.FACE_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DevicePersonDetected, true);
                                this.clearEventTimeout(DeviceEvent.PersonDetected);
                                this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DevicePersonDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        default:
                            this.log.debug("Unhandled solo camera push event", message);
                            break;
                    }
                } catch (error) {
                    this.log.debug(`SoloPushEvent - Device: ${message.device_sn} Error:`, error);
                }
            }
        }
    }

}

export class IndoorCamera extends Camera {

    protected constructor(api: HTTPApi, device: DeviceListResponse) {
        super(api, device);

        this.properties[PropertyName.DevicePetDetected] = false;
        this.properties[PropertyName.DeviceSoundDetected] = false;
        this.properties[PropertyName.DeviceCryingDetected] = false;
    }

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<IndoorCamera> {
        const camera = new IndoorCamera(api, device);
        camera.initializeState();
        return camera;
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

    protected handlePropertyChange(metadata: PropertyMetadataAny, oldValue: PropertyValue, newValue: PropertyValue): void {
        super.handlePropertyChange(metadata, oldValue, newValue);
        if (metadata.name === PropertyName.DeviceCryingDetected) {
            this.emit("crying detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DeviceSoundDetected) {
            this.emit("sound detected", this, newValue as boolean);
        } else if (metadata.name === PropertyName.DevicePetDetected) {
            this.emit("pet detected", this, newValue as boolean);
        }
    }

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    switch (message.event_type) {
                        case IndoorPushEvent.MOTION_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case IndoorPushEvent.FACE_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DevicePersonDetected, true);
                                this.clearEventTimeout(DeviceEvent.PersonDetected);
                                this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DevicePersonDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case IndoorPushEvent.CRYING_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DeviceCryingDetected, true);
                                this.clearEventTimeout(DeviceEvent.CryingDetected);
                                this.eventTimeouts.set(DeviceEvent.CryingDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceCryingDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.CryingDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case IndoorPushEvent.SOUND_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DeviceSoundDetected, true);
                                this.clearEventTimeout(DeviceEvent.SoundDetected);
                                this.eventTimeouts.set(DeviceEvent.SoundDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceSoundDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.SoundDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case IndoorPushEvent.PET_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DevicePetDetected, true);
                                this.clearEventTimeout(DeviceEvent.PetDetected);
                                this.eventTimeouts.set(DeviceEvent.PetDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePetDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.PetDetected);
                                }, eventDurationSeconds * 1000));
                            }
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

    protected voices: Voices;

    protected constructor(api: HTTPApi, device: DeviceListResponse, voices: Voices) {
        super(api, device);

        this.voices = voices;
        this.properties[PropertyName.DeviceRinging] = false;
    }

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<DoorbellCamera> {
        const voices = await api.getVoices(device.device_sn);
        const camera = new DoorbellCamera(api, device, voices);
        camera.initializeState();
        return camera;
    }

    private loadMetadataVoiceStates(propertyName: string, metadata: IndexedProperty): IndexedProperty {
        if (metadata[propertyName] !== undefined) {
            const states:Record<number, string> = {};
            for(const voice of Object.values(this.voices) as Voice[]) {
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

    public getPropertiesMetadata(): IndexedProperty {
        let metadata = super.getPropertiesMetadata();
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

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    switch (message.event_type) {
                        case DoorbellPushEvent.MOTION_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DeviceMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.MotionDetected);
                                this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.MotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.FACE_DETECTION:
                        case DoorbellPushEvent.FAMILY_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                this.updateProperty(PropertyName.DevicePersonName, !isEmpty(message.person_name) ? message.person_name! : "Unknown");
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DevicePersonDetected, true);
                                this.clearEventTimeout(DeviceEvent.PersonDetected);
                                this.eventTimeouts.set(DeviceEvent.PersonDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePersonName, "");
                                    this.updateProperty(PropertyName.DevicePersonDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.PersonDetected);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.PRESS_DOORBELL:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DeviceRinging, true);
                                this.clearEventTimeout(DeviceEvent.Ringing);
                                this.eventTimeouts.set(DeviceEvent.Ringing, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceRinging, false);
                                    this.eventTimeouts.delete(DeviceEvent.Ringing);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.PACKAGE_DELIVERED:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DevicePackageDelivered, true);
                                this.clearEventTimeout(DeviceEvent.PackageDelivered);
                                this.eventTimeouts.set(DeviceEvent.PackageDelivered, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePackageDelivered, false);
                                    this.eventTimeouts.delete(DeviceEvent.PackageDelivered);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.PACKAGE_STRANDED:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DevicePackageStranded, true);
                                this.clearEventTimeout(DeviceEvent.PackageStranded);
                                this.eventTimeouts.set(DeviceEvent.PackageStranded, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePackageStranded, false);
                                    this.eventTimeouts.delete(DeviceEvent.PackageStranded);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.PACKAGE_TAKEN:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DevicePackageTaken, true);
                                this.clearEventTimeout(DeviceEvent.PackageTaken);
                                this.eventTimeouts.set(DeviceEvent.PackageTaken, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DevicePackageTaken, false);
                                    this.eventTimeouts.delete(DeviceEvent.PackageTaken);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.SOMEONE_LOITERING:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DeviceSomeoneLoitering, true);
                                this.clearEventTimeout(DeviceEvent.SomeoneLoitering);
                                this.eventTimeouts.set(DeviceEvent.SomeoneLoitering, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceSomeoneLoitering, false);
                                    this.eventTimeouts.delete(DeviceEvent.SomeoneLoitering);
                                }, eventDurationSeconds * 1000));
                            }
                            break;
                        case DoorbellPushEvent.RADAR_MOTION_DETECTION:
                            if (message.push_count === 1 || message.push_count === undefined) {
                                if (!isEmpty(message.pic_url))
                                    this.updateProperty(PropertyName.DevicePictureUrl, message.pic_url!);
                                this.updateProperty(PropertyName.DeviceRadarMotionDetected, true);
                                this.clearEventTimeout(DeviceEvent.RadarMotionDetected);
                                this.eventTimeouts.set(DeviceEvent.RadarMotionDetected, setTimeout(async () => {
                                    this.updateProperty(PropertyName.DeviceRadarMotionDetected, false);
                                    this.eventTimeouts.delete(DeviceEvent.RadarMotionDetected);
                                }, eventDurationSeconds * 1000));
                            }
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

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<WiredDoorbellCamera> {
        const voices = await api.getVoices(device.device_sn);
        const camera = new WiredDoorbellCamera(api, device, voices);
        camera.initializeState();
        return camera;
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

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<BatteryDoorbellCamera> {
        const voices = await api.getVoices(device.device_sn);
        const camera = new BatteryDoorbellCamera(api, device, voices);
        camera.initializeState();
        return camera;
    }

    public isLedEnabled(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceStatusLed);
    }

}

export class FloodlightCamera extends Camera {

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<FloodlightCamera> {
        const camera = new FloodlightCamera(api, device);
        camera.initializeState();
        return camera;
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
                    if (this.getDeviceType() === DeviceType.FLOODLIGHT_CAMERA_8423 || this.getDeviceType() === DeviceType.FLOODLIGHT)
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
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
        }
        return super.convertRawPropertyValue(property, value);
    }

}

export class Sensor extends Device {

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<Sensor> {
        const sensor = new Sensor(api, device);
        sensor.initializeState();
        return sensor;
    }

    public getStateChannel(): string {
        return "sensors";
    }

    public getState(): PropertyValue {
        return this.getPropertyValue(PropertyName.DeviceState);
    }

}

export class EntrySensor extends Sensor {

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<EntrySensor> {
        const sensor = new EntrySensor(api, device);
        sensor.initializeState();
        return sensor;
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
                try {
                    if (message.sensor_open !== undefined) {
                        this.updateRawProperty(CommandType.CMD_ENTRY_SENSOR_STATUS, message.sensor_open ? "1" : "0");
                    }
                } catch (error) {
                    this.log.debug(`CusPushEvent.DOOR_SENSOR - Device: ${message.device_sn} Error:`, error);
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

    protected constructor(api: HTTPApi, device: DeviceListResponse) {
        super(api, device);

        this.properties[PropertyName.DeviceMotionDetected] = false;
    }

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<MotionSensor> {
        const sensor = new MotionSensor(api, device);
        sensor.initializeState();
        return sensor;
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

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.type !== undefined && message.event_type !== undefined) {
            if (message.event_type === CusPushEvent.MOTION_SENSOR_PIR && message.device_sn === this.getSerial()) {
                try {
                    this.updateProperty(PropertyName.DeviceMotionDetected, true);
                    this.clearEventTimeout(DeviceEvent.MotionDetected);
                    this.eventTimeouts.set(DeviceEvent.MotionDetected, setTimeout(async () => {
                        this.updateProperty(PropertyName.DeviceMotionDetected, false);
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

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<Lock> {
        const lock = new Lock(api, device);
        lock.initializeState();
        return lock;
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

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.event_type !== undefined) {
            this.processNotification(message.event_type, message.event_time, message.device_sn, eventDurationSeconds);
        }
    }

    public processMQTTNotification(message: DeviceSmartLockNotifyData, eventDurationSeconds: number): void {
        if (message.eventType === LockPushEvent.STATUS_CHANGE) {
            // Lock state event
            const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
            this.updateRawProperty(cmdType, message.lockState);
        } else if (message.eventType === LockPushEvent.OTA_STATUS) {
            // OTA Status - ignore event
        } else {
            this.processNotification(message.eventType, message.eventTime, this.getSerial(), eventDurationSeconds);
        }
    }

    private processNotification(eventType: number, eventTime: number, deviceSN: string, eventDurationSeconds: number): void {
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
                        this.updateRawProperty(cmdType, "4");
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
                        this.updateRawProperty(cmdType, "3");
                        break;
                    }
                    case LockPushEvent.LOCK_MECHANICAL_ANOMALY:
                    case LockPushEvent.MECHANICAL_ANOMALY:
                    case LockPushEvent.VIOLENT_DESTRUCTION:
                    case LockPushEvent.MULTIPLE_ERRORS:
                    {
                        const cmdType = this.isLockBle() || this.isLockBleNoFinger() ? CommandType.CMD_DOORLOCK_GET_STATE : CommandType.CMD_SMARTLOCK_QUERY_STATUS;
                        this.updateRawProperty(cmdType, "5");
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
                        this.log.debug("Unhandled lock notification event", eventType, eventTime, deviceSN);
                        break;
                }
            } catch (error) {
                this.log.debug(`LockEvent - Device: ${deviceSN} Error:`, error);
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

}

export class Keypad extends Device {

    //TODO: CMD_KEYPAD_BATTERY_CHARGER_STATE = 1655
    //TODO: CMD_KEYPAD_BATTERY_TEMP_STATE = 1654
    //TODO: CMD_KEYPAD_GET_PASSWORD = 1657
    //TODO: CMD_KEYPAD_GET_PASSWORD_LIST = 1662
    //TODO: CMD_KEYPAD_IS_PSW_SET = 1670
    //TODO: CMD_KEYPAD_SET_CUSTOM_MAP = 1660
    //TODO: CMD_KEYPAD_SET_PASSWORD = 1650

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<Keypad> {
        const keypad = new Keypad(api, device);
        keypad.initializeState();
        return keypad;
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
            switch(property.key) {
                case CommandType.CMD_KEYPAD_BATTERY_CHARGER_STATE:
                    return value !== undefined ? (value === "0" || value === "2"? false : true) : false;
            }
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
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
            [PropertyName.DeviceNotificationUnlockByKey] : 0,
            [PropertyName.DeviceNotificationUnlockByPIN] : 1,
            [PropertyName.DeviceNotificationUnlockByFingerprint] : 2,
            [PropertyName.DeviceNotificationUnlockByApp] : 3,
            [PropertyName.DeviceNotificationDualUnlock] : 4,
            [PropertyName.DeviceNotificationDualLock] : 5,
            [PropertyName.DeviceNotificationWrongTryProtect] : 6,
            [PropertyName.DeviceNotificationJammed] : 7,
        };

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<SmartSafe> {
        const safe = new SmartSafe(api, device);
        safe.initializeState();
        return safe;
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
        const ssbytes = new SmartSafeByteWriter();
        ssbytes.write(Buffer.from(user_id));
        ssbytes.write(this.getUInt8Buffer(value));
        ssbytes.write(this.getCurrentTimeInSeconds());
        return ssbytes.getData();
    }

    public static encodeCmdWrongTryProtect(user_id: string, enabled: boolean, attempts: number, lockdownTime: number): Buffer {
        const ssbytes = new SmartSafeByteWriter();
        ssbytes.write(Buffer.from(user_id));
        ssbytes.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        ssbytes.write(this.getUInt8Buffer(attempts));
        ssbytes.write(this.getUInt8Buffer(lockdownTime));
        ssbytes.write(this.getCurrentTimeInSeconds());
        return ssbytes.getData();
    }

    public static encodeCmdLeftOpenAlarm(user_id: string, enabled: boolean, duration: number): Buffer {
        const ssbytes = new SmartSafeByteWriter();
        ssbytes.write(Buffer.from(user_id));
        ssbytes.write(this.getUInt8Buffer(enabled === true ? 1 : 0));
        ssbytes.write(this.getUint16LEBuffer(duration));
        ssbytes.write(this.getCurrentTimeInSeconds());
        return ssbytes.getData();
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
        const ssbytes = new SmartSafeByteWriter();
        ssbytes.write(Buffer.from(user_id));
        ssbytes.write(this.getUInt8Buffer(interiorBrightness));
        ssbytes.write(this.getUInt8Buffer(duration));
        ssbytes.write(this.getCurrentTimeInSeconds());
        return ssbytes.getData();
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
        const ssbytes = new SmartSafeByteWriter();
        ssbytes.write(Buffer.from(user_id));
        ssbytes.write(this.getUint16LEBuffer(modes));
        ssbytes.write(this.getCurrentTimeInSeconds());
        return ssbytes.getData();
    }

    public static encodeCmdUnlock(user_id: string): Buffer {
        return SmartSafe.encodeCmdSingleUInt8(user_id, 1);
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
        } catch (error) {
            this.log.error("Convert Error:", { property: property, value: value, error: error });
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

    public processPushNotification(message: PushMessage, eventDurationSeconds: number): void {
        super.processPushNotification(message, eventDurationSeconds);
        if (message.event_type !== undefined) {
            if (message.device_sn === this.getSerial()) {
                try {
                    switch (message.event_type) {
                        //TODO: Finish smart safe push notification handling implementation
                        case SmartSafeEvent.LOCK_STATUS:
                        {
                            const eventValues = message.event_value as SmartSafeEventValueDetail;

                            if (eventValues.action === 0) {
                                this.updateRawProperty(CommandType.CMD_SMARTSAFE_LOCK_STATUS, "0");
                                /*
                                    type values:
                                        1: Unlocked by PIN
                                        2: Unlocked by User
                                        3: Unlocked by key
                                        4: Unlocked by App
                                        5: Unlocked by Dual Unlock
                                */
                            } else if (eventValues.action === 1) {
                                this.updateRawProperty(CommandType.CMD_SMARTSAFE_LOCK_STATUS, "1");
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
                            this.log.debug("Unhandled smart safe notification event", message.event_type, message.event_time, message.device_sn);
                            break;
                    }
                } catch (error) {
                    this.log.debug(`LockEvent - Device: ${message.device_sn} Error:`, error);
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

export class UnknownDevice extends Device {

    static async initialize(api: HTTPApi, device: DeviceListResponse): Promise<UnknownDevice> {
        const unknown = new UnknownDevice(api, device);
        unknown.initializeState();
        return unknown;
    }

    public getStateChannel(): string {
        return "unknown";
    }

}