import { Logger } from "ts-log";

import { CommandType } from "../p2p/types";
import { decodeBase64, getNullTerminatedString } from "../p2p/utils";
import { parseJSON } from "../utils";
import { ParamType } from "./types";

export class ParameterHelper {

    public static readValue(type: number, value: string, log: Logger): string | undefined {
        if (value) {
            if (type === ParamType.SNOOZE_MODE ||
                type === ParamType.CAMERA_MOTION_ZONES ||
                type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN_DELAY ||
                type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN ||
                type === CommandType.ARM_DELAY_HOME ||
                type === CommandType.ARM_DELAY_AWAY ||
                type === CommandType.ARM_DELAY_CUS1 ||
                type === CommandType.ARM_DELAY_CUS2 ||
                type === CommandType.ARM_DELAY_CUS3 ||
                type === CommandType.ARM_DELAY_OFF ||
                type === CommandType.CELLULAR_INFO ||
                type === CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_COLORED_LIGHTING ||
                type === CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_COLORED_LIGHTING ||
                type === CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_COLORED_LIGHTING ||
                type === CommandType.CMD_WALL_LIGHT_SETTINGS_COLORED_LIGHTING_COLORS ||
                type === CommandType.CMD_WALL_LIGHT_SETTINGS_DYNAMIC_LIGHTING_THEMES) {
                if (typeof value === "string") {
                    const parsedValue = parseJSON(getNullTerminatedString(decodeBase64(value), "utf-8"), log);
                    if (parsedValue === undefined) {
                        log.warn("Non-parsable parameter value received from eufy cloud. Will be ignored.", { type: type, value: value });
                    }
                    return parsedValue;
                } else {
                    return value; //return object
                }
            } else if (type === CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE ||
                type === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY ||
                type === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE ||
                type === CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME ||
                type === CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE ||
                type === CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME ||
                type === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE ||
                type === CommandType.CMD_DOORBELL_DUAL_RADAR_WD_TIME ||
                type === CommandType.CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH ||
                type === CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE ||
                type === CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS) {
                if (typeof value === "string") {
                    const parsedValue = parseJSON(value, log);
                    if (parsedValue === undefined) {
                        log.warn("Non-parsable parameter value received from eufy cloud. Will be ignored.", { type: type, value: value });
                    }
                    return parsedValue;
                } else {
                    return value; //return object
                }
            }
        }
        return value;
    }

    public static writeValue(type: number, value: string): string {
        if (value) {
            const result = JSON.stringify(value);
            if (type === ParamType.SNOOZE_MODE ||
                type === ParamType.CAMERA_MOTION_ZONES ||
                type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN_DELAY ||
                type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN) {
                return Buffer.from(result).toString("base64");
            }
            return result;
        }
        return "";
    }

}