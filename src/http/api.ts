import type { Got, OptionsOfBufferResponseBody, OptionsOfJSONResponseBody, OptionsOfTextResponseBody, OptionsOfUnknownResponseBody } from "got" with {
    "resolution-mode": "import"
};
import type { AnyFunction, ThrottledFunction } from "p-throttle" with {
    "resolution-mode": "import"
};

import { TypedEmitter } from "tiny-typed-emitter";
import { isValid as isValidCountry } from "i18n-iso-countries";
import { isValid as isValidLanguage } from "@cospired/i18n-iso-languages";
import { createECDH, ECDH } from "crypto";
import * as schedule from "node-schedule";

import { ResultResponse, LoginResultResponse, TrustDevice, Cipher, Voice, EventRecordResponse, Invite, ConfirmInvite, SensorHistoryEntry, ApiResponse, CaptchaResponse, LoginRequest, HouseDetail, DeviceListResponse, StationListResponse, HouseInviteListResponse, HouseListResponse, PassportProfileResponse, UsersResponse, User, AddUserResponse } from "./models"
import { HTTPApiEvents, Ciphers, FullDevices, Hubs, Voices, Invites, HTTPApiRequest, HTTPApiPersistentData, Houses, LoginOptions, Schedule } from "./interfaces";
import { EventFilterType, PublicKeyType, ResponseErrorCode, StorageType, UserPasswordType, VerfyCodeTypes } from "./types";
import { ParameterHelper } from "./parameter";
import { encryptAPIData, decryptAPIData, getTimezoneGMTString, decodeImage, hexDate, hexTime, hexWeek } from "./utils";
import { InvalidCountryCodeError, InvalidLanguageCodeError, ensureError } from "./../error";
import { getError, getShortUrl, md5, mergeDeep, parseJSON } from "./../utils";
import { ApiBaseLoadError, ApiGenericError, ApiHTTPResponseCodeError, ApiInvalidResponseError, ApiRequestError, ApiResponseCodeError } from "./error";
import { getNullTerminatedString } from "../p2p/utils";
import { rootHTTPLogger } from "../logging";

type pThrottledFunction = <F extends AnyFunction>(function_: F) => ThrottledFunction<F>;

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

    private connected = false;

    private requestEufyCloud!: Got;
    private throttle!: pThrottledFunction;

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

    private headers: Record<string, string | undefined> = {
        "User-Agent": undefined,
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

    private apiVerifyCode = 'v1/sms/send/verify_code';
    private apiTrustDevice = 'v1/app/trust_device/add';
    private apiGetStations = "v2/house/station_list";
    private apiGetDevices =  "v2/house/device_list";
    private apiPushCheck =  "v1/app/review/app_push_check";
    private apiRegisterPushToken = "v1/apppush/register_push_token";
    private apiSetParameters = "v1/app/upload_devs_params";
    private apiGetCiphers =  "v2/app/cipher/get_ciphers";

    private apiEventGetAllVideoRecord = "v2/event/app/get_all_video_record";
    private apiEventGetAllAlarmRecord = "v2/event/app/get_all_alarm_record";
    private apiEventGetAllHistoryRecord = "v2/event/app/get_all_history_record";

    private apiGetInvites = "v2/family/get_invites";
    private apiConfirmInvite =  "v1/family/confirm_invite";

    private apiGetSensorHistory = "v1/app/get_sensor_history";

    private apiGetHouseDetail = "v2/house/detail";
    private apiGetHouseList = "v1/house/list";
    private apiGetHouseInvites = "v1/house/invite_list";
    private apiConfirmHouseInvite = "v1/house/confirm_invite";

    private apiAddLocalUser =  "v1/app/device/local_user/add";
    private apiDeleteLocalUser = "v1/app/device/user/delete";
    private apiUpdateLocalUser = "v1/app/device/local_user/update";
    private apiUpdateUserPassword = "v1/app/device/password/save_or_update";

    private FIFTEEN_YEARS_IN_MS = 15 * 365 * 24 * 60 * 60 * 1000;

    private constructor(apiBase: string, country: string, username: string, password: string, persistentData?: HTTPApiPersistentData) {
        super();

        this.username = username;
        this.password = password;
        this.apiBase = apiBase;

        rootHTTPLogger.debug(`Loaded API`, { apieBase: apiBase, country: country, username: username, persistentData: persistentData });

        this.headers.timezone = getTimezoneGMTString();
        this.headers.country = country.toUpperCase();

        if (persistentData) {
            this.persistentData = persistentData;
        }
        // Generated key based on the provided one
        if (this.persistentData.clientPrivateKey !== undefined && this.persistentData.clientPrivateKey !== "") {
            try {
                this.ecdh.setPrivateKey(Buffer.from(this.persistentData.clientPrivateKey, "hex"));
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.debug(`Invalid client private key, generate new client private key...`, {error: getError(error)});
                this.generateNewKey();
            }
        } else {
           this.generateNewKey();
        }

        if (this.persistentData.serverPublicKey === undefined || this.persistentData.serverPublicKey === "") {
            this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
        } else {
            try {
                this.ecdh.computeSecret(Buffer.from(this.persistentData.serverPublicKey, "hex"))
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.debug(`Invalid server public key, fallback to default server public key...`, { error: getError(error) });
                this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
            }
        }
    }

    private generateNewKey(): void {
        /*
            Generate a new client private key
         */
        this.ecdh.generateKeys();
        this.persistentData.clientPrivateKey = this.ecdh.getPrivateKey().toString("hex");
    }

    public static async getApiBaseFromCloud(country: string): Promise<string> {
        /**
            Query the main api with the country code ton ensure it is a valid and returns the correct api

            @param country
         **/
        const { default: got } = await import("got");
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
        if (result.code == ResponseErrorCode.CODE_OK) {
            return `https://${result.data.domain}`;
        }
        throw new ApiBaseLoadError("Error identifying API base from cloud", { context: { code: result.code, message: result.msg } });
    }

    private async loadLibraries(): Promise<void> {
        /**
         *
         *
         */
        const { default: pThrottle } = await import("p-throttle");
        const { default: got } = await import("got");
        this.throttle = pThrottle({
            limit: 5,
            interval: 1000,
        });
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

                            rootHTTPLogger.debug("Invalidate token an get a new one...", { requestUrl: response.requestUrl , statusCode: response.statusCode, statusMessage: response.statusMessage });

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
                                this.requestEufyCloud.defaults.options.merge(updatedOptions);

                                // Make a new retry
                                return retryWithMergedOptions(updatedOptions);
                            }
                        }

                        // No changes otherwise
                        return response;
                    }
                ],
                beforeRetry: [
                    (error) => {
                        // This will be called on `retryWithMergedOptions(...)`
                        const statusCode = error.response?.statusCode || 0;
                        const { method, url, prefixUrl } = error.options;
                        const shortUrl = getShortUrl(typeof url === "string" ? new URL(url) : url === undefined ? new URL("") : url, typeof prefixUrl === "string" ? prefixUrl : prefixUrl.toString());
                        const body = error.response?.body ? error.response?.body : error.message;
                        rootHTTPLogger.debug(`Retrying [${error.request?.retryCount !== undefined ? error.request?.retryCount + 1 : 1}]: ${error.code} (${error.request?.requestUrl})\n${statusCode} ${method} ${shortUrl}\n${body}`);
                        // Retrying [1]: ERR_NON_2XX_3XX_RESPONSE
                    }
                ],
                beforeError: [
                    error => {
                        const { response, options } = error;
                        const statusCode = response?.statusCode || 0;
                        const { method, url, prefixUrl } = options;
                        const shortUrl = getShortUrl(typeof url === "string" ? new URL(url) : url === undefined ? new URL("") : url, typeof prefixUrl === "string" ? prefixUrl : prefixUrl.toString());
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

    static async initialize(country: string, username: string, password: string, persistentData?: HTTPApiPersistentData): Promise<HTTPApi> {
        if (isValidCountry(country) && country.length === 2) {
            const apiBase = await this.getApiBaseFromCloud(country);
            const api = new HTTPApi(apiBase, country, username, password, persistentData);
            await api.loadLibraries();
            return api;
        }
        throw new InvalidCountryCodeError("Invalid ISO 3166-1 Alpha-2 country code", { context: { countryCode: country } });
    }

    private clearScheduleRenewAuthToken(): void {
        /**
         *  Clear schedule to renew the auth token if running
         *
         **/
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
                    rootHTTPLogger.info("Authentication token is soon expiring, fetching a new one...");
                    await this.login({ force: true });
                });
            } else {
                this.renewAuthTokenJob.schedule(scheduleDate);
            }
        }
    }

    private invalidateToken(): void {
        this.connected = false;
        this.token = null;
        this.requestEufyCloud.defaults.options.merge({
            headers: {
                "X-Auth-Token": undefined
            }
        });
        this.tokenExpiration = null;
        this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
        this.clearScheduleRenewAuthToken();
        this.emit("auth token invalidated");
    }

    private updateApiHeader(): void {
        this.requestEufyCloud.defaults.options.merge({
            headers: this.headers
        });
    }



    public setPhoneModel(model: string): void {
        /**
         *
         * Set a new phone model for the http request
         *
         */
        this.headers.phone_model = model.toUpperCase();
        this.requestEufyCloud.defaults.options.merge({
            headers: this.headers
        });
    }

    public getPhoneModel(): string {
        /**
         *
         * Return the current phone model used
         *
         */
        return this.headers.phone_model!;
    }

    public getCountry(): string {
        /**
         *  Return the current country
         *
         */
        return this.headers.country!;
    }

    public setLanguage(language: string): void {
        if (isValidLanguage(language) && language.length === 2) {
            this.headers.language = language;
            this.updateApiHeader();
        } else
            throw new InvalidLanguageCodeError("Invalid ISO 639 language code", { context: { languageCode: language } });
    }

    public getLanguage(): string {
        return this.headers.language!;
    }

    private loginCompleted(dataResult: LoginResultResponse): void {
        if (dataResult.server_secret_info?.public_key)
            this.persistentData.serverPublicKey = dataResult.server_secret_info.public_key;

        this.persistentData.user_id = dataResult.user_id;
        this.persistentData.email = this.decryptAPIData(dataResult.email, false);
        this.persistentData.nick_name = dataResult.nick_name;

        this.setToken(dataResult.auth_token);
        this.tokenExpiration = new Date(dataResult.token_expires_at * 1000);
        this.headers = {
            ...this.headers,
            gtoken: md5(dataResult.user_id)
        };
        rootHTTPLogger.debug("Login - Token data", { token: this.token, tokenExpiration: this.tokenExpiration, serverPublicKey: this.persistentData.serverPublicKey });
        if (!this.connected) {
            this.connected = true;
            this.emit("connect");
        }
        this.scheduleRenewAuthToken();
    }
    private async loginVerifyCode(dataResult: LoginResultResponse) {
        /**
         *  Send verification code
         */
        rootHTTPLogger.debug(`Login - Send verification code...`);

        this.setToken(dataResult.auth_token);
        this.tokenExpiration = new Date(dataResult.token_expires_at * 1000);

        rootHTTPLogger.debug("Token data", { token: this.token, tokenExpiration: this.tokenExpiration });
        await this.sendVerifyCode(VerfyCodeTypes.TYPE_EMAIL);
        rootHTTPLogger.info("Please send required verification code to proceed with authentication");
        this.emit("tfa request");
    }

    private loginRequestCaptcha(dataResult: CaptchaResponse): void {
        rootHTTPLogger.debug("Login - Captcha verification received", { captchaId: dataResult.captcha_id, item: dataResult.item });
        rootHTTPLogger.info("Please send requested captcha to proceed with authentication");
        this.emit("captcha request", dataResult.captcha_id, dataResult.item);
    }

    public async login(options?: LoginOptions): Promise<void> {
        options = mergeDeep(options, {
            force: false
        } as LoginOptions) as LoginOptions;

        rootHTTPLogger.debug("Login and get an access token", { token: this.token, tokenExpiration: this.tokenExpiration, options: options });

        const isInvalidToken = !this.token;
        const isTokenExpired = this.tokenExpiration && (new Date()).getTime() >= this.tokenExpiration.getTime();

        if (isInvalidToken || isTokenExpired|| options.verifyCode || options.captcha || options.force) {
            try {
                const timezoneOffset: number = new Date().getTimezoneOffset();
                const data: LoginRequest = {
                    ab: this.headers.country!,
                    client_secret_info: {
                        public_key: this.ecdh.getPublicKey("hex")
                    },
                    enc: 0,
                    email: this.username,
                    password:  encryptAPIData(this.password, this.ecdh.computeSecret(Buffer.from(this.SERVER_PUBLIC_KEY, "hex"))),
                    time_zone: timezoneOffset !== 0 ? -timezoneOffset * 60 * 1000 : 0,
                    transaction: `${new Date().getTime()}`
                };
                // Add verification code to the data
                if (options.verifyCode) {
                    data.verify_code = options.verifyCode;
                } else if (options.captcha) {
                    // Add captcha response
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
                        if (result.code == ResponseErrorCode.CODE_OK) {
                            this.loginCompleted(result.data);
                        } else if (result.code == ResponseErrorCode.CODE_NEED_VERIFY_CODE) {
                            this.loginVerifyCode(result.data);
                        } else if (result.code == ResponseErrorCode.LOGIN_NEED_CAPTCHA || result.code == ResponseErrorCode.LOGIN_CAPTCHA_ERROR) {
                            this.loginRequestCaptcha(result.data);
                        } else {
                            rootHTTPLogger.error("Login - Response code not ok", {code: result.code, msg: result.msg, data: response.data });
                            this.emit("connection error", new ApiResponseCodeError("API response code not ok", { context: { code: result.code, message: result.msg } }));
                        }
                    } else {
                        rootHTTPLogger.error("Login - Response data is missing", {code: result.code, msg: result.msg, data: result.data });
                        this.emit("connection error", new ApiInvalidResponseError("API response data is missing", { context: { code: result.code, message: result.msg, data: result.data } }));
                    }
                } else {
                    rootHTTPLogger.error("Login - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                    this.emit("connection error", new ApiHTTPResponseCodeError("API HTTP response code not ok", { context: { status: response.status, statusText: response.statusText } }));
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error("Login - Generic Error:", { error: getError(error) });
                this.emit("connection error", new ApiGenericError("Generic API error", { cause: error }));
            }
        } else if (!this.connected) {
            try {
                const profile = await this.getPassportProfile();
                if (profile !== null) {
                    if (!this.connected) {
                        this.connected = true;
                        this.emit("connect");
                        this.scheduleRenewAuthToken();
                    }
                } else {
                    this.emit("connection error", new ApiInvalidResponseError(`Invalid passport profile response`));
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error("Login - getPassportProfile Error", { error: getError(error) });
                this.emit("connection error", new ApiGenericError("API get passport profile error", { cause: error }));
            }
        }
    }

    public async makePostRequest(endPoint: string, data: any): Promise<ApiResponse | undefined> {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/sms/send/verify_code",
                    data: data
                });

                if (response.status == 200) {
                    return response;
                } else {
                    rootHTTPLogger.error(`Post to ${endPoint}  - Status return code not 200`, {
                        status: response.status,
                        statusText: response.statusText,
                        data: response.data
                    });
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error("Send verify code - Generic Error", {error: getError(error)});
            }
        }
        return undefined;
    }

    public async sendVerifyCode(type?: VerfyCodeTypes): Promise<boolean> {

            if (!type)
                type = VerfyCodeTypes.TYPE_EMAIL;

            const data =  {
                message_type: type,
                transaction: `${new Date().getTime()}`
            }
            const response: ApiResponse | undefined = await this.makePostRequest(this.apiVerifyCode, data);

            if (response != undefined) {
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_OK) {
                        rootHTTPLogger.info(`Requested verification code for 2FA`);
                        return true;
                    } else {
                        rootHTTPLogger.error("Send verify code - Response code not ok", {
                            code: result.code,
                            msg: result.msg,
                            data: response.data
                        });
                    }
                } else {
                    rootHTTPLogger.error("Send verify code - Status return code not 200", {
                        status: response.status,
                        statusText: response.statusText,
                        data: response.data
                    });
                }
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
                    if (result.code == ResponseErrorCode.CODE_OK) {
                        if (result.data && result.data.list) {
                            return result.data.list;
                        }
                    } else {
                        rootHTTPLogger.error("List trust device - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                } else {
                    rootHTTPLogger.error("List trust device - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error("List trust device - Generic Error", { error: getError(error) });
            }
        }
        return [];
    }

    public async addTrustDevice(verifyCode: string): Promise<boolean> {

        const data =   {
            verify_code: verifyCode,
            transaction: `${new Date().getTime()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiTrustDevice, data);

        if (response != undefined) {
            rootHTTPLogger.debug("Add trust device - Response trust device", { verifyCode: verifyCode, data: response.data });
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_OK) {
                    rootHTTPLogger.info(`2FA authentication successfully done. Device trusted.`);
                    const trusted_devices = await this.listTrustDevice();
                    trusted_devices.forEach((trusted_device: TrustDevice) => {
                        if (trusted_device.is_current_device === 1) {
                            rootHTTPLogger.debug("Add trust device - This device is trusted. Token expiration extended:", { trustDevice: { phoneModel: trusted_device.phone_model, openUdid: trusted_device.open_udid }, tokenExpiration: this.tokenExpiration});
                        }
                    });
                    return true;
                } else {
                    rootHTTPLogger.error("Add trust device - Response code not ok", { code: result.code, msg: result.msg, verifyCode: verifyCode, data: response.data });
                }
            } else {
                rootHTTPLogger.error("Add trust device - Status return code not 200", { status: response.status, statusText: response.statusText, verifyCode: verifyCode, data: response.data });
            }
        }

        return false;
    }

    public async getStationList(): Promise<Array<StationListResponse>> {

        const data =   {
            device_sn: "",
            num: 1000,
            orderby: "",
            page: 0,
            station_sn: "",
            time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
            transaction: `${new Date().getTime()}`
        };
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiGetStations, data);

        if (response != undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    if (result.data) {
                        const stationList = this.decryptAPIData(result.data) as Array<StationListResponse>;
                        rootHTTPLogger.debug("Decrypted station list data", stationList);
                        return stationList;
                    }
                } else {
                    rootHTTPLogger.error("Station list - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data
                    });
                }
            } else {
                rootHTTPLogger.error("Station list - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data
                });
            }
        }

        return [];
    }

    public async getDeviceList(): Promise<Array<DeviceListResponse>> {

        const data = {
            device_sn: "",
            num: 1000,
            orderby: "",
            page: 0,
            station_sn: "",
            time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
            transaction: `${new Date().getTime()}`
        };
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiGetDevices, data);

        if (response != undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    if (result.data) {
                        const deviceList = this.decryptAPIData(result.data) as Array<DeviceListResponse>;
                        rootHTTPLogger.debug("Decrypted device list data", deviceList);
                        return deviceList;
                    }
                } else {
                    rootHTTPLogger.error("Device list - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data
                    });
                }
            } else {
                rootHTTPLogger.error("Device list - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data
                });
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
            rootHTTPLogger.info("No houses found.");
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
            rootHTTPLogger.info("No stations found.");
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
            rootHTTPLogger.info("No devices found.");
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


    public async request(request: HTTPApiRequest, withoutUrlPrefix = false): Promise<ApiResponse> {
        rootHTTPLogger.debug("Api request", { method: request.method, endpoint: request.endpoint, responseType: request.responseType, token: this.token, data: request.data });
        try {
            let options: OptionsOfTextResponseBody | OptionsOfBufferResponseBody | OptionsOfJSONResponseBody;
            switch(request.responseType) {
                case undefined:
                case "json":
                    options = {
                        method: request.method,
                        json: request.data,
                        responseType: "json",
                    } as OptionsOfJSONResponseBody;
                    break;
                case "text":
                    options = {
                        method: request.method,
                        json: request.data,
                        responseType: request.responseType,
                    } as OptionsOfTextResponseBody;
                    break;
                case "buffer":
                    options = {
                        method: request.method,
                        json: request.data,
                        responseType: request.responseType,
                    } as OptionsOfBufferResponseBody;
                    break;
            }
            if (withoutUrlPrefix)
                options.prefixUrl = "";
            const internalResponse = await this.requestEufyCloud(request.endpoint, options);
            const response: ApiResponse = {
                status: internalResponse.statusCode,
                statusText: internalResponse.statusMessage ? internalResponse.statusMessage : "",
                headers: internalResponse.headers,
                data: internalResponse.body,
            };
            rootHTTPLogger.debug("Api request - Response", { token: this.token, request: request, response: response.data });

            return response;
        } catch (err) {
            const error = ensureError(err);
            if (error instanceof  (await import("got")).HTTPError) {
                if (error.response.statusCode === 401) {
                    this.invalidateToken();
                    rootHTTPLogger.error("Status return code 401, invalidate token", { status: error.response.statusCode, statusText: error.response.statusMessage });
                    this.emit("close");
                }
            }
            throw new ApiRequestError("API request error", { cause: error, context: { method: request.method, endpoint: request.endpoint, responseType: request.responseType, token: this.token, data: request.data } });
        }
    }

    public async checkPushToken(): Promise<boolean> {
        //Check push notification token
        const data =  {
            app_type: "eufySecurity",
            transaction: `${new Date().getTime()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiPushCheck, data);

        if (response !== undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    rootHTTPLogger.debug(`Check push token - Push token OK`);
                    return true;
                } else {
                    rootHTTPLogger.error("Check push token - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data
                    });
                }
            } else {
                rootHTTPLogger.error("Check push token - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data
                });
            }
        }
        return false;
    }

    public async registerPushToken(token: string): Promise<boolean> {
        //Register push notification token
        const data =   {
            is_notification_enable: true,
            token: token,
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiRegisterPushToken, data);

       if (response !== undefined) {
           if (response.status == 200) {
               const result: ResultResponse = response.data;
               if (result.code == 0) {
                   rootHTTPLogger.debug(`Register push token - Push token registered successfully`);
                   return true;
               } else {
                   rootHTTPLogger.error("Register push token - Response code not ok", {
                       code: result.code,
                       msg: result.msg,
                       data: response.data,
                       token: token
                   });
               }
           } else {
               rootHTTPLogger.error("Register push token - Status return code not 200", {
                   status: response.status,
                   statusText: response.statusText,
                   data: response.data,
                   token: token
               });
           }
       }
        return false;
    }

    public async setParameters(stationSN: string, deviceSN: string, params: { paramType: number; paramValue: any; }[]): Promise<boolean> {

        const tmp_params: any[] = []
        params.forEach(param => {
            tmp_params.push({ param_type: param.paramType, param_value: ParameterHelper.writeValue(param.paramType, param.paramValue) });
        });

        const data = {
            device_sn: deviceSN,
            station_sn: stationSN,
            params: tmp_params,
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiSetParameters, data);

        if (response !== undefined) {
            rootHTTPLogger.debug("Set parameter - Response:", { stationSN: stationSN, deviceSN: deviceSN, params: tmp_params, response: response.data });
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        const dataresult = result.data;
                        rootHTTPLogger.debug("Set parameter - New parameters set", { params: tmp_params, response: dataresult });
                        return true;
                    } else {
                        rootHTTPLogger.error("Set parameter - Response code not ok", { code: result.code, msg: result.msg, data: response.data, stationSN: stationSN, deviceSN: deviceSN, params: params });
                    }
                } else {
                    rootHTTPLogger.error("Set parameter - Status return code not 200", {
                        status: response.status,
                        statusText: response.statusText,
                        data: response.data,
                        stationSN: stationSN,
                        deviceSN: deviceSN,
                        params: params
                    });
                }
        }
        return false;
    }

    public async getCiphers(/*stationSN: string, */cipherIDs: Array<number>, userID: string): Promise<Ciphers> {

        const data =  {
            cipher_ids: cipherIDs,
            user_id: userID,
            //sn: stationSN
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiGetCiphers, data);

        if (response !== undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_OK) {
                    if (result.data) {
                        const ciphers: Ciphers = {};
                        const decrypted = this.decryptAPIData(result.data);
                        rootHTTPLogger.debug("Get ciphers - Decrypted ciphers data", {ciphers: decrypted});
                        if (Array.isArray(decrypted)) {
                            decrypted.forEach((cipher: Cipher) => {
                                ciphers[cipher.cipher_id] = cipher;
                            });
                        }
                        return ciphers;
                    }
                } else {
                    rootHTTPLogger.error("Get ciphers - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data,
                        cipherIDs: cipherIDs,
                        userID: userID
                    });
                }
            } else {
                rootHTTPLogger.error("Get ciphers - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    cipherIDs: cipherIDs,
                    userID: userID
                });
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
                    if (result.code == ResponseErrorCode.CODE_OK) {
                        if (result.data) {
                            const voices: Voices = {};
                            result.data.forEach((voice: Voice) => {
                                voices[voice.voice_id] = voice;
                            });
                            return voices;
                        }
                    } else {
                        rootHTTPLogger.error("Get Voices - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN });
                    }
                } else {
                    rootHTTPLogger.error("Get Voices - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN });
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error("Get Voices - Generic Error", { error: getError(error), deviceSN: deviceSN });
            }
        }
        return {};
    }

    public async getCipher(/*stationSN: string, */cipherID: number, userID: string): Promise<Cipher> {
        return (await this.getCiphers(/*stationSN, */[cipherID], userID))[cipherID];
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
        this.requestEufyCloud.defaults.options.merge({
            headers: {
                "X-Auth-Token": token
            }
        });
    }

    public setTokenExpiration(tokenExpiration: Date): void {
        this.tokenExpiration = tokenExpiration;
    }

    public getAPIBase(): string {
        return typeof this.requestEufyCloud.defaults.options.prefixUrl === "string" ? this.requestEufyCloud.defaults.options.prefixUrl : this.requestEufyCloud.defaults.options.prefixUrl.toString();
    }

    public setOpenUDID(openudid: string): void {
        this.headers.openudid = openudid;
        this.updateApiHeader();
    }

    public setSerialNumber(serialnumber: string): void {
        this.headers.sn = serialnumber;
        this.updateApiHeader();
    }

    private async _getEvents(functionName: string, endpoint: string, startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        const records: Array<EventRecordResponse> = [];

        if (filter === undefined)
            filter = { deviceSN: "", stationSN: "", storageType: StorageType.NONE };
        if (maxResults === undefined)
            maxResults = 1000;
        const data =  {
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
        const response: ApiResponse | undefined = await this.makePostRequest(endpoint, data);

        if (response !== undefined) {
            rootHTTPLogger.debug(`${functionName} - Response:`, response.data);
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == 0) {
                    if (result.data) {
                        const dataresult: Array<EventRecordResponse> = this.decryptAPIData(result.data);
                        rootHTTPLogger.debug(`${functionName} - Decrypted data:`, dataresult);
                        if (dataresult) {
                            dataresult.forEach(record => {
                                rootHTTPLogger.debug(`${functionName} - Record:`, record);
                                records.push(record);
                            });
                        }
                    } else {
                        rootHTTPLogger.error(`${functionName} - Response data is missing`, {
                            code: result.code,
                            msg: result.msg,
                            data: response.data,
                            endpoint: endpoint,
                            startTime: startTime,
                            endTime: endTime,
                            filter: filter,
                            maxResults: maxResults
                        });
                    }
                } else {
                    rootHTTPLogger.error(`${functionName} - Response code not ok`, {
                        code: result.code,
                        msg: result.msg,
                        data: response.data,
                        endpoint: endpoint,
                        startTime: startTime,
                        endTime: endTime,
                        filter: filter,
                        maxResults: maxResults
                    });
                }
            } else {
                rootHTTPLogger.error(`${functionName} - Status return code not 200`, {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    endpoint: endpoint,
                    startTime: startTime,
                    endTime: endTime,
                    filter: filter,
                    maxResults: maxResults
                });
            }
        }
        return records;
    }

    public async getVideoEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getVideoEvents", this.apiEventGetAllVideoRecord, startTime, endTime, filter, maxResults);
    }

    public async getAlarmEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getAlarmEvents", this.apiEventGetAllAlarmRecord, startTime, endTime, filter, maxResults);
    }

    public async getHistoryEvents(startTime: Date, endTime: Date, filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this._getEvents("getHistoryEvents", this.apiEventGetAllHistoryRecord, startTime, endTime, filter, maxResults);
    }

    public async getAllVideoEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this.getVideoEvents(new Date(new Date().getTime() - this.FIFTEEN_YEARS_IN_MS), new Date(), filter, maxResults);
    }

    public async getAllAlarmEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this.getAlarmEvents(new Date(new Date().getTime() - this.FIFTEEN_YEARS_IN_MS), new Date(), filter, maxResults);
    }

    public async getAllHistoryEvents(filter?: EventFilterType, maxResults?: number): Promise<Array<EventRecordResponse>> {
        return this.getHistoryEvents(new Date(new Date().getTime() - this.FIFTEEN_YEARS_IN_MS), new Date(), filter, maxResults);
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public async getInvites(): Promise<Invites> {
        const data = {
            num: 100,
            orderby: "",
            own: false,
            page: 0,
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiGetInvites, data);

       if (response !== undefined) {
           if (response.status == 200) {
               const result: ResultResponse = response.data;
               if (result.code == ResponseErrorCode.CODE_OK) {
                   if (result.data) {
                       const invites: Invites = {};
                       const decrypted = this.decryptAPIData(result.data);
                       rootHTTPLogger.debug("Get invites - Decrypted invites data", {invites: decrypted});
                       if (Array.isArray(decrypted)) {
                           decrypted.forEach((invite: Invite) => {
                               invites[invite.invite_id] = invite;
                               let data = parseJSON((invites[invite.invite_id].devices as unknown) as string, rootHTTPLogger);
                               if (data === undefined)
                                   data = [];
                               invites[invite.invite_id].devices = data;
                           });
                       }
                       return invites;
                   }
               } else {
                   rootHTTPLogger.error("Get invites - Response code not ok", {
                       code: result.code,
                       msg: result.msg,
                       data: response.data
                   });
               }
           } else {
               rootHTTPLogger.error("Get invites - Status return code not 200", {
                   status: response.status,
                   statusText: response.statusText,
                   data: response.data
               });
           }
       }
       return {};
    }

    public async confirmInvites(confirmInvites: Array<ConfirmInvite>): Promise<boolean> {
        const data = {
            invites: confirmInvites,
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiConfirmInvite, data);

        if (response !== undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_OK) {
                    return true;
                } else {
                    rootHTTPLogger.error("Confirm invites - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data,
                        confirmInvites: confirmInvites
                    });
                }
            } else {
                rootHTTPLogger.error("Confirm invites - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    confirmInvites: confirmInvites
                });
            }
        }
        return false;
    }

    public async getPublicKey(deviceSN: string, type: PublicKeyType): Promise<string> {
        if (this.connected) {
            try {
                if (this.persistentData.device_public_keys[deviceSN] !== undefined && type === PublicKeyType.LOCK) {
                    rootHTTPLogger.debug("return cached public key", this.persistentData.device_public_keys[deviceSN]);
                    return this.persistentData.device_public_keys[deviceSN];
                } else {
                    const response = await this.request({
                        method: "get",
                        endpoint: `v1/app/public_key/query?device_sn=${deviceSN}&type=${type}`
                    });
                    if (response.status == 200) {
                        const result: ResultResponse = response.data;
                        if (result.code == ResponseErrorCode.CODE_OK) {
                            if (result.data) {
                                if (type === PublicKeyType.LOCK)
                                    this.persistentData.device_public_keys[deviceSN] = result.data.public_key;
                                return result.data.public_key;
                            }
                        } else {
                            rootHTTPLogger.error("Get public key - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, type: type });
                        }
                    } else {
                        rootHTTPLogger.error("Get public key - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, type: type });
                    }
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error("Get public key - Generic Error", { error: getError(error), deviceSN: deviceSN, type: type });
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
                rootHTTPLogger.error("Data decryption error, invalidating session data and reconnecting...", { error: getError(error), serverPublicKey: this.persistentData.serverPublicKey });
                this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
                this.invalidateToken();
                this.emit("close");
            }
            if (decryptedData) {
                const str = getNullTerminatedString(decryptedData, "utf-8");
                if (json)
                    return parseJSON(str, rootHTTPLogger);
                return str;
            }
            if (json)
                return {};
        }
        return undefined;
    }

    public async getSensorHistory(stationSN: string, deviceSN: string): Promise<Array<SensorHistoryEntry>> {

        const data =  {
            devicse_sn: deviceSN,
            max_time: 0,  //TODO: Finish implementation
            num: 500,     //TODO: Finish implementation
            page: 0,      //TODO: Finish implementation
            station_sn: stationSN,
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiGetSensorHistory, data);

        if (response !== undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_OK) {
                    if (result.data) {
                        const entries: Array<SensorHistoryEntry> = result.data;
                        return entries;
                    }
                } else {
                    rootHTTPLogger.error("Get sensor history - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data,
                        stationSN: stationSN,
                        deviceSN: deviceSN
                    });
                }
            } else {
                rootHTTPLogger.error("Get sensor history - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    stationSN: stationSN,
                    deviceSN: deviceSN
                });
            }
        }
        return [];
    }

    public async getHouseDetail(houseID: string): Promise<HouseDetail|null> {
        const data =  {
            house_id: houseID,
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiGetHouseDetail, data);

        if (response !== undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_OK) {
                    if (result.data) {
                        const houseDetail = this.decryptAPIData(result.data) as HouseDetail;
                        rootHTTPLogger.debug("Get house detail - Decrypted house detail data", {details: houseDetail});
                        return houseDetail;
                    }
                } else {
                    rootHTTPLogger.error("Get house detail - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data,
                        houseID: houseID
                    });
                }
            } else {
                rootHTTPLogger.error("Get house detail - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    houseID: houseID
                });
            }
        }
        return null;
    }

    public async getHouseList(): Promise<Array<HouseListResponse>> {

        const data = {
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiGetHouseList, data);

        if (response !== undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_OK) {
                    if (result.data) {
                        rootHTTPLogger.debug("Get house list - houses", {houses: result.data});
                        return result.data as Array<HouseListResponse>;
                    }
                } else {
                    rootHTTPLogger.error("Get house list - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data
                    });
                }
            } else {
                rootHTTPLogger.error("Get house list - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data
                });
            }
        }
        return [];
    }

    public async getHouseInviteList(isInviter = 1): Promise<Array<HouseInviteListResponse>> {
        //TODO: Understand the other values of isInviter and document it

        const data =  {
            is_inviter: isInviter,
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiGetHouseInvites, data);

        if (response !== undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_OK) {
                    if (result.data) {
                        //const houseInviteList = this.decryptAPIData(result.data) as Array<HouseInviteListResponse>;   // No more encrypted!?
                        //rootHTTPLogger.debug("Get house invite list - Decrypted house invite list data", houseInviteList);
                        const houseInviteList = result.data as Array<HouseInviteListResponse>;
                        rootHTTPLogger.debug("Get house invite list - House invite list data", houseInviteList);
                        return houseInviteList;
                    }
                } else {
                    rootHTTPLogger.error("Get house invite list - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data,
                        isInviter: isInviter
                    });
                }
            } else {
                rootHTTPLogger.error("Get house invite list - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    isInviter: isInviter
                });
            }
        }
        return [];
    }

    public async confirmHouseInvite(houseID: string, inviteID: number): Promise<boolean> {
        const data =  {
            house_id: houseID,
            invite_id: inviteID,
            is_inviter: 1, // 1 = true, 0 = false
            //user_id: "",
            transaction: `${new Date().getTime().toString()}`
        };
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiConfirmHouseInvite, data);


      if (response !== undefined) {
          if (response.status == 200) {
              const result: ResultResponse = response.data;
              if (result.code == ResponseErrorCode.CODE_OK) {
                  return true;
              } else {
                  rootHTTPLogger.error("Confirm house invite - Response code not ok", {
                      code: result.code,
                      msg: result.msg,
                      data: response.data,
                      houseID: houseID,
                      inviteID: inviteID
                  });
              }
          } else {
              rootHTTPLogger.error("Confirm house invite - Status return code not 200", {
                  status: response.status,
                  statusText: response.statusText,
                  data: response.data,
                  houseID: houseID,
                  inviteID: inviteID
              });
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
                if (result.code == ResponseErrorCode.CODE_OK) {
                    if (result.data) {
                        const profile = this.decryptAPIData(result.data) as PassportProfileResponse;
                        rootHTTPLogger.debug("Get passport profile - Decrypted passport profile data", { profile: profile });
                        this.persistentData.user_id = profile.user_id;
                        this.persistentData.nick_name = profile.nick_name;
                        this.persistentData.email = profile.email;
                        return profile;
                    }
                } else {
                    rootHTTPLogger.error("Get passport profile - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                }
            } else {
                rootHTTPLogger.error("Get passport profile - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Get passport profile - Generic Error", { error: getError(error) });
        }
        return null;
    }

    public async addUser(deviceSN: string, nickname: string, stationSN = ""): Promise<AddUserResponse|null> {

        const data =  {
            device_sn: deviceSN,
            nick_name: nickname,
            station_sn: stationSN === deviceSN ? "" : stationSN,
            transaction: `${new Date().getTime().toString()}`
        };
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiAddLocalUser, data);

        if (response !== undefined) {
            if (response.status == 200) {
                const result: ResultResponse = response.data;
                if (result.code == ResponseErrorCode.CODE_OK) {
                    if (result.data)
                        return result.data as AddUserResponse;
                } else {
                    rootHTTPLogger.error("Add user - Response code not ok", {
                        code: result.code,
                        msg: result.msg,
                        data: response.data,
                        deviceSN: deviceSN,
                        nickname: nickname,
                        stationSN: stationSN
                    });
                }
            } else {
                rootHTTPLogger.error("Add user - Status return code not 200", {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    deviceSN: deviceSN,
                    nickname: nickname,
                    stationSN: stationSN
                });
            }
        }
        return null;
    }

    public async deleteUser(deviceSN: string, shortUserId: string, stationSN = ""): Promise<boolean> {
        const data = {
            device_sn: deviceSN,
            short_user_ids: [shortUserId],
            station_sn: stationSN === deviceSN ? "" : stationSN,
            transaction: `${new Date().getTime().toString()}`
        }
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiDeleteLocalUser, data);

       if (response !== undefined) {
           if (response.status == 200) {
               const result: ResultResponse = response.data;
               if (result.code == ResponseErrorCode.CODE_OK) {
                   return true;
               } else {
                   rootHTTPLogger.error("Delete user - Response code not ok", {
                       code: result.code,
                       msg: result.msg,
                       data: response.data,
                       deviceSN: deviceSN,
                       shortUserId: shortUserId,
                       stationSN: stationSN
                   });
               }
           } else {
               rootHTTPLogger.error("Delete user - Status return code not 200", {
                   status: response.status,
                   statusText: response.statusText,
                   data: response.data,
                   deviceSN: deviceSN,
                   shortUserId: shortUserId,
                   stationSN: stationSN
               });
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
                if (result.code == ResponseErrorCode.CODE_OK) {
                    if (result.data) {
                        const usersResponse = result.data as UsersResponse;
                        return usersResponse.user_list;
                    }
                } else {
                    rootHTTPLogger.error("Get users - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, stationSN: stationSN });
                }
            } else {
                rootHTTPLogger.error("Get users - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, stationSN: stationSN });
            }
        } catch (err) {
            const error = ensureError(err);
            rootHTTPLogger.error("Get users - Generic Error", { error: getError(error), deviceSN: deviceSN, stationSN: stationSN });
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
            rootHTTPLogger.error("Get user - Generic Error", { error: getError(error), deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId });
        }
        return null;
    }

    public async updateUser(deviceSN: string, stationSN: string, shortUserId: string, nickname: string): Promise<boolean> {
        const user = await this.getUser(deviceSN, stationSN, shortUserId);
        if (user !== null) {
            const data = {
                device_sn: deviceSN,
                nick_name: nickname,
                password_list: user.password_list,
                short_user_id: shortUserId,
                station_sn: stationSN === deviceSN ? "" : stationSN,
                user_type: user.user_type,
                transaction: `${new Date().getTime().toString()}`
            }
            const response: ApiResponse | undefined = await this.makePostRequest(this.apiUpdateLocalUser, data);

            if (response !== undefined) {
                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == ResponseErrorCode.CODE_OK) {
                        return true;
                    } else {
                        rootHTTPLogger.error("Update user - Response code not ok", {
                            code: result.code,
                            msg: result.msg,
                            data: response.data,
                            deviceSN: deviceSN,
                            stationSN: stationSN,
                            shortUserId: shortUserId,
                            nickname: nickname
                        });
                    }
                } else {
                    rootHTTPLogger.error("Update user - Status return code not 200", {
                        status: response.status,
                        statusText: response.statusText,
                        data: response.data,
                        deviceSN: deviceSN,
                        stationSN: stationSN,
                        shortUserId: shortUserId,
                        nickname: nickname
                    });
                }
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
                            endpoint: url,
                            responseType: "buffer"
                        }, true);
                        if (response.status == 200) {
                            return decodeImage(station.p2p_did, response.data as Buffer);
                        } else {
                            rootHTTPLogger.error("Get Image - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, url: url });
                        }
                    }
                }
            } catch (err) {
                const error = ensureError(err);
                rootHTTPLogger.error("Get Image - Generic Error", { error: getError(error), deviceSN: deviceSN, url: url });
            }
        }
        return Buffer.alloc(0);
    }

    public async updateUserPassword(deviceSN: string, shortUserId: string, passwordId: string, schedule: Schedule, stationSN = ""): Promise<boolean> {
        const data =  {
            device_sn: deviceSN,
            password_list: [{
                password_id: passwordId,
                password_type: UserPasswordType.PIN,
                schedule: JSON.stringify({
                    endDay: schedule !== undefined && schedule.endDateTime !== undefined ? hexDate(schedule.endDateTime) : "ffffffff",
                    endTime: schedule !== undefined && schedule.endDateTime !== undefined ? hexTime(schedule.endDateTime) : "ffff",
                    startDay: schedule !== undefined && schedule.startDateTime !== undefined ? hexDate(schedule.startDateTime) : "00000000",
                    startTime: schedule !== undefined && schedule.startDateTime !== undefined ? hexTime(schedule.startDateTime) : "0000",
                    week: schedule !== undefined && schedule.week !== undefined ? hexWeek(schedule) : "ff",
                })
            }],
            short_user_id: shortUserId,
            station_sn: stationSN === deviceSN ? "" : stationSN,
            transaction: `${new Date().getTime().toString()}`
        };
        const response: ApiResponse | undefined = await this.makePostRequest(this.apiUpdateUserPassword, data);

      if (response !== undefined) {
          if (response.status == 200) {
              const result: ResultResponse = response.data;
              if (result.code == ResponseErrorCode.CODE_OK) {
                  return true;
              } else {
                  rootHTTPLogger.error("Add user - Response code not ok", {
                      code: result.code,
                      msg: result.msg,
                      data: response.data,
                      deviceSN: deviceSN,
                      shortUserId: shortUserId,
                      schedule: schedule,
                      stationSN: stationSN
                  });
              }
          } else {
              rootHTTPLogger.error("Add user - Status return code not 200", {
                  status: response.status,
                  statusText: response.statusText,
                  data: response.data,
                  deviceSN: deviceSN,
                  shortUserId: shortUserId,
                  schedule: schedule,
                  stationSN: stationSN
              });
          }
      }
        return false;
    }

}