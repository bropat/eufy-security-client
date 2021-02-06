import { ParamType } from "./types";

export class Parameter {

    public static readValue(type: number, value: string): string {
        if (value) {
            if (type == ParamType.SNOOZE_MODE || type == ParamType.CAMERA_MOTION_ZONES) {
                try {
                    return JSON.parse(Buffer.from(value).toString("ascii"));
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
            if (type == ParamType.SNOOZE_MODE) {
                return Buffer.from(result).toString("base64");
            }
            return result;
        }
        return "";
    }

}