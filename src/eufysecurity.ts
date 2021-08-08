import { TypedEmitter } from "tiny-typed-emitter";
import { dummyLogger, Logger } from "ts-log";
import fse from "fs-extra";
import path from "path";

import { EufySecurityEvents, EufySecurityConfig, EufySecurityPersistentData } from "./interfaces";
import { HTTPApi } from "./http/api";
import { Devices, FullDevices, Hubs, PropertyValue, RawValues, Stations } from "./http/interfaces";
import { Station } from "./http/station";
import { ConfirmInvite, FullDeviceResponse, HubResponse, Invite } from "./http/models";
import { AuthResult, CommandName, DeviceType, FloodlightMotionTriggeredDistance, NotificationSwitchMode, NotificationType, PropertyName } from "./http/types";
import { PushNotificationService } from "./push/service";
import { Credentials, PushMessage } from "./push/models";
import { BatteryDoorbellCamera, Camera, Device, DoorbellCamera, EntrySensor, FloodlightCamera, IndoorCamera, Keypad, Lock, MotionSensor, SoloCamera, UnknownDevice } from "./http/device";
import { AlarmEvent, CommandType, P2PConnectionType } from "./p2p/types";
import { StreamMetadata } from "./p2p/interfaces";
import { CommandResult } from "./p2p/models";
import { generateSerialnumber, generateUDID, handleUpdate, md5, parseValue, removeLastChar } from "./utils";
import { DeviceNotFoundError, DuplicateDeviceError, DuplicateStationError, StationNotFoundError, ReadOnlyPropertyError, InvalidPropertyValueError, NotSupportedError } from "./error";
import { libVersion } from ".";
import { InvalidPropertyError } from "./http/error";
import { Readable } from "stream";
import { ServerPushEvent } from "./push";

export class EufySecurity extends TypedEmitter<EufySecurityEvents> {

    private config: EufySecurityConfig;

    private log: Logger;

    private api: HTTPApi;

    private stations: Stations = {};
    private devices: Devices = {};

    private cameraMaxLivestreamSeconds = 30;
    private cameraStationLivestreamTimeout: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();
    private cameraCloudLivestreamTimeout: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

    private pushService: PushNotificationService;
    private pushCloudRegistered = false;
    private pushCloudChecked = false;
    private persistentFile: string;
    private persistentData: EufySecurityPersistentData = {
        api_base: "",
        cloud_token: "",
        cloud_token_expiration: 0,
        openudid: "",
        serial_number: "",
        push_credentials: undefined,
        push_persistentIds: [],
        login_hash: "",
        version: ""
    };
    private connected = false;

    private refreshEufySecurityTimeout?: NodeJS.Timeout;

    constructor(config: EufySecurityConfig, log: Logger = dummyLogger) {
        super();

        this.config = config;
        this.log = log;

        if (this.config.country === undefined) {
            this.config.country = "US";
        }
        if (this.config.language === undefined) {
            this.config.language = "en";
        }
        if (this.config.trustedDeviceName === undefined) {
            this.config.trustedDeviceName = "eufyclient";
        }
        if (this.config.eventDurationSeconds === undefined) {
            this.config.eventDurationSeconds = 10;
        }
        if (this.config.p2pConnectionSetup === undefined) {
            this.config.p2pConnectionSetup = P2PConnectionType.PREFER_LOCAL;
        } else if (!Object.values(P2PConnectionType).includes(this.config.p2pConnectionSetup)) {
            this.config.p2pConnectionSetup = P2PConnectionType.PREFER_LOCAL;
        }
        if (this.config.pollingIntervalMinutes === undefined) {
            this.config.pollingIntervalMinutes = 10;
        }
        if (this.config.acceptInvitations === undefined) {
            this.config.acceptInvitations = false;
        }
        if (this.config.persistentDir === undefined) {
            this.config.persistentDir = path.resolve(__dirname, "..");
        } else if (!fse.existsSync(this.config.persistentDir)) {
            this.config.persistentDir = path.resolve(__dirname, "..");
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
                this.log.debug("Handling of adapter update", { currentVersion: currentVersion, previousVersion: previousVersion });

                if (previousVersion < currentVersion) {
                    handleUpdate(previousVersion);
                    this.persistentData.version = libVersion;
                    this.writePersistentData();
                }
            }
        } catch(error) {
            this.log.error("Handling update - Error:", error);
        }

        this.api = new HTTPApi(this.config.username, this.config.password, this.log);
        this.api.setCountry(this.config.country);
        this.api.setLanguage(this.config.language);
        this.api.setPhoneModel(this.config.trustedDeviceName);

        this.api.on("hubs", (hubs: Hubs) => this.handleHubs(hubs));
        this.api.on("devices", (devices: FullDevices) => this.handleDevices(devices));
        this.api.on("close", () => this.onAPIClose());
        this.api.on("connect", () => this.onAPIConnect());

        if (this.persistentData.login_hash && this.persistentData.login_hash != "") {
            this.log.debug("Load previous login_hash:", this.persistentData.login_hash);
            if (md5(`${this.config.username}:${this.config.password}`) != this.persistentData.login_hash) {
                this.log.info("Authentication properties changed, invalidate saved cloud token.");
                this.persistentData.cloud_token = "";
                this.persistentData.cloud_token_expiration = 0;
                this.persistentData.api_base = "";
            }
        } else {
            this.persistentData.cloud_token = "";
            this.persistentData.cloud_token_expiration = 0;
        }
        if (this.persistentData.api_base && this.persistentData.api_base != "") {
            this.log.debug("Load previous api_base:", this.persistentData.api_base);
            this.api.setAPIBase(this.persistentData.api_base);
        }
        if (this.persistentData.cloud_token && this.persistentData.cloud_token != "") {
            this.log.debug("Load previous token:", { token: this.persistentData.cloud_token, tokenExpiration: this.persistentData.cloud_token_expiration });
            this.api.setToken(this.persistentData.cloud_token);
            this.api.setTokenExpiration(new Date(this.persistentData.cloud_token_expiration));
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
    }

    public getPushService(): PushNotificationService {
        return this.pushService;
    }

    private addStation(station: Station): void {
        const serial = station.getSerial();
        if (serial && !Object.keys(this.stations).includes(serial)) {
            this.stations[serial] = station;
            this.emit("station added", station);
            station.setConnectionType(this.config.p2pConnectionSetup);
            station.setQuickStreamStart(true);
            station.connect();
        } else {
            throw new DuplicateStationError(`Station with this serial ${station.getSerial()} exists already and couldn't be added again!`);
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
            throw new StationNotFoundError(`Station with this serial ${station.getSerial()} doesn't exists and couldn't be removed!`);
        }
    }

    private updateStation(hub: HubResponse): void {
        if (Object.keys(this.stations).includes(hub.station_sn)) {
            this.stations[hub.station_sn].update(hub);
            if (!this.stations[hub.station_sn].isConnected()) {
                this.stations[hub.station_sn].setConnectionType(this.config.p2pConnectionSetup);
                this.stations[hub.station_sn].setQuickStreamStart(true);
                this.stations[hub.station_sn].connect();
            }
        } else {
            throw new StationNotFoundError(`Station with this serial ${hub.station_sn} doesn't exists and couldn't be updated!`);
        }
    }

    private addDevice(device: Device): void {
        const serial = device.getSerial()
        if (serial && !Object.keys(this.devices).includes(serial)) {
            this.devices[serial] = device;
            this.emit("device added", device);
        } else {
            throw new DuplicateDeviceError(`Device with this serial ${device.getSerial()} exists already and couldn't be added again!`);
        }
    }

    private removeDevice(device: Device): void {
        const serial = device.getSerial()
        if (serial && Object.keys(this.devices).includes(serial)) {
            delete this.devices[serial];
            device.removeAllListeners();
            this.emit("device removed", device);
        } else {
            throw new DuplicateDeviceError(`Device with this serial ${device.getSerial()} doesn't exists and couldn't be removed!`);
        }
    }

    private updateDevice(device: FullDeviceResponse): void {
        if (Object.keys(this.devices).includes(device.device_sn))
            this.devices[device.device_sn].update(device)
        else
            throw new DeviceNotFoundError(`Device with this serial ${device.device_sn} doesn't exists and couldn't be updated!`);
    }

    public getDevices(): Array<Device> {
        const arr: Array<Device> = [];
        Object.keys(this.devices).forEach((serialNumber: string) => {
            arr.push(this.devices[serialNumber]);
        });
        return arr;
    }

    public getDevice(deviceSN: string): Device {
        if (Object.keys(this.devices).includes(deviceSN))
            return this.devices[deviceSN];
        throw new DeviceNotFoundError(`Device with this serial ${deviceSN} doesn't exists!`);
    }

    public getStationDevice(stationSN: string, channel: number): Device {
        for (const device of Object.values(this.devices)) {
            if ((device.getStationSerial() === stationSN && device.getChannel() === channel) || (device.getStationSerial() === stationSN && device.getSerial() === stationSN)) {
                return device;
            }
        }
        throw new DeviceNotFoundError(`No device with channel ${channel} found on station with serial number: ${stationSN}!`);
    }

    public getStations(): Array<Station> {
        const arr: Array<Station> = [];
        Object.keys(this.stations).forEach((serialNumber: string) => {
            arr.push(this.stations[serialNumber]);
        });
        return arr;
    }

    public getStation(stationSN: string): Station {
        if (Object.keys(this.stations).includes(stationSN))
            return this.stations[stationSN];
        throw new StationNotFoundError(`No station with serial number: ${stationSN}!`);
    }

    public getApi(): HTTPApi {
        return this.api;
    }

    public async connectToStation(stationSN: string, p2pConnectionType: P2PConnectionType = P2PConnectionType.PREFER_LOCAL): Promise<void> {
        if (Object.keys(this.stations).includes(stationSN)) {
            this.stations[stationSN].setConnectionType(p2pConnectionType);
            this.stations[stationSN].setQuickStreamStart(true);
            this.stations[stationSN].connect();
        } else
            throw new StationNotFoundError(`No station with this serial number: ${stationSN}!`);
    }

    public isStationConnected(stationSN: string): boolean {
        if (Object.keys(this.stations).includes(stationSN))
            return this.stations[stationSN].isConnected();
        throw new StationNotFoundError(`No station with this serial number: ${stationSN}!`);
    }

    private handleHubs(hubs: Hubs): void {
        this.log.debug("Got hubs:", hubs);
        const stationsSNs: string[] = Object.keys(this.stations);
        const newStationsSNs = Object.keys(hubs);
        for (const hub of Object.values(hubs)) {
            if (stationsSNs.includes(hub.station_sn)) {
                this.updateStation(hub);
            } else {
                const station = new Station(this.api, hub);
                station.on("connect", (station: Station) => this.onStationConnect(station));
                station.on("close", (station: Station) => this.onStationClose(station));
                station.on("raw device property changed", (deviceSN: string, params: RawValues) => this.updateDeviceProperties(deviceSN, params));
                station.on("livestream start", (station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable) => this.onStartStationLivestream(station, channel, metadata, videostream, audiostream));
                station.on("livestream stop", (station: Station, channel:number) => this.onStopStationLivestream(station, channel));
                station.on("download start", (station: Station, channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => this.onStationStartDownload(station, channel, metadata, videoStream, audioStream));
                station.on("download finish", (station: Station, channel: number) => this.onStationFinishDownload(station, channel));
                station.on("command result", (station: Station, result: CommandResult) => this.onStationCommandResult(station, result));
                station.on("guard mode", (station: Station, guardMode: number) => this.onStationGuardMode(station, guardMode));
                station.on("current mode", (station: Station, currentMode: number) => this.onStationCurrentMode(station, currentMode));
                station.on("rtsp url", (station: Station, channel:number, value: string, modified: number) => this.onStationRtspUrl(station, channel, value, modified));
                station.on("property changed", (station: Station, name: string, value: PropertyValue) => this.onStationPropertyChanged(station, name, value));
                station.on("raw property changed", (station: Station, type: number, value: string, modified: number) => this.onStationRawPropertyChanged(station, type, value, modified));
                station.on("alarm event", (station: Station, alarmEvent: AlarmEvent) => this.onStationAlarmEvent(station, alarmEvent));
                station.on("runtime state", (station: Station, channel: number, batteryLevel: number, temperature: number, modified: number) => this.onStationRuntimeState(station, channel, batteryLevel, temperature, modified));
                station.on("charging state", (station: Station, channel: number, chargeType: number, batteryLevel: number, modified: number) => this.onStationChargingState(station, channel, chargeType, batteryLevel, modified));
                station.on("wifi rssi", (station: Station, channel: number, rssi: number, modified: number) => this.onStationWifiRssi(station, channel, rssi, modified));

                this.addStation(station);
            }
        }
        for (const stationSN of stationsSNs) {
            if (!newStationsSNs.includes(stationSN)) {
                this.removeStation(this.getStation(stationSN));
            }
        }
    }

    private onStationConnect(station: Station): void {
        this.emit("station connect", station);
        if (station.getDeviceType() !== DeviceType.DOORBELL)
            station.getCameraInfo().catch(error => {
                this.log.error(`Error during station ${station.getSerial()} p2p data refreshing`, error);
            });
    }

    private onStationClose(station: Station): void {
        this.emit("station close", station);
        try {
            for (const device_sn of this.cameraStationLivestreamTimeout.keys()) {
                const device = this.getDevice(device_sn);
                if (device !== null && device.getStationSerial() === station.getSerial()) {
                    clearTimeout(this.cameraStationLivestreamTimeout.get(device_sn)!);
                    this.cameraStationLivestreamTimeout.delete(device_sn);
                }
            }
        } catch (error) {
            this.log.error(`Station ${station.getSerial()} - Error:`, error);
        }
    }

    private handleDevices(devices: FullDevices): void {
        this.log.debug("Got devices:", devices);
        const deviceSNs: string[] = Object.keys(this.devices);
        const newDeviceSNs = Object.keys(devices);
        for (const device of Object.values(devices)) {

            if (deviceSNs.includes(device.device_sn)) {
                this.updateDevice(device);
            } else {
                let new_device: Device;

                if (Device.isIndoorCamera(device.device_type)) {
                    new_device = new IndoorCamera(this.api, device);
                } else if (Device.isSoloCamera(device.device_type)) {
                    new_device = new SoloCamera(this.api, device);
                } else if (Device.isBatteryDoorbell(device.device_type) || Device.isBatteryDoorbell2(device.device_type)) {
                    new_device = new BatteryDoorbellCamera(this.api, device);
                } else if (Device.isWiredDoorbell(device.device_type)) {
                    new_device = new DoorbellCamera(this.api, device);
                } else if (Device.isFloodLight(device.device_type)) {
                    new_device = new FloodlightCamera(this.api, device);
                } else if (Device.isCamera(device.device_type)) {
                    new_device = new Camera(this.api, device);
                } else if (Device.isLock(device.device_type)) {
                    new_device = new Lock(this.api, device);
                } else if (Device.isMotionSensor(device.device_type)) {
                    new_device = new MotionSensor(this.api, device);
                } else if (Device.isEntrySensor(device.device_type)) {
                    new_device = new EntrySensor(this.api, device);
                } else if (Device.isKeyPad(device.device_type)) {
                    new_device = new Keypad(this.api, device);
                } else {
                    new_device = new UnknownDevice(this.api, device);
                }

                new_device.on("property changed", (device: Device, name: string, value: PropertyValue) => this.onDevicePropertyChanged(device, name, value));
                new_device.on("raw property changed", (device: Device, type: number, value: string, modified: number) => this.onDeviceRawPropertyChanged(device, type, value, modified));
                new_device.on("crying detected", (device: Device, state: boolean) => this.onDeviceCryingDetected(device, state));
                new_device.on("sound detected", (device: Device, state: boolean) => this.onDeviceSoundDetected(device, state));
                new_device.on("pet detected", (device: Device, state: boolean) => this.onDevicePetDetected(device, state));
                new_device.on("motion detected", (device: Device, state: boolean) => this.onDeviceMotionDetected(device, state));
                new_device.on("person detected", (device: Device, state: boolean, person: string) => this.onDevicePersonDetected(device, state, person));
                new_device.on("rings", (device: Device, state: boolean) => this.onDeviceRings(device, state));
                new_device.on("locked", (device: Device, state: boolean) => this.onDeviceLocked(device, state));
                new_device.on("open", (device: Device, state: boolean) => this.onDeviceOpen(device, state));
                new_device.on("ready", (device: Device) => this.onDeviceReady(device));
                this.addDevice(new_device);
            }
        }
        for (const deviceSN of deviceSNs) {
            if (!newDeviceSNs.includes(deviceSN)) {
                this.removeDevice(this.getDevice(deviceSN));
            }
        }
    }

    public async refreshData(): Promise<void> {
        if (this.config.acceptInvitations) {
            await this.processInvitations().catch(error => {
                this.log.error("Error in processing invitations", error);
            });
        }
        await this.api.updateDeviceInfo().catch(error => {
            this.log.error("Error during API data refreshing", error);
        });
        Object.values(this.stations).forEach(async (station: Station) => {
            if (station.isConnected() && station.getDeviceType() !== DeviceType.DOORBELL)
                await station.getCameraInfo().catch(error => {
                    this.log.error(`Error during station ${station.getSerial()} p2p data refreshing`, error);
                });
        });
        if (this.refreshEufySecurityTimeout !== undefined)
            clearTimeout(this.refreshEufySecurityTimeout);
        this.refreshEufySecurityTimeout = setTimeout(() => { this.refreshData() }, this.config.pollingIntervalMinutes * 60 * 1000);
    }

    public close(): void {
        for (const device_sn of this.cameraStationLivestreamTimeout.keys()) {
            this.stopStationLivestream(device_sn);
        }
        for (const device_sn of this.cameraCloudLivestreamTimeout.keys()) {
            this.stopCloudLivestream(device_sn);
        }

        if (this.refreshEufySecurityTimeout !== undefined)
            clearTimeout(this.refreshEufySecurityTimeout);

        this.savePushPersistentIds();

        this.pushService.close();

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

    public async connect(verifyCode?:string|null): Promise<boolean> {
        if (verifyCode) {
            return await this.api.addTrustDevice(verifyCode);
        } else {
            let retries = 0;
            while (true) {
                switch (await this.api.authenticate()) {
                    case AuthResult.SEND_VERIFY_CODE:
                        this.saveAPIBase();
                        this.emit("tfa request");
                        return false;
                    case AuthResult.RENEW:
                        this.log.debug("Renew token");
                        break;
                    case AuthResult.ERROR:
                        this.log.error("Token error");
                        return false;
                    case AuthResult.OK:
                        return true;
                }
                if (retries > 2) {
                    this.log.error("Max connect attempts reached, interrupt");
                    return false;
                } else  {
                    retries += 1;
                }
            }
        }
    }

    public getPushPersistentIds(): string[] {
        return this.pushService.getPersistentIds();
    }

    private updateDeviceProperties(deviceSN: string, values: RawValues): void {
        const device = this.getDevice(deviceSN);
        device.updateRawProperties(values);
    }

    private onAPIClose(): void {
        this.connected = false;
        this.emit("close");
    }

    private async onAPIConnect(): Promise<void> {
        this.connected = true;
        this.emit("connect");
        this.saveAPIBase();

        try {
            const token_expiration = this.api.getTokenExpiration();
            const trusted_token_expiration = this.api.getTrustedTokenExpiration();
            if (token_expiration?.getTime() !== trusted_token_expiration.getTime()) {
                const trusted_devices = await this.api.listTrustDevice();
                trusted_devices.forEach(trusted_device => {
                    if (trusted_device.is_current_device === 1) {
                        this.api.setTokenExpiration(trusted_token_expiration);
                        this.log.debug(`This device is trusted. Token expiration extended to ${trusted_token_expiration})`);
                    }
                });
            }
        } catch (error) {
            this.log.error("Trusted devices - Error:", error);
        }

        this.saveCloudToken();

        this.registerPushNotifications(this.persistentData.push_credentials, this.persistentData.push_persistentIds);

        await this.api.updateDeviceInfo();

        this.refreshData();
    }

    public async startStationLivestream(deviceSN: string): Promise<void> {
        const device = this.getDevice(deviceSN);
        const station = this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStartLivestream))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        const camera = device as Camera;
        if (station.isConnected()) {
            if (!station.isLiveStreaming(camera)) {
                station.startLivestream(camera);

                this.cameraStationLivestreamTimeout.set(deviceSN, setTimeout(() => {
                    this.stopStationLivestream(deviceSN);
                }, this.cameraMaxLivestreamSeconds * 1000));
            } else {
                this.log.warn(`The station stream for the device ${deviceSN} cannot be started, because it is already streaming!`);
            }
        }
    }

    public async startCloudLivestream(deviceSN: string): Promise<void> {
        const device = this.getDevice(deviceSN);
        const station = this.getStation(device.getStationSerial());

        if (!device.hasCommand(CommandName.DeviceStartLivestream))
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        const camera = device as Camera;
        if (!camera.isStreaming()) {
            const url = await camera.startStream();
            this.cameraCloudLivestreamTimeout.set(deviceSN, setTimeout(() => {
                this.stopCloudLivestream(deviceSN);
            }, this.cameraMaxLivestreamSeconds * 1000));
            this.emit("cloud livestream start", station, camera, url);
        } else {
            this.log.warn(`The cloud stream for the device ${deviceSN} cannot be started, because it is already streaming!`);
        }
    }

    public async stopStationLivestream(deviceSN: string): Promise<void> {
        const device = this.getDevice(deviceSN);
        const station = this.getStation(device.getStationSerial());

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
        const device = this.getDevice(deviceSN);
        const station = this.getStation(device.getStationSerial());

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
        try {
            fse.writeFileSync(this.persistentFile, JSON.stringify(this.persistentData));
        } catch (error) {
            this.log.error("Error:", error);
        }
    }

    private saveAPIBase(): void {
        if (this.persistentData.api_base !== this.api.getAPIBase()) {
            this.persistentData.api_base = this.api.getAPIBase();
            this.writePersistentData();
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

    public isConnected(): boolean {
        return this.connected;
    }

    private async processInvitations(): Promise<void> {
        const invites = await this.api.getInvites();
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
                const result = await this.api.confirmInvites(confirmInvites);
                if (result) {
                    this.log.info(`Accepted received invitations`, confirmInvites);
                    this.refreshData();
                }
            }
        }
    }

    private async onPushMessage(message: PushMessage): Promise<void> {
        this.emit("push message", message);

        try {
            this.log.debug("Received push message", message);
            try {
                if (message.type === ServerPushEvent.INVITE_DEVICE && this.config.acceptInvitations) {
                    this.processInvitations();
                }
            } catch (error) {
                this.log.error(`Error processing server push notification for device invitation`, error);
            }
            this.getStations().forEach(station => {
                try {
                    station.processPushNotification(message);
                } catch (error) {
                    this.log.error(`Error processing push notification for station ${station.getSerial()}`, error);
                }
            });
            this.getDevices().forEach(device => {
                try {
                    device.processPushNotification(message, this.config.eventDurationSeconds);
                } catch (error) {
                    this.log.error(`Error processing push notification for device ${device.getSerial()}`, error);
                }
            });
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
    }

    public async startStationDownload(deviceSN: string, path: string, cipherID: number): Promise<void> {
        const device = this.getDevice(deviceSN);
        const station = this.getStation(device.getStationSerial());

        if (!device.isCamera())
            throw new NotSupportedError(`This functionality is not implemented or supported by ${device.getSerial()}`);

        if (station.isConnected()) {
            if (!station.isDownloading(device)) {
                await station.startDownload(device, path, cipherID);
            } else {
                this.log.warn(`The station is already downloading a video for the device ${deviceSN}!`);
            }
        }
    }

    public async cancelStationDownload(deviceSN: string): Promise<void> {
        const device = this.getDevice(deviceSN);
        const station = this.getStation(device.getStationSerial());

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
        const device = this.getDevice(deviceSN);
        const station = this.getStation(device.getStationSerial());
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
            {
                let newValue: FloodlightMotionTriggeredDistance;
                switch (value as number) {
                    case 1: newValue = FloodlightMotionTriggeredDistance.MIN;
                        break;
                    case 2: newValue = FloodlightMotionTriggeredDistance.LOW;
                        break;
                    case 3: newValue = FloodlightMotionTriggeredDistance.MEDIUM;
                        break;
                    case 4: newValue = FloodlightMotionTriggeredDistance.HIGH;
                        break;
                    case 5: newValue = FloodlightMotionTriggeredDistance.MAX;
                        break;
                    default:
                        throw new InvalidPropertyValueError(`Device ${deviceSN} not supported value "${value}" for property named "${name}"`);
                }
                await station.setFloodlightLightSettingsMotionTriggeredDistance(device, newValue);
                break;
            }
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
            default:
                if (!Object.values(PropertyName).includes(name as PropertyName))
                    throw new ReadOnlyPropertyError(`Property ${name} is read only`);
                throw new InvalidPropertyError(`Device ${deviceSN} has no writable property named ${name}`);
        }
    }

    public async setStationProperty(stationSN: string, name: string, value: unknown): Promise<void> {
        const station = this.getStation(stationSN);
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
            default:
                if (!Object.values(PropertyName).includes(name as PropertyName))
                    throw new ReadOnlyPropertyError(`Property ${name} is read only`);
                throw new InvalidPropertyError(`Station ${stationSN} has no writable property named ${name}`);
        }
    }

    private onStartStationLivestream(station: Station, channel:number, metadata: StreamMetadata, videostream: Readable, audiostream: Readable): void {
        try {
            const device = this.getStationDevice(station.getSerial(), channel);
            this.emit("station livestream start", station, device, metadata, videostream, audiostream);
        } catch (error) {
            this.log.error(`Station start livestream error (station: ${station.getSerial()} channel: ${channel})`, error);
        }
    }

    private onStopStationLivestream(station: Station, channel:number): void {
        try {
            const device = this.getStationDevice(station.getSerial(), channel);
            this.emit("station livestream stop", station, device);
        } catch (error) {
            this.log.error(`Station stop livestream error (station: ${station.getSerial()} channel: ${channel})`, error);
        }
    }

    private onStationStartDownload(station: Station, channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable): void {
        try {
            const device = this.getStationDevice(station.getSerial(), channel);
            this.emit("station download start", station, device, metadata, videoStream, audioStream);
        } catch (error) {
            this.log.error(`Station start download error (station: ${station.getSerial()} channel: ${channel})`, error);
        }
    }

    private onStationFinishDownload(station: Station, channel: number): void {
        try {
            const device = this.getStationDevice(station.getSerial(), channel);
            this.emit("station download finish", station, device);
        } catch (error) {
            this.log.error(`Station finish download error (station: ${station.getSerial()} channel: ${channel})`, error);
        }
    }

    private async onStationCommandResult(station: Station, result: CommandResult): Promise<void> {
        try {
            this.emit("station command result", station, result);
            if (result.return_code === 0 && result.command_type !== CommandType.CMD_CAMERA_INFO) {
                await this.api.updateDeviceInfo();
                if (station.isConnected() && station.getDeviceType() !== DeviceType.DOORBELL)
                    await station.getCameraInfo();
            }
        } catch (error) {
            this.log.error(`Station command result error (station: ${station.getSerial()})`, error);
        }
    }

    private onStationRtspUrl(station: Station, channel:number, value: string, modified: number): void {
        try {
            const device = this.getStationDevice(station.getSerial(), channel);
            this.emit("station rtsp url", station, device, value, modified);
            device.setCustomPropertyValue(PropertyName.DeviceRTSPStreamUrl, { value: value, timestamp: modified});
        } catch (error) {
            this.log.error(`Station rtsp url error (station: ${station.getSerial()} channel: ${channel})`, error);
        }
    }

    private onStationGuardMode(station: Station, guardMode: number): void {
        this.emit("station guard mode", station, guardMode);
    }

    private onStationCurrentMode(station: Station, currentMode: number): void {
        this.emit("station current mode", station, currentMode);
    }

    private onStationPropertyChanged(station: Station, name: string, value: PropertyValue): void {
        this.emit("station property changed", station, name, value);
    }

    private onStationRawPropertyChanged(station: Station, type: number, value: string, modified: number): void {
        this.emit("station raw property changed", station, type, value, modified);
    }

    private onStationAlarmEvent(station: Station, alarmEvent: AlarmEvent): void {
        this.emit("station alarm event", station, alarmEvent);
    }

    private onDevicePropertyChanged(device: Device, name: string, value: PropertyValue): void {
        try {
            this.emit("device property changed", device, name, value);
            if (name === PropertyName.DeviceRTSPStream && (value.value as boolean) === true && (device.getPropertyValue(PropertyName.DeviceRTSPStreamUrl) === undefined || (device.getPropertyValue(PropertyName.DeviceRTSPStreamUrl) !== undefined && (device.getPropertyValue(PropertyName.DeviceRTSPStreamUrl).value as string) === ""))) {
                this.getStation(device.getStationSerial()).setRTSPStream(device, true);
            } else if (name === PropertyName.DeviceRTSPStream && (value.value as boolean) === false) {
                device.setCustomPropertyValue(PropertyName.DeviceRTSPStreamUrl, { value: "", timestamp: new Date().getTime() });
            }
        } catch (error) {
            this.log.error(`Device property changed error (device: ${device.getSerial()} name: ${name})`, error);
        }
    }

    private onDeviceRawPropertyChanged(device: Device, type: number, value: string, modified: number): void {
        this.emit("device raw property changed", device, type, value, modified);
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

    private onDeviceReady(device: Device): void {
        try {
            if (device.getPropertyValue(PropertyName.DeviceRTSPStream) !== undefined && (device.getPropertyValue(PropertyName.DeviceRTSPStream).value as boolean) === true) {
                this.getStation(device.getStationSerial()).setRTSPStream(device, true);
            }
        } catch (error) {
            this.log.error(`Device ready error (device: ${device.getSerial()})`, error);
        }
    }

    private onStationRuntimeState(station: Station, channel: number, batteryLevel: number, temperature: number, modified: number): void {
        try {
            const device = this.getStationDevice(station.getSerial(), channel);
            const metadataBattery = device.getPropertyMetadata(PropertyName.DeviceBattery);
            if (metadataBattery !== undefined) {
                device.updateRawProperty(metadataBattery.key as number, { value: batteryLevel.toString(), timestamp: modified});
            }
            const metadataBatteryTemperature = device.getPropertyMetadata(PropertyName.DeviceBatteryTemp);
            if (metadataBatteryTemperature !== undefined) {
                device.updateRawProperty(metadataBatteryTemperature.key as number, { value: temperature.toString(), timestamp: modified});
            }
        } catch (error) {
            this.log.error(`Station runtime state error (station: ${station.getSerial()} channel: ${channel})`, error);
        }
    }

    private onStationChargingState(station: Station, channel: number, chargeType: number, batteryLevel: number, modified: number): void {
        try {
            const device = this.getStationDevice(station.getSerial(), channel);
            const metadataBattery = device.getPropertyMetadata(PropertyName.DeviceBattery);
            if (metadataBattery !== undefined) {
                device.updateRawProperty(metadataBattery.key as number, { value: batteryLevel.toString(), timestamp: modified});
            }
            const metadataChargingStatus = device.getPropertyMetadata(PropertyName.DeviceChargingStatus);
            if (metadataChargingStatus !== undefined) {
                device.updateRawProperty(metadataChargingStatus.key as number, { value: chargeType.toString(), timestamp: modified});
            }
        } catch (error) {
            this.log.error(`Station charging state error (station: ${station.getSerial()} channel: ${channel})`, error);
        }
    }

    private onStationWifiRssi(station: Station, channel: number, rssi: number, modified: number): void {
        try {
            const device = this.getStationDevice(station.getSerial(), channel);
            const metadataWifiRssi = device.getPropertyMetadata(PropertyName.DeviceWifiRSSI);
            if (metadataWifiRssi !== undefined) {
                device.updateRawProperty(metadataWifiRssi.key as number, { value: rssi.toString(), timestamp: modified});
            }
        } catch (error) {
            this.log.error(`Station wifi rssi error (station: ${station.getSerial()} channel: ${channel})`, error);
        }
    }

}