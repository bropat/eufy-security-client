/**
 * Eufy Device Discovery Script
 * 
 * This script connects to the Eufy API and dumps detailed information
 * about all devices, including their params (which reveal supported features).
 * 
 * Usage:
 *   npx ts-node scripts/discover-device.ts <username> <password> [country]
 * 
 * Example:
 *   npx ts-node scripts/discover-device.ts user@email.com password123 US
 */

/// <reference types="node" />
declare const process: NodeJS.Process;

import { HTTPApi } from "../src/http/api";
import { DeviceListResponse, StationListResponse } from "../src/http/models";

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log("Usage: npx ts-node scripts/discover-device.ts <username> <password> [country]");
        console.log("Example: npx ts-node scripts/discover-device.ts user@email.com password US");
        process.exit(1);
    }

    const username = args[0];
    const password = args[1];
    const country = args[2] || "US";

    console.log(`\n=== Eufy Device Discovery Script ===\n`);
    console.log(`Country: ${country}`);
    console.log(`Username: ${username}`);
    console.log(`\nConnecting to Eufy API...\n`);

    try {
        // Initialize the API
        const api = await HTTPApi.initialize(country, username, password);

        // Login to the API (required before querying data)
        console.log("Logging in...");
        await api.login();

        console.log("✓ Connected successfully!\n");

        // Debug: Try to get device list directly (before refresh)
        console.log("DEBUG: Trying getDeviceList directly...");
        const rawDevices = await api.getDeviceList();
        console.log(`DEBUG: getDeviceList returned ${rawDevices.length} devices`);
        if (rawDevices.length > 0) {
            console.log("DEBUG: First device:", JSON.stringify(rawDevices[0], null, 2));
        }

        console.log("\nDEBUG: Trying getStationList directly...");
        const rawStations = await api.getStationList();
        console.log(`DEBUG: getStationList returned ${rawStations.length} stations`);
        if (rawStations.length > 0) {
            console.log("DEBUG: First station:", JSON.stringify(rawStations[0], null, 2));
        }

        // Refresh data from server
        console.log("\nRefreshing data from Eufy servers...\n");
        await api.refreshAllData();
        console.log("✓ Data refreshed!\n");

        // Get all stations from cache
        console.log("=== STATIONS ===\n");
        const hubs = api.getHubs();

        for (const [sn, station] of Object.entries(hubs)) {
            console.log(`Station: ${station.station_name}`);
            console.log(`  Model: ${station.station_model}`);
            console.log(`  Serial: ${station.station_sn}`);
            console.log(`  Type: ${station.device_type}`);
            console.log(`  SW Version: ${station.main_sw_version}`);
            console.log(`  HW Version: ${station.main_hw_version}`);
            console.log(`  P2P DID: ${station.p2p_did}`);

            if (station.params && station.params.length > 0) {
                console.log(`  Params (${station.params.length}):`);
                for (const param of station.params) {
                    console.log(`    [${param.param_type}]: ${param.param_value}`);
                }
            }
            console.log("");
        }

        // Get all devices from cache
        console.log("\n=== DEVICES ===\n");
        const devices = api.getDevices();

        for (const [sn, device] of Object.entries(devices)) {
            console.log(`Device: ${device.device_name}`);
            console.log(`  Model: ${device.device_model}`);
            console.log(`  Serial: ${device.device_sn}`);
            console.log(`  Type: ${device.device_type}`);
            console.log(`  Station: ${device.station_sn}`);
            console.log(`  SW Version: ${device.main_sw_version}`);
            console.log(`  HW Version: ${device.main_hw_version}`);
            console.log(`  WiFi SSID: ${device.wifi_ssid || "N/A"}`);
            console.log(`  Local IP: ${device.local_ip || "N/A"}`);

            if (device.params && device.params.length > 0) {
                console.log(`  Params (${device.params.length}):`);
                for (const param of device.params) {
                    // Try to parse JSON values
                    let value = param.param_value;
                    try {
                        const parsed = JSON.parse(param.param_value);
                        value = JSON.stringify(parsed, null, 4).replace(/\n/g, "\n      ");
                    } catch {
                        // Not JSON, use raw value
                    }
                    console.log(`    [${param.param_type}]: ${value}`);
                }
            }

            // If this is the S4 (type 89), print extra info
            if (device.device_type === 89) {
                console.log(`\n  *** THIS IS THE EUFYCAM S4 (T8172) ***`);
                console.log(`  Full raw device data:`);
                console.log(JSON.stringify(device, null, 2));
            }

            console.log("");
        }

        console.log("\n=== SUMMARY ===\n");
        console.log(`Total Stations: ${Object.keys(hubs).length}`);
        console.log(`Total Devices: ${Object.keys(devices).length}`);

        // List device types found
        const types = new Map<number, string>();
        for (const [sn, device] of Object.entries(devices)) {
            types.set(device.device_type, device.device_model);
        }
        console.log(`\nDevice Types Found:`);
        for (const [type, model] of types) {
            console.log(`  Type ${type}: ${model}`);
        }

    } catch (error) {
        console.error("Error:", error);

        if (error instanceof Error) {
            if (error.message.includes("captcha")) {
                console.log("\n⚠️  Captcha required - you may need to log in via the Eufy app first");
            } else if (error.message.includes("verify")) {
                console.log("\n⚠️  2FA verification required - run again after receiving code");
            }
        }
    }
}

main();
