import got from "got";
import * as qs from "qs";
import { dummyLogger, Logger } from "ts-log";
import { TypedEmitter } from "tiny-typed-emitter";

import { buildCheckinRequest, convertTimestampMs, generateFid, parseCheckinResponse, sleep } from "./utils";
import { CheckinResponse, Credentials, CusPushData, DoorbellPushData, FidInstallationResponse, FidTokenResponse, GcmRegisterResponse, IndoorPushData, RawPushMessage, PushMessage, BatteryDoorbellPushData, LockPushData, SmartSafeData, PlatformPushMode, GarageDoorPushData } from "./models";
import { PushClient } from "./client";
import { PushNotificationServiceEvents } from "./interfaces";
import { Device } from "../http/device";
import { DeviceType } from "../http/types";
import { getAbsoluteFilePath } from "../http/utils";
import { getError, getShortUrl, isEmpty, parseJSON } from "../utils";
import { ExecuteCheckInError, FidRegistrationFailedError, RegisterGcmError, RenewFidTokenFailedError, UnknownExpiryFormaError } from "./error";
import { ensureError } from "../error";

export class PushNotificationService extends TypedEmitter<PushNotificationServiceEvents> {

    private readonly APP_PACKAGE = "com.oceanwing.battery.cam";
    private readonly APP_ID = "1:348804314802:android:440a6773b3620da7";
    private readonly APP_SENDER_ID = "348804314802";
    private readonly APP_CERT_SHA1 = "F051262F9F99B638F3C76DE349830638555B4A0A";
    private readonly FCM_PROJECT_ID = "batterycam-3250a";
    private readonly GOOGLE_API_KEY = "AIzaSyCSz1uxGrHXsEktm7O3_wv-uLGpC9BvXR8";
    private readonly AUTH_VERSION = "FIS_v2";

    private pushClient?: PushClient;
    private credentialsTimeout?: NodeJS.Timeout;
    private retryTimeout?: NodeJS.Timeout;
    private retryDelay = 0;
    private credentials: Credentials | undefined;
    private persistentIds: string[] = [];

    private log: Logger;
    private connected = false;
    private connecting = false;

    constructor(log: Logger = dummyLogger) {
        super();
        this.log = log;
    }

    private buildExpiresAt(expiresIn: string): number {
        if (expiresIn.endsWith("ms")) {
            return new Date().getTime() + Number.parseInt(expiresIn.substring(0, expiresIn.length - 2));
        } else if (expiresIn.endsWith("s")) {
            return new Date().getTime() + Number.parseInt(expiresIn.substring(0, expiresIn.length - 1)) * 1000;
        }
        throw new UnknownExpiryFormaError("Unknown expiresIn-format", { context: { format: expiresIn } });
    }

    private async registerFid(fid: string): Promise<FidInstallationResponse> {
        const url = `https://firebaseinstallations.googleapis.com/v1/projects/${this.FCM_PROJECT_ID}/installations`;

        try {
            const response = await got(url, {
                method: "post",
                json: {
                    fid: fid,
                    appId: `${this.APP_ID}`,
                    authVersion: `${this.AUTH_VERSION}`,
                    sdkVersion: "a:16.3.1",
                },
                headers: {
                    "X-Android-Package": `${this.APP_PACKAGE}`,
                    "X-Android-Cert": `${this.APP_CERT_SHA1}`,
                    "x-goog-api-key": `${this.GOOGLE_API_KEY}`,
                },
                responseType: "json",
                http2: false,
                throwHttpErrors: false,
                retry: {
                    limit: 3,
                    methods: ["POST"]
                },
                hooks: {
                    beforeError: [
                        error => {
                            const { response, options } = error;
                            const statusCode = response?.statusCode || 0;
                            const { method, url, prefixUrl } = options;
                            const shortUrl = getShortUrl(url, prefixUrl);
                            const body = response?.body ? response.body : error.message;
                            if (response?.body) {
                                error.name = "RegisterFidError";
                                error.message = `${statusCode} ${method} ${shortUrl}\n${body}`;
                            }
                            return error;
                        }
                    ]
                }
            });

            if (response.statusCode == 200) {
                const result: FidInstallationResponse = response.body as FidInstallationResponse;
                return {
                    ...result,
                    authToken: {
                        ...result.authToken,
                        expiresAt: this.buildExpiresAt(result.authToken.expiresIn),
                    },
                };
            } else {
                this.log.error("Register FID - Status return code not 200", { status: response.statusCode, statusText: response.statusMessage, data: response.body });
                throw new FidRegistrationFailedError("FID registration failed", { context: { status: response.statusCode, statusText: response.statusMessage, data: response.body } });
            }
        } catch (err) {
            const error = ensureError(err);
            this.log.error("Register FID - Generic Error", { error: getError(error) });
            throw new FidRegistrationFailedError("FID registration failed", { cause: error, context: { fid: fid } });
        }
    }

    private async renewFidToken(fid: string, refreshToken: string): Promise<FidTokenResponse> {
        const url = `https://firebaseinstallations.googleapis.com/v1/projects/${this.FCM_PROJECT_ID}/installations/${fid}/authTokens:generate`;

        try {

            const response = await got(url, {
                method: "post",
                json: {
                    installation: {
                        appId: `${this.APP_ID}`,
                        sdkVersion: "a:16.3.1",
                    }
                },
                headers: {
                    "X-Android-Package": `${this.APP_PACKAGE}`,
                    "X-Android-Cert": `${this.APP_CERT_SHA1}`,
                    "x-goog-api-key": `${this.GOOGLE_API_KEY}`,
                    Authorization: `${this.AUTH_VERSION} ${refreshToken}`
                },
                responseType: "json",
                http2: false,
                throwHttpErrors: false,
                retry: {
                    limit: 3,
                    methods: ["POST"]
                },
                hooks: {
                    beforeError: [
                        error => {
                            const { response, options } = error;
                            const statusCode = response?.statusCode || 0;
                            const { method, url, prefixUrl } = options;
                            const shortUrl = getShortUrl(url, prefixUrl);
                            const body = response?.body ? response.body : error.message;
                            if (response?.body) {
                                error.name = "RenewFidTokenError";
                                error.message = `${statusCode} ${method} ${shortUrl}\n${body}`;
                            }
                            return error;
                        }
                    ]
                }
            });

            if (response.statusCode == 200) {
                const result: FidTokenResponse = response.body as FidTokenResponse;
                return {
                    ...result,
                    expiresAt: this.buildExpiresAt(result.expiresIn),
                };
            } else {
                this.log.error("Renew FID Token - Status return code not 200", { status: response.statusCode, statusText: response.statusMessage, data: response.body });
                throw new RenewFidTokenFailedError("FID Token renewal failed", { context: { status: response.statusCode, statusText: response.statusMessage, data: response.body } });
            }
        } catch (err) {
            const error = ensureError(err);
            this.log.error("Renew FID Token - Generic Error", { error: getError(error) });
            throw new RenewFidTokenFailedError("FID Token renewal failed", { cause: error, context: { fid: fid, refreshToken: refreshToken } });
        }
    }

    private async createPushCredentials(): Promise<Credentials> {
        const generatedFid = generateFid();
        return await this.registerFid(generatedFid)
            .then(async (registerFidResponse) => {
                const checkinResponse = await this.executeCheckin();
                return {
                    fidResponse: registerFidResponse,
                    checkinResponse: checkinResponse
                };
            })
            .then(async (result) => {
                const registerGcmResponse = await this.registerGcm(result.fidResponse, result.checkinResponse);
                return {
                    ...result,
                    gcmResponse: registerGcmResponse,
                };
            }).catch((err) => {
                const error = ensureError(err);
                throw error;
            });
    }

    private async renewPushCredentials(credentials: Credentials): Promise<Credentials> {
        return await this.renewFidToken(credentials.fidResponse.fid, credentials.fidResponse.refreshToken)
            .then(async (response) => {
                credentials.fidResponse.authToken = response;
                return await this.executeCheckin();
            })
            .then(async (response) => {
                const registerGcmResponse = await this.registerGcm(credentials.fidResponse, response);
                return {
                    fidResponse: credentials.fidResponse,
                    checkinResponse: response,
                    gcmResponse: registerGcmResponse,
                } as Credentials;
            })
            .catch(() => {
                return this.createPushCredentials();
            });
    }

    private async loginPushCredentials(credentials: Credentials): Promise<Credentials> {
        return await this.executeCheckin()
            .then(async (response) => {
                const registerGcmResponse = await this.registerGcm(credentials.fidResponse, response);
                return {
                    fidResponse: credentials.fidResponse,
                    checkinResponse: response,
                    gcmResponse: registerGcmResponse,
                } as Credentials;
            })
            .catch(() => {
                return this.createPushCredentials();
            });
    }

    private async executeCheckin(): Promise<CheckinResponse> {
        const url = "https://android.clients.google.com/checkin";

        try {
            const buffer = await buildCheckinRequest();
            const response = await got(url, {
                method: "post",
                body: Buffer.from(buffer),
                headers: {
                    "Content-Type": "application/x-protobuf",
                },
                responseType: "buffer",
                http2: false,
                throwHttpErrors: false,
                retry: {
                    limit: 3,
                    methods: ["POST"]
                },
                hooks: {
                    beforeError: [
                        error => {
                            const { response, options } = error;
                            const statusCode = response?.statusCode || 0;
                            const { method, url, prefixUrl } = options;
                            const shortUrl = getShortUrl(url, prefixUrl);
                            const body = response?.body ? response.body : error.message;
                            if (response?.body) {
                                error.name = "ExecuteCheckInError";
                                error.message = `${statusCode} ${method} ${shortUrl}\n${body}`;
                            }
                            return error;
                        }
                    ]
                }
            });

            if (response.statusCode == 200) {
                return await parseCheckinResponse(response.body);
            } else {
                this.log.error("Check in - Status return code not 200", { status: response.statusCode, statusText: response.statusMessage, data: response.body });
                throw new ExecuteCheckInError("Google checkin failed", { context: { status: response.statusCode, statusText: response.statusMessage, data: response.body } });
            }
        } catch (err) {
            const error = ensureError(err);
            this.log.error("Check in - Generic Error", { error: getError(error) });
            throw new ExecuteCheckInError("Google checkin failed", { cause: error });
        }
    }

    private async registerGcm(fidInstallationResponse: FidInstallationResponse, checkinResponse: CheckinResponse): Promise<GcmRegisterResponse> {
        const url = "https://android.clients.google.com/c2dm/register3";

        const androidId = checkinResponse.androidId;
        const fid = fidInstallationResponse.fid;
        const securityToken = checkinResponse.securityToken;

        const retry = 5;

        try {
            for (let retry_count = 1; retry_count <= retry; retry_count++) {
                const response = await got(url, {
                    method: "post",
                    body: qs.stringify({
                        "X-subtype": `${this.APP_SENDER_ID}`,
                        sender: `${this.APP_SENDER_ID}`,
                        "X-app_ver": "741",
                        "X-osv": "25",
                        "X-cliv": "fiid-20.2.0",
                        "X-gmsv": "201216023",
                        "X-appid": `${fid}`,
                        "X-scope": "*",
                        "X-Goog-Firebase-Installations-Auth": `${fidInstallationResponse.authToken.token}`,
                        "X-gmp_app_id": `${this.APP_ID}`,
                        "X-Firebase-Client": "fire-abt/17.1.1+fire-installations/16.3.1+fire-android/+fire-analytics/17.4.2+fire-iid/20.2.0+fire-rc/17.0.0+fire-fcm/20.2.0+fire-cls/17.0.0+fire-cls-ndk/17.0.0+fire-core/19.3.0",
                        "X-firebase-app-name-hash": "R1dAH9Ui7M-ynoznwBdw01tLxhI",
                        "X-Firebase-Client-Log-Type": "1",
                        "X-app_ver_name": "v2.2.2_741",
                        app: `${this.APP_PACKAGE}`,
                        device: `${androidId}`,
                        app_ver: "741",
                        info: "g3EMJXXElLwaQEb1aBJ6XhxiHjPTUxc",
                        gcm_ver: "201216023",
                        plat: "0",
                        cert: `${this.APP_CERT_SHA1}`,
                        target_ver: "28",
                    }),
                    headers: {
                        Authorization: `AidLogin ${androidId}:${securityToken}`,
                        app: `${this.APP_PACKAGE}`,
                        gcm_ver: "201216023",
                        "User-Agent": "Android-GCM/1.5 (OnePlus5 NMF26X)",
                        "content-type": "application/x-www-form-urlencoded",
                    },
                    http2: false,
                    throwHttpErrors: false,
                    retry: {
                        limit: 3,
                        methods: ["POST"]
                    },
                    hooks: {
                        beforeError: [
                            error => {
                                const { response, options } = error;
                                const statusCode = response?.statusCode || 0;
                                const { method, url, prefixUrl } = options;
                                const shortUrl = getShortUrl(url, prefixUrl);
                                const body = response?.body ? response.body : error.message;
                                if (response?.body) {
                                    error.name = "RegisterGcmError";
                                    error.message = `${statusCode} ${method} ${shortUrl}\n${body}`;
                                }
                                return error;
                            }
                        ]
                    }
                });

                if (response.statusCode == 200) {
                    const result = response.body.split("=");
                    if (result[0] == "Error") {
                        this.log.debug("GCM register error, retry...", { retry: retry, retryCount: retry_count, response: response.body });
                        if (retry_count == retry)
                            throw new RegisterGcmError("Max GCM registration retries reached", { context: { message: result[1], retry: retry, retryCount: retry_count } });
                    } else {
                        return {
                            token: result[1]
                        };
                    }
                } else {
                    this.log.error("Register GCM - Status return code not 200", { status: response.statusCode, statusText: response.statusMessage, data: response.body });
                    throw new RegisterGcmError("Google register to GCM failed", { context: { status: response.statusCode, statusText: response.statusMessage, data: response.body } });
                }
                await sleep(10000 * retry_count);
            }
            throw new RegisterGcmError("Max GCM registration retries reached");
        } catch (err) {
            const error = ensureError(err);
            this.log.error("Register GCM - Generic Error", { error: getError(error) });
            throw new RegisterGcmError("Google register to GCM failed", { cause: error, context: { fidInstallationResponse: fidInstallationResponse, checkinResponse: checkinResponse } });
        }
    }

    private _normalizePushMessage(message: RawPushMessage): PushMessage {
        const normalized_message: PushMessage = {
            name: "",
            event_time: 0,
            type: -1,
            station_sn: "",
            device_sn: ""
        }
        if (message.payload.payload) {
            // CusPush
            normalized_message.type = Number.parseInt(message.payload.type);
            try {
                normalized_message.event_time = message.payload.event_time !== undefined ? convertTimestampMs(Number.parseInt(message.payload.event_time)) : Number.parseInt(message.payload.event_time);
            } catch (err) {
                const error = ensureError(err);
                this.log.error(`Normalize push message - Type ${DeviceType[normalized_message.type]} CusPush - event_time - Error`, { error: getError(error), message: message });
            }
            normalized_message.station_sn = message.payload.station_sn;
            if (normalized_message.type === DeviceType.FLOODLIGHT)
                normalized_message.device_sn = message.payload.station_sn;
            else
                normalized_message.device_sn = message.payload.device_sn;
            if (isEmpty(normalized_message.device_sn) && !isEmpty(normalized_message.station_sn)) {
                normalized_message.device_sn = normalized_message.station_sn;
            }
            normalized_message.title = message.payload.title;
            normalized_message.content = message.payload.content;
            try {
                normalized_message.push_time = message.payload.push_time !== undefined ? convertTimestampMs(Number.parseInt(message.payload.push_time)) : Number.parseInt(message.payload.push_time);
            } catch (err) {
                const error = ensureError(err);
                this.log.error(`Normalize push message - Type ${DeviceType[normalized_message.type]} CusPush - push_time - Error`, { error: getError(error), message: message });
            }

            const excludeDevices = !Device.isBatteryDoorbell(normalized_message.type) && !Device.isWiredDoorbellDual(normalized_message.type) && !Device.isSensor(normalized_message.type) && !Device.isGarageCamera(normalized_message.type);
            if ((normalized_message.station_sn.startsWith("T8030") && excludeDevices) || normalized_message.type === DeviceType.HB3) {
                const push_data = message.payload.payload as PlatformPushMode;
                normalized_message.name = push_data.name ? push_data.name : "";
                normalized_message.channel = push_data.channel !== undefined ? push_data.channel : 0;
                normalized_message.cipher = push_data.cipher !== undefined ? push_data.cipher : 0;
                normalized_message.event_session = push_data.session_id !== undefined ? push_data.session_id : "";
                normalized_message.event_type = push_data.a !== undefined ? push_data.a : push_data.event_type;
                normalized_message.file_path = push_data.file_path !== undefined ? push_data.file_path : "";
                normalized_message.pic_url = push_data.pic_url !== undefined ? push_data.pic_url : "";
                normalized_message.push_count = push_data.push_count !== undefined ? push_data.push_count : 1;
                normalized_message.notification_style = push_data.notification_style;
                normalized_message.storage_type = push_data.storage_type !== undefined ? push_data.storage_type : 1;
                normalized_message.msg_type = push_data.msg_type;
                normalized_message.person_name = push_data.nick_name;
                normalized_message.person_id = push_data.person_id;
                normalized_message.tfcard_status = push_data.tfcard_status;
                normalized_message.user_type = push_data.user;
                normalized_message.user_name = push_data.user_name;
                normalized_message.station_guard_mode = push_data.arming;
                normalized_message.station_current_mode = push_data.mode;
                normalized_message.alarm_delay = push_data.alarm_delay;
                normalized_message.sound_alarm = push_data.alarm !== undefined ? push_data.alarm === 1 ? true : false : undefined;
            } else {
                if (Device.isBatteryDoorbell(normalized_message.type) || Device.isWiredDoorbellDual(normalized_message.type)) {
                    const push_data = message.payload.payload as BatteryDoorbellPushData;
                    normalized_message.name = push_data.name ? push_data.name : "";

                    //Get family face names from Doorbell Dual "Family Recognition" event
                    if (push_data.objects !== undefined) {
                        normalized_message.person_name = push_data.objects.names !== undefined ? push_data.objects.names.join(",") : "";
                    }

                    normalized_message.channel = push_data.channel !== undefined ? push_data.channel : 0;
                    normalized_message.cipher = push_data.cipher !== undefined ? push_data.cipher : 0;
                    normalized_message.event_session = push_data.session_id !== undefined ? push_data.session_id : "";
                    normalized_message.event_type = push_data.event_type;
                    normalized_message.file_path = push_data.file_path !== undefined && push_data.file_path !== "" && push_data.channel !== undefined ? getAbsoluteFilePath(normalized_message.type, push_data.channel, push_data.file_path) : "";
                    normalized_message.pic_url = push_data.pic_url !== undefined ? push_data.pic_url : "";
                    normalized_message.push_count = push_data.push_count !== undefined ? push_data.push_count : 1;
                    normalized_message.notification_style = push_data.notification_style;
                } else if (Device.isIndoorCamera(normalized_message.type) ||
                    Device.isSoloCameras(normalized_message.type) ||
                    Device.isWallLightCam(normalized_message.type) ||
                    Device.isFloodLightT8420X(normalized_message.type, normalized_message.device_sn) ||
                    (Device.isFloodLight(normalized_message.type) && normalized_message.type !== DeviceType.FLOODLIGHT)
                ) {
                    const push_data = message.payload.payload as IndoorPushData;
                    normalized_message.name = push_data.name ? push_data.name : "";
                    normalized_message.channel = push_data.channel;
                    normalized_message.cipher = push_data.cipher;
                    normalized_message.event_session = push_data.session_id;
                    normalized_message.event_type = push_data.event_type;
                    //normalized_message.file_path = push_data.file_path !== undefined && push_data.file_path !== "" && push_data.channel !== undefined ? getAbsoluteFilePath(normalized_message.type, push_data.channel, push_data.file_path) : "";
                    normalized_message.file_path = push_data.file_path;
                    normalized_message.pic_url = push_data.pic_url !== undefined ? push_data.pic_url : "";
                    normalized_message.push_count = push_data.push_count !== undefined ? push_data.push_count : 1;
                    normalized_message.notification_style = push_data.notification_style;
                    normalized_message.msg_type = push_data.msg_type;
                    normalized_message.timeout = push_data.timeout;
                    normalized_message.tfcard_status = push_data.tfcard_status;
                    normalized_message.storage_type = push_data.storage_type !== undefined ? push_data.storage_type : 1;
                    normalized_message.unique_id = push_data.unique_id;
                } else if (Device.isSmartSafe(normalized_message.type)) {
                    const push_data = message.payload.payload as SmartSafeData;
                    normalized_message.event_type = push_data.event_type;
                    normalized_message.event_value = push_data.event_value;
                    /*
                    event_value: {
                        type: 3,    3/4
                        action: 1,
                        figure_id: 0,
                        user_id: 0
                    }
                    */
                    normalized_message.name = push_data.dev_name !== undefined ? push_data.dev_name : "";
                    /*normalized_message.short_user_id = push_data.short_user_id !== undefined ? push_data.short_user_id : "";
                    normalized_message.user_id = push_data.user_id !== undefined ? push_data.user_id : "";*/
                } else if (Device.isLock(normalized_message.type)) {
                    const push_data = message.payload.payload as LockPushData;
                    normalized_message.event_type = push_data.event_type;
                    normalized_message.short_user_id = push_data.short_user_id !== undefined ? push_data.short_user_id : "";
                    normalized_message.user_id = push_data.user_id !== undefined ? push_data.user_id : "";
                    normalized_message.name = push_data.device_name !== undefined ? push_data.device_name : "";
                } else if (Device.isGarageCamera(normalized_message.type)) {
                    const push_data = message.payload.payload as GarageDoorPushData;
                    normalized_message.event_type = push_data.event_type;
                    normalized_message.user_name = push_data.user_name !== undefined ? push_data.user_name : "";
                    normalized_message.door_id = push_data.door_id !== undefined ? push_data.door_id : -1;
                    normalized_message.name = push_data.door_name !== undefined ? push_data.door_name : "";
                    normalized_message.pic_url = push_data.pic_url !== undefined ? push_data.pic_url : "";
                    normalized_message.file_path = push_data.file_path !== undefined ? push_data.file_path : "";
                    normalized_message.storage_type = push_data.storage_type !== undefined ? push_data.storage_type : 1;
                    normalized_message.power = push_data.power !== undefined ? push_data.power : undefined;
                } else {
                    const push_data = message.payload.payload as CusPushData;
                    normalized_message.name = push_data.device_name && push_data.device_name !== null && push_data.device_name !== "" ? push_data.device_name : push_data.n ? push_data.n : "";
                    normalized_message.channel = push_data.c;
                    normalized_message.cipher = push_data.k;
                    normalized_message.event_session = push_data.session_id;
                    normalized_message.event_type = push_data.a;
                    normalized_message.file_path = push_data.c !== undefined && push_data.p !== undefined && push_data.p !== "" ? getAbsoluteFilePath(normalized_message.type, push_data.c, push_data.p) : "";
                    normalized_message.pic_url = push_data.pic_url !== undefined ? push_data.pic_url : "";
                    normalized_message.push_count = push_data.push_count !== undefined ? push_data.push_count : 1;
                    normalized_message.notification_style = push_data.notification_style;
                    normalized_message.tfcard_status = push_data.tfcard;
                    normalized_message.alarm_delay_type = push_data.alarm_type;
                    normalized_message.alarm_delay = push_data.alarm_delay;
                    normalized_message.alarm_type = push_data.type;
                    normalized_message.sound_alarm = push_data.alarm !== undefined ? push_data.alarm === 1 ? true : false : undefined;
                    normalized_message.user_name = push_data.user_name;
                    normalized_message.user_type = push_data.user;
                    normalized_message.user_id = push_data.user_id;
                    normalized_message.short_user_id = push_data.short_user_id;
                    normalized_message.station_guard_mode = push_data.arming;
                    normalized_message.station_current_mode = push_data.mode;
                    normalized_message.person_name = push_data.f;
                    normalized_message.sensor_open = push_data.e !== undefined ? Number.parseInt(push_data.e) === 1 ? true : false : undefined;
                    normalized_message.device_online = push_data.m !== undefined ? push_data.m === 1 ? true : false : undefined;
                    try {
                        normalized_message.fetch_id = push_data.i !== undefined ? Number.parseInt(push_data.i) : undefined;
                    } catch (err) {
                        const error = ensureError(err);
                        this.log.error(`Normalize push message - Type ${DeviceType[normalized_message.type]} CusPushData - fetch_id - Error`, { error: getError(error), message: message });
                    }
                    normalized_message.sense_id = push_data.j;
                    normalized_message.battery_powered = push_data.batt_powered !== undefined ? push_data.batt_powered === 1 ? true : false : undefined;
                    try {
                        normalized_message.battery_low = push_data.bat_low !== undefined ? Number.parseInt(push_data.bat_low) : undefined;
                    } catch (err) {
                        const error = ensureError(err);
                        this.log.error(`Normalize push message - Type ${DeviceType[normalized_message.type]} CusPushData - battery_low - Error`, { error: getError(error), message: message });
                    }
                    normalized_message.storage_type = push_data.storage_type !== undefined ? push_data.storage_type : 1;
                    normalized_message.unique_id = push_data.unique_id;
                    normalized_message.automation_id = push_data.automation_id;
                    normalized_message.click_action = push_data.click_action;
                    normalized_message.news_id = push_data.news_id;

                    if (Device.isStarlight4GLTE(normalized_message.type)) {
                        if (push_data.channel && push_data.channel !== null && push_data.channel !== undefined) {
                            normalized_message.channel = push_data.channel
                        }
                        if (push_data.cipher && push_data.cipher !== null && push_data.cipher !== undefined) {
                            normalized_message.cipher = push_data.cipher
                        }
                        if (push_data.event_type && push_data.event_type !== null && push_data.event_type !== undefined) {
                            normalized_message.event_type = push_data.event_type
                        }
                        if (push_data.file_path && push_data.file_path !== null && push_data.file_path !== undefined) {
                            normalized_message.file_path = push_data.file_path
                        }
                        normalized_message.msg_type = push_data.msg_type;
                    }
                }
            }
        } else if (message.payload.doorbell !== undefined) {
            const push_data = parseJSON(message.payload.doorbell, this.log) as DoorbellPushData;
            if (push_data !== undefined) {
                normalized_message.name = "Doorbell";
                normalized_message.type = 5;
                normalized_message.event_time = push_data.create_time !== undefined ? convertTimestampMs(push_data.create_time) : push_data.create_time;
                normalized_message.station_sn = push_data.device_sn;
                normalized_message.device_sn = push_data.device_sn;
                normalized_message.title = push_data.title;
                normalized_message.content = push_data.content;
                normalized_message.push_time = push_data.event_time !== undefined ? convertTimestampMs(push_data.event_time) : push_data.event_time;
                normalized_message.channel = push_data.channel;
                normalized_message.cipher = push_data.cipher;
                normalized_message.event_session = push_data.event_session;
                normalized_message.event_type = push_data.event_type;
                normalized_message.file_path = push_data.file_path;
                normalized_message.pic_url = push_data.pic_url;
                normalized_message.push_count = push_data.push_count !== undefined ? push_data.push_count : 1;
                normalized_message.doorbell_url = push_data.url;
                normalized_message.doorbell_url_ex = push_data.url_ex;
                normalized_message.doorbell_video_url = push_data.video_url;
            }
        }
        return normalized_message;
    }

    private onMessage(message: RawPushMessage): void {
        this.log.debug("Raw push message received", { message: message });
        this.emit("raw message", message);

        const normalized_message = this._normalizePushMessage(message);
        this.log.debug("Normalized push message received", { message: normalized_message });
        this.emit("message", normalized_message);
    }

    private getCurrentPushRetryDelay(): number {
        const delay = this.retryDelay == 0 ? 5000 : this.retryDelay;

        if (this.retryDelay < 60000)
            this.retryDelay += 10000;

        if (this.retryDelay >= 60000 && this.retryDelay < 600000)
            this.retryDelay += 60000;

        return delay;
    }

    public setCredentials(credentials: Credentials): void {
        this.credentials = credentials;
    }

    public getCredentials(): Credentials | undefined {
        return this.credentials;
    }

    public setPersistentIds(persistentIds: string[]): void {
        this.persistentIds = persistentIds;
    }

    public getPersistentIds(): string[] {
        return this.persistentIds;
    }

    private async _open(renew = false): Promise<void> {
        if (!this.credentials || Object.keys(this.credentials).length === 0 || (this.credentials && this.credentials.fidResponse && new Date().getTime() >= this.credentials.fidResponse.authToken.expiresAt)) {
            this.log.debug(`Create new push credentials...`, { credentials: this.credentials, renew: renew });
            this.credentials = await this.createPushCredentials().catch(err => {
                const error = ensureError(err);
                this.log.error("Create push credentials Error", { error: getError(error), credentials: this.credentials, renew: renew });
                return undefined;
            });
        } else if (this.credentials && renew) {
            this.log.debug(`Renew push credentials...`, { credentials: this.credentials, renew: renew });
            this.credentials = await this.renewPushCredentials(this.credentials).catch(err => {
                const error = ensureError(err);
                this.log.error("Push credentials renew Error", { error: getError(error), credentials: this.credentials, renew: renew });
                return undefined;
            });
        } else {
            this.log.debug(`Login with previous push credentials...`, { credentials: this.credentials });
            this.credentials = await this.loginPushCredentials(this.credentials).catch(err => {
                const error = ensureError(err);
                this.log.error("Push credentials login Error", { error: getError(error), credentials: this.credentials, renew: renew });
                return undefined;
            });
        }

        if (this.credentials) {
            this.emit("credential", this.credentials);

            this.clearCredentialsTimeout();

            this.credentialsTimeout = setTimeout(async () => {
                this.log.info("Push notification token is expiring, renew it.");
                await this._open(true);
            }, this.credentials.fidResponse.authToken.expiresAt - new Date().getTime() - 60000);

            if (this.pushClient) {
                this.pushClient.removeAllListeners();
            }

            this.pushClient = await PushClient.init({
                androidId: this.credentials.checkinResponse.androidId,
                securityToken: this.credentials.checkinResponse.securityToken,
            }, this.log);

            if (this.persistentIds)
                this.pushClient.setPersistentIds(this.persistentIds);

            const token = this.credentials.gcmResponse.token;
            this.pushClient.on("connect", () => {
                this.emit("connect", token);
                this.connected = true;
                this.connecting = false;
            });
            this.pushClient.on("close", () => {
                this.emit("close");
                this.connected = false;
                this.connecting = false;
            });
            this.pushClient.on("message", (msg: RawPushMessage) => this.onMessage(msg));
            this.pushClient.connect();
        } else {
            this.emit("close");
            this.connected = false;
            this.connecting = false;
            this.log.error("Push notifications are disabled, because the registration failed!", { credentials: this.credentials, renew: renew });
        }
    }

    public async open(): Promise<Credentials | undefined> {
        if (!this.connecting && !this.connected) {
            this.connecting = true;
            await this._open().catch((err) => {
                const error = ensureError(err);
                this.log.error(`Got exception trying to initialize push notifications`, { error: getError(error), credentials: this.credentials });
            });

            if (!this.credentials) {
                this.clearRetryTimeout();

                const delay = this.getCurrentPushRetryDelay();
                this.log.info(`Retry to register/login for push notification in ${delay / 1000} seconds...`);
                this.retryTimeout = setTimeout(async () => {
                    this.log.info(`Retry to register/login for push notification`);
                    await this.open();
                }, delay);
            } else {
                this.resetRetryTimeout();
                this.emit("credential", this.credentials);
            }
        }
        return this.credentials;
    }

    public close(): void {
        this.resetRetryTimeout();
        this.clearCredentialsTimeout();
        this.pushClient?.close();
    }

    private clearCredentialsTimeout(): void {
        if (this.credentialsTimeout) {
            clearTimeout(this.credentialsTimeout);
            this.credentialsTimeout = undefined;
        }
    }

    private clearRetryTimeout(): void {
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = undefined;
        }
    }

    private resetRetryTimeout(): void {
        this.clearRetryTimeout();
        this.retryDelay = 0;
    }

    public isConnected(): boolean {
        return this.connected;
    }

}