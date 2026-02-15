import { DeviceSmartLockMessage } from "./model";

export interface MQTTServiceEvents {
  connect: () => void;
  close: () => void;
  "lock message": (message: DeviceSmartLockMessage) => void;
}

export interface SecurityMQTTServiceEvents {
  connect: () => void;
  close: () => void;
  "lock-status": (deviceSN: string, locked: boolean, battery: number) => void;
  "command-response": (deviceSN: string, success: boolean) => void;
}
