import { DeviceSmartLockMessage } from "./model";
export interface MQTTServiceEvents {
    "connect": () => void;
    "close": () => void;
    "lock message": (message: DeviceSmartLockMessage) => void;
}
