import got from "got";
import { TypedEmitter } from "tiny-typed-emitter";
import { dummyLogger, Logger } from "ts-log";
import { isValid as isValidCountry } from "i18n-iso-countries";
import { isValid as isValidLanguage } from "@cospired/i18n-iso-languages";
import { createECDH, ECDH } from "crypto";

import { ResultResponse, LoginResultResponse, TrustDevice, Cipher, Voice, EventRecordResponse, Invite, ConfirmInvite, SensorHistoryEntry, ApiResponse, CaptchaResponse, LoginRequest, HouseDetail, DeviceListResponse, StationListResponse, HouseInviteListResponse, HouseListResponse, PassportProfileResponse } from "./models"
import { HTTPApiEvents, Ciphers, FullDevices, Hubs, Voices, Invites, HTTPApiRequest, HTTPApiPersistentData } from "./interfaces";
import { AuthResult, EventFilterType, PublicKeyType, ResponseErrorCode, StorageType, VerfyCodeTypes } from "./types";
import { ParameterHelper } from "./parameter";
import { encryptPassword, getTimezoneGMTString } from "./utils";
import { InvalidCountryCodeError, InvalidLanguageCodeError } from "./../error";
import { md5 } from "./../utils";

export class HTTPApi extends TypedEmitter<HTTPApiEvents> {

    private apiDomainBase = "https://extend.eufylife.com";
    private apiBase = "https://security-app.eufylife.com";

    private username: string;
    private password: string;
    private userId: string|null = null;
    private ecdh: ECDH = createECDH("prime256v1");
    private serverPublicKey = "04c5c00c4f8d1197cc7c3167c52bf7acb054d722f0ef08dcd7e0883236e0d72a3868d9750cb47fa4619248f3d83f0f662671dadc6e2d31c2f41db0161651c7c076";

    private token: string|null = null;
    private tokenExpiration: Date|null = null;
    private trustedTokenExpiration = new Date(2100, 12, 31, 23, 59, 59, 0);

    private log: Logger;
    private connected = false;

    private devices: FullDevices = {};
    private hubs: Hubs = {};

    private persistentData: HTTPApiPersistentData = {
        user_id: "",
        email: "",
        nick_name: "",
        device_public_keys: {}
    };

    private headers: Record<string, string> = {
        app_version: "v4.0.0_1197",
        os_type: "android",
        os_version: "31",
        phone_model: "ONEPLUS A3003",
        country: "DE",
        language: "en",
        openudid: "5e4621b0152c0d00",
        uid: "",
        net_type: "wifi",
        mnc: "02",
        mcc: "262",
        sn: "75814221ee75",
        Model_type: "PHONE",
        timezone: "GMT+01:00",
        "Cache-Control": "no-cache",
    };

    constructor(username: string, password: string, log: Logger = dummyLogger, persistentData?: HTTPApiPersistentData) {
        super();

        this.username = username;
        this.password = password;
        this.log = log;

        if (persistentData)
            this.persistentData = persistentData;

        this.headers.timezone = getTimezoneGMTString();
    }

    private invalidateToken(): void {
        this.token = null;
        this.tokenExpiration = null;
    }

    public setPhoneModel(model: string): void {
        this.headers.phone_model = model.toUpperCase();
    }

    public getPhoneModel(): string {
        return this.headers.phone_model;
    }

    public setCountry(country: string): void {
        if (isValidCountry(country) && country.length === 2) {
            this.headers.country = country;
        } else
            throw new InvalidCountryCodeError("Invalid ISO 3166-1 Alpha-2 country code");
    }

    public getCountry(): string {
        return this.headers.country;
    }

    public setLanguage(language: string): void {
        if (isValidLanguage(language) && language.length === 2)
            this.headers.language = language;
        else
            throw new InvalidLanguageCodeError("Invalid ISO 639 language code");
    }

    public getLanguage(): string {
        return this.headers.language;
    }

    public async getApiBaseFromCloud(country: string): Promise<string> {
        try {
            const response = await this.request({
                apiBase: this.apiDomainBase,
                method: "get",
                endpoint: `/domain/${country}`
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data && result.data.domain) {
                        return `https://${result.data.domain}`;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return "";
    }

    public async authenticate(verifyCodeOrCaptcha: string | null = null, captchaId: string | null = null): Promise<AuthResult> {
        //Authenticate and get an access token
        this.log.debug("Authenticate and get an access token", { token: this.token, tokenExpiration: this.tokenExpiration });
        const apiBase = await this.getApiBaseFromCloud(this.getCountry());
        if (apiBase !== this.apiBase) {
            this.log.debug(`Found wrong API_BASE (${this.apiBase}), switching to correct one (${apiBase})`);
            this.apiBase = apiBase;
            this.invalidateToken();
        }
        if (!this.token || (this.tokenExpiration && (new Date()).getTime() >= this.tokenExpiration.getTime()) || verifyCodeOrCaptcha) {
            try {
                this.ecdh.generateKeys();
                const data: LoginRequest = {
                    client_secret_info: {
                        public_key: this.ecdh.getPublicKey("hex")
                    },
                    enc: 0,
                    email: this.username,
                    password:  encryptPassword(this.password, this.ecdh.computeSecret(Buffer.from(this.serverPublicKey, "hex"))),
                    time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
                    transaction: `${new Date().getTime()}`
                };
                if (verifyCodeOrCaptcha && !captchaId) {
                    data.verify_code = verifyCodeOrCaptcha;
                } else if (verifyCodeOrCaptcha && captchaId) {
                    data.captcha_id = captchaId;
                    data.answer = verifyCodeOrCaptcha;
                }
                const response: ApiResponse = await this.request({
                    method: "post",
                    endpoint: "v2/passport/login",
                    data: data
                }).catch(error => {
                    this.log.error("Error:", error);
                    return error;
                });
                this.log.debug("Response:", response.data);

                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        const dataresult: LoginResultResponse = result.data;

                        this.persistentData.user_id = dataresult.user_id;
                        this.persistentData.email = dataresult.email;
                        this.persistentData.nick_name = dataresult.nick_name;

                        this.token = dataresult.auth_token
                        this.tokenExpiration = new Date(dataresult.token_expires_at * 1000);
                        this.headers = {
                            ...this.headers,
                            gtoken: md5(dataresult.user_id)
                        };
                        /*if (dataresult.server_secret_info?.public_key)
                            this.serverPublicKey = dataresult.server_secret_info.public_key;*/

                        if (dataresult.domain) {
                            if (`https://${dataresult.domain}` != this.apiBase) {
                                this.apiBase = `https://${dataresult.domain}`;
                                this.log.info(`Switching to another API_BASE (${this.apiBase}) and get new token.`);
                                this.invalidateToken();
                                return AuthResult.RENEW;
                            }
                        }
                        this.log.debug("Token data", { token: this.token, tokenExpiration: this.tokenExpiration });
                        this.emit("connect");
                        this.connected = true;
                        return AuthResult.OK;
                    } else if (result.code == ResponseErrorCode.CODE_NEED_VERIFY_CODE) {
                        this.log.debug(`Send verification code...`);
                        const dataresult: LoginResultResponse = result.data;

                        this.token = dataresult.auth_token
                        this.tokenExpiration = new Date(dataresult.token_expires_at * 1000);

                        this.log.debug("Token data", { token: this.token, tokenExpiration: this.tokenExpiration });
                        await this.sendVerifyCode(VerfyCodeTypes.TYPE_EMAIL);
                        this.emit("tfa request");
                        return AuthResult.SEND_VERIFY_CODE;
                    } else if (result.code == ResponseErrorCode.LOGIN_NEED_CAPTCHA || result.code == ResponseErrorCode.LOGIN_CAPTCHA_ERROR) {
                        const dataresult: CaptchaResponse = result.data;
                        this.log.debug("Captcha verification received", { captchaId: dataresult.captcha_id, item: dataresult.item });
                        this.emit("captcha request", dataresult.captcha_id, dataresult.item);
                        return AuthResult.CAPTCHA_NEEDED;
                    } else {
                        this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                    }
                } else {
                    this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
                }
            } catch (error) {
                this.log.error("Generic Error:", error);
            }
            return AuthResult.ERROR;
        } else if (!this.connected) {
            await this.getPassportProfile().catch((error) => {
                this.log.error("getPassportProfile Error", error);
            });
            this.emit("connect");
            this.connected = true;
        }
        return AuthResult.OK;
    }

    public async sendVerifyCode(type?: VerfyCodeTypes): Promise<boolean> {
        try {
            if (!type)
                type = VerfyCodeTypes.TYPE_EMAIL;

            const response = await this.request({
                method: "post",
                endpoint: "v1/sms/send/verify_code",
                data: {
                    message_type: type,
                    transaction: `${new Date().getTime()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    this.log.info(`Requested verification code for 2FA`);
                    return true;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return false;
    }

    public async listTrustDevice(): Promise<Array<TrustDevice>> {
        try {
            const response = await this.request({
                method: "get",
                endpoint: "v1/app/trust_device/list"
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data && result.data.list) {
                        return result.data.list;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return [];
    }

    public async addTrustDevice(verifyCode: string): Promise<boolean> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/app/trust_device/add",
                data: {
                    verify_code: verifyCode,
                    transaction: `${new Date().getTime()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response trust device:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    this.log.info(`2FA authentication successfully done. Device trusted.`);
                    const trusted_devices = await this.listTrustDevice();
                    trusted_devices.forEach((trusted_device: TrustDevice) => {
                        if (trusted_device.is_current_device === 1) {
                            this.tokenExpiration = this.trustedTokenExpiration;
                            this.log.debug("This device is trusted. Token expiration extended:", { tokenExpiration: this.tokenExpiration});
                        }
                    });
                    this.emit("connect");
                    this.connected = true;
                    return true;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return false;
    }

    public async getStationList(): Promise<Array<StationListResponse>> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/house/station_list",
                data: {
                    device_sn: "",
                    num: 1000,
                    orderby: "",
                    page: 0,
                    station_sn: "",
                    time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
                    transaction: `${new Date().getTime()}`
                }
            }).catch(error => {
                this.log.error("Stations - Error:", error);
                return error;
            });
            this.log.debug("Stations - Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    return result.data as Array<StationListResponse>;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Stations - Generic Error:", error);
        }
        return [];
    }

    public async getDeviceList(): Promise<Array<DeviceListResponse>> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/house/device_list",
                data: {
                    device_sn: "",
                    num: 1000,
                    orderby: "",
                    page: 0,
                    station_sn: "",
                    time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
                    transaction: `${new Date().getTime()}`
                }
            }).catch(error => {
                this.log.error("Devices - Error:", error);
                return error;
            });
            this.log.debug("Devices - Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    return result.data as Array<DeviceListResponse>;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Devices - Generic Error:", error);
        }
        return [];
    }

    public async updateDeviceInfo(): Promise<void> {
        //Get the latest device info

        //Get Stations
        const stations = await this.getStationList();
        if (stations && stations.length > 0) {
            stations.forEach(element => {
                this.log.debug(`Stations - element: ${JSON.stringify(element)}`);
                this.log.debug(`Stations - device_type: ${element.device_type}`);
                this.hubs[element.station_sn] = element;
            });
            if (Object.keys(this.hubs).length > 0)
                this.emit("hubs", this.hubs);
        } else {
            this.log.info("No stations found.");
        }

        //Get Devices
        const devices = await this.getDeviceList();
        if (devices && devices.length > 0) {
            devices.forEach(element => {
                this.devices[element.device_sn] = element;
            });
            if (Object.keys(this.devices).length > 0)
                this.emit("devices", this.devices);
        } else {
            this.log.info("No devices found.");
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public async request(request: HTTPApiRequest): Promise<ApiResponse> {

        if (!this.token && request.endpoint != "v2/passport/login") {
            //No token get one
            switch (await this.authenticate()) {
                case AuthResult.RENEW:
                    this.log.debug("Renew token", { method: request.method, endpoint: request.endpoint });
                    await this.authenticate();
                    break;
                case AuthResult.ERROR:
                    this.log.error("Token error", { method: request.method, endpoint: request.endpoint });
                    break;
                default: break;
            }
        }
        if (this.tokenExpiration && (new Date()).getTime() >= this.tokenExpiration.getTime()) {
            this.log.info("Access token expired; fetching a new one")
            this.invalidateToken();
            if (request.endpoint != "v2/passport/login")
                //get new token
                await this.authenticate()
        }
        if (request.headers) {
            request.headers = {
                ...this.headers,
                ...request.headers,
            };
        } else {
            request.headers = {
                ...this.headers,
            };
        }
        if (this.token) {
            request.headers["X-Auth-Token"] = this.token;
        }
        if (request.apiBase == undefined) {
            request.apiBase = this.apiBase;
        }

        this.log.debug("Request:", { method: request.method, endpoint: request.endpoint, baseUrl: request.apiBase, token: this.token, data: request.data, headers: request.headers });

        const internalResponse = await got(`${request.apiBase}/${request.endpoint}`, {
            method: request.method,
            headers: request.headers,
            json: request.data,
            responseType: "json",
            http2: false,
            throwHttpErrors: false,
            retry: {
                limit: 3,
                methods: ["GET", "POST"]
            }
        });
        const response: ApiResponse = {
            status: internalResponse.statusCode,
            statusText: internalResponse.statusMessage ? internalResponse.statusMessage : "",
            headers: internalResponse.headers,
            data: internalResponse.body,
        };

        if (response.status == 401) {
            this.invalidateToken();
            this.log.error("Status return code 401, invalidate token", { status: response.status, statusText: response.statusText });
            this.emit("close");
            this.connected = false;
        }

        return response;
    }

    public async checkPushToken(): Promise<boolean> {
        //Check push notification token
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/app/review/app_push_check",
                data: {
                    app_type: "eufySecurity",
                    transaction: `${new Date().getTime()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    this.log.debug(`Push token OK`);
                    return true;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return false;
    }

    public async registerPushToken(token: string): Promise<boolean> {
        //Register push notification token
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/apppush/register_push_token",
                data: {
                    is_notification_enable: true,
                    token: token,
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    this.log.debug(`Push token registered successfully`);
                    return true;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return false;
    }

    public async setParameters(stationSN: string, deviceSN: string, params: { paramType: number; paramValue: any; }[]): Promise<boolean> {
        const tmp_params: any[] = []
        params.forEach(param => {
            tmp_params.push({ param_type: param.paramType, param_value: ParameterHelper.writeValue(param.paramType, param.paramValue) });
        });

        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/app/upload_devs_params",
                data: {
                    device_sn: deviceSN,
                    station_sn: stationSN,
                    params: tmp_params
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", { stationSN: stationSN, deviceSN: deviceSN, params: tmp_params, response: response.data });

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    const dataresult = result.data;
                    this.log.debug("New parameters set", {params: tmp_params, response: dataresult });
                    return true;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return false;
    }

    public async getCiphers(cipherIDs: Array<number>, userID: string): Promise<Ciphers> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/app/cipher/get_ciphers",
                data: {
                    cipher_ids: cipherIDs,
                    user_id: userID,
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const ciphers: Ciphers = {};
                        result.data.forEach((cipher: Cipher) => {
                            ciphers[cipher.cipher_id] = cipher;
                        });
                        return ciphers;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return {};
    }

    public async getVoices(deviceSN: string): Promise<Voices> {
        try {
            const response = await this.request({
                method: "get",
                endpoint: `v1/voice/response/lists/${deviceSN}`
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const voices: Voices = {};
                        result.data.forEach((voice: Voice) => {
                            voices[voice.voice_id] = voice;
                        });
                        return voices;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return {};
    }

    public async getCipher(cipherID: number, userID: string): Promise<Cipher> {
        return (await this.getCiphers([cipherID], userID))[cipherID];
    }

    public getLog(): Logger {
        return this.log;
    }

    public getDevices(): FullDevices {
        return this.devices;
    }

    public getHubs(): Hubs {
        return this.hubs;
    }

    public getToken(): string|null {
        return this.token;
    }

    public getTokenExpiration(): Date|null {
        return this.tokenExpiration;
    }

    public getTrustedTokenExpiration(): Date {
        return this.trustedTokenExpiration;
    }

    public setToken(token: string): void {
        this.token = token;
    }

    public setTokenExpiration(tokenExpiration: Date): void {
        this.tokenExpiration = tokenExpiration;
    }

    public getAPIBase(): string {
        return this.apiBase;
    }

    public setAPIBase(apiBase: string): void {
        this.apiBase = apiBase;
    }

    public setOpenUDID(openudid: string): void {
        this.headers.openudid = openudid;
    }

    public setSerialNumber(serialnumber: string): void {
        this.headers.sn = serialnumber;
    }

    private async _getEvents(functionName: string, endpoint: string, startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const records: Array<EventRecordResponse> = [];
        try {
            if (filter === undefined)
                filter = { deviceSN: "", stationSN: "", storageType: StorageType.NONE };
            if (maxResults === undefined)
                maxResults = 1000;

            const response = await this.request({
                method: "post",
                endpoint: endpoint,
                data: {
                    device_sn: filter.deviceSN !== undefined ? filter.deviceSN : "",
                    end_time: Math.trunc(endTime.getTime() / 1000),
                    //exclude_guest:false,
                    //house_id:"shared.devices",
                    id: 0,
                    id_type: 1,
                    is_favorite: false,
                    num: maxResults,
                    pullup: true,
                    shared: true,
                    start_time: Math.trunc(startTime.getTime() / 1000),
                    station_sn: filter.stationSN !== undefined ? filter.stationSN : "",
                    storage: filter.storageType !== undefined ? filter.storageType : StorageType.NONE,
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error(`${functionName} - Error:`, error);
                return error;
            });
            this.log.debug(`${functionName} - Response:`, response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    const dataresult: Array<EventRecordResponse> = result.data;
                    if (dataresult) {
                        dataresult.forEach(record => {
                            this.log.debug(`${functionName} - Record:`, record);
                            records.push(record);
                        });
                    }
                } else {
                    this.log.error(`${functionName} - Response code not ok`, {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error(`${functionName} - Status return code not 200`, { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error(`${functionName} - Generic Error:`, error);
        }
        return records;
    }

    public async getVideoEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getVideoEvents", "v1/house/event/video_list", startTime, endTime, filter, maxResults);
    }

    public async getAlarmEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getAlarmEvents", "v1/house/event/alarm_list", startTime, endTime, filter, maxResults);
    }

    public async getHistoryEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getHistoryEvents", "v1/house/event/list", startTime, endTime, filter, maxResults);
    }

    public async getAllVideoEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const fifthyYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getVideoEvents(new Date(new Date().getTime() - fifthyYearsInMilliseconds), new Date(), filter, maxResults);
    }

    public async getAllAlarmEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const fifthyYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getAlarmEvents(new Date(new Date().getTime() - fifthyYearsInMilliseconds), new Date(), filter, maxResults);
    }

    public async getAllHistoryEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const fifthyYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getHistoryEvents(new Date(new Date().getTime() - fifthyYearsInMilliseconds), new Date(), filter, maxResults);
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public async getInvites(): Promise<Invites> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/family/get_invites",
                data: {
                    num: 100,
                    orderby: "",
                    own: false,
                    page: 0,
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const invites: Invites = {};
                        result.data.forEach((invite: Invite) => {
                            invites[invite.invite_id] = invite;
                            invites[invite.invite_id].devices = JSON.parse((invites[invite.invite_id].devices as unknown) as string);
                        });
                        return invites;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return {};
    }

    public async confirmInvites(confirmInvites: Array<ConfirmInvite>): Promise<boolean> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/family/confirm_invite",
                data: {
                    invites: confirmInvites,
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    return true;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return false;
    }

    public async getPublicKey(deviceSN: string, type: PublicKeyType): Promise<string> {
        try {
            if (this.persistentData.device_public_keys[deviceSN] !== undefined) {
                this.log.debug("return cached public key", this.persistentData.device_public_keys[deviceSN]);
                return this.persistentData.device_public_keys[deviceSN];
            } else {
                const response = await this.request({
                    method: "get",
                    endpoint: `v1/app/public_key/query?device_sn=${deviceSN}&type=${type}`
                }).catch(error => {
                    this.log.error("Error:", error);
                    return error;
                });
                this.log.debug("Response:", response.data);

                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            this.persistentData.device_public_keys[deviceSN] = result.data.public_key;
                            return result.data.public_key;
                        }
                    } else {
                        this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                    }
                } else {
                    this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
                }
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return "";
    }

    public async getSensorHistory(stationSN: string, deviceSN: string): Promise<Array<SensorHistoryEntry>> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/app/get_sensor_history",
                data: {
                    devicse_sn: deviceSN,
                    max_time: 0,  //TODO: Finish implementation
                    num: 500,     //TODO: Finish implementation
                    page: 0,      //TODO: Finish implementation
                    station_sn: stationSN,
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const entries: Array<SensorHistoryEntry> = result.data;
                        return entries;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return [];
    }

    public async getHouseDetail(houseID: string): Promise<HouseDetail|null> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/house/detail",
                data: {
                    house_id: houseID,
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        return result.data as HouseDetail;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return null;
    }

    public async getHouseList(): Promise<Array<HouseListResponse>> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/house/list",
                data: {
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        return result.data as Array<HouseListResponse>;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return [];
    }

    public async getHouseInviteList(isInviter = 1): Promise<Array<HouseInviteListResponse>> {
        //TODO: Understand the other values of isInviter and document it
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/house/invite_list",
                data: {
                    is_inviter: isInviter,
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        return result.data as Array<HouseInviteListResponse>;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return [];
    }

    public async confirmHouseInvite(houseID: string, inviteID: number): Promise<boolean> {
        try {
            const response = await this.request({
                method: "post",
                endpoint: "v1/house/confirm_invite",
                data: {
                    house_id: houseID,
                    invite_id: inviteID,
                    is_inviter: 1, // 1 = true, 0 = false
                    //user_id: "",
                    transaction: `${new Date().getTime().toString()}`
                }
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    return true;
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return false;
    }

    public getPersistentData(): HTTPApiPersistentData | undefined {
        return this.persistentData;
    }

    public async getPassportProfile(): Promise<PassportProfileResponse|null> {
        try {
            const response = await this.request({
                method: "get",
                endpoint: "v1/passport/profile"
            }).catch(error => {
                this.log.error("Error:", error);
                return error;
            });
            this.log.debug("Response:", response.data);

            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const profile = result.data as PassportProfileResponse;
                        this.persistentData.user_id = profile.user_id;
                        this.persistentData.nick_name = profile.nick_name;
                        this.persistentData.email = profile.email;
                        return profile;
                    }
                } else {
                    this.log.error("Response code not ok", {code: result.code, msg: result.msg });
                }
            } else {
                this.log.error("Status return code not 200", { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            this.log.error("Generic Error:", error);
        }
        return null;
    }

}