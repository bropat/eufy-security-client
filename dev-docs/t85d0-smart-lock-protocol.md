# T85D0 Smart Lock C30 — MQTT Control Protocol Specification

> **Status:** Implemented and verified
> **Applies to:** Eufy Smart Lock C30 (device type `T85D0`)
> **Implementation:** `src/mqtt/security-mqtt.ts`

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication Chain](#2-authentication-chain)
3. [MQTT Connection](#3-mqtt-connection)
4. [MQTT Message Envelope](#4-mqtt-message-envelope)
5. [BLE-over-MQTT Protocol (FF09 Frames)](#5-ble-over-mqtt-protocol-ff09-frames)
6. [AES-128-CBC Encryption](#6-aes-128-cbc-encryption)
7. [Lock/Unlock Command (TLV Payload)](#7-lockunlock-command-tlv-payload)
8. [Status Heartbeats](#8-status-heartbeats)
9. [Implementation Architecture](#9-implementation-architecture)
10. [Existing Code Reuse](#10-existing-code-reuse)

---

## 1. Overview

The **Eufy Smart Lock C30** (device type prefix `T85D0`) is a Wi-Fi smart lock that
**cannot be controlled through the same P2P or Cloud API channels** used by other
eufy-security devices. Specifically:

- **P2P fails** with error code 20028 — the lock lacks DSK (Device Shared Key) provisioning
  for the P2P protocol.
- **Cloud API (`upload_devs_params`)** returns `{"code":0}` but is a **false positive** — it
  stores parameters without physically actuating the lock.

The T85D0 is instead controlled via **BLE frames tunneled over MQTT**. The Eufy Security
Android app uses a dedicated `SecurityMqttManager` class (distinct from the platform-level
`EufyMqttManage`) to send BLE command frames to the lock through a cloud MQTT broker. The
lock maintains a persistent connection to this broker over Wi-Fi, receives the BLE frames,
and executes them as if they arrived over Bluetooth.

The critical insight is that the BLE command protocol (FF09 frames, AES-128-CBC encryption,
TLV payloads) is **identical** to the protocol used by T8506 and T8502 smart locks over
Bluetooth/P2P. The only difference is the transport layer — MQTT instead of P2P — and the
authentication chain required to obtain MQTT connection credentials.

### High-Level Architecture

```mermaid
flowchart TD
    HA[Home Assistant] --> Client[eufy-security-client]
    Client --> SMQTT[SecurityMQTTService]

    SMQTT --> Auth[Auth Chain]
    SMQTT --> Pub[MQTT Publish]
    SMQTT --> Sub[MQTT Subscribe]

    Auth --> EufyAPI["EufyHome API\n(3-step auth)"]
    EufyAPI --> Certs[mTLS Certs]

    Certs --> Broker
    Pub --> Broker
    Sub --> Broker

    Broker["security-mqtt-us.anker.com\n(EMQX5 Broker)"] --> WiFi[Wi-Fi / Cloud]
    WiFi --> Lock["T85D0 Lock\n(via Wi-Fi)"]
```

---

## 2. Authentication Chain

The MQTT broker requires mutual TLS (mTLS) authentication with X.509 client certificates.
These certificates are obtained through a **three-step authentication chain** that begins with
the **EufyHome API** (not the Security API).

The Security API's `cloud_token` (from `security-app.eufylife.com`) does **NOT** work on the
AIOT API — it returns `{"code": 26002, "msg": "token not exist"}`. Only the
`user_center_token` from the EufyHome API is accepted.

### Step 1: EufyHome Login

**Endpoint:** `POST https://home-api.eufylife.com/v1/user/email/login`

**Headers:**
```
Content-Type: application/json
category: Home
```

**Request Body:**
```json
{
  "client_id": "eufyhome-app",
  "client_secret": "GQCpr9dSp3uQpsOMgJ4xQ",
  "email": "<user_email>",
  "password": "<user_password>"
}
```

**Response (200 OK):**
```json
{
  "res_code": 0,
  "access_token": "<eufyhome_access_token>",
  "user_id": "643e0e4c-c8de-4c20-9d0e-96f0c5fa7b7a",
  "email": "user@example.com",
  "nick_name": "User Name",
  "ab": "US"
}
```

**Notes:**
- `res_code: 0` indicates success at this step.
- The `access_token` is a EufyHome session token — it is NOT the AIOT token and will NOT
  work directly on the AIOT API.
- The `user_id` is the EufyHome user ID in UUID format. It is distinct from the Security
  API `user_id`.

### Step 2: Get User Center Token

**Endpoint:** `GET https://home-api.eufylife.com/v1/user/user_center_info`

**Headers:**
```
Content-Type: application/json
category: Home
token: <access_token_from_step_1>
```

**Response (200 OK):**
```json
{
  "res_code": 1,
  "user_center_token": "<48_char_hex_string>",
  "user_center_id": "<40_char_hex_string>"
}
```

**Critical details:**
- `res_code: 1` is **success** at this endpoint (unlike Step 1 where `0` is success).
- `user_center_token` is the **AIOT authentication token**. This is the value that the
  encrypted `AccountDelegate.k()` method returns in the Android app's ijiami-protected code.
- `user_center_id` is **identical** to the Security API `user_id` (the 40-character hex
  hash). This shared identifier links the two authentication systems.

### Step 3: Get MQTT Certificates

**Endpoint:** `POST https://aiot-clean-api-pr.eufylife.com/app/devicemanage/get_user_mqtt_info`

**Method:** Must be POST (GET returns nothing useful).

**Headers:**
```
Content-Type: application/json
X-Auth-Token: <user_center_token_from_step_2>
GToken: <md5_hex_digest_of_user_center_id>
User-Agent: EufySecurity-Android-4.6.0-1630
category: eufy_security
App-name: eufy_security
openudid: <device_identifier>
language: en
country: <two_letter_country_code>
Os-version: Android
Model-type: PHONE
timezone: America/New_York
```

**Request Body:** `{}` (empty JSON object)

**Response (200 OK):**
```json
{
  "code": 0,
  "msg": "success!",
  "data": {
    "thing_name": "<user_center_id>-eufy_home",
    "endpoint_addr": "aiot-mqtt-us.anker.com",
    "certificate_pem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
    "aws_root_ca1_pem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "certificate_id": "137926761952696052801933895160865679090",
    "pkcs12": "<base64_encoded_pkcs12_bundle>"
  }
}
```

**Notes:**
- `GToken` is the MD5 hex digest of the `user_center_id` string.
- `thing_name` follows the pattern `{user_center_id}-eufy_home`.
- `endpoint_addr` is the **AIOT** MQTT broker hostname. However, locks are NOT on this
  broker — see Section 3 for the correct broker.
- `aws_root_ca1_pem` is actually the **Go Daddy Class 2 CA** certificate despite the
  field name suggesting Amazon Root CA. This appears to be a legacy field name from an
  infrastructure migration.
- Certificates are valid for approximately 10 years.
- The `pkcs12` field contains the same certificate and key as a PKCS#12 bundle.

### Authentication Flow Diagram

```mermaid
flowchart TD
    Creds["User Credentials\n(email + password)"]

    Creds --> Step1

    Step1["**Step 1:** POST home-api.eufylife.com\n/v1/user/email/login\n\nclient_id: eufyhome-app\nclient_secret: GQCpr9dSp3uQpsOMgJ4xQ\n\nReturns: **access_token**"]

    Step1 --> Step2

    Step2["**Step 2:** GET home-api.eufylife.com\n/v1/user/user_center_info\n\nHeader: token: access_token\n\nReturns: **user_center_token** (AIOT token!)\nuser_center_id"]

    Step2 --> Step3

    Step3["**Step 3:** POST aiot-clean-api-pr\n.eufylife.com/app/devicemanage/\nget_user_mqtt_info\n\nHeader: X-Auth-Token: user_center_token\nHeader: GToken: MD5(user_center_id)\n\nReturns: certificate_pem, private_key,\naws_root_ca1_pem, thing_name,\nendpoint_addr"]

    Step3 --> Ready["mTLS credentials ready"]
```

### What Does NOT Work as an AIOT Token

| Token Type | Source | AIOT API Response |
|------------|--------|-------------------|
| Security `cloud_token` | `security-app.eufylife.com` | `{"code": 26002, "msg": "token not exist"}` |
| EufyHome `access_token` | Step 1 | `{"code": 26003, "msg": "token error"}` |
| Tuya `sid` session | `px.tuyaus.com` | `{"code": 26003, "msg": "token error"}` |

Only the `user_center_token` from Step 2 is accepted.

---

## 3. MQTT Connection

### Broker Selection — Security vs. AIOT

There are **two separate MQTT brokers** in Eufy's infrastructure:

| Broker | Hostname | Purpose |
|--------|----------|---------|
| **Security MQTT** | `security-mqtt-{region}.anker.com` | Lock control (SecurityMqttManager) |
| **AIOT MQTT** | `aiot-mqtt-{region}.anker.com` | Platform IoT (EufyMqttManage) |

The `endpoint_addr` returned by `get_user_mqtt_info` points to the **AIOT** broker
(`aiot-mqtt-us.anker.com`). However, **lock topics only exist on the Security broker**
(`security-mqtt-us.anker.com`). The mTLS certificates work on both brokers, but you must
connect to the Security broker for lock control.

The Security broker is an **EMQX5** instance running on AWS (us-east-2):
- CNAME: `security-emqx5-us-prod-nlb-*.elb.us-east-2.amazonaws.com`

### Connection Parameters

| Parameter | Value |
|-----------|-------|
| **Host** | `security-mqtt-{region}.anker.com` (e.g., `security-mqtt-us.anker.com`) |
| **Port** | `8883` |
| **Protocol** | `mqtts` (MQTT over TLS with mutual authentication) |
| **Client Certificate** | `certificate_pem` from Step 3 |
| **Client Private Key** | `private_key` from Step 3 |
| **CA Certificate** | `aws_root_ca1_pem` from Step 3 |
| **TLS Verify** | `true` (broker certificate validates against `aws_root_ca1_pem`) |
| **Username** | `{thing_name}` from Step 3 (e.g., `{user_center_id}-eufy_home`) |
| **Password** | Empty |
| **Client ID** | `android-eufy_security-{user_center_id}-{openudid}{broker_host_no_dots_dashes}` |
| **Clean Session** | `true` |
| **Keep Alive** | `60` seconds |
| **QoS** | `1` |

### Client ID Construction

```
"android-eufy_security-"
  + user_center_id
  + "-"
  + openudid
  + broker_host.replace(/[.\-]/g, "")

Example:
  android-eufy_security-ff7c59...04e84-d5d1343a6cca9c78securitymqttusankercom
```

### Topic Patterns

For each lock device (identified by its serial number, e.g., `T85D0K1024470204`):

| Direction | Topic Pattern | Example |
|-----------|--------------|---------|
| Commands (app to lock) | `cmd/eufy_security/T85D0/{deviceSn}/req` | `cmd/eufy_security/T85D0/T85D0K1024470204/req` |
| Responses (lock to cloud) | `cmd/eufy_security/T85D0/{deviceSn}/res` | `cmd/eufy_security/T85D0/T85D0K1024470204/res` |
| Business events | `biz/eufy_security/T85D0/{deviceSn}/res` | `biz/eufy_security/T85D0/T85D0K1024470204/res` |
| Device parameters | `dt/eufy_security/T85D0/{deviceSn}/param_info` | `dt/eufy_security/T85D0/T85D0K1024470204/param_info` |

**Wildcard topics are denied** by broker ACL policy:
```
cmd/eufy_security/T85D0/#           DENIED
cmd/#                                DENIED
#                                    DENIED
```

You must subscribe to each device's topics individually.

### Region Mapping

The Security broker hostname is derived from the AIOT API base domain or endpoint:

| Region | AIOT Endpoint | Security Broker |
|--------|--------------|-----------------|
| US | `aiot-mqtt-us.anker.com` | `security-mqtt-us.anker.com` |
| EU | `aiot-mqtt-eu.anker.com` | `security-mqtt-eu.anker.com` |

---

## 4. MQTT Message Envelope

All MQTT messages use a **double-serialized JSON** structure: the outer message contains a
`head` object and a `payload` string. The `payload` string is itself a JSON-encoded object
that contains a `trans` field, which is a **base64-encoded** JSON string containing the
actual command or response data.

### App-to-Lock Command (publish to `/req`)

**Outer message:**
```json
{
  "head": {
    "version": "1.0.0.1",
    "client_id": "android-eufy_security-{userId}-{openudid}{brokerNoDots}",
    "sess_id": "56a7",
    "msg_seq": 1,
    "seed": "513aff33805d400d968546fab2517932",
    "timestamp": 1771171178,
    "cmd_status": 2,
    "cmd": 9,
    "sign_code": 0
  },
  "payload": "<stringified JSON>"
}
```

**Payload (JSON string, parsed):**
```json
{
  "account_id": "{userId}",
  "device_sn": "{deviceSn}",
  "trans": "<base64 string>"
}
```

**Trans (base64-decoded JSON):**
```json
{
  "cmd": 1940,
  "mChannel": 0,
  "mValue3": 0,
  "payload": {
    "apiCommand": 6018,
    "lock_payload": "ff096a00030002402300...",
    "seq_num": 1771170526,
    "time": 1771171195
  }
}
```

### Lock-to-Cloud Response (received on `/res`)

**Outer message:**
```json
{
  "head": {
    "version": "1.0.0.1",
    "client_id": "T85D0K10244822EB",
    "sess_id": "7117-1053",
    "msg_seq": 238,
    "seed": "null",
    "timestamp": 1771171053,
    "cmd_status": 1,
    "cmd": 8,
    "sign_code": 0
  },
  "payload": "<stringified JSON>"
}
```

**Payload (JSON string, parsed):**
```json
{
  "trans": "<base64 string>"
}
```

**Trans (base64-decoded JSON):**
```json
{
  "cmd": 1940,
  "payload": {
    "dev_sn": "T85D0K10244822EB",
    "lock_payload": "FF091100030102004A00A10117A20103BA",
    "time": "6991EC5F"
  }
}
```

### Field Differences: App vs. Device

| Field | App Command (req) | Device Response (res) |
|-------|-------------------|----------------------|
| `head.cmd` | `9` | `8` |
| `head.cmd_status` | `2` (send) | `1` (receive) |
| `head.client_id` | Client ID string | Device serial number |
| `head.seed` | 32-char random hex nonce | `"null"` (string literal) |
| `payload.account_id` | Present (user ID) | Absent |
| `trans.mChannel` | `0` | Absent |
| `trans.mValue3` | `0` | Absent |
| `trans.payload.apiCommand` | Command code (e.g., `6018`) | Absent |
| `trans.payload.seq_num` | Monotonic sequence number | Absent |
| `trans.payload.dev_sn` | Absent | Device serial number |

### Key Constants

| Field | Value | Meaning |
|-------|-------|---------|
| `head.cmd` | `9` | App-originated command |
| `head.cmd` | `8` | Device-originated response |
| `head.cmd_status` | `2` | Sending/publishing |
| `head.cmd_status` | `1` | Receiving |
| `trans.cmd` | `1940` | `CommandType.CMD_TRANSFER_PAYLOAD` — BLE payload transfer |
| `head.version` | `"1.0.0.1"` | Protocol version (constant) |
| `head.sign_code` | `0` | No signature (constant) |

---

## 5. BLE-over-MQTT Protocol (FF09 Frames)

The `lock_payload` field in the trans object contains a hex-encoded BLE frame. This is the
same frame format used for Bluetooth communication with T8506/T8502 smart locks, tunneled
through MQTT.

### FF09 Frame Byte Layout

```
Offset  Size  Field           Description
──────  ────  ─────           ───────────
0       1     Magic[0]        Always 0xFF
1       1     Magic[1]        Always 0x09
2       2     Length (LE)     Total frame length (header + data + checksum)
4       1     Version         3 = VERSION_CODE_SMART_LOCK
5       1     Direction       0x00 = from app, 0x01 = from device
6       1     Data Type       2 = SmartLockFunctionType.TYPE_2
7       2     Flags (BE)      Bit field encoding (see below)
9       N     Data            Ciphertext (if encrypted) or plaintext TLV
9+N     1     Checksum        XOR of all preceding bytes (offsets 0 through 8+N)
```

### Flags Field (uint16 big-endian at offset 7)

```
Bit  15     14        13-12     11        10-0
     ┌──┐  ┌──┐      ┌────┐   ┌──┐      ┌──────────┐
     |P |  |E |      |Rsvd|   |R |      |Command   |
     └──┘  └──┘      └────┘   └──┘      └──────────┘

P (bit 15): Partial — 1 = multi-part frame (fragmented BLE packet)
E (bit 14): Encrypted — 1 = data is AES-128-CBC encrypted
   (bits 13-12): Reserved / unused
R (bit 11): Response — 1 = response from lock, 0 = command to lock
Command (bits 10-0): SmartLockBleCommandFunctionType2 code
```

### Example Flag Values

| Flags (hex) | Binary | P | E | R | Command | Meaning |
|-------------|--------|---|---|---|---------|---------|
| `0x004A` | `0000 0000 0100 1010` | 0 | 0 | 0 | 74 | Unencrypted NOTIFY heartbeat |
| `0x4023` | `0100 0000 0010 0011` | 0 | 1 | 0 | 35 | Encrypted ON_OFF_LOCK command |
| `0x4823` | `0100 1000 0010 0011` | 0 | 1 | 1 | 35 | Encrypted ON_OFF_LOCK response |
| `0x4022` | `0100 0000 0010 0010` | 0 | 1 | 0 | 34 | Encrypted QUERY_STATUS command |
| `0x4822` | `0100 1000 0010 0010` | 0 | 1 | 1 | 34 | Encrypted QUERY_STATUS response |

### SmartLockBleCommandFunctionType2 Codes

These are the BLE command codes carried in bits 10-0 of the flags field, and their
corresponding API command numbers used in `trans.payload.apiCommand`:

| BLE Code | API Command | Enum Name | Purpose |
|----------|-------------|-----------|---------|
| 33 | 6017 | `CALIBRATE_LOCK` | Lock calibration |
| 34 | 6012 | `QUERY_STATUS_IN_LOCK` | Query battery and lock state |
| **35** | **6018** | **`ON_OFF_LOCK`** | **Lock or unlock** |
| 36 | 6002 | `ADD_PW` | Add password |
| 37 | 146 | `UPDATE_USER_TIME` | Update user time |
| 38 | 6014 | `UPDATE_PW` | Update password |
| 39 | 6009 | `QUERY_PW` | Query passwords |
| 40 | 6003 | `ADD_FINGER` | Add fingerprint |
| 41 | 115 | `CANCEL_ADD_FINGER` | Cancel fingerprint enrollment |
| 42 | 6006 | `DELETE_FINGER` | Delete fingerprint |
| 43 | 119 | `UPDATE_FINGER_NAME` | Rename fingerprint |
| 44 | 6007 | `QUERY_ALL_USERS` | List all users |
| 45 | 6004 | `DELETE_USER` | Delete user |
| 46 | 6022 | `GET_FINGER_PW_USAGE` | Fingerprint/password usage stats |
| 48 | 104 | `WIFI_SCAN` | Wi-Fi scan |
| 49 | 105 | `WIFI_LIST` | Wi-Fi network list |
| 50 | 106 | `WIFI_CONNECT` | Wi-Fi connect |
| 51 | 107 | `ACTIVATE_DEVICE` | Device activation |
| 52 | 6015 | `SET_LOCK_PARAM` | Set lock parameters |
| 53 | 6016 | `GET_LOCK_PARAM` | Get lock parameters |
| 56 | — | `GET_LOCK_EVENT` | Get lock event log |
| 61 | — | `PULL_BLE` | BLE pull |
| 74 | 142 | `NOTIFY` | Status heartbeat (unencrypted) |

### Checksum Calculation

The checksum byte is the XOR of all bytes from offset 0 through the last data byte
(everything except the checksum byte itself):

```typescript
function generateChecksum(data: Buffer): number {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum ^= data[i];
  }
  return checksum & 0xFF;
}
```

---

## 6. AES-128-CBC Encryption

Encrypted BLE frames (flags bit 14 = 1) use **AES-128-CBC** encryption. The key and IV are
derived from known values — no key exchange or DSK is required.

### Key Derivation (16 bytes)

The AES key is constructed by concatenating:
1. The **last 12 ASCII characters** of the `admin_user_id` (12 bytes)
2. The **current time** as a uint32 big-endian value (4 bytes)

```typescript
// src/p2p/utils.ts:909
export const generateSmartLockAESKey = (adminUserId: string, time: number): Buffer => {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUint32BE(time);
  return Buffer.concat([
    Buffer.from(adminUserId.substring(adminUserId.length - 12)),
    buffer
  ]);
};
```

**Example:**
```
admin_user_id = "ff7c594365c30f5618e1e4b5c34ea1ad70104e84"  (40 chars)
Last 12 chars = "a1ad70104e84"  (substring from index 28)
time          = 1771171195      (epoch seconds with random low bits)

Key (hex) = 61 31 61 64 37 30 31 30 34 65 38 34  69 91 EC 5B
            |--- "a1ad70104e84" as ASCII ------|  |-- time BE --|
```

### IV Derivation (16 bytes)

The IV is the **first 16 bytes** of the device serial number, encoded as UTF-8:

```typescript
// src/p2p/utils.ts:522
export const getLockVectorBytes = (data: string): string => {
  const encoder = new TextEncoder();
  const encData = encoder.encode(data);
  const old_buffer = Buffer.from(encData);
  if (encData.length >= 16) return old_buffer.toString("hex");
  // If SN is shorter than 16 chars, zero-pad to 16 bytes
  const new_buffer = Buffer.alloc(16);
  old_buffer.copy(new_buffer, 0);
  return new_buffer.toString("hex");
};
```

**Example:**
```
Device SN = "T85D0K1024470204"  (17 chars)
IV        = "T85D0K102447020"   (first 16 chars as ASCII bytes)
IV (hex)  = 54 38 35 44 30 4B 31 30 32 34 34 37 30 32 30 34
```

Note: `getLockVectorBytes` returns a **hex string** that is later converted to a Buffer with
`Buffer.from(iv, "hex")`.

### Time Generation

```typescript
// src/p2p/utils.ts:905
export const getSmartLockCurrentTimeInSeconds = function (): number {
  return Math.trunc(new Date().getTime() / 1000) | Math.trunc(Math.random() * 100);
};
```

The time value is the current epoch time in seconds with random low bits (0-99) OR'd in.
This same value is sent in `trans.payload.time` so the receiving end can reconstruct the
AES key for decryption.

### Encryption / Decryption

```typescript
// src/p2p/utils.ts:609
export const encryptPayloadData = (data: string | Buffer, key: Buffer, iv: Buffer): Buffer => {
  const cipher = createCipheriv("aes-128-cbc", key, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
};

// src/p2p/utils.ts:614
export const decryptPayloadData = (data: Buffer, key: Buffer, iv: Buffer): Buffer => {
  const cipher = createDecipheriv("aes-128-cbc", key, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
};
```

Standard PKCS#7 padding is used (Node.js default for AES-CBC).

---

## 7. Lock/Unlock Command (TLV Payload)

The plaintext data inside an encrypted ON_OFF_LOCK frame uses a **TLV (Tag-Length-Value)**
encoding scheme. Tags are sequential starting from `0xA1`.

### TLV Encoding

Each TLV entry is:
```
Tag (1 byte) | Length (1 byte) | Value (N bytes)
```

Tags increment sequentially: `0xA1`, `0xA2`, `0xA3`, `0xA4`, `0xA5`, ...

This is implemented by the `WritePayload` class:

```typescript
// src/http/utils.ts:385
export class WritePayload {
  private split_byte = -95;  // 0xA1 as signed int8
  private data = Buffer.from([]);

  public write(bytes: Buffer): void {
    const tmp_data = Buffer.from(bytes);
    this.data = Buffer.concat([
      this.data,
      Buffer.from([this.split_byte]),      // Tag
      Buffer.from([tmp_data.length & 255]), // Length
      tmp_data,                             // Value
    ]);
    this.split_byte += 1;  // Next tag: A2, A3, A4, ...
  }

  public getData(): Buffer {
    return this.data;
  }
}
```

### ON_OFF_LOCK TLV Fields

```typescript
// src/http/device.ts:5078
public static encodeCmdSmartLockUnlock(
  adminUserId: string,
  lock: boolean,
  username: string,
  shortUserId: string
): Buffer {
  const payload = new WritePayload();
  payload.write(this.getCurrentTimeInSeconds());    // A1: timestamp
  payload.write(Buffer.from(adminUserId));          // A2: admin user ID
  payload.write(this.getUInt8Buffer(lock ? 0 : 1)); // A3: lock command
  payload.write(Buffer.from(username));              // A4: display name
  payload.write(Buffer.from(shortUserId, "hex"));    // A5: short user ID
  return payload.getData();
}
```

### Field Details

| Tag | Name | Length | Format | Description |
|-----|------|--------|--------|-------------|
| `A1` | Timestamp | 4 | uint32 LE | Current time in seconds (from `getCurrentTimeInSeconds()`) |
| `A2` | Admin User ID | 40 | ASCII string | The `admin_user_id` from the station member data |
| `A3` | Lock Command | 1 | uint8 | `0x00` = **LOCK**, `0x01` = **UNLOCK** |
| `A4` | Username | varies | ASCII string | Display name of the user (e.g., `"nickpape"`) |
| `A5` | Short User ID | varies | Binary (hex-decoded) | The `short_user_id` from station member data, decoded from hex to raw bytes |

**Note:** The `lock` boolean parameter to `encodeCmdSmartLockUnlock` uses inverted logic:
`lock: true` maps to `0x00` (lock the door), `lock: false` maps to `0x01` (unlock the door).
This matches the Eufy convention where `true` = locked state.

### Example Plaintext (hex)

```
A1 04 <timestamp_4B_LE>
A2 28 <admin_user_id_40_ascii_chars>
A3 01 01                                    (unlock)
A4 08 <"nickpape" as ASCII>
A5 04 <short_user_id decoded from hex>
```

This plaintext is encrypted with AES-128-CBC, then wrapped in the FF09 BLE frame with
flags `0x4023` (encrypted=1, response=0, command=35/ON_OFF_LOCK).

---

## 8. Status Heartbeats

Locks periodically send **unencrypted** NOTIFY heartbeat frames on the `/res` topic. These
provide battery level and lock state without requiring any command from the app.

### Heartbeat Frame (Unencrypted)

```
Flags: 0x004A  (encrypted=0, response=0, command=74/NOTIFY)

Example hex: FF091100030102004A00A10117A20103BA

Byte-by-byte:
  FF 09     Magic header
  11 00     Length = 17 bytes (LE)
  03        Version = 3 (Smart Lock)
  01        Direction = from device
  02        Data Type = TYPE_2
  00 4A     Flags = 0x004A (NOTIFY, unencrypted)
  00        Return code = 0 (success)
  A1 01 17  Tag A1, len 1, value 0x17 = 23 (battery %)
  A2 01 03  Tag A2, len 1, value 0x03 = UNLOCKED
  BA        Checksum (XOR of all preceding bytes)
```

### Heartbeat TLV Fields

| Tag | Name | Length | Values |
|-----|------|--------|--------|
| `A1` | Battery | 1 | Percentage (0-100). Example: `0x17` = 23% |
| `A2` | Lock Status | 1 | `0x03` = **UNLOCKED**, `0x04` = **LOCKED** |

### Parsing Notes

- The data section begins with a **return code byte** (value `0x00` for success) before the
  TLV entries. When parsing, check if the first byte is less than `0xA0` — if so, skip it
  as a return code before processing TLV tags.
- Heartbeat frequency depends on the lock's configuration, but typically arrives every few
  minutes and immediately after any state change.

### Checksum Verification

```
FF ^ 09 ^ 11 ^ 00 ^ 03 ^ 01 ^ 02 ^ 00 ^ 4A ^ 00 ^ A1 ^ 01 ^ 17 ^ A2 ^ 01 ^ 03 = BA
```

---

## 9. Implementation Architecture

### SecurityMQTTService Class

The `SecurityMQTTService` class (`src/mqtt/security-mqtt.ts`) encapsulates the entire MQTT
communication layer. It is a `TypedEmitter` that exposes events for lock status and command
responses.

```typescript
export class SecurityMQTTService extends TypedEmitter<SecurityMQTTServiceEvents> {
  // Lifecycle
  connect(apiBase: string): Promise<void>
  close(): void
  isConnected(): boolean

  // Lock management
  subscribeLock(deviceSN: string): void
  publishLockCommand(
    userId: string,
    deviceSN: string,
    adminUserId: string,
    shortUserId: string,
    nickName: string,
    channel: number,
    sequence: number,
    lock: boolean,
  ): Promise<boolean>
}
```

### Events

```typescript
// src/mqtt/interface.ts
export interface SecurityMQTTServiceEvents {
  connect: () => void;
  close: () => void;
  "lock-status": (deviceSN: string, locked: boolean, battery: number) => void;
  "command-response": (deviceSN: string, success: boolean) => void;
}
```

### Event Routing Pattern

The integration follows an event-based routing pattern through three layers:

```mermaid
sequenceDiagram
    participant Station
    participant EufySecurity
    participant SecurityMQTTService

    Note over Station: Lock command requested

    Station->>EufySecurity: emit("security mqtt command",<br/>station, deviceSN, adminUserId,<br/>shortUserId, nickName, channel, seq, lock)

    EufySecurity->>SecurityMQTTService: onSecurityMqttCommand()<br/>calls publishLockCommand()

    Note over SecurityMQTTService: MQTT publish

    SecurityMQTTService->>EufySecurity: emit("lock-status")

    Note over EufySecurity: Updates device properties<br/>via rawStation property set
```

**Flow details:**

1. **Station** (`src/http/station.ts:8464-8483`): When a lock/unlock command is issued for a
   T85D0 device, the `Station` class detects `device.isLockWifiT85D0()` and emits the
   `"security mqtt command"` event instead of sending a P2P command.

2. **EufySecurity** (`src/eufysecurity.ts:849-861`): The main `EufySecurity` class listens
   for this event on all stations and routes it to `onSecurityMqttCommand()`, which calls
   `SecurityMQTTService.publishLockCommand()`.

3. **SecurityMQTTService** (`src/mqtt/security-mqtt.ts`): Constructs the BLE frame using
   existing utility functions, wraps it in the MQTT envelope, and publishes to the broker.

### Initialization

`SecurityMQTTService` is initialized during `EufySecurity` startup
(`src/eufysecurity.ts:1286-1287`) only if T85D0 devices are detected in the device list.
It runs the three-step auth chain, connects to the Security MQTT broker, and subscribes to
topics for each known T85D0 lock.

---

## 10. Existing Code Reuse

A key design principle of this implementation is that it reuses the **same BLE command
construction logic** used by T8506 and T8502 smart locks, which communicate over P2P/Bluetooth.
The only new code is the MQTT transport layer and authentication.

### Shared Functions

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `getSmartLockP2PCommand()` | `src/p2p/utils.ts` | 915 | Builds complete BLE command payload (key gen, encryption, FF09 frame) |
| `generateSmartLockAESKey()` | `src/p2p/utils.ts` | 909 | AES-128 key from admin_user_id + timestamp |
| `getSmartLockCurrentTimeInSeconds()` | `src/p2p/utils.ts` | 905 | Epoch seconds with random low bits |
| `getLockVectorBytes()` | `src/p2p/utils.ts` | 522 | IV from device serial number |
| `encryptPayloadData()` | `src/p2p/utils.ts` | 609 | AES-128-CBC encryption |
| `decryptPayloadData()` | `src/p2p/utils.ts` | 614 | AES-128-CBC decryption |
| `Lock.encodeCmdSmartLockUnlock()` | `src/http/device.ts` | 5078 | TLV payload for lock/unlock command |
| `Lock.getCurrentTimeInSeconds()` | `src/http/device.ts` | 4780 | uint32 LE timestamp buffer |
| `Lock.VERSION_CODE_SMART_LOCK` | `src/http/device.ts` | 4533 | Constant `3` — BLE version code |
| `BleCommandFactory` | `src/p2p/ble.ts` | 28 | Builds and parses FF09 BLE frames |
| `BleCommandFactory.parseSmartLock()` | `src/p2p/ble.ts` | 67 | Parses incoming FF09 frames |
| `BleCommandFactory.getSmartLockCommand()` | `src/p2p/ble.ts` | 275 | Serializes BLE frame to bytes |
| `WritePayload` | `src/http/utils.ts` | 385 | TLV builder (A1/A2/A3... tags) |
| `SmartLockBleCommandFunctionType2` | `src/p2p/types.ts` | 1245 | BLE command code enum |
| `SmartLockCommand` | `src/p2p/types.ts` | 1187 | API command code enum |
| `SmartLockP2PCommandPayloadType` | `src/p2p/models.ts` | 313 | Type for the trans payload structure |

### New Code (MQTT Transport Only)

| Component | File | Purpose |
|-----------|------|---------|
| `SecurityMQTTService` | `src/mqtt/security-mqtt.ts` | MQTT connection, auth, publish/subscribe |
| `SecurityMQTTServiceEvents` | `src/mqtt/interface.ts` | Event type definitions |
| Station T85D0 routing | `src/http/station.ts:8464-8483` | Emits `"security mqtt command"` for T85D0 |
| EufySecurity routing | `src/eufysecurity.ts:849-861` | Connects Station event to SecurityMQTTService |

### How `publishLockCommand` Reuses Existing Code

The `publishLockCommand` method demonstrates the reuse pattern:

```typescript
// 1. Build the BLE command using the same function used by T8506/T8502
const command = getSmartLockP2PCommand(
  deviceSN,
  adminUserId,
  SmartLockCommand.ON_OFF_LOCK,    // 6018
  channel,
  sequence,
  Lock.encodeCmdSmartLockUnlock(adminUserId, lock, nickName, shortUserId),
  SmartLockFunctionType.TYPE_2,
);

// 2. Extract the payload that would normally go to P2P
const transPayload: SmartLockP2PCommandPayloadType = JSON.parse(command.payload.value);

// 3. Wrap it in the MQTT envelope instead of sending via P2P
const trans = {
  cmd: transPayload.cmd,           // 1940
  mChannel: transPayload.mChannel, // 0
  mValue3: transPayload.mValue3,   // 0
  payload: transPayload.payload,   // { apiCommand, lock_payload, seq_num, time }
};
```

The only difference from the P2P path is the transport: instead of sending via the P2P
session, the payload is base64-encoded, wrapped in the MQTT JSON envelope, and published
to the MQTT broker.

---

## Appendix A: Complete Lock Command Example

Below is a step-by-step walkthrough of constructing a lock command (locking the front door).

### Given Values (placeholders)

```
admin_user_id = "ff7c594365c30f5618e1e4b5c34ea1ad70104e84"
device_sn     = "T85D0K1024470204"
username      = "nickpape"
short_user_id = "abcd1234"  (hex, 4 bytes when decoded)
```

### 1. Generate Time

```javascript
time = Math.trunc(Date.now() / 1000) | Math.trunc(Math.random() * 100);
// e.g., 1771171195
```

### 2. Build AES Key

```
Last 12 of admin_user_id: "a1ad70104e84"
time as uint32BE:          [0x69, 0x91, 0xEC, 0x5B]
AES key (16 bytes):        61 31 61 64 37 30 31 30 34 65 38 34 69 91 EC 5B
```

### 3. Build IV

```
First 16 chars of device_sn: "T85D0K102447020"
IV (16 bytes):  54 38 35 44 30 4B 31 30 32 34 34 37 30 32 30 34
```

### 4. Build TLV Plaintext

```
A1 04 <uint32LE of epoch seconds>    Timestamp
A2 28 <40 ASCII bytes of user_id>    Admin user ID
A3 01 00                             Lock (0x00 = lock, 0x01 = unlock)
A4 08 <"nickpape">                   Username
A5 04 <0xAB 0xCD 0x12 0x34>         Short user ID (hex decoded)
```

### 5. Encrypt with AES-128-CBC

```javascript
ciphertext = encryptPayloadData(plaintext, key, iv);
```

### 6. Build FF09 Frame

```
FF 09                     Magic header
XX 00                     Length (LE, total frame size)
03                        Version = 3 (Smart Lock)
00                        Direction = from app
02                        Data Type = TYPE_2
40 23                     Flags = 0x4023 (encrypted=1, command=35/ON_OFF_LOCK)
<ciphertext bytes>        Encrypted TLV
XX                        XOR checksum
```

### 7. Build MQTT Message

```json
{
  "head": {
    "version": "1.0.0.1",
    "client_id": "android-eufy_security-ff7c59...04e84-d5d134...securitymqttusankercom",
    "sess_id": "a3f1",
    "msg_seq": 1,
    "seed": "7b3c92a1d4f5e6b8c0a1d2e3f4a5b6c7",
    "timestamp": 1771171195,
    "cmd_status": 2,
    "cmd": 9,
    "sign_code": 0
  },
  "payload": "{\"account_id\":\"ff7c59...04e84\",\"device_sn\":\"T85D0K1024470204\",\"trans\":\"<base64>\"}"
}
```

### 8. Publish

```
Topic: cmd/eufy_security/T85D0/T85D0K1024470204/req
QoS: 1
```

---

## Appendix B: Extending to Other Lock Types

If other lock models (beyond T85D0) use the same Security MQTT broker for control, the
following would need to be determined for each model:

1. **Device type prefix** — Used in topic paths (e.g., `T85D0` in
   `cmd/eufy_security/T85D0/{sn}/req`). Other locks may use their own prefix.
2. **BLE protocol version** — The `Version` byte (offset 4) in the FF09 frame. Smart locks
   use `3` (`VERSION_CODE_SMART_LOCK`), but newer models may use a different version.
3. **Function type** — `SmartLockFunctionType.TYPE_1` vs `TYPE_2` affects command code
   mapping. T85D0 uses TYPE_2.
4. **Encryption scheme** — T85D0 uses AES-128-CBC with the standard key derivation. Some
   v12 locks use a different key derivation or ECDH-based keys.
5. **TLV field set** — The TLV tags for lock/unlock are the same across TYPE_2 locks, but
   other commands may differ.

The modular design — shared BLE frame construction, separate MQTT transport — means adding
a new lock type primarily involves updating the device detection logic
(`device.isLockWifiT85D0()` pattern) and potentially adjusting the topic prefix.
