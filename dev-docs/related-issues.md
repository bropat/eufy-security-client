# Issues Addressable by the Security MQTT Approach

Research into open issues across `bropat/eufy-security-client`, `fuatakgun/eufy_security`, and `bropat/eufy-security-ws` that could be addressed by the MQTT-based lock control introduced in this PR.

---

## Table 1 — Issues

### Direct T85D0 / Smart Lock C30 Issues

| Repo | Issue | Summary |
|------|-------|---------|
| bropat/eufy-security-client | [#617](https://github.com/bropat/eufy-security-client/issues/617) | T85D0 support request — empty commands array, no features. Nick-pape's original research issue |
| bropat/eufy-security-client | [#733](https://github.com/bropat/eufy-security-client/issues/733) | T85D0 support request — labeled "need hardware or access" |
| bropat/eufy-security-client | [#654](https://github.com/bropat/eufy-security-client/issues/654) | C30/T85D0 support — user offered $50 AUD bounty |
| bropat/eufy-security-client | [#575](https://github.com/bropat/eufy-security-client/issues/575) | T85D0 lock addition — wants lock status + battery |
| bropat/eufy-security-client | [#574](https://github.com/bropat/eufy-security-client/issues/574) | C30 Smart Lock support request |
| bropat/eufy-security-client | [#556](https://github.com/bropat/eufy-security-client/issues/556) | C30 lock support — community +1s |
| bropat/eufy-security-client | [PR #709](https://github.com/bropat/eufy-security-client/pull/709) | Adds C30 + E330 — battery/status works but **C30 lock/unlock missing** because no MQTT support |
| fuatakgun/eufy_security | [#1381](https://github.com/fuatakgun/eufy_security/issues/1381) | T85D0 has no working entities, only debug sensors |
| fuatakgun/eufy_security | [#1394](https://github.com/fuatakgun/eufy_security/issues/1394) | T85D0 — ws addon pulls data but nothing translates to HA entities |
| fuatakgun/eufy_security | [#1254](https://github.com/fuatakgun/eufy_security/issues/1254) | T85D0 — device type 202, debug properties only, no commands |
| fuatakgun/eufy_security | [#1227](https://github.com/fuatakgun/eufy_security/issues/1227) | C30 detected but only "Debug" sensors, no lock/unlock |
| fuatakgun/eufy_security | [#1365](https://github.com/fuatakgun/eufy_security/issues/1365) | Proposes all T85* models share base lock config |
| bropat/eufy-security-ws | [#389](https://github.com/bropat/eufy-security-ws/issues/389) | T85D0 lock/unlock request — redirected to client repo |

### C33 / T85L0 — Key MQTT Confirmation Issue

| Repo | Issue | Summary |
|------|-------|---------|
| bropat/eufy-security-client | [#526](https://github.com/bropat/eufy-security-client/issues/526) | **KEY ISSUE** — bropat confirmed C33 does NOT use P2P, only MQTTS (`security-mqtt-us.anker.com`). Nick-pape posted MQTT breakthrough here |
| bropat/eufy-security-client | [#581](https://github.com/bropat/eufy-security-client/issues/581) | T85L0/C33 — large community interest, many +1s, only debug entities |
| bropat/eufy-security-client | [#641](https://github.com/bropat/eufy-security-client/issues/641) | C33 WiFi lock — entities visible but none functional |
| bropat/eufy-security-client | [PR #528](https://github.com/bropat/eufy-security-client/pull/528) | Draft PR adding C33 type — incomplete, no MQTT control |
| fuatakgun/eufy_security | [#1346](https://github.com/fuatakgun/eufy_security/issues/1346) | C33 lock support request |
| fuatakgun/eufy_security | [#1182](https://github.com/fuatakgun/eufy_security/issues/1182) | T85L0 detected but not working |
| fuatakgun/eufy_security | [#1220](https://github.com/fuatakgun/eufy_security/issues/1220) | T85L0/C33 support request |
| bropat/eufy-security-ws | [#432](https://github.com/bropat/eufy-security-ws/issues/432) | T85L0 shows up in ws but no lock entity in HA |

### Other T85* Locks Likely Needing MQTT

| Repo | Issue | Summary |
|------|-------|---------|
| bropat/eufy-security-client | [#578](https://github.com/bropat/eufy-security-client/issues/578) | **C34 / T85D2** — shows in HA, no lock entities |
| bropat/eufy-security-client | [#572](https://github.com/bropat/eufy-security-client/issues/572) | **E31 / T85F0** — fingerprint lock not working |
| bropat/eufy-security-client | [#597](https://github.com/bropat/eufy-security-client/issues/597) | **E30 / T85F1** — API shows `p2p_did: ""`, `dsk_key: ""` (confirms no P2P) |
| bropat/eufy-security-client | [#652](https://github.com/bropat/eufy-security-client/issues/652) | **E30** — device_type 206, empty p2p_did/dsk_key |
| fuatakgun/eufy_security | [#1338](https://github.com/fuatakgun/eufy_security/issues/1338) | **E31 / T85F0** — only debug entities, no controls |
| bropat/eufy-security-client | [#644](https://github.com/bropat/eufy-security-client/issues/644) | **E31 WiFi Lock** — only debug entities |
| fuatakgun/eufy_security | [#1432](https://github.com/fuatakgun/eufy_security/issues/1432) | **S3 Max / T85V0** — extensive community debugging, fork with fixes |
| fuatakgun/eufy_security | [#1389](https://github.com/fuatakgun/eufy_security/issues/1389) | **FamiLock S3 / T85V0** — P2P mode camera request |

### Possibly Related (C210 MQTT?)

| Repo | Issue | Summary |
|------|-------|---------|
| bropat/eufy-security-client | [#618](https://github.com/bropat/eufy-security-client/issues/618) | C210 lock/unlock fails — `lock.lock()` not available, discussion suggests it may also need MQTT |

---

## Table 2 — Locks

| Lock | Model | DeviceType | Transport | Issue Links | Notes |
|------|-------|-----------|-----------|-------------|-------|
| **Smart Lock C30** | T85D0 | 202 | **Security MQTT** | [client#617](https://github.com/bropat/eufy-security-client/issues/617), [client#733](https://github.com/bropat/eufy-security-client/issues/733), [client#654](https://github.com/bropat/eufy-security-client/issues/654), [client#575](https://github.com/bropat/eufy-security-client/issues/575), [client#574](https://github.com/bropat/eufy-security-client/issues/574), [client#556](https://github.com/bropat/eufy-security-client/issues/556), [PR#709](https://github.com/bropat/eufy-security-client/pull/709), [ha#1381](https://github.com/fuatakgun/eufy_security/issues/1381), [ha#1394](https://github.com/fuatakgun/eufy_security/issues/1394), [ha#1254](https://github.com/fuatakgun/eufy_security/issues/1254), [ha#1227](https://github.com/fuatakgun/eufy_security/issues/1227), [ha#1365](https://github.com/fuatakgun/eufy_security/issues/1365) | **This PR directly solves this.** Same BLE protocol as T8506/T8502 but over MQTT. Verified working on 2 locks. |
| **Smart Lock C33** | T85L0 | ? | **Security MQTT** | [client#526](https://github.com/bropat/eufy-security-client/issues/526), [client#581](https://github.com/bropat/eufy-security-client/issues/581), [client#641](https://github.com/bropat/eufy-security-client/issues/641), [PR#528](https://github.com/bropat/eufy-security-client/pull/528), [ha#1346](https://github.com/fuatakgun/eufy_security/issues/1346), [ha#1182](https://github.com/fuatakgun/eufy_security/issues/1182), [ha#1220](https://github.com/fuatakgun/eufy_security/issues/1220), [ws#432](https://github.com/bropat/eufy-security-ws/issues/432) | **bropat confirmed MQTT-only** in #526. Lever-style lock. Highest community demand after C30. Likely same MQTT broker, needs topic prefix + type verification. |
| **Smart Lock C34** | T85D2 | ? | **Likely MQTT** | [client#578](https://github.com/bropat/eufy-security-client/issues/578) | Shows in HA, no lock entities. Same T85D* family as C30 — very likely same MQTT transport. |
| **Smart Lock E30** | T85F1 | 206 | **Likely MQTT** | [client#597](https://github.com/bropat/eufy-security-client/issues/597), [client#652](https://github.com/bropat/eufy-security-client/issues/652) | API confirms `p2p_did: ""` and `dsk_key: ""` — no P2P possible. Almost certainly MQTT. |
| **Smart Lock E31** | T85F0 | ? | **Likely MQTT** | [client#572](https://github.com/bropat/eufy-security-client/issues/572), [client#644](https://github.com/bropat/eufy-security-client/issues/644), [ha#1338](https://github.com/fuatakgun/eufy_security/issues/1338) | WiFi fingerprint lock. Only debug entities. T85F* family likely MQTT. |
| **FamiLock S3 Max** | T85V0 | ? | **Likely MQTT + P2P camera** | [ha#1432](https://github.com/fuatakgun/eufy_security/issues/1432), [ha#1389](https://github.com/fuatakgun/eufy_security/issues/1389) | Smart lock + doorbell camera combo. Lock control may need MQTT; camera uses P2P. Community fork with partial fixes exists. |
| **Smart Lock C210** | T8502 | 180 | P2P (but broken?) | [client#618](https://github.com/bropat/eufy-security-client/issues/618) | Supposedly P2P-supported but `lock.lock()` unavailable for some users. May have firmware variants needing MQTT? |

---

## Summary

This PR directly resolves **~13 open issues** for the T85D0/C30. The same MQTT architecture could extend to **5 more lock models** (C33, C34, E30, E31, S3 Max) covering **~15+ additional open issues** — primarily by updating `usesSecurityMqtt()` and adjusting the MQTT topic prefix per model. The C33 (T85L0) is the most confirmed candidate since bropat explicitly stated it uses the same `security-mqtt-us.anker.com` broker.
