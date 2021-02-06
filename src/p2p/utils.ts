import { Socket } from "dgram";
import NodeRSA from "node-rsa";
import CryptoJS from "crypto-js"

import { P2PMessageParts } from "./interfaces";
import { CommandType, P2PDataTypeHeader } from "./types";

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

const stringWithLength = (input: string, targetByteLength = 128): Buffer => {
    const stringAsBuffer = Buffer.from(input);
    const postZeros = Buffer.alloc(targetByteLength - stringAsBuffer.byteLength);
    return Buffer.concat([stringAsBuffer, postZeros]);
};

const p2pDidToBuffer = (p2pDid: string): Buffer => {
    const p2pArray = p2pDid.split("-");
    const buf1 = stringWithLength(p2pArray[0], 8);
    const buf2 = Buffer.allocUnsafe(4);
    buf2.writeUInt32BE(Number.parseInt(p2pArray[1]), 0);
    const buf3 = stringWithLength(p2pArray[2], 8);
    return Buffer.concat([buf1, buf2, buf3], 20);
};

export const buildLookupWithKeyPayload = (socket: Socket, p2pDid: string, dskKey: string): Buffer => {
    const p2pDidBuffer = p2pDidToBuffer(p2pDid);

    const port = socket.address().port;
    const portAsBuffer = Buffer.allocUnsafe(2);
    portAsBuffer.writeUInt16LE(port, 0);
    const ip = socket.address().address;
    const temp_buff: number[] = [];
    ip.split(".").reverse().forEach(element => {
        temp_buff.push(Number.parseInt(element));
    });
    const ipAsBuffer = Buffer.from(temp_buff);

    const splitter = Buffer.from([0x00, 0x00]);
    const magic = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x04, 0x00, 0x00]);

    const dskKeyAsBuffer = Buffer.from(dskKey);

    const fourEmpty = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    return Buffer.concat([p2pDidBuffer, splitter, portAsBuffer, ipAsBuffer, magic, dskKeyAsBuffer, fourEmpty]);
};

export const buildCheckCamPayload = (p2pDid: string): Buffer => {
    const p2pDidBuffer = p2pDidToBuffer(p2pDid);
    const magic = Buffer.from([0x00, 0x00, 0x00]);
    return Buffer.concat([p2pDidBuffer, magic]);
};

export const buildIntCommandPayload = (value: number, strValue = "", channel = 255): Buffer => {
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const channelBuffer = Buffer.from([channel, 0x00]);
    const valueBuffer = Buffer.allocUnsafe(4);
    valueBuffer.writeUInt32LE(value, 0);
    const headerBuffer = Buffer.allocUnsafe(2);
    const strValueBuffer = strValue.length === 0 ? Buffer.from([]) : stringWithLength(strValue);
    headerBuffer.writeUInt16LE(valueBuffer.length + strValueBuffer.length, 0);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        valueBuffer,
        strValueBuffer
    ]);
};

export const buildStringTypeCommandPayload = (strValue: string, strValueSub: string, channel = 255): Buffer => {
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const channelBuffer = Buffer.from([channel, 0x00]);
    const someBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    const strValueBuffer = stringWithLength(strValue);
    const strValueSubBuffer = stringWithLength(strValueSub);
    const headerBuffer = Buffer.allocUnsafe(2);
    headerBuffer.writeUInt16LE(someBuffer.length + strValueBuffer.length + strValueSubBuffer.length, 0);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        someBuffer,
        strValueBuffer,
        strValueSubBuffer
    ]);
};

export const buildIntStringCommandPayload = (value: number, valueSub = 0, strValue = "", strValueSub = "", channel = 0): Buffer => {
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const channelBuffer = Buffer.from([channel, 0x00]);
    const someintBuffer = Buffer.allocUnsafe(4);
    someintBuffer.writeUInt32LE(valueSub, 0);
    const valueBuffer = Buffer.allocUnsafe(4);
    valueBuffer.writeUInt32LE(value, 0);
    const strValueBuffer = strValue.length === 0 ? Buffer.from([]) : stringWithLength(strValue);
    const strValueSubBuffer = strValueSub.length === 0 ? Buffer.from([]) : stringWithLength(strValueSub);
    const headerBuffer = Buffer.allocUnsafe(2);
    headerBuffer.writeUInt16LE(someintBuffer.length + valueBuffer.length + strValueBuffer.length + strValueSubBuffer.length, 0);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        someintBuffer,
        valueBuffer,
        strValueBuffer,
        strValueSubBuffer
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

export const buildCommandHeader = (seqNumber: number, commandType: CommandType): Buffer => {
    const dataTypeBuffer = P2PDataTypeHeader.DATA;
    const seqAsBuffer = Buffer.allocUnsafe(2);
    seqAsBuffer.writeUInt16BE(seqNumber, 0);
    const magicString = Buffer.from(MAGIC_WORD);
    const commandTypeBuffer = Buffer.allocUnsafe(2);
    commandTypeBuffer.writeUInt16LE(commandType, 0);
    return Buffer.concat([dataTypeBuffer, seqAsBuffer, magicString, commandTypeBuffer]);
};


export const buildCommandWithStringTypePayload = (value: string, channel = 0): Buffer => {
    // type = 6
    //setCommandWithString()
    const headerBuffer = Buffer.allocUnsafe(2);
    headerBuffer.writeUInt16LE(value.length, 0);
    const emptyBuffer = Buffer.from([0x00, 0x00]);
    const magicBuffer = Buffer.from([0x01, 0x00]);
    const channelBuffer = Buffer.from([channel, 0x00]);
    const jsonBuffer = Buffer.from(value);

    return Buffer.concat([
        headerBuffer,
        emptyBuffer,
        magicBuffer,
        channelBuffer,
        emptyBuffer,
        jsonBuffer,
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