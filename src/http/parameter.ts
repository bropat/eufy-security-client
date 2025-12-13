import { Category } from 'typescript-logging-category-style';

import { CommandType, TrackerCommandType } from '../p2p/types';
import { decodeBase64, getNullTerminatedString } from '../p2p/utils';
import { getError, parseJSON } from '../utils';
import { ParamType } from './types';
import { decryptTrackerData } from './utils';
import { ensureError } from '../error';

export class ParameterHelper {
    private static readonly JSON_PARSE_BASE64_PARAMS = new Set<number>([
        ParamType.SNOOZE_MODE,
        ParamType.CAMERA_MOTION_ZONES,
        CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN_DELAY,
        CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN,
        CommandType.ARM_DELAY_HOME,
        CommandType.ARM_DELAY_AWAY,
        CommandType.ARM_DELAY_CUS1,
        CommandType.ARM_DELAY_CUS2,
        CommandType.ARM_DELAY_CUS3,
        CommandType.ARM_DELAY_OFF,
        CommandType.CELLULAR_INFO,
        CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_COLORED_LIGHTING,
        CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_COLORED_LIGHTING,
        CommandType.CMD_WALL_LIGHT_SETTINGS_COLORED_LIGHTING_COLORS,
        CommandType.CMD_WALL_LIGHT_SETTINGS_DYNAMIC_LIGHTING_THEMES,
        CommandType.CMD_INDOOR_DET_SET_ACTIVE_ZONE,
        CommandType.CMD_SET_PRIVACYPARAM,
        CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY2,
        CommandType.CMD_BAT_DOORBELL_RECORD_QUALITY2,
        CommandType.CMD_SET_CROSS_TRACKING_CAMERA_LIST,
        CommandType.CMD_SET_CROSS_TRACKING_GROUP_LIST,
        CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
        CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425,
        CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH_T8425,
    ]);

    private static readonly JSON_PARSE_PLAIN_PARAMS = new Set<number>([
        CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
        CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY,
        CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE,
        CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME,
        CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE,
        CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME,
        CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE,
        CommandType.CMD_DOORBELL_DUAL_RADAR_WD_TIME,
        CommandType.CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH,
        CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE,
        CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
        CommandType.CMD_MOTION_SET_LEAVING_REACTIONS,
    ]);

    public static readValue(
        serialNumber: string,
        type: number,
        value: string,
        log: Category
    ): string | undefined {
        if (value) {
            if (ParameterHelper.JSON_PARSE_BASE64_PARAMS.has(type)) {
                if (typeof value === 'string') {
                    const parsedValue = parseJSON(
                        getNullTerminatedString(decodeBase64(value), 'utf-8'),
                        log
                    );
                    if (parsedValue === undefined) {
                        log.debug(
                            'Non-parsable parameter value received from eufy cloud. Will be ignored.',
                            {
                                serialNumber: serialNumber,
                                type: type,
                                value: value,
                            }
                        );
                    }
                    return parsedValue;
                } else {
                    return value; //return object
                }
            } else if (ParameterHelper.JSON_PARSE_PLAIN_PARAMS.has(type)) {
                if (typeof value === 'string') {
                    const parsedValue = parseJSON(value, log);
                    if (parsedValue === undefined) {
                        log.debug(
                            'Non-parsable parameter value received from eufy cloud. Will be ignored.',
                            {
                                serialNumber: serialNumber,
                                type: type,
                                value: value,
                            }
                        );
                    }
                    return parsedValue;
                } else {
                    return value; //return object
                }
            } else if (
                type === TrackerCommandType.COMMAND_NEW_LOCATION ||
                type === TrackerCommandType.LOCATION_NEW_ADDRESS
            ) {
                try {
                    const decrypted = decryptTrackerData(
                        Buffer.from(value, 'hex'),
                        Buffer.from(serialNumber)
                    );
                    if (decrypted !== undefined) {
                        return decrypted.toString('utf8').trim();
                    }
                } catch (err) {
                    const error = ensureError(err);
                    log.debug(
                        'Non-parsable parameter value received from eufy cloud. Will be ignored.',
                        {
                            serialNumber: serialNumber,
                            type: type,
                            value: value,
                            error: getError(error),
                        }
                    );
                }
                return '';
            }
        }
        return value;
    }

    public static writeValue(type: number, value: string): string {
        if (value) {
            if (
                type === ParamType.SNOOZE_MODE ||
                type === ParamType.CAMERA_MOTION_ZONES ||
                type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN_DELAY ||
                type === CommandType.CMD_SET_DOORSENSOR_ALWAYS_OPEN
            ) {
                return Buffer.from(JSON.stringify(value)).toString('base64');
            }
            return value;
        }
        return '';
    }
}
