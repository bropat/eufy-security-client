import { CommandType } from "../p2p/types";
import { Commands, IndexedProperty, Properties, PropertyMetadataBoolean, PropertyMetadataNumeric, PropertyMetadataString } from "./interfaces";

export enum DeviceType {
    //List retrieved from com.oceanwing.battery.cam.binder.model.QueryDeviceData
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
    LOCK_BLE = 50,
    LOCK_WIFI = 51,
    LOCK_BLE_NO_FINGER = 52,
    LOCK_WIFI_NO_FINGER = 53,
    LOCK_8503 = 54, //Smart Lock R10
    LOCK_8530 = 55,
    LOCK_85A3 = 56,
    LOCK_8592 = 57,
    LOCK_8504 = 58, //Smart Lock R20
    SOLO_CAMERA_SPOTLIGHT_1080 = 60,
    SOLO_CAMERA_SPOTLIGHT_2K = 61,
    SOLO_CAMERA_SPOTLIGHT_SOLAR = 62,
    SMART_DROP = 90,
    BATTERY_DOORBELL_PLUS = 91,
    DOORBELL_SOLO = 93,
    INDOOR_COST_DOWN_CAMERA = 100,
    CAMERA_GUN = 101,
    CAMERA_SNAIL = 102,
    CAMERA_FG = 110,
    SMART_SAFE_7400 = 140,
    SMART_SAFE_7401 = 141,
    SMART_SAFE_7402 = 142,
    SMART_SAFE_7403 = 143,
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
    CUSTOM_RTSP_URL = 999991,
}

export enum AlarmMode {
    AWAY = 0,
    HOME = 1,
    CUSTOM1 = 3,
    CUSTOM2 = 4,
    CUSTOM3 = 5,
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
    CODE_ERROR_PIN = 36006,
    CODE_IS_OPEN = 25074,
    CODE_IS_OPEN_OTHERS = 25080,
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
    CODE_REQUEST_TOO_FAST = 250999,
}

export enum VerfyCodeTypes {
    TYPE_SMS = 0,
    TYPE_PUSH = 1,
    TYPE_EMAIL = 2
}

export enum StorageType {
    NONE = 0,
    LOCAL = 1,
    CLOUD = 2,
    LOCAL_AND_CLOUD = 3
}

export enum PowerSource {
    BATTERY = 0,
    SOLAR_PANEL = 1
}

export enum PublicKeyType {
    SERVER = 1,
    LOCK = 2
}

export enum FloodlightMotionTriggeredDistance {
    MIN = 66,
    LOW = 76,
    MEDIUM = 86,
    HIGH = 91,
    MAX = 96
}

export enum NotificationType {
    MOST_EFFICIENT = 1,
    INCLUDE_THUMBNAIL = 2,
    FULL_EFFECT = 3,
}

export enum AlarmTone {
    ALARM_TONE1 = 1,
    ALARM_TONE2 = 2,
}

export enum NotificationSwitchMode {
    APP = 16,
    GEOFENCE = 32,
    SCHEDULE = 64,
    KEYPAD = 128,
}

export enum TimeFormat {
    FORMAT_12H = 0,
    FORMAT_24H = 1,
}

export enum WifiSignalLevel {
    NO_SIGNAL = 0,
    WEAK = 1,
    NORMAL = 2,
    STRONG = 3,
    FULL = 4,
}

export enum MotionDetectionMode {
    STANDARD = 0,
    ADVANCED = 1,
}

export enum VideoTypeStoreToNAS {
    Events = 0,
    ContinuousRecording = 1,
}

export enum DualCamStreamMode {
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
    SPLICE_MIRROR = 14,
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
    Ringing,
    PackageDelivered,
    PackageTaken,
    PackageStranded,
    SomeoneLoitering,
    RadarMotionDetected,
    Jammed,
    Alarm911,
    LowBattery,
    LongTimeNotClose,
    ShakeAlarm,
    WrontTryProtectAlarm,
}

export enum PropertyName {
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
    DeviceAntitheftDetection= "antitheftDetection",
    DeviceAutoNightvision = "autoNightvision",
    DeviceNightvision = "nightvision",
    DeviceStatusLed = "statusLed",
    DeviceMotionDetection = "motionDetection",
    DeviceMotionDetectionType = "motionDetectionType",
    DeviceMotionDetectionSensitivity = "motionDetectionSensitivity",
    DeviceMotionZone = "motionZone",
    DeviceMotionDetectionRange = "motionDetectionRange",  // Flooglight T8423
    DeviceMotionDetectionRangeStandardSensitivity = "motionDetectionRangeStandardSensitivity",  // Flooglight T8423
    DeviceMotionDetectionRangeAdvancedLeftSensitivity = "motionDetectionRangeAdvancedLeftSensitivity",  // Flooglight T8423
    DeviceMotionDetectionRangeAdvancedMiddleSensitivity = "motionDetectionRangeAdvancedMiddleSensitivity",  // Flooglight T8423
    DeviceMotionDetectionRangeAdvancedRightSensitivity = "motionDetectionRangeAdvancedRightSensitivity",  // Flooglight T8423
    DeviceMotionDetectionTestMode = "motionDetectionTestMode",  // Flooglight T8420, T8423
    DeviceMotionDetected = "motionDetected",
    DeviceMotionTracking = "motionTracking",
    DeviceMotionTrackingSensitivity = "motionTrackingSensitivity",  // Flooglight T8423
    DeviceMotionAutoCruise = "motionAutoCruise",  // Flooglight T8423
    DeviceMotionOutOfViewDetection = "motionOutOfViewDetection",  // Flooglight T8423
    DevicePersonDetected = "personDetected",
    DevicePersonName = "personName",
    DeviceRTSPStream = "rtspStream",
    DeviceRTSPStreamUrl = "rtspStreamUrl",
    DeviceWatermark = "watermark",
    DevicePictureUrl = "pictureUrl",
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
    DeviceLightSettingsColorTemperatureManual = "lightSettingsColorTemperatureManual",  // Flooglight T8423
    DeviceLightSettingsBrightnessMotion = "lightSettingsBrightnessMotion",
    DeviceLightSettingsColorTemperatureMotion = "lightSettingsColorTemperatureMotion",  // Flooglight T8423
    DeviceLightSettingsBrightnessSchedule = "lightSettingsBrightnessSchedule",
    DeviceLightSettingsColorTemperatureSchedule = "lightSettingsColorTemperatureSchedule",  // Flooglight T8423
    DeviceLightSettingsMotionTriggered = "lightSettingsMotionTriggered",
    DeviceLightSettingsMotionActivationMode = "lightSettingsMotionActivationMode",  // Flooglight T8423
    DeviceLightSettingsMotionTriggeredDistance = "lightSettingsMotionTriggeredDistance",
    DeviceLightSettingsMotionTriggeredTimer = "lightSettingsMotionTriggeredTimer",
    //DeviceLightSettingsSunsetToSunrise = "lightSettingsSunsetToSunrise",
    DeviceChimeIndoor = "chimeIndoor",  //BatteryDoorbell, WiredDoorbell
    DeviceChimeHomebase = "chimeHomebase",  //BatteryDoorbell
    DeviceChimeHomebaseRingtoneVolume = "chimeHomebaseRingtoneVolume",  //BatteryDoorbell
    DeviceChimeHomebaseRingtoneType = "chimeHomebaseRingtoneType",  //BatteryDoorbell
    DeviceNotificationType = "notificationType",
    DeviceRotationSpeed = "rotationSpeed",
    DeviceImageMirrored = "imageMirrored",
    DeviceNotificationPerson = "notificationPerson",  //Indoor
    DeviceNotificationPet = "notificationPet",  //Indoor
    DeviceNotificationAllOtherMotion = "notificationAllOtherMotion",  //Indoor
    DeviceNotificationCrying = "notificationCrying",  //Indoor
    DeviceNotificationAllSound = "notificationAllSound",  //Indoor
    DeviceNotificationIntervalTime = "notificationIntervalTime",  //Indoor
    DeviceNotificationRing = "notificationRing",  //BatteryDoorbell
    DeviceNotificationMotion = "notificationMotion",  //BatteryDoorbell
    DeviceNotificationRadarDetector = "notificationRadarDetector",  //BatteryDoorbell Dual
    DeviceContinuousRecording = "continuousRecording",
    DeviceContinuousRecordingType = "continuousRecordingType",
    DeviceChirpVolume = "chirpVolume",
    DeviceChirpTone = "chirpTone",
    DeviceVideoHDR = "videoHdr", // Wired Doorbell
    DeviceVideoDistortionCorrection = "videoDistortionCorrection", // Wired Doorbell
    DeviceVideoRingRecord = "videoRingRecord", // Wired Doorbell
    DeviceVideoNightvisionImageAdjustment = "videoNightvisionImageAdjustment",  // Flooglight T8423
    DeviceVideoColorNightvision = "videoColorNightvision",  // Flooglight T8423
    DeviceAutoCalibration = "autoCalibration",  // Flooglight T8423
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

    DeviceHiddenMotionDetectionSensitivity = "hidden-motionDetectionSensitivity",
    DeviceHiddenMotionDetectionMode = "hidden-motionDetectionMode",
    DeviceHiddenSnoozeStartTime = "hidden-snoozeStartTime",

    StationLANIpAddress = "lanIpAddress",
    StationMacAddress = "macAddress",
    StationGuardMode = "guardMode",
    StationCurrentMode = "currentMode",
    StationTimeFormat = "timeFormat",
    //StationTimezone = "timezone", //Supported also by T8520
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
    StationHomeSecuritySettings = "stationHomeSecuritySettings",
    StationAwaySecuritySettings = "stationAwaySecuritySettings",
    StationCustom1SecuritySettings = "stationCustom1SecuritySettings",
    StationCustom2SecuritySettings = "stationCustom2SecuritySettings",
    StationCustom3SecuritySettings = "stationCustom3SecuritySettings",
    StationOffSecuritySettings = "stationOffSecuritySettings",

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

export const GenericTypeProperty: PropertyMetadataNumeric = {
    key: "device_type",
    name: PropertyName.Type,
    label: "Type",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Station",
        1: "Camera",
        2: "Sensor",
        3: "Floodlight",
        4: "Camera E",
        5: "Doorbell",
        7: "Battery Doorbell",
        8: "Camera 2",
        9: "Camera 2c",
        10: "Motion Sensor",
        11: "Keypad",
        14: "Camera 2 Pro",
        15: "Camera 2c Pro",
        16: "Battery Doorbell 2",
        30: "Indoor Camera",
        31: "Indoor Camera PT",
        32: "Solo Camera",
        33: "Solo Camera Pro",
        34: "Indoor Camera 1080",
        35: "Indoor Camera PT 1080",
        37: "Floodlight 8422",
        38: "Floodlight 8423",
        39: "Floodlight 2",
        44: "Outdoor Camera 1080P No Light",
        45: "Outdoor Camera 2k",
        46: "Outdoor Camera 1080P",
        50: "Lock Basic",
        51: "Lock Advanced",
        52: "Lock Basic No Finger",
        53: "Lock Basic Advanced No Finger",
        54: "Lock 8503",
        55: "Lock 8530",
        56: "Lock 85A3",
        57: "Lock 8592",
        58: "Lock 8504",
        60: "Solo Camera Spotlight 1080p",
        61: "Solo Camera Spotlight 2k",
        62: "Solo Camera Spotlight Solar",
        90: "SmartDrop, Smart Delivery Box",
        91: "Video Doorbell Dual",
        93: "Video Doorbell Dual (Wired)",
    },
}

export const BaseDeviceProperties: IndexedProperty = {
    [DeviceNameProperty.name]: DeviceNameProperty,
    [DeviceModelProperty.name]: DeviceModelProperty,
    [DeviceSerialNumberProperty.name]: DeviceSerialNumberProperty,
    [GenericTypeProperty.name]: GenericTypeProperty,
    [GenericHWVersionProperty.name]: GenericHWVersionProperty,
    [GenericSWVersionProperty.name]: GenericSWVersionProperty,
}

export const GenericDeviceProperties: IndexedProperty = {
    ...BaseDeviceProperties,
    [PropertyName.DeviceStationSN]: {
        key: "station_sn",
        name: PropertyName.DeviceStationSN,
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

export const DeviceBatteryLockProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTLOCK_QUERY_BATTERY_LEVEL,
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
    default: false,
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

export const DeviceBatteryIsChargingKeypadProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_KEYPAD_BATTERY_CHARGER_STATE,
    name: PropertyName.DeviceBatteryIsCharging,
    label: "Battery is charging",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
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

export const DeviceAutoNightvisionWiredDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceAutoNightvisionProperty,
    key: ParamType.NIGHT_VISUAL,
}

export const DeviceNightvisionProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_NIGHT_VISION_TYPE,
    name: PropertyName.DeviceNightvision,
    label: "Nightvision",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "B&W Night Vision",
        2: "Spotlight Night Vision",
    },
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

export const DeviceWifiSignalLevelProperty: PropertyMetadataNumeric = {
    key: "custom_wifiSignalLevel",
    name: PropertyName.DeviceWifiSignalLevel,
    label: "Wifi Signal Level",
    readable: true,
    writeable: false,
    type: "number",
    min: 0,
    max: 4,
    states: {
        0: "No signal",
        1: "Weak",
        2: "Normal",
        3: "Strong",
        4: "Full",
    },
}

export const DeviceWifiRSSILockProperty: PropertyMetadataNumeric = {
    ...DeviceWifiRSSIProperty,
    key: CommandType.CMD_GET_SUB1G_RSSI,
};

export const DeviceWifiRSSIEntrySensorProperty: PropertyMetadataNumeric = {
    ...DeviceWifiRSSIProperty,
    key: CommandType.CMD_GET_SUB1G_RSSI,
};

export const DeviceWifiRSSIKeypadProperty: PropertyMetadataNumeric = {
    ...DeviceWifiRSSIProperty,
    key: CommandType.CMD_GET_SUB1G_RSSI,
};

export const DeviceWifiRSSISmartSafeProperty: PropertyMetadataNumeric = {
    ...DeviceWifiRSSIProperty,
    key: CommandType.CMD_SMARTSAFE_RSSI,
};

export const DeviceEnabledProperty: PropertyMetadataBoolean = {
    key: ParamType.PRIVATE_MODE,
    name: PropertyName.DeviceEnabled,
    label: "Camera enabled",
    readable: true,
    writeable: true,
    type: "boolean",
    commandId: CommandType.CMD_DEVS_SWITCH,
}

export const DeviceEnabledStandaloneProperty: PropertyMetadataBoolean = {
    ...DeviceEnabledProperty,
    key: ParamType.OPEN_DEVICE,
    commandId: CommandType.CMD_DEVS_SWITCH,
};

export const DeviceEnabledSoloProperty: PropertyMetadataBoolean = {
    ...DeviceEnabledProperty,
    key: CommandType.CMD_DEVS_SWITCH,
};

export const DeviceStatusLedProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DEV_LED_SWITCH,
    name: PropertyName.DeviceStatusLed,
    label: "Status LED",
    readable: true,
    writeable: true,
    type: "boolean",
    commandId: CommandType.CMD_INDOOR_LED_SWITCH,
}

export const DeviceStatusLedIndoorFloodProperty: PropertyMetadataBoolean = {
    ...DeviceStatusLedProperty,
    key: CommandType.CMD_INDOOR_LED_SWITCH,
};

export const DeviceStatusLedBatteryDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceStatusLedProperty,
    key: CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE,
};

export const DeviceStatusLedDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceStatusLedProperty,
    key: ParamType.DOORBELL_LED_NIGHT_MODE,
    commandId: ParamType.COMMAND_LED_NIGHT_OPEN,
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
    key: ParamType.DETECT_SWITCH,
    commandId: ParamType.COMMAND_MOTION_DETECTION_PACKAGE,
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

export const DeviceRTSPStreamUrlProperty: PropertyMetadataString = {
    key: "custom_rtspStreamUrl",
    name: PropertyName.DeviceRTSPStreamUrl,
    label: "RTSP Stream URL",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
}

export const DeviceWatermarkProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_DEVS_OSD,
    name: PropertyName.DeviceWatermark,
    label: "Watermark",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "Timestamp",
        2: "Timestamp and Logo",
    },
}

export const DeviceWatermarkIndoorFloodProperty: PropertyMetadataNumeric = {
    ...DeviceWatermarkProperty,
    states: {
        0: "Timestamp",
        1: "Timestamp and Logo",
        2: "Off",
    },
};

export const DeviceWatermarkSoloWiredDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceWatermarkProperty,
    states: {
        0: "Off",
        1: "On",
    },
};

export const DeviceWatermarkBatteryDoorbellCamera1Property: PropertyMetadataNumeric = {
    ...DeviceWatermarkProperty,
    states: {
        1: "Off",
        2: "On",
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
        0: "Offline",
        1: "Online",
        2: "Manually disabled",
        3: "Offline low battery",
        4: "Remove and readd",
        5: "Reset and readd",
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
    default: 0,
}

export const DeviceLastChargingTotalEventsProperty: PropertyMetadataNumeric = {
    key: "charing_total",
    name: PropertyName.DeviceLastChargingTotalEvents,
    label: "Total Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
}

export const DeviceLastChargingRecordedEventsProperty: PropertyMetadataNumeric = {
    key: "charging_reserve",
    name: PropertyName.DeviceLastChargingRecordedEvents,
    label: "Total Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
}

export const DeviceLastChargingFalseEventsProperty: PropertyMetadataNumeric = {
    key: "charging_missing",
    name: PropertyName.DeviceLastChargingFalseEvents,
    label: "False Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
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
    default: 0,
}

export const DeviceLockedProperty: PropertyMetadataBoolean = {
    key: "custom_locked",
    name: PropertyName.DeviceLocked,
    label: "locked",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceLockedSmartSafeProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_LOCK_STATUS,
    name: PropertyName.DeviceLocked,
    label: "locked",
    readable: true,
    writeable: false,
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

export const DeviceBasicLockStatusProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORLOCK_GET_STATE,
    name: PropertyName.DeviceLockStatus,
    label: "Lock status",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        1: "1",         //TODO: Finish naming of states
        2: "2",
        3: "Unlocked",
        4: "Locked",
        5: "Mechanical anomaly",
        6: "6",
        7: "7",
    }
}

export const DeviceAdvancedLockStatusProperty: PropertyMetadataNumeric = {
    ...DeviceBasicLockStatusProperty,
    key: CommandType.CMD_SMARTLOCK_QUERY_STATUS,
}

export const DevicePictureUrlProperty: PropertyMetadataString = {
    key: "cover_path",
    name: PropertyName.DevicePictureUrl,
    label: "Last Camera Picture URL",
    readable: true,
    writeable: false,
    type: "string",
}

export const DeviceMotionDetectionTypeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DEV_PUSHMSG_MODE,
    name: PropertyName.DeviceMotionDetectionType,
    label: "Motion Detection Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Humans only",
        2: "All motions",
    },
}

export const DeviceMotionDetectionCamera1Property: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionTypeProperty,
    states: {
        0: "Person Alerts",
        1: "Facial Alerts",
        2: "All Alerts",
    },
}

export const DeviceMotionDetectionTypeFloodlightT8423Property: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionTypeProperty,
    states: {
        2: "All motions",
        6: "Humans only",
    },
}

export const DeviceMotionDetectionTypeFloodlightProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionTypeProperty,
    key: CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_TYPE,
    states: {
        1: "Humans only",
        5: "All motions",
    },
}

export const DeviceMotionDetectionTypeIndoorProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionTypeProperty,
    key: CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_TYPE,
    states: {
        1: "Person",
        2: "Pet",
        3: "Person and Pet",
        4: "All other motions",
        5: "Person and all other motions",
        6: "Pet and all other motions",
        7: "Person, Pet and all other motions",
    },
}

export const DeviceMotionDetectionTypeIndoorMiniProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionTypeIndoorProperty,
    states: {
        1: "Person",
        4: "All other motions",
        5: "Person and all other motions",
    },
}

export const DeviceMotionDetectionSensitivityCamera2Property: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_PIRSENSITIVITY,
    name: PropertyName.DeviceMotionDetectionSensitivity,
    label: "Motion Detection Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 7,
}

export const DeviceMotionDetectionSensitivityCamera1Property: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityCamera2Property,
    min: 1,
    max: 100,
    steps: 1,
}

export const DeviceMotionDetectionSensitivityIndoorProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityCamera2Property,
    key: CommandType.CMD_INDOOR_DET_SET_MOTION_SENSITIVITY_IDX,
    min: 1,
    max: 5,
}

export const DeviceMotionDetectionSensitivityBatteryDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityCamera2Property,
    key: CommandType.CMD_SET_MOTION_SENSITIVITY,
    min: 1,
    max: 5,
}

export const DeviceMotionDetectionSensitivityWiredDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityCamera2Property,
    key: "custom_motionDetectionSensitivity",
    min: 1,
    max: 5,
}

export const DeviceMotionDetectionSensitivitySoloProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityCamera2Property,
    key: CommandType.CMD_SET_PIR_SENSITIVITY,
}

export const DeviceMotionDetectionSensitivityFloodlightT8420Property: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityCamera2Property,
    key: CommandType.CMD_SET_MDSENSITIVITY,
    min: 1,
    max: 5,
}

export const DeviceHiddenMotionDetectionSensitivityWiredDoorbellProperty: PropertyMetadataNumeric = {
    key: ParamType.DETECT_MOTION_SENSITIVE,
    name: PropertyName.DeviceHiddenMotionDetectionSensitivity,
    label: "HIDDEN Motion Detection Sensitivity",
    readable: true,
    writeable: false,
    type: "number",
    min: 1,
    max: 3,
}

export const DeviceHiddenMotionDetectionModeWiredDoorbellProperty: PropertyMetadataNumeric = {
    key: ParamType.DETECT_MODE,
    name: PropertyName.DeviceHiddenMotionDetectionMode,
    label: "HIDDEN Motion Detection Mode",
    readable: true,
    writeable: false,
    type: "number",
    min: 1,
    max: 3,
}

export const DeviceMotionZoneProperty: PropertyMetadataString = {
    key: CommandType.CMD_INDOOR_DET_SET_ACTIVE_ZONE,
    name: PropertyName.DeviceMotionZone,
    label: "Motion Detection Zone",
    readable: true,
    writeable: true,
    type: "string",
}

export const DeviceFloodlightLightProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH,
    name: PropertyName.DeviceLight,
    label: "Light",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceFloodlightLightSettingsEnableProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_FLOODLIGHT_TOTAL_SWITCH,
    name: PropertyName.DeviceLightSettingsEnable,
    label: "Light Enable",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceFloodlightLightSettingsBrightnessManualProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_FLOODLIGHT_BRIGHT_VALUE,
    name: PropertyName.DeviceLightSettingsBrightnessManual,
    label: "Light Brightness Manual",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
}

export const DeviceCameraLightSettingsBrightnessManualProperty: PropertyMetadataNumeric = {
    ...DeviceFloodlightLightSettingsBrightnessManualProperty,
    min: 40,
    default: 100,
}

export const DeviceFloodlightLightSettingsBrightnessMotionProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR,
    name: PropertyName.DeviceLightSettingsBrightnessMotion,
    label: "Light Brightness Motion",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
}

export const DeviceFloodlightLightSettingsBrightnessScheduleProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH,
    name: PropertyName.DeviceLightSettingsBrightnessSchedule,
    label: "Light Brightness Schedule",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
}

export const DeviceFloodlightLightSettingsMotionTriggeredProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_LIGHT_CTRL_PIR_SWITCH,
    name: PropertyName.DeviceLightSettingsMotionTriggered,
    label: "Light Motion Triggered Enable",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceFloodlightLightSettingsMotionTriggeredDistanceProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_PIRSENSITIVITY,
    name: PropertyName.DeviceLightSettingsMotionTriggeredDistance,
    label: "Light Motion Triggered Distance",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Min",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Max",
    },
}

export const DeviceFloodlightLightSettingsMotionTriggeredTimerProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_LIGHT_CTRL_PIR_TIME,
    name: PropertyName.DeviceLightSettingsMotionTriggeredTimer,
    label: "Light Motion Triggered Timer",
    readable: true,
    writeable: true,
    type: "number",
    unit: "sec",
    states: {
        30: "30 sec.",
        60: "1 min.",
        180: "3 min.",
        300: "5 min.",
        900: "15 min.",
    },
}

export const DeviceMicrophoneProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_DEV_MIC_MUTE,
    name: PropertyName.DeviceMicrophone,
    label: "Microphone",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceSpeakerProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_DEV_SPEAKER_MUTE,
    name: PropertyName.DeviceSpeaker,
    label: "Speaker",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceAudioRecordingProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_AUDIO_MUTE_RECORD,
    name: PropertyName.DeviceAudioRecording,
    label: "Audio Recording",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceAudioRecordingIndoorSoloFloodlightProperty: PropertyMetadataBoolean = {
    ...DeviceAudioRecordingProperty,
    key: CommandType.CMD_INDOOR_SET_RECORD_AUDIO_ENABLE,
}

export const DeviceAudioRecordingWiredDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceAudioRecordingProperty,
    key: ParamType.DOORBELL_AUDIO_RECODE,
    commandId: ParamType.COMMAND_AUDIO_RECORDING,
}

export const DeviceAudioRecordingFloodlightT8420Property: PropertyMetadataBoolean = {
    ...DeviceAudioRecordingProperty,
    key: CommandType.CMD_RECORD_AUDIO_SWITCH,
}

export const DeviceMotionTrackingProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_PAN_MOTION_TRACK,
    name: PropertyName.DeviceMotionTracking,
    label: "Motion Tracking",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceSpeakerVolumeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_DEV_SPEAKER_VOLUME,
    name: PropertyName.DeviceSpeakerVolume,
    label: "Speaker Volume",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        90: "Low",
        92: "Medium",
        93: "High"
    },
}

export const DeviceSpeakerVolumeSoloProperty: PropertyMetadataNumeric = {
    ...DeviceSpeakerVolumeProperty,
    states: {
        70: "Low",
        80: "Medium",
        100: "High"
    },
}

export const DeviceSpeakerVolumeIndoorFloodDoorbellProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_DEV_SPEAKER_VOLUME,
    name: PropertyName.DeviceSpeakerVolume,
    label: "Speaker Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
}

export const DeviceSpeakerVolumeWiredDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
    key: ParamType.VOLUME,
    max: 169,
}

export const DeviceSpeakerVolumeFloodlightT8420Property: PropertyMetadataNumeric = {
    ...DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
    min: 1,
    max: 63,
}


export const DeviceRingtoneVolumeBatteryDoorbellProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_BAT_DOORBELL_SET_RINGTONE_VOLUME,
    name: PropertyName.DeviceRingtoneVolume,
    label: "Ringtone Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
}

export const DeviceRingtoneVolumeWiredDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceRingtoneVolumeBatteryDoorbellProperty,
    key: ParamType.RINGING_VOLUME,
    max: 130,
    commandId: ParamType.COMMAND_RINGTONE_VOLUME,
}

export const DevicePowerSourceProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_POWER_CHARGE,
    name: PropertyName.DevicePowerSource,
    label: "Power Source",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Battery",
        1: "Solar Panel",
    },
}

export const DevicePowerWorkingModeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_PIR_POWERMODE,
    name: PropertyName.DevicePowerWorkingMode,
    label: "Power Working Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Optimal Battery Life",
        1: "Optimal Surveillance",
        2: "Custom Recording",
    },
}

export const DevicePowerWorkingModeBatteryDoorbellProperty: PropertyMetadataNumeric = {
    ...DevicePowerWorkingModeProperty,
    states: {
        0: "Balance Surveillance",
        1: "Optimal Surveillance",
        2: "Custom Recording",
        3: "Optimal Battery Life",
    },
}

export const DeviceChargingStatusProperty: PropertyMetadataNumeric = {
    key: CommandType.SUB1G_REP_UNPLUG_POWER_LINE,
    name: PropertyName.DeviceChargingStatus,
    label: "Charging Status",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        1: "Charging",
        2: "Unplugged",
        3: "Plugged",
        4: "Solar charging"
    },
}

export const DeviceRecordingClipLengthProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DEV_RECORD_TIMEOUT,
    name: PropertyName.DeviceRecordingClipLength,
    label: "Recording Clip Length",
    readable: true,
    writeable: true,
    type: "number",
    min: 5,
    max: 120,
    default: 60,
    unit: "sec"
}

export const DeviceRecordingClipLengthFloodlightProperty: PropertyMetadataNumeric = {
    ...DeviceRecordingClipLengthProperty,
    min: 30,
    max: 120,
    default: 100,
}

export const DeviceRecordingRetriggerIntervalProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DEV_RECORD_INTERVAL,
    name: PropertyName.DeviceRecordingRetriggerInterval,
    label: "Recording Clip Length",
    readable: true,
    writeable: true,
    type: "number",
    unit: "sec",
    min: 5,
    max: 60,
    default: 5,
}

export const DeviceRecordingRetriggerIntervalBatteryDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceRecordingRetriggerIntervalProperty,
    min: 2,
    max: 60,
    default: 2,
}

export const DeviceRecordingRetriggerIntervalFloodlightProperty: PropertyMetadataNumeric = {
    ...DeviceRecordingRetriggerIntervalProperty,
    min: 0,
    max: 30,
    default: 0,
}

export const DeviceRecordingEndClipMotionStopsProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DEV_RECORD_AUTOSTOP,
    name: PropertyName.DeviceRecordingEndClipMotionStops,
    label: "Recording end clip early if motion stops",
    readable: true,
    writeable: true,
    type: "boolean",
    default: true,
}

export const DeviceVideoStreamingQualityProperty: PropertyMetadataNumeric = {
    key: ParamType.DOORBELL_VIDEO_QUALITY,
    name: PropertyName.DeviceVideoStreamingQuality,
    label: "Video Streaming Quality",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Auto",
        1: "Low",
        2: "Medium",
        3: "High",
    },
    commandId: ParamType.COMMAND_VIDEO_QUALITY,
}

export const DeviceVideoStreamingQualityBatteryDoorbellProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY,
    name: PropertyName.DeviceVideoStreamingQuality,
    label: "Video Streaming Quality",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Auto / Low Encoding",
        1: "Low / Low Encoding",
        2: "Medium / Low Encoding",
        3: "High / Low Encoding",
        5: "Auto / High Encoding",
        6: "Low / High Encoding",
        7: "Medium / High Encoding",
        8: "High / High Encoding",
    },
}

export const DeviceVideoStreamingQualityCameraProperty: PropertyMetadataNumeric = {
    ...DeviceVideoStreamingQualityProperty,
    key: CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY,
}

export const DeviceVideoStreamingQualitySoloProperty: PropertyMetadataNumeric = {
    ...DeviceVideoStreamingQualityProperty,
    key: CommandType.CMD_SET_RESOLUTION,
    commandId: ParamType.COMMAND_VIDEO_QUALITY,
}

export const DeviceVideoRecordingQualityIndoorProperty: PropertyMetadataNumeric = {
    key: ParamType.DOORBELL_RECORD_QUALITY,
    name: PropertyName.DeviceVideoRecordingQuality,
    label: "Video Recording Quality",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        2: "Full HD (1080P)",
        3: "2K HD",
    },
    commandId: ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
}

export const DeviceVideoRecordingQualityWiredDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceVideoRecordingQualityIndoorProperty,
    key: ParamType.DOORBELL_RECORD_QUALITY,
    states: {
        1: "Storage Saver (1600 * 1200)",
        2: "Full HD (1600 * 1200)",
        3: "2K HD (2560 * 1920)",
    },
    commandId: ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
}

export const DeviceVideoRecordingQualityProperty: PropertyMetadataNumeric = {
    ...DeviceVideoRecordingQualityIndoorProperty,
    key: CommandType.CMD_SET_RECORD_QUALITY,
    states: {
        2: "Full HD (1080P)",
        3: "2K HD",
    },
    commandId: ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
}

export const DeviceVideoRecordingQualityCamera2CProProperty: PropertyMetadataNumeric = {
    ...DeviceVideoRecordingQualityProperty,
    states: {
        1: "2K HD",
        2: "Full HD (1080P)",
    },
}

export const DeviceWDRProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_BAT_DOORBELL_WDR_SWITCH,
    name: PropertyName.DeviceVideoWDR,
    label: "WDR",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceChimeIndoorBatteryDoorbellProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_BAT_DOORBELL_MECHANICAL_CHIME_SWITCH,
    name: PropertyName.DeviceChimeIndoor,
    label: "Indoor Chime Enabled",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceChimeIndoorWiredDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceChimeIndoorBatteryDoorbellProperty,
    key: ParamType.CHIME_STATE,
    commandId: ParamType.COMMAND_INDOOR_CHIME,
}

export const DeviceChimeHomebaseBatteryDoorbellProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_BAT_DOORBELL_CHIME_SWITCH,
    name: PropertyName.DeviceChimeHomebase,
    label: "Homebase Chime Enabled",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_BAT_DOORBELL_DINGDONG_V,
    name: PropertyName.DeviceChimeHomebaseRingtoneVolume,
    label: "Homebase Chime Ringtone Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 26,
}

export const DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_BAT_DOORBELL_DINGDONG_R,
    name: PropertyName.DeviceChimeHomebaseRingtoneType,
    label: "Homebase Chime Ringtone Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Default",
        1: "Silent",
        2: "Beacon",
        3: "Chord",
        4: "Christmas",
        5: "Circuit",
        6: "Clock",
        7: "Ding",
        8: "Hillside",
        9: "Presto",
    },
}

export const DeviceNotificationTypeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_PUSH_EFFECT,
    name: PropertyName.DeviceNotificationType,
    label: "Notification Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Most Efficient",
        2: "Include Thumbnail",
        3: "Full Effect",
    },
    commandId: CommandType.CMD_INDOOR_PUSH_NOTIFY_TYPE,
}

export const DeviceNotificationTypeIndoorFloodlightProperty: PropertyMetadataNumeric = {
    ...DeviceNotificationTypeProperty,
    key: CommandType.CMD_INDOOR_PUSH_NOTIFY_TYPE,
}

export const DeviceNotificationTypeBatteryDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceNotificationTypeProperty,
    key: CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
}

export const DeviceNotificationTypeWiredDoorbellProperty: PropertyMetadataNumeric = {
    ...DeviceNotificationTypeProperty,
    key: ParamType.DOORBELL_MOTION_NOTIFICATION,
    commandId: ParamType.COMMAND_NOTIFICATION_TYPE,
}

export const DeviceRotationSpeedProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_INDOOR_PAN_SPEED,
    name: PropertyName.DeviceRotationSpeed,
    label: "Rotation Speed",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Min",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Max",
    },
    default: 3
}

export const DeviceImageMirroredProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_MIRRORMODE,
    name: PropertyName.DeviceImageMirrored,
    label: "Image vertically mirrored",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceSoundDetectionTypeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_INDOOR_DET_SET_SOUND_DETECT_TYPE,
    name: PropertyName.DeviceSoundDetectionType,
    label: "Sound Detection Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Crying",
        2: "All Sounds",
    },
}

export const DeviceSoundDetectionSensitivityProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_INDOOR_DET_SET_SOUND_SENSITIVITY_IDX,
    name: PropertyName.DeviceSoundDetectionSensitivity,
    label: "Sound Detection Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Min",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Max",
    },
}

export const DeviceNotificationPersonProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_AI_PERSON_ENABLE,
    name: PropertyName.DeviceNotificationPerson,
    label: "Notification Person detected",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationPetProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_AI_PET_ENABLE,
    name: PropertyName.DeviceNotificationPet,
    label: "Notification Pet detected",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationAllOtherMotionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_AI_MOTION_ENABLE,
    name: PropertyName.DeviceNotificationAllOtherMotion,
    label: "Notification All Other Motion",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationAllSoundProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_AI_SOUND_ENABLE,
    name: PropertyName.DeviceNotificationAllSound,
    label: "Notification Sound detected",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationCryingProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_AI_CRYING_ENABLE,
    name: PropertyName.DeviceNotificationCrying,
    label: "Notification Crying detected",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationRingProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
    name: PropertyName.DeviceNotificationRing,
    label: "Notification Ring detected",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationRingWiredDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceNotificationRingProperty,
    key: ParamType.DOORBELL_NOTIFICATION_OPEN,
    commandId: ParamType.COMMAND_NOTIFICATION_RING,
}

export const DeviceNotificationMotionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
    name: PropertyName.DeviceNotificationMotion,
    label: "Notification Motion detected",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationRadarDetectorProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DOORBELL_DUAL_NOTIFICATION_HUMAN_DETECT,
    name: PropertyName.DeviceNotificationRadarDetector,
    label: "Notification Radar Detector Motion detected",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationMotionWiredDoorbellProperty: PropertyMetadataBoolean = {
    ...DeviceNotificationMotionProperty,
    key: ParamType.DOORBELL_NOTIFICATION_OPEN,
    commandId: ParamType.COMMAND_NOTIFICATION_RING,
}

export const DeviceChirpVolumeEntrySensorProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SENSOR_SET_CHIRP_VOLUME,
    name: PropertyName.DeviceChirpVolume,
    label: "Chirp Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 26,
    steps: 1,
}

export const DeviceChirpToneEntrySensorProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SENSOR_SET_CHIRP_TONE,
    name: PropertyName.DeviceChirpTone,
    label: "Chirp Tone",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "None",
        1: "Water",
        2: "Classic",
        3: "Light",
        4: "Ding",
    }
}

export const DeviceVideoHDRWiredDoorbellProperty: PropertyMetadataBoolean = {
    key: ParamType.DOORBELL_HDR,
    name: PropertyName.DeviceVideoHDR,
    label: "HDR",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceVideoDistortionCorrectionWiredDoorbellProperty: PropertyMetadataBoolean = {
    key: ParamType.DOORBELL_DISTORTION,
    name: PropertyName.DeviceVideoDistortionCorrection,
    label: "Distortion Correction",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceVideoRingRecordWiredDoorbellProperty: PropertyMetadataNumeric = {
    key: ParamType.DOORBELL_RING_RECORD,
    name: PropertyName.DeviceVideoRingRecord,
    label: "Record while live viewing after opening notification",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Disabled",
        1: "Enabled - Recording Quality Preferred",
        2: "Enabled - Streaming Quality Preferred",
    }
}


export const DeviceMotionDetectionRangeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE,
    name: PropertyName.DeviceMotionDetectionRange,
    label: "Motion Detection Range",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Standard",
        1: "Advanced",
        2: "Automatic",
    },
}

export const DeviceMotionDetectionRangeStandardSensitivityProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_STD_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionRangeStandardSensitivity,
    label: "Motion Detection Range Standard Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "Min",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Max",
    },
}

export const DeviceMotionDetectionRangeAdvancedLeftSensitivityProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionRangeStandardSensitivityProperty,
    key: CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_LEFT_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity,
    label: "Motion Detection Range Advanced Left Sensitivity",
}

export const DeviceMotionDetectionRangeAdvancedMiddleSensitivityProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionRangeStandardSensitivityProperty,
    key: CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_MIDDLE_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionRangeAdvancedMiddleSensitivity,
    label: "Motion Detection Range Advanced Middle Sensitivity",
}

export const DeviceMotionDetectionRangeAdvancedRightSensitivityProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionRangeStandardSensitivityProperty,
    key: CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_RIGHT_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity,
    label: "Motion Detection Range Advanced Right Sensitivity",
}

export const DeviceMotionDetectionTestModeProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_PIR_TEST_MODE,
    name: PropertyName.DeviceMotionDetectionTestMode,
    label: "Motion Detection Test Mode",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceMotionTrackingSensitivityProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_FLOODLIGHT_SET_MOTION_TRACKING_SENSITIVITY,
    name: PropertyName.DeviceMotionTrackingSensitivity,
    label: "Motion Tracking Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Level 1",
        2: "Level 2",
        3: "Level 3",
    },
    default: 3,
}

export const DeviceMotionAutoCruiseProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_FLOODLIGHT_SET_MOTION_AUTO_CRUISE,
    name: PropertyName.DeviceMotionAutoCruise,
    label: "Motion Auto-Cruise",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceMotionOutOfViewDetectionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_FLOODLIGHT_SET_MOTION_OUT_OF_VIEW_DETECTION,
    name: PropertyName.DeviceMotionOutOfViewDetection,
    label: "Motion Out-of-View Detection",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceLightSettingsColorTemperatureManualProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_MANUAL,
    name: PropertyName.DeviceLightSettingsColorTemperatureManual,
    label: "Light Setting Color Temperature Manual",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 100,
    default: 50,
}

export const DeviceLightSettingsColorTemperatureMotionProperty: PropertyMetadataNumeric = {
    ...DeviceLightSettingsColorTemperatureManualProperty,
    key: CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_MOTION,
    name: PropertyName.DeviceLightSettingsColorTemperatureMotion,
    label: "Light Setting Color Temperature Motion",
}

export const DeviceLightSettingsColorTemperatureScheduleProperty: PropertyMetadataNumeric = {
    ...DeviceLightSettingsColorTemperatureManualProperty,
    key: CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_SCHEDULE,
    name: PropertyName.DeviceLightSettingsColorTemperatureSchedule,
    label: "Light Setting Color Temperature Schedule",
}

export const DeviceLightSettingsMotionActivationModeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_FLOODLIGHT_STREET_LAMP,
    name: PropertyName.DeviceLightSettingsMotionActivationMode,
    label: "Light Settings Motion Activation Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Smart",
        1: "Fast",
    },
}

export const DeviceVideoNightvisionImageAdjustmentProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_FLOODLIGHT_SET_VIDEO_NIGHTVISION_IMAGE_ADJUSTMENT,
    name: PropertyName.DeviceVideoNightvisionImageAdjustment,
    label: "Video Nightvision Image Adjustment",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceVideoColorNightvisionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_FLOODLIGHT_SET_VIDEO_COLOR_NIGHTVISION,
    name: PropertyName.DeviceVideoColorNightvision,
    label: "Video Color Nightvision",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceAutoCalibrationProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_FLOODLIGHT_SET_AUTO_CALIBRATION,
    name: PropertyName.DeviceAutoCalibration,
    label: "Auto Calibration",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceAutoLockProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTLOCK_AUTO_LOCK,
    name: PropertyName.DeviceAutoLock,
    label: "Auto Lock",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceAutoLockTimerProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTLOCK_AUTO_LOCK_TIMER,
    name: PropertyName.DeviceAutoLockTimer,
    label: "Auto Lock Timer",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "1 sec.",
        30: "30 sec.",
        60: "1 min.",
        90: "1,5 min.",
        120: "2 min.",
        150: "2,5 min.",
        180: "3 min.",
    },
    default: 60,
    unit: "sec",
}

export const DeviceAutoLockScheduleProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE,
    name: PropertyName.DeviceAutoLockSchedule,
    label: "Auto Lock Schedule",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceAutoLockScheduleStartTimeProperty: PropertyMetadataString = {
    key: CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_STARTTIME,
    name: PropertyName.DeviceAutoLockScheduleStartTime,
    label: "Auto Lock Schedule Starttime (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "23:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceAutoLockScheduleEndTimeProperty: PropertyMetadataString = {
    key: CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_ENDTIME,
    name: PropertyName.DeviceAutoLockScheduleEndTime,
    label: "Auto Lock Schedule Endtime (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "6:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceOneTouchLockingProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTLOCK_ONE_TOUCH_LOCK,
    name: PropertyName.DeviceOneTouchLocking,
    label: "One-Touch Locking",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceWrongTryProtectionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTLOCK_WRONG_TRY_PROTECT,
    name: PropertyName.DeviceWrongTryProtection,
    label: "Wrong Try Protection",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceWrongTryProtectionSmartSafeProperty: PropertyMetadataBoolean = {
    ...DeviceWrongTryProtectionProperty,
    key: CommandType.CMD_SMARTSAFE_IS_ENABLE_CRACK_PROTECT,
}

export const DeviceWrongTryLockdownTimeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTLOCK_WRONG_TRY_LOCKDOWN,
    name: PropertyName.DeviceWrongTryLockdownTime,
    label: "Wrong Try Lockdown Time",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        60: "1 min.",
        120: "2 min.",
        180: "3 min.",
        240: "4 min.",
        300: "5 min.",
    },
    default: 300,
    unit: "sec",
}

export const DeviceWrongTryLockdownTimeSmartSafeProperty: PropertyMetadataNumeric = {
    ...DeviceWrongTryLockdownTimeProperty,
    key: CommandType.CMD_SMARTSAFE_PROTECT_COOLDOWN_SECONDS,
    default: 60,
}

export const DeviceWrongTryAttemptsProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTLOCK_WRONG_TRY_ATTEMPTS,
    name: PropertyName.DeviceWrongTryAttempts,
    label: "Wrong Try Attempts",
    readable: true,
    writeable: true,
    type: "number",
    min: 3,
    max: 10,
    default: 6,
}

export const DeviceWrongTryAttemptsSmartSafeProperty: PropertyMetadataNumeric = {
    ...DeviceWrongTryAttemptsProperty,
    key: CommandType.CMD_SMARTSAFE_MAX_WRONG_PIN_TIMES,
    min: 5,
    max: 10,
    default: 5,
}

export const DeviceScramblePasscodeProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTLOCK_SCRAMBLE_PASSCODE,
    name: PropertyName.DeviceScramblePasscode,
    label: "Scramble Passcode",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceScramblePasscodeSmartSafeProperty: PropertyMetadataBoolean = {
    ...DeviceScramblePasscodeProperty,
    key: CommandType.CMD_SMARTSAFE_IS_SET_PREFIX_PWD,
    label: "Scramble PIN",
}

export const DeviceSoundProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTLOCK_LOCK_SOUND,
    name: PropertyName.DeviceSound,
    label: "Sound",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "Low",
        2: "Medium",
        3: "High",
    },
    default: 2,
}

export const DeviceNotificationProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTLOCK_NOTIFICATION,
    name: PropertyName.DeviceNotification,
    label: "Notification",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationUnlockedProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTLOCK_NOTIFICATION_UNLOCKED,
    name: PropertyName.DeviceNotificationUnlocked,
    label: "Notification Unlocked",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationLockedProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTLOCK_NOTIFICATION_LOCKED,
    name: PropertyName.DeviceNotificationLocked,
    label: "Notification Locked",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceLoiteringDetectionProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_SWITCH,
    name: PropertyName.DeviceLoiteringDetection,
    label: "Loitering Detection",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceLoiteringDetectionRangeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE,
    name: PropertyName.DeviceLoiteringDetectionRange,
    label: "Loitering Detection Range",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "within 2ft",
        2: "within 4ft",
        3: "within 6ft",
        4: "within 8ft",
        5: "within 10ft",
    },
    default: 3,
}

export const DeviceLoiteringDetectionLengthProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_TIME,
    name: PropertyName.DeviceLoiteringDetectionLength,
    label: "Loitering Detection Length",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "15s",
        2: "20s",
        3: "25s",
        4: "30s",
        5: "45s",
        6: "60s",
    },
    default: 1,
}

export const DeviceMotionDetectionSensitivityModeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionSensitivityMode,
    label: "Motion Detection Sensitivity Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Standard",
        1: "Advanced",
    },
}


export const DeviceMotionDetectionSensitivityStandardProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionSensitivityStandard,
    label: "Motion Detection Standard Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 5,
    default: 3,
}

export const DeviceMotionDetectionSensitivityAdvancedAProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedA,
    label: "Motion Detection Advanced Sensitivity A",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 5,
    default: 3,
}

export const DeviceMotionDetectionSensitivityAdvancedBProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedB,
    label: "Motion Detection Advanced Sensitivity B",
}

export const DeviceMotionDetectionSensitivityAdvancedCProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedC,
    label: "Motion Detection Advanced Sensitivity C",
}

export const DeviceMotionDetectionSensitivityAdvancedDProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedD,
    label: "Motion Detection Advanced Sensitivity D",
}

export const DeviceMotionDetectionSensitivityAdvancedEProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedE,
    label: "Motion Detection Advanced Sensitivity E",
}

export const DeviceMotionDetectionSensitivityAdvancedFProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedF,
    label: "Motion Detection Advanced Sensitivity F",
}

export const DeviceMotionDetectionSensitivityAdvancedGProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedG,
    label: "Motion Detection Advanced Sensitivity G",
}

export const DeviceMotionDetectionSensitivityAdvancedHProperty: PropertyMetadataNumeric = {
    ...DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedH,
    label: "Motion Detection Advanced Sensitivity H",
}

export const DeviceLoiteringCustomResponsePhoneNotificationProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE,
    name: PropertyName.DeviceLoiteringCustomResponsePhoneNotification,
    label: "Loitering Custom Response Phone Notification",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceLoiteringCustomResponseAutoVoiceResponseProperty: PropertyMetadataBoolean = {
    ...DeviceLoiteringCustomResponsePhoneNotificationProperty,
    name: PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse,
    label: "Loitering Custom Response Auto Voice Response",
}

export const DeviceLoiteringCustomResponseAutoVoiceResponseVoiceProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE,
    name: PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice,
    label: "Loitering Custom Response Auto Voice Response Voice",
    readable: true,
    writeable: true,
    type: "number",
    default: 1,
    // states loaded dynamically
}

export const DeviceLoiteringCustomResponseHomeBaseNotificationProperty: PropertyMetadataBoolean = {
    ...DeviceLoiteringCustomResponsePhoneNotificationProperty,
    name: PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification,
    label: "Loitering Custom Response HomeBase Notification",
}

export const DeviceLoiteringCustomResponseTimeFromProperty: PropertyMetadataString = {
    key: CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE,
    name: PropertyName.DeviceLoiteringCustomResponseTimeFrom,
    label: "Loitering Custom Response Time From (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "00:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceLoiteringCustomResponseTimeToProperty: PropertyMetadataString = {
    ...DeviceLoiteringCustomResponseTimeFromProperty,
    name: PropertyName.DeviceLoiteringCustomResponseTimeTo,
    label: "Loitering Custom Response Time To (24-hour clock)",
    default: "23:59",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceDeliveryGuardProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH,
    name: PropertyName.DeviceDeliveryGuard,
    label: "Delivery Guard",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceDeliveryGuardPackageGuardingProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_SWITCH,
    name: PropertyName.DeviceDeliveryGuardPackageGuarding,
    label: "Delivery Guard Package Guarding",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE,
    name: PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice,
    label: "Delivery Guard Package Guarding Voice Response Voice",
    readable: true,
    writeable: true,
    type: "number",
    default: 2,
    // states loaded dynamically
}

export const DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty: PropertyMetadataString = {
    key: CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME,
    name: PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom,
    label: "Delivery Guard Package Guarding Activated Time From (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "00:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty: PropertyMetadataString = {
    ...DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty,
    name: PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo,
    label: "Delivery Guard Package Guarding Activated Time To (24-hour clock)",
    default: "23:59",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceDeliveryGuardUncollectedPackageAlertProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_SWITCH,
    name: PropertyName.DeviceDeliveryGuardUncollectedPackageAlert,
    label: "Delivery Guard Uncollected Package Alert",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty: PropertyMetadataString = {
    key: CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME,
    name: PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck,
    label: "Delivery Guard Uncollected Package Alert Time To Check (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "20:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceDeliveryGuardPackageLiveCheckAssistanceProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DOORBELL_DUAL_PACKAGE_ASSISTANT_SWITCH,
    name: PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance,
    label: "Delivery Guard Package Live Check Assistance",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceDualCamWatchViewModeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_VIEW_MODE,
    name: PropertyName.DeviceDualCamWatchViewMode,
    label: "Dual Cam Watch View Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        2: "Top-Left Picture-in-Picture",
        3: "Top-Right Picture-in-Picture",
        4: "Bottom-Left Picture-in-Picture",
        5: "Bottom-Left Picture-in-Picture",
        12: "Split-view",
    },
    default: 12,
}

export const DeviceRingAutoResponseProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE,
    name: PropertyName.DeviceRingAutoResponse,
    label: "Ring Auto-Response",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceRingAutoResponseVoiceResponseProperty: PropertyMetadataBoolean = {
    ...DeviceRingAutoResponseProperty,
    name: PropertyName.DeviceRingAutoResponseVoiceResponse,
    label: "Ring Auto-Response Voice Response",
}

export const DeviceRingAutoResponseVoiceResponseVoiceProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE,
    name: PropertyName.DeviceRingAutoResponseVoiceResponseVoice,
    label: "Ring Auto-Response Voice Response Voice",
    readable: true,
    writeable: true,
    type: "number",
    default: 2,
    // states loaded dynamically
}

export const DeviceRingAutoResponseTimeFromProperty: PropertyMetadataString = {
    key: CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE,
    name: PropertyName.DeviceRingAutoResponseTimeFrom,
    label: "Ring Auto-Response Time From (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "00:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceRingAutoResponseTimeToProperty: PropertyMetadataString = {
    ...DeviceRingAutoResponseTimeFromProperty,
    name: PropertyName.DeviceRingAutoResponseTimeTo,
    label: "Ring Auto-Response Time To (24-hour clock)",
    default: "23:59",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
}

export const DeviceContinuousRecordingProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_SET_CONTINUE_ENABLE,
    name: PropertyName.DeviceContinuousRecording,
    label: "Continuos Recording",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceContinuousRecordingTypeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_INDOOR_SET_CONTINUE_TYPE,
    name: PropertyName.DeviceContinuousRecordingType,
    label: "Continuos Recording Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Always",
        1: "Schedule"
    }
}

export const DeviceDefaultAngleProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_DEFAULT_ANGLE_ENABLE,
    name: PropertyName.DeviceDefaultAngle,
    label: "Default Angle",
    readable: true,
    writeable: true,
    type: "boolean",
    default: false,
}

export const DeviceDefaultAngleIdleTimeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_INDOOR_DEFAULT_ANGLE_IDLE_TIME,
    name: PropertyName.DeviceDefaultAngleIdleTime,
    label: "Default Angle Idle Time",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        10: "10s",
        20: "20s",
        40: "40s",
        60: "1 min",
        120: "2 mins",
        300: "5 mins",
    },
    default: 60,
}

export const DeviceNotificationIntervalTimeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_DEV_RECORD_INTERVAL,
    name: PropertyName.DeviceNotificationIntervalTime,
    label: "Notification Interval Time",
    readable: true,
    writeable: true,
    type: "number",
    unit: "min",
    default: 180,
    states: {
        0: "0",
        60: "1",
        120: "2",
        180: "3",
        240: "4",
        300: "5",
    }
}

export const DeviceSoundDetectionRoundLookProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_INDOOR_SET_SOUND_DETECT_ROUND_LOOK,
    name: PropertyName.DeviceSoundDetectionRoundLook,
    label: "Sound Detection Round-Look",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationHomeSecuritySettings: PropertyMetadataString = {
    key: CommandType.ARM_DELAY_HOME,
    name: PropertyName.StationHomeSecuritySettings,
    label: "Security Settings Home",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationAwaySecuritySettings: PropertyMetadataString = {
    key: CommandType.ARM_DELAY_AWAY,
    name: PropertyName.StationAwaySecuritySettings,
    label: "Security Settings Away",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationCustom1SecuritySettings: PropertyMetadataString = {
    key: CommandType.ARM_DELAY_CUS1,
    name: PropertyName.StationCustom1SecuritySettings,
    label: "Security Settings Custom1",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationCustom2SecuritySettings: PropertyMetadataString = {
    key: CommandType.ARM_DELAY_CUS2,
    name: PropertyName.StationCustom2SecuritySettings,
    label: "Security Settings Custom2",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationCustom3SecuritySettings: PropertyMetadataString = {
    key: CommandType.ARM_DELAY_CUS3,
    name: PropertyName.StationCustom3SecuritySettings,
    label: "Security Settings Custom3",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationOffSecuritySettings: PropertyMetadataString = {
    key: CommandType.ARM_DELAY_OFF,
    name: PropertyName.StationOffSecuritySettings,
    label: "Security Settings Off",
    readable: true,
    writeable: false,
    type: "string",
}

export const DevicePackageDeliveredProperty: PropertyMetadataBoolean = {
    key: "custom_packageDelivered",
    name: PropertyName.DevicePackageDelivered,
    label: "Package Delivered",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DevicePackageStrandedProperty: PropertyMetadataBoolean = {
    key: "custom_packageStranded",
    name: PropertyName.DevicePackageStranded,
    label: "Package Stranded",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DevicePackageTakenProperty: PropertyMetadataBoolean = {
    key: "custom_packageTaken",
    name: PropertyName.DevicePackageTaken,
    label: "Package Taken",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceSomeoneLoiteringProperty: PropertyMetadataBoolean = {
    key: "custom_someoneLoitering",
    name: PropertyName.DeviceSomeoneLoitering,
    label: "Someone Loitering",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceRadarMotionDetectedProperty: PropertyMetadataBoolean = {
    key: "custom_radarMotionDetected",
    name: PropertyName.DeviceRadarMotionDetected,
    label: "Radar Motion Detected",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceLeftOpenAlarmProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_IS_ENABLE_LEFT_OPEN,
    name: PropertyName.DeviceLeftOpenAlarm,
    label: "Left Open Alarm",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceLeftOpenAlarmDurationProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTSAFE_LEFT_OPEN_SECONDS,
    name: PropertyName.DeviceLeftOpenAlarmDuration,
    label: "Left Open Alarm Duration",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        30: "30 sec.",
        60: "60 sec.",
        90: "90 sec.",
        120: "120 sec.",
    },
    default: 120,
    unit: "sec",
}

export const DeviceDualUnlockProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_IS_ENABLE_TOW_FACTOR_CHK,
    name: PropertyName.DeviceDualUnlock,
    label: "Dual Unlock",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DevicePowerSaveProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_POWER_SAVE_ON,
    name: PropertyName.DevicePowerSave,
    label: "Power Save",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceInteriorBrightnessProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTSAFE_LED_BRIGHTNESS_LEVEL,
    name: PropertyName.DeviceInteriorBrightness,
    label: "Interior Brightness Level",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "Low",
        2: "Mid",
        3: "High",
    },
    default: 2,
}

export const DeviceInteriorBrightnessDurationProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTSAFE_LED_BRIGHTNESS_SECOND,
    name: PropertyName.DeviceInteriorBrightnessDuration,
    label: "Interior Brightness Duration",
    readable: true,
    writeable: true,
    type: "number",
    default: 10,
    min: 5,
    max: 60,
    steps: 1,
    unit: "sec",
}

export const DeviceTamperAlarmProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTSAFE_IS_ENABLE_SHAKE_ALARM,
    name: PropertyName.DeviceTamperAlarm,
    label: "Tamper Alarm",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        2: "Tamper Alarm",
        3: "Move Alarm",
    },
    default: 2,
}

export const DeviceRemoteUnlockProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_REMOTE_OPEN_TYPE,
    name: PropertyName.DeviceRemoteUnlock,
    label: "Remote Unlock",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceRemoteUnlockMasterPINProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_REMOTE_OPEN_TYPE,
    name: PropertyName.DeviceRemoteUnlockMasterPIN,
    label: "Remote Unlock Master PIN",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DevicePromptVolumeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTSAFE_VOLUME,
    name: PropertyName.DevicePromptVolume,
    label: "Prompt Volume",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Mute",
        1: "Soft",
        2: "Max",
    },
    default: 1,
}

export const DeviceAlarmVolumeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SMARTSAFE_ALERT_VOLUME,
    name: PropertyName.DeviceAlarmVolume,
    label: "Alarm Volume",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Low",
        1: "Medium",
        2: "High",
    },
    default: 2,
}

export const DeviceNotificationUnlockByKeyProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationUnlockByKey,
    label: "Notification Unlock By Key",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationUnlockByPINProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationUnlockByPIN,
    label: "Notification Unlock By PIN",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationUnlockByFingerprintProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationUnlockByFingerprint,
    label: "Notification Unlock By Fingerprint",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationUnlockByAppProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationUnlockByApp,
    label: "Notification Unlock By App",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationDualUnlockProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationDualUnlock,
    label: "Notification Dual Unlock",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationDualLockProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationDualLock,
    label: "Notification Dual Lock",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationWrongTryProtectProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationWrongTryProtect,
    label: "Notification Wrong-Try Protect",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const DeviceNotificationJammedProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationJammed,
    label: "Notification Jammed",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceJammedAlertProperty: PropertyMetadataBoolean = {
    key: "custom_jammedAlert",
    name: PropertyName.DeviceJammedAlert,
    label: "Jammed Alert",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const Device911AlertProperty: PropertyMetadataBoolean = {
    key: "custom_911Alert",
    name: PropertyName.Device911Alert,
    label: "911 Alert",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const Device911AlertEventProperty: PropertyMetadataNumeric = {
    key: "custom_911AlertEvent",
    name: PropertyName.Device911AlertEvent,
    label: "911 Alert Event",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Cancel Alarm",
        1: "Alarm",
        2: "Alarm Success",
        3: "Alarm Not Open",
        4: "Alarm Open Failed",
    },
}

export const DeviceShakeAlertProperty: PropertyMetadataBoolean = {
    key: "custom_shakeAlert",
    name: PropertyName.DeviceShakeAlert,
    label: "Shake Alert",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceShakeAlertEventProperty: PropertyMetadataNumeric = {
    key: "custom_shakeAlertEvent",
    name: PropertyName.DeviceShakeAlertEvent,
    label: "Shake Alert Event",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Cancel Alarm",
        1: "Alarm",
    },
}

export const DeviceLowBatteryAlertProperty: PropertyMetadataBoolean = {
    key: "custom_lowBatteryAlert",
    name: PropertyName.DeviceLowBatteryAlert,
    label: "Low Battery Alert",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceLongTimeNotCloseAlertProperty: PropertyMetadataBoolean = {
    key: "custom_longTimeNotCloseAlert",
    name: PropertyName.DeviceLongTimeNotCloseAlert,
    label: "Long Time Not Close Alert",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceWrongTryProtectAlertProperty: PropertyMetadataBoolean = {
    key: "custom_wrongTryProtectAlert",
    name: PropertyName.DeviceWrongTryProtectAlert,
    label: "Wrong Try-Protect Alert",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceVideoTypeStoreToNASProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_INDOOR_NAS_STORAGE_TYPE,
    name: PropertyName.DeviceVideoTypeStoreToNAS,
    label: "Video Type Store To NAS",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Events",
        1: "Continuous Recording",
    },
}

export const DeviceSnoozeProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_SNOOZE_MODE,
    name: PropertyName.DeviceSnooze,
    label: "Snooze",
    readable: true,
    writeable: false,
    type: "boolean",
}

export const DeviceSnoozeTimeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_SNOOZE_MODE,
    name: PropertyName.DeviceSnoozeTime,
    label: "Snooze Time",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
    unit: "sec",
}

export const DeviceHiddenSnoozeStartTimeProperty: PropertyMetadataNumeric = {
    key: ParamType.DOORBELL_SNOOZE_START_TIME,
    name: PropertyName.DeviceHiddenSnoozeStartTime,
    label: "HIDDEN Snooze Start Time",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
}

export const DevicePersonNameProperty: PropertyMetadataString = {
    key: "custom_personName",
    name: PropertyName.DevicePersonName,
    label: "Person Name",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
}

export const DeviceProperties: Properties = {
    [DeviceType.CAMERA2]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
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
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.CAMERA2C]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceNightvision]: DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
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
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceCameraLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.CAMERA2C_PRO]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceNightvision]: DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
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
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityCameraProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityCamera2CProProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceCameraLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.CAMERA2_PRO]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
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
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DevicePowerSource]: DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityCamera1Property,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionCamera1Property,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.CAMERA_E]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DevicePowerSource]: DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DeviceAntitheftDetection]: DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityCamera1Property,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionCamera1Property,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.DOORBELL]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionDoorbellProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: DeviceRingingProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedDoorbellProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceHiddenMotionDetectionSensitivity]: DeviceHiddenMotionDetectionSensitivityWiredDoorbellProperty,
        [PropertyName.DeviceHiddenMotionDetectionMode]: DeviceHiddenMotionDetectionModeWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityWiredDoorbellProperty,
        [PropertyName.DeviceVideoHDR]: DeviceVideoHDRWiredDoorbellProperty,
        [PropertyName.DeviceVideoDistortionCorrection]: DeviceVideoDistortionCorrectionWiredDoorbellProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityWiredDoorbellProperty,
        [PropertyName.DeviceVideoRingRecord]: DeviceVideoRingRecordWiredDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingWiredDoorbellProperty,
        [PropertyName.DeviceChimeIndoor]: DeviceChimeIndoorWiredDoorbellProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeWiredDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: DeviceRingtoneVolumeWiredDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: DeviceNotificationRingWiredDoorbellProperty,
        [PropertyName.DeviceNotificationMotion]: DeviceNotificationMotionWiredDoorbellProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeWiredDoorbellProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
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
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoWDR]: DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: DeviceNotificationMotionProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL_2]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
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
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoWDR]: DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: DeviceNotificationMotionProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL_PLUS]: { //T8213 2K Battery Dual Doorbell
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
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
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoWDR]: DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: DeviceNotificationMotionProperty,
        [PropertyName.DeviceNotificationRadarDetector]: DeviceNotificationRadarDetectorProperty,
        [PropertyName.DeviceMotionDetectionSensitivityMode]: DeviceMotionDetectionSensitivityModeProperty,
        [PropertyName.DeviceMotionDetectionSensitivityStandard]: DeviceMotionDetectionSensitivityStandardProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedA]: DeviceMotionDetectionSensitivityAdvancedAProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedB]: DeviceMotionDetectionSensitivityAdvancedBProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedC]: DeviceMotionDetectionSensitivityAdvancedCProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedD]: DeviceMotionDetectionSensitivityAdvancedDProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedE]: DeviceMotionDetectionSensitivityAdvancedEProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedF]: DeviceMotionDetectionSensitivityAdvancedFProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedG]: DeviceMotionDetectionSensitivityAdvancedGProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedH]: DeviceMotionDetectionSensitivityAdvancedHProperty,
        [PropertyName.DeviceLoiteringDetection]: DeviceLoiteringDetectionProperty,
        [PropertyName.DeviceLoiteringDetectionLength]: DeviceLoiteringDetectionLengthProperty,
        [PropertyName.DeviceLoiteringDetectionRange]: DeviceLoiteringDetectionRangeProperty,
        [PropertyName.DeviceLoiteringCustomResponsePhoneNotification]: DeviceLoiteringCustomResponsePhoneNotificationProperty,
        [PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse]: DeviceLoiteringCustomResponseAutoVoiceResponseProperty,
        [PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice]: DeviceLoiteringCustomResponseAutoVoiceResponseVoiceProperty,
        [PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification]: DeviceLoiteringCustomResponseHomeBaseNotificationProperty,
        [PropertyName.DeviceLoiteringCustomResponseTimeFrom]: DeviceLoiteringCustomResponseTimeFromProperty,
        [PropertyName.DeviceLoiteringCustomResponseTimeTo]: DeviceLoiteringCustomResponseTimeToProperty,
        [PropertyName.DeviceDeliveryGuard]: DeviceDeliveryGuardProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuarding]: DeviceDeliveryGuardPackageGuardingProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom]: DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo]: DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice]: DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty,
        [PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance]: DeviceDeliveryGuardPackageLiveCheckAssistanceProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlert]: DeviceDeliveryGuardUncollectedPackageAlertProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck]: DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: DeviceDualCamWatchViewModeProperty,
        [PropertyName.DeviceRingAutoResponse]: DeviceRingAutoResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponse]: DeviceRingAutoResponseVoiceResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponseVoice]: DeviceRingAutoResponseVoiceResponseVoiceProperty,
        [PropertyName.DeviceRingAutoResponseTimeFrom]: DeviceRingAutoResponseTimeFromProperty,
        [PropertyName.DeviceRingAutoResponseTimeTo]: DeviceRingAutoResponseTimeToProperty,
        [PropertyName.DevicePackageDelivered]: DevicePackageDeliveredProperty,
        [PropertyName.DevicePackageStranded]: DevicePackageStrandedProperty,
        [PropertyName.DevicePackageTaken]: DevicePackageTakenProperty,
        [PropertyName.DeviceSomeoneLoitering]: DeviceSomeoneLoiteringProperty,
        [PropertyName.DeviceRadarMotionDetected]: DeviceRadarMotionDetectedProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.DOORBELL_SOLO]: { //T8203
        ...GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: DeviceEnabledSoloProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: DeviceRingingProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoWDR]: DeviceWDRProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: DeviceNotificationMotionProperty,
        [PropertyName.DeviceDeliveryGuard]: DeviceDeliveryGuardProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuarding]: DeviceDeliveryGuardPackageGuardingProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom]: DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo]: DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice]: DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty,
        [PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance]: DeviceDeliveryGuardPackageLiveCheckAssistanceProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlert]: DeviceDeliveryGuardUncollectedPackageAlertProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck]: DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: DeviceDualCamWatchViewModeProperty,
        [PropertyName.DeviceRingAutoResponse]: DeviceRingAutoResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponse]: DeviceRingAutoResponseVoiceResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponseVoice]: DeviceRingAutoResponseVoiceResponseVoiceProperty,
        [PropertyName.DeviceRingAutoResponseTimeFrom]: DeviceRingAutoResponseTimeFromProperty,
        [PropertyName.DeviceRingAutoResponseTimeTo]: DeviceRingAutoResponseTimeToProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    /*[DeviceType.FLOODLIGHT]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredDistance]: DeviceFloodlightLightSettingsMotionTriggeredDistanceProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeFloodlightProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
    },*/
    [DeviceType.FLOODLIGHT]: { // T8420 Firmware: 1.0.0.35 Hardware: 2.2 (20211219)
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredDistance]: DeviceFloodlightLightSettingsMotionTriggeredDistanceProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityFloodlightT8420Property,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeFloodlightT8420Property,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingFloodlightT8420Property,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionTestMode]: DeviceMotionDetectionTestModeProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8422]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeFloodlightProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8423]: { // T8423 Firmware: 1.0.7.4 (20211219)
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledSoloProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeFloodlightT8423Property,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceMotionTracking]: DeviceMotionTrackingProperty,
        [PropertyName.DeviceMotionDetectionRange]: DeviceMotionDetectionRangeProperty,
        [PropertyName.DeviceMotionDetectionRangeStandardSensitivity]: DeviceMotionDetectionRangeStandardSensitivityProperty,
        [PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity]: DeviceMotionDetectionRangeAdvancedLeftSensitivityProperty,
        [PropertyName.DeviceMotionDetectionRangeAdvancedMiddleSensitivity]: DeviceMotionDetectionRangeAdvancedMiddleSensitivityProperty,
        [PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity]: DeviceMotionDetectionRangeAdvancedRightSensitivityProperty,
        [PropertyName.DeviceMotionDetectionTestMode]: DeviceMotionDetectionTestModeProperty,
        [PropertyName.DeviceMotionTrackingSensitivity]: DeviceMotionTrackingSensitivityProperty,
        [PropertyName.DeviceMotionAutoCruise]: DeviceMotionAutoCruiseProperty,
        [PropertyName.DeviceMotionOutOfViewDetection]: DeviceMotionOutOfViewDetectionProperty,
        [PropertyName.DeviceLightSettingsColorTemperatureManual]: DeviceLightSettingsColorTemperatureManualProperty,
        [PropertyName.DeviceLightSettingsColorTemperatureMotion]: DeviceLightSettingsColorTemperatureMotionProperty,
        [PropertyName.DeviceLightSettingsColorTemperatureSchedule]: DeviceLightSettingsColorTemperatureScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionActivationMode]: DeviceLightSettingsMotionActivationModeProperty,
        [PropertyName.DeviceVideoNightvisionImageAdjustment]: DeviceVideoNightvisionImageAdjustmentProperty,
        [PropertyName.DeviceVideoColorNightvision]: DeviceVideoColorNightvisionProperty,
        [PropertyName.DeviceAutoCalibration]: DeviceAutoCalibrationProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8424]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeFloodlightProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: DeviceNotificationCryingProperty,
        [PropertyName.DeviceContinuousRecording]: DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_CAMERA_1080]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: DeviceNotificationCryingProperty,
        [PropertyName.DeviceContinuousRecording]: DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_COST_DOWN_CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeIndoorMiniProperty,
        [PropertyName.DeviceMotionTracking]: DeviceMotionTrackingProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceRotationSpeed]: DeviceRotationSpeedProperty,
        [PropertyName.DeviceNotificationPerson]: DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceContinuousRecording]: DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceDefaultAngle]: DeviceDefaultAngleProperty,
        [PropertyName.DeviceDefaultAngleIdleTime]: DeviceDefaultAngleIdleTimeProperty,
        [PropertyName.DeviceNotificationIntervalTime]: DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceSoundDetectionRoundLook]: DeviceSoundDetectionRoundLookProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceMotionTracking]: DeviceMotionTrackingProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceRotationSpeed]: DeviceRotationSpeedProperty,
        [PropertyName.DeviceNotificationPerson]: DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: DeviceNotificationCryingProperty,
        [PropertyName.DeviceContinuousRecording]: DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceMotionZone]: DeviceMotionZoneProperty,
        [PropertyName.DeviceImageMirrored]: DeviceImageMirroredProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_1080]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceMotionTracking]: DeviceMotionTrackingProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceRotationSpeed]: DeviceRotationSpeedProperty,
        [PropertyName.DeviceNotificationPerson]: DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: DeviceNotificationCryingProperty,
        [PropertyName.DeviceContinuousRecording]: DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceNightvision]: DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: DeviceNotificationCryingProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: DeviceNotificationCryingProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_2K]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: DeviceNotificationCryingProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_PRO]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_1080]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceNightvision]: DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_2K]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceNightvision]: DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceNightvision]: DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: DeviceStatusLedProperty,
        [PropertyName.DevicePictureUrl]: DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceLight]: DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: DeviceSnoozeTimeProperty,
        [PropertyName.DeviceHiddenSnoozeStartTime]: DeviceHiddenSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: DevicePersonNameProperty,
    },
    [DeviceType.KEYPAD]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBatteryLow]: DeviceBatteryLowKeypadProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIKeypadProperty,
        [PropertyName.DeviceBatteryIsCharging]: DeviceBatteryIsChargingKeypadProperty,
    },
    [DeviceType.LOCK_WIFI]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryLockProperty,
        [PropertyName.DeviceLocked]: DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: DeviceAdvancedLockStatusProperty,
        [PropertyName.DeviceAutoLock]: DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: DeviceScramblePasscodeProperty,
        [PropertyName.DeviceSound]: DeviceSoundProperty,
        [PropertyName.DeviceNotification]: DeviceNotificationProperty,
        [PropertyName.DeviceNotificationUnlocked]: DeviceNotificationUnlockedProperty,
        [PropertyName.DeviceNotificationLocked]: DeviceNotificationLockedProperty,
        [PropertyName.DeviceLowBatteryAlert]: DeviceLowBatteryAlertProperty,
        //TODO: Smart locks apparently also have a snooze function
    },
    [DeviceType.LOCK_WIFI_NO_FINGER]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceBattery]: DeviceBatteryLockProperty,
        [PropertyName.DeviceLocked]: DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: DeviceAdvancedLockStatusProperty,
        [PropertyName.DeviceAutoLock]: DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: DeviceScramblePasscodeProperty,
        [PropertyName.DeviceSound]: DeviceSoundProperty,
        [PropertyName.DeviceNotification]: DeviceNotificationProperty,
        [PropertyName.DeviceNotificationUnlocked]: DeviceNotificationUnlockedProperty,
        [PropertyName.DeviceNotificationLocked]: DeviceNotificationLockedProperty,
        [PropertyName.DeviceLowBatteryAlert]: DeviceLowBatteryAlertProperty,
        //TODO: Smart locks apparently also have a snooze function
    },
    [DeviceType.LOCK_BLE]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceState]: DeviceStateLockProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryLockProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSILockProperty,
        [PropertyName.DeviceLocked]: DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: DeviceBasicLockStatusProperty,
    },
    [DeviceType.LOCK_BLE_NO_FINGER]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceState]: DeviceStateLockProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryLockProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSILockProperty,
        [PropertyName.DeviceLocked]: DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: DeviceBasicLockStatusProperty,
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
        [PropertyName.DeviceChirpVolume]: DeviceChirpVolumeEntrySensorProperty,
        [PropertyName.DeviceChirpTone]: DeviceChirpToneEntrySensorProperty,
        [PropertyName.DeviceState]: DeviceStateProperty,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIEntrySensorProperty,
    },
    [DeviceType.SMART_SAFE_7400]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSISmartSafeProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceWrongTryProtection]: DeviceWrongTryProtectionSmartSafeProperty,
        [PropertyName.DeviceWrongTryAttempts]: DeviceWrongTryAttemptsSmartSafeProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: DeviceWrongTryLockdownTimeSmartSafeProperty,
        [PropertyName.DeviceLeftOpenAlarm]: DeviceLeftOpenAlarmProperty,
        [PropertyName.DeviceLeftOpenAlarmDuration]: DeviceLeftOpenAlarmDurationProperty,
        [PropertyName.DeviceDualUnlock]: DeviceDualUnlockProperty,
        [PropertyName.DevicePowerSave]: DevicePowerSaveProperty,
        [PropertyName.DeviceInteriorBrightness]: DeviceInteriorBrightnessProperty,
        [PropertyName.DeviceInteriorBrightnessDuration]: DeviceInteriorBrightnessDurationProperty,
        [PropertyName.DeviceTamperAlarm]: DeviceTamperAlarmProperty,
        [PropertyName.DeviceRemoteUnlock]: DeviceRemoteUnlockProperty,
        [PropertyName.DeviceRemoteUnlockMasterPIN]: DeviceRemoteUnlockMasterPINProperty,
        [PropertyName.DeviceScramblePasscode]: DeviceScramblePasscodeSmartSafeProperty,
        [PropertyName.DeviceAlarmVolume]: DeviceAlarmVolumeProperty,
        [PropertyName.DevicePromptVolume]: DevicePromptVolumeProperty,
        [PropertyName.DeviceNotificationUnlockByKey]: DeviceNotificationUnlockByKeyProperty,
        [PropertyName.DeviceNotificationUnlockByPIN]: DeviceNotificationUnlockByPINProperty,
        [PropertyName.DeviceNotificationUnlockByFingerprint]: DeviceNotificationUnlockByFingerprintProperty,
        [PropertyName.DeviceNotificationUnlockByApp]: DeviceNotificationUnlockByAppProperty,
        [PropertyName.DeviceNotificationDualLock]: DeviceNotificationDualLockProperty,
        [PropertyName.DeviceNotificationDualUnlock]: DeviceNotificationDualUnlockProperty,
        [PropertyName.DeviceNotificationWrongTryProtect]: DeviceNotificationWrongTryProtectProperty,
        [PropertyName.DeviceNotificationJammed]: DeviceNotificationJammedProperty,
        [PropertyName.DeviceLocked]: DeviceLockedSmartSafeProperty,
        [PropertyName.DeviceJammedAlert]: DeviceJammedAlertProperty,
        [PropertyName.Device911Alert]: Device911AlertProperty,
        [PropertyName.Device911AlertEvent]: Device911AlertEventProperty,
        [PropertyName.DeviceShakeAlert]: DeviceShakeAlertProperty,
        [PropertyName.DeviceShakeAlertEvent]: DeviceShakeAlertEventProperty,
        [PropertyName.DeviceLowBatteryAlert]: DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceWrongTryProtectAlert]: DeviceWrongTryProtectAlertProperty,
    },
    [DeviceType.SMART_SAFE_7401]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSISmartSafeProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceWrongTryProtection]: DeviceWrongTryProtectionSmartSafeProperty,
        [PropertyName.DeviceWrongTryAttempts]: DeviceWrongTryAttemptsSmartSafeProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: DeviceWrongTryLockdownTimeSmartSafeProperty,
        [PropertyName.DeviceLeftOpenAlarm]: DeviceLeftOpenAlarmProperty,
        [PropertyName.DeviceLeftOpenAlarmDuration]: DeviceLeftOpenAlarmDurationProperty,
        [PropertyName.DeviceDualUnlock]: DeviceDualUnlockProperty,
        [PropertyName.DevicePowerSave]: DevicePowerSaveProperty,
        [PropertyName.DeviceInteriorBrightness]: DeviceInteriorBrightnessProperty,
        [PropertyName.DeviceInteriorBrightnessDuration]: DeviceInteriorBrightnessDurationProperty,
        [PropertyName.DeviceTamperAlarm]: DeviceTamperAlarmProperty,
        [PropertyName.DeviceRemoteUnlock]: DeviceRemoteUnlockProperty,
        [PropertyName.DeviceRemoteUnlockMasterPIN]: DeviceRemoteUnlockMasterPINProperty,
        [PropertyName.DeviceScramblePasscode]: DeviceScramblePasscodeSmartSafeProperty,
        [PropertyName.DeviceAlarmVolume]: DeviceAlarmVolumeProperty,
        [PropertyName.DevicePromptVolume]: DevicePromptVolumeProperty,
        [PropertyName.DeviceNotificationUnlockByKey]: DeviceNotificationUnlockByKeyProperty,
        [PropertyName.DeviceNotificationUnlockByPIN]: DeviceNotificationUnlockByPINProperty,
        [PropertyName.DeviceNotificationUnlockByFingerprint]: DeviceNotificationUnlockByFingerprintProperty,
        [PropertyName.DeviceNotificationUnlockByApp]: DeviceNotificationUnlockByAppProperty,
        [PropertyName.DeviceNotificationDualLock]: DeviceNotificationDualLockProperty,
        [PropertyName.DeviceNotificationDualUnlock]: DeviceNotificationDualUnlockProperty,
        [PropertyName.DeviceNotificationWrongTryProtect]: DeviceNotificationWrongTryProtectProperty,
        [PropertyName.DeviceNotificationJammed]: DeviceNotificationJammedProperty,
        [PropertyName.DeviceLocked]: DeviceLockedSmartSafeProperty,
        [PropertyName.DeviceJammedAlert]: DeviceJammedAlertProperty,
        [PropertyName.Device911Alert]: Device911AlertProperty,
        [PropertyName.Device911AlertEvent]: Device911AlertEventProperty,
        [PropertyName.DeviceShakeAlert]: DeviceShakeAlertProperty,
        [PropertyName.DeviceShakeAlertEvent]: DeviceShakeAlertEventProperty,
        [PropertyName.DeviceLowBatteryAlert]: DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceWrongTryProtectAlert]: DeviceWrongTryProtectAlertProperty,
    },
    [DeviceType.SMART_SAFE_7402]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSISmartSafeProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceWrongTryProtection]: DeviceWrongTryProtectionSmartSafeProperty,
        [PropertyName.DeviceWrongTryAttempts]: DeviceWrongTryAttemptsSmartSafeProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: DeviceWrongTryLockdownTimeSmartSafeProperty,
        [PropertyName.DeviceLeftOpenAlarm]: DeviceLeftOpenAlarmProperty,
        [PropertyName.DeviceLeftOpenAlarmDuration]: DeviceLeftOpenAlarmDurationProperty,
        [PropertyName.DeviceDualUnlock]: DeviceDualUnlockProperty,
        [PropertyName.DevicePowerSave]: DevicePowerSaveProperty,
        [PropertyName.DeviceInteriorBrightness]: DeviceInteriorBrightnessProperty,
        [PropertyName.DeviceInteriorBrightnessDuration]: DeviceInteriorBrightnessDurationProperty,
        [PropertyName.DeviceTamperAlarm]: DeviceTamperAlarmProperty,
        [PropertyName.DeviceRemoteUnlock]: DeviceRemoteUnlockProperty,
        [PropertyName.DeviceRemoteUnlockMasterPIN]: DeviceRemoteUnlockMasterPINProperty,
        [PropertyName.DeviceScramblePasscode]: DeviceScramblePasscodeSmartSafeProperty,
        [PropertyName.DeviceAlarmVolume]: DeviceAlarmVolumeProperty,
        [PropertyName.DevicePromptVolume]: DevicePromptVolumeProperty,
        [PropertyName.DeviceNotificationUnlockByKey]: DeviceNotificationUnlockByKeyProperty,
        [PropertyName.DeviceNotificationUnlockByPIN]: DeviceNotificationUnlockByPINProperty,
        [PropertyName.DeviceNotificationUnlockByFingerprint]: DeviceNotificationUnlockByFingerprintProperty,
        [PropertyName.DeviceNotificationUnlockByApp]: DeviceNotificationUnlockByAppProperty,
        [PropertyName.DeviceNotificationDualLock]: DeviceNotificationDualLockProperty,
        [PropertyName.DeviceNotificationDualUnlock]: DeviceNotificationDualUnlockProperty,
        [PropertyName.DeviceNotificationWrongTryProtect]: DeviceNotificationWrongTryProtectProperty,
        [PropertyName.DeviceNotificationJammed]: DeviceNotificationJammedProperty,
        [PropertyName.DeviceLocked]: DeviceLockedSmartSafeProperty,
        [PropertyName.DeviceJammedAlert]: DeviceJammedAlertProperty,
        [PropertyName.Device911Alert]: Device911AlertProperty,
        [PropertyName.Device911AlertEvent]: Device911AlertEventProperty,
        [PropertyName.DeviceShakeAlert]: DeviceShakeAlertProperty,
        [PropertyName.DeviceShakeAlertEvent]: DeviceShakeAlertEventProperty,
        [PropertyName.DeviceLowBatteryAlert]: DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceWrongTryProtectAlert]: DeviceWrongTryProtectAlertProperty,
    },
    [DeviceType.SMART_SAFE_7403]: {
        ...GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: DeviceWifiRSSISmartSafeProperty,
        [PropertyName.DeviceBattery]: DeviceBatteryProperty,
        [PropertyName.DeviceWrongTryProtection]: DeviceWrongTryProtectionSmartSafeProperty,
        [PropertyName.DeviceWrongTryAttempts]: DeviceWrongTryAttemptsSmartSafeProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: DeviceWrongTryLockdownTimeSmartSafeProperty,
        [PropertyName.DeviceLeftOpenAlarm]: DeviceLeftOpenAlarmProperty,
        [PropertyName.DeviceLeftOpenAlarmDuration]: DeviceLeftOpenAlarmDurationProperty,
        [PropertyName.DeviceDualUnlock]: DeviceDualUnlockProperty,
        [PropertyName.DevicePowerSave]: DevicePowerSaveProperty,
        [PropertyName.DeviceInteriorBrightness]: DeviceInteriorBrightnessProperty,
        [PropertyName.DeviceInteriorBrightnessDuration]: DeviceInteriorBrightnessDurationProperty,
        [PropertyName.DeviceTamperAlarm]: DeviceTamperAlarmProperty,
        [PropertyName.DeviceRemoteUnlock]: DeviceRemoteUnlockProperty,
        [PropertyName.DeviceRemoteUnlockMasterPIN]: DeviceRemoteUnlockMasterPINProperty,
        [PropertyName.DeviceScramblePasscode]: DeviceScramblePasscodeSmartSafeProperty,
        [PropertyName.DeviceAlarmVolume]: DeviceAlarmVolumeProperty,
        [PropertyName.DevicePromptVolume]: DevicePromptVolumeProperty,
        [PropertyName.DeviceNotificationUnlockByKey]: DeviceNotificationUnlockByKeyProperty,
        [PropertyName.DeviceNotificationUnlockByPIN]: DeviceNotificationUnlockByPINProperty,
        [PropertyName.DeviceNotificationUnlockByFingerprint]: DeviceNotificationUnlockByFingerprintProperty,
        [PropertyName.DeviceNotificationUnlockByApp]: DeviceNotificationUnlockByAppProperty,
        [PropertyName.DeviceNotificationDualLock]: DeviceNotificationDualLockProperty,
        [PropertyName.DeviceNotificationDualUnlock]: DeviceNotificationDualUnlockProperty,
        [PropertyName.DeviceNotificationWrongTryProtect]: DeviceNotificationWrongTryProtectProperty,
        [PropertyName.DeviceNotificationJammed]: DeviceNotificationJammedProperty,
        [PropertyName.DeviceLocked]: DeviceLockedSmartSafeProperty,
        [PropertyName.DeviceJammedAlert]: DeviceJammedAlertProperty,
        [PropertyName.Device911Alert]: Device911AlertProperty,
        [PropertyName.Device911AlertEvent]: Device911AlertEventProperty,
        [PropertyName.DeviceShakeAlert]: DeviceShakeAlertProperty,
        [PropertyName.DeviceShakeAlertEvent]: DeviceShakeAlertEventProperty,
        [PropertyName.DeviceLowBatteryAlert]: DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceWrongTryProtectAlert]: DeviceWrongTryProtectAlertProperty,
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
    [GenericTypeProperty.name]: GenericTypeProperty,
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
        0: "Away",
        1: "Home",
        2: "Schedule",
        3: "Custom 1",
        4: "Custom 2",
        5: "Custom 3",
        47: "Geofencing",
        63: "Disarmed",
    },
}

export const StationGuardModeKeyPadProperty: PropertyMetadataNumeric = {
    ...StationGuardModeProperty,
    states: {
        0: "Away",
        1: "Home",
        2: "Schedule",
        3: "Custom 1",
        4: "Custom 2",
        5: "Custom 3",
        6: "Off",
        47: "Geofencing",
        63: "Disarmed",
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
        0: "Away",
        1: "Home",
        3: "Custom 1",
        4: "Custom 2",
        5: "Custom 3",
        63: "Disarmed",
    },
}

export const StationCurrentModeKeyPadProperty: PropertyMetadataNumeric = {
    ...StationCurrentModeProperty,
    states: {
        0: "Away",
        1: "Home",
        3: "Custom 1",
        4: "Custom 2",
        5: "Custom 3",
        6: "Off",
        63: "Disarmed",
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

export const StationLanIpAddressStandaloneProperty: PropertyMetadataString = {
    ...StationLanIpAddressProperty,
    key: "ip_addr",
};

export const StationMacAddressProperty: PropertyMetadataString = {
    key: "wifi_mac",
    //key: "sub1g_mac", // are always the same
    name: PropertyName.StationMacAddress,
    label: "MAC Address",
    readable: true,
    writeable: false,
    type: "string",
}

export const StationAlarmVolumeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_HUB_SPK_VOLUME,
    name: PropertyName.StationAlarmVolume,
    label: "Alarm Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 26,
    default: 26,
}

export const StationPromptVolumeProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_PROMPT_VOLUME,
    name: PropertyName.StationPromptVolume,
    label: "Prompt Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 26,
}

export const StationAlarmToneProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_HUB_ALARM_TONE,
    name: PropertyName.StationAlarmTone,
    label: "Alarm Tone",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Alarm sound 1",
        2: "Alarm sound 2",
    }
}

export const StationNotificationSwitchModeScheduleProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_HUB_NOTIFY_MODE,
    name: PropertyName.StationNotificationSwitchModeSchedule,
    label: "Notification Switch Mode Schedule",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationNotificationSwitchModeGeofenceProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_HUB_NOTIFY_MODE,
    name: PropertyName.StationNotificationSwitchModeGeofence,
    label: "Notification Switch Mode Geofence",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationNotificationSwitchModeAppProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_HUB_NOTIFY_MODE,
    name: PropertyName.StationNotificationSwitchModeApp,
    label: "Notification Switch Mode App",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationNotificationSwitchModeKeypadProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_HUB_NOTIFY_MODE,
    name: PropertyName.StationNotificationSwitchModeKeypad,
    label: "Notification Switch Mode Keypad",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationNotificationStartAlarmDelayProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_HUB_NOTIFY_ALARM,
    name: PropertyName.StationNotificationStartAlarmDelay,
    label: "Notification Start Alarm Delay",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationTimeFormatProperty: PropertyMetadataNumeric = {
    key: CommandType.CMD_SET_HUB_OSD,
    name: PropertyName.StationTimeFormat,
    label: "Time Format",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "12h",
        1: "24h",
    },
    default: 0,
}

export const StationSwitchModeWithAccessCodeProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_KEYPAD_PSW_OPEN,
    name: PropertyName.StationSwitchModeWithAccessCode,
    label: "Switch mode with access code",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationAutoEndAlarmProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_HUB_ALARM_AUTO_END,
    name: PropertyName.StationAutoEndAlarm,
    label: "Auto End Alarm",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationTurnOffAlarmWithButtonProperty: PropertyMetadataBoolean = {
    key: CommandType.CMD_SET_HUB_ALARM_CLOSE,
    name: PropertyName.StationTurnOffAlarmWithButton,
    label: "Turn off alarm with button",
    readable: true,
    writeable: true,
    type: "boolean",
}

export const StationProperties: Properties = {
    [DeviceType.STATION]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
        [PropertyName.StationPromptVolume]: StationPromptVolumeProperty,
        [PropertyName.StationAlarmVolume]: StationAlarmVolumeProperty,
        [PropertyName.StationAlarmTone]: StationAlarmToneProperty,
        [PropertyName.StationNotificationSwitchModeSchedule]: StationNotificationSwitchModeScheduleProperty,
        [PropertyName.StationNotificationSwitchModeGeofence]: StationNotificationSwitchModeGeofenceProperty,
        [PropertyName.StationNotificationSwitchModeApp]: StationNotificationSwitchModeAppProperty,
        [PropertyName.StationNotificationSwitchModeKeypad]: StationNotificationSwitchModeKeypadProperty,
        [PropertyName.StationNotificationStartAlarmDelay]: StationNotificationStartAlarmDelayProperty,
        [PropertyName.StationHomeSecuritySettings]: StationHomeSecuritySettings,
        [PropertyName.StationAwaySecuritySettings]: StationAwaySecuritySettings,
        [PropertyName.StationCustom1SecuritySettings]: StationCustom1SecuritySettings,
        [PropertyName.StationCustom2SecuritySettings]: StationCustom2SecuritySettings,
        [PropertyName.StationCustom3SecuritySettings]: StationCustom3SecuritySettings,
        [PropertyName.StationOffSecuritySettings]: StationOffSecuritySettings,
    },
    [DeviceType.INDOOR_CAMERA]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.INDOOR_CAMERA_1080]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.INDOOR_COST_DOWN_CAMERA]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_1080]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_2K]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.DOORBELL]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.DOORBELL_SOLO]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.SOLO_CAMERA]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.SOLO_CAMERA_PRO]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_1080]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_2K]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.FLOODLIGHT]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8422]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8423]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8424]: {
        ...BaseStationProperties,
        [PropertyName.StationLANIpAddress]: StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: StationMacAddressProperty,
        [PropertyName.StationGuardMode]: StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: StationTimeFormatProperty,
    },
    [DeviceType.LOCK_WIFI]: {
        ...BaseStationProperties,
    },
    [DeviceType.LOCK_WIFI_NO_FINGER]: {
        ...BaseStationProperties,
    },
    [DeviceType.LOCK_BLE]: {
        ...BaseStationProperties,
    },
    [DeviceType.LOCK_BLE_NO_FINGER]: {
        ...BaseStationProperties,
    },
    [DeviceType.SMART_SAFE_7400]: {
        ...BaseStationProperties,
    },
    [DeviceType.SMART_SAFE_7401]: {
        ...BaseStationProperties,
    },
    [DeviceType.SMART_SAFE_7402]: {
        ...BaseStationProperties,
    },
    [DeviceType.SMART_SAFE_7403]: {
        ...BaseStationProperties,
    },
}

export enum CommandName {
    DeviceStartLivestream = "deviceStartLivestream",
    DeviceStopLivestream = "deviceStopLivestream",
    DeviceQuickResponse = "deviceQuickResponse",
    DevicePanAndTilt = "devicePanAndTilt",
    DeviceTriggerAlarmSound = "deviceTriggerAlarmSound",
    DeviceStartDownload = "deviceStartDownload",
    DeviceCancelDownload = "deviceCancelDownload",
    DeviceLockCalibration = "deviceLockCalibration",
    DeviceCalibrate = "deviceCalibrate",
    DeviceSetDefaultAngle = "deviceSetDefaultAngle",
    DeviceSetPrivacyAngle = "deviceSetPrivacyAngle",
    DeviceStartTalkback = "deviceStartTalkback",
    DeviceStopTalkback = "deviceStopTalkback",
    DeviceUnlock = "deviceUnlock",
    DeviceSnooze = "deviceSnooze",
    StationReboot = "stationReboot",
    StationTriggerAlarmSound = "stationTriggerAlarmSound",
}

export const DeviceCommands: Commands = {
    [DeviceType.CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA2]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA2C]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA2C_PRO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA2_PRO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA_E]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.DOORBELL]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL_2]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL_PLUS]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.DOORBELL_SOLO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_CAMERA_1080]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_2K]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_PT_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_PT_CAMERA_1080]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_COST_DOWN_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceSetDefaultAngle,
        CommandName.DeviceSetPrivacyAngle,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_PRO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_1080]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_2K]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8422]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8423]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8424]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.KEYPAD]: [],
    [DeviceType.LOCK_BLE]: [],
    [DeviceType.LOCK_BLE_NO_FINGER]: [],
    [DeviceType.LOCK_WIFI]: [
        CommandName.DeviceLockCalibration,
    ],
    [DeviceType.LOCK_WIFI_NO_FINGER]: [
        CommandName.DeviceLockCalibration,
    ],
    [DeviceType.MOTION_SENSOR]: [],
    [DeviceType.SENSOR]: [],
    [DeviceType.SMART_SAFE_7400]: [
        CommandName.DeviceUnlock,
    ],
    [DeviceType.SMART_SAFE_7401]: [
        CommandName.DeviceUnlock,
    ],
    [DeviceType.SMART_SAFE_7402]: [
        CommandName.DeviceUnlock,
    ],
    [DeviceType.SMART_SAFE_7403]: [
        CommandName.DeviceUnlock,
    ],
}

export const StationCommands: Commands = {
    [DeviceType.STATION]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.INDOOR_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.INDOOR_CAMERA_1080]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.INDOOR_COST_DOWN_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_2K]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.INDOOR_PT_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.INDOOR_PT_CAMERA_1080]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.DOORBELL]: [
        CommandName.StationReboot,
    ],
    [DeviceType.DOORBELL_SOLO]: [
        CommandName.StationReboot,
    ],
    [DeviceType.SOLO_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.SOLO_CAMERA_PRO]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_1080]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_2K]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.FLOODLIGHT]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8422]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8423]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8424]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.KEYPAD]: [],
    [DeviceType.LOCK_BLE]: [],
    [DeviceType.LOCK_BLE_NO_FINGER]: [],
    [DeviceType.LOCK_WIFI]: [],
    [DeviceType.LOCK_WIFI_NO_FINGER]: [],
}