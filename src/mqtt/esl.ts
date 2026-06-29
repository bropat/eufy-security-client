/**
 * ESL (eufy smart lock) command codec for the newer Wi-Fi FamiLock family — reverse-engineered
 * for the C32 (T85L1, device_type 211) which rides the legacy eufy_security MQTT broker
 * (security-mqtt-ie.anker.com:8883, mutual-TLS) rather than the P2P/station path.
 *
 * The scheme has NO session handshake and NO per-device secret: the AES key is simply the
 * tail of the owner account id plus the command's Unix timestamp (which is also sent in
 * cleartext, so the lock reconstructs the same key). Verified byte-for-byte against live
 * captures. See project notes for the full derivation.
 *
 *   key       = ascii(accountId[-12:]) ++ BE32(unixTs)            (16 bytes, AES-128)
 *   iv        = ascii(deviceSn)                                   (16 bytes)
 *   payload   = header(9) ++ AES-128-CBC-PKCS7(tlv) ++ checksum(1)
 *   header    = FF 09 <totalLen> 00 03 00 02 <dir> <msgType>     dir 0x40=req/0x48=res, msgType 0x23
 *   checksum  = XOR of all preceding bytes (header ++ ciphertext)
 *   tlv       = a1:BE32(ts) reversed | a2:accountId | a3:opcode | (unlock: a4:user, a5:BE16 uid)
 *               zero-filled to a 16-byte boundary, then PKCS7.
 */
import { createCipheriv, createDecipheriv } from "crypto";

export const EslOpcode = { Lock: 0x00, Unlock: 0x01 } as const;
export type EslOpcode = (typeof EslOpcode)[keyof typeof EslOpcode];

export const EslDir = { Request: 0x40, Response: 0x48 } as const;
export type EslDir = (typeof EslDir)[keyof typeof EslDir];

/**
 * Header byte[8] — a FIXED message-type byte for the on/off lock command, NOT a rolling
 * counter. Every live member-app command (lock and unlock) carries 0x23 here; the lock
 * rejects any other value with a `01` reply (verified: 0x31/0x55 → reject/ignore, 0x23 → 00).
 * The lock echoes it unchanged in its `/res` frame.
 */
export const ESL_MSG_TYPE_ONOFF = 0x23;

/**
 * The on/off lock command (lock and unlock; lock vs unlock is selected by the a3 opcode,
 * with the operator a4/a5 TLVs included). Verified against a live member-app unlock capture
 * that the lock acknowledged with a `00` success reply.
 */
export const ESL_API_ONOFF = 6018;

function tlv(tag: number, val: Buffer): Buffer {
    return Buffer.concat([Buffer.from([tag, val.length]), val]);
}

function pkcs7Pad(data: Buffer, block = 16): Buffer {
    const pad = block - (data.length % block) || block;
    return Buffer.concat([data, Buffer.alloc(pad, pad)]);
}

function pkcs7Unpad(data: Buffer): Buffer {
    const pad = data[data.length - 1];
    if (pad < 1 || pad > 16 || pad > data.length) return data;
    return data.subarray(0, data.length - pad);
}

export interface EslCommandParams {
    /** Device owner's user id (the lock derives the key from this; a member uses the owner id from the shared record). */
    accountId: string;
    /** Device serial, e.g. "T85L1P10260602AA" — also used as the AES IV. */
    deviceSn: string;
    /** Unix timestamp (seconds). Defaults to now. Travels in cleartext so the lock rebuilds the key. */
    ts?: number;
    opcode: EslOpcode;
    /**
     * Header byte[8] — the fixed on/off message-type byte (see {@link ESL_MSG_TYPE_ONOFF}),
     * echoed unchanged in the lock's response. This is NOT a counter: the lock only accepts
     * 0x23 for this command, so it should be left at its default.
     */
    msgType?: number;
    /**
     * Include the operator metadata TLVs (a4 userName, a5 shortUserId). Required by the on/off
     * lock command for BOTH lock and unlock (the lock logs who operated it); omit for the
     * read-only status query.
     */
    includeUser?: boolean;
    /** Operator metadata (who/which slot); shown in lock events. */
    userName?: string;
    shortUserId?: number;
}

function deriveKey(accountId: string, ts: number): Buffer {
    const prefix = Buffer.from(accountId.slice(-12), "ascii");
    const tsb = Buffer.alloc(4);
    tsb.writeUInt32BE(ts >>> 0);
    return Buffer.concat([prefix, tsb]); // 16 bytes
}

/** Build the hex `lock_payload` for a request command (header + cipher + checksum). */
export function buildLockPayload(p: EslCommandParams): string {
    const ts = p.ts ?? Math.floor(Date.now() / 1000);
    const msgType = p.msgType ?? ESL_MSG_TYPE_ONOFF;
    const key = deriveKey(p.accountId, ts);
    const iv = Buffer.from(p.deviceSn, "ascii");
    const tsb = Buffer.alloc(4);
    tsb.writeUInt32BE(ts >>> 0);

    let body = Buffer.concat([
        tlv(0xa1, Buffer.from(tsb).reverse()),
        tlv(0xa2, Buffer.from(p.accountId, "ascii")),
        tlv(0xa3, Buffer.from([p.opcode])),
    ]);
    if (p.includeUser ?? p.opcode === EslOpcode.Unlock) {
        body = Buffer.concat([
            body,
            tlv(0xa4, Buffer.from(p.userName ?? "Autohome", "ascii")),
            tlv(0xa5, (() => { const b = Buffer.alloc(2); b.writeUInt16BE(p.shortUserId ?? 1); return b; })()),
        ]);
    }
    // Zero-fill to the next 16-byte boundary, THEN PKCS7-pad a full block — this matches the
    // member app's on/off command byte-for-byte (verified against a live capture the lock
    // acknowledged with 00). Removing the zero-fill produces a body the lock rejects.
    if (body.length % 16) body = Buffer.concat([body, Buffer.alloc(16 - (body.length % 16))]);

    const cipher = createCipheriv("aes-128-cbc", key, iv);
    cipher.setAutoPadding(false);
    const ct = Buffer.concat([cipher.update(pkcs7Pad(body)), cipher.final()]);

    const total = 9 + ct.length + 1;
    const header = Buffer.from([0xff, 0x09, total & 0xff, 0x00, 0x03, 0x00, 0x02, EslDir.Request, msgType & 0xff]);
    const framed = Buffer.concat([header, ct]);
    let chk = 0;
    framed.forEach((b) => { chk ^= b; });
    return Buffer.concat([framed, Buffer.from([chk])]).toString("hex");
}

export interface EslResponse {
    dir: number;
    counter: number;
    /** Decrypted TLV body (PKCS7-stripped). First byte 0x00 = success/ACK. */
    body: Buffer;
    ok: boolean;
}

/**
 * Decode a `/res` lock_payload. The reply reuses the *request* timestamp for its key
 * (its own cleartext `time` field reads "0"), so pass the ts you sent.
 */
export function decodeResponse(lockPayloadHex: string, accountId: string, deviceSn: string, requestTs: number): EslResponse {
    const b = Buffer.from(lockPayloadHex, "hex");
    const header = b.subarray(0, 9);
    const ct = b.subarray(9, b.length - 1);
    const key = deriveKey(accountId, requestTs);
    const iv = Buffer.from(deviceSn, "ascii");
    const dec = createDecipheriv("aes-128-cbc", key, iv);
    dec.setAutoPadding(false);
    const pt = pkcs7Unpad(Buffer.concat([dec.update(ct), dec.final()]));
    return { dir: header[7], counter: header[8], body: pt, ok: pt.length > 0 && pt[0] === 0x00 };
}

/**
 * Lock-status values carried in an async event frame's `a2` TLV (and the `lockStatus`
 * device property). 3 = Unlocked, 4 = Locked are the two we act on.
 */
export const EslLockStatus = { Unlocked: 0x03, Locked: 0x04 } as const;

export interface EslEvent {
    /** Lock status from the a2 TLV (3 = unlocked, 4 = locked). */
    status?: number;
    /** a1 TLV (operator/user id observed in events; semantics TBD — surfaced raw). */
    a1?: number;
    /** a3 TLV (event sub-type/origin; surfaced raw). */
    a3?: number;
}

/**
 * Decode an asynchronous lock EVENT frame (e.g. a remote unlock or the auto-lock that follows).
 * Unlike command responses these are PLAINTEXT — no AES — and are distinguished by header
 * byte[5] === 0x01 (command responses carry 0x00) with msgType 0x4A. Layout verified against
 * live captures:
 *   header(9) = FF 09 14 00 03 01 02 00 4A
 *   body      = 00 | A1 01 <a1> | A2 01 <status> | A3 01 <a3> | checksum(1)
 * Returns null if the frame is not a recognizable event (so command ACKs fall through).
 */
export function decodeEvent(lockPayloadHex: string): EslEvent | null {
    const b = Buffer.from(lockPayloadHex, "hex");
    if (b.length < 11 || b[0] !== 0xff || b[1] !== 0x09 || b[5] !== 0x01) return null;
    const body = b.subarray(9, b.length - 1); // strip 9-byte header and trailing checksum
    const ev: EslEvent = {};
    let i = 1; // skip the leading status/result byte (0x00)
    while (i + 2 <= body.length) {
        const tag = body[i];
        const len = body[i + 1];
        const val = body.subarray(i + 2, i + 2 + len);
        if (len === 1) {
            if (tag === 0xa1) ev.a1 = val[0];
            else if (tag === 0xa2) ev.status = val[0];
            else if (tag === 0xa3) ev.a3 = val[0];
        }
        i += 2 + len;
    }
    return ev.status !== undefined ? ev : null;
}
