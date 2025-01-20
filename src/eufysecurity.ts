import { TypedEmitter } from "tiny-typed-emitter";
import * as fse from "fs-extra";
import * as path from "path";
import { Readable } from "stream";
import EventEmitter from "events";

import { EufySecurityEvents, EufySecurityConfig, EufySecurityPersistentData } from "./interfaces";
import { HTTPApi } from "./http/api";
import { Devices, FullDevices, Hubs, PropertyValue, RawValues, Stations, Houses, LoginOptions, Schedule, Picture, DeviceConfig } from "./http/interfaces";
import { Station } from "./http/station";
import { ConfirmInvite, DeviceListResponse, HouseInviteListResponse, Invite, StationListResponse } from "./http/models";
import { CommandName, DeviceType, FloodlightT8425NotificationTypes, HB3DetectionTypes, IndoorS350DetectionTypes, IndoorS350NotificationTypes, NotificationSwitchMode, NotificationType, PropertyName, SoloCameraDetectionTypes, T8170DetectionTypes, UserPasswordType } from "./http/types";
import { PushNotificationService } from "./push/service";
import { Credentials, PushMessage } from "./push/models";
import { BatteryDoorbellCamera, Camera, Device, EntrySensor, FloodlightCamera, GarageCamera, IndoorCamera, Keypad, Lock, MotionSensor, SmartSafe, SoloCamera, UnknownDevice, WallLightCam, WiredDoorbellCamera, Tracker, DoorbellLock, LockKeypad, SmartDrop } from "./http/device";
import { AlarmEvent, CommandType, DatabaseReturnCode, P2PConnectionType, SmartSafeAlarm911Event, SmartSafeShakeAlarmEvent, TFCardStatus } from "./p2p/types";
import { DatabaseCountByDate, DatabaseQueryLatestInfo, DatabaseQueryLocal, StreamMetadata, DatabaseQueryLatestInfoLocal, DatabaseQueryLatestInfoCloud, RGBColor, DynamicLighting, MotionZone, CrossTrackingGroupEntry } from "./p2p/interfaces";
import { CommandResult, StorageInfoBodyHB3 } from "./p2p/models";
import { generateSerialnumber, generateUDID, getError, handleUpdate, isValidUrl, md5, parseValue, removeLastChar, waitForEvent } from "./utils";
import { DeviceNotFoundError, StationNotFoundError, ReadOnlyPropertyError, NotSupportedError, AddUserError, DeleteUserError, UpdateUserUsernameError, UpdateUserPasscodeError, UpdateUserScheduleError, ensureError } from "./error";
import { libVersion } from ".";
import { InvalidPropertyError } from "./http/error";
import { ServerPushEvent } from "./push/types";
import { MQTTService } from "./mqtt/service";
import { TalkbackStream } from "./p2p/talkback";
import { PhoneModels } from "./http/const";
import { hexStringScheduleToSchedule, randomNumber } from "./http/utils";
import { Logger, dummyLogger, InternalLogger, rootMainLogger, setLoggingLevel, LoggingCategories, getLoggingLevel } from "./logging"
import { LogLevel } from "typescript-logging";
import { isCharging } from "./p2p/utils";

export class EufySecurity extends TypedEmitter<EufySecurityEvents> {

    private config: EufySecurityConfig;

    private api!: HTTPApi;

    private houses: Houses = {};
    private stations: Stations = {};
    private devices: Devices = {};

    private readonly P2P_REFRESH_INTERVAL_MIN = 720;

    private cameraMaxLivestreamSeconds = 30;
    private cameraStationLivestreamTimeout: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

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

    private loadingEmitter = new EventEmitter();
    private stationsLoaded?: Promise<void> = waitForEvent<void>(this.loadingEmitter, "stations loaded");
    private devicesLoaded?: Promise<void> = waitForEvent<void>(this.loadingEmitter, "devices loaded");

    private constructor(config: EufySecurityConfig, log: Logger = dummyLogger) {
        super();

        this.config = config;
        InternalLogger.logger = log;
    }

    static async initialize(config: EufySecurityConfig, log: Logger = dummyLogger): Promise<EufySecurity> {
        const eufySecurity = new EufySecurity(config, log);
        await eufySecurity._initializeInternals();
        return eufySecurity;
    }

    protected async _initializeInternals(): Promise<void> {
        if (this.config.logging) {
            if (this.config.logging.level !== undefined && typeof this.config.logging.level === "number" && Object.values(LogLevel).includes(this.config.logging.level))
                setLoggingLevel("all", this.config.logging.level);
            if (this.config.logging.categories !== undefined && Array.isArray(this.config.logging.categories)) {
                for(const category of this.config.logging.categories) {
                    if (
                        typeof category === "object" &&
                        "category" in category &&
                        "level" in category &&
                        typeof category.level === "number" &&
                        Object.values(LogLevel).includes(category.level) &&
                        typeof category.category === "string" &&
                        ["main", "http", "p2p" , "push", "mqtt"].includes(category.category.toLowerCase())
                    ) {
                        setLoggingLevel(category.category.toLocaleLowerCase() as LoggingCategories, category.level);
                    }
                }
            }
        }

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
        if (this.config.enableEmbeddedPKCS1Support === undefined) {
            this.config.enableEmbeddedPKCS1Support = false;
        }
        if(this.config.deviceConfig === undefined) {
            this.config.deviceConfig = {
                simultaneousDetections: true
            };
        }
        if (this.config.persistentDir === undefined) {
            this.config.persistentDir = path.resolve(__dirname, "../../..");
        } else if (!fse.existsSync(this.config.persistentDir)) {
            this.config.persistentDir = path.resolve(__dirname, "../../..");
        }

        if (this.config.persistentData) {
            this.persistentData = JSON.parse(this.config.persistentData) as EufySecurityPersistentData;
        } else {
            this.persistentFile = path.join(this.config.persistentDir, "persistent.json");
        }

        try {
            if (!this.config.persistentData && fse.statSync(this.persistentFile).isFile()) {
                const fileContent = fse.readFileSync(this.persistentFile, "utf8");
                this.persistentData = JSON.parse(fileContent) as EufySecurityPersistentData;
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.debug("No stored data from last exit found", { error: getError(error) });
        }

        rootMainLogger.debug("Loaded persistent data", { persistentData: this.persistentData });
        try {
            if (this.persistentData.version !== libVersion) {
                const currentVersion = Number.parseFloat(removeLastChar(libVersion, "."));
                const previousVersion = this.persistentData.version !== "" && this.persistentData.version !== undefined ? Number.parseFloat(removeLastChar(this.persistentData.version, ".")) : 0;
                rootMainLogger.debug("Handling of driver update", { currentVersion: currentVersion, previousVersion: previousVersion });

                if (previousVersion < currentVersion) {
                    this.persistentData = handleUpdate(this.persistentData, previousVersion);
                    this.persistentData.version = libVersion;
                }
            }
        } catch(err) {
            const error = ensureError(err);
            rootMainLogger.error("Handling update - Error", { error: getError(error) });
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

        if (this.persistentData.login_hash && this.persistentData.login_hash != "") {
            rootMainLogger.debug("Load previous login_hash", { login_hash: this.persistentData.login_hash });
            if (md5(`${this.config.username}:${this.config.password}`) != this.persistentData.login_hash) {
                rootMainLogger.info("Authentication properties changed, invalidate saved cloud token.");
                this.persistentData.cloud_token = "";
                this.persistentData.cloud_token_expiration = 0;
                this.persistentData.httpApi = undefined;
            }
        } else {
            this.persistentData.cloud_token = "";
            this.persistentData.cloud_token_expiration = 0;
            this.persistentData.httpApi = undefined;
        }
        if (this.persistentData.country !== undefined && this.persistentData.country !== "" && this.persistentData.country !== this.config.country) {
            rootMainLogger.info("Country property changed, invalidate saved cloud token.");
            this.persistentData.cloud_token = "";
            this.persistentData.cloud_token_expiration = 0;
            this.persistentData.httpApi = undefined;
        }
        if (this.persistentData.httpApi !== undefined && (this.persistentData.httpApi.clientPrivateKey === undefined || this.persistentData.httpApi.clientPrivateKey === "" || this.persistentData.httpApi.serverPublicKey === undefined || this.persistentData.httpApi.serverPublicKey === "")) {
            rootMainLogger.debug("Incomplete persistent data for v2 encrypted cloud api communication. Invalidate authenticated session data.");
            this.persistentData.cloud_token = "";
            this.persistentData.cloud_token_expiration = 0;
            this.persistentData.httpApi = undefined;
        }

        this.api = await HTTPApi.initialize(this.config.country, this.config.username, this.config.password, this.persistentData.httpApi);
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

        if (this.persistentData.cloud_token && this.persistentData.cloud_token != "" && this.persistentData.cloud_token_expiration) {
            rootMainLogger.debug("Load previous token", { token: this.persistentData.cloud_token, tokenExpiration: this.persistentData.cloud_token_expiration, persistentHttpApi: this.persistentData.httpApi });
            this.api.setToken(this.persistentData.cloud_token);
            this.api.setTokenExpiration(new Date(this.persistentData.cloud_token_expiration));
        }
        if (!this.persistentData.openudid || this.persistentData.openudid == "") {
            this.persistentData.openudid = generateUDID();
            rootMainLogger.debug("Generated new openudid", { openudid: this.persistentData.openudid });
        }
        this.api.setOpenUDID(this.persistentData.openudid);
        if (!this.persistentData.serial_number || this.persistentData.serial_number == "") {
            this.persistentData.serial_number = generateSerialnumber(12);
            rootMainLogger.debug("Generated new serial_number", { serialnumber: this.persistentData.serial_number });
        }
        this.api.setSerialNumber(this.persistentData.serial_number);

        this.pushService = await PushNotificationService.initialize();
        this.pushService.on("connect", async (token: string) => {
            this.pushCloudRegistered = await this.api.registerPushToken(token);
            this.pushCloudChecked = await this.api.checkPushToken();
            //TODO: Retry if failed with max retry to not lock account

            if (this.pushCloudRegistered && this.pushCloudChecked) {
                rootMainLogger.info("Push notification connection successfully established");
                this.emit("push connect");
            } else {
                rootMainLogger.info("Push notification connection closed");
                this.emit("push close");
            }
        });
        this.pushService.on("credential", (credentials: Credentials) => {
            this.savePushCredentials(credentials);
        });
        this.pushService.on("message", (message: PushMessage) => this.onPushMessage(message));
        this.pushService.on("close", () => {
            rootMainLogger.info("Push notification connection closed");
            this.emit("push close");
        });

        await this.initMQTT();
    }

    private async initMQTT(): Promise<void> {
        this.mqttService = await MQTTService.init();
        this.mqttService.on("connect", () => {
            rootMainLogger.info("MQTT connection successfully established");
            this.emit("mqtt connect");
        });
        this.mqttService.on("close", () => {
            rootMainLogger.info("MQTT connection closed");
            this.emit("mqtt close");
        });
        this.mqttService.on("lock message", (message) => {
            this.getDevice(message.data.data.deviceSn).then((device: Device) => {
                (device as Lock).processMQTTNotification(message.data.data, this.config.eventDurationSeconds);
            }).catch((err) => {
                const error = ensureError(err);
                if (!(error instanceof DeviceNotFoundError)) {
                    rootMainLogger.error("Lock MQTT Message Error", { error: getError(error) });
                }
            }).finally(() => {
                this.emit("mqtt lock message", message);
            });
        });
    }

    public setLoggingLevel(category: LoggingCategories, level: LogLevel): void {
        if (typeof level === "number" &&
        Object.values(LogLevel).includes(level) &&
        typeof category === "string" &&
        ["all", "main", "http", "p2p" , "push", "mqtt"].includes(category.toLowerCase())) {
            setLoggingLevel(category, level);
        }
    }

    public getLoggingLevel(category: LoggingCategories): number {
        if (typeof category === "string" &&
        ["all", "main", "http", "p2p" , "push", "mqtt"].includes(category.toLowerCase())) {
            return getLoggingLevel(category);
        }
        return -1;
    }

    public setInternalLogger(logger: Logger): void {
        InternalLogger.logger = logger;
    }

    public getInternalLogger(): Logger|undefined {
        return InternalLogger.logger;
    }

    public getPushService(): PushNotificationService {
        return this.pushService;
    }

    private addStation(station: Station): void {
        const serial = station.getSerial();
        if (serial && !Object.keys(this.stations).includes(serial)) {
            this.stations[serial] = station;
            this.emit("station added", station);
        } else {
            rootMainLogger.debug(`Station with this serial ${station.getSerial()} exists already and couldn't be added again!`);
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
            rootMainLogger.debug(`Station with this serial ${station.getSerial()} doesn't exists and couldn't be removed!`);
        }
    }

    private async updateStation(hub: StationListResponse): Promise<void> {
        if (this.stationsLoaded)
            await this.stationsLoaded;
        if (Object.keys(this.stations).includes(hub.station_sn)) {
            this.stations[hub.station_sn].update(hub);
            if (!this.stations[hub.station_sn].isConnected() && !this.stations[hub.station_sn].isEnergySavingDevice() && this.stations[hub.station_sn].isP2PConnectableDevice()) {
                this.stations[hub.station_sn].setConnectionType(this.config.p2pConnectionSetup);
                rootMainLogger.debug(`Updating station cloud data - initiate station connection to get local data over p2p`, { stationSN: hub.station_sn });
                this.stations[hub.station_sn].connect();
            }
        } else {
            rootMainLogger.debug(`Station with this serial ${hub.station_sn} doesn't exists and couldn't be updated!`);
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
            rootMainLogger.debug(`Device with this serial ${device.getSerial()} exists already and couldn't be added again!`);
        }
    }

    private removeDevice(device: Device): void {
        const serial = device.getSerial()
        if (serial && Object.keys(this.devices).includes(serial)) {
            delete this.devices[serial];
            device.removeAllListeners();
            this.emit("device removed", device);
        } else {
            rootMainLogger.debug(`Device with this serial ${device.getSerial()} doesn't exists and couldn't be removed!`);
        }
    }

    private async updateDevice(device: DeviceListResponse): Promise<void> {
        if (this.devicesLoaded)
            await this.devicesLoaded;
        if (Object.keys(this.devices).includes(device.device_sn))
            this.devices[device.device_sn].update(device)
        else
            rootMainLogger.debug(`Device with this serial ${device.device_sn} doesn't exists and couldn't be updated!`);
    }

    public async getDevices(): Promise<Array<Device>> {
        if (this.devicesLoaded)
            await this.devicesLoaded;
        const arr: Array<Device> = [];
        Object.keys(this.devices).forEach((serialNumber: string) => {
            arr.push(this.devices[serialNumber]);
        });
        return arr;
    }

    public async getDevicesFromStation(stationSN: string): Promise<Array<Device>> {
        if (this.devicesLoaded)
            await this.devicesLoaded;
        const arr: Array<Device> = [];
        Object.keys(this.devices).forEach((serialNumber: string) => {
            if (this.devices[serialNumber].getStationSerial() === stationSN)
                arr.push(this.devices[serialNumber]);
        });
        return arr;
    }

    public async getDevice(deviceSN: string): Promise<Device> {
        if (this.devicesLoaded)
            await this.devicesLoaded;
        if (Object.keys(this.devices).includes(deviceSN))
            return this.devices[deviceSN];
        throw new DeviceNotFoundError("Device doesn't exists", { context: { device: deviceSN } });
    }

    public async getStationDevice(stationSN: string, channel: number): Promise<Device> {
        if (this.devicesLoaded)
            await this.devicesLoaded;
        for (const device of Object.values(this.devices)) {
            if ((device.getStationSerial() === stationSN && device.getChannel() === channel) || (device.getStationSerial() === stationSN && device.getSerial() === stationSN)) {
                return device;
            }
        }
        throw new DeviceNotFoundError("No device with passed channel found on station", { context: { station: stationSN, channel: channel } });
    }

    public async getStations(): Promise<Array<Station>> {
        if (this.stationsLoaded)
            await this.stationsLoaded;
        const arr: Array<Station> = [];
        Object.keys(this.stations).forEach((serialNumber: string) => {
            arr.push(this.stations[serialNumber]);
        });
        return arr;
    }

    public async getStation(stationSN: string): Promise<Station> {
        if (this.stationsLoaded)
            await this.stationsLoaded;
        if (Object.keys(this.stations).includes(stationSN))
            return this.stations[stationSN];
        throw new StationNotFoundError("Station doesn't exists", { context: { station: stationSN } });
    }

    public getApi(): HTTPApi {
        return this.api;
    }

    public async connectToStation(stationSN: string, p2pConnectionType: P2PConnectionType = P2PConnectionType.QUICKEST): Promise<void> {
        const station = await this.getStation(stationSN);
        if (station.isP2PConnectableDevice()) {
            station.setConnectionType(p2pConnectionType);
            rootMainLogger.debug(`Explicit request for p2p connection to the station`, { stationSN: station.getSerial() });
            await station.connect();
        }
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
        rootMainLogger.debug("Got houses", { houses: houses });
        //TODO: Finish implementation
        this.houses = houses;
    }

    private handleHubs(hubs: Hubs): void {
        rootMainLogger.debug("Got hubs", { hubs: hubs });
        const stationsSNs: string[] = Object.keys(this.stations);
        const newStationsSNs = Object.keys(hubs);
        const promises: Array<Promise<Station>> = [];
        for (const hub of Object.values(hubs)) {
            if (stationsSNs.includes(hub.station_sn)) {
                this.updateStation(hub);
            } else {
                if (this.stationsLoaded === undefined)
                    this.stationsLoaded = waitForEvent<void>(this.loadingEmitter, "stations loaded");
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
                        station.on("charging state", (station: Station, channel: number, chargeType: number, batteryLevel: number) => this.onStationChargingState(station, channel, chargeType, batteryLevel));
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
                        station.on("sensor status", (station: Station, channel: number, status: number) => this.onStationSensorStatus(station, channel, status));
                        station.on("garage door status", (station: Station, channel: number, doorId: number, status: number) => this.onStationGarageDoorStatus(station, channel, doorId, status));
                        station.on("storage info hb3", (station: Station, channel: number, storageInfo: StorageInfoBodyHB3) => this.onStorageInfoHb3(station, channel, storageInfo));
                        this.addStation(station);
                        station.initialize();
                    } catch (err) {
                        const error = ensureError(err);
                        rootMainLogger.error("HandleHubs Error", { error: getError(error), stationSN: station.getSerial() });
                    }
                    return station;
                }));
            }
        }
        Promise.all(promises).then(() => {
            this.loadingEmitter.emit("stations loaded");
            this.stationsLoaded = undefined;
        });
        if (promises.length === 0) {
            this.loadingEmitter.emit("stations loaded");
            this.stationsLoaded = undefined;
        }
        for (const stationSN of stationsSNs) {
            if (!newStationsSNs.includes(stationSN)) {
                this.getStation(stationSN).then((station: Station) => {
                    this.removeStation(station);
                }).catch((err) => {
                    const error = ensureError(err);
                    rootMainLogger.error("Error removing station", { error: getError(error), stationSN: stationSN });
                });
            }
        }
    }

    private refreshP2PData(station: Station): void {
        if (station.isStation() || (Device.isCamera(station.getDeviceType()) && !Device.isWiredDoorbell(station.getDeviceType()) || Device.isSmartSafe(station.getDeviceType()))) {
            station.getCameraInfo();
        }
        if (Device.isLock(station.getDeviceType())) {
            station.getLockParameters();
            station.getLockStatus();
        }
        if (station.isStation() || (station.hasProperty(PropertyName.StationSdStatus) && station.getPropertyValue(PropertyName.StationSdStatus) !== TFCardStatus.REMOVE)) {
            station.getStorageInfoEx();
        }
    }

    private onStationConnect(station: Station): void {
        this.emit("station connect", station);
        this.refreshP2PData(station);
        if (this.refreshEufySecurityP2PTimeout[station.getSerial()] !== undefined) {
            clearTimeout(this.refreshEufySecurityP2PTimeout[station.getSerial()]);
            delete this.refreshEufySecurityP2PTimeout[station.getSerial()];
        }
        this.refreshEufySecurityP2PTimeout[station.getSerial()] = setTimeout(() => {
            this.refreshP2PData(station);
        }, this.P2P_REFRESH_INTERVAL_MIN * 60 * 1000);
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
            }).catch((err) => {
                const error = ensureError(err);
                rootMainLogger.error(`Station close Error`, { error: getError(error), stationSN: station.getSerial() });
            });
        }
    }

    private handleDevices(devices: FullDevices): void {
        rootMainLogger.debug("Got devices", { devices: devices });
        const deviceSNs: string[] = Object.keys(this.devices);
        const newDeviceSNs = Object.keys(devices);
        const promises: Array<Promise<Device>> = [];
        const deviceConfig = this.config.deviceConfig as DeviceConfig;

        for (const device of Object.values(devices)) {

            if (deviceSNs.includes(device.device_sn)) {
                this.updateDevice(device);
            } else {
                if (this.devicesLoaded === undefined)
                    this.devicesLoaded = waitForEvent<void>(this.loadingEmitter, "devices loaded");
                let new_device: Promise<Device>;

                if (Device.isIndoorCamera(device.device_type)) {
                    new_device = IndoorCamera.getInstance(this.api, device, deviceConfig);
                } else if (Device.isSoloCameras(device.device_type)) {
                    new_device = SoloCamera.getInstance(this.api, device, deviceConfig);
                } else if (Device.isLockWifiVideo(device.device_type)) {
                    new_device = DoorbellLock.getInstance(this.api, device, deviceConfig);
                } else if (Device.isBatteryDoorbell(device.device_type)) {
                    new_device = BatteryDoorbellCamera.getInstance(this.api, device, deviceConfig);
                } else if (Device.isWiredDoorbell(device.device_type) || Device.isWiredDoorbellDual(device.device_type)) {
                    new_device = WiredDoorbellCamera.getInstance(this.api, device, deviceConfig);
                } else if (Device.isFloodLight(device.device_type)) {
                    new_device = FloodlightCamera.getInstance(this.api, device, deviceConfig);
                } else if (Device.isWallLightCam(device.device_type)) {
                    new_device = WallLightCam.getInstance(this.api, device, deviceConfig);
                } else if (Device.isGarageCamera(device.device_type)) {
                    new_device = GarageCamera.getInstance(this.api, device, deviceConfig);
                } else if (Device.isSmartDrop(device.device_type)) {
                    new_device = SmartDrop.getInstance(this.api, device, deviceConfig);
                } else if (Device.isCamera(device.device_type)) {
                    new_device = Camera.getInstance(this.api, device, deviceConfig);
                } else if (Device.isLock(device.device_type)) {
                    new_device = Lock.getInstance(this.api, device, deviceConfig);
                } else if (Device.isMotionSensor(device.device_type)) {
                    new_device = MotionSensor.getInstance(this.api, device, deviceConfig);
                } else if (Device.isEntrySensor(device.device_type)) {
                    new_device = EntrySensor.getInstance(this.api, device, deviceConfig);
                } else if (Device.isKeyPad(device.device_type)) {
                    new_device = Keypad.getInstance(this.api, device, deviceConfig);
                } else if (Device.isSmartSafe(device.device_type)) {
                    new_device = SmartSafe.getInstance(this.api, device, deviceConfig);
                } else if (Device.isSmartTrack(device.device_type)) {
                    new_device = Tracker.getInstance(this.api, device, deviceConfig);
                } else if (Device.isLockKeypad(device.device_type)) {
                    new_device = LockKeypad.getInstance(this.api, device, deviceConfig);
                } else {
                    new_device = UnknownDevice.getInstance(this.api, device, deviceConfig);
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
                        device.on("tampering", (device: Device, state: boolean) => this.onDeviceTampering(device, state));
                        device.on("low temperature", (device: Device, state: boolean) => this.onDeviceLowTemperature(device, state));
                        device.on("high temperature", (device: Device, state: boolean) => this.onDeviceHighTemperature(device, state));
                        device.on("pin incorrect", (device: Device, state: boolean) => this.onDevicePinIncorrect(device, state));
                        device.on("lid stuck", (device: Device, state: boolean) => this.onDeviceLidStuck(device, state));
                        device.on("battery fully charged", (device: Device, state: boolean) => this.onDeviceBatteryFullyCharged(device, state));
                        this.addDevice(device);
                        device.initialize();
                    } catch (err) {
                        const error = ensureError(err);
                        rootMainLogger.error("HandleDevices Error", { error: getError(error), deviceSN: device.getSerial() });
                    }
                    return device;
                }));
            }
        }
        Promise.all(promises).then((devices) => {
            devices.forEach((device) => {
                this.getStation(device.getStationSerial()).then((station: Station) => {
                    if (!station.isConnected() && station.isP2PConnectableDevice()) {
                        station.setConnectionType(this.config.p2pConnectionSetup);
                        rootMainLogger.debug(`Initiate first station connection to get data over p2p`, { stationSN: station.getSerial() });
                        station.connect();
                    }
                }).catch((err) => {
                    const error = ensureError(err);
                    rootMainLogger.error("Error trying to connect to station afte device loaded", { error: getError(error), deviceSN: device.getSerial() });
                });
            });
            this.loadingEmitter.emit("devices loaded");
            this.devicesLoaded = undefined;
        });
        if (promises.length === 0) {
            this.loadingEmitter.emit("devices loaded");
            this.devicesLoaded = undefined;
        }
        for (const deviceSN of deviceSNs) {
            if (!newDeviceSNs.includes(deviceSN)) {
                this.getDevice(deviceSN).then((device: Device) => {
                    this.removeDevice(device);
                }).catch((err) => {
                    const error = ensureError(err);
                    rootMainLogger.error("Error removing device", { error: getError(error), deviceSN: deviceSN });
                });
            }
        }
    }

    public async refreshCloudData(): Promise<void> {
        if (this.config.acceptInvitations) {
            await this.processInvitations().catch(err => {
                const error = ensureError(err);
                rootMainLogger.error("Error in processing invitations", { error: getError(error) });
            });
        }
        await this.api.refreshAllData().catch(err => {
            const error = ensureError(err);
            rootMainLogger.error("Error during API data refreshing", { error: getError(error) });
        });
        if (this.refreshEufySecurityCloudTimeout !== undefined)
            clearTimeout(this.refreshEufySecurityCloudTimeout);
        if (this.config.pollingIntervalMinutes > 0)
            this.refreshEufySecurityCloudTimeout = setTimeout(() => { this.refreshCloudData() }, this.config.pollingIntervalMinutes * 60 * 1000);
        else
            rootMainLogger.info(`Automatic retrieval of data from the cloud has been deactivated (config pollingIntervalMinutes: ${this.config.pollingIntervalMinutes})`);
    }

    public close(): void {
        for (const device_sn of this.cameraStationLivestreamTimeout.keys()) {
            this.stopStationLivestream(device_sn);
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
            .catch((err) => {
                const error = ensureError(err);
                rootMainLogger.error("Connect Error", { error: getError(error), options: options });
            });
    }

    public getPushPersistentIds(): string[] {
        return this.pushService.getPersistentIds();
    }

    private updateDeviceProperties(deviceSN: string, values: RawValues): void {
        this.getDevice(deviceSN).then((device: Device) => {
            device.updateRawProperties(values);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error("Update device properties error", { error: getError(error), deviceSN: deviceSN, values: values });
        });
    }

    private async onAPIClose(): Promise<void> {
        if (this.refreshEufySecurityCloudTimeout !== undefined)
            clearTimeout(this.refreshEufySecurityCloudTimeout);

        this.connected = false;
        this.emit("close");

        if (this.retries < 3) {
            this.retries++;
            await this.connect()
        } else {
            rootMainLogger.error(`Tried to re-authenticate to Eufy cloud, but failed in the process. Manual intervention is required!`);
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
            rootMainLogger.warn("No login data recevied to initialize MQTT connection...");
        }
    }

    private onAPIConnectionError(error: Error): void {
        this.emit("connection error", error);
    }

    public async startStationLivestream(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStartLivestream))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceStartLivestream } });

        const camera = device as Camera;
        if (!station.isLiveStreaming(camera)) {
            station.startLivestream(camera);

            if (this.cameraMaxLivestreamSeconds > 0) {
                this.cameraStationLivestreamTimeout.set(deviceSN, setTimeout(() => {
                    rootMainLogger.info(`Stopping the station stream for the device ${deviceSN}, because we have reached the configured maximum stream timeout (${this.cameraMaxLivestreamSeconds} seconds)`);
                    this.stopStationLivestream(deviceSN);
                }, this.cameraMaxLivestreamSeconds * 1000));
            }
        } else {
            rootMainLogger.warn(`The station stream for the device ${deviceSN} cannot be started, because it is already streaming!`);
        }
    }

    public async stopStationLivestream(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStopLivestream))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceStopLivestream } });

        if (station.isConnected() && station.isLiveStreaming(device)) {
            station.stopLivestream(device);
        } else {
            rootMainLogger.warn(`The station stream for the device ${deviceSN} cannot be stopped, because it isn't streaming!`);
        }

        const timeout = this.cameraStationLivestreamTimeout.get(deviceSN);
        if (timeout) {
            clearTimeout(timeout);
            this.cameraStationLivestreamTimeout.delete(deviceSN);
        }
    }

    private writePersistentData(): void {
        this.persistentData.login_hash = md5(`${this.config.username}:${this.config.password}`);
        if (this.api.isConnected()) {
            this.persistentData.httpApi = this.api?.getPersistentData();
            this.persistentData.country = this.api?.getCountry();
        }
        try {
            if(this.config.persistentData) {
                this.emit("persistent data", JSON.stringify(this.persistentData));
            } else {
                fse.writeFileSync(this.persistentFile, JSON.stringify(this.persistentData));
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error("WritePersistentData Error", { error: getError(error) });
        }
    }

    private saveCloudToken(): void {
        const token = this.api.getToken();
        const token_expiration = this.api.getTokenExpiration();

        if (!!token && !!token_expiration) {
            rootMainLogger.debug("Save cloud token and token expiration", { token: token, tokenExpiration: token_expiration });
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

        const invites = await this.api.getInvites().catch(err => {
            const error = ensureError(err);
            rootMainLogger.error("Error getting invites from cloud", { error: getError(error) });
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
                const result = await this.api.confirmInvites(confirmInvites).catch(err => {
                    const error = ensureError(err);
                    rootMainLogger.error("Error in confirmation of invitations", { error: getError(error), confirmInvites: confirmInvites });
                    return error;
                });
                if (result) {
                    rootMainLogger.info(`Accepted received invitations`, confirmInvites);
                    refreshCloud = true;
                }
            }
        }

        const houseInvites = await this.api.getHouseInviteList().catch(err => {
            const error = ensureError(err);
            rootMainLogger.error("Error getting house invites from cloud", { error: getError(error) });
            return error;
        });
        if (Object.keys(houseInvites).length > 0) {
            for(const invite of Object.values(houseInvites) as HouseInviteListResponse[]) {
                const result = await this.api.confirmHouseInvite(invite.house_id, invite.id).catch(err => {
                    const error = ensureError(err);
                    rootMainLogger.error("Error in confirmation of house invitations", { error: getError(error) });
                    return error;
                });
                if (result) {
                    rootMainLogger.info(`Accepted received house invitation from ${invite.action_user_email}`, { invite: invite });
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
            rootMainLogger.debug("Received push message", { message: message });
            try {
                if ((message.type === ServerPushEvent.INVITE_DEVICE || message.type === ServerPushEvent.HOUSE_INVITE) && this.config.acceptInvitations) {
                    if (this.isConnected())
                        this.processInvitations();
                }
            } catch (err) {
                const error = ensureError(err);
                rootMainLogger.error(`Error processing server push notification for device invitation`, { error: getError(error), message: message });
            }
            try {
                if (message.type === ServerPushEvent.REMOVE_DEVICE || message.type === ServerPushEvent.REMOVE_HOMEBASE || message.type === ServerPushEvent.HOUSE_REMOVE) {
                    if (this.isConnected())
                        this.refreshCloudData();
                }
            } catch (err) {
                const error = ensureError(err);
                rootMainLogger.error(`Error processing server push notification for device/station/house removal`, { error: getError(error), message: message });
            }
            this.getStations().then((stations: Station[]) => {
                stations.forEach(station => {
                    try {
                        station.processPushNotification(message);
                    } catch (err) {
                        const error = ensureError(err);
                        rootMainLogger.error(`Error processing push notification for station`, { error: getError(error), stationSN: station.getSerial(), message: message });
                    }
                });
            }).catch((err) => {
                const error = ensureError(err);
                rootMainLogger.error("Process push notification for stations", { error: getError(error), message: message });
            });
            this.getDevices().then((devices: Device[]) => {
                devices.forEach(device => {
                    this.getStation(device.getStationSerial()).then((station) => {
                        try {
                            device.processPushNotification(station, message, this.config.eventDurationSeconds);
                        } catch (err) {
                            const error = ensureError(err);
                            rootMainLogger.error(`Error processing push notification for device`, { error: getError(error), deviceSN: device.getSerial(), message: message });
                        }
                    }).catch((err) => {
                        const error = ensureError(err);
                        rootMainLogger.error("Process push notification for devices loading station", { error: getError(error), message: message });
                    });
                });
            }).catch((err) => {
                const error = ensureError(err);
                rootMainLogger.error("Process push notification for devices", { error: getError(error), message: message });
            });
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error("OnPushMessage Generic Error", { error: getError(error), message: message });
        }
    }

    public async startStationDownload(deviceSN: string, path: string, cipherID: number): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStartDownload))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceStartDownload, path: path, cipherID: cipherID } });

        if (!station.isDownloading(device)) {
            await station.startDownload(device, path, cipherID);
        } else {
            rootMainLogger.warn(`The station is already downloading a video for the device ${deviceSN}!`);
        }
    }

    public async cancelStationDownload(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceCancelDownload))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceCancelDownload } });

        if (station.isConnected() && station.isDownloading(device)) {
            station.cancelDownload(device);
        } else {
            rootMainLogger.warn(`The station isn't downloading a video for the device ${deviceSN}!`);
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
                station.enableDevice(device, value as boolean);
                break;
            case PropertyName.DeviceStatusLed:
                station.setStatusLed(device, value as boolean);
                break;
            case PropertyName.DeviceAutoNightvision:
                station.setAutoNightVision(device, value as boolean);
                break;
            case PropertyName.DeviceMotionDetection:
                station.setMotionDetection(device, value as boolean);
                break;
            case PropertyName.DeviceSoundDetection:
                station.setSoundDetection(device, value as boolean);
                break;
            case PropertyName.DevicePetDetection:
                station.setPetDetection(device, value as boolean);
                break;
            case PropertyName.DeviceRTSPStream:
                station.setRTSPStream(device, value as boolean);
                break;
            case PropertyName.DeviceAntitheftDetection:
                station.setAntiTheftDetection(device, value as boolean);
                break;
            case PropertyName.DeviceLocked:
                station.lockDevice(device, value as boolean);
                break;
            case PropertyName.DeviceWatermark:
                station.setWatermark(device, value as number);
                break;
            case PropertyName.DeviceLight:
                station.switchLight(device, value as boolean);
                break;
            case PropertyName.DeviceLightSettingsEnable:
                station.setFloodlightLightSettingsEnable(device, value as boolean);
                break;
            case PropertyName.DeviceLightSettingsBrightnessManual:
                station.setFloodlightLightSettingsBrightnessManual(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsBrightnessMotion:
                station.setFloodlightLightSettingsBrightnessMotion(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsBrightnessSchedule:
                station.setFloodlightLightSettingsBrightnessSchedule(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionTriggered:
                station.setFloodlightLightSettingsMotionTriggered(device, value as boolean);
                break;
            case PropertyName.DeviceLightSettingsMotionTriggeredDistance:
                station.setFloodlightLightSettingsMotionTriggeredDistance(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionTriggeredTimer:
                station.setFloodlightLightSettingsMotionTriggeredTimer(device, value as number);
                break;
            case PropertyName.DeviceMicrophone:
                station.setMicMute(device, value as boolean);
                break;
            case PropertyName.DeviceSpeaker:
                station.enableSpeaker(device, value as boolean);
                break;
            case PropertyName.DeviceSpeakerVolume:
                station.setSpeakerVolume(device, value as number);
                break;
            case PropertyName.DeviceAudioRecording:
                station.setAudioRecording(device, value as boolean);
                break;
            case PropertyName.DevicePowerSource:
                station.setPowerSource(device, value as number);
                break;
            case PropertyName.DevicePowerWorkingMode:
                station.setPowerWorkingMode(device, value as number);
                break;
            case PropertyName.DeviceRecordingEndClipMotionStops:
                station.setRecordingEndClipMotionStops(device, value as boolean);
                break;
            case PropertyName.DeviceRecordingClipLength:
                station.setRecordingClipLength(device, value as number);
                break;
            case PropertyName.DeviceRecordingRetriggerInterval:
                station.setRecordingRetriggerInterval(device, value as number);
                break;
            case PropertyName.DeviceVideoStreamingQuality:
                station.setVideoStreamingQuality(device, value as number);
                break;
            case PropertyName.DeviceVideoRecordingQuality:
                station.setVideoRecordingQuality(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivity:
                station.setMotionDetectionSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionTracking:
                station.setMotionTracking(device, value as boolean);
                break;
            case PropertyName.DeviceMotionDetectionType:
                station.setMotionDetectionType(device, value as number);
                break;
            case PropertyName.DeviceMotionZone:
                station.setMotionZone(device, value as MotionZone);
                break;
            case PropertyName.DeviceVideoWDR:
                station.setWDR(device, value as boolean);
                break;
            case PropertyName.DeviceRingtoneVolume:
                station.setRingtoneVolume(device, value as number);
                break;
            case PropertyName.DeviceChimeIndoor:
                station.enableIndoorChime(device, value as boolean);
                break;
            case PropertyName.DeviceChimeHomebase:
                station.enableHomebaseChime(device, value as boolean);
                break;
            case PropertyName.DeviceChimeHomebaseRingtoneVolume:
                station.setHomebaseChimeRingtoneVolume(device, value as number);
                break;
            case PropertyName.DeviceChimeHomebaseRingtoneType:
                station.setHomebaseChimeRingtoneType(device, value as number);
                break;
            case PropertyName.DeviceNotificationType:
                station.setNotificationType(device, value as NotificationType);
                break;
            case PropertyName.DeviceNotificationPerson:
                if (device.isIndoorPanAndTiltCameraS350()) {
                    station.setNotificationIndoor(device, IndoorS350NotificationTypes.HUMAN, value as boolean);
                } else if (device.isFloodLightT8425()) {
                    station.setNotificationFloodlightT8425(device, FloodlightT8425NotificationTypes.HUMAN, value as boolean);
                } else {
                    station.setNotificationPerson(device, value as boolean);
                }
                break;
            case PropertyName.DeviceNotificationPet:
                if (device.isIndoorPanAndTiltCameraS350()) {
                    station.setNotificationIndoor(device, IndoorS350NotificationTypes.PET, value as boolean);
                } else if (device.isFloodLightT8425()) {
                    station.setNotificationFloodlightT8425(device, FloodlightT8425NotificationTypes.PET, value as boolean);
                } else {
                    station.setNotificationPet(device, value as boolean);
                }
                break;
            case PropertyName.DeviceNotificationAllOtherMotion:
                if (device.isIndoorPanAndTiltCameraS350()) {
                    station.setNotificationIndoor(device, IndoorS350NotificationTypes.ALL_OTHER_MOTION, value as boolean);
                } else if (device.isFloodLightT8425()) {
                    station.setNotificationFloodlightT8425(device, FloodlightT8425NotificationTypes.ALL_OTHER_MOTION, value as boolean);
                } else {
                    station.setNotificationAllOtherMotion(device, value as boolean);
                }
                break;
            case PropertyName.DeviceNotificationAllSound:
                if (device.isIndoorPanAndTiltCameraS350()) {
                    station.setNotificationIndoor(device, IndoorS350NotificationTypes.ALL_SOUND, value as boolean);
                } else {
                    station.setNotificationAllSound(device, value as boolean);
                }
                break;
            case PropertyName.DeviceNotificationCrying:
                if (device.isIndoorPanAndTiltCameraS350()) {
                    station.setNotificationIndoor(device, IndoorS350NotificationTypes.CRYING, value as boolean);
                } else {
                    station.setNotificationCrying(device, value as boolean);
                }
                break;
            case PropertyName.DeviceNotificationVehicle:
                if (device.isFloodLightT8425()) {
                    station.setNotificationFloodlightT8425(device, FloodlightT8425NotificationTypes.VEHICLE, value as boolean);
                } else {
                    throw new InvalidPropertyError("Station has no writable property", { context: { station: station.getSerial(), propertyName: name, propertyValue: value } });
                }
                break;
            case PropertyName.DeviceNotificationMotion:
                station.setNotificationMotion(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationRing:
                station.setNotificationRing(device, value as boolean);
                break;
            case PropertyName.DeviceChirpVolume:
                station.setChirpVolume(device, value as number);
                break;
            case PropertyName.DeviceChirpTone:
                station.setChirpTone(device, value as number);
                break;
            case PropertyName.DeviceVideoHDR:
                station.setHDR(device, value as boolean);
                break;
            case PropertyName.DeviceVideoDistortionCorrection:
                station.setDistortionCorrection(device, value as boolean);
                break;
            case PropertyName.DeviceVideoRingRecord:
                station.setRingRecord(device, value as number);
                break;
            case PropertyName.DeviceRotationSpeed:
                station.setPanAndTiltRotationSpeed(device, value as number);
                break;
            case PropertyName.DeviceNightvision:
                station.setNightVision(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRange:
                station.setMotionDetectionRange(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRangeStandardSensitivity:
                station.setMotionDetectionRangeStandardSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity:
                station.setMotionDetectionRangeAdvancedLeftSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRangeAdvancedMiddleSensitivity:
                station.setMotionDetectionRangeAdvancedMiddleSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity:
                station.setMotionDetectionRangeAdvancedRightSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionTestMode:
                station.setMotionDetectionTestMode(device, value as boolean);
                break;
            case PropertyName.DeviceMotionTrackingSensitivity:
                station.setMotionTrackingSensitivity(device, value as number);
                break;
            case PropertyName.DeviceMotionAutoCruise:
                station.setMotionAutoCruise(device, value as boolean);
                break;
            case PropertyName.DeviceMotionOutOfViewDetection:
                station.setMotionOutOfViewDetection(device, value as boolean);
                break;
            case PropertyName.DeviceLightSettingsColorTemperatureManual:
                station.setLightSettingsColorTemperatureManual(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsColorTemperatureMotion:
                station.setLightSettingsColorTemperatureMotion(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsColorTemperatureSchedule:
                station.setLightSettingsColorTemperatureSchedule(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionActivationMode:
                station.setLightSettingsMotionActivationMode(device, value as number);
                break;
            case PropertyName.DeviceVideoNightvisionImageAdjustment:
                station.setVideoNightvisionImageAdjustment(device, value as boolean);
                break;
            case PropertyName.DeviceVideoColorNightvision:
                station.setVideoColorNightvision(device, value as boolean);
                break;
            case PropertyName.DeviceAutoCalibration:
                station.setAutoCalibration(device, value as boolean);
                break;
            case PropertyName.DeviceAutoLock:
                station.setAutoLock(device, value as boolean);
                break
            case PropertyName.DeviceAutoLockSchedule:
                station.setAutoLockSchedule(device, value as boolean);
                break
            case PropertyName.DeviceAutoLockScheduleStartTime:
                station.setAutoLockScheduleStartTime(device, value as string);
                break
            case PropertyName.DeviceAutoLockScheduleEndTime:
                station.setAutoLockScheduleEndTime(device, value as string);
                break
            case PropertyName.DeviceAutoLockTimer:
                station.setAutoLockTimer(device, value as number);
                break
            case PropertyName.DeviceOneTouchLocking:
                station.setOneTouchLocking(device, value as boolean);
                break
            case PropertyName.DeviceSound:
                station.setSound(device, value as number);
                break;
            case PropertyName.DeviceNotification:
                station.setNotification(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationLocked:
                station.setNotificationLocked(device, value as boolean);
                break;
            case PropertyName.DeviceNotificationUnlocked:
                station.setNotificationUnlocked(device, value as boolean);
                break;
            case PropertyName.DeviceScramblePasscode:
                station.setScramblePasscode(device,value as boolean);
                break;
            case PropertyName.DeviceWrongTryProtection:
                station.setWrongTryProtection(device, value as boolean);
                break;
            case PropertyName.DeviceWrongTryAttempts:
                station.setWrongTryAttempts(device, value as number);
                break;
            case PropertyName.DeviceWrongTryLockdownTime:
                station.setWrongTryLockdownTime(device, value as number);
                break;
            case PropertyName.DeviceLoiteringDetection:
                station.setLoiteringDetection(device, value as boolean);
                break;
            case PropertyName.DeviceLoiteringDetectionRange:
                station.setLoiteringDetectionRange(device, value as number);
                break;
            case PropertyName.DeviceLoiteringDetectionLength:
                station.setLoiteringDetectionLength(device, value as number);
                break;
            case PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse:
                station.setLoiteringCustomResponseAutoVoiceResponse(device, value as boolean);
                break;
            case PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification:
                station.setLoiteringCustomResponseHomeBaseNotification(device, value as boolean);
                break;
            case PropertyName.DeviceLoiteringCustomResponsePhoneNotification:
                station.setLoiteringCustomResponsePhoneNotification(device, value as boolean);
                break;
            case PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice:
                station.setLoiteringCustomResponseAutoVoiceResponseVoice(device, value as number);
                break;
            case PropertyName.DeviceLoiteringCustomResponseTimeFrom:
                station.setLoiteringCustomResponseTimeFrom(device, value as string);
                break;
            case PropertyName.DeviceLoiteringCustomResponseTimeTo:
                station.setLoiteringCustomResponseTimeTo(device, value as string);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityMode:
                station.setMotionDetectionSensitivityMode(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityStandard:
                station.setMotionDetectionSensitivityStandard(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedA:
                station.setMotionDetectionSensitivityAdvancedA(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedB:
                station.setMotionDetectionSensitivityAdvancedB(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedC:
                station.setMotionDetectionSensitivityAdvancedC(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedD:
                station.setMotionDetectionSensitivityAdvancedD(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedE:
                station.setMotionDetectionSensitivityAdvancedE(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedF:
                station.setMotionDetectionSensitivityAdvancedF(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedG:
                station.setMotionDetectionSensitivityAdvancedG(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionSensitivityAdvancedH:
                station.setMotionDetectionSensitivityAdvancedH(device, value as number);
                break;
            case PropertyName.DeviceDeliveryGuard:
                station.setDeliveryGuard(device, value as boolean);
                break;
            case PropertyName.DeviceDeliveryGuardPackageGuarding:
                station.setDeliveryGuardPackageGuarding(device, value as boolean);
                break;
            case PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice:
                station.setDeliveryGuardPackageGuardingVoiceResponseVoice(device, value as number);
                break;
            case PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom:
                station.setDeliveryGuardPackageGuardingActivatedTimeFrom(device, value as string);
                break;
            case PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo:
                station.setDeliveryGuardPackageGuardingActivatedTimeTo(device, value as string);
                break;
            case PropertyName.DeviceDeliveryGuardUncollectedPackageAlert:
                station.setDeliveryGuardUncollectedPackageAlert(device, value as boolean);
                break;
            case PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance:
                station.setDeliveryGuardPackageLiveCheckAssistance(device, value as boolean);
                break;
            case PropertyName.DeviceDualCamWatchViewMode:
                station.setDualCamWatchViewMode(device, value as number);
                break;
            case PropertyName.DeviceRingAutoResponse:
                station.setRingAutoResponse(device, value as boolean);
                break;
            case PropertyName.DeviceRingAutoResponseVoiceResponse:
                station.setRingAutoResponseVoiceResponse(device, value as boolean);
                break;
            case PropertyName.DeviceRingAutoResponseVoiceResponseVoice:
                station.setRingAutoResponseVoiceResponseVoice(device, value as number);
                break;
            case PropertyName.DeviceRingAutoResponseTimeFrom:
                station.setRingAutoResponseTimeFrom(device, value as string);
                break;
            case PropertyName.DeviceRingAutoResponseTimeTo:
                station.setRingAutoResponseTimeTo(device, value as string);
                break;
            case PropertyName.DeviceNotificationRadarDetector:
                station.setNotificationRadarDetector(device, value as boolean);
                break;
            case PropertyName.DeviceSoundDetectionSensitivity:
                station.setSoundDetectionSensitivity(device, value as number);
                break;
            case PropertyName.DeviceContinuousRecording:
                station.setContinuousRecording(device, value as boolean);
                break;
            case PropertyName.DeviceContinuousRecordingType:
                station.setContinuousRecordingType(device, value as number);
                break;
            case PropertyName.DeviceDefaultAngle:
                station.enableDefaultAngle(device, value as boolean);
                break;
            case PropertyName.DeviceDefaultAngleIdleTime:
                station.setDefaultAngleIdleTime(device, value as number);
                break;
            case PropertyName.DeviceNotificationIntervalTime:
                station.setNotificationIntervalTime(device, value as number);
                break;
            case PropertyName.DeviceSoundDetectionRoundLook:
                station.setSoundDetectionRoundLook(device, value as boolean);
                break;
            case PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck:
                station.setDeliveryGuardUncollectedPackageAlertTimeToCheck(device, value as string);
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
                station.setSmartSafeParams(device, name, value as PropertyValue);
                break;
            case PropertyName.DeviceVideoTypeStoreToNAS:
                station.setVideoTypeStoreToNAS(device, value as number);
                break;
            case PropertyName.DeviceMotionDetectionTypeHumanRecognition:
                station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.HUMAN_RECOGNITION, value as boolean);
                break;
            case PropertyName.DeviceMotionDetectionTypeHuman:
                if (device.isWallLightCam()) {
                    station.setMotionDetectionTypeHuman(device, value as boolean);
                } else if (device.isOutdoorPanAndTiltCamera()) {
                    station.setMotionDetectionTypeHB3(device, T8170DetectionTypes.HUMAN_DETECTION, value as boolean);
                } else if (device.isSoloCameras()) {
                    station.setMotionDetectionTypeHB3(device, SoloCameraDetectionTypes.HUMAN_DETECTION, value as boolean);
                } else if (device.isIndoorPanAndTiltCameraS350()) {
                    station.setMotionDetectionTypeHB3(device, IndoorS350DetectionTypes.HUMAN_DETECTION, value as boolean);
                } else {
                    station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.HUMAN_DETECTION, value as boolean);
                }
                break;
            case PropertyName.DeviceMotionDetectionTypePet:
                if (device.isIndoorPanAndTiltCameraS350()) {
                    station.setMotionDetectionTypeHB3(device, IndoorS350DetectionTypes.PET_DETECTION, value as boolean);
                } else {
                    station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.PET_DETECTION, value as boolean);
                }
                break;
            case PropertyName.DeviceMotionDetectionTypeVehicle:
                if (device.isOutdoorPanAndTiltCamera()) {
                    station.setMotionDetectionTypeHB3(device, T8170DetectionTypes.VEHICLE_DETECTION, value as boolean);
                } else {
                    station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.VEHICLE_DETECTION, value as boolean);
                }
                break;
            case PropertyName.DeviceMotionDetectionTypeAllOtherMotions:
                if (device.isWallLightCam()) {
                    station.setMotionDetectionTypeAllOtherMotions(device, value as boolean);
                } else if (device.isOutdoorPanAndTiltCamera()) {
                    station.setMotionDetectionTypeHB3(device, T8170DetectionTypes.ALL_OTHER_MOTION, value as boolean);
                } else if (device.isSoloCameras()) {
                    station.setMotionDetectionTypeHB3(device, SoloCameraDetectionTypes.ALL_OTHER_MOTION, value as boolean);
                } else if (device.isIndoorPanAndTiltCameraS350()) {
                    station.setMotionDetectionTypeHB3(device, IndoorS350DetectionTypes.ALL_OTHER_MOTION, value as boolean);
                } else {
                    station.setMotionDetectionTypeHB3(device, HB3DetectionTypes.ALL_OTHER_MOTION, value as boolean);
                }
                break;
            case PropertyName.DeviceLightSettingsManualLightingActiveMode:
                station.setLightSettingsManualLightingActiveMode(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsManualDailyLighting:
                station.setLightSettingsManualDailyLighting(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsManualColoredLighting:
                station.setLightSettingsManualColoredLighting(device, value as RGBColor);
                break;
            case PropertyName.DeviceLightSettingsManualDynamicLighting:
                station.setLightSettingsManualDynamicLighting(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionLightingActiveMode:
                station.setLightSettingsMotionLightingActiveMode(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionDailyLighting:
                station.setLightSettingsMotionDailyLighting(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsMotionColoredLighting:
                station.setLightSettingsMotionColoredLighting(device, value as RGBColor);
                break;
            case PropertyName.DeviceLightSettingsMotionDynamicLighting:
                station.setLightSettingsMotionDynamicLighting(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsScheduleLightingActiveMode:
                station.setLightSettingsScheduleLightingActiveMode(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsScheduleDailyLighting:
                station.setLightSettingsScheduleDailyLighting(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsScheduleColoredLighting:
                station.setLightSettingsScheduleColoredLighting(device, value as RGBColor);
                break;
            case PropertyName.DeviceLightSettingsScheduleDynamicLighting:
                station.setLightSettingsScheduleDynamicLighting(device, value as number);
                break;
            case PropertyName.DeviceLightSettingsColoredLightingColors:
                station.setLightSettingsColoredLightingColors(device, value as RGBColor[]);
                break;
            case PropertyName.DeviceLightSettingsDynamicLightingThemes:
                station.setLightSettingsDynamicLightingThemes(device, value as DynamicLighting[]);
                break;
            case PropertyName.DeviceDoorControlWarning:
                station.setDoorControlWarning(device, value as boolean);
                break;
            case PropertyName.DeviceDoor1Open:
                station.openDoor(device, value as boolean, 1);
                break;
            case PropertyName.DeviceDoor2Open:
                station.openDoor(device, value as boolean, 2);
                break;
            case PropertyName.DeviceLeftBehindAlarm: {
                const tracker = device as Tracker;
                const result = await tracker.setLeftBehindAlarm(value as boolean);
                if (result) {
                    device.updateProperty(name, value as boolean)
                }
                break;
            }
            case PropertyName.DeviceFindPhone: {
                const tracker = device as Tracker;
                const result = await tracker.setFindPhone(value as boolean);
                if (result) {
                    device.updateProperty(name, value as boolean)
                }
                break;
            }
            case PropertyName.DeviceTrackerType: {
                const tracker = device as Tracker;
                const result = await tracker.setTrackerType(value as number);
                if (result) {
                    device.updateProperty(name, value as number)
                }
                break;
            }
            case PropertyName.DeviceImageMirrored:
                station.setMirrorMode(device, value as boolean);
                break;
            case PropertyName.DeviceFlickerAdjustment:
                station.setFlickerAdjustment(device, value as number);
                break;
            case PropertyName.DeviceSoundDetectionType:
                station.setSoundDetectionType(device, value as number);
                break;
            case PropertyName.DeviceLeavingDetection:
                station.setLeavingDetection(device, value as boolean);
                break;
            case PropertyName.DeviceLeavingReactionNotification:
                station.setLeavingReactionNotification(device, value as boolean);
                break;
            case PropertyName.DeviceLeavingReactionStartTime:
                station.setLeavingReactionStartTime(device, value as string);
                break;
            case PropertyName.DeviceLeavingReactionEndTime:
                station.setLeavingReactionEndTime(device, value as string);
                break;
            case PropertyName.DeviceBeepVolume:
                station.setBeepVolume(device, value as number);
                break;
            case PropertyName.DeviceNightvisionOptimization:
                station.setNightvisionOptimization(device, value as boolean);
                break;
            case PropertyName.DeviceNightvisionOptimizationSide:
                station.setNightvisionOptimizationSide(device, value as number);
                break;
            case PropertyName.DeviceOpenMethod:
                station.setOpenMethod(device, value as number);
                break;
            case PropertyName.DeviceMotionActivatedPrompt:
                station.setMotionActivatedPrompt(device, value as boolean);
                break;
            default:
                if (!Object.values(PropertyName).includes(name as PropertyName))
                    throw new ReadOnlyPropertyError("Property is read only", { context: { device: deviceSN, propertyName: name, propertyValue: value } });
                throw new InvalidPropertyError("Device has no writable property", { context: { device: deviceSN, propertyName: name, propertyValue: value } });
        }
    }

    public async setStationProperty(stationSN: string, name: string, value: unknown): Promise<void> {
        const station = await this.getStation(stationSN);
        const metadata = station.getPropertyMetadata(name);
        value = parseValue(metadata, value);

        switch (name) {
            case PropertyName.StationGuardMode:
                station.setGuardMode(value as number);
                break;
            case PropertyName.StationAlarmTone:
                station.setStationAlarmTone(value as number);
                break;
            case PropertyName.StationAlarmVolume:
                station.setStationAlarmRingtoneVolume(value as number);
                break;
            case PropertyName.StationPromptVolume:
                station.setStationPromptVolume(value as number);
                break;
            case PropertyName.StationNotificationSwitchModeApp:
                station.setStationNotificationSwitchMode(NotificationSwitchMode.APP, value as boolean);
                break;
            case PropertyName.StationNotificationSwitchModeGeofence:
                station.setStationNotificationSwitchMode(NotificationSwitchMode.GEOFENCE, value as boolean);
                break;
            case PropertyName.StationNotificationSwitchModeSchedule:
                station.setStationNotificationSwitchMode(NotificationSwitchMode.SCHEDULE, value as boolean);
                break;
            case PropertyName.StationNotificationSwitchModeKeypad:
                station.setStationNotificationSwitchMode(NotificationSwitchMode.KEYPAD, value as boolean);
                break;
            case PropertyName.StationNotificationStartAlarmDelay:
                station.setStationNotificationStartAlarmDelay(value as boolean);
                break;
            case PropertyName.StationTimeFormat:
                station.setStationTimeFormat(value as number);
                break;
            case PropertyName.StationSwitchModeWithAccessCode:
                station.setStationSwitchModeWithAccessCode(value as boolean);
                break;
            case PropertyName.StationAutoEndAlarm:
                station.setStationAutoEndAlarm(value as boolean);
                break;
            case PropertyName.StationTurnOffAlarmWithButton:
                station.setStationTurnOffAlarmWithButton(value as boolean);
                break;
            case PropertyName.StationCrossCameraTracking:
                station.setCrossCameraTracking(value as boolean);
                break;
            case PropertyName.StationContinuousTrackingTime:
                station.setContinuousTrackingTime(value as number);
                break;
            case PropertyName.StationTrackingAssistance:
                station.setTrackingAssistance(value as boolean);
                break;
            case PropertyName.StationCrossTrackingCameraList:
                station.setCrossTrackingCameraList(value as Array<string>);
                break;
            case PropertyName.StationCrossTrackingGroupList:
                station.setCrossTrackingGroupList(value as Array<CrossTrackingGroupEntry>);
                break;
            default:
                if (!Object.values(PropertyName).includes(name as PropertyName))
                    throw new ReadOnlyPropertyError("Property is read only", { context: { station: stationSN, propertyName: name, propertyValue: value } });
                throw new InvalidPropertyError("Station has no writable property", { context: { station: stationSN, propertyName: name, propertyValue: value } });
        }
    }

    private onStartStationLivestream(station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station livestream start", station, device, metadata, videostream, audiostream);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station start livestream error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, metadata: metadata });
        });
    }

    private onStopStationLivestream(station: Station, channel:number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station livestream stop", station, device);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station stop livestream error`, { error: getError(error), stationSN: station.getSerial(), channel: channel });
        });
    }

    private onErrorStationLivestream(station: Station, channel:number, origError: Error): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            station.stopLivestream(device);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station livestream error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, origError: getError(origError) });
        });
    }

    private onStartStationRTSPLivestream(station: Station, channel:number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station rtsp livestream start", station, device);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station start rtsp livestream error`, { error: getError(error), stationSN: station.getSerial(), channel: channel });
        });
    }

    private onStopStationRTSPLivestream(station: Station, channel:number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station rtsp livestream stop", station, device);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station stop rtsp livestream error`, { error: getError(error), stationSN: station.getSerial(), channel: channel });
        });
    }

    private onStationStartDownload(station: Station, channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station download start", station, device, metadata, videoStream, audioStream);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station start download error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, metadata: metadata });
        });
    }

    private onStationFinishDownload(station: Station, channel: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station download finish", station, device);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station finish download error`, { error: getError(error), stationSN: station.getSerial(), channel: channel });
        });
    }

    private onStationCommandResult(station: Station, result: CommandResult): void {
        this.emit("station command result", station, result);
        if (result.return_code === 0) {
            if (result.customData !== undefined && result.customData.onSuccess !== undefined) {
                try {
                    result.customData.onSuccess();
                } catch (err) {
                    const error = ensureError(err);
                    rootMainLogger.error(`Station command result - onSuccess callback error`, { error: getError(error), stationSN: station.getSerial(), result: result });
                }
            }
            this.getStationDevice(station.getSerial(), result.channel).then((device: Device) => {
                if ((result.customData !== undefined && result.customData.property !== undefined && !device.isLockWifiR10() && !device.isLockWifiR20() && !device.isSmartSafe() && !device.isLockWifiT8506() && !device.isLockWifiT8502() && !device.isLockWifiT8510P() && !device.isLockWifiT8520P()) ||
                    (result.customData !== undefined && result.customData.property !== undefined && device.isSmartSafe() && result.command_type !== CommandType.CMD_SMARTSAFE_SETTINGS) ||
                    (result.customData !== undefined && result.customData.property !== undefined && (device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) && result.command_type !== CommandType.CMD_DOORLOCK_SET_PUSH_MODE)) {
                    if (device.hasProperty(result.customData.property.name)) {
                        const metadata = device.getPropertyMetadata(result.customData.property.name);
                        if (typeof result.customData.property.value !== "object" || metadata.type === "object") {
                            device.updateProperty(result.customData.property.name, result.customData.property.value);
                        }
                    } else if (station.hasProperty(result.customData.property.name)) {
                        const metadata = station.getPropertyMetadata(result.customData.property.name);
                        if (typeof result.customData.property.value !== "object" || metadata.type === "object") {
                            station.updateProperty(result.customData.property.name, result.customData.property.value);
                        }
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
                    }).catch(err => {
                        const error = ensureError(err);
                        rootMainLogger.error("Error during API data refreshing", { error: getError(error) });
                    });
                }
            }).catch((err) => {
                const error = ensureError(err);
                if (error instanceof DeviceNotFoundError) {
                    if (result.customData !== undefined && result.customData.property !== undefined) {
                        station.updateProperty(result.customData.property.name, result.customData.property.value);
                    }
                } else {
                    rootMainLogger.error(`Station command result error`, { error: getError(error), stationSN: station.getSerial(), result: result });
                }
            });
            if (station.isIntegratedDevice() && result.command_type === CommandType.CMD_SET_ARMING && station.isConnected() && station.getDeviceType() !== DeviceType.DOORBELL) {
                station.getCameraInfo();
            }
        } else {
            if (result.customData !== undefined && result.customData.onFailure !== undefined) {
                try {
                    result.customData.onFailure();
                } catch (err) {
                    const error = ensureError(err);
                    rootMainLogger.error(`Station command result - onFailure callback error`, { error: getError(error), stationSN: station.getSerial(), result: result });
                }
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
                                this.emit("user error", device, customValue.username, new AddUserError("Passcode already used by another user, please choose a different one", { context: { device: device.getSerial(), username: customValue.username, schedule: customValue.schedule } }));
                                break;
                            default:
                                this.emit("user error", device, customValue.username, new AddUserError("Error creating user", { context: { device: device.getSerial(), username: customValue.username, schedule: customValue.schedule, returnode: result.return_code } }));
                                break;
                        }
                    });
                    break;
                case CommandName.DeviceDeleteUser:
                    this.getStationDevice(station.getSerial(), result.channel).then((device: Device) => {
                        switch (result.return_code) {
                            case 0:
                                this.api.deleteUser(device.getSerial(), customValue.shortUserId, device.getStationSerial()).then((result) => {
                                    if (result) {
                                        this.emit("user deleted", device, customValue.username);
                                    } else {
                                        this.emit("user error", device, customValue.username, new DeleteUserError("Error in deleting user through cloud api call", { context: { device: device.getSerial(), username: customValue.username, shortUserId: customValue.short_user_id } }));
                                    }
                                });

                                break;
                            default:
                                this.emit("user error", device, customValue.username, new DeleteUserError("Error deleting user", { context: { device: device.getSerial(), username: customValue.username, shortUserId: customValue.short_user_id, returnCode: result.return_code } }));
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
                                this.emit("user error", device, customValue.username, new UpdateUserPasscodeError("Error updating user passcode", { context: { device: device.getSerial(), username: customValue.username, returnCode: result.return_code } }));
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
                                this.emit("user error", device, customValue.username, new UpdateUserScheduleError("Error updating user schedule", { context: { device: device.getSerial(), username: customValue.username, schedule: customValue.schedule, returnCode: result.return_code } }));
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
            }).catch((err) => {
                const error = ensureError(err);
                if (error instanceof DeviceNotFoundError) {
                    if (result.customData !== undefined && result.customData.property !== undefined) {
                        station.updateProperty(result.customData.property.name, result.customData.property.value);
                    }
                } else {
                    rootMainLogger.error(`Station secondary command result error`, { error: getError(error), stationSN: station.getSerial(), result: result });
                }
            });
        }
    }

    private onStationRtspUrl(station: Station, channel:number, value: string): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station rtsp url", station, device, value);
            device.setCustomPropertyValue(PropertyName.DeviceRTSPStreamUrl, value);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station rtsp url error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, url: value });
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
                }).catch((err) => {
                    const error = ensureError(err);
                    rootMainLogger.error(`Device property changed error - station enable rtsp`, { error: getError(error), deviceSN: device.getSerial(), stationSN: device.getStationSerial(), propertyName: name, propertyValue: value, ready: ready });
                });
            } else if (name === PropertyName.DeviceRTSPStream && (value as boolean) === false) {
                device.setCustomPropertyValue(PropertyName.DeviceRTSPStreamUrl, "");
            } else if (name === PropertyName.DevicePictureUrl && value !== "") {
                if (!isValidUrl(value as string)) {
                    this.getStation(device.getStationSerial()).then((station: Station) => {
                        if (station.hasCommand(CommandName.StationDownloadImage)) {
                            station.downloadImage(value as string);
                        }
                    }).catch((err) => {
                        const error = ensureError(err);
                        rootMainLogger.error(`Device property changed error - station download image`, { error: getError(error), deviceSN: device.getSerial(), stationSN: device.getStationSerial(), propertyName: name, propertyValue: value, ready: ready });
                    });
                }
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error(`Device property changed error`, { error: getError(error), deviceSN: device.getSerial(), stationSN: device.getStationSerial(), propertyName: name, propertyValue: value, ready: ready });
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
                }).catch((err) => {
                    const error = ensureError(err);
                    rootMainLogger.error(`Device ready error - station enable rtsp`, { error: getError(error), deviceSN: device.getSerial(), stationSN: device.getStationSerial() });
                });
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error(`Device ready error`, { error: getError(error), deviceSN: device.getSerial(), stationSN: device.getStationSerial() });
        }
    }

    private onStationRuntimeState(station: Station, channel: number, batteryLevel: number, temperature: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceBattery)) {
                const metadataBattery = device.getPropertyMetadata(PropertyName.DeviceBattery);
                device.updateRawProperty(metadataBattery.key as number, batteryLevel.toString(), "p2p");
            }
            if (device.hasProperty(PropertyName.DeviceBatteryTemp)) {
                const metadataBatteryTemperature = device.getPropertyMetadata(PropertyName.DeviceBatteryTemp);
                device.updateRawProperty(metadataBatteryTemperature.key as number, temperature.toString(), "p2p");
            }
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station runtime state error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, batteryLevel: batteryLevel, temperature: temperature });
        });
    }

    private onStationChargingState(station: Station, channel: number, chargeType: number, batteryLevel: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceBattery)) {
                const metadataBattery = device.getPropertyMetadata(PropertyName.DeviceBattery);
                if (isCharging(chargeType) && batteryLevel > 0)
                    device.updateRawProperty(metadataBattery.key as number, batteryLevel.toString(), "p2p");
            }
            if (device.hasProperty(PropertyName.DeviceChargingStatus)) {
                const metadataChargingStatus = device.getPropertyMetadata(PropertyName.DeviceChargingStatus);
                device.updateRawProperty(metadataChargingStatus.key as number, chargeType.toString(), "p2p");
            }
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station charging state error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, chargeType: chargeType, charging: isCharging(chargeType), batteryLevel: batteryLevel });
        });
    }

    private onStationWifiRssi(station: Station, channel: number, rssi: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceWifiRSSI)) {
                const metadataWifiRssi = device.getPropertyMetadata(PropertyName.DeviceWifiRSSI);
                device.updateRawProperty(metadataWifiRssi.key as number, rssi.toString(), "p2p");
            }
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station wifi rssi error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, rssi: rssi });
        });
    }

    private onCaptchaRequest(id: string, captcha: string): void {
        this.emit("captcha request", id, captcha);
    }

    private onFloodlightManualSwitch(station: Station, channel: number, enabled: boolean): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceLight)) {
                const metadataLight = device.getPropertyMetadata(PropertyName.DeviceLight);
                device.updateRawProperty(metadataLight.key as number, enabled === true ? "1" : "0", "p2p");
            }
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station floodlight manual switch error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, enabled: enabled });
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
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station talkback start error`, { error: getError(error), stationSN: station.getSerial(), channel: channel });
        });
    }

    private onStationTalkbackStop(station: Station, channel: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            this.emit("station talkback stop", station, device);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station talkback stop error`, { error: getError(error), stationSN: station.getSerial(), channel: channel });
        });
    }

    private onStationTalkbackError(station: Station, channel:number, origError: Error): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            station.stopTalkback(device);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station talkback error`, { error: getError(error), stationSN: station.getSerial(), channel: channel, origError: getError(origError) });
        });
    }

    public async startStationTalkback(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStartTalkback))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceStartTalkback } });

        if (station.isLiveStreaming(device)) {
            if (!station.isTalkbackOngoing(device)) {
                station.startTalkback(device);
            } else {
                rootMainLogger.warn(`The station talkback for the device ${deviceSN} cannot be started, because it is ongoing!`);
            }
        } else {
            rootMainLogger.warn(`The station talkback for the device ${deviceSN} cannot be started, because it isn't live streaming!`);
        }
    }

    public async stopStationTalkback(deviceSN: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStopTalkback))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceStopTalkback } });

        if (station.isLiveStreaming(device)) {
            if (station.isTalkbackOngoing(device)) {
                station.stopTalkback(device);
            } else {
                rootMainLogger.warn(`The station talkback for the device ${deviceSN} cannot be stopped, because it isn't ongoing!`);
            }
        } else {
            rootMainLogger.warn(`The station talkback for the device ${deviceSN} cannot be stopped, because it isn't live streaming!`);
        }
    }

    private onStationDeviceShakeAlarm(deviceSN: string, event: SmartSafeShakeAlarmEvent): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).shakeEvent(event, this.config.eventDurationSeconds);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`onStationDeviceShakeAlarm error`, { error: getError(error), deviceSN: deviceSN, event: SmartSafeShakeAlarmEvent[event] });
        });
    }

    private onStationDevice911Alarm(deviceSN: string, event: SmartSafeAlarm911Event): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).alarm911Event(event, this.config.eventDurationSeconds);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`onStationDevice911Alarm error`, { error: getError(error), deviceSN: deviceSN, event: SmartSafeAlarm911Event[event] });
        });
    }

    private onStationDeviceJammed(deviceSN: string): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).jammedEvent(this.config.eventDurationSeconds);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`onStationDeviceJammed error`, { error: getError(error), deviceSN: deviceSN });
        });
    }

    private onStationDeviceLowBattery(deviceSN: string): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).lowBatteryEvent(this.config.eventDurationSeconds);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`onStationDeviceLowBattery error`, { error: getError(error), deviceSN: deviceSN });
        });
    }

    private onStationDeviceWrongTryProtectAlarm(deviceSN: string): void {
        this.getDevice(deviceSN).then((device: Device) => {
            if (device.isSmartSafe())
                (device as SmartSafe).wrongTryProtectAlarmEvent(this.config.eventDurationSeconds);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`onStationDeviceWrongTryProtectAlarm error`, { error: getError(error), deviceSN: deviceSN });
        });
    }

    public async addUser(deviceSN: string, username: string, passcode: string, schedule?: Schedule): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        try {
            if (!device.hasCommand(CommandName.DeviceAddUser))
                throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceAddUser, username: username, passcode: "[redacted]", schedule: schedule } });

            const addUserResponse = await this.api.addUser(deviceSN, username, device.getStationSerial());
            if (addUserResponse !== null) {
                station.addUser(device, username, addUserResponse.short_user_id, passcode, schedule);
            } else {
                this.emit("user error", device, username, new AddUserError("Error on creating user through cloud api call", { context: { deivce: deviceSN, username: username, passcode: "[redacted]", schedule: schedule } }));
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error(`addUser error`, { error: getError(error), deviceSN: deviceSN, username: username, schedule: schedule });
            this.emit("user error", device, username, new AddUserError("Generic error", { cause: error, context: { device: deviceSN, username: username, passcode: "[redacted]", schedule: schedule } }));
        }
    }

    public async deleteUser(deviceSN: string, username: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceDeleteUser))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceDeleteUser, username: username } });

        try {
            const users = await this.api.getUsers(deviceSN, device.getStationSerial());
            if (users !== null) {
                let found = false;
                for (const user of users) {
                    if (user.user_name === username) {
                        station.deleteUser(device, user. user_name, user.short_user_id);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.emit("user error", device, username, new DeleteUserError("User not found", { context: { device: deviceSN, username: username } }));
                }
            } else {
                this.emit("user error", device, username, new DeleteUserError("Error on getting user list through cloud api call", { context: { device: deviceSN, username: username } }));
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error(`deleteUser error`, { error: getError(error), deviceSN: deviceSN, username: username });
            this.emit("user error", device, username, new DeleteUserError("Generic error", { cause: error, context: { device: deviceSN, username: username } }));
        }
    }

    public async updateUser(deviceSN: string, username: string, newUsername: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceUpdateUsername))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceUpdateUsername, usernmae: username, newUsername: newUsername } });

        try {
            const users = await this.api.getUsers(deviceSN, device.getStationSerial());
            if (users !== null) {
                let found = false;
                for (const user of users) {
                    if (user.user_name === username) {
                        if ((device.isLockWifiT8506() || device.isLockWifiT8502() || device.isLockWifiT8510P() || device.isLockWifiT8520P()) && user.password_list.length > 0) {
                            for (const entry of user.password_list) {
                                if (entry.password_type === UserPasswordType.PIN) {
                                    let schedule = entry.schedule;
                                    if (schedule !== undefined && typeof schedule == "string") {
                                        schedule = JSON.parse(schedule);
                                    }
                                    if (schedule !== undefined && schedule.endDay !== undefined && schedule.endTime !== undefined && schedule.startDay !== undefined && schedule.startTime !== undefined && schedule.week !== undefined) {
                                        station.updateUserSchedule(device, newUsername, user.short_user_id, hexStringScheduleToSchedule(schedule.startDay, schedule.startTime, schedule.endDay, schedule.endTime, schedule.week));
                                    }
                                }
                            }
                        } else if (device.isLockWifiR10() || device.isLockWifiR20()) {
                            for (const entry of user.password_list) {
                                if (entry.password_type === UserPasswordType.PIN) {
                                    station.updateUsername(device, newUsername, entry.password_id);
                                }
                            }
                        }
                        const result = await this.api.updateUser(deviceSN, device.getStationSerial(), user.short_user_id, newUsername);
                        if (result) {
                            this.emit("user username updated", device, username);
                        } else {
                            this.emit("user error", device, username, new UpdateUserUsernameError("Error in changing username through cloud api call", { context: { device: deviceSN, username: username, newUsername: newUsername } }));
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.emit("user error", device, username, new UpdateUserUsernameError("User not found", { context: { device: deviceSN, username: username, newUsername: newUsername } }));
                }
            } else {
                this.emit("user error", device, username, new UpdateUserUsernameError("Error on getting user list through cloud api call", { context: { device: deviceSN, username: username, newUsername: newUsername } }));
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error(`updateUser error`, { error: getError(error), deviceSN: deviceSN, username: username, newUsername: newUsername });
            this.emit("user error", device, username, new UpdateUserUsernameError("Generic error", { cause: error, context: { device: deviceSN, username: username, newUsername: newUsername } }));
        }
    }

    public async updateUserPasscode(deviceSN: string, username: string, passcode: string): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceUpdateUserPasscode))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceUpdateUserPasscode, username: username, passcode: "[redacted]" } });

        try {
            const users = await this.api.getUsers(deviceSN, device.getStationSerial());
            if (users !== null) {
                let found = false;
                for (const user of users) {
                    if (user.user_name === username) {
                        for (const entry of user.password_list) {
                            if (entry.password_type === UserPasswordType.PIN) {
                                station.updateUserPasscode(device, user.user_name, entry.password_id, passcode);
                                found = true;
                            }
                        }
                    }
                }
                if (!found) {
                    this.emit("user error", device, username, new UpdateUserPasscodeError("User not found", { context: { device: deviceSN, username: username, passcode: "[redacted]" } }));
                }
            } else {
                this.emit("user error", device, username, new UpdateUserPasscodeError("Error on getting user list through cloud api call", { context: { device: deviceSN, username: username, passcode: "[redacted]" } }));
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error(`updateUserPasscode error`, { error: getError(error), deviceSN: deviceSN, username: username });
            this.emit("user error", device, username, new UpdateUserPasscodeError("Generic error", { cause: error, context: { device: deviceSN, username: username, passcode: "[redacted]" } }));
        }
    }

    public async updateUserSchedule(deviceSN: string, username: string, schedule: Schedule): Promise<void> {
        const device = await this.getDevice(deviceSN);
        const station = await this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceUpdateUserSchedule))
            throw new NotSupportedError("This functionality is not implemented or supported by this device", { context: { device: deviceSN, commandName: CommandName.DeviceUpdateUserSchedule, usernmae: username, schedule: schedule } });

        try {
            const users = await this.api.getUsers(deviceSN, device.getStationSerial());
            if (users !== null) {
                let found = false;
                for (const user of users) {
                    if (user.user_name === username) {
                        station.updateUserSchedule(device, user.user_name, user.short_user_id, schedule);
                        found = true;
                    }
                }
                if (!found) {
                    this.emit("user error", device, username, new UpdateUserScheduleError("User not found", { context: { device: deviceSN, username: username, schedule: schedule } }));
                }
            } else {
                this.emit("user error", device, username, new UpdateUserScheduleError("Error on getting user list through cloud api call", { context: { device: deviceSN, username: username, schedule: schedule } }));
            }
        } catch (err) {
            const error = ensureError(err);
            rootMainLogger.error(`updateUserSchedule error`, { error: getError(error), deviceSN: deviceSN, username: username, schedule: schedule });
            this.emit("user error", device, username, new UpdateUserScheduleError("Generic error", { cause: error, context: { device: deviceSN, username: username, schedule: schedule } }));
        }
    }

    private onStationDevicePinVerified(deviceSN: string, successfull: boolean): void {
        this.getDevice(deviceSN).then((device: Device) => {
            this.emit("device pin verified", device, successfull);
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`onStationDevicePinVerified error`, { error: getError(error), deviceSN: deviceSN, successfull: successfull });
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

    private _emitStationImageDownload(station: Station, file: string, picture: Picture): void {
        this.emit("station image download", station, file, picture);

        this.getDevicesFromStation(station.getSerial()).then((devices: Device[]) => {
            for (const device of devices) {
                if (device.getPropertyValue(PropertyName.DevicePictureUrl) === file) {
                    rootMainLogger.debug(`onStationImageDownload - Set picture for device ${device.getSerial()} file: ${file} picture_ext: ${picture.type.ext} picture_mime: ${picture.type.mime}`);
                    device.updateProperty(PropertyName.DevicePicture, picture);
                    break;
                }
            }
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`onStationImageDownload - Set picture error`, { error: getError(error), stationSN: station.getSerial(), file: file });
        });
    }

    private onStationImageDownload(station: Station, file: string, image: Buffer): void {
        import("image-type").then(({ default: imageType }) => {
            imageType(image).then((type) => {
                const picture: Picture = {
                    data: image,
                    type: type !== null && type !== undefined ? type : { ext: "unknown", mime: "application/octet-stream" }
                };
                this._emitStationImageDownload(station, file, picture);
            }).catch(() => {
                this._emitStationImageDownload(station, file, {
                    data: image,
                    type: { ext: "unknown", mime: "application/octet-stream" }
                });
            });
        }).catch(() => {
            this._emitStationImageDownload(station, file, {
                data: image,
                type: { ext: "unknown", mime: "application/octet-stream" }
            });
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
                    }).catch((err) => {
                        const error = ensureError(err);
                        if (!(error instanceof DeviceNotFoundError)) {
                            rootMainLogger.error("onStationDatabaseQueryLatest Error", { error: getError(error), stationSN: station.getSerial(), returnCode: returnCode });
                        }
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

    private onStationSensorStatus(station: Station, channel: number, status: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            if (device.hasProperty(PropertyName.DeviceSensorOpen)) {
                const metadataSensorOpen = device.getPropertyMetadata(PropertyName.DeviceSensorOpen);
                device.updateRawProperty(metadataSensorOpen.key as number, status.toString(), "p2p");
            }
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station sensor status error`, { error: getError(error), stationSN: station.getSerial(), channel: channel });
        });
    }

    private onStationGarageDoorStatus(station: Station, channel: number, doorId:number, status: number): void {
        this.getStationDevice(station.getSerial(), channel).then((device: Device) => {
            device.updateRawProperty(CommandType.CMD_CAMERA_GARAGE_DOOR_STATUS, status.toString(), "p2p");
        }).catch((err) => {
            const error = ensureError(err);
            rootMainLogger.error(`Station garage door status error`, { error: getError(error), stationSN: station.getSerial(), channel: channel });
        });
    }

    private onStorageInfoHb3(station: Station, channel: number, storageInfo: StorageInfoBodyHB3): void {
        if(station.hasProperty(PropertyName.StationStorageInfoEmmc)) {
            station.updateProperty(PropertyName.StationStorageInfoEmmc, storageInfo.emmc_info);
        }
        if(station.hasProperty(PropertyName.StationStorageInfoHdd)) {
            station.updateProperty(PropertyName.StationStorageInfoHdd, storageInfo.hdd_info);
        }
    }

    private onDeviceTampering(device: Device, state: boolean): void {
        this.emit("device tampering", device, state);
    }

    private onDeviceLowTemperature(device: Device, state: boolean): void {
        this.emit("device low temperature", device, state);
    }

    private onDeviceHighTemperature(device: Device, state: boolean): void {
        this.emit("device high temperature", device, state);
    }

    private onDevicePinIncorrect(device: Device, state: boolean): void {
        this.emit("device pin incorrect", device, state);
    }

    private onDeviceLidStuck(device: Device, state: boolean): void {
        this.emit("device lid stuck", device, state);
    }

    private onDeviceBatteryFullyCharged(device: Device, state: boolean): void {
        this.emit("device battery fully charged", device, state);
    }

}
