export interface DeviceSmartLockNotifyData {
    stationSn: string;
    deviceSn: string;
    eventType: number;
    eventTime: number;
    shortUserId: string;
    unknown1: string;
    nickName: string;
    userId: string;
    unknown2: string;
    deviceName: string;
    unknown3: string;
    lockState: string;
}
export interface DeviceSmartLockNotify {
    timestamp: number;
    uuid: string;
    data: DeviceSmartLockNotifyData;
}
export interface DeviceSmartLockMessage {
    eventType: number;
    userId: string;
    data: DeviceSmartLockNotify;
}
