# Mega RTC transport

## Why this transport exists

Some devices discovered by the Eufy Mega (`eufy_mega`) backend do not accept
the legacy station P2P transport. The T7000 NVR and its T7100 PoE cameras are
the first verified family with this behavior. Treating their numeric device
types as an older NVR family is insufficient: discovery may succeed, but the
legacy media connection times out.

This implementation adds RTC as another station transport. It does not replace
the existing P2P implementation and it is not a general rewrite of the client
around the Mega API.

## Design

The implementation is split into reusable layers:

| Layer | Responsibility |
| --- | --- |
| `MegaTransition` | Reuses the authenticated v6 session and fetches the encrypted Mega inventory. |
| `megaInventory` | Overlays only registered RTC stations and their children onto legacy inventory. |
| `rtc/config` | Maps device types to small transport profiles and validates cloud-discovered inputs. |
| `rtc/signaling` | Handles signing, authenticated WebSocket signaling, TURN, SDP, and ICE. |
| `rtc/session` | Owns peer/data-channel lifecycle, media commands, heartbeats, and sensor selection. |
| `rtc/frame`, `rtc/media`, `rtc/sdp` | Parse and encode protocol units without depending on device models. |
| `rtc/fec` | Adapts an externally supplied SCTP/FEC runtime behind a narrow interface. |
| `Station` | Selects RTC or legacy P2P while preserving the existing event surface. |

Device-family differences live in `RTC_TRANSPORT_PROFILES`. A profile declares
whether a record is a station or child camera, supplies the signaling
device/request types, and selects station- or device-scoped signaling. Inventory
and signaling consume the profile instead of adding their own model checks.

Station-scoped signaling authenticates and calls the NVR without a child
`subSn` or channel; the later media command selects the physical camera and
sensor. Device-scoped signaling is available for families whose signaling
service requires those fields.

## Consumer API

Existing single-sensor calls remain unchanged because sensor `0` is the
default:

```typescript
await client.startStationLivestream(deviceSerial);
await client.stopStationLivestream(deviceSerial);
```

For a multi-sensor RTC camera, select the sensor explicitly:

```typescript
const sensor = 1;

client.on(
  "station livestream start",
  (station, device, metadata, video, audio, startedSensor) => {
    if (device.getSerial() === deviceSerial && startedSensor === sensor) {
      video.pipe(videoConsumer);
      audio.pipe(audioConsumer);
    }
  }
);

await client.startStationLivestream(deviceSerial, sensor);
// Later:
await client.stopStationLivestream(deviceSerial, sensor);
```

The `sensor` value is also included on station livestream start, stop, and
error events. Consumers that ignore the additional optional event argument
remain compatible.

Low-level consumers can inspect `station.getRTCTransportConfig()` or create an
authenticated signal client through `client.getRTCSignalClient(deviceSerial)`.
Credentials and signing values are intentionally obtained from the active Mega
session and are never accepted as static configuration. The factory binds the
device serial and channel to the signaling call; sensor selection remains in
the later media command so the responsibilities stay separate.

## Runtime requirements

RTC peer connections use `node-datachannel`. The Eufy media data channels also
require an SCTP/FEC runtime compatible with the interface in `rtc/fec.ts`.
That runtime is not included in this repository.

Set both paths before starting a media session:

```bash
export EUFY_SECURITY_RTC_SCTP_MODULE=/absolute/path/to/libsctp.js
export EUFY_SECURITY_RTC_SCTP_WASM=/absolute/path/to/libsctp.wasm
```

Do not publish proprietary application assets, account tokens, signaling
signatures, TURN passwords, device serials, or packet captures. Applications
should verify locally supplied runtimes with checksums and keep them outside
source control.

## Adding another RTC family

1. Add the observed numeric types to `DeviceType`.
2. Add station and camera entries to `RTC_TRANSPORT_PROFILES`.
3. Add only the property and command mappings verified for that family.
4. Confirm the Mega inventory provides `app_conn`, `p2p_did`, `p2p_license`,
   `webrtc_sdk_version`, and at least one HTTPS signaling server.
5. Add profile/config, inventory, signaling, frame, and media tests using
   synthetic identifiers and reserved example addresses.
6. Run formatting, the complete unit suite, and an opt-in hardware smoke test.

Do not add a device to the registry solely because it has a similar product
name. Transport selection must be based on observed cloud metadata and a
successful signaling/media trace.

## Failure behavior and compatibility

- Incomplete RTC discovery disables RTC for that station and logs the missing
  field names without logging their values.
- A Mega inventory failure leaves the legacy inventory intact.
- Registered RTC stations do not attempt legacy P2P connections.
- Sessions are keyed by channel and sensor, allowing independent streams.
- PTZ over RTC requires the corresponding media session to be active.
- Closing a station stops all of its RTC sessions and timers.

The current implementation is verified only for the T7000/T7100 family. It
should be described as experimental until it has broader device and firmware
coverage.
