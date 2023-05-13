import { randomBytes } from "crypto";
import * as path from "path";
import { load } from "protobufjs";

import { CheckinResponse } from "./models";

export const VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;

export function generateFid(): string {
    const fidByteArray = new Uint8Array(17);
    fidByteArray.set(randomBytes(fidByteArray.length));

    // Replace the first 4 random bits with the constant FID header of 0b0111.
    fidByteArray[0] = 0b01110000 + (fidByteArray[0] % 0b00010000);

    const b64 = Buffer.from(fidByteArray).toString("base64");
    const b64_safe = b64.replace(/\+/g, "-").replace(/\//g, "_");
    const fid = b64_safe.substr(0, 22);
    if (VALID_FID_PATTERN.test(fid)) {
        return fid;
    }
    throw new Error(`Generated FID is invalid?!`);
}

export const buildCheckinRequest = async (): Promise<Uint8Array> => {
    const root = await load(path.join(__dirname, "./proto/checkin.proto"));
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
        accountCookie: [] as string[],
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

export const parseCheckinResponse = async (data: Buffer): Promise<CheckinResponse> => {
    const root = await load(path.join(__dirname, "./proto/checkin.proto"));
    const CheckinResponseModel = root.lookupType("CheckinResponse");
    const message = CheckinResponseModel.decode(data);
    const object = CheckinResponseModel.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
    });
    return object as CheckinResponse;
};

export const sleep = async (ms: number): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export function convertTimestampMs(timestamp: number): number {
    if (timestamp.toString().length === 10) {
        return timestamp * 1000;
    }
    return timestamp;
}