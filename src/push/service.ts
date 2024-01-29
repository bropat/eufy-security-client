import type { Got } from "got" with {
    "resolution-mode": "import"
};
import * as qs from "qs";
import { TypedEmitter } from "tiny-typed-emitter";

import { buildCheckinRequest, convertTimestampMs, generateFid, parseCheckinResponse, sleep } from "./utils";
import { CheckinResponse, Credentials, CusPushData, DoorbellPushData, FidInstallationResponse, FidTokenResponse, GcmRegisterResponse, IndoorPushData, RawPushMessage, PushMessage, BatteryDoorbellPushData, LockPushData, SmartSafePushData, PlatformPushMode, GarageDoorPushData, ServerPushData, AlarmPushData } from "./models";
import { PushClient } from "./client";
import { PushNotificationServiceEvents } from "./interfaces";
import { Device } from "../http/device";
import { DeviceType } from "../http/types";
import { getAbsoluteFilePath } from "../http/utils";
import { getError, getShortUrl, isEmpty, parseJSON } from "../utils";
import { ExecuteCheckInError, FidRegistrationFailedError, RegisterGcmError, RenewFidTokenFailedError, UnknownExpiryFormaError } from "./error";
import { ensureError } from "../error";
import { rootPushLogger } from "../logging";
import { ServerPushEvent } from ".";
import { Station } from "../http/station";

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

    private connected = false;
    private connecting = false;

    private got!: Got;

    private constructor() {
        super();
    }

    private async loadLibraries(): Promise<void> {
        const { default: got } = await import("got");
        this.got = got;
    }

    static async initialize(): Promise<PushNotificationService> {
        const service = new PushNotificationService();
        await service.loadLibraries();
        return service;
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
            const response = await this.got(url, {
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
                            const shortUrl = getShortUrl(typeof url === "string" ? new URL(url) : url === undefined ? new URL("") : url, typeof prefixUrl === "string" ? prefixUrl : prefixUrl.toString());
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
                rootPushLogger.error("Register FID - Status return code not 200", { status: response.statusCode, statusText: response.statusMessage, data: response.body });
                throw new FidRegistrationFailedError("FID registration failed", { context: { status: response.statusCode, statusText: response.statusMessage, data: response.body } });
            }
        } catch (err) {
            const error = ensureError(err);
            rootPushLogger.error("Register FID - Generic Error", { error: getError(error) });
            throw new FidRegistrationFailedError("FID registration failed", { cause: error, context: { fid: fid } });
        }
    }

    private async renewFidToken(fid: string, refreshToken: string): Promise<FidTokenResponse> {
        const url = `https://firebaseinstallations.googleapis.com/v1/projects/${this.FCM_PROJECT_ID}/installations/${fid}/authTokens:generate`;

        try {

            const response = await this.got(url, {
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
                            const shortUrl = getShortUrl(typeof url === "string" ? new URL(url) : url === undefined ? new URL("") : url, typeof prefixUrl === "string" ? prefixUrl : prefixUrl.toString());
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
                rootPushLogger.error("Renew FID Token - Status return code not 200", { status: response.statusCode, statusText: response.statusMessage, data: response.body });
                throw new RenewFidTokenFailedError("FID Token renewal failed", { context: { status: response.statusCode, statusText: response.statusMessage, data: response.body } });
            }
        } catch (err) {
            const error = ensureError(err);
            rootPushLogger.error("Renew FID Token - Generic Error", { error: getError(error) });
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
            const response = await this.got(url, {
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
                            const shortUrl = getShortUrl(typeof url === "string" ? new URL(url) : url === undefined ? new URL("") : url, typeof prefixUrl === "string" ? prefixUrl : prefixUrl.toString());
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
                rootPushLogger.error("Check in - Status return code not 200", { status: response.statusCode, statusText: response.statusMessage, data: response.body });
                throw new ExecuteCheckInError("Google checkin failed", { context: { status: response.statusCode, statusText: response.statusMessage, data: response.body } });
            }
        } catch (err) {
            const error = ensureError(err);
            rootPushLogger.error("Check in - Generic Error", { error: getError(error) });
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
                const response = await this.got(url, {
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
                                const shortUrl = getShortUrl(typeof url === "string" ? new URL(url) : url === undefined ? new URL("") : url, typeof prefixUrl === "string" ? prefixUrl : prefixUrl.toString());
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
                        rootPushLogger.debug("GCM register error, retry...", { retry: retry, retryCount: retry_count, response: response.body });
                        if (retry_count == retry)
                            throw new RegisterGcmError("Max GCM registration retries reached", { context: { message: result[1], retry: retry, retryCount: retry_count } });
                    } else {
                        return {
                            token: result[1]
                        };
                    }
                } else {
                    rootPushLogger.error("Register GCM - Status return code not 200", { status: response.statusCode, statusText: response.statusMessage, data: response.body });
                    throw new RegisterGcmError("Google register to GCM failed", { context: { status: response.statusCode, statusText: response.statusMessage, data: response.body } });
                }
                await sleep(10000 * retry_count);
            }
            throw new RegisterGcmError("Max GCM registration retries reached");
        } catch (err) {
            const error = ensureError(err);
            rootPushLogger.error("Register GCM - Generic Error", { error: getError(error) });
            throw new RegisterGcmError("Google register to GCM failed", { cause: error, context: { fidInstallationResponse: fidInstallationResponse, checkinResponse: checkinResponse } });
        }
    }

    private _normalizePushMessage(message: RawPushMessage): PushMessage {
        const normalizedMessage: PushMessage = {
            name: "",
            event_time: 0,
            type: -1,
            station_sn: "",
            device_sn: ""
        }
        if (message.payload.payload) {
            const payload = message.payload;
            // CusPush
            try {
                normalizedMessage.type = Number.parseInt(payload.type);
            } catch (err) {
                const error = ensureError(err);
                rootPushLogger.error(`Normalize push message - type - Error`, { error: getError(error), message: message });
            }

            if (normalizedMessage.type >= 10000) {
                // server push notification
                const serverPushData = payload.payload as ServerPushData;
                normalizedMessage.email = serverPushData.email
                normalizedMessage.person_name = serverPushData.nick_name
                normalizedMessage.verify_code = serverPushData.verify_code

                switch (normalizedMessage.type) {
                    case ServerPushEvent.ALARM_NOTIFY:
                    case ServerPushEvent.ALARM_GUEST_NOTIFY:
                        const alarmPushData = payload.payload as AlarmPushData;
                        normalizedMessage.device_sn = alarmPushData.device_sn;
                        normalizedMessage.station_sn = alarmPushData.station_sn;
                        normalizedMessage.alarm_status = alarmPushData.alarm_status;
                        normalizedMessage.alarm_action = alarmPushData.alarm_action_channel;
                        try {
                            normalizedMessage.alarm_type = Number.parseInt(alarmPushData.alarm_id);
                        } catch (err) {
                            const error = ensureError(err);
                            rootPushLogger.error(`Normalize push message - alarm_type - Error`, { error: getError(error), message: message });
                        }
                        try {
                            normalizedMessage.event_time = alarmPushData.alert_time !== undefined ? convertTimestampMs(alarmPushData.alert_time) : Number.parseInt(alarmPushData.alert_time);
                        } catch (err) {
                            const error = ensureError(err);
                            rootPushLogger.error(`Normalize push message - event_time - Error`, { error: getError(error), message: message });
                        }
                        break;
                }
            } else {
                try {
                    normalizedMessage.event_time = payload.event_time !== undefined ? convertTimestampMs(Number.parseInt(payload.event_time)) : Number.parseInt(payload.event_time);
                } catch (err) {
                    const error = ensureError(err);
                    rootPushLogger.error(`Normalize push message - Type ${DeviceType[normalizedMessage.type]} CusPush - event_time - Error`, { error: getError(error), message: message });
                }
                try {
                    normalizedMessage.push_time = payload.push_time !== undefined ? convertTimestampMs(Number.parseInt(payload.push_time)) : Number.parseInt(payload.push_time);
                } catch (err) {
                    const error = ensureError(err);
                    rootPushLogger.error(`Normalize push message - Type ${DeviceType[normalizedMessage.type]} CusPush - push_time - Error`, { error: getError(error), message: message });
                }
                normalizedMessage.station_sn = payload.station_sn;
                normalizedMessage.title = payload.title;
                normalizedMessage.content = payload.content;
                if (normalizedMessage.type === DeviceType.FLOODLIGHT)
                    normalizedMessage.device_sn = payload.station_sn;
                else
                    normalizedMessage.device_sn = payload.device_sn;
                if (isEmpty(normalizedMessage.device_sn) && !isEmpty(normalizedMessage.station_sn)) {
                    normalizedMessage.device_sn = normalizedMessage.station_sn;
                }

                if (Station.isStationHomeBase3(normalizedMessage.type) ||
                    (normalizedMessage.station_sn.startsWith("T8030") && (
                        Device.isCamera1Product(normalizedMessage.type) ||
                        Device.isCamera2Product(normalizedMessage.type) ||
                        Device.isCamera3(normalizedMessage.type) ||
                        Device.isCamera3C(normalizedMessage.type) ||
                        normalizedMessage.type === DeviceType.CAMERA_SNAIL ||
                        normalizedMessage.type === DeviceType.CAMERA_GUN)
                    )
                ) {
                    const platformPushData = payload.payload as PlatformPushMode;
                    normalizedMessage.name = platformPushData.name ? platformPushData.name : "";
                    normalizedMessage.channel = platformPushData.channel !== undefined ? platformPushData.channel : 0;
                    normalizedMessage.cipher = platformPushData.cipher !== undefined ? platformPushData.cipher : 0;
                    normalizedMessage.event_session = platformPushData.session_id !== undefined ? platformPushData.session_id : "";
                    normalizedMessage.event_type = platformPushData.a !== undefined ? platformPushData.a : platformPushData.event_type;
                    normalizedMessage.file_path = platformPushData.file_path !== undefined ? platformPushData.file_path : "";
                    normalizedMessage.pic_url = platformPushData.pic_url !== undefined ? platformPushData.pic_url : "";
                    normalizedMessage.push_count = platformPushData.push_count !== undefined ? platformPushData.push_count : 1;
                    normalizedMessage.notification_style = platformPushData.notification_style;
                    normalizedMessage.storage_type = platformPushData.storage_type !== undefined ? platformPushData.storage_type : 1;
                    normalizedMessage.msg_type = platformPushData.msg_type;
                    normalizedMessage.person_name = platformPushData.nick_name;
                    normalizedMessage.person_id = platformPushData.person_id;
                    normalizedMessage.tfcard_status = platformPushData.tfcard_status;
                    normalizedMessage.user_type = platformPushData.user;
                    normalizedMessage.user_name = platformPushData.user_name;
                    normalizedMessage.station_guard_mode = platformPushData.arming;
                    normalizedMessage.station_current_mode = platformPushData.mode;
                    normalizedMessage.alarm_delay = platformPushData.alarm_delay;
                    normalizedMessage.sound_alarm = platformPushData.alarm !== undefined ? platformPushData.alarm === 1 ? true : false : undefined;
                } else if (Device.isBatteryDoorbell(normalizedMessage.type) || Device.isWiredDoorbellDual(normalizedMessage.type)) {
                    const batteryDoorbellPushData = payload.payload as BatteryDoorbellPushData;
                    normalizedMessage.name = batteryDoorbellPushData.name ? batteryDoorbellPushData.name : "";

                    //Get family face names from Doorbell Dual "Family Recognition" event
                    if (batteryDoorbellPushData.objects !== undefined) {
                        normalizedMessage.person_name = batteryDoorbellPushData.objects.names !== undefined ? batteryDoorbellPushData.objects.names.join(",") : "";
                    }

                    normalizedMessage.channel = batteryDoorbellPushData.channel !== undefined ? batteryDoorbellPushData.channel : 0;
                    normalizedMessage.cipher = batteryDoorbellPushData.cipher !== undefined ? batteryDoorbellPushData.cipher : 0;
                    normalizedMessage.event_session = batteryDoorbellPushData.session_id !== undefined ? batteryDoorbellPushData.session_id : "";
                    normalizedMessage.event_type = batteryDoorbellPushData.event_type;
                    normalizedMessage.file_path = batteryDoorbellPushData.file_path !== undefined && batteryDoorbellPushData.file_path !== "" && batteryDoorbellPushData.channel !== undefined ? getAbsoluteFilePath(normalizedMessage.type, batteryDoorbellPushData.channel, batteryDoorbellPushData.file_path) : "";
                    normalizedMessage.pic_url = batteryDoorbellPushData.pic_url !== undefined ? batteryDoorbellPushData.pic_url : "";
                    normalizedMessage.push_count = batteryDoorbellPushData.push_count !== undefined ? batteryDoorbellPushData.push_count : 1;
                    normalizedMessage.notification_style = batteryDoorbellPushData.notification_style;
                } else if (Device.isIndoorCamera(normalizedMessage.type) ||
                    Device.isSoloCameras(normalizedMessage.type) ||
                    Device.isWallLightCam(normalizedMessage.type) ||
                    Device.isOutdoorPanAndTiltCamera(normalizedMessage.type) ||
                    Device.isFloodLightT8420X(normalizedMessage.type, normalizedMessage.device_sn) ||
                    (Device.isFloodLight(normalizedMessage.type) && normalizedMessage.type !== DeviceType.FLOODLIGHT)
                ) {
                    const indoorPushData = payload.payload as IndoorPushData;
                    normalizedMessage.name = indoorPushData.name ? indoorPushData.name : "";
                    normalizedMessage.channel = indoorPushData.channel;
                    normalizedMessage.cipher = indoorPushData.cipher;
                    normalizedMessage.event_session = indoorPushData.session_id;
                    normalizedMessage.event_type = indoorPushData.event_type;
                    //normalizedMessage.file_path = indoorPushData.file_path !== undefined && indoorPushData.file_path !== "" && indoorPushData.channel !== undefined ? getAbsoluteFilePath(normalizedMessage.type, indoorPushData.channel, indoorPushData.file_path) : "";
                    normalizedMessage.file_path = indoorPushData.file_path;
                    normalizedMessage.pic_url = indoorPushData.pic_url !== undefined ? indoorPushData.pic_url : "";
                    normalizedMessage.push_count = indoorPushData.push_count !== undefined ? indoorPushData.push_count : 1;
                    normalizedMessage.notification_style = indoorPushData.notification_style;
                    normalizedMessage.msg_type = indoorPushData.msg_type;
                    normalizedMessage.timeout = indoorPushData.timeout;
                    normalizedMessage.tfcard_status = indoorPushData.tfcard_status;
                    normalizedMessage.storage_type = indoorPushData.storage_type !== undefined ? indoorPushData.storage_type : 1;
                    normalizedMessage.unique_id = indoorPushData.unique_id;
                } else if (Device.isSmartSafe(normalizedMessage.type)) {
                    const smartSafePushData = payload.payload as SmartSafePushData;
                    normalizedMessage.event_type = smartSafePushData.event_type;
                    normalizedMessage.event_value = smartSafePushData.event_value;
                    /*
                    event_value: {
                        type: 3,    3/4
                        action: 1,
                        figure_id: 0,
                        user_id: 0
                    }
                    */
                    normalizedMessage.name = smartSafePushData.dev_name !== undefined ? smartSafePushData.dev_name : "";
                    /*normalizedMessage.short_user_id = smartSafePushData.short_user_id !== undefined ? smartSafePushData.short_user_id : "";
                    normalizedMessage.user_id = smartSafePushData.user_id !== undefined ? smartSafePushData.user_id : "";*/
                } else if (Device.isLock(normalizedMessage.type) && !Device.isLockWifiVideo(normalizedMessage.type)) {
                    const lockPushData = payload.payload as LockPushData;
                    normalizedMessage.event_type = lockPushData.event_type;
                    normalizedMessage.short_user_id = lockPushData.short_user_id !== undefined ? lockPushData.short_user_id : "";
                    normalizedMessage.user_id = lockPushData.user_id !== undefined ? lockPushData.user_id : "";
                    normalizedMessage.name = lockPushData.device_name !== undefined ? lockPushData.device_name : "";
                    normalizedMessage.person_name = lockPushData.nick_name !== undefined ? lockPushData.nick_name : "";
                } else if (Device.isGarageCamera(normalizedMessage.type)) {
                    const garageDoorPushData = payload.payload as GarageDoorPushData;
                    normalizedMessage.event_type = garageDoorPushData.event_type;
                    normalizedMessage.user_name = garageDoorPushData.user_name !== undefined ? garageDoorPushData.user_name : "";
                    normalizedMessage.door_id = garageDoorPushData.door_id !== undefined ? garageDoorPushData.door_id : -1;
                    normalizedMessage.name = garageDoorPushData.door_name !== undefined ? garageDoorPushData.door_name : "";
                    normalizedMessage.pic_url = garageDoorPushData.pic_url !== undefined ? garageDoorPushData.pic_url : "";
                    normalizedMessage.file_path = garageDoorPushData.file_path !== undefined ? garageDoorPushData.file_path : "";
                    normalizedMessage.storage_type = garageDoorPushData.storage_type !== undefined ? garageDoorPushData.storage_type : 1;
                    normalizedMessage.power = garageDoorPushData.power !== undefined ? garageDoorPushData.power : undefined;
                } else {
                    const cusPushData = payload.payload as CusPushData;
                    normalizedMessage.name = cusPushData.device_name && cusPushData.device_name !== null && cusPushData.device_name !== "" ? cusPushData.device_name : cusPushData.n ? cusPushData.n : cusPushData.name ? cusPushData.name : "";
                    normalizedMessage.channel = cusPushData.c ? cusPushData.c : cusPushData.channel;
                    normalizedMessage.cipher = cusPushData.k ? cusPushData.k : cusPushData.cipher;
                    normalizedMessage.event_session = cusPushData.session_id;
                    normalizedMessage.event_type = cusPushData.a ? cusPushData.a : cusPushData.event_type;
                    normalizedMessage.file_path = cusPushData.c !== undefined && cusPushData.p !== undefined && cusPushData.p !== "" ? getAbsoluteFilePath(normalizedMessage.type, cusPushData.c, cusPushData.p) : cusPushData.file_path ? cusPushData.file_path : "";
                    normalizedMessage.pic_url = cusPushData.pic_url !== undefined ? cusPushData.pic_url : "";
                    normalizedMessage.push_count = cusPushData.push_count !== undefined ? cusPushData.push_count : 1;
                    normalizedMessage.notification_style = cusPushData.notification_style;
                    normalizedMessage.tfcard_status = cusPushData.tfcard;
                    normalizedMessage.alarm_delay_type = cusPushData.alarm_type;
                    normalizedMessage.alarm_delay = cusPushData.alarm_delay;
                    normalizedMessage.alarm_type = cusPushData.type;
                    normalizedMessage.sound_alarm = cusPushData.alarm !== undefined ? cusPushData.alarm === 1 ? true : false : undefined;
                    normalizedMessage.user_name = cusPushData.user_name;
                    normalizedMessage.user_type = cusPushData.user;
                    normalizedMessage.user_id = cusPushData.user_id;
                    normalizedMessage.short_user_id = cusPushData.short_user_id;
                    normalizedMessage.station_guard_mode = cusPushData.arming;
                    normalizedMessage.station_current_mode = cusPushData.mode;
                    normalizedMessage.person_name = cusPushData.f && cusPushData.f !== "" ? cusPushData.f : cusPushData.nick_name && cusPushData.nick_name ? cusPushData.nick_name : "";
                    normalizedMessage.sensor_open = cusPushData.e !== undefined ? cusPushData.e == "1" ? true : false : undefined;
                    normalizedMessage.device_online = cusPushData.m !== undefined ? cusPushData.m === 1 ? true : false : undefined;
                    try {
                        normalizedMessage.fetch_id = cusPushData.i !== undefined ? Number.parseInt(cusPushData.i) : undefined;
                    } catch (err) {
                        const error = ensureError(err);
                        rootPushLogger.error(`Normalize push message - Type ${DeviceType[normalizedMessage.type]} CusPushData - fetch_id - Error`, { error: getError(error), message: message });
                    }
                    normalizedMessage.sense_id = cusPushData.j;
                    normalizedMessage.battery_powered = cusPushData.batt_powered !== undefined ? cusPushData.batt_powered === 1 ? true : false : undefined;
                    try {
                        normalizedMessage.battery_low = cusPushData.bat_low !== undefined ? Number.parseInt(cusPushData.bat_low) : undefined;
                    } catch (err) {
                        const error = ensureError(err);
                        rootPushLogger.error(`Normalize push message - Type ${DeviceType[normalizedMessage.type]} CusPushData - battery_low - Error`, { error: getError(error), message: message });
                    }
                    normalizedMessage.storage_type = cusPushData.storage_type !== undefined ? cusPushData.storage_type : 1;
                    normalizedMessage.unique_id = cusPushData.unique_id;
                    normalizedMessage.automation_id = cusPushData.automation_id;
                    normalizedMessage.click_action = cusPushData.click_action;
                    normalizedMessage.news_id = cusPushData.news_id;
                    normalizedMessage.msg_type = cusPushData.msg_type;

                    if (Device.isStarlight4GLTE(normalizedMessage.type)) {
                        if (cusPushData.channel && cusPushData.channel !== null && cusPushData.channel !== undefined) {
                            normalizedMessage.channel = cusPushData.channel
                        }
                        if (cusPushData.cipher && cusPushData.cipher !== null && cusPushData.cipher !== undefined) {
                            normalizedMessage.cipher = cusPushData.cipher
                        }
                        if (cusPushData.event_type && cusPushData.event_type !== null && cusPushData.event_type !== undefined) {
                            normalizedMessage.event_type = cusPushData.event_type
                        }
                        if (cusPushData.file_path && cusPushData.file_path !== null && cusPushData.file_path !== undefined) {
                            normalizedMessage.file_path = cusPushData.file_path
                        }
                    }
                }
            }
        } else if (message.payload.doorbell !== undefined) {
            const doorbellPushData = parseJSON(message.payload.doorbell, rootPushLogger) as DoorbellPushData;
            if (doorbellPushData !== undefined) {
                normalizedMessage.name = "Doorbell";
                normalizedMessage.type = 5;
                normalizedMessage.event_time = doorbellPushData.create_time !== undefined ? convertTimestampMs(doorbellPushData.create_time) : doorbellPushData.create_time;
                normalizedMessage.station_sn = doorbellPushData.device_sn;
                normalizedMessage.device_sn = doorbellPushData.device_sn;
                normalizedMessage.title = doorbellPushData.title;
                normalizedMessage.content = doorbellPushData.content;
                normalizedMessage.push_time = doorbellPushData.event_time !== undefined ? convertTimestampMs(doorbellPushData.event_time) : doorbellPushData.event_time;
                normalizedMessage.channel = doorbellPushData.channel;
                normalizedMessage.cipher = doorbellPushData.cipher;
                normalizedMessage.event_session = doorbellPushData.event_session;
                normalizedMessage.event_type = doorbellPushData.event_type;
                normalizedMessage.file_path = doorbellPushData.file_path;
                normalizedMessage.pic_url = doorbellPushData.pic_url;
                normalizedMessage.push_count = doorbellPushData.push_count !== undefined ? doorbellPushData.push_count : 1;
                normalizedMessage.doorbell_url = doorbellPushData.url;
                normalizedMessage.doorbell_url_ex = doorbellPushData.url_ex;
                normalizedMessage.doorbell_video_url = doorbellPushData.video_url;
            }
        }
        return normalizedMessage;
    }

    private onMessage(message: RawPushMessage): void {
        rootPushLogger.debug("Raw push message received", { message: message });
        this.emit("raw message", message);

        const normalizedMessage = this._normalizePushMessage(message);
        rootPushLogger.debug("Normalized push message received", { message: normalizedMessage });
        this.emit("message", normalizedMessage);
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
            rootPushLogger.debug(`Create new push credentials...`, { credentials: this.credentials, renew: renew });
            this.credentials = await this.createPushCredentials().catch(err => {
                const error = ensureError(err);
                rootPushLogger.error("Create push credentials Error", { error: getError(error), credentials: this.credentials, renew: renew });
                return undefined;
            });
        } else if (this.credentials && renew) {
            rootPushLogger.debug(`Renew push credentials...`, { credentials: this.credentials, renew: renew });
            this.credentials = await this.renewPushCredentials(this.credentials).catch(err => {
                const error = ensureError(err);
                rootPushLogger.error("Push credentials renew Error", { error: getError(error), credentials: this.credentials, renew: renew });
                return undefined;
            });
        } else {
            rootPushLogger.debug(`Login with previous push credentials...`, { credentials: this.credentials });
            this.credentials = await this.loginPushCredentials(this.credentials).catch(err => {
                const error = ensureError(err);
                rootPushLogger.error("Push credentials login Error", { error: getError(error), credentials: this.credentials, renew: renew });
                return undefined;
            });
        }

        if (this.credentials) {
            this.emit("credential", this.credentials);

            this.clearCredentialsTimeout();

            this.credentialsTimeout = setTimeout(async () => {
                rootPushLogger.info("Push notification token is expiring, renew it.");
                await this._open(true);
            }, this.credentials.fidResponse.authToken.expiresAt - new Date().getTime() - 60000);

            if (this.pushClient) {
                this.pushClient.removeAllListeners();
            }

            this.pushClient = await PushClient.init({
                androidId: this.credentials.checkinResponse.androidId,
                securityToken: this.credentials.checkinResponse.securityToken,
            });

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
            rootPushLogger.error("Push notifications are disabled, because the registration failed!", { credentials: this.credentials, renew: renew });
        }
    }

    public async open(): Promise<Credentials | undefined> {
        if (!this.connecting && !this.connected) {
            this.connecting = true;
            await this._open().catch((err) => {
                const error = ensureError(err);
                rootPushLogger.error(`Got exception trying to initialize push notifications`, { error: getError(error), credentials: this.credentials });
            });

            if (!this.credentials) {
                this.clearRetryTimeout();

                const delay = this.getCurrentPushRetryDelay();
                rootPushLogger.info(`Retry to register/login for push notification in ${delay / 1000} seconds...`);
                this.retryTimeout = setTimeout(async () => {
                    rootPushLogger.info(`Retry to register/login for push notification`);
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