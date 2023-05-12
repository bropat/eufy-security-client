import { TypedEmitter } from "tiny-typed-emitter";
import { dummyLogger, Logger } from "ts-log";
import * as fse from "fs-extra";
import * as path from "path";
import { Readable } from "stream";
import EventEmitter from "events";
import imageType from "image-type";

import { EufySecurityEvents, EufySecurityConfig, EufySecurityPersistentData } from "./interfaces";
import { HTTPApi } from "./http/api";
import { Devices, FullDevices, Hubs, PropertyValue, RawValues, Stations, Houses, LoginOptions, Schedule, Picture } from "./http/interfaces";
import { Station } from "./http/station";
import { ConfirmInvite, DeviceListResponse, HouseInviteListResponse, Invite, StationListResponse } from "./http/models";
import { CommandName, DeviceType, HB3DetectionTypes, NotificationSwitchMode, NotificationType, PropertyName } from "./http/types";
import { PushNotificationService } from "./push/service";
import { Credentials, PushMessage } from "./push/models";
import { BatteryDoorbellCamera, Camera, Device, EntrySensor, FloodlightCamera, IndoorCamera, Keypad, Lock, MotionSensor, SmartSafe, SoloCamera, UnknownDevice, WiredDoorbellCamera } from "./http/device";
import { AlarmEvent, ChargingType, CommandType, DatabaseReturnCode, P2PConnectionType, SmartSafeAlarm911Event, SmartSafeShakeAlarmEvent, TFCardStatus } from "./p2p/types";
import { DatabaseCountByDate, DatabaseQueryLatestInfo, DatabaseQueryLocal, StreamMetadata, DatabaseQueryLatestInfoLocal, DatabaseQueryLatestInfoCloud } from "./p2p/interfaces";
import { CommandResult } from "./p2p/models";
import { generateSerialnumber, generateUDID, handleUpdate, md5, parseValue, removeLastChar, waitForEvent } from "./utils";
import { DeviceNotFoundError, StationNotFoundError, ReadOnlyPropertyError, NotSupportedError, AddUserError, DeleteUserError, UpdateUserUsernameError, UpdateUserPasscodeError, UpdateUserScheduleError } from "./error";
import { libVersion } from ".";
import { InvalidPropertyError } from "./http/error";
import { ServerPushEvent } from "./push/types";
import { MQTTService } from "./mqtt/service";
import { TalkbackStream } from "./p2p/talkback";
import { PhoneModels } from "./http/const";
import { randomNumber } from "./http/utils";

export class EufySecurity extends TypedEmitter<EufySecurityEvents> {

    private config: EufySecurityConfig;

    private log: Logger;

    private api!: HTTPApi;

    private houses: Houses = {};
    private stations: Stations = {};
    private devices: Devices = {};

    private readonly P2P_REFRESH_INTERVAL_MIN = 720;

    private cameraMaxLivestreamSeconds = 30;
    private cameraStationLivestreamTimeout: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();
    private cameraCloudLivestreamTimeout: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

    private pushService!: PushNotificationService;
    private mqttService!: MQTTService;
    private pushCloudRegistered = false;
    private pushCloudChecked = false;
    private persistentFile!: string;
    private persistentData: EufySecurityPersistentData = {
        country: "",
        openudid: "",
        serial_number: "",
        push_credentials: undefined,
        push_persistentIds: [],
        login_hash: "",
        version: "",
        httpApi: undefined
    };
    private connected = false;
    private retries = 0;

    private refreshEufySecurityCloudTimeout?: NodeJS.Timeout;
    private refreshEufySecurityP2PTimeout: {
        [dataType: string]: NodeJS.Timeout;
    } = {};
    private deviceSnoozeTimeout: {
        [dataType: string]: NodeJS.Timeout;
    } = {};

    private stationsLoaded = false;
    private devicesLoaded = false;
    private loadingEmitter = new EventEmitter();

    private constructor(config: EufySecurityConfig, log: Logger = dummyLogger) {
        super();

        this.config = config;
        this.log = log;
    }

    static async initialize(config: EufySecurityConfig, log: Logger = dummyLogger): Promise<EufySecurity> {
        const eufySecurity = new EufySecurity(config, log);
        await eufySecurity._initializeInternals();
        return eufySecurity;
    }

    protected async _initializeInternals(): Promise<void> {
        if (this.config.country === undefined) {
            this.config.country = "US";
        } else {
            this.config.country = this.config.country.toUpperCase();
        }
        if (this.config.language === undefined) {
            this.config.language = "en";
        }
        if (this.config.eventDurationSeconds === undefined) {
            this.config.eventDurationSeconds = 10;
        }
        if (this.config.p2pConnectionSetup === undefined) {
            this.config.p2pConnectionSetup = P2PConnectionType.QUICKEST;
        } else if (!Object.values(P2PConnectionType).includes(this.config.p2pConnectionSetup)) {
            this.config.p2pConnectionSetup = P2PConnectionType.QUICKEST;
        }
        if (this.config.pollingIntervalMinutes === undefined) {
            this.config.pollingIntervalMinutes = 10;
        }
        if (this.config.acceptInvitations === undefined) {
            this.config.acceptInvitations = false;
        }
        if (this.config.persistentDir === undefined) {
            this.config.persistentDir = path.resolve(__dirname, "../../..");
        } else if (!fse.existsSync(this.config.persistentDir)) {
            this.config.persistentDir = path.resolve(__dirname, "../../..");
        }
        this.persistentFile = path.join(this.config.persistentDir, "persistent.json");

        try {
            if (fse.statSync(this.persistentFile).isFile()) {
                const fileContent = fse.readFileSync(this.persistentFile, "utf8");
                this.persistentData = JSON.parse(fileContent) as EufySecurityPersistentData;
            }
        } catch (err) {
            this.log.debug("No stored data from last exit found");
        }

        try {
            if (this.persistentData.version !== libVersion) {
                const currentVersion = Number.parseFloat(removeLastChar(libVersion, "."));
                const previousVersion = this.persistentData.version !== "" && this.persistentData.version !== undefined ? Number.parseFloat(removeLastChar(this.persistentData.version, ".")) : 0;
                this.log.debug("Handling of driver update", { currentVersion: currentVersion, previousVersion: previousVersion });

                if (previousVersion < currentVersion) {
                    this.persistentData = handleUpdate(this.persistentData, this.log, previousVersion);
                    this.persistentData.version = libVersion;
                    this.writePersistentData();
                }
            }
        } catch(error) {
            this.log.error("Handling update - Error:", error);
        }

        if (this.config.trustedDeviceName === undefined || this.config.trustedDeviceName === "") {
            if (this.persistentData.fallbackTrustedDeviceName !== undefined) {
                this.config.trustedDeviceName = this.persistentData.fallbackTrustedDeviceName;
            } else {
                const rnd = randomNumber(0, PhoneModels.length);
                this.persistentData.fallbackTrustedDeviceName = PhoneModels[rnd];
                this.config.trustedDeviceName = this.persistentData.fallbackTrustedDeviceName;
            }
        }

        this.api = await HTTPApi.initialize(this.config.country, this.config.username, this.config.password, this.log, this.persistentData.httpApi);
        this.api.setLanguage(this.config.language);
        this.api.setPhoneModel(this.config.trustedDeviceName);

        this.api.on("houses", (houses: Houses) => this.handleHouses(houses));
        this.api.on("hubs", (hubs: Hubs) => this.handleHubs(hubs));
        this.api.on("devices", (devices: FullDevices) => this.handleDevices(devices));
        this.api.on("close", () => this.onAPIClose());
        this.api.on("connect", () => this.onAPIConnect());
        this.api.on("captcha request", (id: string, captcha: string) => this.onCaptchaRequest(id, captcha));
        this.api.on("auth token invalidated", () => this.onAuthTokenInvalidated());
        this.api.on("tfa request", () => this.onTfaRequest());
        this.api.on("connection error", (error: Error) => this.onAPIConnectionError(error));

        if (this.persistentData.login_hash && this.persistentData.login_hash != "") {
            this.log.debug("Load previous login_hash:", this.persistentData.login_hash);
            if (md5(`${this.config.username}:${this.config.password}`) != this.persistentData.login_hash) {
                this.log.info("Authentication properties changed, invalidate saved cloud token.");
                this.persistentData.cloud_token = "";
                this.persistentData.cloud_token_expiration = 0;
                this.persistentData.httpApi = undefined;
            }
        } else {
            this.persistentData.cloud_token = "";
            this.persistentData.cloud_token_expiration = 0;
        }
        if (this.persistentData.country !== undefined && this.persistentData.country !== "" && this.persistentData.country !== this.config.country) {
            this.log.info("Country property changed, invalidate saved cloud token.");
            this.persistentData.cloud_token = "";
            this.persistentData.cloud_token_expiration = 0;
            this.persistentData.httpApi = undefined;
        }
        if (this.persistentData.cloud_token && this.persistentData.cloud_token != "" && this.persistentData.cloud_token_expiration) {
            this.log.debug("Load previous token:", { token: this.persistentData.cloud_token, tokenExpiration: this.persistentData.cloud_token_expiration });
            this.api.setToken(this.persistentData.cloud_token);
            this.api.setTokenExpiration(new Date(this.persistentData.cloud_token_expiration));
        }
        if (this.persistentData.httpApi !== undefined && (this.persistentData.httpApi.clientPrivateKey === undefined || this.persistentData.httpApi.clientPrivateKey === "" || this.persistentData.httpApi.serverPublicKey === undefined || this.persistentData.httpApi.serverPublicKey === "")) {
            this.log.debug("Incomplete persistent data for v2 encrypted cloud api communication. Invalidate authenticated session data.");
            this.persistentData.cloud_token = "";
            this.persistentData.cloud_token_expiration = 0;
            this.persistentData.httpApi = undefined;
        }
        if (!this.persistentData.openudid || this.persistentData.openudid == "") {
            this.persistentData.openudid = generateUDID();
            this.log.debug("Generated new openudid:", this.persistentData.openudid);
        }
        this.api.setOpenUDID(this.persistentData.openudid);
        if (!this.persistentData.serial_number || this.persistentData.serial_number == "") {
            this.persistentData.serial_number = generateSerialnumber(12);
            this.log.debug("Generated new serial_number:", this.persistentData.serial_number);
        }
        this.api.setSerialNumber(this.persistentData.serial_number);

        this.pushService = new PushNotificationService(this.log);
        this.pushService.on("connect", async (token: string) => {
            this.pushCloudRegistered = await this.api.registerPushToken(token);
            this.pushCloudChecked = await this.api.checkPushToken();
            //TODO: Retry if failed with max retry to not lock account

            if (this.pushCloudRegistered && this.pushCloudChecked) {
                this.log.info("Push notification connection successfully established");
                this.emit("push connect");
            } else {
                this.log.info("Push notification connection closed");
                this.emit("push close");
            }
        });
        this.pushService.on("credential", (credentials: Credentials) => {
            this.savePushCredentials(credentials);
        });
        this.pushService.on("message", (message: PushMessage) => this.onPushMessage(message));
        this.pushService.on("close", () => {
            this.log.info("Push notification connection closed");
            this.emit("push close");
        });

        await this.initMQTT();
    }

    private async initMQTT(): Promise<void> {
        this.mqttService = await MQTTService.init(this.log);
        this.mqttService.on("connect", () => {
            this.log.info("MQTT connection successfully established");
            this.emit("mqtt connect");
        });
        this.mqttService.on("close", () => {
            this.log.info("MQTT connection closed");
            this.emit("mqtt close");
        });
        this.mqttService.on("lock message", (message) => {
            this.getDevice(message.data.data.deviceSn).then((device: Device) => {
                (device as Lock).processMQTTNotification(message.data.data, this.config.eventDurationSeconds);
            }).catch((error) => {
                if (error instanceof DeviceNotFoundError) {
                } else {
                    this.log.error("Lock MQTT Message Error", error);
                }
            }).finally(() => {
                this.emit("mqtt lock message", message);
            });
        });
    }

    public getPushService(): PushNotificationService {
        return this.pushService;
    }

    private addStation(station: Station): void {
        const serial = station.getSerial();
        if (serial && !Object.keys(this.stations).includes(serial)) {
            this.stations[serial] = station;
            this.getStorageInfo(serial);
            this.emit("station added", station);
        } else {
            this.log.debug(`Station with this serial ${station.getSerial()} exists already and couldn't be added again!`);
        }
    }

    private removeStation(station: Station): void {
        const serial = station.getSerial();
        if (serial && Object.keys(this.stations).includes(serial)) {
            delete this.stations[serial];
            station.removeAllListeners();
            if (station.isConnected())
                station.close();
            this.emit("station removed", station);
        } else {
            this.log.debug(`Station with this serial ${station.getSerial()} doesn't exists and couldn't be removed!`);
        }
    }

    private async updateStation(hub: StationListResponse): Promise<void> {
        if (!this.stationsLoaded)
            await waitForEvent(this.loadingEmitter, "stations loaded");
        if (Object.keys(this.stations).includes(hub.station_sn)) {
            this.stations[hub.station_sn].update(hub, this.stations[hub.station_sn] !== undefined && !this.stations[hub.station_sn].isIntegratedDevice() && this.stations[hub.station_sn].isConnected());
            if (!this.stations[hub.station_sn].isConnected() && !this.stations[hub.station_sn].isEnergySavingDevice()) {
                this.stations[hub.station_sn].setConnectionType(this.config.p2pConnectionSetup);
                this.stations[hub.station_sn].connect();
            }
            this.getStorageInfo(hub.station_sn);
        } else {
            this.log.debug(`Station with this serial ${hub.station_sn} doesn't exists and couldn't be updated!`);
        }
    }

    private async getStorageInfo(stationSerial : string) : Promise<void> {
        try {
            const station = await this.getStation(stationSerial);
            if (station.isStation() || (station.hasProperty(PropertyName.StationSdStatus) && station.getPropertyValue(PropertyName.StationSdStatus) !== undefined && station.getPropertyValue(PropertyName.StationSdStatus) !== TFCardStatus.REMOVE)) {
                await station.getStorageInfoEx();
            }
        } catch (error) {
            this.log.error("getStorageInfo Error", error);
        }
    }

    private addDevice(device: Device): void {
        const serial = device.getSerial()
        if (serial && !Object.keys(this.devices).includes(serial)) {
            this.devices[serial] = device;
            this.emit("device added", device);

            if (device.isLock())
                this.mqttService.subscribeLock(device.getSerial());
        } else {
            this.log.debug(`Device with this serial ${device.getSerial()} exists already and couldn't be added again!`);
        }
    }

    private removeDevice(device: Device): void {
        const serial = device.getSerial()
        if (serial && Object.keys(this.devices).includes(serial)) {
            delete this.devices[serial];
            device.removeAllListeners();
            this.emit("device removed", device);
        } else {
            this.log.debug(`Device with this serial ${device.getSerial()} doesn't exists and couldn't be removed!`);
        }
    }

    private async updateDevice(device: DeviceListResponse): Promise<void> {
        if (!this.devicesLoaded)
            await waitForEvent(this.loadingEmitter, "devices loaded");
        if (Object.keys(this.devices).includes(device.device_sn))
            this.devices[device.device_sn].update(device, this.stations[device.station_sn] !== undefined && !this.stations[device.station_sn].isIntegratedDevice() && this.stations[device.station_sn].isConnected())
        else
            this.log.debug(`Device with this serial ${device.device_sn} doesn't exists and couldn't be updated!`);
    }

    public async getDevices(): Promise<Array<Device>> {
        if (!this.devicesLoaded)
            await waitForEvent(this.loadingEmitter, "devices loaded");
        const arr: Array<Device> = [];
        Object.keys(this.devices).forEach((serialNumber: string) => {
            arr.push(this.devices[serialNumber]);
        });
        return arr;
    }

    public async getDevicesFromStation(stationSN: string): Promise<Array<Device>> {
        if (!this.devicesLoaded)
            await waitForEvent(this.loadingEmitter, "devices loaded");
        const arr: Array<Device> = [];
        Object.keys(this.devices).forEach((serialNumber: string) => {
            if (this.devices[serialNumber].getStationSerial() === stationSN)
                arr.push(this.devices[serialNumber]);
        });
        return arr;
    }

    public async getDevice(deviceSN: string): Promise<Device> {
        if (!this.devicesLoaded)
            await waitForEvent(this.loadingEmitter, "devices loaded");
        if (Object.keys(this.devices).includes(deviceSN))
            return this.devices[deviceSN];
        throw new DeviceNotFoundError(`Device with this serial ${deviceSN} doesn't exists!`);
    }

    public async getStationDevice(stationSN: string, channel: number): Promise<Device> {
        if (!this.devicesLoaded)
            await waitForEvent(this.loadingEmitter, "devices loaded");
        for (const device of Object.values(this.devices)) {
            if ((device.getStationSerial() === stationSN && device.getChannel() === channel) || (device.getStationSerial() === stationSN && device.getSerial() === stationSN)) {
                return device;
            }
        }
        throw new DeviceNotFoundError(`No device with channel ${channel} found on station with serial number: ${stationSN}!`);
    }

    public async getStations(): Promise<Array<Station>> {
        if (!this.stationsLoaded)
            await waitForEvent(this.loadingEmitter, "stations loaded");
        const arr: Array<Station> = [];
        Object.keys(this.stations).forEach((serialNumber: string) => {
            arr.push(this.stations[serialNumber]);
        });
        return arr;
    }

    public async getStation(stationSN: string): Promise<Station> {
        if (!this.stationsLoaded)
            await waitForEvent(this.loadingEmitter, "stations loaded");
        if (Object.keys(this.stations).includes(stationSN))
            return this.stations[stationSN];
        throw new StationNotFoundError(`No station with serial number: ${stationSN}!`);
    }

    public getApi(): HTTPApi {
        return this.api;
    }

    public async connectToStation(stationSN: string, p2pConnectionType: P2PConnectionType = P2PConnectionType.QUICKEST): Promise<void> {
        const station = await this.getStation(stationSN);
        station.setConnectionType(p2pConnectionType);
        station.connect();
    }

    public async isStationConnected(stationSN: string): Promise<boolean> {
        const station = await this.getStation(stationSN);
        return station.isConnected();
    }

    public async isStationEnergySavingDevice(stationSN: string): Promise<boolean> {
        const station = await this.getStation(stationSN);
        return station.isEnergySavingDevice();
    }

    private handleHouses(houses: Houses): void {
        this.log.debug("Got houses:", houses);
        //TODO: Finish implementation
        this.houses = houses;
    }

    private handleHubs(hubs: Hubs): void {
        this.log.debug("Got hubs:", hubs);
        const stationsSNs: string[] = Object.keys(this.stations);
        const newStationsSNs = Object.keys(hubs);
        const promises: Array<Promise<Station>> = [];
        for (const hub of Object.values(hubs)) {
            if (stationsSNs.includes(hub.station_sn)) {
                this.updateStation(hub);
            } else {
                this.stationsLoaded = false;
                let ipAddress: string | undefined;
                if (this.config.stationIPAddresses !== undefined) {
                    ipAddress = this.config.stationIPAddresses[hub.station_sn];
                }
                const station = Station.getInstance(this.api, hub, ipAddress);
                promises.push(station.then((station: Station) => {
                    try {
                        station.on("connect", (station: Station) => this.onStationConnect(station));
                        station.on("connection error", (station: Station, error: Error) => this.onStationConnectionError(station, error));
                        station.on("close", (station: Station) => this.onStationClose(station));
                        station.on("raw device property changed", (deviceSN: string, params: RawValues) => this.updateDeviceProperties(deviceSN, params));
                        station.on("livestream start", (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => this.onStartStationLivestream(station, channel, metadata, videostream, audiostream));
                        station.on("livestream stop", (station: Station, channel:number) => this.onStopStationLivestream(station, channel));
                        station.on("livestream error", (station: Station, channel:number, error: Error) => this.onErrorStationLivestream(station, channel, error));
                        station.on("download start", (station: Station, channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => this.onStationStartDownload(station, channel, metadata, videoStream, audioStream));
                        station.on("download finish", (station: Station, channel: number) => this.onStationFinishDownload(station, channel));
                        station.on("command result", (station: Station, result: CommandResult) => this.onStationCommandResult(station, result));
                        station.on("guard mode", (station: Station, guardMode: number) => this.onStationGuardMode(station, guardMode));
                        station.on("current mode", (station: Station, currentMode: number) => this.onStationCurrentMode(station, currentMode));
                        station.on("rtsp livestream start", (station: Station, channel:number) => this.onStartStationRTSPLivestream(station, channel));
                        station.on("rtsp livestream stop", (station: Station, channel:number) => this.onStopStationRTSPLivestream(station, channel));
                        station.on("rtsp url", (station: Station, channel:number, value: string) => this.onStationRtspUrl(station, channel, value));
                        station.on("property changed", (station: Station, name: string, value: PropertyValue, ready: boolean) => this.onStationPropertyChanged(station, name, value, ready));
                        station.on("raw property changed", (station: Station, type: number, value: string) => this.onStationRawPropertyChanged(station, type, value));
                        station.on("alarm event", (station: Station, alarmEvent: AlarmEvent) => this.onStationAlarmEvent(station, alarmEvent));
                        station.on("runtime state", (station: Station, channel: number, batteryLevel: number, temperature: number) => this.onStationRuntimeState(station, channel, batteryLevel, temperature,));
                        station.on("charging state", (station: Station, channel: number, chargeType: ChargingType, batteryLevel: number) => this.onStationChargingState(station, channel, chargeType, batteryLevel));
                        station.on("wifi rssi", (station: Station, channel: number, rssi: number) => this.onStationWifiRssi(station, channel, rssi));
                        station.on("floodlight manual switch", (station: Station, channel: number, enabled: boolean) => this.onFloodlightManualSwitch(station, channel, enabled));
                        station.on("alarm delay event", (station: Station, alarmDelayEvent: AlarmEvent, alarmDelay: number) => this.onStationAlarmDelayEvent(station, alarmDelayEvent, alarmDelay));
                        station.on("talkback started", (station: Station, channel: number, talkbackStream: TalkbackStream) => this.onStationTalkbackStart(station, channel, talkbackStream));
                        station.on("talkback stopped", (station: Station, channel: number) => this.onStationTalkbackStop(station, channel));
                        station.on("talkback error", (station: Station, channel: number, error: Error) => this.onStationTalkbackError(station, channel, error));
                        station.on("alarm armed event", (station: Station) => this.onStationAlarmArmedEvent(station));
                        station.on("alarm arm delay event", (station: Station, armDelay: number) => this.onStationArmDelayEvent(station, armDelay));
                        station.on("secondary command result", (station: Station, result: CommandResult) => this.onStationSecondaryCommandResult(station, result));
                        station.on("device shake alarm", (deviceSN: string, event: SmartSafeShakeAlarmEvent) => this.onStationDeviceShakeAlarm(deviceSN, event));
                        station.on("device 911 alarm", (deviceSN: string, event: SmartSafeAlarm911Event) => this.onStationDevice911Alarm(deviceSN, event));
                        station.on("device jammed", (deviceSN: string) => this.onStationDeviceJammed(deviceSN));
                        station.on("device low battery", (deviceSN: string) => this.onStationDeviceLowBattery(deviceSN));
                        station.on("device wrong try-protect alarm", (deviceSN: string) => this.onStationDeviceWrongTryProtectAlarm(deviceSN));
                        station.on("device pin verified", (deviceSN: string, successfull: boolean) => this.onStationDevicePinVerified(deviceSN, successfull));
                        station.on("sd info ex", (station: Station, sdStatus: TFCardStatus, sdCapacity: number, sdCapacityAvailable: number) => this.onStationSdInfoEx(station, sdStatus, sdCapacity, sdCapacityAvailable));
                        station.on("image download", (station: Station, file: string, image: Buffer) => this.onStationImageDownload(station, file, image));
                        station.on("database query latest", (station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLatestInfo>) => this.onStationDatabaseQueryLatest(station, returnCode, data));
                        station.on("database query local", (station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLocal>) => this.onStationDatabaseQueryLocal(station, returnCode, data));
                        station.on("database count by date", (station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseCountByDate>) => this.onStationDatabaseCountByDate(station, returnCode, data));
                        station.on("database delete", (station: Station, returnCode: DatabaseReturnCode, failedIds: Array<unknown>) => this.onStationDatabaseDelete(station, returnCode, failedIds));
                        this.addStation(station);
                        station.initialize();
                    } catch (error) {
                        this.log.error("Error", error);
                    }
                    return station;
                }));
            }
        }
        Promise.all(promises).then(() => {
            this.stationsLoaded = true;
            this.loadingEmitter.emit("stations loaded");
        });
        for (const stationSN of stationsSNs) {
            if (!newStationsSNs.includes(stationSN)) {
                this.getStation(stationSN).then((station: Station) => {
                    this.removeStation(station);
                }).catch((error) => {
                    this.log.error("Error removing station", error);
                });
            }
        }
    }

    private onStationConnect(station: Station): void {
        this.emit("station connect", station);
        if ((Device.isCamera(station.getDeviceType()) && !Device.isWiredDoorbell(station.getDeviceType()) || Device.isSmartSafe(station.getDeviceType()))) {
            station.getCameraInfo().catch(error => {
                this.log.error(`Error during station ${station.getSerial()} p2p data refreshing`, error);
            });
            if (this.refreshEufySecurityP2PTimeout[station.getSerial()] !== undefined) {
                clearTimeout(this.refreshEufySecurityP2PTimeout[station.getSerial()]);
                delete this.refreshEufySecurityP2PTimeout[station.getSerial()];
            }
            if (!station.isEnergySavingDevice()) {
                this.refreshEufySecurityP2PTimeout[station.getSerial()] = setTimeout(() => {
                    station.getCameraInfo().catch(error => {
                        this.log.error(`Error during station ${station.getSerial()} p2p data refreshing`, error);
                    });
                }, this.P2P_REFRESH_INTERVAL_MIN * 60 * 1000);
            }
        }
    }

    private onStationConnectionError(station: Station, error: Error): void {
        this.emit("station connection error", station, error);
    }

    private onStationClose(station: Station): void {
        this.emit("station close", station);
        for (const device_sn of this.cameraStationLivestreamTimeout.keys()) {
            this.getDevice(device_sn).then((device: Device) => {
                if (device !== null && device.getStationSerial() === station.getSerial()) {
                    clearTimeout(this.cameraStationLivestreamTimeout.get(device_sn)!);
                    this.cameraStationLivestreamTimeout.delete(device_sn);
                }
            }).catch((error) => {
                this.log.error(`Station ${station.getSerial()} - Error:`, error);
            });
        }
    }

    private handleDevices(devices: FullDevices): void {
        this.log.debug("Got devices:", devices);
        const deviceSNs: string[] = Object.keys(this.devices);
        const newDeviceSNs = Object.keys(devices);
        const promises: Array<Promise<Device>> = [];
        for (const device of Object.values(devices)) {

            if (deviceSNs.includes(device.device_sn)) {
                this.updateDevice(device);
            } else {
                this.devicesLoaded = false;
                let new_device: Promise<Device>;

                if (Device.isIndoorCamera(device.device_type)) {
                    new_device = IndoorCamera.getInstance(this.api, device);
                } else if (Device.isSoloCameras(device.device_type)) {
                    new_device = SoloCamera.getInstance(this.api, device);
                } else if (Device.isBatteryDoorbell(device.device_type)) {
                    new_device = BatteryDoorbellCamera.getInstance(this.api, device);
                } else if (Device.isWiredDoorbell(device.device_type) || Device.isWiredDoorbellDual(device.device_type)) {
                    new_device = WiredDoorbellCamera.getInstance(this.api, device);
                } else if (Device.isFloodLight(device.device_type)) {
                    new_device = FloodlightCamera.getInstance(this.api, device);
                } else if (Device.isCamera(device.device_type)) {
                    new_device = Camera.getInstance(this.api, device);
                } else if (Device.isLock(device.device_type)) {
                    new_device = Lock.getInstance(this.api, device);
                } else if (Device.isMotionSensor(device.device_type)) {
                    new_device = MotionSensor.getInstance(this.api, device);
                } else if (Device.isEntrySensor(device.device_type)) {
                    new_device = EntrySensor.getInstance(this.api, device);
                } else if (Device.isKeyPad(device.device_type)) {
                    new_device = Keypad.getInstance(this.api, device);
                } else if (Device.isSmartSafe(device.device_type)) {
                    new_device = SmartSafe.getInstance(this.api, device);
                } else {
                    new_device = UnknownDevice.getInstance(this.api, device);
                }

                promises.push(new_device.then((device: Device) => {
                    try {
                        device.on("property changed", (device: Device, name: string, value: PropertyValue, ready: boolean) => this.onDevicePropertyChanged(device, name, value, ready));
                        device.on("raw property changed", (device: Device, type: number, value: string) => this.onDeviceRawPropertyChanged(device, type, value));
                        device.on("crying detected", (device: Device, state: boolean) => this.onDeviceCryingDetected(device, state));
                        device.on("sound detected", (device: Device, state: boolean) => this.onDeviceSoundDetected(device, state));
                        device.on("pet detected", (device: Device, state: boolean) => this.onDevicePetDetected(device, state));
                        device.on("vehicle detected", (device: Device, state: boolean) => this.onDeviceVehicleDetected(device, state));
                        device.on("motion detected", (device: Device, state: boolean) => this.onDeviceMotionDetected(device, state));
                        device.on("person detected", (device: Device, state: boolean, person: string) => this.onDevicePersonDetected(device, state, person));
                        device.on("rings", (device: Device, state: boolean) => this.onDeviceRings(device, state));
                        device.on("locked", (device: Device, state: boolean) => this.onDeviceLocked(device, state));
                        device.on("open", (device: Device, state: boolean) => this.onDeviceOpen(device, state));
                        device.on("ready", (device: Device) => this.onDeviceReady(device));
                        device.on("package delivered", (device: Device, state: boolean) => this.onDevicePackageDelivered(device, state));
                        device.on("package stranded", (device: Device, state: boolean) => this.onDevicePackageStranded(device, state));
                        device.on("package taken", (device: Device, state: boolean) => this.onDevicePackageTaken(device, state));
                        device.on("someone loitering", (device: Device, state: boolean) => this.onDeviceSomeoneLoitering(device, state));
                        device.on("radar motion detected", (device: Device, state: boolean) => this.onDeviceRadarMotionDetected(device, state));
                        device.on("911 alarm", (device: Device, state: boolean, detail: SmartSafeAlarm911Event) => this.onDevice911Alarm(device, state, detail));
                        device.on("shake alarm", (device: Device, state: boolean, detail: SmartSafeShakeAlarmEvent) => this.onDeviceShakeAlarm(device, state, detail));
                        device.on("wrong try-protect alarm", (device: Device, state: boolean) => this.onDeviceWrongTryProtectAlarm(device, state));
                        device.on("long time not close", (device: Device, state: boolean) => this.onDeviceLongTimeNotClose(device, state));
                        device.on("low battery", (device: Device, state: boolean) => this.onDeviceLowBattery(device, state));
                        device.on("jammed", (device: Device, state: boolean) => this.onDeviceJammed(device, state));
                        device.on("stranger person detected", (device: Device, state: boolean) => this.onDeviceStrangerPersonDetected(device, state));
                        device.on("dog detected", (device: Device, state: boolean) => this.onDeviceDogDetected(device, state));
                        device.on("dog lick detected", (device: Device, state: boolean) => this.onDeviceDogLickDetected(device, state));
                        device.on("dog poop detected", (device: Device, state: boolean) => this.onDeviceDogPoopDetected(device, state));
                        this.addDevice(device);
                        device.initialize();
                    } catch (error) {
                        this.log.error("Error", error);
                    }
                    return device;
                }));
            }
        }
        Promise.all(promises).then((devices) => {
            devices.forEach((device) => {
                this.getStation(device.getStationSerial()).then((station: Station) => {
                    if (!station.isConnected()) {
                        station.setConnectionType(this.config.p2pConnectionSetup);
                        station.connect();
                    }
                }).catch((error) => {
                    this.log.error("Error trying to connect to station afte device loaded", error);
                });
            });
            this.devicesLoaded = true;
            this.loadingEmitter.emit("devices loaded");
        });
        for (const deviceSN of deviceSNs) {
            if (!newDeviceSNs.includes(deviceSN)) {
                this.getDevice(deviceSN).then((device: Device) => {
                    this.removeDevice(device);
                }).catch((error) => {
                    this.log.error("Error removing device", error);
                });
            }
        }
    }

    public async refreshCloudData(): Promise<void> {
        if (this.config.acceptInvitations) {
            await this.processInvitations().catch(error => {
                this.log.error("Error in processing invitations", error);
            });
        }
        await this.api.refreshAllData().catch(error => {
            this.log.error("Error during API data refreshing", error);
        });
        if (this.refreshEufySecurityCloudTimeout !== undefined)
            clearTimeout(this.refreshEufySecurityCloudTimeout);
        this.refreshEufySecurityCloudTimeout = setTimeout(() => { this.refreshCloudData() }, this.config.pollingIntervalMinutes * 60 * 1000);
    }

    public close(): void {
        for (const device_sn of this.cameraStationLivestreamTimeout.keys()) {
            this.stopStationLivestream(device_sn);
        }
        for (const device_sn of this.cameraCloudLivestreamTimeout.keys()) {
            this.stopCloudLivestream(device_sn);
        }

        if (this.refreshEufySecurityCloudTimeout !== undefined)
            clearTimeout(this.refreshEufySecurityCloudTimeout);

        Object.keys(this.refreshEufySecurityP2PTimeout).forEach(station_sn => {
            clearTimeout(this.refreshEufySecurityP2PTimeout[station_sn]);
            delete this.refreshEufySecurityP2PTimeout[station_sn];
        });

        Object.keys(this.deviceSnoozeTimeout).forEach(device_sn => {
            clearTimeout(this.deviceSnoozeTimeout[device_sn]);
            delete this.deviceSnoozeTimeout[device_sn];
        });

        this.savePushPersistentIds();

        this.pushService.close();
        this.mqttService.close();

        Object.values(this.stations).forEach(station => {
            station.close();
        });

        Object.values(this.devices).forEach(device => {
            device.destroy();
        });

        if (this.connected)
            this.emit("close");

        this.connected = false;
    }

    public setCameraMaxLivestreamDuration(seconds: number): void {
        this.cameraMaxLivestreamSeconds = seconds;
    }

    public getCameraMaxLivestreamDuration(): number {
        return this.cameraMaxLivestreamSeconds;
    }

    public async registerPushNotifications(credentials?: Credentials, persistentIds?: string[]): Promise<void> {
        if (credentials)
            this.pushService.setCredentials(credentials);
        if (persistentIds)
            this.pushService.setPersistentIds(persistentIds);

        this.pushService.open();
    }

    public async connect(options?: LoginOptions): Promise<void> {
        await this.api.login(options)
            .then(async () => {
                if (options?.verifyCode) {
                    let trusted = false;
                    const trusted_devices = await this.api.listTrustDevice();
                    trusted_devices.forEach(trusted_device => {
                        if (trusted_device.is_current_device === 1) {
                            trusted = true;
                        }
                    });
                    if (!trusted)
                        return await this.api.addTrustDevice(options?.verifyCode);
                }
            })
            .catch((error) => {
                this.log.error("Connect Error", error);
            });
    }

    public getPushPersistentIds(): string[] {
        return this.pushService.getPersistentIds();
    }

    private updateDeviceProperties(deviceSN: string, values: RawValues): void {
        this.getDevice(deviceSN).then((device: Device) => {
            device.updateRawProperties(values);
        }).catch((error) => {
            this.log.error(`Update device ${deviceSN} properties error`, error);
        });
    }

    private async onAPIClose(): Promise<void> {
        if (this.refreshEufySecurityCloudTimeout !== undefined)
            clearTimeout(this.refreshEufySecurityCloudTimeout);

        this.connected = false;
        this.emit("close");

        if (this.retries < 1) {
            this.retries++;
            await this.connect()
        } else {
            this.log.error(`Tried to re-authenticate to Eufy cloud, but failed in the process. Manual intervention is required!`);
        }
    }

    private async onAPIConnect(): Promise<void> {
        this.connected = true;
        this.retries = 0;

        this.saveCloudToken();
        await this.refreshCloudData();

        this.emit("connect");

        this.registerPushNotifications(this.persistentData.push_credentials, this.persistentData.push_persistentIds);

        const loginData = this.api.getPersistentData();
        if (loginData) {
            this.mqttService.connect(loginData.user_id, this.persistentData.openudid, this.api.getAPIBase(), loginData.email);
        } else {
            this.log.warn("No login data recevied to initialize MQTT connection...");
        }
    }

    private onAPIConnectionError(error: Error): void {
        this.emit("connection error", error);
    }

    public async startStationLivestream(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStartLivestream))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        const camera = device as Camera;
        if (!station.isLiveStreaming(camera)) {
            await station.startLivestream(camera);

            if (this.cameraMaxLivestreamSeconds > 0) {
                this.cameraStationLivestreamTimeout.set(deviceSN, setTimeout(() => {
                    this.log.info(`Stopping the station stream for the device ${deviceSN}, because we have reached the configured maximum stream timeout (${this.cameraMaxLivestreamSeconds} seconds)`);
                    this.stopStationLivestream(deviceSN);
                }, this.cameraMaxLivestreamSeconds * 1000));
            }
        } else {
            this.log.warn(`The station stream for the device ${deviceSN} cannot be started, because it is already streaming!`);
        }
    }

    public async startCloudLivestream(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStartLivestream))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        const camera = device as Camera;
        if (!camera.isStreaming()) {
            const url = await camera.startStream();
            if (url !== "") {
                if (this.cameraMaxLivestreamSeconds > 0) {
                    this.cameraCloudLivestreamTimeout.set(deviceSN, setTimeout(() => {
                        this.log.info(`Stopping the station stream for the device ${deviceSN}, because we have reached the configured maximum stream timeout (${this.cameraMaxLivestreamSeconds} seconds)`);
                        this.stopCloudLivestream(deviceSN);
                    }, this.cameraMaxLivestreamSeconds * 1000));
                }
                this.emit("cloud livestream start", station, camera, url);
            } else {
                this.log.error(`Failed to start cloud stream for the device ${deviceSN}`);
            }
        } else {
            this.log.warn(`The cloud stream for the device ${deviceSN} cannot be started, because it is already streaming!`);
        }
    }

    public async stopStationLivestream(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStopLivestream))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        if (station.isConnected() && station.isLiveStreaming(device)) {
            await station.stopLivestream(device);
        } else {
            this.log.warn(`The station stream for the device ${deviceSN} cannot be stopped, because it isn't streaming!`);
        }

        const timeout = this.cameraStationLivestreamTimeout.get(deviceSN);
        if (timeout) {
            clearTimeout(timeout);
            this.cameraStationLivestreamTimeout.delete(deviceSN);
        }
    }

    public async stopCloudLivestream(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStopLivestream))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        const camera = device as Camera;
        if (camera.isStreaming()) {
            await camera.stopStream();
            this.emit("cloud livestream stop", station, camera);
        } else {
            this.log.warn(`The cloud stream for the device ${deviceSN} cannot be stopped, because it isn't streaming!`);
        }

        const timeout = this.cameraCloudLivestreamTimeout.get(deviceSN);
        if (timeout) {
            clearTimeout(timeout);
            this.cameraCloudLivestreamTimeout.delete(deviceSN);
        }
    }

    private writePersistentData(): void {
        this.persistentData.login_hash = md5(`${this.config.username}:${this.config.password}`);
        this.persistentData.httpApi = this.api?.getPersistentData();
        this.persistentData.country = this.api?.getCountry();
        try {
            fse.writeFileSync(this.persistentFile, JSON.stringify(this.persistentData));
        } catch (error) {
            this.log.error("Error:", error);
        }
    }

    private saveCloudToken(): void {
        const token = this.api.getToken();
        const token_expiration = this.api.getTokenExpiration();

        if (!!token && !!token_expiration) {
            this.log.debug("Save cloud token and token expiration", { token: token, tokenExpiration: token_expiration });
            this.persistentData.cloud_token = token;
            this.persistentData.cloud_token_expiration = token_expiration.getTime();
            this.writePersistentData();
        }
    }

    private savePushCredentials(credentials: Credentials | undefined): void {
        this.persistentData.push_credentials = credentials;
        this.writePersistentData();
    }

    private savePushPersistentIds(): void {
        this.persistentData.push_persistentIds = this.getPushPersistentIds();
        this.writePersistentData();
    }

    public getVersion(): string {
        return libVersion;
    }

    public isPushConnected(): boolean {
        return this.pushService.isConnected();
    }

    public isMQTTConnected(): boolean {
        return this.mqttService.isConnected();
    }

    public isConnected(): boolean {
        return this.connected;
    }

    private async processInvitations(): Promise<void> {
        let refreshCloud = false;

        const invites = await this.api.getInvites().catch(error => {
            this.log.error("processInvitations - getInvites - Error:", error);
            return error;
        });
        if (Object.keys(invites).length > 0) {
            const confirmInvites: Array<ConfirmInvite> = [];
            for(const invite of Object.values(invites) as Invite[]) {
                const devices: Array<string> = [];
                invite.devices.forEach(device => {
                    devices.push(device.device_sn);
                });
                if (devices.length > 0) {
                    confirmInvites.push({
                        invite_id: invite.invite_id,
                        station_sn: invite.station_sn,
                        device_sns: devices
                    });
                }
            }
            if (confirmInvites.length > 0) {
                const result = await this.api.confirmInvites(confirmInvites).catch(error => {
                    this.log.error("processInvitations - confirmInvites - Error:", error);
                    return error;
                });
                if (result) {
                    this.log.info(`Accepted received invitations`, confirmInvites);
                    refreshCloud = true;
                }
            }
        }

        const houseInvites = await this.api.getHouseInviteList().catch(error => {
            this.log.error("processInvitations - getHouseInviteList - Error:", error);
            return error;
        });
        if (Object.keys(houseInvites).length > 0) {
            for(const invite of Object.values(houseInvites) as HouseInviteListResponse[]) {
                const result = await this.api.confirmHouseInvite(invite.house_id, invite.id).catch(error => {
                    this.log.error("processInvitations - confirmHouseInvite - Error:", error);
                    return error;
                });
                if (result) {
                    this.log.info(`Accepted received house invitation from ${invite.action_user_email}`, invite);
                    refreshCloud = true;
                }
            }
        }
        if (refreshCloud)
            this.refreshCloudData();
    }

    private onPushMessage(message: PushMessage): void {
        this.emit("push message", message);

        try {
            this.log.debug("Received push message", message);
            try {
                if ((message.type === ServerPushEvent.INVITE_DEVICE || message.type === ServerPushEvent.HOUSE_INVITE) && this.config.acceptInvitations) {
                    if (this.isConnected())
                        this.processInvitations();
                }
            } catch (error) {
                this.log.error(`Error processing server push notification for device invitation`, error);
            }
            try {
                if (message.type === ServerPushEvent.REMOVE_DEVICE || message.type === ServerPushEvent.REMOVE_HOMEBASE || message.type === ServerPushEvent.HOUSE_REMOVE) {
                    if (this.isConnected())
                        this.refreshCloudData();
                }
            } catch (error) {
                this.log.error(`Error processing server push notification for device/station/house removal`, error);
            }
            this.getStations().then((stations: Station[]) => {
                stations.forEach(station => {
                    try {
                        station.processPushNotification(message);
                    } catch (error) {
                        this.log.error(`Error processing push notification for station ${station.getSerial()}`, error);
                    }
                });
            }).catch((error) => {
                this.log.error("Process push notification for stations", error);
            });
            this.getDevices().then((devices: Device[]) => {
                devices.forEach(device => {
                    try {
                        device.processPushNotification(message, this.config.eventDurationSeconds);
                    } catch (error) {
                        this.log.error(`Error processing push notification for device ${device.getSerial()}`, error);
                    }
                });
            }).catch((error) => {
                this.log.error("Process push notification for devices", error);
            });
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
    }

    public async startStationDownload(deviceSN: string, path: string, cipherID: number): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.isCamera())
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        if (!station.isDownloading(device)) {
            await station.startDownload(device, path, cipherID);
        } else {
            this.log.warn(`The station is already downloading a video for the device ${deviceSN}!`);
        }
    }

    public async cancelStationDownload(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.isCamera())
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        if (station.isConnected() && station.isDownloading(device)) {
            await station.cancelDownload(device);
        } else {
            this.log.warn(`The station isn't downloading a video for the device ${deviceSN}!`);
        }
    }

    public getConfig(): EufySecurityConfig {
        return this.config;
    }

    public async setDeviceProperty(deviceSN: string, name: string, value: unknown): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());
        const metadata = device.getPropertyMetadata(name);

        value = parseValue(metadata, value);

        switch (name) {
            case PropertyName.DeviceEnabled:
                await station.enableDevice(device, value as boolean);
                break;
            case PropertyName.DeviceStatusLed:
                await station.setStatusLed(device, value as boolean);
                break;
            case PropertyName.DeviceAutoNightvision:
                await station.setAutoNightVision(device, value as boolean);
                break;
            case PropertyName.DeviceMotionDetection:
                await station.setMotionDetection(device, value as boolean);
                break;
            case PropertyName.DeviceSoundDetection:
                await station.setSoundDetection(device, value as boolean);
                break;
            case PropertyName.DevicePetDetection:
                await station.setPetDetection(device, value as boolean);
                break;
            case PropertyName.DeviceRTSPStream:
                await station.setRTSPStream(device, value as boolean);
                break;
            case PropertyName.DeviceAntitheftDetection:
                await station.setAntiTheftDetection(device, value as boolean);
                break;
            case PropertyName.DeviceLocked:
                await station.lockDevice(device, value as boolean);
                break;
            case PropertyName.DeviceWatermark:
                await station.setWatermark(device, value as number);
                break;
            case PropertyName.DeviceLight:
                await station.switchLight(device, value as boolean);
                break;
            case PropertyName.DeviceLightSettingsEnable:
                await station.setFloodlightLightSettingsEnable(device, value as boolean);
                break;
            case PropertyName.DeviceLightSettingsBrightnessManual:
                await station.setFloodlightLightSettingsBrightnessManual(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsBrightnessMotion:
                await station.setFloodlightLightSettingsBrightnessMotion(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsBrightnessSchedule:
                await station.setFloodlightLightSettingsBrightnessSchedule(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionTriggered:
                await station.setFloodlightLightSettingsMotionTriggered(device, value as boolean);
                break;
            case PropertyName.DeviceLightSettingsMotionTriggeredDistance:
                await station.setFloodlightLightSettingsMotionTriggeredDistance(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionTriggeredTimer:
                await station.setFloodlightLightSettingsMotionTriggeredTimer(device, value as number);
                break;
            case PropertyName.DeviceMicrophone:
                await station.setMicMute(device, value as boolean);
                break;
            case PropertyName.DeviceSpeaker:
                await station.enableSpeaker(device, value as boolean);
                break;
            case PropertyName.DeviceSpeakerVolume:
                await station.setSpeakerVolume(device, value as number);
                break;
            case PropertyName.DeviceAudioRecording:
                await station.setAudioRecording(device, value as boolean);
                break;
            case PropertyName.DevicePowerSource:
                await station.setPowerSource(device, value as number);
                break;
            case PropertyName.DevicePowerWorkingMode:
                await station.setPowerWorkingMode(device, value as number);
                break;
            case PropertyName.DeviceRecordingEndClipMotionStops:
                await station.setRecordingEndClipMotionStops(device, value as boolean);
                break;
            case PropertyName.DeviceRecordingClipLength:
                await station.setRecordingClipLength(device, value as number);
                break;
            case PropertyName.DeviceRecordingRetriggerInterval:
                await station.setRecordingRetriggerInterval(device, value as number);
                break;
            case PropertyName.DeviceVideoStreamingQuality:
                await station.setVideoStreamingQuality(device, value as number);
                break;
            case PropertyName.DeviceVideoRecordingQuality:
                await station.setVideoRecordingQuality(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivity:
                await station.setMotionDetectionSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionTracking:
                await station.setMotionTracking(device, value as boolean);
                break;
            case PropertyName.DeviceMotionDetectionType:
                await station.setMotionDetectionType(device, value as number);
                break;
            case PropertyName.DeviceMotionZone:
                await station.setMotionZone(device, value as string);
                break;
            case PropertyName.DeviceVideoWDR:
                await station.setWDR(device, value as boolean);
                break;
            case PropertyName.DeviceRingtoneVolume:
                await station.setRingtoneVolume(device, value as number);
                break;
            case PropertyName.DeviceChimeIndoor:
                await station.enableIndoorChime(device, value as boolean);
                break;
            case PropertyName.DeviceChimeHomebase:
                await station.enableHomebaseChime(device, value as boolean);
                break;
            case PropertyName.DeviceChimeHomebaseRingtoneVolume:
                await station.setHomebaseChimeRingtoneVolume(device, value as number);
                break;
            case PropertyName.DeviceChimeHomebaseRingtoneType:
                await station.setHomebaseChimeRingtoneType(device, value as number);
                break;
            case PropertyName.DeviceNotificationType:
                await station.setNotificationType(device, value as NotificationType);
                break;
            case PropertyName.DeviceNotificationPerson:
                await station.setNotificationPerson(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationPet:
                await station.setNotificationPet(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationAllOtherMotion:
                await station.setNotificationAllOtherMotion(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationAllSound:
                await station.setNotificationAllSound(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationCrying:
                await station.setNotificationCrying(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationMotion:
                await station.setNotificationMotion(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationRing:
                await station.setNotificationRing(device, value as boolean);
                break;
            case PropertyName.DeviceChirpVolume:
                await station.setChirpVolume(device, value as number);
                break;
            case PropertyName.DeviceChirpTone:
                await station.setChirpTone(device, value as number);
                break;
            case PropertyName.DeviceVideoHDR:
                await station.setHDR(device, value as boolean);
                break;
            case PropertyName.DeviceVideoDistortionCorrection:
                await station.setDistortionCorrection(device, value as boolean);
                break;
            case PropertyName.DeviceVideoRingRecord:
                await station.setRingRecord(device, value as number);
                break;
            case PropertyName.DeviceRotationSpeed:
                await station.setPanAndTiltRotationSpeed(device, value as number);
                break;
            case PropertyName.DeviceNightvision:
                await station.setNightVision(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRange:
                await station.setMotionDetectionRange(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRangeStandardSensitivity:
                await station.setMotionDetectionRangeStandardSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity:
                await station.setMotionDetectionRangeAdvancedLeftSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRangeAdvancedMiddleSensitivity:
                await station.setMotionDetectionRangeAdvancedMiddleSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity:
                await station.setMotionDetectionRangeAdvancedRightSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionTestMode:
                await station.setMotionDetectionTestMode(device, value as boolean);
                break;
            case PropertyName.DeviceMotionTrackingSensitivity:
                await station.setMotionTrackingSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionAutoCruise:
                await station.setMotionAutoCruise(device, value as boolean);
                break;
            case PropertyName.DeviceMotionOutOfViewDetection:
                await station.setMotionOutOfViewDetection(device, value as boolean);
                break;
            case PropertyName.DeviceLightSettingsColorTemperatureManual:
                await station.setLightSettingsColorTemperatureManual(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsColorTemperatureMotion:
                await station.setLightSettingsColorTemperatureMotion(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsColorTemperatureSchedule:
                await station.setLightSettingsColorTemperatureSchedule(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionActivationMode:
                await station.setLightSettingsMotionActivationMode(device, value as number);
                break;
            case PropertyName.DeviceVideoNightvisionImageAdjustment:
                await station.setVideoNightvisionImageAdjustment(device, value as boolean);
                break;
            case PropertyName.DeviceVideoColorNightvision:
                await station.setVideoColorNightvision(device, value as boolean);
                break;
            case PropertyName.DeviceAutoCalibration:
                await station.setAutoCalibration(device, value as boolean);
                break;
            case PropertyName.DeviceAutoLock:
                await station.setAutoLock(device, value as boolean);
                break
            case PropertyName.DeviceAutoLockSchedule:
                await station.setAutoLockSchedule(device, value as boolean);
                break
            case PropertyName.DeviceAutoLockScheduleStartTime:
                await station.setAutoLockScheduleStartTime(device, value as string);
                break
            case PropertyName.DeviceAutoLockScheduleEndTime:
                await station.setAutoLockScheduleEndTime(device, value as string);
                break
            case PropertyName.DeviceAutoLockTimer:
                await station.setAutoLockTimer(device, value as number);
                break
            case PropertyName.DeviceOneTouchLocking:
                await station.setOneTouchLocking(device, value as boolean);
                break
            case PropertyName.DeviceSound:
                await station.setSound(device, value as number);
                break;
            case PropertyName.DeviceNotification:
                await station.setNotification(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationLocked:
                await station.setNotificationLocked(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationUnlocked:
                await station.setNotificationUnlocked(device, value as boolean);
                break;
            case PropertyName.DeviceScramblePasscode:
                await station.setScramblePasscode(device,value as boolean);
                break;
            case PropertyName.DeviceWrongTryProtection:
                await station.setWrongTryProtection(device, value as boolean);
                break;
            case PropertyName.DeviceWrongTryAttempts:
                await station.setWrongTryAttempts(device, value as number);
                break;
            case PropertyName.DeviceWrongTryLockdownTime:
                await station.setWrongTryLockdownTime(device, value as number);
                break;
            case PropertyName.DeviceLoiteringDetection:
                await station.setLoiteringDetection(device, value as boolean);
                break;
            case PropertyName.DeviceLoiteringDetectionRange:
                await station.setLoiteringDetectionRange(device, value as number);
                break;
            case PropertyName.DeviceLoiteringDetectionLength:
                await station.setLoiteringDetectionLength(device, value as number);
                break;
            case PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse:
                await station.setLoiteringCustomResponseAutoVoiceResponse(device, value as boolean);
                break;
            case PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification:
                await station.setLoiteringCustomResponseHomeBaseNotification(device, value as boolean);
                break;
            case PropertyName.DeviceLoiteringCustomResponsePhoneNotification:
                await station.setLoiteringCustomResponsePhoneNotification(device, value as boolean);
                break;
            case PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice:
                await station.setLoiteringCustomResponseAutoVoiceResponseVoice(device, value as number);
                break;
            case PropertyName.DeviceLoiteringCustomResponseTimeFrom:
                await station.setLoiteringCustomResponseTimeFrom(device, value as string);
                break;
            case PropertyName.DeviceLoiteringCustomResponseTimeTo:
                await station.setLoiteringCustomResponseTimeTo(device, value as string);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityMode:
                await station.setMotionDetectionSensitivityMode(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityStandard:
                await station.setMotionDetectionSensitivityStandard(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedA:
                await station.setMotionDetectionSensitivityAdvancedA(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedB:
                await station.setMotionDetectionSensitivityAdvancedB(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedC:
                await station.setMotionDetectionSensitivityAdvancedC(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedD:
                await station.setMotionDetectionSensitivityAdvancedD(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedE:
                await station.setMotionDetectionSensitivityAdvancedE(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedF:
                await station.setMotionDetectionSensitivityAdvancedF(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedG:
                await station.setMotionDetectionSensitivityAdvancedG(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedH:
                await station.setMotionDetectionSensitivityAdvancedH(device, value as number);
                break;
            case PropertyName.DeviceDeliveryGuard:
                await station.setDeliveryGuard(device, value as boolean);
                break;
            case PropertyName.DeviceDeliveryGuardPackageGuarding:
                await station.setDeliveryGuardPackageGuarding(device, value as boolean);
                break;
            case PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice:
                await station.setDeliveryGuardPackageGuardingVoiceResponseVoice(device, value as number);
                break;
            case PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom:
                await station.setDeliveryGuardPackageGuardingActivatedTimeFrom(device, value as string);
                break;
            case PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo:
                await station.setDeliveryGuardPackageGuardingActivatedTimeTo(device, value as string);
                break;
            case PropertyName.DeviceDeliveryGuardUncollectedPackageAlert:
                await station.setDeliveryGuardUncollectedPackageAlert(device, value as boolean);
                break;
            case PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance:
                await station.setDeliveryGuardPackageLiveCheckAssistance(device, value as boolean);
                break;
            case PropertyName.DeviceDualCamWatchViewMode:
                await station.setDualCamWatchViewMode(device, value as number);
                break;
            case PropertyName.DeviceRingAutoResponse:
                await station.setRingAutoResponse(device, value as boolean);
                break;
            case PropertyName.DeviceRingAutoResponseVoiceResponse:
                await station.setRingAutoResponseVoiceResponse(device, value as boolean);
                break;
            case PropertyName.DeviceRingAutoResponseVoiceResponseVoice:
                await station.setRingAutoResponseVoiceResponseVoice(device, value as number);
                break;
            case PropertyName.DeviceRingAutoResponseTimeFrom:
                await station.setRingAutoResponseTimeFrom(device, value as string);
                break;
            case PropertyName.DeviceRingAutoResponseTimeTo:
                await station.setRingAutoResponseTimeTo(device, value as string);
                break;
            case PropertyName.DeviceNotificationRadarDetector:
                await station.setNotificationRadarDetector(device, value as boolean);
                break;
            case PropertyName.DeviceSoundDetectionSensitivity:
                await station.setSoundDetectionSensitivity(device, value as number);
                break;
            case PropertyName.DeviceContinuousRecording:
                await station.setContinuousRecording(device, value as boolean);
                break;
            case PropertyName.DeviceContinuousRecordingType:
                await station.setContinuousRecordingType(device, value as number);
                break;
            case PropertyName.DeviceDefaultAngle:
                await station.enableDefaultAngle(device, value as boolean);
                break;
            case PropertyName.DeviceDefaultAngleIdleTime:
                await station.setDefaultAngleIdleTime(device, value as number);
                break;
            case PropertyName.DeviceNotificationIntervalTime:
                await station.setNotificationIntervalTime(device, value as number);
                break;
            case PropertyName.DeviceSoundDetectionRoundLook:
                await station.setSoundDetectionRoundLook(device, value as boolean);
                break;
            case PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck:
                await station.setDeliveryGuardUncollectedPackageAlertTimeToCheck(device, value as string);
                break;
            case PropertyName.DeviceLeftOpenAlarm:
            case PropertyName.DeviceLeftOpenAlarmDuration:
            case PropertyName.DeviceDualUnlock:
            case PropertyName.DevicePowerSave:
            case PropertyName.DeviceInteriorBrightness:
            case PropertyName.DeviceInteriorBrightnessDuration:
            case PropertyName.DeviceTamperAlarm:
            case PropertyName.DeviceRemoteUnlock:
            case PropertyName.DeviceRemoteUnlockMasterPIN:
            case PropertyName.DeviceAlarmVolume:
            case PropertyName.DevicePromptVolume:
            case PropertyName.DeviceNotificationUnlockByKey:
            case PropertyName.DeviceNotificationUnlockByPIN:
            case PropertyName.DeviceNotificationUnlockByFingerprint:
            case PropertyName.DeviceNotificationUnlockByApp:
            case PropertyName.DeviceNotificationDualUnlock:
            case PropertyName.DeviceNotificationDualLock:
            case PropertyName.DeviceNotificationWrongTryProtect:
            case PropertyName.DeviceNotificationJammed:
                await station.setSmartSafeParams(device, name, value as PropertyValue);
                break;
            case PropertyName.DeviceVideoTypeStoreToNAS:
                await station.setVideoTypeStoreToNAS(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionTypeHumanRecognition:
                await station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.HUMAN_RECOGNITION, value as boolean);
                break;
            case PropertyName.DeviceMotionDetectionTypeHuman:
                await station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.HUMAN_DETECTION, value as boolean);
                break;
            case PropertyName.DeviceMotionDetectionTypePet:
                await station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.PET_DETECTION, value as boolean);
                break;
            case PropertyName.DeviceMotionDetectionTypeVehicle:
                await station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.VEHICLE_DETECTION, value as boolean);
                break;
            case PropertyName.DeviceMotionDetectionTypeAllOtherMotions:
                await station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.ALL_OTHER_MOTION, value as boolean);
                break;
            default:
                if (!Object.values(PropertyName).includes(name as PropertyName))
                    throw new ReadOnlyPropertyError(`Property ${name} is read only`);
                throw new InvalidPropertyError(`Device ${deviceSN} has no writable property named ${name}`);
        }
    }

    public async setStationProperty(stationSN: string, name: string, value: unknown): Promise<void> {
        const station = await this.getStation(stationSN);
        const metadata = station.getPropertyMetadata(name);
        value = parseValue(metadata, value);

        switch (name) {
            case PropertyName.StationGuardMode:
                await station.setGuardMode(value as number);
                break;
            case PropertyName.StationAlarmTone:
                await station.setStationAlarmTone(value as number);
                break;
            case PropertyName.StationAlarmVolume:
                await station.setStationAlarmRingtoneVolume(value as number);
                break;
            case PropertyName.StationPromptVolume:
                await station.setStationPromptVolume(value as number);
                break;
            case PropertyName.StationNotificationSwitchModeApp:
                await station.setStationNotificationSwitchMode(NotificationSwitchMode.APP, value as boolean);
                break;
            case PropertyName.StationNotificationSwitchModeGeofence:
                await station.setStationNotificationSwitchMode(NotificationSwitchMode.GEOFENCE, value as boolean);
                break;
            case PropertyName.StationNotificationSwitchModeSchedule:
                await station.setStationNotificationSwitchMode(NotificationSwitchMode.SCHEDULE, value as boolean);
                break;
            case PropertyName.StationNotificationSwitchModeKeypad:
                await station.setStationNotificationSwitchMode(NotificationSwitchMode.KEYPAD, value as boolean);
                break;
            case PropertyName.StationNotificationStartAlarmDelay:
                await station.setStationNotificationStartAlarmDelay(value as boolean);
                break;
            case PropertyName.StationTimeFormat:
                await station.setStationTimeFormat(value as number);
                break;
            case PropertyName.StationSwitchModeWithAccessCode:
                await station.setStationSwitchModeWithAccessCode(value as boolean);
                break;
            case PropertyName.StationAutoEndAlarm:
                await station.setStationAutoEndAlarm(value as boolean);
                break;
            case PropertyName.StationTurnOffAlarmWithButton:
                await station.setStationTurnOffAlarmWithButton(value as boolean);
                break;
            default:
                if (!Object.values(PropertyName).includes(name as PropertyName))
                    throw new ReadOnlyPropertyError(`Property ${name} is read only`);
                throw new InvalidPropertyError(`Station ${stationSN} has no writable property named ${name}`);
        }
    }

    private onStartStationLivestream(station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station livestream start", station, device, metadata, videostream, audiostream);
        }).catch((error) => {
            this.log.error(`Station start livestream error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStopStationLivestream(station: Station, channel:number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station livestream stop", station, device);
        }).catch((error) => {
            this.log.error(`Station stop livestream error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onErrorStationLivestream(station: Station, channel:number, _error: Error): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            station.stopLivestream(device).catch((error) => {
                this.log.error(`Station livestream error (station: ${station.getSerial()} channel: ${channel} error: ${_error}})`, error);
            });
        }).catch((error) => {
            this.log.error(`Station livestream error (station: ${station.getSerial()} channel: ${channel} error: ${_error}})`, error);
        });
    }

    private onStartStationRTSPLivestream(station: Station, channel:number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station rtsp livestream start", station, device);
        }).catch((error) => {
            this.log.error(`Station start rtsp livestream error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStopStationRTSPLivestream(station: Station, channel:number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station rtsp livestream stop", station, device);
        }).catch((error) => {
            this.log.error(`Station stop rtsp livestream error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStationStartDownload(station: Station, channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station download start", station, device, metadata, videoStream, audioStream);
        }).catch((error) => {
            this.log.error(`Station start download error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStationFinishDownload(station: Station, channel: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station download finish", station, device);
        }).catch((error) => {
            this.log.error(`Station finish download error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStationCommandResult(station: Station, result: CommandResult): void {
        this.emit("station command result", station, result);
        if (result.return_code === 0) {
            this.getStationDevice(station.getSerial(), result.channel).then((device: Device) => {
                if ((result.customData !== undefined && result.customData.property !== undefined && !device.isLockWifiR10() && !device.isLockWifiR20() && !device.isLockWifiVideo() && !device.isSmartSafe()) ||
                    (result.customData !== undefined && result.customData.property !== undefined && device.isSmartSafe() && result.command_type !== CommandType.CMD_SMARTSAFE_SETTINGS)) {
                    if (device.hasProperty(result.customData.property.name)) {
                        device.updateProperty(result.customData.property.name, result.customData.property.value);
                    } else if (station.hasProperty(result.customData.property.name)) {
                        station.updateProperty(result.customData.property.name, result.customData.property.value);
                    }
                } else if (result.customData !== undefined && result.customData.command !== undefined && result.customData.command.name === CommandName.DeviceSnooze) {
                    const snoozeTime = result.customData.command.value !== undefined && result.customData.command.value.snooze_time !== undefined ? result.customData.command.value.snooze_time as number : 0;
                    if (snoozeTime > 0) {
                        device.updateProperty(PropertyName.DeviceSnooze, true);
                        device.updateProperty(PropertyName.DeviceSnoozeTime, snoozeTime);
                    }
                    this.api.refreshAllData().then(() => {
                        const snoozeStartTime = device.getPropertyValue(PropertyName.DeviceSnoozeStartTime) as number;
                        const currentTime = Math.trunc(new Date().getTime() / 1000);
                        let timeoutMS;
                        if (snoozeStartTime !== undefined && snoozeStartTime !== 0) {
                            timeoutMS = (snoozeStartTime + snoozeTime - currentTime) * 1000;
                        } else {
                            timeoutMS = snoozeTime * 1000;
                        }
                        this.deviceSnoozeTimeout[device.getSerial()] = setTimeout(() => {
                            device.updateProperty(PropertyName.DeviceSnooze, false);
                            device.updateProperty(PropertyName.DeviceSnoozeTime, 0);
                            device.updateProperty(PropertyName.DeviceSnoozeStartTime, 0);
                            if (device.hasProperty(PropertyName.DeviceSnoozeHomebase)) {
                                device.updateProperty(PropertyName.DeviceSnoozeHomebase, false);
                            }
                            if (device.hasProperty(PropertyName.DeviceSnoozeMotion)) {
                                device.updateProperty(PropertyName.DeviceSnoozeMotion, false);
                            }
                            if (device.hasProperty(PropertyName.DeviceSnoozeChime)) {
                                device.updateProperty(PropertyName.DeviceSnoozeChime, false);
                            }
                            delete this.deviceSnoozeTimeout[device.getSerial()];
                        }, timeoutMS);
                    }).catch(error => {
                        this.log.error("Error during API data refreshing", error);
                    });
                }
            }).catch((error) => {
                if (error instanceof DeviceNotFoundError) {
                    if (result.customData !== undefined && result.customData.property !== undefined) {
                        station.updateProperty(result.customData.property.name, result.customData.property.value);
                    }
                } else {
                    this.log.error(`Station command result error (station: ${station.getSerial()})`, error);
                }
            });
            if (station.isIntegratedDevice() && result.command_type === CommandType.CMD_SET_ARMING && station.isConnected() && station.getDeviceType() !== DeviceType.DOORBELL) {
                station.getCameraInfo();
            }
        }
        if (result.customData !== undefined && result.customData.command !== undefined) {
            const customValue = result.customData.command.value;
            switch (result.customData.command.name) {
                case CommandName.DeviceAddUser:
                    this.getStationDevice(station.getSerial(), result.channel).then((device: Device) => {
                        switch (result.return_code) {
                            case 0:
                                this.emit("user added", device, customValue.username, customValue.schedule);
                                break;
                            case 4:
                                this.emit("user error", device, customValue.username, new AddUserError("Passcode already used by another user, please choose a different one"));
                                break;
                            default:
                                this.emit("user error", device, customValue.username, new AddUserError(`Error creating user with return code ${result.return_code}`));
                                break;
                        }
                    });
                    break;
                case CommandName.DeviceDeleteUser:
                    this.getStationDevice(station.getSerial(), result.channel).then((device: Device) => {
                        switch (result.return_code) {
                            case 0:
                                this.api.deleteUser(device.getSerial(), customValue.short_user_id, device.getStationSerial()).then((result) => {
                                    if (result) {
                                        this.emit("user deleted", device, customValue.username);
                                    } else {
                                        this.emit("user error", device, customValue.username, new DeleteUserError(`Error in deleting user "${customValue.username}" with id "${customValue.short_user_id}" through cloud api call`));
                                    }
                                });

                                break;
                            default:
                                this.emit("user error", device, customValue.username, new Error(`Error deleting user with return code ${result.return_code}`));
                                break;
                        }
                    });
                    break;
                case CommandName.DeviceUpdateUserPasscode:
                    this.getStationDevice(station.getSerial(), result.channel).then((device: Device) => {
                        switch (result.return_code) {
                            case 0:
                                this.emit("user passcode updated", device, customValue.username);
                                break;
                            default:
                                this.emit("user error", device, customValue.username, new UpdateUserPasscodeError(`Error updating user passcode with return code ${result.return_code}`));
                                break;
                        }
                    });
                    break;
                case CommandName.DeviceUpdateUserSchedule:
                    this.getStationDevice(station.getSerial(), result.channel).then((device: Device) => {
                        switch (result.return_code) {
                            case 0:
                                this.emit("user schedule updated", device, customValue.username, customValue.schedule);
                                break;
                            default:
                                this.emit("user error", device, customValue.username, new UpdateUserScheduleError(`Error updating user schedule with return code ${result.return_code}`));
                                break;
                        }
                    });
                    break;
            }
        }
    }

    private onStationSecondaryCommandResult(station: Station, result: CommandResult): void {
        if (result.return_code === 0) {
            this.getStationDevice(station.getSerial(), result.channel).then((device: Device) => {
                if (result.customData !== undefined && result.customData.property !== undefined) {
                    if (device.hasProperty(result.customData.property.name))
                        device.updateProperty(result.customData.property.name, result.customData.property.value);
                    else if (station.hasProperty(result.customData.property.name)) {
                        station.updateProperty(result.customData.property.name, result.customData.property.value);
                    }
                }
            }).catch((error) => {
                if (error instanceof DeviceNotFoundError) {
                    if (result.customData !== undefined && result.customData.property !== undefined) {
                        station.updateProperty(result.customData.property.name, result.customData.property.value);
                    }
                } else {
                    this.log.error(`Station secondary command result error (station: ${station.getSerial()})`, error);
                }
            });
        }
    }

    private onStationRtspUrl(station: Station, channel:number, value: string): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station rtsp url", station, device, value);
            device.setCustomPropertyValue(PropertyName.DeviceRTSPStreamUrl, value);
        }).catch((error) => {
            this.log.error(`Station rtsp url error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStationGuardMode(station: Station, guardMode: number): void {
        this.emit("station guard mode", station, guardMode);
    }

    private onStationCurrentMode(station: Station, currentMode: number): void {
        this.emit("station current mode", station, currentMode);
    }

    private onStationPropertyChanged(station: Station, name: string, value: PropertyValue, ready: boolean): void {
        if (ready && !name.startsWith("hidden-")) {
            this.emit("station property changed", station, name, value);
        }
    }

    private onStationRawPropertyChanged(station: Station, type: number, value: string): void {
        this.emit("station raw property changed", station, type, value);
    }

    private onStationAlarmEvent(station: Station, alarmEvent: AlarmEvent): void {
        this.emit("station alarm event", station, alarmEvent);
    }

    private onStationAlarmDelayEvent(station: Station, alarmDelayEvent: AlarmEvent, alarmDelay: number): void {
        this.emit("station alarm delay event", station, alarmDelayEvent, alarmDelay);
    }

    private onStationArmDelayEvent(station: Station, armDelay: number): void {
        this.emit("station alarm arm delay event", station, armDelay);
    }

    private onStationAlarmArmedEvent(station: Station): void {
        this.emit("station alarm armed", station);
    }

    private onDevicePropertyChanged(device: Device, name: string, value: PropertyValue, ready: boolean): void {
        try {
            if (ready && !name.startsWith("hidden-")) {
                this.emit("device property changed", device, name, value);
            }
            if (name === PropertyName.DeviceRTSPStream && (value as boolean) === true && (device.getPropertyValue(PropertyName.DeviceRTSPStreamUrl) === undefined || (device.getPropertyValue(PropertyName.DeviceRTSPStreamUrl) !== undefined && (device.getPropertyValue(PropertyName.DeviceRTSPStreamUrl) as string) === ""))) {
                this.getStation(device.getStationSerial()).then((station: Station) => {
                    station.setRTSPStream(device, true);
                }).catch((error) => {
                    this.log.error(`Device property changed error (device: ${device.getSerial()} name: ${name}) - station enable rtsp (station: ${device.getStationSerial()})`, error);
                });
            } else if (name === PropertyName.DeviceRTSPStream && (value as boolean) === false) {
                device.setCustomPropertyValue(PropertyName.DeviceRTSPStreamUrl, "");
            } else if (name === PropertyName.DevicePictureUrl && value !== "") {
                const picture = device.getPropertyValue(PropertyName.DevicePicture);
                if (picture === undefined || picture === null || (picture && (picture as Picture).data?.length === 0)) {
                    this.getStation(device.getStationSerial()).then((station: Station) => {
                        station.downloadImage(value as string);
                    }).catch((error) => {
                        this.log.error(`Device property changed error (device: ${device.getSerial()} name: ${name}) - station download image (station: ${device.getStationSerial()} image_path: ${value})`, error);
                    });
                }
            }
        } catch (error) {
            this.log.error(`Device property changed error (device: ${device.getSerial()} name: ${name})`, error);
        }
    }

    private onDeviceRawPropertyChanged(device: Device, type: number, value: string): void {
        this.emit("device raw property changed", device, type, value);
    }

    private onDeviceCryingDetected(device: Device, state: boolean): void {
        this.emit("device crying detected", device, state);
    }

    private onDeviceSoundDetected(device: Device, state: boolean): void {
        this.emit("device sound detected", device, state);
    }

    private onDevicePetDetected(device: Device, state: boolean): void {
        this.emit("device pet detected", device, state);
    }

    private onDeviceVehicleDetected(device: Device, state: boolean): void {
        this.emit("device vehicle detected", device, state);
    }

    private onDeviceMotionDetected(device: Device, state: boolean): void {
        this.emit("device motion detected", device, state);
    }

    private onDevicePersonDetected(device: Device, state: boolean, person: string): void {
        this.emit("device person detected", device, state, person);
    }

    private onDeviceRings(device: Device, state: boolean): void {
        this.emit("device rings", device, state);
    }

    private onDeviceLocked(device: Device, state: boolean): void {
        this.emit("device locked", device, state);
    }

    private onDeviceOpen(device: Device, state: boolean): void {
        this.emit("device open", device, state);
    }

    private onDevicePackageDelivered(device: Device, state: boolean): void {
        this.emit("device package delivered", device, state);
    }

    private onDevicePackageStranded(device: Device, state: boolean): void {
        this.emit("device package stranded", device, state);
    }

    private onDevicePackageTaken(device: Device, state: boolean): void {
        this.emit("device package taken", device, state);
    }

    private onDeviceSomeoneLoitering(device: Device, state: boolean): void {
        this.emit("device someone loitering", device, state);
    }

    private onDeviceRadarMotionDetected(device: Device, state: boolean): void {
        this.emit("device radar motion detected", device, state);
    }

    private onDevice911Alarm(device: Device, state: boolean, detail: SmartSafeAlarm911Event): void {
        this.emit("device 911 alarm", device, state, detail);
    }

    private onDeviceShakeAlarm(device: Device, state: boolean, detail: SmartSafeShakeAlarmEvent): void {
        this.emit("device shake alarm", device, state, detail);
    }

    private onDeviceWrongTryProtectAlarm(device: Device, state: boolean): void {
        this.emit("device wrong try-protect alarm", device, state);
    }

    private onDeviceLongTimeNotClose(device: Device, state: boolean): void {
        this.emit("device long time not close", device, state);
    }

    private onDeviceLowBattery(device: Device, state: boolean): void {
        this.emit("device low battery", device, state);
    }

    private onDeviceJammed(device: Device, state: boolean): void {
        this.emit("device jammed", device, state);
    }

    private onDeviceStrangerPersonDetected(device: Device, state: boolean): void {
        this.emit("device stranger person detected", device, state);
    }

    private onDeviceDogDetected(device: Device, state: boolean): void {
        this.emit("device dog detected", device, state);
    }

    private onDeviceDogLickDetected(device: Device, state: boolean): void {
        this.emit("device dog lick detected", device, state);
    }

    private onDeviceDogPoopDetected(device: Device, state: boolean): void {
        this.emit("device dog poop detected", device, state);
    }

    private onDeviceReady(device: Device): void {
        try {
            if (device.getPropertyValue(PropertyName.DeviceRTSPStream) !== undefined && (device.getPropertyValue(PropertyName.DeviceRTSPStream) as boolean) === true) {
                this.getStation(device.getStationSerial()).then((station: Station) => {
                    station.setRTSPStream(device, true);
                }).catch((error) => {
                    this.log.error(`Device ready error (device: ${device.getSerial()}) - station enable rtsp (station: ${device.getStationSerial()})`, error);
                });
            }
        } catch (error) {
            this.log.error(`Device ready error (device: ${device.getSerial()})`, error);
        }
    }

    private onStationRuntimeState(station: Station, channel: number, batteryLevel: number, temperature: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceBattery)) {
                const metadataBattery = device.getPropertyMetadata(PropertyName.DeviceBattery);
                device.updateRawProperty(metadataBattery.key as number, batteryLevel.toString());
            }
            if (device.hasProperty(PropertyName.DeviceBatteryTemp)) {
                const metadataBatteryTemperature = device.getPropertyMetadata(PropertyName.DeviceBatteryTemp);
                device.updateRawProperty(metadataBatteryTemperature.key as number, temperature.toString());
            }
        }).catch((error) => {
            this.log.error(`Station runtime state error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStationChargingState(station: Station, channel: number, chargeType: ChargingType, batteryLevel: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceBattery)) {
                const metadataBattery = device.getPropertyMetadata(PropertyName.DeviceBattery);
                if (chargeType !== ChargingType.PLUGGED && batteryLevel > 0)
                    device.updateRawProperty(metadataBattery.key as number, batteryLevel.toString());
            }
            if (device.hasProperty(PropertyName.DeviceChargingStatus)) {
                const metadataChargingStatus = device.getPropertyMetadata(PropertyName.DeviceChargingStatus);
                device.updateRawProperty(metadataChargingStatus.key as number, chargeType.toString());
            }
        }).catch((error) => {
            this.log.error(`Station charging state error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStationWifiRssi(station: Station, channel: number, rssi: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceWifiRSSI)) {
                const metadataWifiRssi = device.getPropertyMetadata(PropertyName.DeviceWifiRSSI);
                device.updateRawProperty(metadataWifiRssi.key as number, rssi.toString());
            }
        }).catch((error) => {
            this.log.error(`Station wifi rssi error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onCaptchaRequest(id: string, captcha: string): void {
        this.emit("captcha request", id, captcha);
    }

    private onFloodlightManualSwitch(station: Station, channel: number, enabled: boolean): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceLight)) {
                const metadataLight = device.getPropertyMetadata(PropertyName.DeviceLight);
                device.updateRawProperty(metadataLight.key as number, enabled === true ? "1" : "0");
            }
        }).catch((error) => {
            this.log.error(`Station floodlight manual switch error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onAuthTokenInvalidated(): void {
        this.persistentData.cloud_token = undefined;
        this.persistentData.cloud_token_expiration = undefined;
        this.writePersistentData();
    }

    private onTfaRequest(): void {
        this.emit("tfa request");
    }

    private onStationTalkbackStart(station: Station, channel: number, talkbackStream: TalkbackStream): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station talkback start", station, device, talkbackStream);
        }).catch((error) => {
            this.log.error(`Station talkback start error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStationTalkbackStop(station: Station, channel: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station talkback stop", station, device);
        }).catch((error) => {
            this.log.error(`Station talkback stop error (station: ${station.getSerial()} channel: ${channel})`, error);
        });
    }

    private onStationTalkbackError(station: Station, channel:number, _error: Error): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            station.stopTalkback(device);
        }).catch((error) => {
            this.log.error(`Station talkback error (station: ${station.getSerial()} channel: ${channel} error: ${_error}})`, error);
        });
    }

    public async startStationTalkback(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStartTalkback))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        if (station.isLiveStreaming(device)) {
            if (!station.isTalkbackOngoing(device)) {
                station.startTalkback(device);
            } else {
                this.log.warn(`The station talkback for the device ${deviceSN} cannot be started, because it is ongoing!`);
            }
        } else {
            this.log.warn(`The station talkback for the device ${deviceSN} cannot be started, because it isn't live streaming!`);
        }
    }

    public async stopStationTalkback(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStopTalkback))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        if (station.isLiveStreaming(device)) {
            if (station.isTalkbackOngoing(device)) {
                station.stopTalkback(device);
            } else {
                this.log.warn(`The station talkback for the device ${deviceSN} cannot be stopped, because it isn't ongoing!`);
            }
        } else {
            this.log.warn(`The station talkback for the device ${deviceSN} cannot be stopped, because it isn't live streaming!`);
        }
    }

    private onStationDeviceShakeAlarm(deviceSN: string, event: SmartSafeShakeAlarmEvent): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).shakeEvent(event, this.config.eventDurationSeconds);
        }).catch((error) => {
            this.log.error(`onStationShakeAlarm device ${deviceSN} error`, error);
        });
    }

    private onStationDevice911Alarm(deviceSN: string, event: SmartSafeAlarm911Event): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).alarm911Event(event, this.config.eventDurationSeconds);
        }).catch((error) => {
            this.log.error(`onStation911Alarm device ${deviceSN} error`, error);
        });
    }

    private onStationDeviceJammed(deviceSN: string): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).jammedEvent(this.config.eventDurationSeconds);
        }).catch((error) => {
            this.log.error(`onStationDeviceJammed device ${deviceSN} error`, error);
        });
    }

    private onStationDeviceLowBattery(deviceSN: string): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).lowBatteryEvent(this.config.eventDurationSeconds);
        }).catch((error) => {
            this.log.error(`onStationDeviceLowBattery device ${deviceSN} error`, error);
        });
    }

    private onStationDeviceWrongTryProtectAlarm(deviceSN: string): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).wrongTryProtectAlarmEvent(this.config.eventDurationSeconds);
        }).catch((error) => {
            this.log.error(`onStationDeviceWrongTryProtectAlarm device ${deviceSN} error`, error);
        });
    }

    public async addUser(deviceSN: string, username: string, passcode: string, schedule?: Schedule): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        try {
            if (!device.hasCommand(CommandName.DeviceAddUser))
                throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

            const addUserResponse = await this.api.addUser(deviceSN, username, device.getStationSerial());
            if (addUserResponse !== null) {
                await station.addUser(device, username, addUserResponse.short_user_id, passcode, schedule);
            } else {
                this.emit("user error", device, username, new AddUserError("Error on creating user through cloud api call"));
            }
        } catch (error) {
            this.log.error(`addUser device ${deviceSN} error`, error);
            this.emit("user error", device, username, new AddUserError(`Got exception: ${error}`));
        }
    }

    public async deleteUser(deviceSN: string, username: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceDeleteUser))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        try {
            const users = await this.api.getUsers(deviceSN, device.getStationSerial());
            if (users !== null) {
                let found = false;
                for (const user of users) {
                    if (user.user_name === username) {
                        await station.deleteUser(device, user. user_name, user.short_user_id);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.emit("user error", device, username, new DeleteUserError(`User with username "${username}" not found`));
                }
            } else {
                this.emit("user error", device, username, new DeleteUserError("Error on getting user list through cloud api call"));
            }
        } catch (error) {
            this.log.error(`deleteUser device ${deviceSN} error`, error);
            this.emit("user error", device, username, new DeleteUserError(`Got exception: ${error}`));
        }
    }

    public async updateUser(deviceSN: string, username: string, newUsername: string): Promise<void> {
        const device = await this.getDevice(deviceSN);

        if (!device.hasCommand(CommandName.DeviceUpdateUsername))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        try {
            const users = await this.api.getUsers(deviceSN, device.getStationSerial());
            if (users !== null) {
                let found = false;
                for (const user of users) {
                    if (user.user_name === username) {
                        const result = await this.api.updateUser(deviceSN, device.getStationSerial(), user.short_user_id, newUsername);
                        if (result) {
                            this.emit("user username updated", device, username);
                        } else {
                            this.emit("user error", device, username, new UpdateUserUsernameError(`Error in changing username "${username}" to "${newUsername}" through cloud api call`));
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.emit("user error", device, username, new UpdateUserUsernameError(`Error in changing username "${username}" to "${newUsername}" through cloud api call`));

                }
            } else {
                this.emit("user error", device, username, new UpdateUserUsernameError("Error on getting user list through cloud api call"));
            }
        } catch (error) {
            this.log.error(`updateUser device ${deviceSN} error`, error);
            this.emit("user error", device, username, new UpdateUserUsernameError(`Got exception: ${error}`));
        }
    }

    public async updateUserPasscode(deviceSN: string, username: string, passcode: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceUpdateUserPasscode))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        try {
            const users = await this.api.getUsers(deviceSN, device.getStationSerial());
            if (users !== null) {
                let found = false;
                for (const user of users) {
                    if (user.user_name === username) {
                        await station.updateUserPasscode(device, user.user_name, user.short_user_id, passcode);
                        found = true;
                    }
                }
                if (!found) {
                    this.emit("user error", device, username, new UpdateUserPasscodeError(`User with username "${username}" not found`));
                }
            } else {
                this.emit("user error", device, username, new UpdateUserPasscodeError("Error on getting user list through cloud api call"));
            }
        } catch (error) {
            this.log.error(`updateUserPasscode device ${deviceSN} error`, error);
            this.emit("user error", device, username, new UpdateUserPasscodeError(`Got exception: ${error}`));
        }
    }

    public async updateUserSchedule(deviceSN: string, username: string, schedule: Schedule): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceUpdateUserPasscode))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        try {
            const users = await this.api.getUsers(deviceSN, device.getStationSerial());
            if (users !== null) {
                let found = false;
                for (const user of users) {
                    if (user.user_name === username) {
                        await station.updateUserSchedule(device, user.user_name, user.short_user_id, schedule);
                        found = true;
                    }
                }
                if (!found) {
                    this.emit("user error", device, username, new UpdateUserScheduleError(`User with username "${username}" not found`));
                }
            } else {
                this.emit("user error", device, username, new UpdateUserScheduleError("Error on getting user list through cloud api call"));
            }
        } catch (error) {
            this.log.error(`updateUserSchedule device ${deviceSN} error`, error);
            this.emit("user error", device, username, new UpdateUserScheduleError(`Got exception: ${error}`));
        }
    }

    private onStationDevicePinVerified(deviceSN: string, successfull: boolean): void {
        this.getDevice(deviceSN).then((device: Device) => {
            this.emit("device pin verified", device, successfull);
        }).catch((error) => {
            this.log.error(`onStationDevicePinVerified device ${deviceSN} error`, error);
        });
    }

    private onStationSdInfoEx(station: Station, sdStatus: TFCardStatus, sdCapacity: number, sdCapacityAvailable: number): void {
        if(station.hasProperty(PropertyName.StationSdStatus)) {
            station.updateProperty(PropertyName.StationSdStatus, sdStatus);
        }
        if(station.hasProperty(PropertyName.StationSdCapacity)) {
            station.updateProperty(PropertyName.StationSdCapacity, sdCapacity);
        }
        if(station.hasProperty(PropertyName.StationSdCapacityAvailable)) {
            station.updateProperty(PropertyName.StationSdCapacityAvailable, sdCapacityAvailable);
        }
    }

    private onStationImageDownload(station: Station, file: string, image: Buffer): void {
        const type = imageType(image);
        const picture: Picture = {
            data: image,
            type: type !== null ? type : { ext: "unknown", mime: "application/octet-stream" }
        };
        this.emit("station image download", station, file, picture);

        this.getDevicesFromStation(station.getSerial()).then((devices: Device[]) => {
            for (const device of devices) {
                if (device.getPropertyValue(PropertyName.DevicePictureUrl) === file && (device.getPropertyValue(PropertyName.DevicePicture) === undefined || device.getPropertyValue(PropertyName.DevicePicture) === null)) {
                    this.log.debug(`onStationImageDownload - Set first picture for device ${device.getSerial()} file: ${file} picture_ext: ${picture.type.ext} picture_mime: ${picture.type.mime}`);
                    device.updateProperty(PropertyName.DevicePicture, picture);
                    break;
                }
            }
        }).catch((error) => {
            this.log.error(`onStationImageDownload - Set first picture error`, error);
        });
    }

    private onStationDatabaseQueryLatest(station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLatestInfo>): void {
        if (returnCode === DatabaseReturnCode.SUCCESSFUL) {
            for(const element of data) {
                if ((element.device_sn !== "" && !station.isStation()) || (station.isStation() && element.device_sn !== station.getSerial())) {
                    this.getDevice(element.device_sn).then((device) => {
                        const raw = device.getRawDevice();
                        if ("crop_local_path" in element) {
                            raw.cover_path = (element as DatabaseQueryLatestInfoLocal).crop_local_path;
                        } else if ("crop_cloud_path" in element) {
                            raw.cover_path = (element as DatabaseQueryLatestInfoCloud).crop_cloud_path;
                        }
                        device.update(raw);
                    }).catch((error) => {
                        this.log.error("onStationDatabaseQueryLatest Error:", error);
                    });
                }
            }
        }
        this.emit("station database query latest", station, returnCode, data);
    }

    private onStationDatabaseQueryLocal(station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLocal>): void {
        this.emit("station database query local", station, returnCode, data);
    }

    private onStationDatabaseCountByDate(station: Station, returnCode: DatabaseReturnCode, data: Array<DatabaseCountByDate>): void {
        this.emit("station database count by date", station, returnCode, data);
    }

    private onStationDatabaseDelete(station: Station, returnCode: DatabaseReturnCode, failedIds: Array<unknown>): void {
        this.emit("station database delete", station, returnCode, failedIds);
    }

}