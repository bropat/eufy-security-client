import got, { Got, HTTPError } from "got";
import { TypedEmitter } from "tiny-typed-emitter";
import { dummyLogger, Logger } from "ts-log";
import { isValid as isValidCountry } from "i18n-iso-countries";
import { isValid as isValidLanguage } from "@cospired/i18n-iso-languages";
import { createECDH, ECDH } from "crypto";
import * as schedule from "node-schedule";
import pThrottle from "p-throttle";

import { ResultResponse, LoginResultResponse, TrustDevice, Cipher, Voice, EventRecordResponse, Invite, ConfirmInvite, SensorHistoryEntry, ApiResponse, CaptchaResponse, LoginRequest, HouseDetail, DeviceListResponse, StationListResponse, HouseInviteListResponse, HouseListResponse, PassportProfileResponse, UsersResponse, User, AddUserResponse } from "./models"
import { HTTPApiEvents, Ciphers, FullDevices, Hubs, Voices, Invites, HTTPApiRequest, HTTPApiPersistentData, Houses, LoginOptions } from "./interfaces";
import { EventFilterType, PublicKeyType, ResponseErrorCode, StorageType, VerfyCodeTypes } from "./types";
import { ParameterHelper } from "./parameter";
import { encryptAPIData, decryptAPIData, getTimezoneGMTString, decodeImage } from "./utils";
import { InvalidCountryCodeError, InvalidLanguageCodeError, ensureError } from "./../error";
import { getError, getShortUrl, md5, mergeDeep, parseJSON } from "./../utils";
import { ApiBaseLoadError, ApiGenericError, ApiHTTPResponseCodeError, ApiInvalidResponseError, ApiRequestError, ApiResponseCodeError } from "./error";
import { getNullTerminatedString } from "../p2p/utils";

export class HTTPApi extends TypedEmitter<HTTPApiEvents> {

    private static apiDomainBase = "https://extend.eufylife.com";

    private readonly SERVER_PUBLIC_KEY = "04c5c00c4f8d1197cc7c3167c52bf7acb054d722f0ef08dcd7e0883236e0d72a3868d9750cb47fa4619248f3d83f0f662671dadc6e2d31c2f41db0161651c7c076";

    private apiBase;
    private username: string;
    private password: string;
    private ecdh: ECDH = createECDH("prime256v1");

    private token: string|null = null;
    private tokenExpiration: Date|null = null;
    private renewAuthTokenJob?: schedule.Job;

    private log: Logger;
    private connected = false;
    private requestEufyCloud: Got;

    private throttle = pThrottle({
        limit: 5,
        interval: 1000,
    });

    private devices: FullDevices = {};
    private hubs: Hubs = {};
    private houses: Houses = {};

    private persistentData: HTTPApiPersistentData = {
        user_id: "",
        email: "",
        nick_name: "",
        device_public_keys: {},
        clientPrivateKey: "",
        serverPublicKey: this.SERVER_PUBLIC_KEY
    };

    private headers: Record<string, string> = {
        App_version: "v4.6.0_1630",
        Os_type: "android",
        Os_version: "31",
        Phone_model: "ONEPLUS A3003",
        Country: "DE",
        Language: "en",
        Openudid: "5e4621b0152c0d00",
        //uid: "",
        Net_type: "wifi",
        Mnc: "02",
        Mcc: "262",
        Sn: "75814221ee75",
        Model_type: "PHONE",
        Timezone: "GMT+01:00",
        "Cache-Control": "no-cache",
    };

    private constructor(apiBase: string, country: string, username: string, password: string, log: Logger = dummyLogger, persistentData?: HTTPApiPersistentData) {
        super();

        this.username = username;
        this.password = password;
        this.log = log;
        this.apiBase = apiBase;

        this.log.debug(`Loaded API`, { apieBase: apiBase, country: country, username: username, persistentData: persistentData });

        this.headers.timezone = getTimezoneGMTString();
        this.headers.country = country.toUpperCase();

        if (persistentData) {
            this.persistentData = persistentData;
        }
        if (this.persistentData.clientPrivateKey === undefined || this.persistentData.clientPrivateKey === "") {
            this.ecdh.generateKeys();
            this.persistentData.clientPrivateKey = this.ecdh.getPrivateKey().toString("hex");
        } else {
            try {
                this.ecdh.setPrivateKey(Buffer.from(this.persistentData.clientPrivateKey, "hex"));
            } catch (err) {
                const error = ensureError(err);
                this.log.debug(`Invalid client private key, generate new client private key...`, { error: getError(error) });
                this.ecdh.generateKeys();
                this.persistentData.clientPrivateKey = this.ecdh.getPrivateKey().toString("hex");
            }
        }
        if (this.persistentData.serverPublicKey === undefined || this.persistentData.serverPublicKey === "") {
            this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
        } else {
            try {
                this.ecdh.computeSecret(Buffer.from(this.persistentData.serverPublicKey, "hex"))
            } catch (err) {
                const error = ensureError(err);
                this.log.debug(`Invalid server public key, fallback to default server public key...`, { error: getError(error) });
                this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
            }
        }

        this.requestEufyCloud = got.extend({
            prefixUrl: this.apiBase,
            headers: this.headers,
            responseType: "json",
            //throwHttpErrors: false,
            retry: {
                limit: 3,
                methods: ["GET", "POST"],
                statusCodes: [
                    404,
                    408,
                    413,
                    423,
                    429,
                    500,
                    502,
                    503,
                    504,
                    521,
                    522,
                    524
                ],
                calculateDelay: ({ computedValue }) => {
                    return computedValue * 3;
                }
            },
            hooks: {
                afterResponse: [
                    async (response, retryWithMergedOptions) => {
                        // Unauthorized
                        if (response.statusCode === 401) {
                            const oldToken = this.token;

                            this.log.debug("Invalidate token an get a new one...", { requestUrl: response.requestUrl , statusCode: response.statusCode, statusMessage: response.statusMessage });

                            this.invalidateToken();
                            await this.login({ force: true });

                            if (oldToken !== this.token && this.token) {
                                // Refresh the access token
                                const updatedOptions = {
                                    headers: {
                                        "X-Auth-Token": this.token
                                    }
                                };

                                // Update the defaults
                                this.requestEufyCloud.defaults.options = this.requestEufyCloud.mergeOptions(this.requestEufyCloud.defaults.options, updatedOptions);

                                // Make a new retry
                                return retryWithMergedOptions(updatedOptions);
                            }
                        }

                        // No changes otherwise
                        return response;
                    }
                ],
                beforeRetry: [
                    (options, error, retryCount) => {
                        // This will be called on `retryWithMergedOptions(...)`
                        const statusCode = error?.response?.statusCode || 0;
                        const { method, url, prefixUrl } = options;
                        const shortUrl = getShortUrl(url, prefixUrl);
                        const body = error?.response?.body ? error?.response?.body : error?.message;
                        this.log.debug(`Retrying [${retryCount}]: ${error?.code} (${error?.request?.requestUrl})\n${statusCode} ${method} ${shortUrl}\n${body}`);
                        // Retrying [1]: ERR_NON_2XX_3XX_RESPONSE
                    }
                ],
                beforeError: [
                    error => {
                        const { response, options } = error;
                        const statusCode = response?.statusCode || 0;
                        const { method, url, prefixUrl } = options;
                        const shortUrl = getShortUrl(url, prefixUrl);
                        const body = response?.body ? response.body : error.message;
                        if (response?.body) {
                            error.name = "EufyApiError";
                            error.message = `${statusCode} ${method} ${shortUrl}\n${body}`;
                        }
                        return error;
                    }
                ],
                beforeRequest: [
                    async _options => {
                        await this.throttle(async () => { return; })();
                    }
                ]
            },
            mutableDefaults: true
        });
    }

    public static async getApiBaseFromCloud(country: string): Promise<string> {
        const response = await got(`domain/${country}`, {
            prefixUrl: this.apiDomainBase,
            method: "GET",
            responseType: "json",
            retry: {
                limit: 1,
                methods: ["GET"]
            }
        });

        const result: ResultResponse = response.body as ResultResponse;
        if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
            return `https://${result.data.domain}`;
        }
        throw new ApiBaseLoadError("Error identifying API base from cloud", { context: { code: result.code, message: result.msg } });
    }

    static async initialize(country: string, username: string, password: string, log: Logger = dummyLogger, persistentData?: HTTPApiPersistentData): Promise<HTTPApi> {
        if (isValidCountry(country) && country.length === 2) {
            const apiBase = await this.getApiBaseFromCloud(country);
            return new HTTPApi(apiBase, country, username, password, log, persistentData);
        }
        throw new InvalidCountryCodeError("Invalid ISO 3166-1 Alpha-2 country code", { context: { countryCode: country } });
    }

    private clearScheduleRenewAuthToken(): void {
        if (this.renewAuthTokenJob !== undefined) {
            this.renewAuthTokenJob.cancel();
        }
    }

    private scheduleRenewAuthToken(): void {
        this.clearScheduleRenewAuthToken();
        if (this.tokenExpiration !== null) {
            const scheduleDate = new Date(this.tokenExpiration.getTime() - (1000 * 60 * 60 * 24));
            if (this.renewAuthTokenJob === undefined) {
                this.renewAuthTokenJob = schedule.scheduleJob("renewAuthToken", scheduleDate, async () => {
                    this.log.info("Authentication token is soon expiring, fetching a new one...");
                    await this.login({ force: true });
                });
            } else {
                this.renewAuthTokenJob.schedule(scheduleDate);
            }
        }
    }

    private invalidateToken(): void {
        this.token = null;
        this.requestEufyCloud.defaults.options.headers["X-Auth-Token"] = undefined;
        this.tokenExpiration = null;
        this.clearScheduleRenewAuthToken();
        this.emit("auth token invalidated");
    }

    public setPhoneModel(model: string): void {
        this.headers.phone_model = model.toUpperCase();
        this.requestEufyCloud.defaults.options.headers = this.headers;
    }

    public getPhoneModel(): string {
        return this.headers.phone_model;
    }

    public getCountry(): string {
        return this.headers.country;
    }

    public setLanguage(language: string): void {
        if (isValidLanguage(language) && language.length === 2) {
            this.headers.language = language;
            this.requestEufyCloud.defaults.options.headers = this.headers;
        } else
            throw new InvalidLanguageCodeError("Invalid ISO 639 language code", { context: { languageCode: language } });
    }

    public getLanguage(): string {
        return this.headers.language;
    }

    public async login(options?: LoginOptions): Promise<void> {
        options = mergeDeep(options, {
            force: false
        } as LoginOptions) as LoginOptions;
        this.log.debug("Login and get an access token", { token: this.token, tokenExpiration: this.tokenExpiration, options: options });
        if (!this.token || (this.tokenExpiration && (new Date()).getTime() >= this.tokenExpiration.getTime()) || options.verifyCode || options.captcha || options.force) {
            try {
                const data: LoginRequest = {
                    ab: this.headers.country,
                    client_secret_info: {
                        public_key: this.ecdh.getPublicKey("hex")
                    },
                    enc: 0,
                    email: this.username,
                    password:  encryptAPIData(this.password, this.ecdh.computeSecret(Buffer.from(this.SERVER_PUBLIC_KEY, "hex"))),
                    time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
                    transaction: `${new Date().getTime()}`
                };
                if (options.verifyCode) {
                    data.verify_code = options.verifyCode;
                } else if (options.captcha) {
                    data.captcha_id = options.captcha.captchaId;
                    data.answer = options.captcha.captchaCode;
                }
                const response: ApiResponse = await this.request({
                    method: "post",
                    endpoint: "v2/passport/login_sec",
                    data: data
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.data !== undefined) {
                        if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                            const dataresult: LoginResultResponse = result.data;

                            if (dataresult.server_secret_info?.public_key)
                                this.persistentData.serverPublicKey = dataresult.server_secret_info.public_key;

                            this.persistentData.user_id = dataresult.user_id;
                            this.persistentData.email = this.decryptAPIData(dataresult.email, false);
                            this.persistentData.nick_name = dataresult.nick_name;

                            this.setToken(dataresult.auth_token);
                            this.tokenExpiration = new Date(dataresult.token_expires_at * 1000);
                            this.headers = {
                                ...this.headers,
                                gtoken: md5(dataresult.user_id)
                            };
                            this.log.debug("Login - Token data", { token: this.token, tokenExpiration: this.tokenExpiration, serverPublicKey: this.persistentData.serverPublicKey });
                            if (!this.connected) {
                                this.connected = true;
                                this.emit("connect");
                            }
                            this.scheduleRenewAuthToken();
                        } else if (result.code == ResponseErrorCode.CODE_NEED_VERIFY_CODE) {
                            this.log.debug(`Login - Send verification code...`);
                            const dataresult: LoginResultResponse = result.data;

                            this.setToken(dataresult.auth_token);
                            this.tokenExpiration = new Date(dataresult.token_expires_at * 1000);

                            this.log.debug("Token data", { token: this.token, tokenExpiration: this.tokenExpiration });
                            await this.sendVerifyCode(VerfyCodeTypes.TYPE_EMAIL);
                            this.emit("tfa request");
                        } else if (result.code == ResponseErrorCode.LOGIN_NEED_CAPTCHA || result.code == ResponseErrorCode.LOGIN_CAPTCHA_ERROR) {
                            const dataresult: CaptchaResponse = result.data;
                            this.log.debug("Login - Captcha verification received", { captchaId: dataresult.captcha_id, item: dataresult.item });
                            this.emit("captcha request", dataresult.captcha_id, dataresult.item);
                        } else {
                            this.log.error("Login - Response code not ok", {code: result.code, msg: result.msg, data: response.data });
                            this.emit("connection error", new ApiResponseCodeError("API response code not ok", { context: { code: result.code, message: result.msg } }));
                        }
                    } else {
                        this.log.error("Login - Response data is missing", {code: result.code, msg: result.msg, data: result.data });
                        this.emit("connection error", new ApiInvalidResponseError("API response data is missing", { context: { code: result.code, message: result.msg, data: result.data } }));
                    }
                } else {
                    this.log.error("Login - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                    this.emit("connection error", new ApiHTTPResponseCodeError("API HTTP response code not ok", { context: { status: response.status, statusText: response.statusText } }));
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Login - Generic Error:", { error: getError(error) });
                this.emit("connection error", new ApiGenericError("Generic API error", { cause: error }));
            }
        } else if (!this.connected) {
            try {
                const profile = await this.getPassportProfile();
                if (profile !== null) {
                    this.connected = true;
                    this.emit("connect");
                    this.scheduleRenewAuthToken();
                } else {
                    this.emit("connection error", new ApiInvalidResponseError(`Invalid passport profile response`));
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Login - getPassportProfile Error", { error: getError(error) });
                this.emit("connection error", new ApiGenericError("API get passport profile error", { cause: error }));
            }
        }
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
            });
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    this.log.info(`Requested verification code for 2FA`);
                    return true;
                } else {
                    this.log.error("Send verify code - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                }
            } else {
                this.log.error("Send verify code - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
            }
        } catch (err) {
            const error = ensureError(err);
            this.log.error("Send verify code - Generic Error", { error: getError(error) });
        }
        return false;
    }

    public async listTrustDevice(): Promise<Array<TrustDevice>> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "get",
                    endpoint: "v1/app/trust_device/list"
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data && result.data.list) {
                            return result.data.list;
                        }
                    } else {
                        this.log.error("List trust device - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                } else {
                    this.log.error("List trust device - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("List trust device - Generic Error", { error: getError(error) });
            }
        }
        return [];
    }

    public async addTrustDevice(verifyCode: string): Promise<boolean> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/app/trust_device/add",
                    data: {
                        verify_code: verifyCode,
                        transaction: `${new Date().getTime()}`
                    }
                });
                this.log.debug("Add trust device - Response trust device", { verifyCode: verifyCode, data: response.data });

                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        this.log.info(`2FA authentication successfully done. Device trusted.`);
                        const trusted_devices = await this.listTrustDevice();
                        trusted_devices.forEach((trusted_device: TrustDevice) => {
                            if (trusted_device.is_current_device === 1) {
                                this.log.debug("Add trust device - This device is trusted. Token expiration extended:", { trustDevice: { phoneModel: trusted_device.phone_model, openUdid: trusted_device.open_udid }, tokenExpiration: this.tokenExpiration});
                            }
                        });
                        return true;
                    } else {
                        this.log.error("Add trust device - Response code not ok", { code: result.code, msg: result.msg, verifyCode: verifyCode, data: response.data });
                    }
                } else {
                    this.log.error("Add trust device - Status return code not 200", { status: response.status, statusText: response.statusText, verifyCode: verifyCode, data: response.data });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Add trust device - Generic Error", { error: getError(error) });
            }
        }
        return false;
    }

    public async getStationList(): Promise<Array<StationListResponse>> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v2/house/station_list",
                    data: {
                        device_sn: "",
                        num: 1000,
                        orderby: "",
                        page: 0,
                        station_sn: "",
                        time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
                        transaction: `${new Date().getTime()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        if (result.data) {
                            const stationList = this.decryptAPIData(result.data) as Array<StationListResponse>;
                            this.log.debug("Decrypted station list data", stationList);
                            return stationList;
                        }
                    } else {
                        this.log.error("Station list - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                } else {
                    this.log.error("Station list - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Station list - Generic Error", { error: getError(error) });
            }
        }
        return [];
    }

    public async getDeviceList(): Promise<Array<DeviceListResponse>> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v2/house/device_list",
                    data: {
                        device_sn: "",
                        num: 1000,
                        orderby: "",
                        page: 0,
                        station_sn: "",
                        time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
                        transaction: `${new Date().getTime()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        if (result.data) {
                            const deviceList = this.decryptAPIData(result.data) as Array<DeviceListResponse>;
                            this.log.debug("Decrypted device list data", deviceList);
                            return deviceList;
                        }
                    } else {
                        this.log.error("Device list - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                } else {
                    this.log.error("Device list - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Device list - Generic Error", { error: getError(error) });
            }
        }
        return [];
    }

    public async refreshHouseData(): Promise<void> {
        //Get Houses
        const houses = await this.getHouseList();
        if (houses && houses.length > 0) {
            houses.forEach(element => {
                this.houses[element.house_id] = element;
            });
        } else {
            this.log.info("No houses found.");
        }
        this.emit("houses", this.houses);
    }

    public async refreshStationData(): Promise<void> {
        //Get Stations
        const stations = await this.getStationList();
        if (stations && stations.length > 0) {
            stations.forEach(element => {
                this.hubs[element.station_sn] = element;
            });
        } else {
            this.log.info("No stations found.");
        }
        this.emit("hubs", this.hubs);
    }

    public async refreshDeviceData(): Promise<void> {
        //Get Devices
        const devices = await this.getDeviceList();
        if (devices && devices.length > 0) {
            devices.forEach(element => {
                this.devices[element.device_sn] = element;
            });
        } else {
            this.log.info("No devices found.");
        }
        this.emit("devices", this.devices);
    }

    public async refreshAllData(): Promise<void> {
        //Get the latest info

        //Get Houses
        await this.refreshHouseData();

        //Get Stations
        await this.refreshStationData();

        //Get Devices
        await this.refreshDeviceData();
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public async request(request: HTTPApiRequest): Promise<ApiResponse> {
        this.log.debug("Api request", { method: request.method, endpoint: request.endpoint, responseType: request.responseType, token: this.token, data: request.data });
        try {
            const internalResponse = await this.requestEufyCloud(request.endpoint, {
                method: request.method,
                json: request.data,
                responseType: request.responseType !== undefined ? request.responseType : "json"
            });
            const response: ApiResponse = {
                status: internalResponse.statusCode,
                statusText: internalResponse.statusMessage ? internalResponse.statusMessage : "",
                headers: internalResponse.headers,
                data: internalResponse.body,
            };
            this.log.debug("Api request - Response", { token: this.token, request: request, response: response.data });

            return response;
        } catch (err) {
            const error = ensureError(err);
            if (error instanceof HTTPError) {
                if (error.response.statusCode === 401) {
                    this.invalidateToken();
                    this.log.error("Status return code 401, invalidate token", { status: error.response.statusCode, statusText: error.response.statusMessage });
                    this.connected = false;
                    this.emit("close");
                }
            }
            throw new ApiRequestError("API request error", { cause: error, context: { method: request.method, endpoint: request.endpoint, responseType: request.responseType, token: this.token, data: request.data } });
        }
    }

    public async checkPushToken(): Promise<boolean> {
        //Check push notification token
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/app/review/app_push_check",
                    data: {
                        app_type: "eufySecurity",
                        transaction: `${new Date().getTime()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        this.log.debug(`Check push token - Push token OK`);
                        return true;
                    } else {
                        this.log.error("Check push token - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                } else {
                    this.log.error("Check push token - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Check push token - Generic Error", { error: getError(error) });
            }
        }
        return false;
    }

    public async registerPushToken(token: string): Promise<boolean> {
        //Register push notification token
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/apppush/register_push_token",
                    data: {
                        is_notification_enable: true,
                        token: token,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        this.log.debug(`Register push token - Push token registered successfully`);
                        return true;
                    } else {
                        this.log.error("Register push token - Response code not ok", { code: result.code, msg: result.msg, data: response.data, token: token });
                    }
                } else {
                    this.log.error("Register push token - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, token: token });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Register push token - Generic Error", { error: getError(error), token: token });
            }
        }
        return false;
    }

    public async setParameters(stationSN: string, deviceSN: string, params: { paramType: number; paramValue: any; }[]): Promise<boolean> {
        if (this.connected) {
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
                });
                this.log.debug("Set paramter - Response:", { stationSN: stationSN, deviceSN: deviceSN, params: tmp_params, response: response.data });

                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        const dataresult = result.data;
                        this.log.debug("Set paramter - New parameters set", { params: tmp_params, response: dataresult });
                        return true;
                    } else {
                        this.log.error("Set paramter - Response code not ok", { code: result.code, msg: result.msg, data: response.data, stationSN: stationSN, deviceSN: deviceSN, params: params });
                    }
                } else {
                    this.log.error("Set paramter - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, stationSN: stationSN, deviceSN: deviceSN, params: params });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Set paramter - Generic Error", { error: getError(error), stationSN: stationSN, deviceSN: deviceSN, params: params });
            }
        }
        return false;
    }

    public async getCiphers(cipherIDs: Array<number>, userID: string): Promise<Ciphers> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/app/cipher/get_ciphers",
                    data: {
                        cipher_ids: cipherIDs,
                        user_id: userID,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
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
                        this.log.error("Get ciphers - Response code not ok", { code: result.code, msg: result.msg, data: response.data, cipherIDs: cipherIDs, userID: userID });
                    }
                } else {
                    this.log.error("Get ciphers - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, cipherIDs: cipherIDs, userID: userID });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get ciphers - Generic Error", { error: getError(error), cipherIDs: cipherIDs, userID: userID });
            }
        }
        return {};
    }

    public async getVoices(deviceSN: string): Promise<Voices> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "get",
                    endpoint: `v1/voice/response/lists/${deviceSN}`
                });
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
                        this.log.error("Get Voices - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN });
                    }
                } else {
                    this.log.error("Get Voices - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get Voices - Generic Error", { error: getError(error), deviceSN: deviceSN });
            }
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

    public setToken(token: string): void {
        this.token = token;
        this.requestEufyCloud.defaults.options.headers["X-Auth-Token"] = token;
    }

    public setTokenExpiration(tokenExpiration: Date): void {
        this.tokenExpiration = tokenExpiration;
    }

    public getAPIBase(): string {
        return this.requestEufyCloud.defaults.options.prefixUrl;
    }

    public setOpenUDID(openudid: string): void {
        this.headers.openudid = openudid;
        this.requestEufyCloud.defaults.options.headers = this.headers;
    }

    public setSerialNumber(serialnumber: string): void {
        this.headers.sn = serialnumber;
        this.requestEufyCloud.defaults.options.headers = this.headers;
    }

    private async _getEvents(functionName: string, endpoint: string, startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const records: Array<EventRecordResponse> = [];
        if (this.connected) {
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
                        exclude_guest: false,
                        house_id: "HOUSEID_ALL_DEVICE",
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
                });
                this.log.debug(`${functionName} - Response:`, response.data);

                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        if (result.data) {
                            const dataresult: Array<EventRecordResponse> = this.decryptAPIData(result.data);
                            this.log.debug(`${functionName} - Decrypted data:`, dataresult);
                            if (dataresult) {
                                dataresult.forEach(record => {
                                    this.log.debug(`${functionName} - Record:`, record);
                                    records.push(record);
                                });
                            }
                        } else {
                            this.log.error(`${functionName} - Response data is missing`, { code: result.code, msg: result.msg, data: response.data, endpoint: endpoint, startTime: startTime, endTime: endTime, filter: filter, maxResults: maxResults });
                        }
                    } else {
                        this.log.error(`${functionName} - Response code not ok`, {code: result.code, msg: result.msg, data: response.data, endpoint: endpoint, startTime: startTime, endTime: endTime, filter: filter, maxResults: maxResults });
                    }
                } else {
                    this.log.error(`${functionName} - Status return code not 200`, { status: response.status, statusText: response.statusText, data: response.data, endpoint: endpoint, startTime: startTime, endTime: endTime, filter: filter, maxResults: maxResults });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error(`${functionName} - Generic Error`, { error: getError(error), endpoint: endpoint, startTime: startTime, endTime: endTime, filter: filter, maxResults: maxResults });
            }
        }
        return records;
    }

    public async getVideoEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getVideoEvents", "v2/event/app/get_all_video_record", startTime, endTime, filter, maxResults);
    }

    public async getAlarmEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getAlarmEvents", "v2/event/app/get_all_alarm_record", startTime, endTime, filter, maxResults);
    }

    public async getHistoryEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getHistoryEvents", "v2/event/app/get_all_history_record", startTime, endTime, filter, maxResults);
    }

    public async getAllVideoEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const fifteenYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getVideoEvents(new Date(new Date().getTime() - fifteenYearsInMilliseconds), new Date(), filter, maxResults);
    }

    public async getAllAlarmEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const fifteenYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getAlarmEvents(new Date(new Date().getTime() - fifteenYearsInMilliseconds), new Date(), filter, maxResults);
    }

    public async getAllHistoryEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const fifteenYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getHistoryEvents(new Date(new Date().getTime() - fifteenYearsInMilliseconds), new Date(), filter, maxResults);
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public async getInvites(): Promise<Invites> {
        if (this.connected) {
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
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const invites: Invites = {};
                            result.data.forEach((invite: Invite) => {
                                invites[invite.invite_id] = invite;
                                let data = parseJSON((invites[invite.invite_id].devices as unknown) as string, this.log);
                                if (data === undefined)
                                    data = [];
                                invites[invite.invite_id].devices = data;
                            });
                            return invites;
                        }
                    } else {
                        this.log.error("Get invites - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                } else {
                    this.log.error("Get invites - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get invites - Generic Error", { error: getError(error) });
            }
        }
        return {};
    }

    public async confirmInvites(confirmInvites: Array<ConfirmInvite>): Promise<boolean> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/family/confirm_invite",
                    data: {
                        invites: confirmInvites,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        return true;
                    } else {
                        this.log.error("Confirm invites - Response code not ok", { code: result.code, msg: result.msg, data: response.data, confirmInvites: confirmInvites });
                    }
                } else {
                    this.log.error("Confirm invites - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, confirmInvites: confirmInvites });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Confirm invites - Generic Error", { error: getError(error), confirmInvites: confirmInvites });
            }
        }
        return false;
    }

    public async getPublicKey(deviceSN: string, type: PublicKeyType): Promise<string> {
        if (this.connected) {
            try {
                if (this.persistentData.device_public_keys[deviceSN] !== undefined && type === PublicKeyType.LOCK) {
                    this.log.debug("return cached public key", this.persistentData.device_public_keys[deviceSN]);
                    return this.persistentData.device_public_keys[deviceSN];
                } else {
                    const response = await this.request({
                        method: "get",
                        endpoint: `v1/app/public_key/query?device_sn=${deviceSN}&type=${type}`
                    });
                    if (response.status == 200) {
                        const result: ResultResponse = response.data;
                        if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                            if (result.data) {
                                if (type === PublicKeyType.LOCK)
                                    this.persistentData.device_public_keys[deviceSN] = result.data.public_key;
                                return result.data.public_key;
                            }
                        } else {
                            this.log.error("Get public key - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, type: type });
                        }
                    } else {
                        this.log.error("Get public key - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, type: type });
                    }
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get public key - Generic Error", { error: getError(error), deviceSN: deviceSN, type: type });
            }
        }
        return "";
    }

    public decryptAPIData(data?: string, json = true): any {
        if (data) {
            let decryptedData: Buffer | undefined;
            try {
                decryptedData = decryptAPIData(data, this.ecdh.computeSecret(Buffer.from(this.persistentData.serverPublicKey, "hex")));
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Data decryption error, invalidating session data and reconnecting...", { error: getError(error) });
                this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
                this.invalidateToken();
                this.emit("close");
            }
            if (decryptedData) {
                const str = getNullTerminatedString(decryptedData, "utf-8");
                if (json)
                    return parseJSON(str, this.log);
                return str;
            }
            if (json)
                return {};
        }
        return undefined;
    }

    public async getSensorHistory(stationSN: string, deviceSN: string): Promise<Array<SensorHistoryEntry>> {
        if (this.connected) {
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
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const entries: Array<SensorHistoryEntry> = result.data;
                            return entries;
                        }
                    } else {
                        this.log.error("Get sensor history - Response code not ok", { code: result.code, msg: result.msg, data: response.data, stationSN: stationSN, deviceSN: deviceSN });
                    }
                } else {
                    this.log.error("Get sensor history - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, stationSN: stationSN, deviceSN: deviceSN });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get sensor history - Generic Error", { error: getError(error), stationSN: stationSN, deviceSN: deviceSN });
            }
        }
        return [];
    }

    public async getHouseDetail(houseID: string): Promise<HouseDetail|null> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v2/house/detail",
                    data: {
                        house_id: houseID,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const houseDetail = this.decryptAPIData(result.data) as HouseDetail;
                            this.log.debug("Get house detail - Decrypted house detail data", { details: houseDetail });
                            return houseDetail;
                        }
                    } else {
                        this.log.error("Get house detail - Response code not ok", { code: result.code, msg: result.msg, data: response.data, houseID: houseID });
                    }
                } else {
                    this.log.error("Get house detail - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, houseID: houseID });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get house detail - Generic Error", { error: getError(error), houseID: houseID });
            }
        }
        return null;
    }

    public async getHouseList(): Promise<Array<HouseListResponse>> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/house/list",
                    data: {
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            this.log.debug("Get house list - houses", { houses: result.data });
                            return result.data as Array<HouseListResponse>;
                        }
                    } else {
                        this.log.error("Get house list - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                } else {
                    this.log.error("Get house list - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get house list - Generic Error", { error: getError(error) });
            }
        }
        return [];
    }

    public async getHouseInviteList(isInviter = 1): Promise<Array<HouseInviteListResponse>> {
        //TODO: Understand the other values of isInviter and document it
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/house/invite_list",
                    data: {
                        is_inviter: isInviter,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const houseInviteList = this.decryptAPIData(result.data) as Array<HouseInviteListResponse>;
                            this.log.debug("Get house invite list - Decrypted house invite list data", houseInviteList);
                            return houseInviteList;
                        }
                    } else {
                        this.log.error("Get house invite list - Response code not ok", { code: result.code, msg: result.msg, data: response.data, isInviter: isInviter });
                    }
                } else {
                    this.log.error("Get house invite list - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, isInviter: isInviter });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get house invite list - Generic Error", { error: getError(error), isInviter: isInviter });
            }
        }
        return [];
    }

    public async confirmHouseInvite(houseID: string, inviteID: number): Promise<boolean> {
        if (this.connected) {
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
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        return true;
                    } else {
                        this.log.error("Confirm house invite - Response code not ok", { code: result.code, msg: result.msg, data: response.data, houseID: houseID, inviteID: inviteID });
                    }
                } else {
                    this.log.error("Confirm house invite - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, houseID: houseID, inviteID: inviteID });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Confirm house invite - Generic Error", { error: getError(error), houseID: houseID, inviteID: inviteID });
            }
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
                endpoint: "v2/passport/profile"
            });
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const profile = this.decryptAPIData(result.data) as PassportProfileResponse;
                        this.log.debug("Get passport profile - Decrypted passport profile data", { profile: profile });
                        this.persistentData.user_id = profile.user_id;
                        this.persistentData.nick_name = profile.nick_name;
                        this.persistentData.email = profile.email;
                        return profile;
                    }
                } else {
                    this.log.error("Get passport profile - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                }
            } else {
                this.log.error("Get passport profile - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
            }
        } catch (err) {
            const error = ensureError(err);
            this.log.error("Get passport profile - Generic Error", { error: getError(error) });
        }
        return null;
    }

    public async addUser(deviceSN: string, nickname: string, stationSN = ""): Promise<AddUserResponse|null> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/app/device/local_user/add",
                    data: {
                        device_sn: deviceSN,
                        nick_name: nickname,
                        station_sn: stationSN === deviceSN ? "" : stationSN,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data)
                            return result.data as AddUserResponse;
                    } else {
                        this.log.error("Add user - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, nickname: nickname, stationSN: stationSN });
                    }
                } else {
                    this.log.error("Add user - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, nickname: nickname, stationSN: stationSN });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Add user - Generic Error", { error: getError(error), deviceSN: deviceSN, nickname: nickname, stationSN: stationSN });
            }
        }
        return null;
    }

    public async deleteUser(deviceSN: string, shortUserId: string, stationSN = ""): Promise<boolean> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/app/device/user/delete",
                    data: {
                        device_sn: deviceSN,
                        short_user_ids: [shortUserId],
                        station_sn: stationSN === deviceSN ? "" : stationSN,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        return true;
                    } else {
                        this.log.error("Delete user - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, shortUserId: shortUserId, stationSN: stationSN });
                    }
                } else {
                    this.log.error("Delete user - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, shortUserId: shortUserId, stationSN: stationSN });
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Delete user - Generic Error", { error: getError(error), deviceSN: deviceSN, shortUserId: shortUserId, stationSN: stationSN });
            }
        }
        return false;
    }

    public async getUsers(deviceSN: string, stationSN: string): Promise<Array<User>|null> {
        try {
            const response = await this.request({
                method: "get",
                endpoint: `v1/app/device/user/list?device_sn=${deviceSN}&station_sn=${stationSN}`
            });
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const usersResponse = result.data as UsersResponse;
                        return usersResponse.user_list;
                    }
                } else {
                    this.log.error("Get users - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, stationSN: stationSN });
                }
            } else {
                this.log.error("Get users - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, stationSN: stationSN });
            }
        } catch (err) {
            const error = ensureError(err);
            this.log.error("Get users - Generic Error", { error: getError(error), deviceSN: deviceSN, stationSN: stationSN });
        }
        return null;
    }

    public async getUser(deviceSN: string, stationSN: string, shortUserId: string): Promise<User|null> {
        try {
            const users = await this.getUsers(deviceSN, stationSN);
            if (users !== null) {
                for (const user of users) {
                    if (user.short_user_id === shortUserId) {
                        return user;
                    }
                }
            }
        } catch (err) {
            const error = ensureError(err);
            this.log.error("Get user - Generic Error", { error: getError(error), deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId });
        }
        return null;
    }

    public async updateUser(deviceSN: string, stationSN: string, shortUserId: string, nickname: string): Promise<boolean> {
        if (this.connected) {
            try {
                const user = await this.getUser(deviceSN, stationSN, shortUserId);
                if (user !== null) {
                    const response = await this.request({
                        method: "post",
                        endpoint: "v1/app/device/local_user/update",
                        data: {
                            device_sn: deviceSN,
                            nick_name: nickname,
                            password_list: user.password_list,
                            short_user_id: shortUserId,
                            station_sn: stationSN === deviceSN ? "" : stationSN,
                            user_type: user.user_type,
                            transaction: `${new Date().getTime().toString()}`
                        }
                    });
                    if (response.status == 200) {
                        const result: ResultResponse = response.data;
                        if (result.code == ResponseErrorCode.CODE_WHATEVER_ERROR) {
                            return true;
                        } else {
                            this.log.error("Update user - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId, nickname: nickname });
                        }
                    } else {
                        this.log.error("Update user - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId, nickname: nickname });
                    }
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Update user - Generic Error", { error: getError(error), deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId, nickname: nickname });
            }
        }
        return false;
    }

    public async getImage(deviceSN: string, url: string): Promise<Buffer> {
        if (this.connected) {
            try {
                const device = this.devices[deviceSN];
                if (device) {
                    const station = this.hubs[device.station_sn];
                    if (station) {
                        const response = await this.request({
                            method: "GET",
                            endpoint: new URL(url),
                            responseType: "buffer"
                        });
                        if (response.status == 200) {
                            return decodeImage(station.p2p_did, response.data as Buffer);
                        } else {
                            this.log.error("Get Image - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, url: url });
                        }
                    }
                }
            } catch (err) {
                const error = ensureError(err);
                this.log.error("Get Image - Generic Error", { error: getError(error), deviceSN: deviceSN, url: url });
            }
        }
        return Buffer.alloc(0);
    }

}