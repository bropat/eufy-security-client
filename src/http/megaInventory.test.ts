import type { FullDevices, Hubs } from "./interfaces";
import type { MegaDeviceInventory } from "./megaInterfaces";
import { mergeMegaInventory } from "./megaInventory";
import { DeviceType } from "./types";

describe("mergeMegaInventory", () => {
  it("adds a T7000 station and only its children", () => {
    const inventory: MegaDeviceInventory = {
      devices: [
        {
          device_sn: "T7000-STATION",
          device_name: "NVR",
          device_model: "T7000",
          device_type: DeviceType.NVR_T7000,
          device_channel: 0,
          app_conn: "opaque",
          p2p_did: "did",
          p2p_license: "license",
          signaling_servers: ["https://signal.example.com"],
          webrtc_sdk_version: "7.1.4",
        },
        {
          device_sn: "T7100-CAMERA",
          device_name: "PoE camera",
          device_model: "T7100",
          device_type: DeviceType.CAMERA_POE_T7100,
          device_channel: 1,
          parent_sn: "T7000-STATION",
        },
        {
          device_sn: "OTHER",
          device_name: "Unrelated",
          device_model: "OTHER",
          device_type: 999,
          device_channel: 0,
        },
      ],
    };

    const result = mergeMegaInventory({} as Hubs, {} as FullDevices, inventory);

    expect(result.hubs["T7000-STATION"].station_model).toBe("T7000");
    expect(result.hubs["T7000-STATION"].signaling_servers).toEqual(["https://signal.example.com"]);
    expect(result.devices["T7100-CAMERA"].station_sn).toBe("T7000-STATION");
    expect(result.devices.OTHER).toBeUndefined();
  });

  it("preserves legacy-only fields while refreshing RTC discovery", () => {
    const legacyHubs = {
      "T7000-STATION": {
        station_sn: "T7000-STATION",
        station_name: "Legacy name",
        setup_code: "preserve-me",
      },
    } as unknown as Hubs;
    const inventory: MegaDeviceInventory = {
      devices: [
        {
          device_sn: "T7000-STATION",
          device_name: "Current name",
          device_model: "T7000",
          device_type: DeviceType.NVR_T7000,
          device_channel: 0,
          signaling_servers: ["https://signal.example.com"],
        },
      ],
    };

    const result = mergeMegaInventory(legacyHubs, {} as FullDevices, inventory);

    expect(result.hubs["T7000-STATION"].station_name).toBe("Current name");
    expect(result.hubs["T7000-STATION"].setup_code).toBe("preserve-me");
  });
});
