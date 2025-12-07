import { Commands, IndexedProperty, Properties, PropertyMetadataBoolean, PropertyMetadataNumeric, PropertyMetadataObject, PropertyMetadataString } from "./interfaces";
export type SourceType = "p2p" | "http" | "push" | "mqtt";
export declare enum DeviceType {
    STATION = 0,
    CAMERA = 1,
    SENSOR = 2,
    FLOODLIGHT = 3,
    CAMERA_E = 4,
    DOORBELL = 5,
    BATTERY_DOORBELL = 7,
    CAMERA2C = 8,
    CAMERA2 = 9,
    MOTION_SENSOR = 10,
    KEYPAD = 11,
    CAMERA2_PRO = 14,
    CAMERA2C_PRO = 15,
    BATTERY_DOORBELL_2 = 16,
    HB3 = 18,
    CAMERA3 = 19,
    CAMERA3C = 23,
    PROFESSIONAL_247 = 24,// T8600
    MINIBASE_CHIME = 25,
    CAMERA3_PRO = 26,
    INDOOR_CAMERA = 30,
    INDOOR_PT_CAMERA = 31,
    SOLO_CAMERA = 32,
    SOLO_CAMERA_PRO = 33,
    INDOOR_CAMERA_1080 = 34,
    INDOOR_PT_CAMERA_1080 = 35,
    FLOODLIGHT_CAMERA_8422 = 37,
    FLOODLIGHT_CAMERA_8423 = 38,
    FLOODLIGHT_CAMERA_8424 = 39,
    INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT = 44,
    INDOOR_OUTDOOR_CAMERA_2K = 45,
    INDOOR_OUTDOOR_CAMERA_1080P = 46,
    FLOODLIGHT_CAMERA_8425 = 47,
    OUTDOOR_PT_CAMERA = 48,//S340
    LOCK_BLE = 50,
    LOCK_WIFI = 51,
    LOCK_BLE_NO_FINGER = 52,
    LOCK_WIFI_NO_FINGER = 53,
    LOCK_8503 = 54,//Smart Lock R10
    LOCK_8530 = 55,
    LOCK_85A3 = 56,
    LOCK_8592 = 57,
    LOCK_8504 = 58,//Smart Lock R20
    SOLO_CAMERA_SPOTLIGHT_1080 = 60,
    SOLO_CAMERA_SPOTLIGHT_2K = 61,
    SOLO_CAMERA_SPOTLIGHT_SOLAR = 62,
    SOLO_CAMERA_SOLAR = 63,
    SOLO_CAMERA_C210 = 64,
    FLOODLIGHT_CAMERA_8426 = 87,//E30
    SOLO_CAMERA_E30 = 88,
    EUFYCAM_S4 = 89,// T8172 - Outdoor PTZ Dual Camera (no floodlight)
    SMART_DROP = 90,
    BATTERY_DOORBELL_PLUS = 91,
    DOORBELL_SOLO = 93,
    BATTERY_DOORBELL_PLUS_E340 = 94,
    BATTERY_DOORBELL_C30 = 95,
    BATTERY_DOORBELL_C31 = 96,
    INDOOR_COST_DOWN_CAMERA = 100,
    CAMERA_GUN = 101,
    CAMERA_SNAIL = 102,
    INDOOR_PT_CAMERA_S350 = 104,
    INDOOR_PT_CAMERA_E30 = 105,
    CAMERA_FG = 110,//T8150
    CAMERA_GARAGE_T8453_COMMON = 131,
    CAMERA_GARAGE_T8452 = 132,
    CAMERA_GARAGE_T8453 = 133,
    SMART_SAFE_7400 = 140,
    SMART_SAFE_7401 = 141,
    SMART_SAFE_7402 = 142,
    SMART_SAFE_7403 = 143,
    WALL_LIGHT_CAM = 151,
    SMART_TRACK_LINK = 157,//T87B0
    SMART_TRACK_CARD = 159,//T87B2
    LOCK_8502 = 180,
    LOCK_8506 = 184,
    WALL_LIGHT_CAM_81A0 = 10005,
    INDOOR_PT_CAMERA_C220 = 10008,// T8W11C
    INDOOR_PT_CAMERA_C210 = 10009,// T8419 / T8W11P?
    INDOOR_PT_CAMERA_C220_V2 = 10010,// T8W11C (Type 10010)
    INDOOR_PT_CAMERA_C220_V3 = 10011
}
export declare enum ParamType {
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
    DOORBELL_CHIME_MODE = 100000,
    NIGHT_VISUAL = 2002,
    OPEN_DEVICE = 2001,
    RINGING_VOLUME = 2022,
    SDCARD = 2010,
    UN_DETECT_ZONE = 2007,
    VOLUME = 2003,
    COMMAND_LED_NIGHT_OPEN = 1026,
    COMMAND_MOTION_DETECTION_PACKAGE = 1016,
    COMMAND_HDR = 1019,
    COMMAND_DISTORTION_CORRECTION = 1022,
    COMMAND_VIDEO_QUALITY = 1020,
    COMMAND_VIDEO_RECORDING_QUALITY = 1023,
    COMMAND_VIDEO_RING_RECORD = 1027,
    COMMAND_AUDIO_RECORDING = 1029,
    COMMAND_INDOOR_CHIME = 1006,
    COMMAND_RINGTONE_VOLUME = 1012,
    COMMAND_NOTIFICATION_RING = 1031,
    COMMAND_NOTIFICATION_TYPE = 1030,
    COMMAND_QUICK_RESPONSE = 1004,
    COMMAND_START_LIVESTREAM = 1000,
    COMMAND_STREAM_INFO = 1005,
    COMMAND_VOLTAGE_INFO = 1015,
    SNOOZE_MODE = 1271,// The value is base64 encoded
    WATERMARK_MODE = 1214,// 1 - hide, 2 - show
    DEVICE_UPGRADE_NOW = 1134,
    CAMERA_UPGRADE_NOW = 1133,
    DEFAULT_SCHEDULE_MODE = 1257,// 0 - Away, 1 - Home, 63 - Disarmed
    GUARD_MODE = 1224,// 0 - Away, 1 - Home, 63 - Disarmed, 2 - Schedule
    FLOODLIGHT_MANUAL_SWITCH = 1400,
    FLOODLIGHT_MANUAL_BRIGHTNESS = 1401,// The range is 22-100
    FLOODLIGHT_MOTION_BRIGHTNESS = 1412,// The range is 22-100
    FLOODLIGHT_SCHEDULE_BRIGHTNESS = 1413,// The range is 22-100
    FLOODLIGHT_MOTION_SENSITIVTY = 1272,// The range is 1-5
    CAMERA_SPEAKER_VOLUME = 1230,
    CAMERA_RECORD_ENABLE_AUDIO = 1366,// Enable microphone
    CAMERA_RECORD_RETRIGGER_INTERVAL = 1250,// In seconds
    CAMERA_RECORD_CLIP_LENGTH = 1249,// In seconds
    CAMERA_IR_CUT = 1013,
    CAMERA_PIR = 1011,
    CAMERA_WIFI_RSSI = 1142,
    CAMERA_MOTION_ZONES = 1204,
    PUSH_MSG_MODE = 1252,// 0 to ???
    PRIVATE_MODE = 99904,
    CUSTOM_RTSP_URL = 999991
}
export declare enum AlarmMode {
    AWAY = 0,
    HOME = 1,
    CUSTOM1 = 3,
    CUSTOM2 = 4,
    CUSTOM3 = 5,
    DISARMED = 63
}
export declare enum GuardMode {
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
export declare enum ResponseErrorCode {
    CODE_CONNECT_ERROR = 997,
    CODE_ERROR_PIN = 36006,
    CODE_MULTI_ALARM = 36002,
    CODE_NEED_VERIFY_CODE = 26052,
    CODE_NETWORK_ERROR = 998,
    CODE_PHONE_NONE_SUPPORT = 26058,
    CODE_SERVER_ERROR = 999,
    CODE_SERVER_UNDER_MAINTENANCE = 424,
    CODE_VERIFY_CODE_ERROR = 26050,
    CODE_VERIFY_CODE_EXPIRED = 26051,
    CODE_VERIFY_CODE_MAX = 26053,
    CODE_VERIFY_CODE_NONE_MATCH = 26054,
    CODE_VERIFY_PASSWORD_ERROR = 26055,
    CODE_WHATEVER_ERROR = 0,
    CODE_EMAIL_LIMIT_EXCEED = 25077,
    CODE_GIVE_AWAY_EXPIRED = 25075,
    CODE_GIVE_AWAY_INVALID = 25076,
    CODE_GIVE_AWAY_NOT_EXIST = 25079,
    CODE_GIVE_AWAY_PACKAGE_NOT_MATCH = 25078,
    CODE_GIVE_AWAY_PACKAGE_TYPE_NOT_MATCH = 25080,
    CODE_GIVE_AWAY_RECORD_EXIST = 25074,
    CODE_INPUT_PARAM_INVALID = 10000,
    CODE_MAX_FORGET_PASSWORD_ERROR = 100035,
    CODE_MAX_LOGIN_LIMIT = 100028,
    CODE_MAX_REGISTER_ERROR = 100034,
    EMAIL_NOT_REGISTERED_ERROR = 22008,
    LOGIN_CAPTCHA_ERROR = 100033,
    LOGIN_DECRYPTION_FAIL = 100030,
    LOGIN_ENCRYPTION_FAIL = 100029,
    LOGIN_INVALID_TOUCH_ID = 26047,
    LOGIN_NEED_CAPTCHA = 100032,
    MULTIPLE_EMAIL_PASSWORD_ERROR = 26006,
    MULTIPLE_INACTIVATED_ERROR = 26015,
    MULTIPLE_REGISTRATION_ERROR = 26000,
    RESP_ERROR_CODE_SESSION_TIMEOUT = 401,
    CODE_REQUEST_TOO_FAST = 250999
}
export declare enum VerfyCodeTypes {
    TYPE_SMS = 0,
    TYPE_PUSH = 1,
    TYPE_EMAIL = 2
}
export declare enum StorageType {
    NONE = 0,
    LOCAL = 1,
    CLOUD = 2,
    LOCAL_AND_CLOUD = 3
}
export declare enum PowerSource {
    BATTERY = 0,
    SOLAR_PANEL = 1
}
export declare enum PublicKeyType {
    SERVER = 1,
    LOCK = 2
}
export declare enum FloodlightMotionTriggeredDistance {
    MIN = 66,
    LOW = 76,
    MEDIUM = 86,
    HIGH = 91,
    MAX = 96
}
export declare enum NotificationType {
    MOST_EFFICIENT = 1,
    INCLUDE_THUMBNAIL = 2,
    FULL_EFFECT = 3
}
export declare enum WalllightNotificationType {
    ONLY_TEXT = 1,
    WITH_THUMBNAIL = 2
}
export declare enum AlarmTone {
    ALARM_TONE1 = 1,
    ALARM_TONE2 = 2
}
export declare enum NotificationSwitchMode {
    APP = 16,
    GEOFENCE = 32,
    SCHEDULE = 64,
    KEYPAD = 128
}
export declare enum GuardModeSecuritySettingsAction {
    VIDEO_RECORDING = 1,
    CAMERA_ALARM = 2,
    HOMEBASE_ALARM = 4,
    NOTIFICATON = 8,
    PRIVACY = 16,
    LIGHT_ALARM = 32,
    PROFESSIONAL_SECURITY = 64
}
export declare enum TimeFormat {
    FORMAT_12H = 0,
    FORMAT_24H = 1
}
export declare enum SignalLevel {
    NO_SIGNAL = 0,
    WEAK = 1,
    NORMAL = 2,
    STRONG = 3,
    FULL = 4
}
export declare enum MotionDetectionMode {
    STANDARD = 0,
    ADVANCED = 1
}
export declare enum VideoTypeStoreToNAS {
    Events = 0,
    ContinuousRecording = 1
}
export declare enum DualCamStreamMode {
    SINGLE_MAIN = 0,
    SINGLE_SECOND = 1,
    PIP_MAIN_UPPER_LEFT = 2,
    PIP_MAIN_UPPER_RIGHT = 3,
    PIP_MAIN_LOWER_LEFT = 4,
    PIP_MAIN_LOWER_RIGHT = 5,
    PIP_SECOND_UPPER_LEFT = 6,
    PIP_SECOND_UPPER_RIGHT = 7,
    PIP_SECOND_LOWER_LEFT = 8,
    PIP_SECOND_LOWER_RIGHT = 9,
    SPLICE_LEFT = 10,
    SPLICE_RIGHT = 11,
    SPLICE_ABOVE = 12,
    SPLICE_UNDER = 13,
    SPLICE_MIRROR = 14
}
export declare enum UserType {
    NORMAL = 0,
    ADMIN = 1,
    SUPER_ADMIN = 2,
    ENTRY_ONLY = 4
}
export declare enum UserPasswordType {
    PIN = 1,
    FINGERPRINT = 2
}
export declare enum HB3DetectionTypes {
    HUMAN_DETECTION = 2,
    VEHICLE_DETECTION = 4,
    PET_DETECTION = 8,
    ALL_OTHER_MOTION = 32768,
    HUMAN_RECOGNITION = 131072
}
export declare enum T8170DetectionTypes {
    HUMAN_DETECTION = 3,
    VEHICLE_DETECTION = 4,
    ALL_OTHER_MOTION = 32768
}
export declare enum SoloCameraDetectionTypes {
    HUMAN_DETECTION = 3,
    ALL_OTHER_MOTION = 32771
}
export declare enum IndoorS350DetectionTypes {
    HUMAN_DETECTION = 3,
    PET_DETECTION = 8,
    ALL_OTHER_MOTION = 32768
}
export declare enum IndoorDetectionTypes {
    PERSON_DETECTION = 1,
    PET_DETECTION = 2,
    ALL_MOTION = 4
}
export declare enum IndoorMiniDetectionTypes {
    PERSON_DETECTION = 1,
    ALL_MOTION = 4
}
export declare enum IndoorS350NotificationTypes {
    ALL_OTHER_MOTION = 801,
    HUMAN = 802,
    PET = 804,
    CRYING = 808,
    ALL_SOUND = 816
}
export declare enum FloodlightT8425NotificationTypes {
    ALL_OTHER_MOTION = 1,
    HUMAN = 2,
    PET = 4,
    VEHICLE = 512
}
export declare enum VideoType {
    RECEIVED_RING = 1000,
    MISSED_RING = 1001,
    MOTION = 1002,
    PERSON = 1003,
    PET = 1004,
    CRYING = 1005,
    SOUND = 1006,
    PUTDOWN_PACKAGE = 65536,
    TAKE_PACKAGE = 131072,
    DETECT_PACKAGE = 262144,
    RECEIVED_RING_ACK = 524288,
    RECEIVED_RING_MISS = 1048576,
    RECEIVED_CAR_GUARD = 2097152
}
export declare enum MediaType {
    NONE = -1,
    H264 = 0,
    H265 = 1
}
export declare enum RecordType {
    MOTION = 256,
    PERSON = 512,
    PET = 1024,
    CRY = 2048,
    SOUND = 4096,
    VEHICLE = 16384,
    CAR_GUARD = 131072
}
export declare enum MicStatus {
    CLOSED = 0,
    OPENED = 1
}
export declare enum TriggerType {
    MOTION1 = 0,
    MOTION2 = 1,
    MOTION3 = 2,
    PERSON = 4,
    RING = 8,
    SENSOR = 16,
    UNKNOWN = 32,
    MISSED_RING = 64,
    ANSWER_RING = 128
}
export declare enum LightingActiveMode {
    DAILY = 0,
    COLORED = 1,
    DYNAMIC = 2
}
export declare enum DailyLightingType {
    COLD = 0,
    WARM = 1,
    VERY_WARM = 2
}
export declare enum MotionActivationMode {
    SMART = 0,
    FAST = 1
}
export declare enum DynamicLightingEffect {
    FADE = 1,
    BLINK = 2
}
export declare enum GarageDoorState {
    A_CLOSED = 2,
    A_CLOSING = -102,
    A_NO_MOTOR = -108,
    A_OPENED = 1,
    A_OPENING = -101,
    A_UNKNOWN = 16,
    B_CLOSED = 8,
    B_CLOSING = -104,
    B_NO_MOTOR = -109,
    B_OPENED = 4,
    B_OPENING = -103,
    B_UNKNOWN = 32,
    UNKNOWN = 0
}
export declare enum TrackerType {
    TRACKER = 0,
    KEY = 1,
    WALLET = 2,
    BAG = 3,
    REMOTE = 4,
    CAMERA = 5,
    HEADPHONES = 6,
    TOY = 7,
    SUITCASE = 8,
    HANDBAG = 9
}
export declare enum MotionDetectionRangeType {
    STANDARD = 0,
    ADVANCED = 1,
    AUTOMATIC = 2
}
export declare enum ViewModeType {
    SINGLE_VIEW = 0,
    DUAL_VIEW = 12
}
export declare enum PresetPositionType {
    PRESET_1 = 0,
    PRESET_2 = 1,
    PRESET_3 = 2,
    PRESET_4 = 3
}
export declare const enum SmartLockNotification {
    ENABLED = 1,
    UNLOCKED = 2,
    LOCKED = 4
}
export interface EventFilterType {
    deviceSN?: string;
    stationSN?: string;
    storageType?: StorageType;
}
export declare enum DeviceEvent {
    MotionDetected = 0,
    PersonDetected = 1,
    PetDetected = 2,
    SoundDetected = 3,
    CryingDetected = 4,
    Ringing = 5,
    PackageDelivered = 6,
    PackageTaken = 7,
    PackageStranded = 8,
    SomeoneLoitering = 9,
    RadarMotionDetected = 10,
    SomeoneGoing = 11,
    LeftOpen = 12,
    Jammed = 13,
    Alarm911 = 14,
    LowBattery = 15,
    LongTimeNotClose = 16,
    ShakeAlarm = 17,
    WrontTryProtectAlarm = 18,
    IdentityPersonDetected = 19,
    StrangerPersonDetected = 20,
    VehicleDetected = 21,
    DogDetected = 22,
    DogLickDetected = 23,
    DogPoopDetected = 24,
    Lock = 25,
    TamperingAlert = 26,
    LowTemperatureAlert = 27,
    HighTemperatureAlert = 28,
    LidStuckAlert = 29,
    PinIncorrectAlert = 30,
    BatteryFullyChargedAlert = 31
}
export declare enum PropertyName {
    Name = "name",
    Model = "model",
    SerialNumber = "serialNumber",
    HardwareVersion = "hardwareVersion",
    SoftwareVersion = "softwareVersion",
    Type = "type",
    DeviceStationSN = "stationSerialNumber",
    DeviceBattery = "battery",
    DeviceBatteryTemp = "batteryTemperature",
    DeviceBatteryLow = "batteryLow",
    DeviceBatteryIsCharging = "batteryIsCharging",
    DeviceLastChargingDays = "lastChargingDays",
    DeviceLastChargingTotalEvents = "lastChargingTotalEvents",
    DeviceLastChargingRecordedEvents = "lastChargingRecordedEvents",
    DeviceLastChargingFalseEvents = "lastChargingFalseEvents",
    DeviceBatteryUsageLastWeek = "batteryUsageLastWeek",
    DeviceWifiRSSI = "wifiRssi",
    DeviceWifiSignalLevel = "wifiSignalLevel",
    DeviceEnabled = "enabled",
    DeviceAntitheftDetection = "antitheftDetection",
    DeviceAutoNightvision = "autoNightvision",
    DeviceNightvision = "nightvision",
    DeviceStatusLed = "statusLed",
    DeviceMotionDetection = "motionDetection",
    DeviceMotionDetectionType = "motionDetectionType",
    DeviceMotionDetectionSensitivity = "motionDetectionSensitivity",
    DeviceMotionZone = "motionZone",
    DeviceMotionDetectionRange = "motionDetectionRange",// Flooglight T8423
    DeviceMotionDetectionRangeStandardSensitivity = "motionDetectionRangeStandardSensitivity",// Flooglight T8423
    DeviceMotionDetectionRangeAdvancedLeftSensitivity = "motionDetectionRangeAdvancedLeftSensitivity",// Flooglight T8423
    DeviceMotionDetectionRangeAdvancedMiddleSensitivity = "motionDetectionRangeAdvancedMiddleSensitivity",// Flooglight T8423
    DeviceMotionDetectionRangeAdvancedRightSensitivity = "motionDetectionRangeAdvancedRightSensitivity",// Flooglight T8423
    DeviceMotionDetectionTestMode = "motionDetectionTestMode",// Flooglight T8420, T8423
    DeviceMotionDetectionTypeHuman = "motionDetectionTypeHuman",
    DeviceMotionDetectionTypeHumanRecognition = "motionDetectionTypeHumanRecognition",
    DeviceMotionDetectionTypePet = "motionDetectionTypePet",
    DeviceMotionDetectionTypeVehicle = "motionDetectionTypeVehicle",
    DeviceMotionDetectionTypeAllOtherMotions = "motionDetectionTypeAllOtherMotions",
    DeviceMotionDetected = "motionDetected",
    DeviceMotionTracking = "motionTracking",
    DeviceMotionTrackingSensitivity = "motionTrackingSensitivity",// Flooglight T8423
    DeviceMotionAutoCruise = "motionAutoCruise",// Flooglight T8423
    DeviceMotionOutOfViewDetection = "motionOutOfViewDetection",// Flooglight T8423
    DevicePersonDetected = "personDetected",
    DevicePersonName = "personName",
    DeviceRTSPStream = "rtspStream",
    DeviceRTSPStreamUrl = "rtspStreamUrl",
    DeviceWatermark = "watermark",
    DevicePictureUrl = "hidden-pictureUrl",
    DevicePicture = "picture",
    DeviceState = "state",
    DevicePetDetection = "petDetection",
    DevicePetDetected = "petDetected",
    DeviceSoundDetection = "soundDetection",
    DeviceSoundDetectionType = "soundDetectionType",
    DeviceSoundDetectionSensitivity = "soundDetectionSensitivity",
    DeviceSoundDetected = "soundDetected",
    DeviceCryingDetected = "cryingDetected",
    DeviceSensorOpen = "sensorOpen",
    DeviceSensorChangeTime = "sensorChangeTime",
    DeviceMotionSensorPIREvent = "motionSensorPirEvent",
    DeviceLocked = "locked",
    DeviceRinging = "ringing",
    DeviceLockStatus = "lockStatus",
    DeviceLight = "light",
    DeviceMicrophone = "microphone",
    DeviceSpeaker = "speaker",
    DeviceSpeakerVolume = "speakerVolume",
    DeviceRingtoneVolume = "ringtoneVolume",
    DeviceAudioRecording = "audioRecording",
    DevicePowerSource = "powerSource",
    DevicePowerWorkingMode = "powerWorkingMode",
    DeviceChargingStatus = "chargingStatus",
    DeviceRecordingEndClipMotionStops = "recordingEndClipMotionStops",
    DeviceRecordingClipLength = "recordingClipLength",
    DeviceRecordingRetriggerInterval = "recordingRetriggerInterval",
    DeviceVideoStreamingQuality = "videoStreamingQuality",
    DeviceVideoRecordingQuality = "videoRecordingQuality",
    DeviceVideoWDR = "videoWdr",
    DeviceLightSettingsEnable = "lightSettingsEnable",
    DeviceLightSettingsBrightnessManual = "lightSettingsBrightnessManual",
    DeviceLightSettingsColorTemperatureManual = "lightSettingsColorTemperatureManual",// Flooglight T8423
    DeviceLightSettingsBrightnessMotion = "lightSettingsBrightnessMotion",
    DeviceLightSettingsColorTemperatureMotion = "lightSettingsColorTemperatureMotion",// Flooglight T8423
    DeviceLightSettingsBrightnessSchedule = "lightSettingsBrightnessSchedule",
    DeviceLightSettingsColorTemperatureSchedule = "lightSettingsColorTemperatureSchedule",// Flooglight T8423
    DeviceLightSettingsMotionTriggered = "lightSettingsMotionTriggered",
    DeviceLightSettingsMotionActivationMode = "lightSettingsMotionActivationMode",// Flooglight T8423 / Walllight T84A1
    DeviceLightSettingsMotionTriggeredDistance = "lightSettingsMotionTriggeredDistance",
    DeviceLightSettingsMotionTriggeredTimer = "lightSettingsMotionTriggeredTimer",
    DeviceLightSettingsManualLightingActiveMode = "lightSettingsManualLightingActiveMode",// Walllight T84A1
    DeviceLightSettingsManualDailyLighting = "lightSettingsManualDailyLighting",// Walllight T84A1
    DeviceLightSettingsManualColoredLighting = "lightSettingsManualColoredLighting",// Walllight T84A1
    DeviceLightSettingsManualDynamicLighting = "lightSettingsManualDynamicLighting",// Walllight T84A1
    DeviceLightSettingsMotionLightingActiveMode = "lightSettingsMotionLightingActiveMode",// Walllight T84A1
    DeviceLightSettingsMotionDailyLighting = "lightSettingsMotionDailyLighting",// Walllight T84A1
    DeviceLightSettingsMotionColoredLighting = "lightSettingsMotionColoredLighting",// Walllight T84A1
    DeviceLightSettingsMotionDynamicLighting = "lightSettingsMotionDynamicLighting",// Walllight T84A1
    DeviceLightSettingsScheduleLightingActiveMode = "lightSettingsScheduleLightingActiveMode",// Walllight T84A1
    DeviceLightSettingsScheduleDailyLighting = "lightSettingsScheduleDailyLighting",// Walllight T84A1
    DeviceLightSettingsScheduleColoredLighting = "lightSettingsScheduleColoredLighting",// Walllight T84A1
    DeviceLightSettingsScheduleDynamicLighting = "lightSettingsScheduleDynamicLighting",// Walllight T84A1
    DeviceLightSettingsColoredLightingColors = "lightSettingsColoredLightingColors",// Walllight T84A1
    DeviceLightSettingsDynamicLightingThemes = "lightSettingsDynamicLightingThemes",// Walllight T84A1
    DeviceChimeIndoor = "chimeIndoor",//BatteryDoorbell, WiredDoorbell
    DeviceChimeHomebase = "chimeHomebase",//BatteryDoorbell
    DeviceChimeHomebaseRingtoneVolume = "chimeHomebaseRingtoneVolume",//BatteryDoorbell
    DeviceChimeHomebaseRingtoneType = "chimeHomebaseRingtoneType",//BatteryDoorbell
    DeviceNotificationType = "notificationType",
    DeviceRotationSpeed = "rotationSpeed",
    DeviceImageMirrored = "imageMirrored",
    DeviceNotificationPerson = "notificationPerson",//Indoor
    DeviceNotificationPet = "notificationPet",//Indoor
    DeviceNotificationAllOtherMotion = "notificationAllOtherMotion",//Indoor
    DeviceNotificationCrying = "notificationCrying",//Indoor
    DeviceNotificationAllSound = "notificationAllSound",//Indoor
    DeviceNotificationIntervalTime = "notificationIntervalTime",//Indoor
    DeviceNotificationRing = "notificationRing",//BatteryDoorbell
    DeviceNotificationMotion = "notificationMotion",//BatteryDoorbell
    DeviceNotificationRadarDetector = "notificationRadarDetector",//BatteryDoorbell Dual
    DeviceNotificationVehicle = "notificationVehicle",//Floodlight
    DeviceContinuousRecording = "continuousRecording",
    DeviceContinuousRecordingType = "continuousRecordingType",
    DeviceChirpVolume = "chirpVolume",
    DeviceChirpTone = "chirpTone",
    DeviceVideoHDR = "videoHdr",// Wired Doorbell
    DeviceVideoDistortionCorrection = "videoDistortionCorrection",// Wired Doorbell
    DeviceVideoRingRecord = "videoRingRecord",// Wired Doorbell
    DeviceVideoNightvisionImageAdjustment = "videoNightvisionImageAdjustment",// Flooglight T8423
    DeviceVideoColorNightvision = "videoColorNightvision",// Flooglight T8423
    DeviceAutoCalibration = "autoCalibration",// Flooglight T8423
    DeviceAutoLock = "autoLock",
    DeviceAutoLockTimer = "autoLockTimer",
    DeviceAutoLockSchedule = "autoLockSchedule",
    DeviceAutoLockScheduleStartTime = "autoLockScheduleStartTime",
    DeviceAutoLockScheduleEndTime = "autoLockScheduleEndTime",
    DeviceOneTouchLocking = "oneTouchLocking",
    DeviceWrongTryProtection = "wrongTryProtection",
    DeviceWrongTryAttempts = "wrongTryAttempts",
    DeviceWrongTryLockdownTime = "wrongTryLockdownTime",
    DeviceScramblePasscode = "scramblePasscode",
    DeviceSound = "sound",
    DeviceNotification = "notification",
    DeviceNotificationUnlocked = "notificationUnlocked",
    DeviceNotificationLocked = "notificationLocked",
    DeviceLoiteringDetection = "loiteringDetection",
    DeviceLoiteringDetectionRange = "loiteringDetectionRange",
    DeviceLoiteringDetectionLength = "loiteringDetectionLength",
    DeviceMotionDetectionSensitivityMode = "motionDetectionSensitivityMode",
    DeviceMotionDetectionSensitivityStandard = "motionDetectionSensitivityStandard",
    DeviceMotionDetectionSensitivityAdvancedA = "motionDetectionSensitivityAdvancedA",
    DeviceMotionDetectionSensitivityAdvancedB = "motionDetectionSensitivityAdvancedB",
    DeviceMotionDetectionSensitivityAdvancedC = "motionDetectionSensitivityAdvancedC",
    DeviceMotionDetectionSensitivityAdvancedD = "motionDetectionSensitivityAdvancedD",
    DeviceMotionDetectionSensitivityAdvancedE = "motionDetectionSensitivityAdvancedE",
    DeviceMotionDetectionSensitivityAdvancedF = "motionDetectionSensitivityAdvancedF",
    DeviceMotionDetectionSensitivityAdvancedG = "motionDetectionSensitivityAdvancedG",
    DeviceMotionDetectionSensitivityAdvancedH = "motionDetectionSensitivityAdvancedH",
    DeviceLoiteringCustomResponsePhoneNotification = "loiteringCustomResponsePhoneNotification",
    DeviceLoiteringCustomResponseAutoVoiceResponse = "loiteringCustomResponseAutoVoiceResponse",
    DeviceLoiteringCustomResponseAutoVoiceResponseVoice = "loiteringCustomResponseAutoVoiceResponseVoice",
    DeviceLoiteringCustomResponseHomeBaseNotification = "loiteringCustomResponseHomeBaseNotification",
    DeviceLoiteringCustomResponseTimeFrom = "loiteringCustomResponseTimeFrom",
    DeviceLoiteringCustomResponseTimeTo = "loiteringCustomResponseTimeTo",
    DeviceDeliveryGuard = "deliveryGuard",
    DeviceDeliveryGuardPackageGuarding = "deliveryGuardPackageGuarding",
    DeviceDeliveryGuardPackageGuardingVoiceResponseVoice = "deliveryGuardPackageGuardingVoiceResponseVoice",
    DeviceDeliveryGuardPackageGuardingActivatedTimeFrom = "deliveryGuardPackageGuardingActivatedTimeFrom",
    DeviceDeliveryGuardPackageGuardingActivatedTimeTo = "deliveryGuardPackageGuardingActivatedTimeTo",
    DeviceDeliveryGuardUncollectedPackageAlert = "deliveryGuardUncollectedPackageAlert",
    DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck = "deliveryGuardUncollectedPackageAlertTimeToCheck",
    DeviceDeliveryGuardPackageLiveCheckAssistance = "deliveryGuardPackageLiveCheckAssistance",
    DeviceDualCamWatchViewMode = "dualCamWatchViewMode",
    DeviceRingAutoResponse = "ringAutoResponse",
    DeviceRingAutoResponseVoiceResponse = "ringAutoResponseVoiceResponse",
    DeviceRingAutoResponseVoiceResponseVoice = "ringAutoResponseVoiceResponseVoice",
    DeviceRingAutoResponseTimeFrom = "ringAutoResponseTimeFrom",
    DeviceRingAutoResponseTimeTo = "ringAutoResponseTimeTo",
    DeviceDefaultAngle = "defaultAngle",
    DeviceDefaultAngleIdleTime = "defaultAngleIdleTime",
    DeviceSoundDetectionRoundLook = "soundDetectionRoundLook",
    DevicePackageDelivered = "packageDelivered",
    DevicePackageStranded = "packageStranded",
    DevicePackageTaken = "packageTaken",
    DeviceSomeoneLoitering = "someoneLoitering",
    DeviceRadarMotionDetected = "radarMotionDetected",
    DeviceLeftOpenAlarm = "leftOpenAlarm",
    DeviceLeftOpenAlarmDuration = "leftOpenAlarmDuration",
    DeviceDualUnlock = "dualUnlock",
    DevicePowerSave = "powerSave",
    DeviceInteriorBrightness = "interiorBrightness",
    DeviceInteriorBrightnessDuration = "interiorBrightnessDuration",
    DeviceTamperAlarm = "tamperAlarm",
    DeviceRemoteUnlock = "remoteUnlock",
    DeviceRemoteUnlockMasterPIN = "remoteUnlockMasterPIN",
    DeviceAlarmVolume = "alarmVolume",
    DevicePromptVolume = "promptVolume",
    DeviceNotificationUnlockByKey = "notificationUnlockByKey",
    DeviceNotificationUnlockByPIN = "notificationUnlockByPIN",
    DeviceNotificationUnlockByFingerprint = "notificationUnlockByFingerprint",
    DeviceNotificationUnlockByApp = "notificationUnlockByApp",
    DeviceNotificationDualUnlock = "notificationDualUnlock",
    DeviceNotificationDualLock = "notificationDualLock",
    DeviceNotificationWrongTryProtect = "notificationWrongTryProtect",
    DeviceNotificationJammed = "notificationJammed",
    DeviceJammedAlert = "jammedAlert",
    Device911Alert = "911Alert",
    Device911AlertEvent = "911AlertEvent",
    DeviceShakeAlert = "shakeAlert",
    DeviceShakeAlertEvent = "shakeAlertEvent",
    DeviceLowBatteryAlert = "lowBatteryAlert",
    DeviceLongTimeNotCloseAlert = "longTimeNotCloseAlert",
    DeviceWrongTryProtectAlert = "wrongTryProtectAlert",
    DeviceVideoTypeStoreToNAS = "videoTypeStoreToNAS",
    DeviceSnooze = "snooze",
    DeviceSnoozeTime = "snoozeTime",
    DeviceSnoozeStartTime = "snoozeStartTime",
    DeviceSnoozeHomebase = "snoozeHomebase",
    DeviceSnoozeMotion = "snoozeMotion",
    DeviceSnoozeChime = "snoozeStartChime",
    DeviceIdentityPersonDetected = "identityPersonDetected",
    DeviceStrangerPersonDetected = "strangerPersonDetected",
    DeviceVehicleDetected = "vehicleDetected",
    DeviceDogDetected = "dogDetected",
    DeviceDogLickDetected = "dogLickDetected",
    DeviceDogPoopDetected = "dogPoopDetected",
    DeviceDetectionStatisticsWorkingDays = "detectionStatisticsWorkingDays",
    DeviceDetectionStatisticsDetectedEvents = "detectionStatisticsDetectedEvents",
    DeviceDetectionStatisticsRecordedEvents = "detectionStatisticsRecordedEvents",
    DeviceCellularRSSI = "cellularRSSI",
    DeviceCellularSignalLevel = "cellularSignalLevel",
    DeviceCellularSignal = "cellularSignal",
    DeviceCellularBand = "cellularBand",
    DeviceCellularIMEI = "cellularIMEI",
    DeviceCellularICCID = "cellularICCID",
    DeviceDoorControlWarning = "doorControlWarning",
    DeviceDoor1Open = "door1Open",
    DeviceDoor2Open = "door2Open",
    DeviceDoorSensor1Status = "doorSensor1Status",
    DeviceDoorSensor2Status = "doorSensor2Status",
    DeviceDoorSensor1MacAddress = "doorSensor1MacAddress",
    DeviceDoorSensor2MacAddress = "doorSensor2MacAddress",
    DeviceDoorSensor1Name = "doorSensor1Name",
    DeviceDoorSensor2Name = "doorSensor2Name",
    DeviceDoorSensor1SerialNumber = "doorSensor1SerialNumber",
    DeviceDoorSensor2SerialNumber = "doorSensor2SerialNumber",
    DeviceDoorSensor1Version = "doorSensor1Version",
    DeviceDoorSensor2Version = "doorSensor2Version",
    DeviceDoorSensor1LowBattery = "doorSensor1LowBattery",
    DeviceDoorSensor2LowBattery = "doorSensor2LowBattery",
    DeviceDoorSensor1BatteryLevel = "doorSensor1BatteryLevel",
    DeviceDoorSensor2BatteryLevel = "doorSensor2BatteryLevel",
    DeviceLocationCoordinates = "locationCoordinates",
    DeviceLocationAddress = "locationAddress",
    DeviceLocationLastUpdate = "locationLastUpdate",
    DeviceTrackerType = "trackerType",
    DeviceLeftBehindAlarm = "leftBehindAlarm",
    DeviceFindPhone = "findPhone",
    DeviceFlickerAdjustment = "flickerAdjustment",
    DeviceLeavingDetection = "leavingDetection",
    DeviceLeavingReactionNotification = "leavingReactionNotification",
    DeviceLeavingReactionStartTime = "leavingReactionStartTime",
    DeviceLeavingReactionEndTime = "leavingReactionEndTime",
    DeviceSomeoneGoing = "someoneGoing",
    DeviceLockEventOrigin = "lockEventOrigin",
    DeviceBeepVolume = "beepVolume",
    DeviceNightvisionOptimization = "nightvisionOptimization",
    DeviceNightvisionOptimizationSide = "nightvisionOptimizationSide",
    DeviceOpenMethod = "openMethod",
    DeviceMotionActivatedPrompt = "motionActivatedPrompt",
    DeviceOpen = "open",
    DeviceOpenedByType = "openedByType",
    DeviceOpenedByName = "openedByName",
    DeviceTamperingAlert = "tamperingAlert",
    DeviceLowTemperatureAlert = "lowTemperatureAlert",
    DeviceHighTemperatureAlert = "highTemperatureAlert",
    DeviceLidStuckAlert = "lidStuckAlert",
    DevicePinIncorrectAlert = "pinIncorrectAlert",
    DeviceBatteryFullyChargedAlert = "batteryFullyChargedAlert",
    DeviceIsDeliveryDenied = "isDeliveryDenied",
    DeviceHasMasterPin = "hasMasterPin",
    DeviceDeliveries = "deliveries",
    DeviceHiddenMotionDetectionSensitivity = "hidden-motionDetectionSensitivity",
    DeviceHiddenMotionDetectionMode = "hidden-motionDetectionMode",
    StationLANIpAddress = "lanIpAddress",
    StationMacAddress = "macAddress",
    StationGuardMode = "guardMode",
    StationCurrentMode = "currentMode",
    StationTimeFormat = "timeFormat",
    StationTimeZone = "timeZone",
    StationAlarmVolume = "alarmVolume",
    StationAlarmTone = "alarmTone",
    StationPromptVolume = "promptVolume",
    StationNotificationSwitchModeSchedule = "notificationSwitchModeSchedule",
    StationNotificationSwitchModeGeofence = "notificationSwitchModeGeofence",
    StationNotificationSwitchModeApp = "notificationSwitchModeApp",
    StationNotificationSwitchModeKeypad = "notificationSwitchModeKeypad",
    StationNotificationStartAlarmDelay = "notificationStartAlarmDelay",
    StationSwitchModeWithAccessCode = "switchModeWithAccessCode",
    StationAutoEndAlarm = "autoEndAlarm",
    StationTurnOffAlarmWithButton = "turnOffAlarmWithButton",
    StationHomeSecuritySettings = "hidden-stationHomeSecuritySettings",
    StationAwaySecuritySettings = "hidden-stationAwaySecuritySettings",
    StationCustom1SecuritySettings = "hidden-stationCustom1SecuritySettings",
    StationCustom2SecuritySettings = "hidden-stationCustom2SecuritySettings",
    StationCustom3SecuritySettings = "hidden-stationCustom3SecuritySettings",
    StationOffSecuritySettings = "hidden-stationOffSecuritySettings",
    StationAlarm = "alarm",
    StationAlarmType = "alarmType",
    StationAlarmArmed = "alarmArmed",
    StationAlarmArmDelay = "alarmArmDelay",
    StationAlarmDelay = "alarmDelay",
    StationAlarmDelayType = "alarmDelayType",
    StationSdStatus = "sdStatus",
    StationSdCapacity = "sdCapacity",
    StationSdCapacityAvailable = "sdCapacityAvailable",
    StationStorageInfoEmmc = "storageInfoEmmc",
    StationStorageInfoHdd = "storageInfoHdd",
    StationCrossCameraTracking = "crossCameraTracking",
    StationContinuousTrackingTime = "continuousTrackingTime",
    StationTrackingAssistance = "trackingAssistance",
    StationCrossTrackingCameraList = "crossTrackingCameraList",
    StationCrossTrackingGroupList = "crossTrackingGroupList"
}
export declare const DeviceNameProperty: PropertyMetadataString;
export declare const DeviceModelProperty: PropertyMetadataString;
export declare const DeviceSerialNumberProperty: PropertyMetadataString;
export declare const GenericHWVersionProperty: PropertyMetadataString;
export declare const GenericSWVersionProperty: PropertyMetadataString;
export declare const GenericTypeProperty: PropertyMetadataNumeric;
export declare const BaseDeviceProperties: IndexedProperty;
export declare const GenericDeviceProperties: IndexedProperty;
export declare const DeviceBatteryProperty: PropertyMetadataNumeric;
export declare const DeviceBatteryLockProperty: PropertyMetadataNumeric;
export declare const DeviceBatteryTrackerProperty: PropertyMetadataNumeric;
export declare const DeviceBatteryLowMotionSensorProperty: PropertyMetadataBoolean;
export declare const DeviceBatteryLowKeypadProperty: PropertyMetadataBoolean;
export declare const DeviceBatteryLowSensorProperty: PropertyMetadataBoolean;
export declare const DeviceBatteryTempProperty: PropertyMetadataNumeric;
export declare const DeviceBatteryIsChargingKeypadProperty: PropertyMetadataBoolean;
export declare const DeviceAntitheftDetectionProperty: PropertyMetadataBoolean;
export declare const DeviceAutoNightvisionProperty: PropertyMetadataBoolean;
export declare const DeviceAutoNightvisionWiredDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceAutoNightvisionSoloProperty: PropertyMetadataBoolean;
export declare const DeviceNightvisionProperty: PropertyMetadataNumeric;
export declare const DeviceNightvisionS350Property: PropertyMetadataNumeric;
export declare const DeviceWifiRSSIProperty: PropertyMetadataNumeric;
export declare const DeviceWifiSignalLevelProperty: PropertyMetadataNumeric;
export declare const DeviceCellularRSSIProperty: PropertyMetadataNumeric;
export declare const DeviceCellularSignalLevelProperty: PropertyMetadataNumeric;
export declare const DeviceCellularSignalProperty: PropertyMetadataString;
export declare const DeviceCellularBandProperty: PropertyMetadataString;
export declare const DeviceCellularIMEIProperty: PropertyMetadataString;
export declare const DeviceCellularICCIDProperty: PropertyMetadataString;
export declare const DeviceWifiRSSILockProperty: PropertyMetadataNumeric;
export declare const DeviceWifiRSSIEntrySensorProperty: PropertyMetadataNumeric;
export declare const DeviceWifiRSSIKeypadProperty: PropertyMetadataNumeric;
export declare const DeviceWifiRSSISmartSafeProperty: PropertyMetadataNumeric;
export declare const DeviceEnabledProperty: PropertyMetadataBoolean;
export declare const DeviceEnabledStandaloneProperty: PropertyMetadataBoolean;
export declare const DeviceEnabledSoloProperty: PropertyMetadataBoolean;
export declare const DeviceEnabledIndoorMiniProperty: PropertyMetadataBoolean;
export declare const DeviceEnabledIndoorS350Property: PropertyMetadataBoolean;
export declare const DeviceStatusLedProperty: PropertyMetadataBoolean;
export declare const DeviceStatusLedIndoorFloodProperty: PropertyMetadataBoolean;
export declare const DeviceStatusLedBatteryDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceStatusLedIndoorS350Property: PropertyMetadataBoolean;
export declare const DeviceStatusLedBatteryDoorbellDualProperty: PropertyMetadataNumeric;
export declare const DeviceStatusLedDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceStatusLedT8200XProperty: PropertyMetadataBoolean;
export declare const DeviceMotionDetectionProperty: PropertyMetadataBoolean;
export declare const DeviceMotionDetectionIndoorSoloFloodProperty: PropertyMetadataBoolean;
export declare const DeviceMotionDetectionDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceSoundDetectionProperty: PropertyMetadataBoolean;
export declare const DevicePetDetectionProperty: PropertyMetadataBoolean;
export declare const DeviceRTSPStreamProperty: PropertyMetadataBoolean;
export declare const DeviceRTSPStreamUrlProperty: PropertyMetadataString;
export declare const DeviceWatermarkProperty: PropertyMetadataNumeric;
export declare const DeviceWatermarkIndoorFloodProperty: PropertyMetadataNumeric;
export declare const DeviceWatermarkSoloWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceWatermarkBatteryDoorbellCamera1Property: PropertyMetadataNumeric;
export declare const DeviceWatermarkGarageCameraProperty: PropertyMetadataNumeric;
export declare const DeviceStateProperty: PropertyMetadataNumeric;
export declare const DeviceStateLockProperty: PropertyMetadataNumeric;
export declare const DeviceLastChargingDaysProperty: PropertyMetadataNumeric;
export declare const DeviceLastChargingTotalEventsProperty: PropertyMetadataNumeric;
export declare const DeviceLastChargingRecordedEventsProperty: PropertyMetadataNumeric;
export declare const DeviceLastChargingFalseEventsProperty: PropertyMetadataNumeric;
export declare const DeviceBatteryUsageLastWeekProperty: PropertyMetadataNumeric;
export declare const DeviceLockedProperty: PropertyMetadataBoolean;
export declare const DeviceLockedSmartSafeProperty: PropertyMetadataBoolean;
export declare const DeviceMotionDetectedProperty: PropertyMetadataBoolean;
export declare const DevicePersonDetectedProperty: PropertyMetadataBoolean;
export declare const DevicePetDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceSoundDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceCryingDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceRingingProperty: PropertyMetadataBoolean;
export declare const DeviceSensorOpenProperty: PropertyMetadataBoolean;
export declare const DeviceSensorChangeTimeProperty: PropertyMetadataNumeric;
export declare const DeviceMotionSensorPIREventProperty: PropertyMetadataNumeric;
export declare const DeviceBasicLockStatusProperty: PropertyMetadataNumeric;
export declare const DeviceAdvancedLockStatusProperty: PropertyMetadataNumeric;
export declare const DevicePictureUrlProperty: PropertyMetadataString;
export declare const DeviceMotionHB3DetectionTypeHumanProperty: PropertyMetadataBoolean;
export declare const DeviceMotionDetectionTypeHumanWallLightProperty: PropertyMetadataBoolean;
export declare const DeviceMotionHB3DetectionTypeHumanRecognitionProperty: PropertyMetadataBoolean;
export declare const DeviceMotionHB3DetectionTypePetProperty: PropertyMetadataBoolean;
export declare const DeviceMotionHB3DetectionTypeVehicleProperty: PropertyMetadataBoolean;
export declare const DeviceMotionHB3DetectionTypeAllOtherMotionsProperty: PropertyMetadataBoolean;
export declare const DeviceMotionDetectionTypeAllOtherMotionsWalllightProperty: PropertyMetadataBoolean;
export declare const DeviceMotionDetectionTypeProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionTypeT8200XProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionCamera1Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionTypeFloodlightT8423Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionTypeFloodlightProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionTypeIndoorProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionTypeIndoorS350Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionTypeIndoorMiniProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityCamera2Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityCamera1Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityIndoorProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityBatteryDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityDoorbellE340Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivitySoloProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityFloodlightT8420Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityGarageCameraProperty: PropertyMetadataNumeric;
export declare const DeviceHiddenMotionDetectionSensitivityWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceHiddenMotionDetectionModeWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceMotionZoneProperty: PropertyMetadataObject;
export declare const DeviceFloodlightLightProperty: PropertyMetadataBoolean;
export declare const DeviceFloodlightLightSettingsEnableProperty: PropertyMetadataBoolean;
export declare const DeviceFloodlightLightSettingsBrightnessManualProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsBrightnessManualCamera3Property: PropertyMetadataNumeric;
export declare const DeviceCameraLightSettingsBrightnessManualProperty: PropertyMetadataNumeric;
export declare const DeviceCameraLightSettingsBrightnessManualWalllightS120Property: PropertyMetadataNumeric;
export declare const DeviceFloodlightLightSettingsBrightnessMotionProperty: PropertyMetadataNumeric;
export declare const DeviceFloodlightLightSettingsBrightnessMotionT8425Property: PropertyMetadataNumeric;
export declare const DeviceFloodlightLightSettingsBrightnessScheduleProperty: PropertyMetadataNumeric;
export declare const DeviceFloodlightLightSettingsBrightnessScheduleT8425Property: PropertyMetadataNumeric;
export declare const DeviceFloodlightLightSettingsMotionTriggeredProperty: PropertyMetadataBoolean;
export declare const DeviceFloodlightLightSettingsMotionTriggeredT8425Property: PropertyMetadataBoolean;
export declare const DeviceFloodlightLightSettingsMotionTriggeredDistanceProperty: PropertyMetadataNumeric;
export declare const DeviceFloodlightLightSettingsMotionTriggeredTimerProperty: PropertyMetadataNumeric;
export declare const DeviceFloodlightLightSettingsMotionTriggeredTimerT8425Property: PropertyMetadataNumeric;
export declare const DeviceMicrophoneProperty: PropertyMetadataBoolean;
export declare const DeviceSpeakerProperty: PropertyMetadataBoolean;
export declare const DeviceAudioRecordingProperty: PropertyMetadataBoolean;
export declare const DeviceAudioRecordingIndoorSoloFloodlightProperty: PropertyMetadataBoolean;
export declare const DeviceAudioRecordingStarlight4gLTEProperty: PropertyMetadataBoolean;
export declare const DeviceAudioRecordingWiredDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceAudioRecordingFloodlightT8420Property: PropertyMetadataBoolean;
export declare const DeviceMotionTrackingProperty: PropertyMetadataBoolean;
export declare const DeviceSpeakerVolumeProperty: PropertyMetadataNumeric;
export declare const DeviceSpeakerVolumeSoloProperty: PropertyMetadataNumeric;
export declare const DeviceSpeakerVolumeCamera3Property: PropertyMetadataNumeric;
export declare const DeviceSpeakerVolumeIndoorFloodDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceSpeakerVolumeWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceSpeakerVolumeFloodlightT8420Property: PropertyMetadataNumeric;
export declare const DeviceSpeakerVolumeWalllightProperty: PropertyMetadataNumeric;
export declare const DeviceSpeakerVolumeSmartDropProperty: PropertyMetadataNumeric;
export declare const DeviceRingtoneVolumeBatteryDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceRingtoneVolumeWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceRingtoneVolumeT8200XProperty: PropertyMetadataNumeric;
export declare const DevicePowerSourceProperty: PropertyMetadataNumeric;
export declare const DevicePowerWorkingModeProperty: PropertyMetadataNumeric;
export declare const DevicePowerWorkingModeSmartDropProperty: PropertyMetadataNumeric;
export declare const DevicePowerWorkingModeBatteryDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceChargingStatusProperty: PropertyMetadataNumeric;
export declare const DeviceRecordingClipLengthProperty: PropertyMetadataNumeric;
export declare const DeviceRecordingClipLengthFloodlightProperty: PropertyMetadataNumeric;
export declare const DeviceRecordingClipLengthWalllightProperty: PropertyMetadataNumeric;
export declare const DeviceRecordingClipLengthWalllightS120Property: PropertyMetadataNumeric;
export declare const DeviceRecordingClipLengthOutdoorPTProperty: PropertyMetadataNumeric;
export declare const DeviceRecordingRetriggerIntervalProperty: PropertyMetadataNumeric;
export declare const DeviceRecordingRetriggerIntervalBatteryDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceRecordingRetriggerIntervalFloodlightProperty: PropertyMetadataNumeric;
export declare const DeviceRecordingEndClipMotionStopsProperty: PropertyMetadataBoolean;
export declare const DeviceVideoStreamingQualityProperty: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualityBatteryDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualityCameraProperty: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualitySoloProperty: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualityWalllightProperty: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualityCamera3Property: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualityCameraProfessionalProperty: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualityDoorbellE340Property: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualityS350Property: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualityS340Property: PropertyMetadataNumeric;
export declare const DeviceVideoStreamingQualitySmartDropProperty: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityIndoorProperty: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityProperty: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityDoorbellE340Property: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityS340Property: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityS350Property: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityWalllightProperty: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityT8200XProperty: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityCamera2CProProperty: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityCamera3Property: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualitySoloProperty: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualitySoloCamerasHB3Property: PropertyMetadataNumeric;
export declare const DeviceVideoRecordingQualityT8530Property: PropertyMetadataNumeric;
export declare const DeviceWDRProperty: PropertyMetadataBoolean;
export declare const DeviceChimeIndoorBatteryDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceChimeIndoorWiredDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceChimeIndoorT8200XProperty: PropertyMetadataBoolean;
export declare const DeviceChimeHomebaseBatteryDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationTypeProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationTypeIndoorFloodlightProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationTypeBatteryDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationTypeWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationTypeWalllightProperty: PropertyMetadataNumeric;
export declare const DeviceRotationSpeedProperty: PropertyMetadataNumeric;
export declare const DeviceImageMirroredProperty: PropertyMetadataBoolean;
export declare const DeviceSoundDetectionTypeProperty: PropertyMetadataNumeric;
export declare const DeviceSoundDetectionTypeS350Property: PropertyMetadataNumeric;
export declare const DeviceSoundDetectionSensitivityProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationPersonProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationPersonWalllightProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationPetProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationAllOtherMotionProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationAllOtherMotionWalllightProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationAllSoundProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationCryingProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationRingProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationRingWiredDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationMotionProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationRadarDetectorProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationMotionWiredDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceChirpVolumeEntrySensorProperty: PropertyMetadataNumeric;
export declare const DeviceChirpToneEntrySensorProperty: PropertyMetadataNumeric;
export declare const DeviceVideoHDRWiredDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceVideoDistortionCorrectionWiredDoorbellProperty: PropertyMetadataBoolean;
export declare const DeviceVideoRingRecordWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeT8425Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeStandardSensitivityProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeStandardSensitivityT8425Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeAdvancedLeftSensitivityProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeAdvancedLeftSensitivityT8425Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeAdvancedMiddleSensitivityProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeAdvancedRightSensitivityProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionRangeAdvancedRightSensitivityT8425Property: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionTestModeProperty: PropertyMetadataBoolean;
export declare const DeviceMotionDetectionTestModeT8425Property: PropertyMetadataBoolean;
export declare const DeviceMotionTrackingSensitivityProperty: PropertyMetadataNumeric;
export declare const DeviceMotionAutoCruiseProperty: PropertyMetadataBoolean;
export declare const DeviceMotionOutOfViewDetectionProperty: PropertyMetadataBoolean;
export declare const DeviceLightSettingsColorTemperatureManualProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsColorTemperatureMotionProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsColorTemperatureScheduleProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsMotionActivationModeProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsMotionActivationModeT8425Property: PropertyMetadataNumeric;
export declare const DeviceVideoNightvisionImageAdjustmentProperty: PropertyMetadataBoolean;
export declare const DeviceVideoColorNightvisionProperty: PropertyMetadataBoolean;
export declare const DeviceAutoCalibrationProperty: PropertyMetadataBoolean;
export declare const DeviceAutoLockProperty: PropertyMetadataBoolean;
export declare const DeviceAutoLockTimerProperty: PropertyMetadataNumeric;
export declare const DeviceAutoLockScheduleProperty: PropertyMetadataBoolean;
export declare const DeviceAutoLockScheduleStartTimeProperty: PropertyMetadataString;
export declare const DeviceAutoLockScheduleEndTimeProperty: PropertyMetadataString;
export declare const DeviceOneTouchLockingProperty: PropertyMetadataBoolean;
export declare const DeviceWrongTryProtectionProperty: PropertyMetadataBoolean;
export declare const DeviceWrongTryProtectionSmartSafeProperty: PropertyMetadataBoolean;
export declare const DeviceWrongTryLockdownTimeProperty: PropertyMetadataNumeric;
export declare const DeviceWrongTryLockdownTimeSmartSafeProperty: PropertyMetadataNumeric;
export declare const DeviceWrongTryAttemptsProperty: PropertyMetadataNumeric;
export declare const DeviceWrongTryAttemptsSmartSafeProperty: PropertyMetadataNumeric;
export declare const DeviceScramblePasscodeProperty: PropertyMetadataBoolean;
export declare const DeviceScramblePasscodeSmartSafeProperty: PropertyMetadataBoolean;
export declare const DeviceSoundProperty: PropertyMetadataNumeric;
export declare const DeviceSoundSimpleProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationSmartLockProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationWalllightProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationUnlockedProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationUnlockedSmartLockProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationLockedProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationLockedSmartLockProperty: PropertyMetadataBoolean;
export declare const DeviceLoiteringDetectionProperty: PropertyMetadataBoolean;
export declare const DeviceLoiteringDetectionRangeProperty: PropertyMetadataNumeric;
export declare const DeviceLoiteringDetectionLengthProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityModeProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityStandardProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityAdvancedAProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityAdvancedBProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityAdvancedCProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityAdvancedDProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityAdvancedEProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityAdvancedFProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityAdvancedGProperty: PropertyMetadataNumeric;
export declare const DeviceMotionDetectionSensitivityAdvancedHProperty: PropertyMetadataNumeric;
export declare const DeviceLoiteringCustomResponsePhoneNotificationProperty: PropertyMetadataBoolean;
export declare const DeviceLoiteringCustomResponseAutoVoiceResponseProperty: PropertyMetadataBoolean;
export declare const DeviceLoiteringCustomResponseAutoVoiceResponseVoiceProperty: PropertyMetadataNumeric;
export declare const DeviceLoiteringCustomResponseHomeBaseNotificationProperty: PropertyMetadataBoolean;
export declare const DeviceLoiteringCustomResponseTimeFromProperty: PropertyMetadataString;
export declare const DeviceLoiteringCustomResponseTimeToProperty: PropertyMetadataString;
export declare const DeviceDeliveryGuardProperty: PropertyMetadataBoolean;
export declare const DeviceDeliveryGuardPackageGuardingProperty: PropertyMetadataBoolean;
export declare const DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty: PropertyMetadataNumeric;
export declare const DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty: PropertyMetadataString;
export declare const DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty: PropertyMetadataString;
export declare const DeviceDeliveryGuardUncollectedPackageAlertProperty: PropertyMetadataBoolean;
export declare const DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty: PropertyMetadataString;
export declare const DeviceDeliveryGuardPackageLiveCheckAssistanceProperty: PropertyMetadataBoolean;
export declare const DeviceDualCamWatchViewModeProperty: PropertyMetadataNumeric;
export declare const DeviceDualCamWatchViewModeE340Property: PropertyMetadataNumeric;
export declare const DeviceDualCamWatchViewModeS340Property: PropertyMetadataNumeric;
export declare const DeviceRingAutoResponseProperty: PropertyMetadataBoolean;
export declare const DeviceRingAutoResponseVoiceResponseProperty: PropertyMetadataBoolean;
export declare const DeviceRingAutoResponseVoiceResponseVoiceProperty: PropertyMetadataNumeric;
export declare const DeviceRingAutoResponseTimeFromProperty: PropertyMetadataString;
export declare const DeviceRingAutoResponseTimeToProperty: PropertyMetadataString;
export declare const DeviceContinuousRecordingProperty: PropertyMetadataBoolean;
export declare const DeviceContinuousRecordingTypeProperty: PropertyMetadataNumeric;
export declare const DeviceDefaultAngleProperty: PropertyMetadataBoolean;
export declare const DeviceDefaultAngleIdleTimeProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationIntervalTimeProperty: PropertyMetadataNumeric;
export declare const DeviceSoundDetectionRoundLookProperty: PropertyMetadataBoolean;
export declare const DeviceSoundDetectionRoundLookS350Property: PropertyMetadataBoolean;
export declare const StationHomeSecuritySettings: PropertyMetadataString;
export declare const StationAwaySecuritySettings: PropertyMetadataString;
export declare const StationCustom1SecuritySettings: PropertyMetadataString;
export declare const StationCustom2SecuritySettings: PropertyMetadataString;
export declare const StationCustom3SecuritySettings: PropertyMetadataString;
export declare const StationOffSecuritySettings: PropertyMetadataString;
export declare const DevicePackageDeliveredProperty: PropertyMetadataBoolean;
export declare const DevicePackageStrandedProperty: PropertyMetadataBoolean;
export declare const DevicePackageTakenProperty: PropertyMetadataBoolean;
export declare const DeviceSomeoneLoiteringProperty: PropertyMetadataBoolean;
export declare const DeviceRadarMotionDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceLeftOpenAlarmProperty: PropertyMetadataBoolean;
export declare const DeviceLeftOpenAlarmDurationProperty: PropertyMetadataNumeric;
export declare const DeviceDualUnlockProperty: PropertyMetadataBoolean;
export declare const DevicePowerSaveProperty: PropertyMetadataBoolean;
export declare const DeviceInteriorBrightnessProperty: PropertyMetadataNumeric;
export declare const DeviceInteriorBrightnessDurationProperty: PropertyMetadataNumeric;
export declare const DeviceTamperAlarmProperty: PropertyMetadataNumeric;
export declare const DeviceRemoteUnlockProperty: PropertyMetadataBoolean;
export declare const DeviceRemoteUnlockMasterPINProperty: PropertyMetadataBoolean;
export declare const DevicePromptVolumeProperty: PropertyMetadataNumeric;
export declare const DeviceAlarmVolumeProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationUnlockByKeyProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationUnlockByPINProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationUnlockByFingerprintProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationUnlockByAppProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationDualUnlockProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationDualLockProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationWrongTryProtectProperty: PropertyMetadataBoolean;
export declare const DeviceNotificationJammedProperty: PropertyMetadataBoolean;
export declare const DeviceJammedAlertProperty: PropertyMetadataBoolean;
export declare const Device911AlertProperty: PropertyMetadataBoolean;
export declare const Device911AlertEventProperty: PropertyMetadataNumeric;
export declare const DeviceShakeAlertProperty: PropertyMetadataBoolean;
export declare const DeviceShakeAlertEventProperty: PropertyMetadataNumeric;
export declare const DeviceLowBatteryAlertProperty: PropertyMetadataBoolean;
export declare const DeviceLongTimeNotCloseAlertProperty: PropertyMetadataBoolean;
export declare const DeviceWrongTryProtectAlertProperty: PropertyMetadataBoolean;
export declare const DeviceVideoTypeStoreToNASProperty: PropertyMetadataNumeric;
export declare const DeviceSnoozeProperty: PropertyMetadataBoolean;
export declare const DeviceSnoozeTimeProperty: PropertyMetadataNumeric;
export declare const DeviceSnoozeStartTimeProperty: PropertyMetadataNumeric;
export declare const DeviceSnoozeStartTimeWiredDoorbellProperty: PropertyMetadataNumeric;
export declare const DeviceSnoozeHomebaseProperty: PropertyMetadataBoolean;
export declare const DeviceSnoozeMotionProperty: PropertyMetadataBoolean;
export declare const DeviceSnoozeChimeProperty: PropertyMetadataBoolean;
export declare const DevicePersonNameProperty: PropertyMetadataString;
export declare const DeviceIdentityPersonDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceStrangerPersonDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceVehicleDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceDogDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceDogLickDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceDogPoopDetectedProperty: PropertyMetadataBoolean;
export declare const DeviceDetectionStatisticsWorkingDaysProperty: PropertyMetadataNumeric;
export declare const DeviceDetectionStatisticsDetectedEventsProperty: PropertyMetadataNumeric;
export declare const DeviceDetectionStatisticsRecordedEventsProperty: PropertyMetadataNumeric;
export declare const DevicePictureProperty: PropertyMetadataObject;
export declare const DeviceLightSettingsManualDailyLightingProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsManualColoredLightingProperty: PropertyMetadataObject;
export declare const DeviceLightSettingsManualDynamicLightingProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsManualLightingActiveModeProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsMotionDailyLightingProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsMotionColoredLightingProperty: PropertyMetadataObject;
export declare const DeviceLightSettingsMotionDynamicLightingProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsMotionLightingActiveModeProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsScheduleDailyLightingProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsScheduleColoredLightingProperty: PropertyMetadataObject;
export declare const DeviceLightSettingsScheduleDynamicLightingProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsScheduleLightingActiveModeProperty: PropertyMetadataNumeric;
export declare const DeviceLightSettingsColoredLightingColorsProperty: PropertyMetadataObject;
export declare const DeviceLightSettingsDynamicLightingThemesProperty: PropertyMetadataObject;
export declare const DeviceDoorControlWarningProperty: PropertyMetadataBoolean;
export declare const DeviceDoor1OpenProperty: PropertyMetadataBoolean;
export declare const DeviceDoor2OpenProperty: PropertyMetadataBoolean;
export declare const DeviceDoorSensor1StatusProperty: PropertyMetadataNumeric;
export declare const DeviceDoorSensor2StatusProperty: PropertyMetadataNumeric;
export declare const DeviceDoorSensor1MacAddressProperty: PropertyMetadataString;
export declare const DeviceDoorSensor2MacAddressProperty: PropertyMetadataString;
export declare const DeviceDoorSensor1NameProperty: PropertyMetadataString;
export declare const DeviceDoorSensor2NameProperty: PropertyMetadataString;
export declare const DeviceDoorSensor1SerialNumberProperty: PropertyMetadataString;
export declare const DeviceDoorSensor2SerialNumberProperty: PropertyMetadataString;
export declare const DeviceDoorSensor1VersionProperty: PropertyMetadataString;
export declare const DeviceDoorSensor2VersionProperty: PropertyMetadataString;
export declare const DeviceDoorSensor1LowBatteryProperty: PropertyMetadataBoolean;
export declare const DeviceDoorSensor2LowBatteryProperty: PropertyMetadataBoolean;
export declare const DeviceDoorSensor1BatteryLevelProperty: PropertyMetadataNumeric;
export declare const DeviceDoorSensor2BatteryLevelProperty: PropertyMetadataNumeric;
export declare const DeviceLocationCoordinatesProperty: PropertyMetadataString;
export declare const DeviceLocationAddressProperty: PropertyMetadataString;
export declare const DeviceLocationLastUpdateProperty: PropertyMetadataNumeric;
export declare const DeviceTrackerTypeProperty: PropertyMetadataNumeric;
export declare const DeviceLeftBehindAlarmProperty: PropertyMetadataBoolean;
export declare const DeviceFindPhoneProperty: PropertyMetadataBoolean;
export declare const DeviceFlickerAdjustmentProperty: PropertyMetadataNumeric;
export declare const DeviceNotificationPersonS350Property: PropertyMetadataBoolean;
export declare const DeviceNotificationPetS350Property: PropertyMetadataBoolean;
export declare const DeviceNotificationAllOtherMotionS350Property: PropertyMetadataBoolean;
export declare const DeviceNotificationAllSoundS350Property: PropertyMetadataBoolean;
export declare const DeviceNotificationCryingS350Property: PropertyMetadataBoolean;
export declare const DeviceNotificationVehicleProperty: PropertyMetadataBoolean;
export declare const DeviceLeavingDetectionProperty: PropertyMetadataBoolean;
export declare const DeviceLeavingReactionNotificationProperty: PropertyMetadataBoolean;
export declare const DeviceLeavingReactionStartTimeProperty: PropertyMetadataString;
export declare const DeviceLeavingReactionEndTimeProperty: PropertyMetadataString;
export declare const DeviceSomeoneGoingProperty: PropertyMetadataBoolean;
export declare const DeviceLockEventOriginProperty: PropertyMetadataNumeric;
export declare const DeviceBeepVolumeProperty: PropertyMetadataNumeric;
export declare const DeviceNightvisionOptimizationProperty: PropertyMetadataBoolean;
export declare const DeviceNightvisionOptimizationSideProperty: PropertyMetadataNumeric;
export declare const DeviceOpenMethodProperty: PropertyMetadataNumeric;
export declare const DeviceMotionActivatedPromptProperty: PropertyMetadataBoolean;
export declare const DeviceOpenProperty: PropertyMetadataBoolean;
export declare const DeviceOpenedByTypeProperty: PropertyMetadataNumeric;
export declare const DeviceOpenedByNameProperty: PropertyMetadataString;
export declare const DeviceTamperingAlertProperty: PropertyMetadataBoolean;
export declare const DeviceLowTemperatureAlertProperty: PropertyMetadataBoolean;
export declare const DeviceHighTemperatureAlertProperty: PropertyMetadataBoolean;
export declare const DeviceLidStuckAlertProperty: PropertyMetadataBoolean;
export declare const DevicePinIncorrectAlertProperty: PropertyMetadataBoolean;
export declare const DeviceBatteryFullyChargedAlertProperty: PropertyMetadataBoolean;
export declare const DeviceIsDeliveryDeniedProperty: PropertyMetadataBoolean;
export declare const DeviceHasMasterPinProperty: PropertyMetadataBoolean;
export declare const DeviceDeliveriesProperty: PropertyMetadataNumeric;
export declare const FloodlightT8420XDeviceProperties: IndexedProperty;
export declare const WiredDoorbellT8200XDeviceProperties: IndexedProperty;
export declare const LockT8510PDeviceProperties: IndexedProperty;
export declare const LockT8520PDeviceProperties: IndexedProperty;
export declare const DeviceProperties: Properties;
export declare const StationNameProperty: PropertyMetadataString;
export declare const StationModelProperty: PropertyMetadataString;
export declare const StationSerialNumberProperty: PropertyMetadataString;
export declare const BaseStationProperties: IndexedProperty;
export declare const StationGuardModeProperty: PropertyMetadataNumeric;
export declare const StationGuardModeKeyPadProperty: PropertyMetadataNumeric;
export declare const StationCurrentModeProperty: PropertyMetadataNumeric;
export declare const StationCurrentModeKeyPadProperty: PropertyMetadataNumeric;
export declare const StationLanIpAddressProperty: PropertyMetadataString;
export declare const StationLanIpAddressStandaloneProperty: PropertyMetadataString;
export declare const StationMacAddressProperty: PropertyMetadataString;
export declare const StationAlarmVolumeProperty: PropertyMetadataNumeric;
export declare const StationAlarmVolumeWalllightProperty: PropertyMetadataNumeric;
export declare const StationPromptVolumeProperty: PropertyMetadataNumeric;
export declare const StationAlarmToneProperty: PropertyMetadataNumeric;
export declare const StationNotificationSwitchModeScheduleProperty: PropertyMetadataBoolean;
export declare const StationNotificationSwitchModeGeofenceProperty: PropertyMetadataBoolean;
export declare const StationNotificationSwitchModeAppProperty: PropertyMetadataBoolean;
export declare const StationNotificationSwitchModeKeypadProperty: PropertyMetadataBoolean;
export declare const StationNotificationStartAlarmDelayProperty: PropertyMetadataBoolean;
export declare const StationTimeFormatProperty: PropertyMetadataNumeric;
export declare const StationTimeZoneProperty: PropertyMetadataString;
export declare const StationSwitchModeWithAccessCodeProperty: PropertyMetadataBoolean;
export declare const StationAutoEndAlarmProperty: PropertyMetadataBoolean;
export declare const StationTurnOffAlarmWithButtonProperty: PropertyMetadataBoolean;
export declare const StationAlarmProperty: PropertyMetadataBoolean;
export declare const StationAlarmTypeProperty: PropertyMetadataNumeric;
export declare const StationAlarmArmedProperty: PropertyMetadataBoolean;
export declare const StationAlarmArmDelayProperty: PropertyMetadataNumeric;
export declare const StationAlarmDelayProperty: PropertyMetadataNumeric;
export declare const StationAlarmDelayTypeProperty: PropertyMetadataNumeric;
export declare const StationSdStatusProperty: PropertyMetadataNumeric;
export declare const StationSdCapacityProperty: PropertyMetadataNumeric;
export declare const StationSdAvailableCapacityProperty: PropertyMetadataNumeric;
export declare const StationStorageInfoEmmcProperty: PropertyMetadataObject;
export declare const StationStorageInfoHddProperty: PropertyMetadataObject;
export declare const StationContinuousTrackingTimeProperty: PropertyMetadataNumeric;
export declare const StationCrossCameraTrackingProperty: PropertyMetadataBoolean;
export declare const StationTrackingAssistanceProperty: PropertyMetadataBoolean;
export declare const StationCrossTrackingCameraListProperty: PropertyMetadataObject;
export declare const StationCrossTrackingGroupListProperty: PropertyMetadataObject;
export declare const StationProperties: Properties;
export declare enum CommandName {
    DeviceStartLivestream = "deviceStartLivestream",
    DeviceStopLivestream = "deviceStopLivestream",
    DeviceQuickResponse = "deviceQuickResponse",
    DevicePanAndTilt = "devicePanAndTilt",
    DeviceTriggerAlarmSound = "deviceTriggerAlarmSound",
    DeviceStartDownload = "deviceStartDownload",
    DeviceCancelDownload = "deviceCancelDownload",
    DeviceLockCalibration = "deviceLockCalibration",
    DeviceCalibrate = "deviceCalibrate",
    DeviceAddUser = "deviceAddUser",
    DeviceDeleteUser = "deviceDeleteUser",
    DeviceUpdateUserPasscode = "deviceUpdateUserPasscode",
    DeviceUpdateUserSchedule = "deviceUpdateUserSchedule",
    DeviceUpdateUsername = "deviceUpdateUsername",
    DeviceSetDefaultAngle = "deviceSetDefaultAngle",
    DeviceSetPrivacyAngle = "deviceSetPrivacyAngle",
    DeviceStartTalkback = "deviceStartTalkback",
    DeviceStopTalkback = "deviceStopTalkback",
    DeviceUnlock = "deviceUnlock",
    DeviceSnooze = "deviceSnooze",
    DeviceVerifyPIN = "deviceVerifyPIN",
    DeviceQueryAllUserId = "deviceQueryAllUserId",
    DeviceCalibrateGarageDoor = "deviceCalibrateGarageDoor",
    DevicePresetPosition = "devicePresetPosition",
    DeviceSavePresetPosition = "deviceSavePresetPosition",
    DeviceDeletePresetPosition = "deviceDeletePresetPosition",
    DeviceOpen = "deviceOpen",
    StationReboot = "stationReboot",
    StationTriggerAlarmSound = "stationTriggerAlarmSound",
    StationChime = "stationChime",
    StationDownloadImage = "stationDownloadImage",
    StationDatabaseQueryLatestInfo = "stationDatabaseQueryLatestInfo",
    StationDatabaseQueryLocal = "stationDatabaseQueryLocal",
    StationDatabaseDelete = "stationDatabaseDelete",
    StationDatabaseCountByDate = "stationDatabaseCoundByDate"
}
export declare const DeviceCommands: Commands;
export declare const StationCommands: Commands;
