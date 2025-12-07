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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushClient = void 0;
const long_1 = __importDefault(require("long"));
const path = __importStar(require("path"));
const protobufjs_1 = require("protobufjs");
const tls = __importStar(require("tls"));
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const models_1 = require("./models");
const parser_1 = require("./parser");
const utils_1 = require("../utils");
const error_1 = require("./error");
const error_2 = require("../error");
const utils_2 = require("../p2p/utils");
const logging_1 = require("../logging");
class PushClient extends tiny_typed_emitter_1.TypedEmitter {
    HOST = "mtalk.google.com";
    PORT = 5228;
    MCS_VERSION = 41;
    HEARTBEAT_INTERVAL = 5 * 60 * 1000;
    loggedIn = false;
    streamId = 0;
    lastStreamIdReported = -1;
    currentDelay = 0;
    client;
    heartbeatTimeout;
    reconnectTimeout;
    persistentIds = [];
    static proto = null;
    pushClientParser;
    auth;
    constructor(pushClientParser, auth) {
        super();
        this.pushClientParser = pushClientParser;
        this.auth = auth;
    }
    static async init(auth) {
        this.proto = await (0, protobufjs_1.load)(path.join(__dirname, "./proto/mcs.proto"));
        const pushClientParser = await parser_1.PushClientParser.init();
        return new PushClient(pushClientParser, auth);
    }
    initialize() {
        this.loggedIn = false;
        this.streamId = 0;
        this.lastStreamIdReported = -1;
        if (this.client) {
            this.client.removeAllListeners();
            this.client.destroy();
            this.client = undefined;
        }
        this.pushClientParser.resetState();
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
    }
    getPersistentIds() {
        return this.persistentIds;
    }
    setPersistentIds(ids) {
        this.persistentIds = ids;
    }
    connect() {
        this.initialize();
        this.pushClientParser.on("message", (message) => this.handleParsedMessage(message));
        this.client = tls.connect(this.PORT, this.HOST, {
            rejectUnauthorized: false,
        });
        this.client.setKeepAlive(true);
        // For debugging purposes
        //this.client.enableTrace();
        this.client.on("connect", () => this.onSocketConnect());
        this.client.on("close", () => this.onSocketClose());
        this.client.on("error", (error) => this.onSocketError(error));
        this.client.on("data", (newData) => this.onSocketData(newData));
        this.client.write(this.buildLoginRequest());
    }
    buildLoginRequest() {
        const androidId = this.auth.androidId;
        const securityToken = this.auth.securityToken;
        const LoginRequestType = PushClient.proto.lookupType("mcs_proto.LoginRequest");
        const hexAndroidId = long_1.default.fromString(androidId).toString(16);
        const loginRequest = {
            adaptiveHeartbeat: false,
            authService: 2,
            authToken: securityToken,
            id: "chrome-63.0.3234.0",
            domain: "mcs.android.com",
            deviceId: `android-${hexAndroidId}`,
            networkType: 1,
            resource: androidId,
            user: androidId,
            useRmq2: true,
            setting: [{ name: "new_vc", value: "1" }],
            clientEvent: [],
            receivedPersistentId: this.persistentIds,
        };
        const errorMessage = LoginRequestType.verify(loginRequest);
        if (errorMessage) {
            throw new error_1.BuildLoginRequestError(errorMessage, { context: { loginRequest: loginRequest } });
        }
        const buffer = LoginRequestType.encodeDelimited(loginRequest).finish();
        return Buffer.concat([Buffer.from([this.MCS_VERSION, models_1.MessageTag.LoginRequest]), buffer]);
    }
    buildHeartbeatPingRequest(stream_id) {
        const heartbeatPingRequest = {};
        if (stream_id) {
            heartbeatPingRequest.last_stream_id_received = stream_id;
        }
        logging_1.rootPushLogger.debug(`Push client - heartbeatPingRequest`, { streamId: stream_id, request: JSON.stringify(heartbeatPingRequest) });
        const HeartbeatPingRequestType = PushClient.proto.lookupType("mcs_proto.HeartbeatPing");
        const errorMessage = HeartbeatPingRequestType.verify(heartbeatPingRequest);
        if (errorMessage) {
            throw new error_1.BuildHeartbeatPingRequestError(errorMessage, { context: { heartbeatPingRequest: heartbeatPingRequest } });
        }
        const buffer = HeartbeatPingRequestType.encodeDelimited(heartbeatPingRequest).finish();
        return Buffer.concat([Buffer.from([models_1.MessageTag.HeartbeatPing]), buffer]);
    }
    buildHeartbeatAckRequest(stream_id, status) {
        const heartbeatAckRequest = {};
        if (stream_id && !status) {
            heartbeatAckRequest.last_stream_id_received = stream_id;
        }
        else if (!stream_id && status) {
            heartbeatAckRequest.status = status;
        }
        else {
            heartbeatAckRequest.last_stream_id_received = stream_id;
            heartbeatAckRequest.status = status;
        }
        logging_1.rootPushLogger.debug(`Push client - heartbeatAckRequest`, { streamId: stream_id, status: status, request: JSON.stringify(heartbeatAckRequest) });
        const HeartbeatAckRequestType = PushClient.proto.lookupType("mcs_proto.HeartbeatAck");
        const errorMessage = HeartbeatAckRequestType.verify(heartbeatAckRequest);
        if (errorMessage) {
            throw new error_1.BuildHeartbeatAckRequestError(errorMessage, { context: { heartbeatAckRequest: heartbeatAckRequest } });
        }
        const buffer = HeartbeatAckRequestType.encodeDelimited(heartbeatAckRequest).finish();
        return Buffer.concat([Buffer.from([models_1.MessageTag.HeartbeatAck]), buffer]);
    }
    onSocketData(newData) {
        this.pushClientParser.handleData(newData);
    }
    onSocketConnect() {
        //
    }
    onSocketClose() {
        this.loggedIn = false;
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = undefined;
        }
        this.emit("close");
        this.scheduleReconnect();
    }
    onSocketError(err) {
        const error = (0, error_2.ensureError)(err);
        logging_1.rootPushLogger.error(`Push client - Socket Error`, { error: (0, utils_1.getError)(error) });
    }
    handleParsedMessage(message) {
        this.resetCurrentDelay();
        switch (message.tag) {
            case models_1.MessageTag.DataMessageStanza:
                logging_1.rootPushLogger.debug(`Push client - DataMessageStanza`, { message: JSON.stringify(message) });
                if (message.object && message.object.persistentId)
                    this.persistentIds.push(message.object.persistentId);
                this.emit("message", this.convertPayloadMessage(message));
                break;
            case models_1.MessageTag.HeartbeatPing:
                this.handleHeartbeatPing(message);
                break;
            case models_1.MessageTag.HeartbeatAck:
                this.handleHeartbeatAck(message);
                break;
            case models_1.MessageTag.Close:
                logging_1.rootPushLogger.debug(`Push client - Close: Server requested close`, { message: JSON.stringify(message) });
                break;
            case models_1.MessageTag.LoginResponse:
                logging_1.rootPushLogger.debug("Push client - Login response: GCM -> logged in -> waiting for push messages...", { message: JSON.stringify(message) });
                this.loggedIn = true;
                this.persistentIds = [];
                this.emit("connect");
                this.heartbeatTimeout = setTimeout(() => {
                    this.scheduleHeartbeat(this);
                }, this.getHeartbeatInterval());
                break;
            case models_1.MessageTag.LoginRequest:
                logging_1.rootPushLogger.debug(`Push client - Login request`, { message: JSON.stringify(message) });
                break;
            case models_1.MessageTag.IqStanza:
                logging_1.rootPushLogger.debug(`Push client - IqStanza: Not implemented`, { message: JSON.stringify(message) });
                break;
            default:
                logging_1.rootPushLogger.debug(`Push client - Unknown message`, { message: JSON.stringify(message) });
                return;
        }
        this.streamId++;
    }
    handleHeartbeatPing(message) {
        logging_1.rootPushLogger.debug(`Push client - Heartbeat ping`, { message: JSON.stringify(message) });
        let streamId = undefined;
        let status = undefined;
        if (this.newStreamIdAvailable()) {
            streamId = this.getStreamId();
        }
        if (message.object && message.object.status) {
            status = message.object.status;
        }
        if (this.client)
            this.client.write(this.buildHeartbeatAckRequest(streamId, status));
    }
    handleHeartbeatAck(message) {
        logging_1.rootPushLogger.debug(`Push client - Heartbeat acknowledge`, { message: JSON.stringify(message) });
    }
    convertPayloadMessage(message) {
        const { appData, ...otherData } = message.object;
        const messageData = {};
        appData.forEach((kv) => {
            if (kv.key === "payload") {
                const payload = (0, utils_1.parseJSON)((0, utils_2.getNullTerminatedString)(Buffer.from(kv.value, "base64"), "utf8"), logging_1.rootPushLogger);
                messageData[kv.key] = payload;
            }
            else {
                messageData[kv.key] = kv.value;
            }
        });
        return {
            ...otherData,
            payload: messageData,
        };
    }
    getStreamId() {
        this.lastStreamIdReported = this.streamId;
        return this.streamId;
    }
    newStreamIdAvailable() {
        return this.lastStreamIdReported != this.streamId;
    }
    scheduleHeartbeat(client) {
        if (client.sendHeartbeat()) {
            this.heartbeatTimeout = setTimeout(() => {
                this.scheduleHeartbeat(client);
            }, client.getHeartbeatInterval());
        }
        else {
            logging_1.rootPushLogger.debug("Push client - Heartbeat disabled!");
        }
    }
    sendHeartbeat() {
        let streamId = undefined;
        if (this.newStreamIdAvailable()) {
            streamId = this.getStreamId();
        }
        if (this.client && this.isConnected()) {
            logging_1.rootPushLogger.debug(`Push client - Sending heartbeat...`, { streamId: streamId });
            this.client.write(this.buildHeartbeatPingRequest(streamId));
            return true;
        }
        else {
            logging_1.rootPushLogger.debug("Push client - No more connected, reconnect...");
            this.scheduleReconnect();
        }
        return false;
    }
    isConnected() {
        return this.loggedIn;
    }
    getHeartbeatInterval() {
        return this.HEARTBEAT_INTERVAL;
    }
    getCurrentDelay() {
        const delay = this.currentDelay == 0 ? 5000 : this.currentDelay;
        if (this.currentDelay < 60000)
            this.currentDelay += 10000;
        if (this.currentDelay >= 60000 && this.currentDelay < 600000)
            this.currentDelay += 60000;
        return delay;
    }
    resetCurrentDelay() {
        this.currentDelay = 0;
    }
    scheduleReconnect() {
        const delay = this.getCurrentDelay();
        logging_1.rootPushLogger.debug("Push client - Schedule reconnect...", { delay: delay });
        if (!this.reconnectTimeout)
            this.reconnectTimeout = setTimeout(() => {
                this.connect();
            }, delay);
    }
    close() {
        const wasConnected = this.isConnected();
        this.initialize();
        if (wasConnected)
            this.emit("close");
    }
}
exports.PushClient = PushClient;
//# sourceMappingURL=client.js.map