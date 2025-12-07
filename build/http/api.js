"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPApi = void 0;
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const i18n_iso_countries_1 = require("i18n-iso-countries");
const i18n_iso_languages_1 = require("@cospired/i18n-iso-languages");
const crypto_1 = require("crypto");
const schedule = __importStar(require("node-schedule"));
const types_1 = require("./types");
const parameter_1 = require("./parameter");
const utils_1 = require("./utils");
const error_1 = require("./../error");
const utils_2 = require("./../utils");
const error_2 = require("./error");
const utils_3 = require("../p2p/utils");
const logging_1 = require("../logging");
class HTTPApi extends tiny_typed_emitter_1.TypedEmitter {
    static apiDomainBase = "https://extend.eufylife.com";
    SERVER_PUBLIC_KEY = "04c5c00c4f8d1197cc7c3167c52bf7acb054d722f0ef08dcd7e0883236e0d72a3868d9750cb47fa4619248f3d83f0f662671dadc6e2d31c2f41db0161651c7c076";
    apiBase;
    username;
    password;
    ecdh = (0, crypto_1.createECDH)("prime256v1");
    token = null;
    tokenExpiration = null;
    renewAuthTokenJob;
    connected = false;
    requestEufyCloud;
    throttle;
    devices = {};
    hubs = {};
    houses = {};
    persistentData = {
        user_id: "",
        email: "",
        nick_name: "",
        device_public_keys: {},
        clientPrivateKey: "",
        serverPublicKey: this.SERVER_PUBLIC_KEY
    };
    headers = {
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
    constructor(apiBase, country, username, password, persistentData) {
        super();
        this.username = username;
        this.password = password;
        this.apiBase = apiBase;
        logging_1.rootHTTPLogger.debug(`Loaded API`, { apieBase: apiBase, country: country, username: username, persistentData: persistentData });
        this.headers.timezone = (0, utils_1.getTimezoneGMTString)();
        this.headers.country = country.toUpperCase();
        if (persistentData) {
            this.persistentData = persistentData;
        }
        if (this.persistentData.clientPrivateKey === undefined || this.persistentData.clientPrivateKey === "") {
            this.ecdh.generateKeys();
            this.persistentData.clientPrivateKey = this.ecdh.getPrivateKey().toString("hex");
        }
        else {
            try {
                this.ecdh.setPrivateKey(Buffer.from(this.persistentData.clientPrivateKey, "hex"));
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.debug(`Invalid client private key, generate new client private key...`, { error: (0, utils_2.getError)(error) });
                this.ecdh.generateKeys();
                this.persistentData.clientPrivateKey = this.ecdh.getPrivateKey().toString("hex");
            }
        }
        if (this.persistentData.serverPublicKey === undefined || this.persistentData.serverPublicKey === "") {
            this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
        }
        else {
            try {
                this.ecdh.computeSecret(Buffer.from(this.persistentData.serverPublicKey, "hex"));
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.debug(`Invalid server public key, fallback to default server public key...`, { error: (0, utils_2.getError)(error) });
                this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
            }
        }
    }
    static async getApiBaseFromCloud(country) {
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
        const result = response.body;
        if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
            return `https://${result.data.domain}`;
        }
        throw new error_2.ApiBaseLoadError("Error identifying API base from cloud", { context: { code: result.code, message: result.msg } });
    }
    async loadLibraries() {
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
                            logging_1.rootHTTPLogger.debug("Invalidate token an get a new one...", { requestUrl: response.requestUrl, statusCode: response.statusCode, statusMessage: response.statusMessage });
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
                        const shortUrl = (0, utils_2.getShortUrl)(typeof url === "string" ? new URL(url) : url === undefined ? new URL("") : url, typeof prefixUrl === "string" ? prefixUrl : prefixUrl.toString());
                        const body = error.response?.body ? error.response?.body : error.message;
                        logging_1.rootHTTPLogger.debug(`Retrying [${error.request?.retryCount !== undefined ? error.request?.retryCount + 1 : 1}]: ${error.code} (${error.request?.requestUrl})\n${statusCode} ${method} ${shortUrl}\n${body}`);
                        // Retrying [1]: ERR_NON_2XX_3XX_RESPONSE
                    }
                ],
                beforeError: [
                    error => {
                        const { response, options } = error;
                        const statusCode = response?.statusCode || 0;
                        const { method, url, prefixUrl } = options;
                        const shortUrl = (0, utils_2.getShortUrl)(typeof url === "string" ? new URL(url) : url === undefined ? new URL("") : url, typeof prefixUrl === "string" ? prefixUrl : prefixUrl.toString());
                        const body = response?.body ? response.body : error.message;
                        if (response?.body) {
                            error.name = "EufyApiError";
                            error.message = `${statusCode} ${method} ${shortUrl}\n${body}`;
                        }
                        return error;
                    }
                ],
                beforeRequest: [
                    async (_options) => {
                        await this.throttle(async () => { return; })();
                    }
                ]
            },
            mutableDefaults: true
        });
    }
    static async initialize(country, username, password, persistentData) {
        if ((0, i18n_iso_countries_1.isValid)(country) && country.length === 2) {
            const apiBase = await this.getApiBaseFromCloud(country);
            const api = new HTTPApi(apiBase, country, username, password, persistentData);
            await api.loadLibraries();
            return api;
        }
        throw new error_1.InvalidCountryCodeError("Invalid ISO 3166-1 Alpha-2 country code", { context: { countryCode: country } });
    }
    clearScheduleRenewAuthToken() {
        if (this.renewAuthTokenJob !== undefined) {
            this.renewAuthTokenJob.cancel();
        }
    }
    scheduleRenewAuthToken() {
        this.clearScheduleRenewAuthToken();
        if (this.tokenExpiration !== null) {
            const scheduleDate = new Date(this.tokenExpiration.getTime() - (1000 * 60 * 60 * 24));
            if (this.renewAuthTokenJob === undefined) {
                this.renewAuthTokenJob = schedule.scheduleJob("renewAuthToken", scheduleDate, async () => {
                    logging_1.rootHTTPLogger.info("Authentication token is soon expiring, fetching a new one...");
                    await this.login({ force: true });
                });
            }
            else {
                this.renewAuthTokenJob.schedule(scheduleDate);
            }
        }
    }
    invalidateToken() {
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
    setPhoneModel(model) {
        this.headers.phone_model = model.toUpperCase();
        this.requestEufyCloud.defaults.options.merge({
            headers: this.headers
        });
    }
    getPhoneModel() {
        return this.headers.phone_model;
    }
    getCountry() {
        return this.headers.country;
    }
    setLanguage(language) {
        if ((0, i18n_iso_languages_1.isValid)(language) && language.length === 2) {
            this.headers.language = language;
            this.requestEufyCloud.defaults.options.merge({
                headers: this.headers
            });
        }
        else
            throw new error_1.InvalidLanguageCodeError("Invalid ISO 639 language code", { context: { languageCode: language } });
    }
    getLanguage() {
        return this.headers.language;
    }
    async login(options) {
        options = (0, utils_2.mergeDeep)(options, {
            force: false
        });
        logging_1.rootHTTPLogger.debug("Login and get an access token", { token: this.token, tokenExpiration: this.tokenExpiration, options: options });
        if (!this.token || (this.tokenExpiration && (new Date()).getTime() >= this.tokenExpiration.getTime()) || options.verifyCode || options.captcha || options.force) {
            try {
                const data = {
                    ab: this.headers.country,
                    client_secret_info: {
                        public_key: this.ecdh.getPublicKey("hex")
                    },
                    enc: 0,
                    email: this.username,
                    password: (0, utils_1.encryptAPIData)(this.password, this.ecdh.computeSecret(Buffer.from(this.SERVER_PUBLIC_KEY, "hex"))),
                    time_zone: new Date().getTimezoneOffset() !== 0 ? -new Date().getTimezoneOffset() * 60 * 1000 : 0,
                    transaction: `${new Date().getTime()}`
                };
                if (options.verifyCode) {
                    data.verify_code = options.verifyCode;
                }
                else if (options.captcha) {
                    data.captcha_id = options.captcha.captchaId;
                    data.answer = options.captcha.captchaCode;
                }
                const response = await this.request({
                    method: "post",
                    endpoint: "v2/passport/login_sec",
                    data: data
                });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.data !== undefined) {
                        if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                            const dataresult = result.data;
                            if (dataresult.server_secret_info?.public_key)
                                this.persistentData.serverPublicKey = dataresult.server_secret_info.public_key;
                            this.persistentData.user_id = dataresult.user_id;
                            this.persistentData.email = this.decryptAPIData(dataresult.email, false);
                            this.persistentData.nick_name = dataresult.nick_name;
                            this.setToken(dataresult.auth_token);
                            this.tokenExpiration = new Date(dataresult.token_expires_at * 1000);
                            this.headers = {
                                ...this.headers,
                                gtoken: (0, utils_2.md5)(dataresult.user_id)
                            };
                            logging_1.rootHTTPLogger.debug("Login - Token data", { token: this.token, tokenExpiration: this.tokenExpiration, serverPublicKey: this.persistentData.serverPublicKey });
                            if (!this.connected) {
                                this.connected = true;
                                this.emit("connect");
                            }
                            this.scheduleRenewAuthToken();
                        }
                        else if (result.code == types_1.ResponseErrorCode.CODE_NEED_VERIFY_CODE) {
                            logging_1.rootHTTPLogger.debug(`Login - Send verification code...`);
                            const dataresult = result.data;
                            this.setToken(dataresult.auth_token);
                            this.tokenExpiration = new Date(dataresult.token_expires_at * 1000);
                            logging_1.rootHTTPLogger.debug("Token data", { token: this.token, tokenExpiration: this.tokenExpiration });
                            await this.sendVerifyCode(types_1.VerfyCodeTypes.TYPE_EMAIL);
                            logging_1.rootHTTPLogger.info("Please send required verification code to proceed with authentication");
                            this.emit("tfa request");
                        }
                        else if (result.code == types_1.ResponseErrorCode.LOGIN_NEED_CAPTCHA || result.code == types_1.ResponseErrorCode.LOGIN_CAPTCHA_ERROR) {
                            const dataresult = result.data;
                            logging_1.rootHTTPLogger.debug("Login - Captcha verification received", { captchaId: dataresult.captcha_id, item: dataresult.item });
                            logging_1.rootHTTPLogger.info("Please send requested captcha to proceed with authentication");
                            this.emit("captcha request", dataresult.captcha_id, dataresult.item);
                        }
                        else {
                            logging_1.rootHTTPLogger.error("Login - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                            this.emit("connection error", new error_2.ApiResponseCodeError("API response code not ok", { context: { code: result.code, message: result.msg } }));
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Login - Response data is missing", { code: result.code, msg: result.msg, data: result.data });
                        this.emit("connection error", new error_2.ApiInvalidResponseError("API response data is missing", { context: { code: result.code, message: result.msg, data: result.data } }));
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Login - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                    this.emit("connection error", new error_2.ApiHTTPResponseCodeError("API HTTP response code not ok", { context: { status: response.status, statusText: response.statusText } }));
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Login - Generic Error:", { error: (0, utils_2.getError)(error) });
                this.emit("connection error", new error_2.ApiGenericError("Generic API error", { cause: error }));
            }
        }
        else if (!this.connected) {
            try {
                const profile = await this.getPassportProfile();
                if (profile !== null) {
                    if (!this.connected) {
                        this.connected = true;
                        this.emit("connect");
                        this.scheduleRenewAuthToken();
                    }
                }
                else {
                    this.emit("connection error", new error_2.ApiInvalidResponseError(`Invalid passport profile response`));
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Login - getPassportProfile Error", { error: (0, utils_2.getError)(error) });
                this.emit("connection error", new error_2.ApiGenericError("API get passport profile error", { cause: error }));
            }
        }
    }
    async sendVerifyCode(type) {
        try {
            if (!type)
                type = types_1.VerfyCodeTypes.TYPE_EMAIL;
            const response = await this.request({
                method: "post",
                endpoint: "v1/sms/send/verify_code",
                data: {
                    message_type: type,
                    transaction: `${new Date().getTime()}`
                }
            });
            if (response.status == 200) {
                const result = response.data;
                if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    logging_1.rootHTTPLogger.info(`Requested verification code for 2FA`);
                    return true;
                }
                else {
                    logging_1.rootHTTPLogger.error("Send verify code - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                }
            }
            else {
                logging_1.rootHTTPLogger.error("Send verify code - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
            }
        }
        catch (err) {
            const error = (0, error_1.ensureError)(err);
            logging_1.rootHTTPLogger.error("Send verify code - Generic Error", { error: (0, utils_2.getError)(error) });
        }
        return false;
    }
    async listTrustDevice() {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "get",
                    endpoint: "v1/app/trust_device/list"
                });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data && result.data.list) {
                            return result.data.list;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("List trust device - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("List trust device - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("List trust device - Generic Error", { error: (0, utils_2.getError)(error) });
            }
        }
        return [];
    }
    async addTrustDevice(verifyCode) {
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
                logging_1.rootHTTPLogger.debug("Add trust device - Response trust device", { verifyCode: verifyCode, data: response.data });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        logging_1.rootHTTPLogger.info(`2FA authentication successfully done. Device trusted.`);
                        const trusted_devices = await this.listTrustDevice();
                        trusted_devices.forEach((trusted_device) => {
                            if (trusted_device.is_current_device === 1) {
                                logging_1.rootHTTPLogger.debug("Add trust device - This device is trusted. Token expiration extended:", { trustDevice: { phoneModel: trusted_device.phone_model, openUdid: trusted_device.open_udid }, tokenExpiration: this.tokenExpiration });
                            }
                        });
                        return true;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Add trust device - Response code not ok", { code: result.code, msg: result.msg, verifyCode: verifyCode, data: response.data });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Add trust device - Status return code not 200", { status: response.status, statusText: response.statusText, verifyCode: verifyCode, data: response.data });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Add trust device - Generic Error", { error: (0, utils_2.getError)(error) });
            }
        }
        return false;
    }
    async getStationList() {
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
                    const result = response.data;
                    if (result.code == 0) {
                        if (result.data) {
                            const stationList = this.decryptAPIData(result.data);
                            logging_1.rootHTTPLogger.debug("Decrypted station list data", stationList);
                            return stationList;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Station list - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Station list - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Station list - Generic Error", { error: (0, utils_2.getError)(error) });
            }
        }
        return [];
    }
    async getDeviceList() {
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
                    const result = response.data;
                    if (result.code == 0) {
                        if (result.data) {
                            const deviceList = this.decryptAPIData(result.data);
                            logging_1.rootHTTPLogger.debug("Decrypted device list data", deviceList);
                            return deviceList;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Device list - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Device list - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Device list - Generic Error", { error: (0, utils_2.getError)(error) });
            }
        }
        return [];
    }
    async refreshHouseData() {
        //Get Houses
        const houses = await this.getHouseList();
        if (houses && houses.length > 0) {
            houses.forEach(element => {
                this.houses[element.house_id] = element;
            });
        }
        else {
            logging_1.rootHTTPLogger.info("No houses found.");
        }
        this.emit("houses", this.houses);
    }
    async refreshStationData() {
        //Get Stations
        const stations = await this.getStationList();
        if (stations && stations.length > 0) {
            stations.forEach(element => {
                this.hubs[element.station_sn] = element;
            });
        }
        else {
            logging_1.rootHTTPLogger.info("No stations found.");
        }
        this.emit("hubs", this.hubs);
    }
    async refreshDeviceData() {
        //Get Devices
        const devices = await this.getDeviceList();
        if (devices && devices.length > 0) {
            devices.forEach(element => {
                this.devices[element.device_sn] = element;
            });
        }
        else {
            logging_1.rootHTTPLogger.info("No devices found.");
        }
        this.emit("devices", this.devices);
    }
    async refreshAllData() {
        //Get the latest info
        //Get Houses
        await this.refreshHouseData();
        //Get Stations
        await this.refreshStationData();
        //Get Devices
        await this.refreshDeviceData();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async request(request, withoutUrlPrefix = false) {
        logging_1.rootHTTPLogger.debug("Api request", { method: request.method, endpoint: request.endpoint, responseType: request.responseType, token: this.token, data: request.data });
        try {
            let options;
            switch (request.responseType) {
                case undefined:
                case "json":
                    options = {
                        method: request.method,
                        json: request.data,
                        responseType: "json",
                    };
                    break;
                case "text":
                    options = {
                        method: request.method,
                        json: request.data,
                        responseType: request.responseType,
                    };
                    break;
                case "buffer":
                    options = {
                        method: request.method,
                        json: request.data,
                        responseType: request.responseType,
                    };
                    break;
            }
            if (withoutUrlPrefix)
                options.prefixUrl = "";
            const internalResponse = await this.requestEufyCloud(request.endpoint, options);
            const response = {
                status: internalResponse.statusCode,
                statusText: internalResponse.statusMessage ? internalResponse.statusMessage : "",
                headers: internalResponse.headers,
                data: internalResponse.body,
            };
            logging_1.rootHTTPLogger.debug("Api request - Response", { token: this.token, request: request, response: response.data });
            return response;
        }
        catch (err) {
            const error = (0, error_1.ensureError)(err);
            if (error instanceof (await import("got")).HTTPError) {
                if (error.response.statusCode === 401) {
                    this.invalidateToken();
                    logging_1.rootHTTPLogger.error("Status return code 401, invalidate token", { status: error.response.statusCode, statusText: error.response.statusMessage });
                    this.emit("close");
                }
            }
            throw new error_2.ApiRequestError("API request error", { cause: error, context: { method: request.method, endpoint: request.endpoint, responseType: request.responseType, token: this.token, data: request.data } });
        }
    }
    async checkPushToken() {
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
                    const result = response.data;
                    if (result.code == 0) {
                        logging_1.rootHTTPLogger.debug(`Check push token - Push token OK`);
                        return true;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Check push token - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Check push token - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Check push token - Generic Error", { error: (0, utils_2.getError)(error) });
            }
        }
        return false;
    }
    async registerPushToken(token) {
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
                    const result = response.data;
                    if (result.code == 0) {
                        logging_1.rootHTTPLogger.debug(`Register push token - Push token registered successfully`);
                        return true;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Register push token - Response code not ok", { code: result.code, msg: result.msg, data: response.data, token: token });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Register push token - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, token: token });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Register push token - Generic Error", { error: (0, utils_2.getError)(error), token: token });
            }
        }
        return false;
    }
    async setParameters(stationSN, deviceSN, params) {
        if (this.connected) {
            const tmp_params = [];
            params.forEach(param => {
                tmp_params.push({ param_type: param.paramType, param_value: parameter_1.ParameterHelper.writeValue(param.paramType, param.paramValue) });
            });
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/app/upload_devs_params",
                    data: {
                        device_sn: deviceSN,
                        station_sn: stationSN,
                        params: tmp_params,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                logging_1.rootHTTPLogger.debug("Set parameter - Response:", { stationSN: stationSN, deviceSN: deviceSN, params: tmp_params, response: response.data });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == 0) {
                        const dataresult = result.data;
                        logging_1.rootHTTPLogger.debug("Set parameter - New parameters set", { params: tmp_params, response: dataresult });
                        return true;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Set parameter - Response code not ok", { code: result.code, msg: result.msg, data: response.data, stationSN: stationSN, deviceSN: deviceSN, params: params });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Set parameter - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, stationSN: stationSN, deviceSN: deviceSN, params: params });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Set parameter - Generic Error", { error: (0, utils_2.getError)(error), stationSN: stationSN, deviceSN: deviceSN, params: params });
            }
        }
        return false;
    }
    async getCiphers(/*stationSN: string, */ cipherIDs, userID) {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v2/app/cipher/get_ciphers",
                    data: {
                        cipher_ids: cipherIDs,
                        user_id: userID,
                        //sn: stationSN
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const ciphers = {};
                            const decrypted = this.decryptAPIData(result.data);
                            logging_1.rootHTTPLogger.debug("Get ciphers - Decrypted ciphers data", { ciphers: decrypted });
                            if (Array.isArray(decrypted)) {
                                decrypted.forEach((cipher) => {
                                    ciphers[cipher.cipher_id] = cipher;
                                });
                            }
                            return ciphers;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Get ciphers - Response code not ok", { code: result.code, msg: result.msg, data: response.data, cipherIDs: cipherIDs, userID: userID });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get ciphers - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, cipherIDs: cipherIDs, userID: userID });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get ciphers - Generic Error", { error: (0, utils_2.getError)(error), cipherIDs: cipherIDs, userID: userID });
            }
        }
        return {};
    }
    async getVoices(deviceSN) {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "get",
                    endpoint: `v1/voice/response/lists/${deviceSN}`
                });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const voices = {};
                            result.data.forEach((voice) => {
                                voices[voice.voice_id] = voice;
                            });
                            return voices;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Get Voices - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get Voices - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get Voices - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN });
            }
        }
        return {};
    }
    async getCipher(/*stationSN: string, */ cipherID, userID) {
        return (await this.getCiphers(/*stationSN, */ [cipherID], userID))[cipherID];
    }
    getDevices() {
        return this.devices;
    }
    getHubs() {
        return this.hubs;
    }
    getToken() {
        return this.token;
    }
    getTokenExpiration() {
        return this.tokenExpiration;
    }
    setToken(token) {
        this.token = token;
        this.requestEufyCloud.defaults.options.merge({
            headers: {
                "X-Auth-Token": token
            }
        });
    }
    setTokenExpiration(tokenExpiration) {
        this.tokenExpiration = tokenExpiration;
    }
    getAPIBase() {
        return typeof this.requestEufyCloud.defaults.options.prefixUrl === "string" ? this.requestEufyCloud.defaults.options.prefixUrl : this.requestEufyCloud.defaults.options.prefixUrl.toString();
    }
    setOpenUDID(openudid) {
        this.headers.openudid = openudid;
        this.requestEufyCloud.defaults.options.merge({
            headers: this.headers
        });
    }
    setSerialNumber(serialnumber) {
        this.headers.sn = serialnumber;
        this.requestEufyCloud.defaults.options.merge({
            headers: this.headers
        });
    }
    async _getEvents(functionName, endpoint, startTime, endTime, filter, maxResults) {
        const records = [];
        if (this.connected) {
            try {
                if (filter === undefined)
                    filter = { deviceSN: "", stationSN: "", storageType: types_1.StorageType.NONE };
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
                        storage: filter.storageType !== undefined ? filter.storageType : types_1.StorageType.NONE,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                logging_1.rootHTTPLogger.debug(`${functionName} - Response:`, response.data);
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == 0) {
                        if (result.data) {
                            const dataresult = this.decryptAPIData(result.data);
                            logging_1.rootHTTPLogger.debug(`${functionName} - Decrypted data:`, dataresult);
                            if (dataresult) {
                                dataresult.forEach(record => {
                                    logging_1.rootHTTPLogger.debug(`${functionName} - Record:`, record);
                                    records.push(record);
                                });
                            }
                        }
                        else {
                            logging_1.rootHTTPLogger.error(`${functionName} - Response data is missing`, { code: result.code, msg: result.msg, data: response.data, endpoint: endpoint, startTime: startTime, endTime: endTime, filter: filter, maxResults: maxResults });
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error(`${functionName} - Response code not ok`, { code: result.code, msg: result.msg, data: response.data, endpoint: endpoint, startTime: startTime, endTime: endTime, filter: filter, maxResults: maxResults });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error(`${functionName} - Status return code not 200`, { status: response.status, statusText: response.statusText, data: response.data, endpoint: endpoint, startTime: startTime, endTime: endTime, filter: filter, maxResults: maxResults });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error(`${functionName} - Generic Error`, { error: (0, utils_2.getError)(error), endpoint: endpoint, startTime: startTime, endTime: endTime, filter: filter, maxResults: maxResults });
            }
        }
        return records;
    }
    async getVideoEvents(startTime, endTime, filter, maxResults) {
        return this._getEvents("getVideoEvents", "v2/event/app/get_all_video_record", startTime, endTime, filter, maxResults);
    }
    async getAlarmEvents(startTime, endTime, filter, maxResults) {
        return this._getEvents("getAlarmEvents", "v2/event/app/get_all_alarm_record", startTime, endTime, filter, maxResults);
    }
    async getHistoryEvents(startTime, endTime, filter, maxResults) {
        return this._getEvents("getHistoryEvents", "v2/event/app/get_all_history_record", startTime, endTime, filter, maxResults);
    }
    async getAllVideoEvents(filter, maxResults) {
        const fifteenYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getVideoEvents(new Date(new Date().getTime() - fifteenYearsInMilliseconds), new Date(), filter, maxResults);
    }
    async getAllAlarmEvents(filter, maxResults) {
        const fifteenYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getAlarmEvents(new Date(new Date().getTime() - fifteenYearsInMilliseconds), new Date(), filter, maxResults);
    }
    async getAllHistoryEvents(filter, maxResults) {
        const fifteenYearsInMilliseconds = 15 * 365 * 24 * 60 * 60 * 1000;
        return this.getHistoryEvents(new Date(new Date().getTime() - fifteenYearsInMilliseconds), new Date(), filter, maxResults);
    }
    isConnected() {
        return this.connected;
    }
    async getInvites() {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v2/family/get_invites",
                    data: {
                        num: 100,
                        orderby: "",
                        own: false,
                        page: 0,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const invites = {};
                            const decrypted = this.decryptAPIData(result.data);
                            logging_1.rootHTTPLogger.debug("Get invites - Decrypted invites data", { invites: decrypted });
                            if (Array.isArray(decrypted)) {
                                decrypted.forEach((invite) => {
                                    invites[invite.invite_id] = invite;
                                    let data = (0, utils_2.parseJSON)(invites[invite.invite_id].devices, logging_1.rootHTTPLogger);
                                    if (data === undefined)
                                        data = [];
                                    invites[invite.invite_id].devices = data;
                                });
                            }
                            return invites;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Get invites - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get invites - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get invites - Generic Error", { error: (0, utils_2.getError)(error) });
            }
        }
        return {};
    }
    async confirmInvites(confirmInvites) {
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
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        return true;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Confirm invites - Response code not ok", { code: result.code, msg: result.msg, data: response.data, confirmInvites: confirmInvites });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Confirm invites - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, confirmInvites: confirmInvites });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Confirm invites - Generic Error", { error: (0, utils_2.getError)(error), confirmInvites: confirmInvites });
            }
        }
        return false;
    }
    async getPublicKey(deviceSN, type) {
        if (this.connected) {
            try {
                if (this.persistentData.device_public_keys[deviceSN] !== undefined && type === types_1.PublicKeyType.LOCK) {
                    logging_1.rootHTTPLogger.debug("return cached public key", this.persistentData.device_public_keys[deviceSN]);
                    return this.persistentData.device_public_keys[deviceSN];
                }
                else {
                    const response = await this.request({
                        method: "get",
                        endpoint: `v1/app/public_key/query?device_sn=${deviceSN}&type=${type}`
                    });
                    if (response.status == 200) {
                        const result = response.data;
                        if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                            if (result.data) {
                                if (type === types_1.PublicKeyType.LOCK)
                                    this.persistentData.device_public_keys[deviceSN] = result.data.public_key;
                                return result.data.public_key;
                            }
                        }
                        else {
                            logging_1.rootHTTPLogger.error("Get public key - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, type: type });
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Get public key - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, type: type });
                    }
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get public key - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN, type: type });
            }
        }
        return "";
    }
    decryptAPIData(data, json = true) {
        if (data) {
            let decryptedData;
            try {
                decryptedData = (0, utils_1.decryptAPIData)(data, this.ecdh.computeSecret(Buffer.from(this.persistentData.serverPublicKey, "hex")));
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Data decryption error, invalidating session data and reconnecting...", { error: (0, utils_2.getError)(error), serverPublicKey: this.persistentData.serverPublicKey });
                this.persistentData.serverPublicKey = this.SERVER_PUBLIC_KEY;
                this.invalidateToken();
                this.emit("close");
            }
            if (decryptedData) {
                const str = (0, utils_3.getNullTerminatedString)(decryptedData, "utf-8");
                if (json)
                    return (0, utils_2.parseJSON)(str, logging_1.rootHTTPLogger);
                return str;
            }
            if (json)
                return {};
        }
        return undefined;
    }
    async getSensorHistory(stationSN, deviceSN) {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/app/get_sensor_history",
                    data: {
                        devicse_sn: deviceSN,
                        max_time: 0, //TODO: Finish implementation
                        num: 500, //TODO: Finish implementation
                        page: 0, //TODO: Finish implementation
                        station_sn: stationSN,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const entries = result.data;
                            return entries;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Get sensor history - Response code not ok", { code: result.code, msg: result.msg, data: response.data, stationSN: stationSN, deviceSN: deviceSN });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get sensor history - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, stationSN: stationSN, deviceSN: deviceSN });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get sensor history - Generic Error", { error: (0, utils_2.getError)(error), stationSN: stationSN, deviceSN: deviceSN });
            }
        }
        return [];
    }
    async getHouseDetail(houseID) {
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
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            const houseDetail = this.decryptAPIData(result.data);
                            logging_1.rootHTTPLogger.debug("Get house detail - Decrypted house detail data", { details: houseDetail });
                            return houseDetail;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Get house detail - Response code not ok", { code: result.code, msg: result.msg, data: response.data, houseID: houseID });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get house detail - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, houseID: houseID });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get house detail - Generic Error", { error: (0, utils_2.getError)(error), houseID: houseID });
            }
        }
        return null;
    }
    async getHouseList() {
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
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            logging_1.rootHTTPLogger.debug("Get house list - houses", { houses: result.data });
                            return result.data;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Get house list - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get house list - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get house list - Generic Error", { error: (0, utils_2.getError)(error) });
            }
        }
        return [];
    }
    async getHouseInviteList(isInviter = 1) {
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
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data) {
                            //const houseInviteList = this.decryptAPIData(result.data) as Array<HouseInviteListResponse>;   // No more encrypted!?
                            //rootHTTPLogger.debug("Get house invite list - Decrypted house invite list data", houseInviteList);
                            const houseInviteList = result.data;
                            logging_1.rootHTTPLogger.debug("Get house invite list - House invite list data", houseInviteList);
                            return houseInviteList;
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Get house invite list - Response code not ok", { code: result.code, msg: result.msg, data: response.data, isInviter: isInviter });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get house invite list - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, isInviter: isInviter });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get house invite list - Generic Error", { error: (0, utils_2.getError)(error), isInviter: isInviter });
            }
        }
        return [];
    }
    async confirmHouseInvite(houseID, inviteID) {
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
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        return true;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Confirm house invite - Response code not ok", { code: result.code, msg: result.msg, data: response.data, houseID: houseID, inviteID: inviteID });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Confirm house invite - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, houseID: houseID, inviteID: inviteID });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Confirm house invite - Generic Error", { error: (0, utils_2.getError)(error), houseID: houseID, inviteID: inviteID });
            }
        }
        return false;
    }
    getPersistentData() {
        return this.persistentData;
    }
    async getPassportProfile() {
        try {
            const response = await this.request({
                method: "get",
                endpoint: "v2/passport/profile"
            });
            if (response.status == 200) {
                const result = response.data;
                if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const profile = this.decryptAPIData(result.data);
                        logging_1.rootHTTPLogger.debug("Get passport profile - Decrypted passport profile data", { profile: profile });
                        this.persistentData.user_id = profile.user_id;
                        this.persistentData.nick_name = profile.nick_name;
                        this.persistentData.email = profile.email;
                        return profile;
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get passport profile - Response code not ok", { code: result.code, msg: result.msg, data: response.data });
                }
            }
            else {
                logging_1.rootHTTPLogger.error("Get passport profile - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data });
            }
        }
        catch (err) {
            const error = (0, error_1.ensureError)(err);
            logging_1.rootHTTPLogger.error("Get passport profile - Generic Error", { error: (0, utils_2.getError)(error) });
        }
        return null;
    }
    async addUser(deviceSN, nickname, stationSN = "") {
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
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        if (result.data)
                            return result.data;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Add user - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, nickname: nickname, stationSN: stationSN });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Add user - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, nickname: nickname, stationSN: stationSN });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Add user - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN, nickname: nickname, stationSN: stationSN });
            }
        }
        return null;
    }
    async deleteUser(deviceSN, shortUserId, stationSN = "") {
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
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        return true;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Delete user - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, shortUserId: shortUserId, stationSN: stationSN });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Delete user - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, shortUserId: shortUserId, stationSN: stationSN });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Delete user - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN, shortUserId: shortUserId, stationSN: stationSN });
            }
        }
        return false;
    }
    async getUsers(deviceSN, stationSN) {
        try {
            const response = await this.request({
                method: "get",
                endpoint: `v1/app/device/user/list?device_sn=${deviceSN}&station_sn=${stationSN}`
            });
            if (response.status == 200) {
                const result = response.data;
                if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                    if (result.data) {
                        const usersResponse = result.data;
                        return usersResponse.user_list;
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Get users - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, stationSN: stationSN });
                }
            }
            else {
                logging_1.rootHTTPLogger.error("Get users - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, stationSN: stationSN });
            }
        }
        catch (err) {
            const error = (0, error_1.ensureError)(err);
            logging_1.rootHTTPLogger.error("Get users - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN, stationSN: stationSN });
        }
        return null;
    }
    async getUser(deviceSN, stationSN, shortUserId) {
        try {
            const users = await this.getUsers(deviceSN, stationSN);
            if (users !== null) {
                for (const user of users) {
                    if (user.short_user_id === shortUserId) {
                        return user;
                    }
                }
            }
        }
        catch (err) {
            const error = (0, error_1.ensureError)(err);
            logging_1.rootHTTPLogger.error("Get user - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId });
        }
        return null;
    }
    async updateUser(deviceSN, stationSN, shortUserId, nickname) {
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
                        const result = response.data;
                        if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                            return true;
                        }
                        else {
                            logging_1.rootHTTPLogger.error("Update user - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId, nickname: nickname });
                        }
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Update user - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId, nickname: nickname });
                    }
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Update user - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN, stationSN: stationSN, shortUserId: shortUserId, nickname: nickname });
            }
        }
        return false;
    }
    async getImage(deviceSN, url) {
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
                            return (0, utils_1.decodeImage)(station.p2p_did, response.data);
                        }
                        else {
                            logging_1.rootHTTPLogger.error("Get Image - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, url: url });
                        }
                    }
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Get Image - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN, url: url });
            }
        }
        return Buffer.alloc(0);
    }
    async updateUserPassword(deviceSN, shortUserId, passwordId, schedule, stationSN = "") {
        if (this.connected) {
            try {
                const response = await this.request({
                    method: "post",
                    endpoint: "v1/app/device/password/save_or_update",
                    data: {
                        device_sn: deviceSN,
                        password_list: [{
                                password_id: passwordId,
                                password_type: types_1.UserPasswordType.PIN,
                                schedule: JSON.stringify({
                                    endDay: schedule !== undefined && schedule.endDateTime !== undefined ? (0, utils_1.hexDate)(schedule.endDateTime) : "ffffffff",
                                    endTime: schedule !== undefined && schedule.endDateTime !== undefined ? (0, utils_1.hexTime)(schedule.endDateTime) : "ffff",
                                    startDay: schedule !== undefined && schedule.startDateTime !== undefined ? (0, utils_1.hexDate)(schedule.startDateTime) : "00000000",
                                    startTime: schedule !== undefined && schedule.startDateTime !== undefined ? (0, utils_1.hexTime)(schedule.startDateTime) : "0000",
                                    week: schedule !== undefined && schedule.week !== undefined ? (0, utils_1.hexWeek)(schedule) : "ff",
                                })
                            }],
                        short_user_id: shortUserId,
                        station_sn: stationSN === deviceSN ? "" : stationSN,
                        transaction: `${new Date().getTime().toString()}`
                    }
                });
                if (response.status == 200) {
                    const result = response.data;
                    if (result.code == types_1.ResponseErrorCode.CODE_WHATEVER_ERROR) {
                        return true;
                    }
                    else {
                        logging_1.rootHTTPLogger.error("Add user - Response code not ok", { code: result.code, msg: result.msg, data: response.data, deviceSN: deviceSN, shortUserId: shortUserId, schedule: schedule, stationSN: stationSN });
                    }
                }
                else {
                    logging_1.rootHTTPLogger.error("Add user - Status return code not 200", { status: response.status, statusText: response.statusText, data: response.data, deviceSN: deviceSN, shortUserId: shortUserId, schedule: schedule, stationSN: stationSN });
                }
            }
            catch (err) {
                const error = (0, error_1.ensureError)(err);
                logging_1.rootHTTPLogger.error("Add user - Generic Error", { error: (0, utils_2.getError)(error), deviceSN: deviceSN, shortUserId: shortUserId, schedule: schedule, stationSN: stationSN });
            }
        }
        return false;
    }
}
exports.HTTPApi = HTTPApi;
//# sourceMappingURL=api.js.map