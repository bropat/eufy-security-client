import type { MegaHTTPApi } from "../http/megaApi";
import type { RTCTransportConfig } from "./config";
import { RTCSignalClient } from "./signaling";

export const createRTCSignalClient = (
  megaApi: MegaHTTPApi,
  config: RTCTransportConfig,
  deviceSerial = "",
  channel = 0
): RTCSignalClient => {
  const endpoint = megaApi.getRTCSmartOrigin();
  const auth = megaApi.getRTCAuth();

  return new RTCSignalClient({
    endpoint,
    stationSerial: config.stationSerial,
    deviceSerial,
    channel,
    accountId: config.accountId,
    authToken: auth.authToken,
    globalToken: auth.globalToken,
    country: auth.country,
    signalingDeviceType: config.signalingDeviceType,
    signalingRequestType: config.signalingRequestType,
    getSign: () => megaApi.getRTCSign(endpoint),
  });
};
