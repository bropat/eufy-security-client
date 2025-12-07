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
exports.PushClientParser = void 0;
const path = __importStar(require("path"));
const protobufjs_1 = require("protobufjs");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const models_1 = require("./models");
const error_1 = require("../error");
const error_2 = require("./error");
const logging_1 = require("../logging");
class PushClientParser extends tiny_typed_emitter_1.TypedEmitter {
    static proto = null;
    state = models_1.ProcessingState.MCS_VERSION_TAG_AND_SIZE;
    data = Buffer.alloc(0);
    isWaitingForData = true;
    sizePacketSoFar = 0;
    messageSize = 0;
    messageTag = 0;
    handshakeComplete = false;
    constructor() {
        super();
    }
    resetState() {
        this.state = models_1.ProcessingState.MCS_VERSION_TAG_AND_SIZE;
        this.data = Buffer.alloc(0);
        this.isWaitingForData = true;
        this.sizePacketSoFar = 0;
        this.messageSize = 0;
        this.messageTag = 0;
        this.handshakeComplete = false;
        this.removeAllListeners();
    }
    static async init() {
        this.proto = await (0, protobufjs_1.load)(path.join(__dirname, "./proto/mcs.proto"));
        return new PushClientParser();
    }
    handleData(newData) {
        this.data = Buffer.concat([this.data, newData]);
        if (this.isWaitingForData) {
            this.isWaitingForData = false;
            this.waitForData();
        }
    }
    waitForData() {
        const minBytesNeeded = this.getMinBytesNeeded();
        // If we don't have all bytes yet, wait some more
        if (this.data.length < minBytesNeeded) {
            this.isWaitingForData = true;
            return;
        }
        else {
            this.handleFullMessage();
        }
    }
    handleFullMessage() {
        switch (this.state) {
            case models_1.ProcessingState.MCS_VERSION_TAG_AND_SIZE:
                this.onGotVersion();
                break;
            case models_1.ProcessingState.MCS_TAG_AND_SIZE:
                this.onGotMessageTag();
                break;
            case models_1.ProcessingState.MCS_SIZE:
                this.onGotMessageSize();
                break;
            case models_1.ProcessingState.MCS_PROTO_BYTES:
                this.onGotMessageBytes();
                break;
            default:
                logging_1.rootPushLogger.warn("Push Parser - Unknown state", { state: this.state });
                break;
        }
    }
    onGotVersion() {
        const version = this.data.readInt8(0);
        this.data = this.data.subarray(1);
        if (version < 41 && version !== 38) {
            throw new error_2.MCSProtocolVersionError("Got wrong protocol version", { context: { version: version } });
        }
        // Process the LoginResponse message tag.
        this.onGotMessageTag();
    }
    onGotMessageTag() {
        this.messageTag = this.data.readInt8(0);
        this.data = this.data.subarray(1);
        this.onGotMessageSize();
    }
    onGotMessageSize() {
        let incompleteSizePacket = false;
        const reader = new protobufjs_1.BufferReader(this.data);
        try {
            this.messageSize = reader.int32();
        }
        catch (err) {
            const error = (0, error_1.ensureError)(err);
            if (error instanceof Error && error.message.startsWith("index out of range:")) {
                incompleteSizePacket = true;
            }
            else {
                throw error;
            }
        }
        if (incompleteSizePacket) {
            this.sizePacketSoFar = reader.pos;
            this.state = models_1.ProcessingState.MCS_SIZE;
            this.waitForData();
            return;
        }
        this.data = this.data.subarray(reader.pos);
        this.sizePacketSoFar = 0;
        if (this.messageSize > 0) {
            this.state = models_1.ProcessingState.MCS_PROTO_BYTES;
            this.waitForData();
        }
        else {
            this.onGotMessageBytes();
        }
    }
    onGotMessageBytes() {
        const protobuf = this.buildProtobufFromTag(this.messageTag);
        if (this.messageSize === 0) {
            this.emit("message", { tag: this.messageTag, object: {} });
            this.getNextMessage();
            return;
        }
        if (this.data.length < this.messageSize) {
            this.state = models_1.ProcessingState.MCS_PROTO_BYTES;
            this.waitForData();
            return;
        }
        const buffer = this.data.subarray(0, this.messageSize);
        this.data = this.data.subarray(this.messageSize);
        const message = protobuf.decode(buffer);
        const object = protobuf.toObject(message, {
            longs: String,
            enums: String,
            bytes: Buffer,
        });
        this.emit("message", { tag: this.messageTag, object: object });
        if (this.messageTag === models_1.MessageTag.LoginResponse) {
            if (this.handshakeComplete) {
                logging_1.rootPushLogger.error("Push Parser - Unexpected login response!");
            }
            else {
                this.handshakeComplete = true;
            }
        }
        this.getNextMessage();
    }
    getNextMessage() {
        this.messageTag = 0;
        this.messageSize = 0;
        this.state = models_1.ProcessingState.MCS_TAG_AND_SIZE;
        this.waitForData();
    }
    getMinBytesNeeded() {
        switch (this.state) {
            case models_1.ProcessingState.MCS_VERSION_TAG_AND_SIZE:
                return 1 + 1 + 1;
            case models_1.ProcessingState.MCS_TAG_AND_SIZE:
                return 1 + 1;
            case models_1.ProcessingState.MCS_SIZE:
                return this.sizePacketSoFar + 1;
            case models_1.ProcessingState.MCS_PROTO_BYTES:
                return this.messageSize;
            default:
                throw new error_2.MCSProtocolProcessingStateError("Unknown protocol processing state", { context: { state: this.state } });
        }
    }
    buildProtobufFromTag(messageTag) {
        switch (messageTag) {
            case models_1.MessageTag.HeartbeatPing:
                return PushClientParser.proto.lookupType("mcs_proto.HeartbeatPing");
            case models_1.MessageTag.HeartbeatAck:
                return PushClientParser.proto.lookupType("mcs_proto.HeartbeatAck");
            case models_1.MessageTag.LoginRequest:
                return PushClientParser.proto.lookupType("mcs_proto.LoginRequest");
            case models_1.MessageTag.LoginResponse:
                return PushClientParser.proto.lookupType("mcs_proto.LoginResponse");
            case models_1.MessageTag.Close:
                return PushClientParser.proto.lookupType("mcs_proto.Close");
            case models_1.MessageTag.IqStanza:
                return PushClientParser.proto.lookupType("mcs_proto.IqStanza");
            case models_1.MessageTag.DataMessageStanza:
                return PushClientParser.proto.lookupType("mcs_proto.DataMessageStanza");
            case models_1.MessageTag.StreamErrorStanza:
                return PushClientParser.proto.lookupType("mcs_proto.StreamErrorStanza");
            default:
                throw new error_2.MCSProtocolMessageTagError("Unknown protocol message tag", { context: { messageTag: this.messageTag } });
        }
    }
}
exports.PushClientParser = PushClientParser;
//# sourceMappingURL=parser.js.map