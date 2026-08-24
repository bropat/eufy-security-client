import type { MegaHTTPApi } from "../http/megaApi";
import { createRTCSignalClient } from "./factory";

describe("RTC signal client factory", () => {
  const megaApi = (): MegaHTTPApi =>
    ({
      getRTCAuth: jest.fn(() => ({
        authToken: "token-local",
        globalToken: "global-local",
        country: "us",
      })),
      getRTCSign: jest.fn(async () => "sign-local"),
      getRTCSmartOrigin: jest.fn(() => new URL("https://smart.example.test")),
    }) as unknown as MegaHTTPApi;

  const config = {
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
  } as const;

  type InternalOptions = { options: { deviceSerial?: string; channel?: number } };

  it("uses station-scoped signaling without leaking child targeting fields", () => {
    const api = megaApi();

    const client = createRTCSignalClient(
      api,
      {
        ...config,
        signalingScope: "station",
      },
      "camera-local",
      2
    );

    expect(client).toBeDefined();
    expect(api.getRTCAuth).toHaveBeenCalledTimes(1);
    expect((client as unknown as InternalOptions).options).toMatchObject({ channel: 0 });
    expect((client as unknown as InternalOptions).options.deviceSerial).toBeUndefined();
  });

  it("preserves child targeting for device-scoped profiles", () => {
    const client = createRTCSignalClient(
      megaApi(),
      {
        ...config,
        signalingScope: "device",
      },
      "camera-local",
      2
    );

    expect((client as unknown as InternalOptions).options).toMatchObject({
      deviceSerial: "camera-local",
      channel: 2,
    });
  });
});
