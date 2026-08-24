import type { MegaHTTPApi } from "../http/megaApi";
import { createRTCSignalClient } from "./factory";

describe("RTC signal client factory", () => {
  it("binds discovered signaling to the authenticated v6 session", async () => {
    const megaApi = {
      getRTCAuth: jest.fn(() => ({
        authToken: "token-local",
        globalToken: "global-local",
        country: "us",
      })),
      getRTCSign: jest.fn(async () => "sign-local"),
      getRTCSmartOrigin: jest.fn(() => new URL("https://smart.example.test")),
    } as unknown as MegaHTTPApi;

    const client = createRTCSignalClient(
      megaApi,
      {
        stationSerial: "station-local",
        deviceType: 310,
        accountId: "account-local",
        appConnection: "app-local",
        p2pDid: "did-local",
        p2pLicense: "license-local",
        sdkVersion: "1.0",
        signalingServers: [new URL("https://signal.example.test")],
        signalingDeviceType: "NVR",
        signalingRequestType: "nvr",
      },
      "camera-local",
      2
    );

    expect(client).toBeDefined();
    expect(megaApi.getRTCAuth).toHaveBeenCalledTimes(1);
  });
});
