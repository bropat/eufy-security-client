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
}

export interface CommandResult {
    customData?: CustomData;
    command_type: CommandType;
    channel: number;
    return_code: number;
}

export interface CmdNotifyPayload {
    cmd: number;
    payload: ESLStationP2PThroughData | ESLAdvancedLockStatusNotification | SmartSafeSettingsNotification | SmartSafeStatusNotification | ESLBleV12P2PThroughData | EntrySensorStatus | GarageDoorStatus | string,
    payloadLen?: number;
}

export interface ESLStationP2PThroughData {
    channel?: number,
    lock_cmd: number,
    lock_payload: string,
    seq_num?: number,
    stationSn?: string;
}

export interface ESLAdvancedLockStatusNotification {
    code: number;
    slBattery: string;
    slState: string;
    trigger: number;
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

export interface LockAdvancedOnOffRequestPayload {
    shortUserId: string;
    slOperation: number;
    userId: string;
    userName: string;
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
    dev_sn: string,
    lock_payload: string,
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
    }
}

export interface LockV12P2PCommandType {
    commandType: CommandType,
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
    }
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