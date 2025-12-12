import { DeviceType } from "../src/http/types";
import { CommandType } from "../src/p2p/types";
import { ParameterHelper } from "../src/http/parameter";
import { EventEmitter } from "events";

// --- Argument Parsing ---
const args = process.argv.slice(2);
const deviceTypeArg = args[0] ? parseInt(args[0]) : DeviceType.EUFYCAM_S4; // Default to S4 (89)
const deviceSnArg = args[1] || "T8172DEMO";
const stationSnArg = args[2] || "T8030DEMO";

console.log(`Running P2P Flow Test with:`);
console.log(`  Device Type: ${deviceTypeArg}`);
console.log(`  Device SN:   ${deviceSnArg}`);
console.log(`  Station SN:  ${stationSnArg}`);
console.log("---------------------------------------------------");

interface Logger {
    trace(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

// Mock Logger
const mockLogger = {
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: console.error,
    trace: () => { },
} as unknown as Logger;

// Mock Station
class MockStation extends EventEmitter {
    public rawStation: any;

    constructor() {
        super();
        this.rawStation = {
            station_sn: stationSnArg,
            devices: [
                {
                    device_sn: deviceSnArg,
                    device_name: "Test Camera",
                    device_channel: 1,
                    device_type: deviceTypeArg
                }
            ]
        };
    }

    public getSerial() { return stationSnArg; }
    public isIntegratedDevice() { return false; } // Assuming non-integrated for general P2P flow
    public getDeviceType() { return DeviceType.HB3; } // Defaulting to HB3 as host

    public _getDeviceSerial(channel: number) {
        if (channel === 1) return deviceSnArg;
        return "";
    }

    public _handleCameraInfoParameters(devices: any, channel: number, type: number, value: string) {
        const device_sn = this._getDeviceSerial(channel);
        if (device_sn !== "") {
            if (!devices[device_sn]) {
                devices[device_sn] = {};
            }

            const parsedValue = ParameterHelper.readValue(device_sn, type, value, mockLogger as any);
            console.log(`readValue(sn=${device_sn}, type=${type}, value=${value}) = ${parsedValue}`);

            if (parsedValue !== undefined) {
                devices[device_sn][type] = {
                    value: parsedValue,
                    source: "p2p"
                };
            }
        }
    }
}

async function runTest() {
    console.log("Testing P2P Parameter Handling...");

    // Test Case: Receiving Battery Level (Command 1101)
    // 1101 is CMD_GET_BATTERY in CommandType (src/p2p/types.ts).
    const CMD_BATTERY = CommandType.CMD_GET_BATTERY;

    // We can also test CMD_MOTION_SENSOR_PIR_SENSITIVITY (1204) if applicable, 
    // but sticking to battery as a universal baseline.

    const station = new MockStation();
    const devices: { [key: string]: any } = {};

    console.log(`\nSimulating incoming P2P command ${CMD_BATTERY} (CMD_GET_BATTERY) with value "90"...`);

    // Simulate typical P2P values
    // Battery = 90 (string "90")
    station._handleCameraInfoParameters(devices, 1, CMD_BATTERY, "90");

    if (devices[deviceSnArg] && devices[deviceSnArg][CMD_BATTERY]) {
        console.log(`SUCCESS: Battery level parsed: ${devices[deviceSnArg][CMD_BATTERY].value}`);
    } else {
        console.error("FAILURE: Battery level NOT parsed");
    }

    console.log("\nDone.");
}

runTest();
