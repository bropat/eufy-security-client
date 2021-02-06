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