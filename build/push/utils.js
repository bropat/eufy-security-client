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
exports.sleep = exports.parseCheckinResponse = exports.buildCheckinRequest = exports.VALID_FID_PATTERN = void 0;
exports.generateFid = generateFid;
exports.convertTimestampMs = convertTimestampMs;
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const protobufjs_1 = require("protobufjs");
const error_1 = require("./error");
const logging_1 = require("../logging");
exports.VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;
function generateFid() {
    const fidByteArray = new Uint8Array(17);
    fidByteArray.set((0, crypto_1.randomBytes)(fidByteArray.length));
    // Replace the first 4 random bits with the constant FID header of 0b0111.
    fidByteArray[0] = 0b01110000 + (fidByteArray[0] % 0b00010000);
    const b64 = Buffer.from(fidByteArray).toString("base64");
    const b64_safe = b64.replace(/\+/g, "-").replace(/\//g, "_");
    const fid = b64_safe.substr(0, 22);
    if (exports.VALID_FID_PATTERN.test(fid)) {
        logging_1.rootPushLogger.info('generateFid', fid);
        return fid;
    }
    throw new error_1.FidGenerationError("Generated invalid FID", { context: { fid: fid } });
}
const buildCheckinRequest = async () => {
    const root = await (0, protobufjs_1.load)(path.join(__dirname, "./proto/checkin.proto"));
    const CheckinRequestModel = root.lookupType("CheckinRequest");
    const payload = {
        imei: "109269993813709",
        androidId: 0,
        checkin: {
            build: {
                fingerprint: "google/razor/flo:5.0.1/LRX22C/1602158:user/release-keys",
                hardware: "flo",
                brand: "google",
                radio: "FLO-04.04",
                clientId: "android-google",
            },
            lastCheckinMs: 0,
        },
        locale: "en",
        loggingId: 1234567890,
        macAddress: ["A1B2C3D4E5F6"],
        meid: "109269993813709",
        accountCookie: [],
        timeZone: "GMT",
        version: 3,
        otaCert: ["71Q6Rn2DDZl1zPDVaaeEHItd+Yg="],
        esn: "ABCDEF01",
        macAddressType: ["wifi"],
        fragment: 0,
        userSerialNumber: 0,
    };
    const message = CheckinRequestModel.create(payload);
    return CheckinRequestModel.encode(message).finish();
};
exports.buildCheckinRequest = buildCheckinRequest;
const parseCheckinResponse = async (data) => {
    const root = await (0, protobufjs_1.load)(path.join(__dirname, "./proto/checkin.proto"));
    const CheckinResponseModel = root.lookupType("CheckinResponse");
    const message = CheckinResponseModel.decode(data);
    const object = CheckinResponseModel.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
    });
    return object;
};
exports.parseCheckinResponse = parseCheckinResponse;
const sleep = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};
exports.sleep = sleep;
function convertTimestampMs(timestamp) {
    if (timestamp.toString().length === 10) {
        return timestamp * 1000;
    }
    return timestamp;
}
//# sourceMappingURL=utils.js.map