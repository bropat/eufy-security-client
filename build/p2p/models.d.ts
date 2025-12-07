import { PropertyValue } from "../http";
import { CommandName, PropertyName } from "../http/types";
import { SmartSafeEventValueDetail } from "../push/models";
import { CommandType } from "./types";
export interface Address {
    host: string;
    port: number;
}
export interface CmdCameraInfoResponse {
    params: Array<{
        dev_type: number;
        param_type: number;
        param_value: string;
    }>;
    main_sw_version: string;
    sec_sw_version: string;
    db_bypass_str?: Array<{
        channel: number;
        param_type: number;
        param_value: string;
    }>;
}
export interface PropertyData {
    name: PropertyName;
    value: PropertyValue;
}
export interface CommandData {
    name: CommandName;
    value?: any;
}
export interface CustomData {
    property?: PropertyData;
    command?: CommandData;
    onSuccess?: () => void;
    onFailure?: () => void;
}
export interface CommandResult {
    customData?: CustomData;
    command_type: CommandType;
    channel: number;
    return_code: number;
}
export interface CmdNotifyPayload {
    cmd: number;
    payload: ESLStationP2PThroughData | ESLAdvancedLockStatusNotification | SmartSafeSettingsNotification | SmartSafeStatusNotification | ESLBleV12P2PThroughData | EntrySensorStatus | GarageDoorStatus | StorageInfoHB3 | SmartLockP2PSequenceData | string;
    payloadLen?: number;
}
export interface ESLStationP2PThroughData {
    channel?: number;
    lock_cmd: number;
    lock_payload: string;
    seq_num?: number;
    stationSn?: string;
}
export interface ESLAdvancedLockStatusNotification {
    code: number;
    slBattery: string;
    slState: string;
    trigger: number;
}
export interface ESLAdvancedLockStatusNotificationT8530 extends ESLAdvancedLockStatusNotification {
    slOpenDirection: string;
}
export interface SmartSafeSettingsNotification {
    data: string;
    prj_id: number;
}
export interface SmartSafeStatusNotification {
    event_type: number;
    event_time: number;
    event_value: number | SmartSafeEventValueDetail;
}
export interface SmartSafeNotificationResponse {
    versionCode: number;
    commandCode: number;
    packageFlag: number;
    dataType: number;
    responseCode: number;
    data: Buffer;
}
export interface LockAdvancedOnOffRequestBasePayload {
    shortUserId: string;
    slOperation: number;
    userId: string;
    userName: string;
}
export interface LockAdvancedOnOffRequestPayload extends LockAdvancedOnOffRequestBasePayload {
    seq_num: number;
}
export interface AdvancedLockSetParamsType {
    [index: string]: unknown;
    autoLockTime: number;
    isAutoLock: number;
    isLockNotification: number;
    isNotification: number;
    isOneTouchLock: number;
    isSchedule: number;
    isScramblePasscode: number;
    isUnLockNotification: number;
    isWrongTryProtect: number;
    lockDownTime: number;
    lockSound: number;
    paramType: number;
    scheduleEnd: string;
    scheduleStart: string;
    wrongTryTime: number;
    seq_num: number;
}
export interface AdvancedLockSetParamsTypeT8520 {
    [index: string]: unknown;
    autoLockTime: number;
    isAutoLock: number;
    isLockNotification: number;
    isNotification: number;
    isOneTouchLock: number;
    isSchedule: number;
    isScramblePasscode: number;
    isUnLockNotification: number;
    isWrongTryProtect: number;
    lockDownTime: number;
    lockOpenDirection: number;
    lockVolume: number;
    nightVisionEnhance: number;
    openLeftAlarmEnable: number;
    openLeftAlarmScheduleEnd: string;
    openLeftAlarmScheduleStart: string;
    openLeftAlarmScheduled: number;
    openLeftAlarmTimer: number;
    openLeftAlarmWays: number;
    paramType: number;
    scheduleEnd: string;
    scheduleStart: string;
    tamperAlarmEnable: number;
    tamperAlarmScheduleEnd: string;
    tamperAlarmScheduleStart: string;
    tamperAlarmScheduled: number;
    tamperAlarmWays: number;
    wrongTryTime: number;
}
export interface LockP2PCommandType {
    commandType: CommandType;
    value: string;
    channel: number;
    aesKey: string;
}
export interface LockP2PCommandPayloadType {
    key: string;
    account_id: string;
    cmd: CommandType;
    mChannel: number;
    mValue3: number;
    payload: string;
}
export interface ESLBleV12P2PThroughData {
    dev_sn: string;
    lock_payload: string;
}
export interface LockV12P2PCommandPayloadType {
    account_id: string;
    cmd: CommandType;
    mChannel: number;
    mValue3: number;
    payload: {
        apiCommand: number;
        lock_payload: string;
        seq_num: number;
    };
}
export interface LockV12P2PCommandType {
    commandType: CommandType;
    value: string;
}
export interface SmartSafeP2PCommandPayloadType {
    account_id: string;
    cmd: CommandType;
    mChannel: number;
    mValue3: number;
    payload: {
        data: string;
        prj_id: CommandType;
        seq_num: number;
    };
}
export interface SmartSafeP2PCommandType {
    commandType: CommandType;
    value: string;
    channel: number;
}
export interface CmdDatabaseImageResponse {
    file: string;
    content: string;
}
export interface EntrySensorStatus {
    status: number;
}
export interface GarageDoorStatus {
    type: number;
    notify_tag: string;
    door_id: number;
}
export interface StorageInfoHB3 {
    cmd: number;
    version: number;
    mIntRet: number;
    msg: string;
    old_storage_label: string;
    cur_storage_label: string;
    body: StorageInfoBodyHB3;
}
export interface StorageInfoBodyHB3 {
    body_version: number;
    storage_days: number;
    storage_events: number;
    con_video_hours: number;
    format_transaction: string;
    format_errcode: number;
    hdd_info: StorageInfoHddHB3;
    move_disk_info: StorageInfoMoveDiskInfoHB3;
    emmc_info: StorageInfoEmmcHB3;
}
export interface StorageInfoHddHB3 {
    serial_number: string;
    disk_path: string;
    disk_size: number;
    system_size: number;
    disk_used: number;
    video_used: number;
    video_size: number;
    cur_temperate: number;
    parted_status: number;
    work_status: number;
    hdd_label: string;
    health: number;
    device_module: string;
    hdd_type: number;
}
export interface StorageInfoMoveDiskInfoHB3 {
    disk_path: string;
    disk_size: number;
    disk_used: number;
    part_layout_arr: string[];
    data: string[];
}
export interface StorageInfoEmmcHB3 {
    disk_nominal: number;
    disk_size: number;
    system_size: number;
    disk_used: number;
    data_used_percent: number;
    swap_size: number;
    video_size: number;
    video_used: number;
    data_partition_size: number;
    eol_percent: number;
    work_status: number;
    health: number;
}
export interface SmartLockP2PCommandPayloadType {
    account_id: string;
    cmd: CommandType;
    mChannel: number;
    mValue3: number;
    payload: {
        apiCommand: number;
        lock_payload: string;
        seq_num: number;
        time: number;
    };
}
export interface SmartLockP2PCommandType {
    commandType: CommandType;
    value: string;
}
export interface SmartLockP2PThroughData {
    dev_sn: string;
    lock_payload: string;
    time: string;
}
export interface SmartLockP2PSequenceData {
    lock_cmd: number;
    seq_num: number;
    dev_sn: string;
    bus_type?: number;
}
