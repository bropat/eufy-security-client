import { Socket } from "dgram";
import NodeRSA from "node-rsa";
import * as CryptoJS from "crypto-js"
import { randomBytes, createCipheriv, createECDH, ECDH, createHmac, createDecipheriv } from "crypto";
import * as os from "os";

import { P2PMessageParts, P2PMessageState, P2PQueueMessage, RGBColor } from "./interfaces";
import { CommandType, ESLCommand, ESLBleCommand, LockV12P2PCommand, P2PDataTypeHeader, SmartSafeCommandCode, VideoCodec, EncryptionType } from "./types";
import { Address, LockP2PCommandPayloadType, LockP2PCommandType, LockV12P2PCommandPayloadType, SmartSafeNotificationResponse, SmartSafeP2PCommandType } from "./models";
import { DeviceType } from "../http/types";
import { Device, Lock, SmartSafe } from "../http/device";
import { BleCommandFactory } from "./ble";

export const MAGIC_WORD = "XZYH";

export const isPrivateIp = (ip: string): boolean =>
    /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(ip) ||
    /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(ip) ||
    /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(ip) ||
    /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(ip) ||
    /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(ip) ||
    /^f[cd][0-9a-f]{2}:/i.test(ip) ||
    /^fe80:/i.test(ip) ||
    /^::1$/.test(ip) ||
    /^::$/.test(ip);

const stringWithLength = (input: string, chunkLength = 128): Buffer => {
    const stringAsBuffer = Buffer.from(input);
    const bufferSize = stringAsBuffer.byteLength < chunkLength ? chunkLength : Math.ceil(stringAsBuffer.byteLength / chunkLength) * chunkLength
    const result = Buffer.alloc(bufferSize);
    stringAsBuffer.copy(result);
    return result;
};

export const getLocalIpAddress = (init = ""): string => {
    const ifaces = os.networkInterfaces();
    let localAddress = init;
    for (const name in ifaces) {
        const iface = ifaces[name]!.filter(function(details) {
            return details.family === "IPv4" && details.internal === false;
        });

        if(iface.length > 0) {
            localAddress = iface[0].address;
            break;
        }
    }
    return localAddress;
}

const p2pDidToBuffer = (p2pDid: string): Buffer => {
    const p2pArray = p2pDid.split("-");
    const buf1 = stringWithLength(p2pArray[0], 8);
    const buf2 = Buffer.allocUnsafe(4);
    buf2.writeUInt32BE(Number.parseInt(p2pArray[1]), 0);
    const buf3 = stringWithLength(p2pArray[2], 8);
    return Buffer.concat([buf1, buf2, buf3], 20);
};

export const isP2PCommandEncrypted = function(cmd: CommandType): boolean {
    return [1001, 1002, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1015, 1017, 1019, 1035, 1045, 1056, 1145, 1146, 1152, 1200, 1207, 1210, 1213, 1214, 1226, 1227, 1229, 1230, 1233, 1236, 1240, 1241, 1243, 1246, 1272, 1273, 1275, 1400, 1401, 1402, 1403, 1408, 1409, 1410, 1412, 1413, 1506, 1507, 1607, 1609, 1610, 1611, 1702, 1703, 1704, 1705, 1706, 1707, 1708, 1709, 1013, 1202, 1205, 1206, 1024, 1025, 1132, 1215, 1216, 1217, 1414, 1026, 1164, 1201, 1027, 1047, 1048, 1029, 1034, 1036, 1043, 1057, 1203, 1218, 1219, 1220, 1221, 1222, 1223, 1224, 1232, 1234, 1235, 1237, 1238, 1248, 1253, 1257, 1269, 1800, 1037, 1040, 1038, 1049, 1050, 1051, 1054, 1060, 1204, 1254, 1255, 1256, 1258, 1259, 1260, 1261, 1262, 1264, 1271, 1350, 1404, 1101, 1106, 1108, 1110, 1111, 1112, 1113, 1114, 1116, 1117, 1118, 1119, 1121, 1103, 1129, 1211, 1228, 1231, 1242, 1249, 1250, 1251, 1252, 1405, 1406, 1407, 1700].includes(cmd);
}

export const getP2PCommandEncryptionKey = function(serialNumber: string, p2pDid: string): string {
    return `${serialNumber.slice(-7)}${p2pDid.substring(p2pDid.indexOf("-"), p2pDid.indexOf("-") + 9)}`;
}

export const encryptP2PData = (data: Buffer, key: Buffer): Buffer => {
    const cipher = createCipheriv("aes-128-ecb", key, null);
    cipher.setAutoPadding(false);
    return Buffer.concat([
        cipher.update(data),
        cipher.final()]
    );
}

export const decryptP2PData = (data: Buffer, key: Buffer): Buffer => {
    const decipher = createDecipheriv("aes-128-ecb", key, null);
    decipher.setAutoPadding(false);
    return Buffer.concat([
        decipher.update(data),
        decipher.final()]
    );
}

export const paddingP2PData = (data: Buffer, blocksize = 16): Buffer => {
    const bufferSize = data.byteLength < blocksize ? blocksize : Math.ceil(data.byteLength / blocksize) * blocksize
    const result = Buffer.alloc(bufferSize);
    data.copy(result);
    return result;
}

export const buildLookupWithKeyPayload = (socket: Socket, p2pDid: string, dskKey: string): Buffer => {
    const p2pDidBuffer = p2pDidToBuffer(p2pDid);

    const addressInfo = socket.address();
    const port = addressInfo.port;
    const portAsBuffer = Buffer.allocUnsafe(2);
    portAsBuffer.writeUInt16LE(port, 0);
    //const ip = socket.address().address;
    const ip = getLocalIpAddress(addressInfo.address);
    const temp_buff: number[] = [];
    ip.split(".").reverse().forEach(element => {
        temp_buff.push(Number.parseInt(element));
    });
    const ipAsBuffer = Buffer.from(temp_buff);

    const splitter = Buffer.from([0x00, 0x02]);
    const magic = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x04, 0x00, 0x00]);

    const dskKeyAsBuffer = Buffer.from(dskKey);

    const fourEmpty = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    return Buffer.concat([p2pDidBuffer, splitter, portAsBuffer, ipAsBuffer, magic, dskKeyAsBuffer, fourEmpty]);
};

export const buildLookupWithKeyPayload2 = (p2pDid: string, dskKey: string): Buffer => {
    const p2pDidBuffer = p2pDidToBuffer(p2pDid);
    const dskKeyAsBuffer = Buffer.from(dskKey);

    const fourEmpty = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    return Buffer.concat([p2pDidBuffer, dskKeyAsBuffer, fourEmpty]);
};

export const buildLookupWithKeyPayload3 = (p2pDid: string, address: Address, data: Buffer): Buffer => {
    const p2pDidBuffer = p2pDidToBuffer(p2pDid);
    const portAsBuffer = Buffer.allocUnsafe(2);
    portAsBuffer.writeUInt16LE(address.port, 0);
    const temp_buff: number[] = [];
    address.host.split(".").reverse().forEach(element => {
        temp_buff.push(Number.parseInt(element));
    });
    const ipAsBuffer = Buffer.from(temp_buff);
    const splitter = Buffer.from([0x00, 0x02]);
    const eightEmpty = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    return Buffer.concat([p2pDidBuffer, splitter, portAsBuffer, ipAsBuffer, eightEmpty, data]);
};

export const buildCheckCamPayload = (p2pDid: string): Buffer => {
    const p2pDidBuffer = p2pDidToBuffer(p2pDid);
    const magic = Buffer.from([0x00, 0x00, 0x00]);
    return Buffer.concat([p2pDidBuffer, magic]);
};

export const buildCheckCamPayload2 = (p2pDid: string, data: Buffer): Buffer => {
    const p2pDidBuffer = p2pDidToBuffer(p2pDid);
    const magic = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    return Buffer.concat([data, p2pDidBuffer, magic]);
};

export const buildIntCommandPayload = (encryptionType: EncryptionType, encryptionKey: Buffer | undefined, serialNumber: string, p2pDid: string, commandType: CommandType, value: number, strValue = "", channel = 255): Buffer => {
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const encrypted = isP2PCommandEncrypted(commandType) && encryptionType !== EncryptionType.NONE && encryptionKey !== undefined;
    const channelBuffer = Buffer.from([channel, encrypted ? encryptionType : 0]);
    const valueBuffer = Buffer.allocUnsafe(4);
    valueBuffer.writeUInt32LE(value, 0);
    const headerBuffer = Buffer.allocUnsafe(2);
    const strValueBuffer = strValue.length === 0 ? Buffer.from([]) : stringWithLength(strValue);
    const tmpDataBuffer = Buffer.concat([
        valueBuffer,
        strValueBuffer
    ]);
    const dataBuffer = encrypted ? paddingP2PData(tmpDataBuffer) : tmpDataBuffer;
    headerBuffer.writeUInt16LE(dataBuffer.length, 0);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        encrypted ? encryptP2PData(dataBuffer, encryptionKey) : dataBuffer
    ]);
};

export const buildStringTypeCommandPayload = (encryptionType: EncryptionType, encryptionKey: Buffer | undefined, serialNumber: string, p2pDid: string, commandType: CommandType, strValue: string, strValueSub: string, channel = 255): Buffer => {
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const encrypted = isP2PCommandEncrypted(commandType) && encryptionType !== EncryptionType.NONE && encryptionKey !== undefined;
    const channelBuffer = Buffer.from([channel, encrypted ? encryptionType : 0]);
    const someBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    const strValueBuffer = stringWithLength(strValue);
    const strValueSubBuffer = stringWithLength(strValueSub);
    const headerBuffer = Buffer.allocUnsafe(2);
    const tmpDataBuffer = Buffer.concat([
        someBuffer,
        strValueBuffer,
        strValueSubBuffer
    ]);
    const dataBuffer = encrypted ? paddingP2PData(tmpDataBuffer) : tmpDataBuffer;
    headerBuffer.writeUInt16LE(dataBuffer.length, 0);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        encrypted ? encryptP2PData(dataBuffer, encryptionKey) : dataBuffer
    ]);
};

export const buildIntStringCommandPayload = (encryptionType: EncryptionType, encryptionKey: Buffer | undefined, serialNumber: string, p2pDid: string, commandType: CommandType, value: number, valueSub = 0, strValue = "", strValueSub = "", channel = 0): Buffer => {
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const encrypted = isP2PCommandEncrypted(commandType) && encryptionType !== EncryptionType.NONE && encryptionKey !== undefined;
    const channelBuffer = Buffer.from([channel, encrypted ? encryptionType : 0]);
    const someintBuffer = Buffer.allocUnsafe(4);
    someintBuffer.writeUInt32LE(valueSub, 0);
    const valueBuffer = Buffer.allocUnsafe(4);
    valueBuffer.writeUInt32LE(value, 0);
    const strValueBuffer = strValue.length === 0 ? Buffer.from([]) : stringWithLength(strValue);
    const strValueSubBuffer = strValueSub.length === 0 ? Buffer.from([]) : stringWithLength(strValueSub);
    const headerBuffer = Buffer.allocUnsafe(2);
    const tmpDataBuffer = Buffer.concat([
        someintBuffer,
        valueBuffer,
        strValueBuffer,
        strValueSubBuffer
    ]);
    const dataBuffer = encrypted ? paddingP2PData(tmpDataBuffer) : tmpDataBuffer;
    headerBuffer.writeUInt16LE(dataBuffer.length, 0);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        encrypted ? encryptP2PData(dataBuffer, encryptionKey) : dataBuffer
    ]);
};

export const sendMessage = async (socket: Socket, address: { host: string; port: number }, msgID: Buffer, payload?: Buffer): Promise<number> => {
    if (!payload)
        payload = Buffer.from([]);
    const payloadLen = Buffer.allocUnsafe(2);
    payloadLen.writeUInt16BE(payload.length, 0);
    const message = Buffer.concat([msgID, payloadLen, payload], 4 + payload.length);

    return new Promise((resolve, reject) => {
        socket.send(message, address.port, address.host, (err, bytes) => {
            return err ? reject(err) : resolve(bytes);
        });
    });
};

export const hasHeader = (msg: Buffer, searchedType: Buffer): boolean => {
    const header = Buffer.allocUnsafe(2);
    msg.copy(header, 0, 0, 2);
    return Buffer.compare(header, searchedType) === 0;
};

export const buildCommandHeader = (seqNumber: number, commandType: CommandType, p2pDataTypeHeader: Buffer | null = null): Buffer => {
    let dataTypeBuffer = P2PDataTypeHeader.DATA;
    if (p2pDataTypeHeader !== null &&
        (Buffer.compare(p2pDataTypeHeader, P2PDataTypeHeader.DATA) === 0 ||
        Buffer.compare(p2pDataTypeHeader, P2PDataTypeHeader.BINARY) === 0 ||
        Buffer.compare(p2pDataTypeHeader, P2PDataTypeHeader.CONTROL) === 0 ||
        Buffer.compare(p2pDataTypeHeader, P2PDataTypeHeader.VIDEO) === 0)) {
        dataTypeBuffer = p2pDataTypeHeader;
    }
    const seqAsBuffer = Buffer.allocUnsafe(2);
    seqAsBuffer.writeUInt16BE(seqNumber, 0);
    const magicString = Buffer.from(MAGIC_WORD);
    const commandTypeBuffer = Buffer.allocUnsafe(2);
    commandTypeBuffer.writeUInt16LE(commandType, 0);
    return Buffer.concat([dataTypeBuffer, seqAsBuffer, magicString, commandTypeBuffer]);
};


export const buildCommandWithStringTypePayload = (encryptionType: EncryptionType, encryptionKey: Buffer | undefined, serialNumber: string, p2pDid: string, commandType: CommandType, value: string, channel = 0): Buffer => {
    const headerBuffer = Buffer.allocUnsafe(2);
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const encrypted = isP2PCommandEncrypted(commandType) && encryptionType !== EncryptionType.NONE && encryptionKey !== undefined;
    const channelBuffer = Buffer.from([channel, encrypted ? encryptionType : 0]);
    const dataBuffer = encrypted ? paddingP2PData(Buffer.from(value)) : Buffer.from(value);
    headerBuffer.writeUInt16LE(dataBuffer.length, 0);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        encrypted ? encryptP2PData(dataBuffer, encryptionKey) : dataBuffer
    ]);
};

export const sortP2PMessageParts = (messages: P2PMessageParts): Buffer => {
    let completeMessage = Buffer.from([]);
    Object.keys(messages).map(Number)
        .sort((a, b) => a - b) // assure the seqNumbers are in correct order
        .forEach((key: number) => {
            completeMessage = Buffer.concat([completeMessage, messages[key]]);
        });
    return completeMessage;
}

export const getRSAPrivateKey = (pem: string): NodeRSA => {
    const key = new NodeRSA();
    if (pem.indexOf("\n") !== -1) {
        pem = pem.replaceAll("\n", "");
    }
    if  (pem.startsWith("-----BEGIN RSA PRIVATE KEY-----")) {
        pem = pem.replace("-----BEGIN RSA PRIVATE KEY-----", "").replace("-----END RSA PRIVATE KEY-----", "");
    }
    key.importKey(pem, "pkcs8");
    key.setOptions({
        encryptionScheme: "pkcs1"
    });
    return key;
}

export const getNewRSAPrivateKey = (): NodeRSA => {
    const key = new NodeRSA({ b: 1024 });
    key.setOptions({
        encryptionScheme: "pkcs1"
    });
    return key;
}

export const decryptAESData = (hexkey: string, data: Buffer): Buffer => {
    const key = CryptoJS.enc.Hex.parse(hexkey);
    const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(data.toString("hex"))
    });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding
    });
    return Buffer.from(CryptoJS.enc.Hex.stringify(decrypted), "hex");
}

export const findStartCode = (data: Buffer): boolean => {
    if (data !== undefined && data.length > 0) {
        if (data.length >= 4) {
            const startcode = [...data.slice(0, 4)]
            if ((startcode[0] === 0 && startcode[1] === 0 && startcode[2] === 1) || (startcode[0] === 0 && startcode[1] === 0 && startcode[2] === 0 && startcode[3] === 1))
                return true;
        } else if (data.length === 3) {
            const startcode = [...data.slice(0, 3)]
            if ((startcode[0] === 0 && startcode[1] === 0 && startcode[2] === 1))
                return true;
        }
    }
    return false;
}

export const isIFrame = (data: Buffer): boolean => {
    const validValues = [64, 66, 68, 78, 101, 103];
    if (data !== undefined && data.length > 0) {
        if (data.length >= 5) {
            const startcode = [...data.slice(0, 5)]
            if (validValues.includes(startcode[3]) || validValues.includes(startcode[4]))
                return true;
        }
    }
    return false;
}

export const decryptLockAESData = (key: string, iv: string, data: Buffer): Buffer => {
    const ekey = CryptoJS.enc.Hex.parse(key);
    const eiv = CryptoJS.enc.Hex.parse(iv);
    const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(data.toString("hex"))
    });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, ekey, {
        iv: eiv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return Buffer.from(CryptoJS.enc.Hex.stringify(decrypted), "hex");
}

export const encryptLockAESData = (key: string, iv: string, data: Buffer): Buffer => {
    const ekey = CryptoJS.enc.Hex.parse(key);
    const eiv = CryptoJS.enc.Hex.parse(iv);
    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Hex.parse(data.toString("hex")), ekey, {
        iv: eiv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return Buffer.from(CryptoJS.enc.Hex.stringify(encrypted.ciphertext), "hex");
}

export const generateBasicLockAESKey = (adminID: string, stationSN: string): string => {

    const encoder = new TextEncoder();
    const encOwnerID = encoder.encode(adminID);
    const encStationSerial = encoder.encode(stationSN);
    const array: number[] = [104, -83, -72, 38, -107, 99, -110, 17, -95, -121, 54, 57, -46, -98, -111, 89];

    for (let i = 0; i < 16; i++) {
        array[i] = (array[i] + encStationSerial[((encStationSerial[i] * 3) + 5) % 16] + encOwnerID[((encOwnerID[i] * 3) + 5) % 40]);
    }

    return Buffer.from(array).toString("hex");
}

export const getCurrentTimeInSeconds = function(): number {
    return Math.trunc(new Date().getTime() / 1000);
}

export const generateLockSequence = (deviceType: DeviceType): number => {
    if (Device.isLockWifi(deviceType) || Device.isLockWifiNoFinger(deviceType))
        return Math.trunc(Math.random() * 1000);
    return getCurrentTimeInSeconds();
}

export const encodeLockPayload = (data: string): Buffer => {
    const encoder = new TextEncoder();
    const encData = encoder.encode(data);
    const length = encData.length;
    const old_buffer = Buffer.from(encData);
    if (length % 16 == 0) {
        return old_buffer;
    }

    const new_length = (Math.trunc(length / 16) + 1) * 16;
    const new_buffer = Buffer.alloc(new_length);
    old_buffer.copy(new_buffer, 0);

    return new_buffer;
}

export const getLockVectorBytes = (data: string): string => {
    const encoder = new TextEncoder();
    const encData = encoder.encode(data);
    const old_buffer = Buffer.from(encData);

    if (encData.length >= 16)
        return old_buffer.toString("hex");

    const new_buffer = Buffer.alloc(16);
    old_buffer.copy(new_buffer, 0);

    return new_buffer.toString("hex");
}

export const decodeLockPayload = (data: Buffer): string => {
    const decoder = new TextDecoder();
    return decoder.decode(data);
}

export const decodeBase64 = (data: string): Buffer => {
    return Buffer.from(data, "base64");
}

export const eslTimestamp = function(timestamp_in_sec = new Date().getTime() / 1000): number[] {
    const array: number[] = [];
    for (let pos = 0; pos < 4; pos++) {
        array[pos] = ((timestamp_in_sec >> (pos * 8)) & 255);
    }
    return array;
}

export const generateAdvancedLockAESKey = (): string => {
    const randomBytesArray = [...randomBytes(16)];
    let result = "";
    for(let pos = 0; pos < randomBytesArray.length; pos++) {
        result += "0123456789ABCDEF".charAt((randomBytesArray[pos] >> 4) & 15);
        result += "0123456789ABCDEF".charAt(randomBytesArray[pos] & 15);
    }
    return result;
}

export const getVideoCodec = (data: Buffer): VideoCodec => {
    if (data !== undefined && data.length > 0) {
        if (data.length >= 5) {
            const h265Values = [38, 64, 66, 68, 78];
            const startcode = [...data.slice(0, 5)]
            if (h265Values.includes(startcode[3]) || h265Values.includes(startcode[4])) {
                return VideoCodec.H265;
            } else if (startcode[3] === 103 || startcode[4] === 103) {
                return VideoCodec.H264;
            }
        }
        return VideoCodec.H264;
    }
    return VideoCodec.UNKNOWN; // Maybe return h264 as Eufy does?
}

export const checkT8420 = (serialNumber: string): boolean => {
    if (!(serialNumber !== undefined && serialNumber !== null && serialNumber.length > 0 && serialNumber.startsWith("T8420")) || serialNumber.length <= 7 || serialNumber[6] != "6") {
        return false;
    }
    return true;
}

export const buildVoidCommandPayload = (channel = 255): Buffer => {
    const headerBuffer = Buffer.from([0x00, 0x00]);
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const channelBuffer = Buffer.from([channel, 0x00]);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer
    ]);
};

export function isP2PQueueMessage(type: P2PQueueMessage | P2PMessageState): type is P2PQueueMessage {
    return (type as P2PQueueMessage).p2pCommand !== undefined;
}

export const encryptPayloadData = (data: string | Buffer, key: Buffer, iv: Buffer): Buffer => {
    const cipher = createCipheriv("aes-128-cbc", key, iv);
    return Buffer.concat([
        cipher.update(data),
        cipher.final()]
    );
}

export const decryptPayloadData = (data: Buffer, key: Buffer, iv: Buffer): Buffer => {
    const cipher = createDecipheriv("aes-128-cbc", key, iv);
    return Buffer.concat([
        cipher.update(data),
        cipher.final()]
    );
}

export const eufyKDF = (key: Buffer): Buffer => {
    const hash_length = 32;
    const digest_length = 48;
    const staticBuffer = Buffer.from("ECIES");
    const steps = Math.ceil(digest_length / hash_length);
    const buffer = Buffer.alloc(hash_length * steps);

    let tmpBuffer = staticBuffer;
    for (let step = 0; step < steps; ++step) {
        tmpBuffer = createHmac("sha256", key).update(tmpBuffer).digest();
        const digest = createHmac("sha256", key).update(Buffer.concat([tmpBuffer, staticBuffer])).digest();
        digest.copy(buffer, hash_length * step);
    }

    return buffer.slice(0, digest_length);
}

export const getAdvancedLockKey = (key: string, publicKey: string): string => {
    const ecdh: ECDH = createECDH("prime256v1");
    ecdh.generateKeys();
    const secret = ecdh.computeSecret(Buffer.concat([Buffer.from("04", "hex"), Buffer.from(publicKey, "hex")]));
    const randomValue = randomBytes(16);

    const derivedKey = eufyKDF(secret);
    const encryptedData = encryptPayloadData(key, derivedKey.slice(0, 16), randomValue);

    const hmac = createHmac("sha256", derivedKey.slice(16));
    hmac.update(randomValue);
    hmac.update(encryptedData);
    const hmacDigest = hmac.digest();

    return Buffer.concat([Buffer.from(ecdh.getPublicKey("hex", "compressed"), "hex"), randomValue, encryptedData, hmacDigest]).toString("hex");
}

export const getLockV12Key = (key: string, publicKey: string): string => {
    const ecdh: ECDH = createECDH("prime256v1");
    ecdh.generateKeys();
    const secret = ecdh.computeSecret(Buffer.concat([Buffer.from("04", "hex"), Buffer.from(publicKey, "hex")]));
    const randomValue = randomBytes(16);

    const derivedKey = eufyKDF(secret);
    const encryptedData = encryptPayloadData(Buffer.from(key, "hex"), derivedKey.slice(0, 16), randomValue);

    const hmac = createHmac("sha256", derivedKey.slice(16));
    hmac.update(randomValue);
    hmac.update(encryptedData);
    const hmacDigest = hmac.digest();

    return Buffer.concat([Buffer.from(ecdh.getPublicKey("hex", "compressed"), "hex"), randomValue, encryptedData, hmacDigest]).toString("hex");
}

export const buildTalkbackAudioFrameHeader = (audioData: Buffer, channel = 0): Buffer => {
    const audioDataLength = Buffer.allocUnsafe(4);
    audioDataLength.writeUInt32LE(audioData.length);
    const unknown1 = Buffer.alloc(1);
    const audioType = Buffer.alloc(1);
    const audioSeq = Buffer.alloc(2);
    const audioTimestamp = Buffer.alloc(8);
    const audioDataHeader = Buffer.concat([audioDataLength, unknown1, audioType, audioSeq, audioTimestamp]);
    const bytesToRead = Buffer.allocUnsafe(4);
    bytesToRead.writeUInt32LE(audioData.length + audioDataHeader.length);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const channelBuffer = Buffer.from([channel, 0x00]);
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    return Buffer.concat([
        bytesToRead,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        audioDataHeader
    ]);
}

export const decodeP2PCloudIPs = (data: string): Array<Address> => {
    const lookupTable = Buffer.from("4959433db5bf6da347534f6165e371e9677f02030badb3892b2f35c16b8b959711e5a70deff1050783fb9d3bc5c713171d1f2529d3df", "hex");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [encoded, name = "name not included"] = data.split(":");
    const output = Buffer.alloc(encoded.length / 2);

    for (let i = 0; i <= data.length / 2; i++) {
        let z = 0x39; // 57 // '9'

        for (let j = 0; j < i; j++) {
            z = z ^ output[j];
        }

        const x = (data.charCodeAt(i * 2 + 1) - "A".charCodeAt(0))
        const y = (data.charCodeAt(i * 2) - "A".charCodeAt(0)) * 0x10
        output[i] = z ^ lookupTable[i % lookupTable.length] ^ x + y
    }

    const result: Array<Address> = [];
    output.toString("utf8").split(",").forEach((ip) => {
        if (ip !== "") {
            result.push({ host: ip, port: 32100 });
        }
    });
    return result;
}

export const decodeSmartSafeData = function(deviceSN: string, data: Buffer): SmartSafeNotificationResponse {
    const response = new BleCommandFactory(data);
    return {
        versionCode: response.getVersionCode(),
        dataType: response.getDataType(),
        commandCode: response.getCommandCode(),
        packageFlag: response.getPackageFlag(),
        responseCode: response.getResponseCode()!,
        data: decryptPayloadData(response.getData()!, Buffer.from(deviceSN), Buffer.from(SmartSafe.IV, "hex"))
    } as SmartSafeNotificationResponse;
}

export const getSmartSafeP2PCommand = function(deviceSN: string, user_id: string, command: CommandType, intCommand: SmartSafeCommandCode, channel: number, sequence: number, data: Buffer): SmartSafeP2PCommandType {
    const encPayload = encryptPayloadData(data, Buffer.from(deviceSN), Buffer.from(SmartSafe.IV, "hex"));
    const bleCommand = new BleCommandFactory()
        .setVersionCode(SmartSafe.VERSION_CODE)
        .setCommandCode(intCommand)
        .setDataType(-1)
        .setData(encPayload)
        .getSmartSafeCommand();

    return {
        commandType: CommandType.CMD_SET_PAYLOAD,
        value: JSON.stringify({
            account_id: user_id,
            cmd: command,
            mChannel: channel,
            mValue3: 0,
            payload: {
                data: bleCommand.toString("hex"),
                prj_id: command,
                seq_num: sequence,
            }
        }),
        channel: channel
    };
}

export const getLockP2PCommand = function(deviceSN: string, user_id: string, command: CommandType, channel: number, lockPublicKey: string, payload: any): LockP2PCommandType {
    const key = generateAdvancedLockAESKey();
    const ecdhKey = getAdvancedLockKey(key, lockPublicKey);
    const iv = getLockVectorBytes(deviceSN);
    const encPayload = encryptLockAESData(key, iv, Buffer.from(JSON.stringify(payload)));
    return {
        commandType: CommandType.CMD_SET_PAYLOAD,
        value: JSON.stringify({
            key: ecdhKey,
            account_id: user_id,
            cmd: command,
            mChannel: channel,
            mValue3: 0,
            payload: encPayload.toString("base64")
        } as LockP2PCommandPayloadType).replace(/=/g, "\\u003d"),
        channel: channel,
        aesKey: key
    };
}

export const getLockV12P2PCommand = function(deviceSN: string, user_id: string, command: CommandType | ESLCommand, channel: number, lockPublicKey: string, sequence: number, data: Buffer): LockV12P2PCommand {
    const key = generateAdvancedLockAESKey();
    const encryptedAesKey = getLockV12Key(key, lockPublicKey);
    const iv = getLockVectorBytes(deviceSN);
    const encPayload = encryptPayloadData(data, Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
    const bleCommand = new BleCommandFactory()
        .setVersionCode(Lock.VERSION_CODE_LOCKV12)
        .setCommandCode(Number.parseInt(ESLBleCommand[ESLCommand[command] as unknown as number]))  //TODO: Change internal command identification?
        .setDataType(-1)
        .setData(encPayload)
        .setAdditionalData(Buffer.from(encryptedAesKey, "hex"));
    return {
        aesKey: key,
        bleCommand: bleCommand.getCommandCode()!,
        payload: {
            commandType: CommandType.CMD_SET_PAYLOAD,
            value: JSON.stringify({
                account_id: user_id,
                cmd: CommandType.CMD_SET_PAYLOAD_LOCKV12,
                mChannel: channel,
                mValue3: 0,
                payload: {
                    apiCommand: command,
                    lock_payload: bleCommand.getLockV12Command().toString("hex"),
                    seq_num: sequence,
                }
            } as LockV12P2PCommandPayloadType)
        }
    };
}

export const DecimalToRGBColor = function(color: number): RGBColor {
    return {
        red: (color >> 16) & 0xff,
        green: (color >> 8) & 0xff,
        blue: color & 0xff,
    };
}

export const RGBColorToDecimal = function(color: RGBColor): number {
    return (color.red << 16) + (color.green << 8) + (color.blue);
}

export const getNullTerminatedString = function(data: Buffer, encoding?: BufferEncoding): string {
    const index  = data.indexOf(0);
    return data.toString(encoding, 0, index === -1 ? data.length : index);
}