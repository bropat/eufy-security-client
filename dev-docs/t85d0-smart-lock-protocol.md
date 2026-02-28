# T85D0 Smart Lock C30 — MQTT Control Protocol Specification

> **Status:** Implemented and verified
> **Applies to:** Eufy Smart Lock C30 (device type `T85D0`)
> **Implementation:** `src/mqtt/security-mqtt.ts`

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication Chain](#2-authentication-chain)
3. [MQTT Connection](#3-mqtt-connection)
4. [MQTT Message Envelope](#4-mqtt-message-envelope)
5. [Status Heartbeats](#5-status-heartbeats)
6. [Implementation Architecture](#6-implementation-architecture)

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

    Auth --> AIOT["AIOT cert endpoint<br/>(Security API auth_token)"]
    AIOT --> Certs[mTLS Certs]

    Certs --> Broker
    Pub --> Broker
    Sub --> Broker

    Broker["security-mqtt-us.anker.com<br/>(EMQX5 Broker)"] --> WiFi[Wi-Fi / Cloud]
    WiFi --> Lock["T85D0 Lock<br/>(via Wi-Fi)"]
```

---

## 2. Authentication Chain

The MQTT broker requires mutual TLS (mTLS) authentication with X.509 client certificates.
These certificates are obtained from the **AIOT certificate endpoint** using the existing
Security API `auth_token` and `user_id` — no additional login is required.

### Get MQTT Certificates

**Endpoint:** `POST https://aiot-clean-api-pr.eufylife.com/app/devicemanage/get_user_mqtt_info`

**Headers:**
```
Content-Type: application/json
X-Auth-Token: <auth_token from Security API login_sec>
GToken: <md5_hex_digest_of_user_id>
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
    "thing_name": "<user_id>-eufy_home",
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
- `GToken` is the MD5 hex digest of the `user_id` string (the 40-char hex hash from the Security API).
- `thing_name` follows the pattern `{user_id}-eufy_home`.
- `endpoint_addr` is the **AIOT** MQTT broker hostname. However, locks are NOT on this
  broker — see Section 3 for the correct broker.
- `aws_root_ca1_pem` is actually the **Go Daddy Class 2 CA** certificate despite the
  field name suggesting Amazon Root CA. This appears to be a legacy field name from an
  infrastructure migration.
- Certificates are valid for approximately 10 years.

### Authentication Flow Diagram

```mermaid
sequenceDiagram
    participant Client as eufy-security-client
    participant SecAPI as security-app.eufylife.com
    participant AIOT as aiot-clean-api-pr.eufylife.com

    Note over Client,SecAPI: Existing login (already done by HTTPApi)
    Client->>SecAPI: POST /v2/login/sec
    SecAPI-->>Client: auth_token + user_id

    Note over Client,AIOT: MQTT cert fetch (SecurityMQTTService)
    Client->>AIOT: POST /app/devicemanage/get_user_mqtt_info<br/>X-Auth-Token: auth_token<br/>GToken: MD5(user_id)
    AIOT-->>Client: certificate_pem, private_key,<br/>aws_root_ca1_pem, thing_name

    Note over Client: mTLS credentials ready
```

> **Implementation note:** The Android APK uses a longer auth path. Its `SecurityMqttManager`
> goes: EufyHome login (`home-api.eufylife.com`) -> `access_token` -> `user_center_token` ->
> AIOT certs (3 steps). During testing we discovered the AIOT cert endpoint accepts any valid
> Eufy auth token for the user, not just the `user_center_token`. Since eufy-security-client
> already has the Security API `auth_token` + `user_id` from its existing login, we skip the
> EufyHome chain entirely.
>
> Note: the `cloud_token` (a stored/persistent token) does **not** work — only the fresh
> `auth_token` from `login_sec` is accepted. This distinction led to the initial incorrect
> conclusion during APK reverse engineering that a separate EufyHome login was required.

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

## 5. Status Heartbeats

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

## 6. Implementation Architecture

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
It fetches mTLS certs using the existing Security API `auth_token`, connects to the Security
MQTT broker, and subscribes to topics for each known T85D0 lock.

---

### BLE Protocol Reuse

The BLE command protocol (FF09 frames, AES-128-CBC encryption, TLV payloads) is **identical**
to the T8506/T8502 smart lock protocol already implemented in `src/p2p/ble.ts` and
`src/p2p/utils.ts`. The only new code in this PR is the MQTT transport layer — all BLE frame
construction, encryption, and command encoding is reused from the existing codebase.

---

## Appendix: Extending to Other Lock Types

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
