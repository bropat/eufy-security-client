"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageTag = exports.ProcessingState = void 0;
var ProcessingState;
(function (ProcessingState) {
    // Processing the version, tag, and size packets (assuming minimum length
    // size packet). Only used during the login handshake.
    ProcessingState[ProcessingState["MCS_VERSION_TAG_AND_SIZE"] = 0] = "MCS_VERSION_TAG_AND_SIZE";
    // Processing the tag and size packets (assuming minimum length size
    // packet). Used for normal messages.
    ProcessingState[ProcessingState["MCS_TAG_AND_SIZE"] = 1] = "MCS_TAG_AND_SIZE";
    // Processing the size packet alone.
    ProcessingState[ProcessingState["MCS_SIZE"] = 2] = "MCS_SIZE";
    // Processing the protocol buffer bytes (for those messages with non-zero
    // sizes).
    ProcessingState[ProcessingState["MCS_PROTO_BYTES"] = 3] = "MCS_PROTO_BYTES";
})(ProcessingState || (exports.ProcessingState = ProcessingState = {}));
var MessageTag;
(function (MessageTag) {
    MessageTag[MessageTag["HeartbeatPing"] = 0] = "HeartbeatPing";
    MessageTag[MessageTag["HeartbeatAck"] = 1] = "HeartbeatAck";
    MessageTag[MessageTag["LoginRequest"] = 2] = "LoginRequest";
    MessageTag[MessageTag["LoginResponse"] = 3] = "LoginResponse";
    MessageTag[MessageTag["Close"] = 4] = "Close";
    MessageTag[MessageTag["MessageStanza"] = 5] = "MessageStanza";
    MessageTag[MessageTag["PresenceStanza"] = 6] = "PresenceStanza";
    MessageTag[MessageTag["IqStanza"] = 7] = "IqStanza";
    MessageTag[MessageTag["DataMessageStanza"] = 8] = "DataMessageStanza";
    MessageTag[MessageTag["BatchPresenceStanza"] = 9] = "BatchPresenceStanza";
    MessageTag[MessageTag["StreamErrorStanza"] = 10] = "StreamErrorStanza";
    MessageTag[MessageTag["HttpRequest"] = 11] = "HttpRequest";
    MessageTag[MessageTag["HttpResponse"] = 12] = "HttpResponse";
    MessageTag[MessageTag["BindAccountRequest"] = 13] = "BindAccountRequest";
    MessageTag[MessageTag["BindAccountResponse"] = 14] = "BindAccountResponse";
    MessageTag[MessageTag["TalkMetadata"] = 15] = "TalkMetadata";
    MessageTag[MessageTag["NumProtoTypes"] = 16] = "NumProtoTypes";
})(MessageTag || (exports.MessageTag = MessageTag = {}));
//# sourceMappingURL=models.js.map