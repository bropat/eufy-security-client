import { CommandType } from "../p2p";
import { IndexedProperty, ISupportedFeatures, Properties, PropertyMetadataBoolean, PropertyMetadataNumeric, PropertyMetadataString } from "./interfaces";

export enum DeviceType {
    //List retrieved from com.oceanwing.battery.cam.binder.model.QueryDeviceData
    BATTERY_DOORBELL = 7,
    BATTERY_DOORBELL_2 = 16,
    CAMERA = 1,
    CAMERA2 = 9,
    CAMERA2C = 8,
    CAMERA2C_PRO = 15,
    CAMERA2_PRO = 14,
    CAMERA_E = 4,
    DOORBELL = 5,
    FLOODLIGHT = 3,
    INDOOR_CAMERA = 30,
    INDOOR_CAMERA_1080 = 34,
    INDOOR_PT_CAMERA = 31,
    INDOOR_PT_CAMERA_1080 = 35,
    KEYPAD = 11,
    LOCK_ADVANCED = 51,
    LOCK_ADVANCED_NO_FINGER = 53,
    LOCK_BASIC = 50,
    LOCK_BASIC_NO_FINGER = 52,
    MOTION_SENSOR = 10,
    SENSOR = 2,
    SOLO_CAMERA = 32,
    SOLO_CAMERA_PRO = 33,
    STATION = 0
}

export enum ParamType {
    //List retrieved from com.oceanwing.battery.cam.binder.model.CameraParams
    CHIME_STATE = 2015,
    DETECT_EXPOSURE = 2023,
    DETECT_MODE = 2004,
    DETECT_MOTION_SENSITIVE = 2005,
    DETECT_SCENARIO = 2028,
    DETECT_SWITCH = 2027,
    DETECT_ZONE = 2006,
    DOORBELL_AUDIO_RECODE = 2042,
    DOORBELL_BRIGHTNESS = 2032,
    DOORBELL_DISTORTION = 2033,
    DOORBELL_HDR = 2029,
    DOORBELL_IR_MODE = 2030,
    DOORBELL_LED_NIGHT_MODE = 2039,
    DOORBELL_MOTION_ADVANCE_OPTION = 2041,
    DOORBELL_MOTION_NOTIFICATION = 2035,
    DOORBELL_NOTIFICATION_JUMP_MODE = 2038,
    DOORBELL_NOTIFICATION_OPEN = 2036,
    DOORBELL_RECORD_QUALITY = 2034,
    DOORBELL_RING_RECORD = 2040,
    DOORBELL_SNOOZE_START_TIME = 2037,
    DOORBELL_VIDEO_QUALITY = 2031,
    NIGHT_VISUAL = 2002,
    OPEN_DEVICE = 2001,
    RINGING_VOLUME = 2022,
    SDCARD = 2010,
    UN_DETECT_ZONE = 2007,
    VOLUME = 2003,

    COMMAND_LED_NIGHT_OPEN = 1026,
    COMMAND_MOTION_DETECTION_PACKAGE = 1016,

    // Inferred from source
    SNOOZE_MODE = 1271,                         // The value is base64 encoded
    WATERMARK_MODE = 1214,                      // 1 - hide, 2 - show
    DEVICE_UPGRADE_NOW = 1134,
    CAMERA_UPGRADE_NOW = 1133,
    DEFAULT_SCHEDULE_MODE = 1257,               // 0 - Away, 1 - Home, 63 - Disarmed
    GUARD_MODE = 1224,                          // 0 - Away, 1 - Home, 63 - Disarmed, 2 - Schedule

    FLOODLIGHT_MANUAL_SWITCH = 1400,
    FLOODLIGHT_MANUAL_BRIGHTNESS = 1401,        // The range is 22-100
    FLOODLIGHT_MOTION_BRIGHTNESS = 1412,        // The range is 22-100
    FLOODLIGHT_SCHEDULE_BRIGHTNESS = 1413,      // The range is 22-100
    FLOODLIGHT_MOTION_SENSITIVTY = 1272,        // The range is 1-5

    CAMERA_SPEAKER_VOLUME = 1230,
    CAMERA_RECORD_ENABLE_AUDIO = 1366,          // Enable microphone
    CAMERA_RECORD_RETRIGGER_INTERVAL = 1250,    // In seconds
    CAMERA_RECORD_CLIP_LENGTH = 1249,           // In seconds

    CAMERA_IR_CUT = 1013,
    CAMERA_PIR = 1011,
    CAMERA_WIFI_RSSI = 1142,

    CAMERA_MOTION_ZONES = 1204,

    // Set only params?
    PUSH_MSG_MODE = 1252,                       // 0 to ???

    PRIVATE_MODE = 99904,
    CUSTOM_RTSP_URL = 999991
}

export enum AlarmMode {
    AWAY = 0,
    HOME = 1,
    DISARMED = 63
}

export enum GuardMode {
    UNKNOWN = -1,
    AWAY = 0,
    HOME = 1,
    DISARMED = 63,
    SCHEDULE = 2,
    GEO = 47,
    CUSTOM1 = 3,
    CUSTOM2 = 4,
    CUSTOM3 = 5,
    OFF = 6
}

export enum ResponseErrorCode {
    CODE_CONNECT_ERROR = 997,
    CODE_NEED_VERIFY_CODE = 26052,
    CODE_NETWORK_ERROR = 998,
    CODE_PHONE_NONE_SUPPORT = 26058,
    CODE_SERVER_ERROR = 999,
    CODE_VERIFY_CODE_ERROR = 26050,
    CODE_VERIFY_CODE_EXPIRED = 26051,
    CODE_VERIFY_CODE_MAX = 26053,
    CODE_VERIFY_CODE_NONE_MATCH = 26054,
    CODE_VERIFY_PASSWORD_ERROR = 26055,
    CODE_WHATEVER_ERROR = 0,
    RESP_ERROR_CODE_SESSION_TIMEOUT = 401
}

export enum VerfyCodeTypes {
    TYPE_SMS = 0,
    TYPE_PUSH = 1,
    TYPE_EMAIL = 2
}

export enum AuthResult {
    ERROR = -1,
    OK = 0,
    RENEW = 2,
    SEND_VERIFY_CODE = 3
}

export enum StorageType {
    NONE = 0,
    LOCAL = 1,
    CLOUD = 2,
    LOCAL_AND_CLOUD = 3
}

export interface EventFilterType {
    deviceSN?: string;
    stationSN?: string;
    storageType?: StorageType;
}

export enum DeviceEvent {
    MotionDetected,
    PersonDetected,
    PetDetected,
    SoundDetected,
    CryingDetected,
    Ringing
}

export enum SupportedFeature {
    Battery = 1,
    MotionDetection,
    PersonDetection,
    SoundDetection,
    CryingDetection,
    PetDetection,
    StatusLED,
    AutoNightVision,
    RTSP,
    AntiTheftDetection,
    Watermarking,
    Livestreaming,
    Locking,
    QuickResponse,
    AudioRecording,
    Speaker,
    Ringing,
    LocalStorage,
    OpenClose,
}

export const SupportedFeatures: ISupportedFeatures = {
    [DeviceType.BATTERY_DOORBELL]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.QuickResponse,
        SupportedFeature.AudioRecording,
        SupportedFeature.LocalStorage,
        SupportedFeature.Watermarking,
        SupportedFeature.Ringing,
    ],
    [DeviceType.BATTERY_DOORBELL_2]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.QuickResponse,
        SupportedFeature.AudioRecording,
        SupportedFeature.LocalStorage,
        SupportedFeature.Watermarking,
        SupportedFeature.Ringing,
    ],
    [DeviceType.DOORBELL]: [
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.QuickResponse,
        SupportedFeature.AudioRecording,
        SupportedFeature.LocalStorage,
        SupportedFeature.Watermarking,
        SupportedFeature.Ringing,
    ],
    [DeviceType.CAMERA]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
    ],
    [DeviceType.CAMERA_E]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
    ],
    [DeviceType.CAMERA2]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.AntiTheftDetection,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
    ],
    [DeviceType.CAMERA2C]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.AntiTheftDetection,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
    ],
    [DeviceType.CAMERA2C_PRO]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.AntiTheftDetection,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
    ],
    [DeviceType.CAMERA2_PRO]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.AntiTheftDetection,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
    ],
    [DeviceType.FLOODLIGHT]: [
        SupportedFeature.MotionDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.RTSP,
        SupportedFeature.LocalStorage,
    ],
    [DeviceType.INDOOR_CAMERA]: [
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.PetDetection,
        SupportedFeature.SoundDetection,
        SupportedFeature.CryingDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
    ],
    [DeviceType.INDOOR_CAMERA_1080]: [
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.PetDetection,
        SupportedFeature.SoundDetection,
        SupportedFeature.CryingDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
    ],
    [DeviceType.INDOOR_PT_CAMERA]: [
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.PetDetection,
        SupportedFeature.SoundDetection,
        SupportedFeature.CryingDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
    ],
    [DeviceType.INDOOR_PT_CAMERA_1080]: [
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.PetDetection,
        SupportedFeature.SoundDetection,
        SupportedFeature.CryingDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
    ],
    [DeviceType.KEYPAD]: [
    ],
    [DeviceType.LOCK_ADVANCED]: [
        SupportedFeature.Locking,
    ],
    [DeviceType.LOCK_ADVANCED_NO_FINGER]: [
        SupportedFeature.Locking,
    ],
    [DeviceType.LOCK_BASIC]: [
        SupportedFeature.Locking,
    ],
    [DeviceType.LOCK_BASIC_NO_FINGER]: [
        SupportedFeature.Locking,
    ],
    [DeviceType.MOTION_SENSOR]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
    ],
    [DeviceType.SENSOR]: [
        SupportedFeature.Battery,
        SupportedFeature.OpenClose,
    ],
    [DeviceType.SOLO_CAMERA]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.AntiTheftDetection,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
        SupportedFeature.LocalStorage,
    ],
    [DeviceType.SOLO_CAMERA_PRO]: [
        SupportedFeature.Battery,
        SupportedFeature.MotionDetection,
        SupportedFeature.PersonDetection,
        SupportedFeature.StatusLED,
        SupportedFeature.AutoNightVision,
        SupportedFeature.Livestreaming,
        SupportedFeature.AudioRecording,
        SupportedFeature.Watermarking,
        SupportedFeature.AntiTheftDetection,
        SupportedFeature.RTSP,
        SupportedFeature.Speaker,
        SupportedFeature.LocalStorage,
    ],
}

export enum PropertyName {
    Name = "name",
    Model = "model",
    SerialNumber = "serialNumber",
    HardwareVersion = "hardwareVersion",
    SoftwareVersion = "softwareVersion",
    DeviceStationSN = "stationSerialNumber",
    DeviceBattery = "battery",
    DeviceBatteryTemp = "batteryTemperature",
    DeviceBatteryLow = "batteryLow",
    DeviceLastChargingDays = "lastChargingDays",
    DeviceLastChargingTotalEvents = "lastChargingTotalEvents",
    DeviceLastChargingRecordedEvents = "lastChargingRecordedEvents",
    DeviceLastChargingFalseEvents = "lastChargingFalseEvents",
    DeviceBatteryUsageLastWeek = "batteryUsageLastWeek",
    DeviceWifiRSSI = "wifiRSSI",
    DeviceEnabled = "enabled",
    DeviceAntitheftDetection= "antitheftDetection",
    DeviceAutoNightvision = "autoNightvision",
    DeviceStatusLed = "statusLed",
    DeviceMotionDetection = "motionDetection",
    DeviceMotionDetected = "motionDetected",
    DevicePersonDetected = "personDetected",
    DevicePersonName = "personName",
    DeviceRTSPStream = "rtspStream",
    DeviceWatermark = "watermark",
    DevicePictureUrl = "pictureUrl",
    DeviceState = "state",
    DevicePetDetection = "petDetection",
    DevicePetDetected = "petDetected",
    DeviceSoundDetection = "soundDetection",
    DeviceSoundDetected = "soundDetected",
    DeviceCryingDetected = "cryingDetected",
    DeviceSensorOpen = "sensorOpen",
    DeviceSensorChangeTime = "sensorChangeTime",
    DeviceMotionSensorPIREvent = "motionSensorPIREvent",
    DeviceLocked = "locked",
    DeviceRinging = "ringing",
    DeviceLockStatus = "lockStatus",
    StationLANIpAddress = "lanIpAddress",
    StationMacAddress = "macAddress",
    StationGuardMode = "guardMode",
    StationCurrentMode = "currentMode",
}

export const DeviceNameProperty: PropertyMetadataString = {
    key: "device_name",
    name: PropertyName.Name,
    label: "Name",
    readable: true,
    writeable: false,
    type: "string",
}

export const DeviceModelProperty: PropertyMetadataString = {
    key: "device_model",
    name: PropertyName.Model,
    label: "Model",
    readable: true,
    writeable: false,
    type: "string",
}

export const DeviceSerialNumberProperty: PropertyMetadataString = {
    key: "device_sn",
    name: PropertyName.SerialNumber,
    label: "Serial number",
    readable: true,
    writeable: false,
    type: "string",
}

export const GenericHWVersionProperty: PropertyMetadataString = {
    key: "main_hw_version",
    name: PropertyName.HardwareVersion,
    label: "Hardware version",
    readable: true,
    writeable: false,
    type: "string",
}

export const GenericSWVersionProperty: PropertyMetadataString = {
    key: "main_sw_version",
    name: PropertyName.SoftwareVersion,
    label: "Software version",
    readable: true,
    writeable: false,
    type: "string",
}

export const BaseDeviceProperties: IndexedProperty = {
    [DeviceNameProperty.name]: DeviceNameProperty,
    [DeviceModelProperty.name]: DeviceModelProperty,
    [DeviceSerialNumberProperty.name]: DeviceSerialNumberProperty,
    [GenericHWVersionProperty.name]: GenericHWVersionProperty,
    [GenericSWVersionProperty.name]: GenericSWVersionProperty,
}

export const GenericDeviceProperties: IndexedProperty = {
    ...BaseDeviceProperties,
    [PropertyName.DeviceStationSN]: {
        key: "station_sn",
        name: "stationSerialNumber",
        label: "Station serial number",
        readable: true,
        writeable: false,
        type: "string",
    },
}

export const DeviceBatteryProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_GET_BATTERY,
    name: PropertyName.DeviceBattery,
    label: "Battery percentage",
    readable: true,
    writeable: false,
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
}

export const DeviceBatteryLowMotionSensorProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_MOTION_SENSOR_BAT_STATE,
    name: PropertyName.DeviceBatteryLow,
    label: "Battery low",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceBatteryLowKeypadProperty: PropertyMetadataBoolean = {
    ...DeviceBatteryLowMotionSensorProperty,
    key: CommandType.CMD_KEYPAD_BATTERY_CAP_STATE,
};

export const DeviceBatteryLowSensorProperty: PropertyMetadataBoolean = {
    ...DeviceBatteryLowMotionSensorProperty,
    key: CommandType.CMD_ENTRY_SENSOR_BAT_STATE,
};

export const DeviceBatteryTempProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_GET_BATTERY_TEMP,
    name: PropertyName.DeviceBatteryTemp,
    label: "Battery Temperature",
    readable: true,
    writeable: false,
    type: "number",
    unit: "°C",
}

export const DeviceAntitheftDetectionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_EAS_SWITCH,
    name: PropertyName.DeviceAntitheftDetection,
    label: "Antitheft Detection",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceAutoNightvisionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_IRCUT_SWITCH,
    name: PropertyName.DeviceAutoNightvision,
    label: "Auto Nightvision",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceWifiRSSIProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_GET_WIFI_RSSI,
    name: PropertyName.DeviceWifiRSSI,
    label: "Wifi RSSI",
    readable: true,
    writeable: false,
    type: "number",
    unit: "dBm",
}

export const DeviceWifiRSSILockProperty: PropertyMetadataNumeric = {
    ...DeviceWifiRSSIProperty,
    key: CommandType.CMD_GET_SUB1G_RSSI,
};

export const DeviceEnabledProperty: PropertyMetadataBoolean = {
    key: ParamType.PRIVATE_MODE,
    name: PropertyName.DeviceEnabled,
    label: "Camera enabled",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceStatusLedProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DEV_LED_SWITCH,
    name: PropertyName.DeviceStatusLed,
    label: "Status LED",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceStatusLedIndoorSoloFloodProperty: PropertyMetadataBoolean = {
    ...DeviceStatusLedProperty,
    key: CommandType.CMD_INDOOR_LED_SWITCH,
};

export const DeviceStatusLedBatteryDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceStatusLedProperty,
    key: CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE,
};

export const DeviceStatusLedDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceStatusLedProperty,
    key: ParamType.COMMAND_LED_NIGHT_OPEN,
};

export const DeviceMotionDetectionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_PIR_SWITCH,
    name: PropertyName.DeviceMotionDetection,
    label: "Motion Detection",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceMotionDetectionIndoorSoloFloodProperty: PropertyMetadataBoolean = {
    ...DeviceMotionDetectionProperty,
    key: CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE,
};

export const DeviceMotionDetectionDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceMotionDetectionProperty,
    key: ParamType.COMMAND_MOTION_DETECTION_PACKAGE,
};

export const DeviceSoundDetectionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_DET_SET_SOUND_DETECT_ENABLE,
    name: PropertyName.DeviceSoundDetection,
    label: "Sound Detection",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DevicePetDetectionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_DET_SET_PET_ENABLE,
    name: PropertyName.DevicePetDetection,
    label: "Pet Detection",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceRTSPStreamProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_NAS_SWITCH,
    name: PropertyName.DeviceRTSPStream,
    label: "RTSP Stream",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceWatermarkProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_DEVS_OSD,
    name: PropertyName.DeviceWatermark,
    label: "Watermark",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "OFF",
        1: "TIMESTAMP",
        2: "TIMESTAMP_AND_LOGO",
    },
}

export const DeviceWatermarkIndoorFloodProperty: PropertyMetadataNumeric = {
    ...DeviceWatermarkProperty,
    states: {
        0: "TIMESTAMP",
        1: "TIMESTAMP_AND_LOGO",
        2: "OFF",
    },
};

export const DeviceWatermarkSoloWiredDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceWatermarkProperty,
    states: {
        0: "OFF",
        1: "ON",
    },
};

export const DeviceWatermarkBatteryDoorbellCamera1Property: PropertyMetadataNumeric = {
    ...DeviceWatermarkProperty,
    states: {
        1: "OFF",
        2: "ON",
    },
};

export const DeviceStateProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_GET_DEV_STATUS,
    name: PropertyName.DeviceState,
    label: "State",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "OFFLINE",
        1: "ONLINE",
        2: "MANUALLY_DISABLED",
        3: "OFFLINE_LOWBAT",
        4: "REMOVE_AND_READD",
        5: "RESET_AND_READD",
    }
}

export const DeviceStateLockProperty: PropertyMetadataNumeric = {
    ...DeviceStateProperty,
    key: CommandType.CMD_GET_DEV_STATUS,
};

export const DeviceLastChargingDaysProperty: PropertyMetadataNumeric = {
    key: "charging_days",
    name: PropertyName.DeviceLastChargingDays,
    label: "Days since last charging",
    readable: true,
    writeable: false,
    type: "number",
}

export const DeviceLastChargingTotalEventsProperty: PropertyMetadataNumeric = {
    key: "charing_total",
    name: PropertyName.DeviceLastChargingTotalEvents,
    label: "Total Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
}

export const DeviceLastChargingRecordedEventsProperty: PropertyMetadataNumeric = {
    key: "charging_reserve",
    name: PropertyName.DeviceLastChargingRecordedEvents,
    label: "Total Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
}

export const DeviceLastChargingFalseEventsProperty: PropertyMetadataNumeric = {
    key: "charging_missing",
    name: PropertyName.DeviceLastChargingFalseEvents,
    label: "False Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
}

export const DeviceBatteryUsageLastWeekProperty: PropertyMetadataNumeric = {
    key: "battery_usage_last_week",
    name: PropertyName.DeviceBatteryUsageLastWeek,
    label: "False Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
}

export const DeviceLockedProperty: PropertyMetadataBoolean = {
    key: "custom_locked",
    name: PropertyName.DeviceLocked,
    label: "locked",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceMotionDetectedProperty: PropertyMetadataBoolean = {
    key: "custom_motionDetected",
    name: PropertyName.DeviceMotionDetected,
    label: "Motion detected",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DevicePersonDetectedProperty: PropertyMetadataBoolean = {
    key: "custom_personDetected",
    name: PropertyName.DevicePersonDetected,
    label: "Person detected",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DevicePetDetectedProperty: PropertyMetadataBoolean = {
    key: "custom_petDetected",
    name: PropertyName.DevicePetDetected,
    label: "Pet detected",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceSoundDetectedProperty: PropertyMetadataBoolean = {
    key: "custom_soundDetected",
    name: PropertyName.DeviceSoundDetected,
    label: "Sound detected",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceCryingDetectedProperty: PropertyMetadataBoolean = {
    key: "custom_cryingDetected",
    name: PropertyName.DeviceCryingDetected,
    label: "Crying detected",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceRingingProperty: PropertyMetadataBoolean = {
    key: "custom_ringing",
    name: PropertyName.DeviceRinging,
    label: "Ringing",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceSensorOpenProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_ENTRY_SENSOR_STATUS,
    name: PropertyName.DeviceSensorOpen,
    label: "Sensor open",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceSensorChangeTimeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_ENTRY_SENSOR_CHANGE_TIME,
    name: PropertyName.DeviceSensorChangeTime,
    label: "Sensor change time",
    readable: true,
    writeable: false,
    type: "number",
}

export const DeviceMotionSensorPIREventProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_MOTION_SENSOR_PIR_EVT,
    name: PropertyName.DeviceMotionSensorPIREvent,
    label: "Motion sensor PIR event",
    readable: true,
    writeable: false,
    type: "number",
    //TODO: Define states
}

export const DeviceLockStatusProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORLOCK_GET_STATE,
    name: PropertyName.DeviceMotionSensorPIREvent,
    label: "Lock status",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        1: "1",
        2: "2",
        3: "UNLOCKED",
        4: "LOCKED",
        5: "MECHANICAL_ANOMALY",
        6: "6",
        7: "7",
    }
}

export const DevicePictureUrlProperty: PropertyMetadataString = {
    key: "cover_path",
    name: PropertyName.DevicePictureUrl,
    label: "Last Camera Picture URL",
    readable: true,
    writeable: false,
    type: "string",
}

export const DeviceProperties: Properties = {
    [DeviceType.CAMERA2]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.CAMERA2C]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.CAMERA2C_PRO]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.CAMERA2_PRO]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.CAMERA_E]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.DOORBELL]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionDoorbellProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectionDoorbellProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: DeviceRingingProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedDoorbellProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.BATTERY_DOORBELL]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: DeviceRingingProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.BATTERY_DOORBELL_2]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: DeviceRingingProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.FLOODLIGHT]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorSoloFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.INDOOR_CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorSoloFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.INDOOR_CAMERA_1080]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorSoloFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorSoloFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_1080]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorSoloFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.SOLO_CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorSoloFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.SOLO_CAMERA_PRO]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorSoloFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
    },
    [DeviceType.KEYPAD]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBatteryLow]: DeviceBatteryLowKeypadProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
    },
    [DeviceType.LOCK_ADVANCED]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceState]: DeviceStateLockProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSILockProperty,
        [PropertyName.DeviceLocked]: DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: DeviceLockStatusProperty,
    },
    [DeviceType.LOCK_ADVANCED_NO_FINGER]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceState]: DeviceStateLockProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSILockProperty,
        [PropertyName.DeviceLocked]: DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: DeviceLockStatusProperty,
    },
    [DeviceType.LOCK_BASIC]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceState]: DeviceStateLockProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSILockProperty,
        [PropertyName.DeviceLocked]: DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: DeviceLockStatusProperty,
    },
    [DeviceType.LOCK_BASIC_NO_FINGER]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceState]: DeviceStateLockProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSILockProperty,
        [PropertyName.DeviceLocked]: DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: DeviceLockStatusProperty,
    },
    [DeviceType.MOTION_SENSOR]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBatteryLow]: DeviceBatteryLowMotionSensorProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DeviceMotionSensorPIREvent]: DeviceMotionSensorPIREventProperty,
    },
    [DeviceType.SENSOR]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceSensorOpen]: DeviceSensorOpenProperty,
        [PropertyName.DeviceBatteryLow]: DeviceBatteryLowSensorProperty,
        [PropertyName.DeviceSensorChangeTime]: DeviceSensorChangeTimeProperty,
    },
}

export const StationNameProperty: PropertyMetadataString = {
    key: "station_name",
    name: PropertyName.Name,
    label: "Name",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationModelProperty: PropertyMetadataString = {
    key: "station_model",
    name: PropertyName.Model,
    label: "Model",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationSerialNumberProperty: PropertyMetadataString = {
    key: "station_sn",
    name: PropertyName.SerialNumber,
    label: "Serial number",
    readable: true,
    writeable: false,
    type: "string",
}

export const BaseStationProperties: IndexedProperty = {
    [StationNameProperty.name]: StationNameProperty,
    [StationModelProperty.name]: StationModelProperty,
    [StationSerialNumberProperty.name]: StationSerialNumberProperty,
    [GenericHWVersionProperty.name]: GenericHWVersionProperty,
    [GenericSWVersionProperty.name]: GenericSWVersionProperty,
}

export const StationGuardModeProperty: PropertyMetadataNumeric = {
    key: ParamType.GUARD_MODE,
    name: PropertyName.StationGuardMode,
    label: "Guard Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "AWAY",
        1: "HOME",
        2: "SCHEDULE",
        3: "CUSTOM1",
        4: "CUSTOM2",
        5: "CUSTOM3",
        6: "OFF",
        47: "GEO",
        63: "DISARMED",
    },
}

export const StationCurrentModeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_GET_ALARM_MODE,
    name: PropertyName.StationCurrentMode,
    label: "Current Mode",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "AWAY",
        1: "HOME",
        63: "DISARMED",
    },
}

export const StationLanIpAddressProperty: PropertyMetadataString = {
    key: CommandType.CMD_GET_HUB_LAN_IP,
    name: PropertyName.StationLANIpAddress,
    label: "LAN IP Address",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationMacAddressProperty: PropertyMetadataString = {
    key: "sub1g_mac",
    name: PropertyName.StationMacAddress,
    label: "MAC Address",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationProperties: Properties = {
    [DeviceType.STATION]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
    },
}