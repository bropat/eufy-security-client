import type { StationListResponse } from "../http/models";
import { DeviceType } from "../http/types";
import {
  getRTCTransportConfig,
  getRTCTransportProfile,
  isRTCDeviceType,
  isRTCStationType,
  RTCTransportConfigError,
} from "./config";

const station = (overrides: Partial<StationListResponse> = {}): StationListResponse =>
  ({
    station_sn: "T7000000000000000",
    device_type: DeviceType.NVR_T7000,
    app_conn: "opaque-app-connection",
    p2p_did: "opaque-did",
    p2p_license: "opaque-license",
    webrtc_sdk_version: "7.1.4",
    signaling_servers: ["https://webrtc-signal-us.eufylife.com", "https://13.248.157.102"],
    member: { admin_user_id: "account-id" },
    ...overrides,
  }) as StationListResponse;

describe("RTC transport discovery", () => {
  it("recognizes the T7000 and T7100 family", () => {
    expect(isRTCDeviceType(DeviceType.NVR_T7000)).toBe(true);
    expect(isRTCDeviceType(DeviceType.CAMERA_POE_T7100)).toBe(true);
    expect(isRTCDeviceType(DeviceType.NVR_S4_MAX)).toBe(false);
    expect(isRTCStationType(DeviceType.NVR_T7000)).toBe(true);
    expect(isRTCStationType(DeviceType.CAMERA_POE_T7100)).toBe(false);
    expect(getRTCTransportProfile(DeviceType.NVR_T7000)).toMatchObject({
      inventoryRole: "station",
      signalingDeviceType: "NVR",
      signalingRequestType: "nvr",
    });
  });

  it("extracts and normalizes discovered signaling inputs", () => {
    const result = getRTCTransportConfig(
      station({
        signaling_servers: [
          "https://webrtc-signal-us.eufylife.com/path?ignored=1",
          "https://webrtc-signal-us.eufylife.com",
          "ftp://invalid.example.com",
        ],
      })
    );

    expect(result?.stationSerial).toBe("T7000000000000000");
    expect(result?.sdkVersion).toBe("7.1.4");
    expect(result?.signalingRequestType).toBe("nvr");
    expect(result?.signalingServers.map((server) => server.href)).toEqual(["https://webrtc-signal-us.eufylife.com/"]);
  });

  it("does not select RTC for a legacy station", () => {
    expect(getRTCTransportConfig(station({ device_type: DeviceType.NVR_S4_MAX }))).toBeUndefined();
  });

  it("rejects incomplete RTC discovery data", () => {
    expect(() => getRTCTransportConfig(station({ signaling_servers: [] }))).toThrow(RTCTransportConfigError);
  });
});
