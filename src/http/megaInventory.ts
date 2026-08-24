import type { FullDevices, Hubs } from "./interfaces";
import type { DeviceListResponse, StationListDevice, StationListResponse } from "./models";
import type { MegaDeviceInventory, MegaDeviceRecord } from "./megaInterfaces";
import { isRTCStationType } from "../rtc/config";

export interface MergedMegaInventory {
  hubs: Hubs;
  devices: FullDevices;
}

const stationDevice = (device: MegaDeviceRecord): StationListDevice =>
  ({
    ...device,
    station_sn: device.parent_sn || device.device_sn,
  }) as unknown as StationListDevice;

const stationConnection = (station: StationListResponse): DeviceListResponse["station_conn"] =>
  ({
    station_sn: station.station_sn,
    station_name: station.station_name,
    station_model: station.station_model,
    main_sw_version: station.main_sw_version,
    main_hw_version: station.main_hw_version,
    p2p_did: station.p2p_did,
    push_did: station.push_did,
    ndt_did: station.ndt_did,
    p2p_conn: station.p2p_conn,
    app_conn: station.app_conn,
    binded: false,
    setup_code: station.setup_code,
    setup_id: station.setup_id,
    bt_mac: station.bt_mac,
    wifi_mac: station.wifi_mac,
    dsk_key: "",
    expiration: 0,
  }) as DeviceListResponse["station_conn"];

/**
 * Overlay v6 discovery fields onto the legacy inventory and add devices owned by a registered
 * RTC station.
 *
 * Only the RTC family is introduced from v6. Other devices continue to be owned by the legacy
 * inventory until their data paths are migrated, which keeps this transition tightly scoped.
 */
export const mergeMegaInventory = (
  legacyHubs: Hubs,
  legacyDevices: FullDevices,
  inventory: MegaDeviceInventory
): MergedMegaInventory => {
  const hubs: Hubs = { ...legacyHubs };
  const devices: FullDevices = { ...legacyDevices };
  const rtcStations = inventory.devices.filter((device) => isRTCStationType(device.device_type));
  const rtcStationSerials = new Set(rtcStations.map((station) => station.device_sn));

  for (const rawStation of rtcStations) {
    const previous = hubs[rawStation.device_sn];
    const children = inventory.devices.filter((device) => device.parent_sn === rawStation.device_sn).map(stationDevice);
    hubs[rawStation.device_sn] = {
      ...previous,
      ...rawStation,
      station_sn: rawStation.device_sn,
      station_name: rawStation.device_name,
      station_model: rawStation.device_model,
      devices: children,
    } as unknown as StationListResponse;
  }

  for (const rawDevice of inventory.devices) {
    if (!rawDevice.parent_sn || !rtcStationSerials.has(rawDevice.parent_sn)) continue;

    const previous = devices[rawDevice.device_sn];
    const station = hubs[rawDevice.parent_sn];
    devices[rawDevice.device_sn] = {
      ...previous,
      ...rawDevice,
      station_sn: rawDevice.parent_sn,
      station_conn: previous?.station_conn ?? stationConnection(station),
    } as unknown as DeviceListResponse;
  }

  return { hubs, devices };
};
