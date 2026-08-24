import type { StationListResponse } from "../http/models";
import { DeviceType } from "../http/types";

export type RTCInventoryRole = "station" | "camera";
export type RTCSignalingScope = "station" | "device";

/**
 * Device-family differences that are required before a media session starts.
 *
 * Keep them in this registry so inventory, signaling, and future RTC device
 * support do not grow independent device-type conditionals.
 */
export interface RTCTransportProfile {
  inventoryRole: RTCInventoryRole;
  signalingDeviceType: string;
  signalingRequestType: string;
  signalingScope: RTCSignalingScope;
}

export const RTC_TRANSPORT_PROFILES: ReadonlyMap<number, Readonly<RTCTransportProfile>> = new Map([
  [
    DeviceType.NVR_T7000,
    {
      inventoryRole: "station",
      signalingDeviceType: "NVR",
      signalingRequestType: "nvr",
      signalingScope: "station",
    },
  ],
  [
    DeviceType.CAMERA_POE_T7100,
    {
      inventoryRole: "camera",
      signalingDeviceType: "NVR",
      signalingRequestType: "nvr",
      signalingScope: "station",
    },
  ],
]);

export interface RTCTransportConfig {
  stationSerial: string;
  deviceType: number;
  accountId: string;
  appConnection: string;
  p2pDid: string;
  p2pLicense: string;
  sdkVersion: string;
  signalingServers: ReadonlyArray<URL>;
  signalingDeviceType: string;
  signalingRequestType: string;
  signalingScope: RTCSignalingScope;
}

export class RTCTransportConfigError extends Error {
  constructor(
    message: string,
    public readonly stationSerial: string
  ) {
    super(message);
    this.name = "RTCTransportConfigError";
  }
}

export const getRTCTransportProfile = (deviceType: number): Readonly<RTCTransportProfile> | undefined =>
  RTC_TRANSPORT_PROFILES.get(deviceType);

export const isRTCDeviceType = (deviceType: number): boolean => getRTCTransportProfile(deviceType) !== undefined;

export const isRTCStationType = (deviceType: number): boolean =>
  getRTCTransportProfile(deviceType)?.inventoryRole === "station";

const normalizeSignalingServers = (servers: unknown): Array<URL> => {
  if (!Array.isArray(servers)) return [];

  const result = new Map<string, URL>();
  for (const value of servers) {
    if (typeof value !== "string" || value.trim() === "") continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username !== "" || url.password !== "") continue;
      url.pathname = "";
      url.search = "";
      url.hash = "";
      result.set(url.origin, url);
    } catch {
      // Invalid discovery entries are ignored; at least one valid server is required below.
    }
  }
  return [...result.values()];
};

/**
 * Extract the cloud-discovered inputs consumed by Eufy's RTC SDK.
 *
 * This intentionally contains no defaults for credentials or signaling hosts. They are scoped to
 * the account and region and must come from the v6 device inventory.
 */
export const getRTCTransportConfig = (station: StationListResponse): RTCTransportConfig | undefined => {
  const profile = getRTCTransportProfile(station.device_type);
  if (!profile) return undefined;

  const signalingServers = normalizeSignalingServers(station.signaling_servers);
  const missing: Array<string> = [];
  if (!station.app_conn) missing.push("app_conn");
  if (!station.p2p_did) missing.push("p2p_did");
  if (!station.p2p_license) missing.push("p2p_license");
  if (!station.webrtc_sdk_version) missing.push("webrtc_sdk_version");
  if (signalingServers.length === 0) missing.push("signaling_servers");

  if (missing.length > 0) {
    throw new RTCTransportConfigError(
      `RTC discovery data is incomplete (missing ${missing.join(", ")})`,
      station.station_sn
    );
  }

  return {
    stationSerial: station.station_sn,
    deviceType: station.device_type,
    accountId: station.member?.admin_user_id ?? "",
    appConnection: station.app_conn,
    p2pDid: station.p2p_did,
    p2pLicense: station.p2p_license,
    sdkVersion: station.webrtc_sdk_version!,
    signalingServers,
    signalingDeviceType: profile.signalingDeviceType,
    signalingRequestType: profile.signalingRequestType,
    signalingScope: profile.signalingScope,
  };
};
