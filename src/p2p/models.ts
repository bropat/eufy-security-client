import { PropertyName } from "..";
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
    value: unknown;
}

export interface CommandResult {
    property: PropertyData;
    command_type: CommandType;
    channel: number;
    return_code: number;
}

export interface CmdNotifyPayload {
    cmd: number;
    payload: ESLStationP2PThroughData | ESLAdvancedLockStatusNotification | string,
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