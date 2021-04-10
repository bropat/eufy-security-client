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
    SCHEDULE_MODE = 1257,                       // 0 - Away, 1 - Home, 63 - Disarmed
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
}

export enum AlarmMode {
    AWAY = 0,
    HOME = 1,
    DISARMED = 63
}

export enum GuardMode {
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