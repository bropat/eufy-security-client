import { createCipheriv } from "crypto";

import { Device } from "./device";
import { Schedule } from "./interfaces";
import { NotificationSwitchMode, DeviceType, WifiSignalLevel, HB3DetectionTypes } from "./types";

export const isGreaterEqualMinVersion = function(minimal_version: string, current_version: string): boolean {
    if (minimal_version === undefined)
        minimal_version = "";
    if (current_version === undefined)
        current_version = "";

    minimal_version = minimal_version.replace(/\D+/g, "");
    current_version = current_version.replace(/\D+/g, "");

    if (minimal_version === "")
        return false;
    if (current_version === "")
        return false;

    let min_version = 0;
    let curr_version = 0;

    try {
        min_version = Number.parseInt(minimal_version);
    } catch (error) {
    }
    try {
        curr_version = Number.parseInt(current_version);
    } catch (error) {
    }

    if (curr_version === 0 || min_version === 0 || curr_version < min_version) {
        return false;
    }
    return true;
}

export const pad = function(num: number): string {
    const norm = Math.floor(Math.abs(num));
    return (norm < 10 ? "0" : "") + norm;
};

export const getTimezoneGMTString = function(): string {
    const tzo = -new Date().getTimezoneOffset();
    const dif = tzo >= 0 ? "+" : "-";
    return `GMT${dif}${pad(tzo / 60)}:${pad(tzo % 60)}`
}

export const getAbsoluteFilePath = function(device_type:number, channel: number, filename: string): string {
    if (device_type === DeviceType.FLOODLIGHT) {
        return `/mnt/data/Camera${String(channel).padStart(2,"0")}/${filename}.dat`;
    }
    return `/media/mmcblk0p1/Camera${String(channel).padStart(2,"0")}/${filename}.dat`;
}

export const isNotificationSwitchMode = function(value: number, mode: NotificationSwitchMode): boolean {
    if (value === 1)
        value = 240;
    return (value & mode) !== 0;
}

export const switchNotificationMode = function(currentValue: number, mode: NotificationSwitchMode, enable: boolean): number {
    let result = 0;
    if (!enable && currentValue === 1 /* ALL */) {
        currentValue = 240;
    }
    if (enable) {
        result = mode | currentValue;
    } else {
        result = ~mode & currentValue;
    }
    if (isNotificationSwitchMode(result, NotificationSwitchMode.SCHEDULE) && isNotificationSwitchMode(result, NotificationSwitchMode.APP) && isNotificationSwitchMode(result, NotificationSwitchMode.GEOFENCE) && isNotificationSwitchMode(result, NotificationSwitchMode.KEYPAD)) {
        result = 1; /* ALL */
    }
    return result;
}

export const calculateWifiSignalLevel = function(device: Device, rssi: number): WifiSignalLevel {
    if (device.isWiredDoorbell()) {
        if (rssi >= -65) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -75) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -80 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;
    } else if (device.isCamera2Product()) {
        if (rssi >= 0) {
            return WifiSignalLevel.NO_SIGNAL;
        }
        if (rssi >= -65) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -75) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -85 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;

    } else if (device.isFloodLight()) {
        if (rssi >= 0) {
            return WifiSignalLevel.NO_SIGNAL;
        }
        if (rssi >= -60) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -70) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -80 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;

    } else if (device.isBatteryDoorbell()) {
        if (rssi >= -65) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -75) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -85 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;

    } else {
        if (rssi >= 0) {
            return WifiSignalLevel.NO_SIGNAL;
        }
        if (rssi >= -65) {
            return WifiSignalLevel.FULL;
        }
        if (rssi >= -75) {
            return WifiSignalLevel.STRONG;
        }
        return rssi >= -85 ? WifiSignalLevel.NORMAL : WifiSignalLevel.WEAK;
    }
}

export const encryptPassword = (password: string, key: Buffer): string => {
    const cipher = createCipheriv("aes-256-cbc", key, key.slice(0, 16));
    return (
        cipher.update(password, "utf8", "base64") +
        cipher.final("base64")
    );
}

export const getBlocklist = function(directions: Array<number>): Array<number> {
    const result = [];
    for (let distance = 1; distance <= 5; distance++) {
        let i = 0;
        let j = 0;
        let k = 1;
        for (const directionDistance of directions) {
            if (directionDistance >= distance) {
                j += k;
            }
            k <<= 1;
        }
        if (j == 0) {
            i = 65535;
        } else if (!(j == 255 || j == 65535)) {
            i = (j ^ 255) + 65280;
        }
        result.push(65535 & i);
    }
    return result;
}


export const getDistances = function(blocklist: Array<number>): Array<number> {
    const result = [3, 3, 3, 3, 3, 3, 3, 3];
    let calcDistance = 0;
    for (const blockElement of blocklist) {
        let valueOf = blockElement ^ 65535;
        calcDistance++;
        if (valueOf !== 0) {
            for (let i = 0; i < result.length; i++) {
                const intValue = valueOf & 1;
                if (intValue > 0) {
                    result[i] = calcDistance;
                }
                valueOf = valueOf >> 1;
            }
        }
    }
    return result;
}

export const isHB3DetectionModeEnabled = function(value: number, type: HB3DetectionTypes): boolean {
    if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
        return (type & value) == type && (value & 65536) == 65536;
    } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
        return (type & value) == type && (value & 1) == 1;
    }
    return (type & value) == type;
}

export const getHB3DetectionMode = function(value: number, type: HB3DetectionTypes, enable: boolean): number {
    let result = 0;
    if (!enable) {
        if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
            const tmp = (type & value) == type ? type ^ value : value;
            result = (value & 65536) == 65536 ? tmp ^ 65536 : tmp;
        } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
            const tmp = (type & value) == type ? type ^ value : value;
            result = (value & 1) == 1 ? tmp ^ 1 : tmp;
        } else {
            result = type ^ value;
        }
    } else {
        if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
            result =  type | value | 65536;
        } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
            result =  type | value | 1;
        } else {
            result = type | value;
        }
    }
    return result;
}

export interface EufyTimezone {
    timeZoneName: string;
    timeId: string;
    timeSn: string;
    timeZoneGMT: string;
}

export const timeZoneData: Array<EufyTimezone> =
[
    {
        "timeZoneName": "Abidjan",
        "timeId": "Africa/Abidjan",
        "timeSn": "1000",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Accra",
        "timeId": "Africa/Accra",
        "timeSn": "1001",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Addis Ababa",
        "timeId": "Africa/Addis_Ababa",
        "timeSn": "1002",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Algiers",
        "timeId": "Africa/Algiers",
        "timeSn": "1003",
        "timeZoneGMT": "CET-1"
    },
    {
        "timeZoneName": "Asmara",
        "timeId": "Africa/Asmara",
        "timeSn": "1004",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Bamako",
        "timeId": "Africa/Bamako",
        "timeSn": "1005",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Bangui",
        "timeId": "Africa/Bangui",
        "timeSn": "1006",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Banjul",
        "timeId": "Africa/Banjul",
        "timeSn": "1007",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Bissau",
        "timeId": "Africa/Bissau",
        "timeSn": "1008",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Blantyre",
        "timeId": "Africa/Blantyre",
        "timeSn": "1009",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Brazzaville",
        "timeId": "Africa/Brazzaville",
        "timeSn": "1010",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Bujumbura",
        "timeId": "Africa/Bujumbura",
        "timeSn": "1011",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Cairo",
        "timeId": "Africa/Cairo",
        "timeSn": "1012",
        "timeZoneGMT": "EET-2"
    },
    {
        "timeZoneName": "Casablanca",
        "timeId": "Africa/Casablanca",
        "timeSn": "1013",
        "timeZoneGMT": "\u003c+01\u003e-1"
    },
    {
        "timeZoneName": "Ceuta",
        "timeId": "Africa/Ceuta",
        "timeSn": "1014",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Conakry",
        "timeId": "Africa/Conakry",
        "timeSn": "1015",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Dakar",
        "timeId": "Africa/Dakar",
        "timeSn": "1016",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Dar es Salaam",
        "timeId": "Africa/Dar_es_Salaam",
        "timeSn": "1017",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Djibouti",
        "timeId": "Africa/Djibouti",
        "timeSn": "1018",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Douala",
        "timeId": "Africa/Douala",
        "timeSn": "1019",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "El Aaiun",
        "timeId": "Africa/El_Aaiun",
        "timeSn": "1020",
        "timeZoneGMT": "\u003c+01\u003e-1"
    },
    {
        "timeZoneName": "Freetown",
        "timeId": "Africa/Freetown",
        "timeSn": "1021",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Gaborone",
        "timeId": "Africa/Gaborone",
        "timeSn": "1022",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Harare",
        "timeId": "Africa/Harare",
        "timeSn": "1023",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Johannesburg",
        "timeId": "Africa/Johannesburg",
        "timeSn": "1024",
        "timeZoneGMT": "SAST-2"
    },
    {
        "timeZoneName": "Juba",
        "timeId": "Africa/Juba",
        "timeSn": "1025",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Kampala",
        "timeId": "Africa/Kampala",
        "timeSn": "1026",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Khartoum",
        "timeId": "Africa/Khartoum",
        "timeSn": "1027",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Kigali",
        "timeId": "Africa/Kigali",
        "timeSn": "1028",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Kinshasa",
        "timeId": "Africa/Kinshasa",
        "timeSn": "1029",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Lagos",
        "timeId": "Africa/Lagos",
        "timeSn": "1030",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Libreville",
        "timeId": "Africa/Libreville",
        "timeSn": "1031",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Lome",
        "timeId": "Africa/Lome",
        "timeSn": "1032",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Luanda",
        "timeId": "Africa/Luanda",
        "timeSn": "1033",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Lubumbashi",
        "timeId": "Africa/Lubumbashi",
        "timeSn": "1034",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Lusaka",
        "timeId": "Africa/Lusaka",
        "timeSn": "1035",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Malabo",
        "timeId": "Africa/Malabo",
        "timeSn": "1036",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Maputo",
        "timeId": "Africa/Maputo",
        "timeSn": "1037",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Maseru",
        "timeId": "Africa/Maseru",
        "timeSn": "1038",
        "timeZoneGMT": "SAST-2"
    },
    {
        "timeZoneName": "Mbabane",
        "timeId": "Africa/Mbabane",
        "timeSn": "1039",
        "timeZoneGMT": "SAST-2"
    },
    {
        "timeZoneName": "Mogadishu",
        "timeId": "Africa/Mogadishu",
        "timeSn": "1040",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Monrovia",
        "timeId": "Africa/Monrovia",
        "timeSn": "1041",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Nairobi",
        "timeId": "Africa/Nairobi",
        "timeSn": "1042",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Ndjamena",
        "timeId": "Africa/Ndjamena",
        "timeSn": "1043",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Niamey",
        "timeId": "Africa/Niamey",
        "timeSn": "1044",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Nouakchott",
        "timeId": "Africa/Nouakchott",
        "timeSn": "1045",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Ouagadougou",
        "timeId": "Africa/Ouagadougou",
        "timeSn": "1046",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Porto-Novo",
        "timeId": "Africa/Porto-Novo",
        "timeSn": "1047",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Saint Thomas",
        "timeId": "Africa/Sao_Tome",
        "timeSn": "1048",
        "timeZoneGMT": "WAT-1"
    },
    {
        "timeZoneName": "Timbuktu",
        "timeId": "Africa/Timbuktu",
        "timeSn": "1049",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Tripoli",
        "timeId": "Africa/Tripoli",
        "timeSn": "1050",
        "timeZoneGMT": "EET-2"
    },
    {
        "timeZoneName": "Tunis",
        "timeId": "Africa/Tunis",
        "timeSn": "1051",
        "timeZoneGMT": "CET-1"
    },
    {
        "timeZoneName": "Windhoek",
        "timeId": "Africa/Windhoek",
        "timeSn": "1052",
        "timeZoneGMT": "CAT-2"
    },
    {
        "timeZoneName": "Adak",
        "timeId": "America/Adak",
        "timeSn": "1053",
        "timeZoneGMT": "HST10HDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Anchorage",
        "timeId": "America/Anchorage",
        "timeSn": "1054",
        "timeZoneGMT": "AKST9AKDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Anguilla",
        "timeId": "America/Anguilla",
        "timeSn": "1055",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Antigua",
        "timeId": "America/Antigua",
        "timeSn": "1056",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Araguaina",
        "timeId": "America/Araguaina",
        "timeSn": "1057",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Buenos Aires",
        "timeId": "America/Argentina/Buenos_Aires",
        "timeSn": "1058",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Catamarca",
        "timeId": "America/Argentina/Catamarca",
        "timeSn": "1059",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "ComodRivadavia",
        "timeId": "America/Argentina/ComodRivadavia",
        "timeSn": "1060",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Cordoba",
        "timeId": "America/Argentina/Cordoba",
        "timeSn": "1061",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Jujuy",
        "timeId": "America/Argentina/Jujuy",
        "timeSn": "1062",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "La Rioja",
        "timeId": "America/Argentina/La_Rioja",
        "timeSn": "1063",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Mendoza",
        "timeId": "America/Argentina/Mendoza",
        "timeSn": "1064",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Rio Gallegos",
        "timeId": "America/Argentina/Rio_Gallegos",
        "timeSn": "1065",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Salta",
        "timeId": "America/Argentina/Salta",
        "timeSn": "1066",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "San Juan",
        "timeId": "America/Argentina/San_Juan",
        "timeSn": "1067",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "San Luis",
        "timeId": "America/Argentina/San_Luis",
        "timeSn": "1068",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Tucuman",
        "timeId": "America/Argentina/Tucuman",
        "timeSn": "1069",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Ushuaia",
        "timeId": "America/Argentina/Ushuaia",
        "timeSn": "1070",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Aruba",
        "timeId": "America/Aruba",
        "timeSn": "1071",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Asuncion",
        "timeId": "America/Asuncion",
        "timeSn": "1072",
        "timeZoneGMT": "\u003c-04\u003e4\u003c-03\u003e,M10.1.0/0,M3.4.0/0"
    },
    {
        "timeZoneName": "Atikokan",
        "timeId": "America/Atikokan",
        "timeSn": "1073",
        "timeZoneGMT": "EST5"
    },
    {
        "timeZoneName": "Atka",
        "timeId": "America/Atka",
        "timeSn": "1074",
        "timeZoneGMT": "HST10HDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Bahia",
        "timeId": "America/Bahia",
        "timeSn": "1075",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Bahia Banderas",
        "timeId": "America/Bahia_Banderas",
        "timeSn": "1076",
        "timeZoneGMT": "CST6CDT,M4.1.0,M10.5.0"
    },
    {
        "timeZoneName": "Barbados",
        "timeId": "America/Barbados",
        "timeSn": "1077",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Belem",
        "timeId": "America/Belem",
        "timeSn": "1078",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Belize",
        "timeId": "America/Belize",
        "timeSn": "1079",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Blanc-Sablon",
        "timeId": "America/Blanc-Sablon",
        "timeSn": "1080",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Boa Vista",
        "timeId": "America/Boa_Vista",
        "timeSn": "1081",
        "timeZoneGMT": "\u003c-04\u003e4"
    },
    {
        "timeZoneName": "Bogota",
        "timeId": "America/Bogota",
        "timeSn": "1082",
        "timeZoneGMT": "\u003c-05\u003e5"
    },
    {
        "timeZoneName": "Boise",
        "timeId": "America/Boise",
        "timeSn": "1083",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Cambridge Bay",
        "timeId": "America/Cambridge_Bay",
        "timeSn": "1084",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Campo Grande",
        "timeId": "America/Campo_Grande",
        "timeSn": "1085",
        "timeZoneGMT": "\u003c-04\u003e4\u003c-03\u003e,M11.1.0/0,M2.3.0/0"
    },
    {
        "timeZoneName": "Cancun",
        "timeId": "America/Cancun",
        "timeSn": "1086",
        "timeZoneGMT": "EST5"
    },
    {
        "timeZoneName": "Caracas",
        "timeId": "America/Caracas",
        "timeSn": "1087",
        "timeZoneGMT": "\u003c-04\u003e4"
    },
    {
        "timeZoneName": "Cayenne",
        "timeId": "America/Cayenne",
        "timeSn": "1088",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Cayman",
        "timeId": "America/Cayman",
        "timeSn": "1089",
        "timeZoneGMT": "EST5"
    },
    {
        "timeZoneName": "Chicago",
        "timeId": "America/Chicago",
        "timeSn": "1090",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Chihuahua",
        "timeId": "America/Chihuahua",
        "timeSn": "1091",
        "timeZoneGMT": "MST7MDT,M4.1.0,M10.5.0"
    },
    {
        "timeZoneName": "Costa Rica",
        "timeId": "America/Costa_Rica",
        "timeSn": "1092",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Creston",
        "timeId": "America/Creston",
        "timeSn": "1093",
        "timeZoneGMT": "MST7"
    },
    {
        "timeZoneName": "Cuiaba",
        "timeId": "America/Cuiaba",
        "timeSn": "1094",
        "timeZoneGMT": "\u003c-04\u003e4\u003c-03\u003e,M11.1.0/0,M2.3.0/0"
    },
    {
        "timeZoneName": "Curacao",
        "timeId": "America/Curacao",
        "timeSn": "1095",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Danmarkshavn",
        "timeId": "America/Danmarkshavn",
        "timeSn": "1096",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Dawson",
        "timeId": "America/Dawson",
        "timeSn": "1097",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Dawson Creek",
        "timeId": "America/Dawson_Creek",
        "timeSn": "1098",
        "timeZoneGMT": "MST7"
    },
    {
        "timeZoneName": "Denver",
        "timeId": "America/Denver",
        "timeSn": "1099",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Detroit",
        "timeId": "America/Detroit",
        "timeSn": "1100",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Dominica",
        "timeId": "America/Dominica",
        "timeSn": "1101",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Edmonton",
        "timeId": "America/Edmonton",
        "timeSn": "1102",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Eirunepe",
        "timeId": "America/Eirunepe",
        "timeSn": "1103",
        "timeZoneGMT": "\u003c-05\u003e5"
    },
    {
        "timeZoneName": "El Salvador",
        "timeId": "America/El_Salvador",
        "timeSn": "1104",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Ensenada",
        "timeId": "America/Ensenada",
        "timeSn": "1105",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Fort Nelson",
        "timeId": "America/Fort_Nelson",
        "timeSn": "1106",
        "timeZoneGMT": "MST7"
    },
    {
        "timeZoneName": "Fort Wayne",
        "timeId": "America/Fort_Wayne",
        "timeSn": "1107",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Fortaleza",
        "timeId": "America/Fortaleza",
        "timeSn": "1108",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Glace Bay",
        "timeId": "America/Glace_Bay",
        "timeSn": "1109",
        "timeZoneGMT": "AST4ADT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Nuuk",
        "timeId": "America/Godthab",
        "timeSn": "1110",
        "timeZoneGMT": "\u003c-03\u003e3\u003c-02\u003e,M3.5.0,M10.5.0"
    },
    {
        "timeZoneName": "Goose Bay",
        "timeId": "America/Goose_Bay",
        "timeSn": "1111",
        "timeZoneGMT": "AST4ADT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Grand Turk",
        "timeId": "America/Grand_Turk",
        "timeSn": "1112",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Grenada",
        "timeId": "America/Grenada",
        "timeSn": "1113",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Guadeloupe",
        "timeId": "America/Guadeloupe",
        "timeSn": "1114",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Guatemala",
        "timeId": "America/Guatemala",
        "timeSn": "1115",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Guayaquil",
        "timeId": "America/Guayaquil",
        "timeSn": "1116",
        "timeZoneGMT": "\u003c-05\u003e5"
    },
    {
        "timeZoneName": "Guyana",
        "timeId": "America/Guyana",
        "timeSn": "1117",
        "timeZoneGMT": "\u003c-04\u003e4"
    },
    {
        "timeZoneName": "Halifax",
        "timeId": "America/Halifax",
        "timeSn": "1118",
        "timeZoneGMT": "AST4ADT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Havana",
        "timeId": "America/Havana",
        "timeSn": "1119",
        "timeZoneGMT": "CST5CDT,M3.2.0/0,M11.1.0/1"
    },
    {
        "timeZoneName": "Hermosillo",
        "timeId": "America/Hermosillo",
        "timeSn": "1120",
        "timeZoneGMT": "MST7"
    },
    {
        "timeZoneName": "Indianapolis",
        "timeId": "America/Indiana/Indianapolis",
        "timeSn": "1121",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Knox, Indiana",
        "timeId": "America/Indiana/Knox",
        "timeSn": "1122",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Marengo, Indiana",
        "timeId": "America/Indiana/Marengo",
        "timeSn": "1123",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Petersburg, Indiana",
        "timeId": "America/Indiana/Petersburg",
        "timeSn": "1124",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Tell City, Indiana",
        "timeId": "America/Indiana/Tell_City",
        "timeSn": "1125",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Vevay, Indiana",
        "timeId": "America/Indiana/Vevay",
        "timeSn": "1126",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Vincennes, Indiana",
        "timeId": "America/Indiana/Vincennes",
        "timeSn": "1127",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Winamac, Indiana",
        "timeId": "America/Indiana/Winamac",
        "timeSn": "1128",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Inuvik",
        "timeId": "America/Inuvik",
        "timeSn": "1129",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Iqaluit",
        "timeId": "America/Iqaluit",
        "timeSn": "1130",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Jamaica",
        "timeId": "America/Jamaica",
        "timeSn": "1131",
        "timeZoneGMT": "EST5"
    },
    {
        "timeZoneName": "Juneau",
        "timeId": "America/Juneau",
        "timeSn": "1132",
        "timeZoneGMT": "AKST9AKDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Louisville",
        "timeId": "America/Kentucky/Louisville",
        "timeSn": "1133",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Monticello, Kentucky",
        "timeId": "America/Kentucky/Monticello",
        "timeSn": "1134",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Knox IN",
        "timeId": "America/Knox_IN",
        "timeSn": "1135",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Kralendijk",
        "timeId": "America/Kralendijk",
        "timeSn": "1136",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "La Paz",
        "timeId": "America/La_Paz",
        "timeSn": "1137",
        "timeZoneGMT": "\u003c-04\u003e4"
    },
    {
        "timeZoneName": "Lima",
        "timeId": "America/Lima",
        "timeSn": "1138",
        "timeZoneGMT": "\u003c-05\u003e5"
    },
    {
        "timeZoneName": "Los Angeles",
        "timeId": "America/Los_Angeles",
        "timeSn": "1139",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Lower Prince’s Quarter",
        "timeId": "America/Lower_Princes",
        "timeSn": "1140",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Maceio",
        "timeId": "America/Maceio",
        "timeSn": "1141",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Managua",
        "timeId": "America/Managua",
        "timeSn": "1142",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Manaus",
        "timeId": "America/Manaus",
        "timeSn": "1143",
        "timeZoneGMT": "\u003c-04\u003e4"
    },
    {
        "timeZoneName": "Marigot",
        "timeId": "America/Marigot",
        "timeSn": "1144",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Martinique",
        "timeId": "America/Martinique",
        "timeSn": "1145",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Matamoros",
        "timeId": "America/Matamoros",
        "timeSn": "1146",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Mazatlan",
        "timeId": "America/Mazatlan",
        "timeSn": "1147",
        "timeZoneGMT": "MST7MDT,M4.1.0,M10.5.0"
    },
    {
        "timeZoneName": "Menominee",
        "timeId": "America/Menominee",
        "timeSn": "1148",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Merida",
        "timeId": "America/Merida",
        "timeSn": "1149",
        "timeZoneGMT": "CST6CDT,M4.1.0,M10.5.0"
    },
    {
        "timeZoneName": "Metlakatla",
        "timeId": "America/Metlakatla",
        "timeSn": "1150",
        "timeZoneGMT": "AKST9AKDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Mexico City",
        "timeId": "America/Mexico_City",
        "timeSn": "1151",
        "timeZoneGMT": "CST6CDT,M4.1.0,M10.5.0"
    },
    {
        "timeZoneName": "Miquelon",
        "timeId": "America/Miquelon",
        "timeSn": "1152",
        "timeZoneGMT": "\u003c-03\u003e3\u003c-02\u003e,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Moncton",
        "timeId": "America/Moncton",
        "timeSn": "1153",
        "timeZoneGMT": "AST4ADT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Monterrey",
        "timeId": "America/Monterrey",
        "timeSn": "1154",
        "timeZoneGMT": "CST6CDT,M4.1.0,M10.5.0"
    },
    {
        "timeZoneName": "Montevideo",
        "timeId": "America/Montevideo",
        "timeSn": "1155",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Montreal",
        "timeId": "America/Montreal",
        "timeSn": "1156",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Montserrat",
        "timeId": "America/Montserrat",
        "timeSn": "1157",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Nassau",
        "timeId": "America/Nassau",
        "timeSn": "1158",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "New York",
        "timeId": "America/New_York",
        "timeSn": "1159",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Nipigon",
        "timeId": "America/Nipigon",
        "timeSn": "1160",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Nome",
        "timeId": "America/Nome",
        "timeSn": "1161",
        "timeZoneGMT": "AKST9AKDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Noronha",
        "timeId": "America/Noronha",
        "timeSn": "1162",
        "timeZoneGMT": "\u003c-02\u003e2"
    },
    {
        "timeZoneName": "Beulah, North Dakota",
        "timeId": "America/North_Dakota/Beulah",
        "timeSn": "1163",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Center, North Dakota",
        "timeId": "America/North_Dakota/Center",
        "timeSn": "1164",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "New Salem, North Dakota",
        "timeId": "America/North_Dakota/New_Salem",
        "timeSn": "1165",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Ojinaga",
        "timeId": "America/Ojinaga",
        "timeSn": "1166",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Panama",
        "timeId": "America/Panama",
        "timeSn": "1167",
        "timeZoneGMT": "EST5"
    },
    {
        "timeZoneName": "Pangnirtung",
        "timeId": "America/Pangnirtung",
        "timeSn": "1168",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Paramaribo",
        "timeId": "America/Paramaribo",
        "timeSn": "1169",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Phoenix",
        "timeId": "America/Phoenix",
        "timeSn": "1170",
        "timeZoneGMT": "MST7"
    },
    {
        "timeZoneName": "Port-au-Prince",
        "timeId": "America/Port-au-Prince",
        "timeSn": "1171",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Port of Spain",
        "timeId": "America/Port_of_Spain",
        "timeSn": "1172",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Porto Acre",
        "timeId": "America/Porto_Acre",
        "timeSn": "1173",
        "timeZoneGMT": "\u003c-05\u003e5"
    },
    {
        "timeZoneName": "Porto Velho",
        "timeId": "America/Porto_Velho",
        "timeSn": "1174",
        "timeZoneGMT": "\u003c-04\u003e4"
    },
    {
        "timeZoneName": "Puerto Rico",
        "timeId": "America/Puerto_Rico",
        "timeSn": "1175",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Punta Arenas",
        "timeId": "America/Punta_Arenas",
        "timeSn": "1176",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Rainy River",
        "timeId": "America/Rainy_River",
        "timeSn": "1177",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Rankin Inlet",
        "timeId": "America/Rankin_Inlet",
        "timeSn": "1178",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Recife",
        "timeId": "America/Recife",
        "timeSn": "1179",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Regina",
        "timeId": "America/Regina",
        "timeSn": "1180",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Resolute",
        "timeId": "America/Resolute",
        "timeSn": "1181",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Rio Branco",
        "timeId": "America/Rio_Branco",
        "timeSn": "1182",
        "timeZoneGMT": "\u003c-05\u003e5"
    },
    {
        "timeZoneName": "Rosario",
        "timeId": "America/Rosario",
        "timeSn": "1183",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Santa Isabel",
        "timeId": "America/Santa_Isabel",
        "timeSn": "1184",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Santarem",
        "timeId": "America/Santarem",
        "timeSn": "1185",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Santiago",
        "timeId": "America/Santiago",
        "timeSn": "1186",
        "timeZoneGMT": "\u003c-04\u003e4\u003c-03\u003e,M9.1.6/24,M4.1.6/24"
    },
    {
        "timeZoneName": "Santo Domingo",
        "timeId": "America/Santo_Domingo",
        "timeSn": "1187",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Sao Paulo",
        "timeId": "America/Sao_Paulo",
        "timeSn": "1188",
        "timeZoneGMT": "\u003c-03\u003e3\u003c-02\u003e,M11.1.0/0,M2.3.0/0"
    },
    {
        "timeZoneName": "Ittoqqortoormiit",
        "timeId": "America/Scoresbysund",
        "timeSn": "1189",
        "timeZoneGMT": "\u003c-01\u003e1\u003c+00\u003e,M3.5.0/0,M10.5.0/1"
    },
    {
        "timeZoneName": "Shiprock",
        "timeId": "America/Shiprock",
        "timeSn": "1190",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Sitka",
        "timeId": "America/Sitka",
        "timeSn": "1191",
        "timeZoneGMT": "AKST9AKDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "St. Barthelemy",
        "timeId": "America/St_Barthelemy",
        "timeSn": "1192",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "St. John’s",
        "timeId": "America/St_Johns",
        "timeSn": "1193",
        "timeZoneGMT": "NST3:30NDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "St. Kitts",
        "timeId": "America/St_Kitts",
        "timeSn": "1194",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "St. Lucia",
        "timeId": "America/St_Lucia",
        "timeSn": "1195",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "St. Thomas",
        "timeId": "America/St_Thomas",
        "timeSn": "1196",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "St. Vincent",
        "timeId": "America/St_Vincent",
        "timeSn": "1197",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Swift Current",
        "timeId": "America/Swift_Current",
        "timeSn": "1198",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Tegucigalpa",
        "timeId": "America/Tegucigalpa",
        "timeSn": "1199",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Thule",
        "timeId": "America/Thule",
        "timeSn": "1200",
        "timeZoneGMT": "AST4ADT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Thunder Bay",
        "timeId": "America/Thunder_Bay",
        "timeSn": "1201",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Tijuana",
        "timeId": "America/Tijuana",
        "timeSn": "1202",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Toronto",
        "timeId": "America/Toronto",
        "timeSn": "1203",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Tortola",
        "timeId": "America/Tortola",
        "timeSn": "1204",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Vancouver",
        "timeId": "America/Vancouver",
        "timeSn": "1205",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Virgin",
        "timeId": "America/Virgin",
        "timeSn": "1206",
        "timeZoneGMT": "AST4"
    },
    {
        "timeZoneName": "Whitehorse",
        "timeId": "America/Whitehorse",
        "timeSn": "1207",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Winnipeg",
        "timeId": "America/Winnipeg",
        "timeSn": "1208",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Yakutat",
        "timeId": "America/Yakutat",
        "timeSn": "1209",
        "timeZoneGMT": "AKST9AKDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Yellowknife",
        "timeId": "America/Yellowknife",
        "timeSn": "1210",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Casey",
        "timeId": "Antarctica/Casey",
        "timeSn": "1211",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Davis",
        "timeId": "Antarctica/Davis",
        "timeSn": "1212",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Dumont d’Urville",
        "timeId": "Antarctica/DumontDUrville",
        "timeSn": "1213",
        "timeZoneGMT": "\u003c+10\u003e-10"
    },
    {
        "timeZoneName": "Macquarie",
        "timeId": "Antarctica/Macquarie",
        "timeSn": "1214",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Mawson",
        "timeId": "Antarctica/Mawson",
        "timeSn": "1215",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "McMurdo",
        "timeId": "Antarctica/McMurdo",
        "timeSn": "1216",
        "timeZoneGMT": "NZST-12NZDT,M9.5.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Palmer",
        "timeId": "Antarctica/Palmer",
        "timeSn": "1217",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "Rothera",
        "timeId": "Antarctica/Rothera",
        "timeSn": "1218",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "South Pole",
        "timeId": "Antarctica/South_Pole",
        "timeSn": "1219",
        "timeZoneGMT": "NZST-12NZDT,M9.5.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Syowa",
        "timeId": "Antarctica/Syowa",
        "timeSn": "1220",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Troll",
        "timeId": "Antarctica/Troll",
        "timeSn": "1221",
        "timeZoneGMT": "\u003c+00\u003e0\u003c+02\u003e-2,M3.5.0/1,M10.5.0/3"
    },
    {
        "timeZoneName": "Vostok",
        "timeId": "Antarctica/Vostok",
        "timeSn": "1222",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Longyearbyen",
        "timeId": "Arctic/Longyearbyen",
        "timeSn": "1223",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Aden",
        "timeId": "Asia/Aden",
        "timeSn": "1224",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Almaty",
        "timeId": "Asia/Almaty",
        "timeSn": "1225",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Amman",
        "timeId": "Asia/Amman",
        "timeSn": "1226",
        "timeZoneGMT": "EET-2EEST,M3.5.4/24,M10.5.5/1"
    },
    {
        "timeZoneName": "Anadyr",
        "timeId": "Asia/Anadyr",
        "timeSn": "1227",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Aqtau",
        "timeId": "Asia/Aqtau",
        "timeSn": "1228",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Aqtobe",
        "timeId": "Asia/Aqtobe",
        "timeSn": "1229",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Ashgabat",
        "timeId": "Asia/Ashgabat",
        "timeSn": "1230",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Ashkhabad",
        "timeId": "Asia/Ashkhabad",
        "timeSn": "1231",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Atyrau",
        "timeId": "Asia/Atyrau",
        "timeSn": "1232",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Baghdad",
        "timeId": "Asia/Baghdad",
        "timeSn": "1233",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Bahrain",
        "timeId": "Asia/Bahrain",
        "timeSn": "1234",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Baku",
        "timeId": "Asia/Baku",
        "timeSn": "1235",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Bangkok",
        "timeId": "Asia/Bangkok",
        "timeSn": "1236",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Barnaul",
        "timeId": "Asia/Barnaul",
        "timeSn": "1237",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Beirut",
        "timeId": "Asia/Beirut",
        "timeSn": "1238",
        "timeZoneGMT": "EET-2EEST,M3.5.0/0,M10.5.0/0"
    },
    {
        "timeZoneName": "Bishkek",
        "timeId": "Asia/Bishkek",
        "timeSn": "1239",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Brunei",
        "timeId": "Asia/Brunei",
        "timeSn": "1240",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Kolkata",
        "timeId": "Asia/Calcutta",
        "timeSn": "1241",
        "timeZoneGMT": "IST-5:30"
    },
    {
        "timeZoneName": "Chita",
        "timeId": "Asia/Chita",
        "timeSn": "1242",
        "timeZoneGMT": "\u003c+09\u003e-9"
    },
    {
        "timeZoneName": "Choibalsan",
        "timeId": "Asia/Choibalsan",
        "timeSn": "1243",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Chongqing",
        "timeId": "Asia/Chongqing",
        "timeSn": "1244",
        "timeZoneGMT": "CST-8"
    },
    {
        "timeZoneName": "Chungking",
        "timeId": "Asia/Chungking",
        "timeSn": "1245",
        "timeZoneGMT": "CST-8"
    },
    {
        "timeZoneName": "Colombo",
        "timeId": "Asia/Colombo",
        "timeSn": "1246",
        "timeZoneGMT": "\u003c+0530\u003e-5:30"
    },
    {
        "timeZoneName": "Dacca",
        "timeId": "Asia/Dacca",
        "timeSn": "1247",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Damascus",
        "timeId": "Asia/Damascus",
        "timeSn": "1248",
        "timeZoneGMT": "EET-2EEST,M3.5.5/0,M10.5.5/0"
    },
    {
        "timeZoneName": "Dhaka",
        "timeId": "Asia/Dhaka",
        "timeSn": "1249",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Dili",
        "timeId": "Asia/Dili",
        "timeSn": "1250",
        "timeZoneGMT": "\u003c+09\u003e-9"
    },
    {
        "timeZoneName": "Dubai",
        "timeId": "Asia/Dubai",
        "timeSn": "1251",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Dushanbe",
        "timeId": "Asia/Dushanbe",
        "timeSn": "1252",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Famagusta",
        "timeId": "Asia/Famagusta",
        "timeSn": "1253",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Gaza",
        "timeId": "Asia/Gaza",
        "timeSn": "1254",
        "timeZoneGMT": "EET-2EEST,M3.4.6/1,M10.5.6/1"
    },
    {
        "timeZoneName": "Harbin",
        "timeId": "Asia/Harbin",
        "timeSn": "1255",
        "timeZoneGMT": "CST-8"
    },
    {
        "timeZoneName": "Hebron",
        "timeId": "Asia/Hebron",
        "timeSn": "1256",
        "timeZoneGMT": "EET-2EEST,M3.4.6/1,M10.5.6/1"
    },
    {
        "timeZoneName": "Ho Chi Minh",
        "timeId": "Asia/Ho_Chi_Minh",
        "timeSn": "1257",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Hong Kong",
        "timeId": "Asia/Hong_Kong",
        "timeSn": "1258",
        "timeZoneGMT": "HKT-8"
    },
    {
        "timeZoneName": "Hovd",
        "timeId": "Asia/Hovd",
        "timeSn": "1259",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Irkutsk",
        "timeId": "Asia/Irkutsk",
        "timeSn": "1260",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Istanbul",
        "timeId": "Asia/Istanbul",
        "timeSn": "1261",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Jakarta",
        "timeId": "Asia/Jakarta",
        "timeSn": "1262",
        "timeZoneGMT": "WIB-7"
    },
    {
        "timeZoneName": "Jayapura",
        "timeId": "Asia/Jayapura",
        "timeSn": "1263",
        "timeZoneGMT": "WIT-9"
    },
    {
        "timeZoneName": "Jerusalem",
        "timeId": "Asia/Jerusalem",
        "timeSn": "1264",
        "timeZoneGMT": "IST-2IDT,M3.5.0,M10.5.0"
    },
    {
        "timeZoneName": "Kabul",
        "timeId": "Asia/Kabul",
        "timeSn": "1265",
        "timeZoneGMT": "\u003c+0430\u003e-4:30"
    },
    {
        "timeZoneName": "Kamchatka",
        "timeId": "Asia/Kamchatka",
        "timeSn": "1266",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Karachi",
        "timeId": "Asia/Karachi",
        "timeSn": "1267",
        "timeZoneGMT": "PKT-5"
    },
    {
        "timeZoneName": "Kashgar",
        "timeId": "Asia/Kashgar",
        "timeSn": "1268",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Kathmandu",
        "timeId": "Asia/Kathmandu",
        "timeSn": "1269",
        "timeZoneGMT": "\u003c+0545\u003e-5:45"
    },
    {
        "timeZoneName": "Khandyga",
        "timeId": "Asia/Khandyga",
        "timeSn": "1270",
        "timeZoneGMT": "\u003c+09\u003e-9"
    },
    {
        "timeZoneName": "Krasnoyarsk",
        "timeId": "Asia/Krasnoyarsk",
        "timeSn": "1271",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Kuala Lumpur",
        "timeId": "Asia/Kuala_Lumpur",
        "timeSn": "1272",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Kuching",
        "timeId": "Asia/Kuching",
        "timeSn": "1273",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Kuwait",
        "timeId": "Asia/Kuwait",
        "timeSn": "1274",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Macao",
        "timeId": "Asia/Macao",
        "timeSn": "1275",
        "timeZoneGMT": "CST-8"
    },
    {
        "timeZoneName": "Macau",
        "timeId": "Asia/Macau",
        "timeSn": "1276",
        "timeZoneGMT": "CST-8"
    },
    {
        "timeZoneName": "Magadan",
        "timeId": "Asia/Magadan",
        "timeSn": "1277",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Makassar",
        "timeId": "Asia/Makassar",
        "timeSn": "1278",
        "timeZoneGMT": "WITA-8"
    },
    {
        "timeZoneName": "Manila",
        "timeId": "Asia/Manila",
        "timeSn": "1279",
        "timeZoneGMT": "PST-8"
    },
    {
        "timeZoneName": "Muscat",
        "timeId": "Asia/Muscat",
        "timeSn": "1280",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Nicosia",
        "timeId": "Asia/Nicosia",
        "timeSn": "1281",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Novokuznetsk",
        "timeId": "Asia/Novokuznetsk",
        "timeSn": "1282",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Novosibirsk",
        "timeId": "Asia/Novosibirsk",
        "timeSn": "1283",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Omsk",
        "timeId": "Asia/Omsk",
        "timeSn": "1284",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Oral",
        "timeId": "Asia/Oral",
        "timeSn": "1285",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Phnom Penh",
        "timeId": "Asia/Phnom_Penh",
        "timeSn": "1286",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Pontianak",
        "timeId": "Asia/Pontianak",
        "timeSn": "1287",
        "timeZoneGMT": "WIB-7"
    },
    {
        "timeZoneName": "Pyongyang",
        "timeId": "Asia/Pyongyang",
        "timeSn": "1288",
        "timeZoneGMT": "KST-9"
    },
    {
        "timeZoneName": "Qatar",
        "timeId": "Asia/Qatar",
        "timeSn": "1289",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Qyzylorda",
        "timeId": "Asia/Qyzylorda",
        "timeSn": "1290",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Yangon",
        "timeId": "Asia/Rangoon",
        "timeSn": "1291",
        "timeZoneGMT": "\u003c+0630\u003e-6:30"
    },
    {
        "timeZoneName": "Riyadh",
        "timeId": "Asia/Riyadh",
        "timeSn": "1292",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Ho Chi Minh City",
        "timeId": "Asia/Saigon",
        "timeSn": "1293",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Sakhalin",
        "timeId": "Asia/Sakhalin",
        "timeSn": "1294",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Samarkand",
        "timeId": "Asia/Samarkand",
        "timeSn": "1295",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Seoul",
        "timeId": "Asia/Seoul",
        "timeSn": "1296",
        "timeZoneGMT": "KST-9"
    },
    {
        "timeZoneName": "Beijing",
        "timeId": "Asia/Shanghai",
        "timeSn": "1297",
        "timeZoneGMT": "CST-8"
    },
    {
        "timeZoneName": "Singapore",
        "timeId": "Asia/Singapore",
        "timeSn": "1298",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Srednekolymsk",
        "timeId": "Asia/Srednekolymsk",
        "timeSn": "1299",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Taipei",
        "timeId": "Asia/Taipei",
        "timeSn": "1300",
        "timeZoneGMT": "CST-8"
    },
    {
        "timeZoneName": "Tashkent",
        "timeId": "Asia/Tashkent",
        "timeSn": "1301",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Tbilisi",
        "timeId": "Asia/Tbilisi",
        "timeSn": "1302",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Tehran",
        "timeId": "Asia/Tehran",
        "timeSn": "1303",
        "timeZoneGMT": "\u003c+0330\u003e-3:30\u003c+0430\u003e,J80/0,J264/0"
    },
    {
        "timeZoneName": "Tel Aviv",
        "timeId": "Asia/Tel_Aviv",
        "timeSn": "1304",
        "timeZoneGMT": "IST-2IDT,M3.5.0,M10.5.0"
    },
    {
        "timeZoneName": "Thimbu",
        "timeId": "Asia/Thimbu",
        "timeSn": "1305",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Thimphu",
        "timeId": "Asia/Thimphu",
        "timeSn": "1306",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Tokyo",
        "timeId": "Asia/Tokyo",
        "timeSn": "1307",
        "timeZoneGMT": "JST-9"
    },
    {
        "timeZoneName": "Tomsk",
        "timeId": "Asia/Tomsk",
        "timeSn": "1308",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Ujung Pandang",
        "timeId": "Asia/Ujung_Pandang",
        "timeSn": "1309",
        "timeZoneGMT": "WITA-8"
    },
    {
        "timeZoneName": "Ulaanbaatar",
        "timeId": "Asia/Ulaanbaatar",
        "timeSn": "1310",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Ulan Bator",
        "timeId": "Asia/Ulan_Bator",
        "timeSn": "1311",
        "timeZoneGMT": "\u003c+08\u003e-8"
    },
    {
        "timeZoneName": "Urumqi",
        "timeId": "Asia/Urumqi",
        "timeSn": "1312",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Ust-Nera",
        "timeId": "Asia/Ust-Nera",
        "timeSn": "1313",
        "timeZoneGMT": "\u003c+10\u003e-10"
    },
    {
        "timeZoneName": "Vientiane",
        "timeId": "Asia/Vientiane",
        "timeSn": "1314",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Vladivostok",
        "timeId": "Asia/Vladivostok",
        "timeSn": "1315",
        "timeZoneGMT": "\u003c+10\u003e-10"
    },
    {
        "timeZoneName": "Yakutsk",
        "timeId": "Asia/Yakutsk",
        "timeSn": "1316",
        "timeZoneGMT": "\u003c+09\u003e-9"
    },
    {
        "timeZoneName": "Yekaterinburg",
        "timeId": "Asia/Yekaterinburg",
        "timeSn": "1317",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Yerevan",
        "timeId": "Asia/Yerevan",
        "timeSn": "1318",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Azores",
        "timeId": "Atlantic/Azores",
        "timeSn": "1319",
        "timeZoneGMT": "\u003c-01\u003e1\u003c+00\u003e,M3.5.0/0,M10.5.0/1"
    },
    {
        "timeZoneName": "Bermuda",
        "timeId": "Atlantic/Bermuda",
        "timeSn": "1320",
        "timeZoneGMT": "AST4ADT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Canary",
        "timeId": "Atlantic/Canary",
        "timeSn": "1321",
        "timeZoneGMT": "WET0WEST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Cape Verde",
        "timeId": "Atlantic/Cape_Verde",
        "timeSn": "1322",
        "timeZoneGMT": "\u003c-01\u003e1"
    },
    {
        "timeZoneName": "Faroe",
        "timeId": "Atlantic/Faeroe",
        "timeSn": "1323",
        "timeZoneGMT": "WET0WEST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Jan Mayen",
        "timeId": "Atlantic/Jan_Mayen",
        "timeSn": "1324",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Madeira",
        "timeId": "Atlantic/Madeira",
        "timeSn": "1325",
        "timeZoneGMT": "WET0WEST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Reykjavik",
        "timeId": "Atlantic/Reykjavik",
        "timeSn": "1326",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "South Georgia",
        "timeId": "Atlantic/South_Georgia",
        "timeSn": "1327",
        "timeZoneGMT": "\u003c-02\u003e2"
    },
    {
        "timeZoneName": "St. Helena",
        "timeId": "Atlantic/St_Helena",
        "timeSn": "1328",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Stanley",
        "timeId": "Atlantic/Stanley",
        "timeSn": "1329",
        "timeZoneGMT": "\u003c-03\u003e3"
    },
    {
        "timeZoneName": "ACT",
        "timeId": "Australia/ACT",
        "timeSn": "1330",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Adelaide",
        "timeId": "Australia/Adelaide",
        "timeSn": "1331",
        "timeZoneGMT": "ACST-9:30ACDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Brisbane",
        "timeId": "Australia/Brisbane",
        "timeSn": "1332",
        "timeZoneGMT": "AEST-10"
    },
    {
        "timeZoneName": "Broken Hill",
        "timeId": "Australia/Broken_Hill",
        "timeSn": "1333",
        "timeZoneGMT": "ACST-9:30ACDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Canberra",
        "timeId": "Australia/Canberra",
        "timeSn": "1334",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Currie",
        "timeId": "Australia/Currie",
        "timeSn": "1335",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Darwin",
        "timeId": "Australia/Darwin",
        "timeSn": "1336",
        "timeZoneGMT": "ACST-9:30"
    },
    {
        "timeZoneName": "Eucla",
        "timeId": "Australia/Eucla",
        "timeSn": "1337",
        "timeZoneGMT": "\u003c+0845\u003e-8:45"
    },
    {
        "timeZoneName": "Hobart",
        "timeId": "Australia/Hobart",
        "timeSn": "1338",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "LHI",
        "timeId": "Australia/LHI",
        "timeSn": "1339",
        "timeZoneGMT": "\u003c+1030\u003e-10:30\u003c+11\u003e-11,M10.1.0,M4.1.0"
    },
    {
        "timeZoneName": "Lindeman",
        "timeId": "Australia/Lindeman",
        "timeSn": "1340",
        "timeZoneGMT": "AEST-10"
    },
    {
        "timeZoneName": "Lord Howe",
        "timeId": "Australia/Lord_Howe",
        "timeSn": "1341",
        "timeZoneGMT": "\u003c+1030\u003e-10:30\u003c+11\u003e-11,M10.1.0,M4.1.0"
    },
    {
        "timeZoneName": "Melbourne",
        "timeId": "Australia/Melbourne",
        "timeSn": "1342",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "NSW",
        "timeId": "Australia/NSW",
        "timeSn": "1343",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "North",
        "timeId": "Australia/North",
        "timeSn": "1344",
        "timeZoneGMT": "ACST-9:30"
    },
    {
        "timeZoneName": "Perth",
        "timeId": "Australia/Perth",
        "timeSn": "1345",
        "timeZoneGMT": "AWST-8"
    },
    {
        "timeZoneName": "Queensland",
        "timeId": "Australia/Queensland",
        "timeSn": "1346",
        "timeZoneGMT": "AEST-10"
    },
    {
        "timeZoneName": "South",
        "timeId": "Australia/South",
        "timeSn": "1347",
        "timeZoneGMT": "ACST-9:30ACDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Sydney",
        "timeId": "Australia/Sydney",
        "timeSn": "1348",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Tasmania",
        "timeId": "Australia/Tasmania",
        "timeSn": "1349",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Victoria",
        "timeId": "Australia/Victoria",
        "timeSn": "1350",
        "timeZoneGMT": "AEST-10AEDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "West",
        "timeId": "Australia/West",
        "timeSn": "1351",
        "timeZoneGMT": "AWST-8"
    },
    {
        "timeZoneName": "Yancowinna",
        "timeId": "Australia/Yancowinna",
        "timeSn": "1352",
        "timeZoneGMT": "ACST-9:30ACDT,M10.1.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Acre",
        "timeId": "Brazil/Acre",
        "timeSn": "1353",
        "timeZoneGMT": "\u003c-05\u003e5"
    },
    {
        "timeZoneName": "DeNoronha",
        "timeId": "Brazil/DeNoronha",
        "timeSn": "1354",
        "timeZoneGMT": "\u003c-02\u003e2"
    },
    {
        "timeZoneName": "East",
        "timeId": "Brazil/East",
        "timeSn": "1355",
        "timeZoneGMT": "\u003c-03\u003e3\u003c-02\u003e,M11.1.0/0,M2.3.0/0"
    },
    {
        "timeZoneName": "Atlantic",
        "timeId": "Canada/Atlantic",
        "timeSn": "1356",
        "timeZoneGMT": "AST4ADT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Central",
        "timeId": "Canada/Central",
        "timeSn": "1357",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Eastern",
        "timeId": "Canada/Eastern",
        "timeSn": "1358",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Mountain",
        "timeId": "Canada/Mountain",
        "timeSn": "1359",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Newfoundland",
        "timeId": "Canada/Newfoundland",
        "timeSn": "1360",
        "timeZoneGMT": "NST3:30NDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Pacific",
        "timeId": "Canada/Pacific",
        "timeSn": "1361",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Saskatchewan",
        "timeId": "Canada/Saskatchewan",
        "timeSn": "1362",
        "timeZoneGMT": "CST6"
    },
    {
        "timeZoneName": "Yukon",
        "timeId": "Canada/Yukon",
        "timeSn": "1363",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Continental",
        "timeId": "Chile/Continental",
        "timeSn": "1364",
        "timeZoneGMT": "\u003c-04\u003e4\u003c-03\u003e,M9.1.6/24,M4.1.6/24"
    },
    {
        "timeZoneName": "EasterIsland",
        "timeId": "Chile/EasterIsland",
        "timeSn": "1365",
        "timeZoneGMT": "\u003c-06\u003e6\u003c-05\u003e,M9.1.6/22,M4.1.6/22"
    },
    {
        "timeZoneName": "Cuba",
        "timeId": "Cuba",
        "timeSn": "1366",
        "timeZoneGMT": "CST5CDT,M3.2.0/0,M11.1.0/1"
    },
    {
        "timeZoneName": "Egypt",
        "timeId": "Egypt",
        "timeSn": "1367",
        "timeZoneGMT": "EET-2"
    },
    {
        "timeZoneName": "Eire",
        "timeId": "Eire",
        "timeSn": "1368",
        "timeZoneGMT": "IST-1GMT0,M10.5.0,M3.5.0/1"
    },
    {
        "timeZoneName": "Amsterdam",
        "timeId": "Europe/Amsterdam",
        "timeSn": "1369",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Andorra",
        "timeId": "Europe/Andorra",
        "timeSn": "1370",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Astrakhan",
        "timeId": "Europe/Astrakhan",
        "timeSn": "1371",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Athens",
        "timeId": "Europe/Athens",
        "timeSn": "1372",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Belfast",
        "timeId": "Europe/Belfast",
        "timeSn": "1373",
        "timeZoneGMT": "GMT0BST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Belgrade",
        "timeId": "Europe/Belgrade",
        "timeSn": "1374",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Berlin",
        "timeId": "Europe/Berlin",
        "timeSn": "1375",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Bratislava",
        "timeId": "Europe/Bratislava",
        "timeSn": "1376",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Brussels",
        "timeId": "Europe/Brussels",
        "timeSn": "1377",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Bucharest",
        "timeId": "Europe/Bucharest",
        "timeSn": "1378",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Budapest",
        "timeId": "Europe/Budapest",
        "timeSn": "1379",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Busingen",
        "timeId": "Europe/Busingen",
        "timeSn": "1380",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Chisinau",
        "timeId": "Europe/Chisinau",
        "timeSn": "1381",
        "timeZoneGMT": "EET-2EEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Copenhagen",
        "timeId": "Europe/Copenhagen",
        "timeSn": "1382",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Dublin",
        "timeId": "Europe/Dublin",
        "timeSn": "1383",
        "timeZoneGMT": "GMT0IST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Gibraltar",
        "timeId": "Europe/Gibraltar",
        "timeSn": "1384",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Guernsey",
        "timeId": "Europe/Guernsey",
        "timeSn": "1385",
        "timeZoneGMT": "GMT0BST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Helsinki",
        "timeId": "Europe/Helsinki",
        "timeSn": "1386",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Isle of Man",
        "timeId": "Europe/Isle_of_Man",
        "timeSn": "1387",
        "timeZoneGMT": "GMT0BST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Jersey",
        "timeId": "Europe/Jersey",
        "timeSn": "1388",
        "timeZoneGMT": "GMT0BST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Kaliningrad",
        "timeId": "Europe/Kaliningrad",
        "timeSn": "1389",
        "timeZoneGMT": "EET-2"
    },
    {
        "timeZoneName": "Kiev",
        "timeId": "Europe/Kiev",
        "timeSn": "1390",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Kirov",
        "timeId": "Europe/Kirov",
        "timeSn": "1391",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Lisbon",
        "timeId": "Europe/Lisbon",
        "timeSn": "1392",
        "timeZoneGMT": "WET0WEST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Ljubljana",
        "timeId": "Europe/Ljubljana",
        "timeSn": "1393",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "London",
        "timeId": "Europe/London",
        "timeSn": "1394",
        "timeZoneGMT": "GMT0BST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Luxembourg",
        "timeId": "Europe/Luxembourg",
        "timeSn": "1395",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Madrid",
        "timeId": "Europe/Madrid",
        "timeSn": "1396",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Malta",
        "timeId": "Europe/Malta",
        "timeSn": "1397",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Mariehamn",
        "timeId": "Europe/Mariehamn",
        "timeSn": "1398",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Minsk",
        "timeId": "Europe/Minsk",
        "timeSn": "1399",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Monaco",
        "timeId": "Europe/Monaco",
        "timeSn": "1400",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Moscow",
        "timeId": "Europe/Moscow",
        "timeSn": "1401",
        "timeZoneGMT": "MSK-3"
    },
    {
        "timeZoneName": "Oslo",
        "timeId": "Europe/Oslo",
        "timeSn": "1402",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Paris",
        "timeId": "Europe/Paris",
        "timeSn": "1403",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Podgorica",
        "timeId": "Europe/Podgorica",
        "timeSn": "1404",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Prague",
        "timeId": "Europe/Prague",
        "timeSn": "1405",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Riga",
        "timeId": "Europe/Riga",
        "timeSn": "1406",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Rome",
        "timeId": "Europe/Rome",
        "timeSn": "1407",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Samara",
        "timeId": "Europe/Samara",
        "timeSn": "1408",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "San Marino",
        "timeId": "Europe/San_Marino",
        "timeSn": "1409",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Sarajevo",
        "timeId": "Europe/Sarajevo",
        "timeSn": "1410",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Saratov",
        "timeId": "Europe/Saratov",
        "timeSn": "1411",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Simferopol",
        "timeId": "Europe/Simferopol",
        "timeSn": "1412",
        "timeZoneGMT": "MSK-3"
    },
    {
        "timeZoneName": "Skopje",
        "timeId": "Europe/Skopje",
        "timeSn": "1413",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Sofia",
        "timeId": "Europe/Sofia",
        "timeSn": "1414",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Stockholm",
        "timeId": "Europe/Stockholm",
        "timeSn": "1415",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Tallinn",
        "timeId": "Europe/Tallinn",
        "timeSn": "1416",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Tirane",
        "timeId": "Europe/Tirane",
        "timeSn": "1417",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Tiraspol",
        "timeId": "Europe/Tiraspol",
        "timeSn": "1418",
        "timeZoneGMT": "EET-2EEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Ulyanovsk",
        "timeId": "Europe/Ulyanovsk",
        "timeSn": "1419",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Uzhhorod",
        "timeId": "Europe/Uzhgorod",
        "timeSn": "1420",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Vaduz",
        "timeId": "Europe/Vaduz",
        "timeSn": "1421",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Vatican",
        "timeId": "Europe/Vatican",
        "timeSn": "1422",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Vienna",
        "timeId": "Europe/Vienna",
        "timeSn": "1423",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Vilnius",
        "timeId": "Europe/Vilnius",
        "timeSn": "1424",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Volgograd",
        "timeId": "Europe/Volgograd",
        "timeSn": "1425",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Warsaw",
        "timeId": "Europe/Warsaw",
        "timeSn": "1426",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Zagreb",
        "timeId": "Europe/Zagreb",
        "timeSn": "1427",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Zaporozhye",
        "timeId": "Europe/Zaporozhye",
        "timeSn": "1428",
        "timeZoneGMT": "EET-2EEST,M3.5.0/3,M10.5.0/4"
    },
    {
        "timeZoneName": "Zurich",
        "timeId": "Europe/Zurich",
        "timeSn": "1429",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Greenwich",
        "timeId": "Greenwich",
        "timeSn": "1430",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Iceland",
        "timeId": "Iceland",
        "timeSn": "1431",
        "timeZoneGMT": "GMT0"
    },
    {
        "timeZoneName": "Antananarivo",
        "timeId": "Indian/Antananarivo",
        "timeSn": "1432",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Chagos",
        "timeId": "Indian/Chagos",
        "timeSn": "1433",
        "timeZoneGMT": "\u003c+06\u003e-6"
    },
    {
        "timeZoneName": "Christmas",
        "timeId": "Indian/Christmas",
        "timeSn": "1434",
        "timeZoneGMT": "\u003c+07\u003e-7"
    },
    {
        "timeZoneName": "Cocos",
        "timeId": "Indian/Cocos",
        "timeSn": "1435",
        "timeZoneGMT": "\u003c+0630\u003e-6:30"
    },
    {
        "timeZoneName": "Comoro",
        "timeId": "Indian/Comoro",
        "timeSn": "1436",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Kerguelen",
        "timeId": "Indian/Kerguelen",
        "timeSn": "1437",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Mahe",
        "timeId": "Indian/Mahe",
        "timeSn": "1438",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Maldives",
        "timeId": "Indian/Maldives",
        "timeSn": "1439",
        "timeZoneGMT": "\u003c+05\u003e-5"
    },
    {
        "timeZoneName": "Mauritius",
        "timeId": "Indian/Mauritius",
        "timeSn": "1440",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Mayotte",
        "timeId": "Indian/Mayotte",
        "timeSn": "1441",
        "timeZoneGMT": "EAT-3"
    },
    {
        "timeZoneName": "Reunion",
        "timeId": "Indian/Reunion",
        "timeSn": "1442",
        "timeZoneGMT": "\u003c+04\u003e-4"
    },
    {
        "timeZoneName": "Iran",
        "timeId": "Iran",
        "timeSn": "1443",
        "timeZoneGMT": "\u003c+0330\u003e-3:30\u003c+0430\u003e,J80/0,J264/0"
    },
    {
        "timeZoneName": "Israel",
        "timeId": "Israel",
        "timeSn": "1444",
        "timeZoneGMT": "IST-2IDT,M3.5.0,M10.5.0"
    },
    {
        "timeZoneName": "Japan",
        "timeId": "Japan",
        "timeSn": "1445",
        "timeZoneGMT": "JST-9"
    },
    {
        "timeZoneName": "Libya",
        "timeId": "Libya",
        "timeSn": "1446",
        "timeZoneGMT": "EET-2"
    },
    {
        "timeZoneName": "BajaNorte",
        "timeId": "Mexico/BajaNorte",
        "timeSn": "1447",
        "timeZoneGMT": "PST8PDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "BajaSur",
        "timeId": "Mexico/BajaSur",
        "timeSn": "1448",
        "timeZoneGMT": "MST7MDT,M4.1.0,M10.5.0"
    },
    {
        "timeZoneName": "General",
        "timeId": "Mexico/General",
        "timeSn": "1449",
        "timeZoneGMT": "CST6CDT,M4.1.0,M10.5.0"
    },
    {
        "timeZoneName": "Navajo",
        "timeId": "Navajo",
        "timeSn": "1450",
        "timeZoneGMT": "MST7MDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Apia",
        "timeId": "Pacific/Apia",
        "timeSn": "1451",
        "timeZoneGMT": "\u003c+13\u003e-13\u003c+14\u003e,M9.5.0/3,M4.1.0/4"
    },
    {
        "timeZoneName": "Auckland",
        "timeId": "Pacific/Auckland",
        "timeSn": "1452",
        "timeZoneGMT": "NZST-12NZDT,M9.5.0,M4.1.0/3"
    },
    {
        "timeZoneName": "Bougainville",
        "timeId": "Pacific/Bougainville",
        "timeSn": "1453",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Chatham",
        "timeId": "Pacific/Chatham",
        "timeSn": "1454",
        "timeZoneGMT": "\u003c+1245\u003e-12:45\u003c+1345\u003e,M9.5.0/2:45,M4.1.0/3:45"
    },
    {
        "timeZoneName": "Chuuk",
        "timeId": "Pacific/Chuuk",
        "timeSn": "1455",
        "timeZoneGMT": "\u003c+10\u003e-10"
    },
    {
        "timeZoneName": "Easter",
        "timeId": "Pacific/Easter",
        "timeSn": "1456",
        "timeZoneGMT": "\u003c-06\u003e6\u003c-05\u003e,M9.1.6/22,M4.1.6/22"
    },
    {
        "timeZoneName": "Efate",
        "timeId": "Pacific/Efate",
        "timeSn": "1457",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Enderbury",
        "timeId": "Pacific/Enderbury",
        "timeSn": "1458",
        "timeZoneGMT": "\u003c+13\u003e-13"
    },
    {
        "timeZoneName": "Fakaofo",
        "timeId": "Pacific/Fakaofo",
        "timeSn": "1459",
        "timeZoneGMT": "\u003c+13\u003e-13"
    },
    {
        "timeZoneName": "Fiji",
        "timeId": "Pacific/Fiji",
        "timeSn": "1460",
        "timeZoneGMT": "\u003c+12\u003e-12\u003c+13\u003e,M11.1.0,M1.3.0/3"
    },
    {
        "timeZoneName": "Funafuti",
        "timeId": "Pacific/Funafuti",
        "timeSn": "1461",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Galapagos",
        "timeId": "Pacific/Galapagos",
        "timeSn": "1462",
        "timeZoneGMT": "\u003c-06\u003e6"
    },
    {
        "timeZoneName": "Gambier",
        "timeId": "Pacific/Gambier",
        "timeSn": "1463",
        "timeZoneGMT": "\u003c-09\u003e9"
    },
    {
        "timeZoneName": "Guadalcanal",
        "timeId": "Pacific/Guadalcanal",
        "timeSn": "1464",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Guam",
        "timeId": "Pacific/Guam",
        "timeSn": "1465",
        "timeZoneGMT": "ChST-10"
    },
    {
        "timeZoneName": "Honolulu",
        "timeId": "Pacific/Honolulu",
        "timeSn": "1466",
        "timeZoneGMT": "HST10"
    },
    {
        "timeZoneName": "Johnston",
        "timeId": "Pacific/Johnston",
        "timeSn": "1467",
        "timeZoneGMT": "HST10"
    },
    {
        "timeZoneName": "Kiritimati",
        "timeId": "Pacific/Kiritimati",
        "timeSn": "1468",
        "timeZoneGMT": "\u003c+14\u003e-14"
    },
    {
        "timeZoneName": "Kosrae",
        "timeId": "Pacific/Kosrae",
        "timeSn": "1469",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Kwajalein",
        "timeId": "Pacific/Kwajalein",
        "timeSn": "1470",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Majuro",
        "timeId": "Pacific/Majuro",
        "timeSn": "1471",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Marquesas",
        "timeId": "Pacific/Marquesas",
        "timeSn": "1472",
        "timeZoneGMT": "\u003c-0930\u003e9:30"
    },
    {
        "timeZoneName": "Midway",
        "timeId": "Pacific/Midway",
        "timeSn": "1473",
        "timeZoneGMT": "SST11"
    },
    {
        "timeZoneName": "Nauru",
        "timeId": "Pacific/Nauru",
        "timeSn": "1474",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Niue",
        "timeId": "Pacific/Niue",
        "timeSn": "1475",
        "timeZoneGMT": "\u003c-11\u003e11"
    },
    {
        "timeZoneName": "Norfolk",
        "timeId": "Pacific/Norfolk",
        "timeSn": "1476",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Noumea",
        "timeId": "Pacific/Noumea",
        "timeSn": "1477",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Pago Pago",
        "timeId": "Pacific/Pago_Pago",
        "timeSn": "1478",
        "timeZoneGMT": "SST11"
    },
    {
        "timeZoneName": "Palau",
        "timeId": "Pacific/Palau",
        "timeSn": "1479",
        "timeZoneGMT": "\u003c+09\u003e-9"
    },
    {
        "timeZoneName": "Pitcairn",
        "timeId": "Pacific/Pitcairn",
        "timeSn": "1480",
        "timeZoneGMT": "\u003c-08\u003e8"
    },
    {
        "timeZoneName": "Pohnpei",
        "timeId": "Pacific/Pohnpei",
        "timeSn": "1481",
        "timeZoneGMT": "\u003c+11\u003e-11"
    },
    {
        "timeZoneName": "Port Moresby",
        "timeId": "Pacific/Port_Moresby",
        "timeSn": "1482",
        "timeZoneGMT": "\u003c+10\u003e-10"
    },
    {
        "timeZoneName": "Rarotonga",
        "timeId": "Pacific/Rarotonga",
        "timeSn": "1483",
        "timeZoneGMT": "\u003c-10\u003e10"
    },
    {
        "timeZoneName": "Saipan",
        "timeId": "Pacific/Saipan",
        "timeSn": "1484",
        "timeZoneGMT": "ChST-10"
    },
    {
        "timeZoneName": "Samoa",
        "timeId": "Pacific/Samoa",
        "timeSn": "1485",
        "timeZoneGMT": "SST11"
    },
    {
        "timeZoneName": "Tahiti",
        "timeId": "Pacific/Tahiti",
        "timeSn": "1486",
        "timeZoneGMT": "\u003c-10\u003e10"
    },
    {
        "timeZoneName": "Tarawa",
        "timeId": "Pacific/Tarawa",
        "timeSn": "1487",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Tongatapu",
        "timeId": "Pacific/Tongatapu",
        "timeSn": "1488",
        "timeZoneGMT": "\u003c+13\u003e-13"
    },
    {
        "timeZoneName": "Wake",
        "timeId": "Pacific/Wake",
        "timeSn": "1489",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Wallis",
        "timeId": "Pacific/Wallis",
        "timeSn": "1490",
        "timeZoneGMT": "\u003c+12\u003e-12"
    },
    {
        "timeZoneName": "Yap",
        "timeId": "Pacific/Yap",
        "timeSn": "1491",
        "timeZoneGMT": "\u003c+10\u003e-10"
    },
    {
        "timeZoneName": "Poland",
        "timeId": "Poland",
        "timeSn": "1492",
        "timeZoneGMT": "CET-1CEST,M3.5.0,M10.5.0/3"
    },
    {
        "timeZoneName": "Portugal",
        "timeId": "Portugal",
        "timeSn": "1493",
        "timeZoneGMT": "WET0WEST,M3.5.0/1,M10.5.0"
    },
    {
        "timeZoneName": "Turkey",
        "timeId": "Turkey",
        "timeSn": "1494",
        "timeZoneGMT": "\u003c+03\u003e-3"
    },
    {
        "timeZoneName": "Alaska",
        "timeId": "US/Alaska",
        "timeSn": "1495",
        "timeZoneGMT": "AKST9AKDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Aleutian",
        "timeId": "US/Aleutian",
        "timeSn": "1496",
        "timeZoneGMT": "HST10HDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Arizona",
        "timeId": "US/Arizona",
        "timeSn": "1497",
        "timeZoneGMT": "MST7"
    },
    {
        "timeZoneName": "East-Indiana",
        "timeId": "US/East-Indiana",
        "timeSn": "1498",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Hawaii",
        "timeId": "US/Hawaii",
        "timeSn": "1499",
        "timeZoneGMT": "HST10"
    },
    {
        "timeZoneName": "Indiana-Starke",
        "timeId": "US/Indiana-Starke",
        "timeSn": "1500",
        "timeZoneGMT": "CST6CDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Michigan",
        "timeId": "US/Michigan",
        "timeSn": "1501",
        "timeZoneGMT": "EST5EDT,M3.2.0,M11.1.0"
    },
    {
        "timeZoneName": "Zulu",
        "timeId": "Zulu",
        "timeSn": "1502",
        "timeZoneGMT": "UTC0"
    }
];

export const getEufyTimezone = function(): EufyTimezone | undefined {
    for (const timezone of timeZoneData) {
        if (timezone.timeId === Intl.DateTimeFormat().resolvedOptions().timeZone) {
            return timezone
        }
    }
    return undefined;
};

export const getAdvancedLockTimezone = function(stationSN: string): string {
    const timezone = getEufyTimezone();
    if (timezone !== undefined) {
        if (stationSN.startsWith("T8520") && isGreaterEqualMinVersion("1.2.8.6", stationSN))
            return `${timezone.timeZoneGMT}|1.${timezone.timeSn}`
        else
            return timezone.timeZoneGMT;
    }
    return "";
};

export class SmartSafeByteWriter {

    private split_byte = -95;
    private data = Buffer.from([]);

    public write(bytes: Buffer): void {
        const tmp_data = Buffer.from(bytes);
        this.data = Buffer.concat([ this.data, Buffer.from([this.split_byte]), Buffer.from([tmp_data.length & 255]), tmp_data]);
        this.split_byte += 1;
    }

    public getData(): Buffer {
        return this.data;
    }

}

/*export const generateHash = function(data: Buffer): number {
    let result = 0;
    for (const value of data) {
        result = result ^ value;
    }
    return result;
}

export const encodeSmartSafeData = function(command: number, payload: Buffer): Buffer {
    const header = Buffer.from(SmartSafe.DATA_HEADER);
    const size = Buffer.allocUnsafe(2);
    size.writeInt16LE(payload.length + 9);
    const versionCode = Buffer.from([SmartSafe.VERSION_CODE]);
    const dataType = Buffer.from([-1]);
    const commandCode = Buffer.from([command]);
    const packageFlag = Buffer.from([-64]);
    const data = Buffer.concat([header, size, versionCode, dataType, commandCode, packageFlag, payload]);
    const hash = generateHash(data);
    return Buffer.concat([data, Buffer.from([hash])]);
}*/

export const encodePasscode = function(pass: string): string {
    let result = "";
    for (let i = 0; i < pass.length; i++)
        result += pass.charCodeAt(i).toString(16);
    return result;
}

export const hexDate = function(date: Date): string {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUint8(date.getDate());
    buf.writeUint8(date.getMonth() + 1, 1);
    buf.writeUint16BE(date.getFullYear(), 2);
    return buf.readUInt32LE().toString(16).padStart(8, "0");
}

export const hexTime = function(date: Date): string {
    const buf = Buffer.allocUnsafe(2);
    buf.writeUint8(date.getHours());
    buf.writeUint8(date.getMinutes(), 1);
    return buf.readUInt16BE().toString(16).padStart(4, "0");
}

export const hexWeek = function(schedule: Schedule): string {
    const SUNDAY    = 1;
    const MONDAY    = 2;
    const TUESDAY   = 4;
    const WEDNESDAY = 8;
    const THUERSDAY = 16;
    const FRIDAY    = 32;
    const SATURDAY  = 64;

    let result = 0;

    if (schedule.week !== undefined) {
        if (schedule.week.sunday) {
            result |= SUNDAY;
        }
        if (schedule.week.monday) {
            result |= MONDAY;
        }
        if (schedule.week.tuesday) {
            result |= TUESDAY;
        }
        if (schedule.week.wednesday) {
            result |= WEDNESDAY;
        }
        if (schedule.week.thursday) {
            result |= THUERSDAY;
        }
        if (schedule.week.friday) {
            result |= FRIDAY;
        }
        if (schedule.week.saturday) {
            result |= SATURDAY;
        }
        return result.toString(16);
    }
    return "ff";
}
