export enum CusPushEvent {
    SECURITY = 1,
    TFCARD = 2,
    DOOR_SENSOR = 3,
    CAM_STATE = 4,
    GSENSOR = 5,
    BATTERY_LOW = 6,
    BATTERY_HOT = 7,
    LIGHT_STATE = 8,
    MODE_SWITCH = 9,
    ALARM = 10,
    BATTERY_FULL = 11,
    REPEATER_RSSI_WEAK = 12,
    UPGRADE_STATUS = 13,
    MOTION_SENSOR_PIR = 14,
    ALARM_DELAY = 16,
    HUB_BATT_POWERED = 17,
    SENSOR_NO_OPEN = 18
}

export enum CusPushAlarmType {
    HUB_STOP = 0,
    DEV_STOP = 1,
    GSENSOR = 2,
    PIR = 3,
    APP = 4,
    HOT = 5,
    DOOR = 6,
    CAMERA = 7,
    EVT = 10,
    DELAY_EVT = 16
}

export enum CusPushMode {
    SWITCH_FROM_KEYPAD = 1,
    SWITCH_FROM_APP = 2,
    SWITCH = 9
}

export enum ServerPushEvent {
    INVITE_DEVICE = 10300,
    REMOVE_DEVICE = 10200,
    REMOVE_HOMEBASE = 10100,
    VERIFICATION = 10500,
    WEB_ACTION = 10800

}

export enum DoorbellPushEvent {
    BACKGROUND_ACTIVE = 3100,
    MOTION_DETECTION = 3101,
    FACE_DETECTION = 3102,
    PRESS_DOORBELL = 3103
}

export enum IndoorPushEvent {
    MOTION_DETECTION = 3101,
    FACE_DETECTION = 3102,
    CRYIG_DETECTION = 3104,
    SOUND_DETECTION = 3105,
    PET_DETECTION = 3106
}

export enum IndoorPushMessageType {
    INDOOR = 18,
    TFCARD = 2
}