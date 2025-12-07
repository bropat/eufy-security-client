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
exports.MQTTService = void 0;
const mqtt = __importStar(require("mqtt"));
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const fse = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const protobufjs_1 = require("protobufjs");
const utils_1 = require("../utils");
const logging_1 = require("../logging");
const error_1 = require("../error");
class MQTTService extends tiny_typed_emitter_1.TypedEmitter {
    CLIENT_ID_FORMAT = "android_EufySecurity_<user_id>_<android_id>";
    USERNAME_FORMAT = "eufy_<user_id>";
    SUBSCRIBE_NOTICE_FORMAT = "/phone/<user_id>/notice";
    SUBSCRIBE_LOCK_FORMAT = "/phone/smart_lock/<device_sn>/push_message";
    SUBSCRIBE_DOORBELL_FORMAT = "/phone/doorbell/<device_sn>/push_message";
    static proto = null;
    connected = false;
    client = null;
    connecting = false;
    clientID;
    androidID;
    apiBase;
    email;
    subscribeLocks = [];
    deviceSmartLockMessageModel;
    constructor() {
        super();
        this.deviceSmartLockMessageModel = MQTTService.proto.lookupType("DeviceSmartLockMessage");
    }
    static async init() {
        try {
            this.proto = await (0, protobufjs_1.load)(path.join(__dirname, "./proto/lock.proto"));
        }
        catch (error) {
            logging_1.rootMainLogger.error("Error loading MQTT proto lock file", { error: (0, error_1.ensureError)(error) });
        }
        return new MQTTService();
    }
    parseSmartLockMessage(data) {
        const message = this.deviceSmartLockMessageModel.decode(data);
        const object = this.deviceSmartLockMessageModel.toObject(message, {
            longs: String,
            enums: String,
            bytes: String,
        });
        return object;
    }
    getMQTTBrokerUrl(apiBase) {
        switch (apiBase) {
            case "https://security-app.eufylife.com":
                return "mqtts://security-mqtt.eufylife.com";
            case "https://security-app-ci.eufylife.com":
                return "mqtts://security-mqtt-ci.eufylife.com";
            case "https://security-app-qa.eufylife.com":
            case "https://security-app-cn-qa.anker-in.com":
                return "mqtts://security-mqtt-qa.eufylife.com";
            case "https://security-app-eu.eufylife.com":
                return "mqtts://security-mqtt-eu.eufylife.com";
            case "https://security-app-short-qa.eufylife.com":
                return "mqtts://security-mqtt-short-qa.eufylife.com";
            default:
                return "mqtts://security-mqtt.eufylife.com";
        }
    }
    connect(clientID, androidID, apiBase, email) {
        this.clientID = clientID;
        this.androidID = androidID;
        this.apiBase = apiBase;
        this.email = email;
        if (!this.connected && !this.connecting && this.clientID && this.androidID && this.apiBase && this.email && this.subscribeLocks.length > 0) {
            this.connecting = true;
            this.client = mqtt.connect(this.getMQTTBrokerUrl(apiBase), {
                keepalive: 60,
                clean: true,
                reschedulePings: true,
                resubscribe: true,
                port: 8789,
                username: this.USERNAME_FORMAT.replace("<user_id>", clientID),
                password: email,
                ca: fse.readFileSync(path.join(__dirname, "./mqtt-eufy.crt")),
                clientId: this.CLIENT_ID_FORMAT.replace("<user_id>", clientID).replace("<android_id>", androidID),
                rejectUnauthorized: false // Some eufy mqtt servers have an expired certificate :(
            });
            this.client.on("connect", (_connack) => {
                this.connected = true;
                this.connecting = false;
                this.emit("connect");
                this.client.subscribe(this.SUBSCRIBE_NOTICE_FORMAT.replace("<user_id>", clientID), { qos: 1 });
                if (this.subscribeLocks.length > 0) {
                    let lock;
                    while ((lock = this.subscribeLocks.shift()) !== undefined) {
                        this._subscribeLock(lock);
                    }
                }
            });
            this.client.on("close", () => {
                this.connected = false;
                this.emit("close");
            });
            this.client.on("error", (error) => {
                this.connecting = false;
                logging_1.rootMQTTLogger.error("MQTT Error", { error: (0, utils_1.getError)(error) });
                if (error.code === 1 || error.code === 2 || error.code === 4 || error.code === 5)
                    this.client?.end();
            });
            this.client.on("message", (topic, message, _packet) => {
                if (topic.includes("smart_lock")) {
                    const parsedMessage = this.parseSmartLockMessage(message);
                    logging_1.rootMQTTLogger.debug("Received a smart lock message over MQTT", { message: parsedMessage });
                    this.emit("lock message", parsedMessage);
                }
                else {
                    logging_1.rootMQTTLogger.debug("MQTT message received", { topic: topic, message: message.toString("hex") });
                }
            });
        }
    }
    _subscribeLock(deviceSN) {
        this.client?.subscribe(this.SUBSCRIBE_LOCK_FORMAT.replace("<device_sn>", deviceSN), { qos: 1 }, (error, granted) => {
            if (error) {
                logging_1.rootMQTTLogger.error(`Subscribe error for lock ${deviceSN}`, { error: (0, utils_1.getError)(error), deviceSN: deviceSN });
            }
            if (granted) {
                logging_1.rootMQTTLogger.info(`Successfully registered to MQTT notifications for lock ${deviceSN}`);
            }
        });
    }
    subscribeLock(deviceSN) {
        if (this.connected) {
            this._subscribeLock(deviceSN);
        }
        else {
            if (!this.subscribeLocks.includes(deviceSN)) {
                this.subscribeLocks.push(deviceSN);
            }
            if (this.clientID && this.androidID && this.apiBase && this.email)
                this.connect(this.clientID, this.androidID, this.apiBase, this.email);
        }
    }
    isConnected() {
        return this.connected;
    }
    close() {
        if (this.connected) {
            this.client?.end(true);
            this.connected = false;
            this.connecting = false;
        }
    }
}
exports.MQTTService = MQTTService;
//# sourceMappingURL=service.js.map