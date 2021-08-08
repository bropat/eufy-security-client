import { CommandType } from "../p2p";
import { ParamType } from "./types";

export class ParameterHelper {

    public static readValue(type: number, value: string): string {
        if (value) {
            if (type === ParamType.SNOOZE_MODE || type === ParamType.CAMERA_MOTION_ZONES || type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN_DELAY || type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN) {
                try {
                    return JSON.parse(Buffer.from(value).toString("ascii"));
                } catch(error) {
                }
                return "";
            } else if (type === CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE) {
                try {
                    return JSON.parse(value);
                } catch(error) {
                }
                return "";
            }
        }
        return value;
    }

    public static writeValue(type: number, value: string): string {
        if (value) {
            const result = JSON.stringify(value);
            if (type === ParamType.SNOOZE_MODE || type === ParamType.CAMERA_MOTION_ZONES || type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN_DELAY || type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN) {
                return Buffer.from(result).toString("base64");
            }
            return result;
        }
        return "";
    }

}