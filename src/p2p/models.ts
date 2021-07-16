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

export interface CommandResult {
    command_type: CommandType;
    channel: number;
    return_code: number;
}

export interface CmdESLNotifyPayload {
    cmd: number;
    payload: ESLStationP2PThroughData
}

export interface ESLStationP2PThroughData {
    channel?: number,
    lock_cmd: number,
    lock_payload: string,
    seq_num?: number,
    stationSn?: string;
}

export interface LockBasicOnOffRequestPayload {
    shortUserId: string;
    slOperation: number;
    userId: string;
    userName: string;
}