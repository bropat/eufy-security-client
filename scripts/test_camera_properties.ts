import { DeviceType, DeviceProperties, StationProperties, StationCommands, DeviceCommands } from "../src/http/types";
import { Device as DeviceClass } from "../src/http/device";

// --- Argument Parsing ---
const args = process.argv.slice(2);
// Default to S4 (89) if no arg provided
const typeArgRaw = args[0];
const deviceType = typeArgRaw ? parseInt(typeArgRaw) : DeviceType.EUFYCAM_S4;

console.log(`Testing Configuration for Device Type: ${deviceType}`);
console.log("---------------------------------------------------");

// Check if it's a known DeviceType name
const typeName = Object.keys(DeviceType).find(key => DeviceType[key as keyof typeof DeviceType] === deviceType);
if (typeName) {
    console.log(`Device Type Name: ${typeName}`);
} else {
    console.warn(`WARNING: Unknown DeviceType enum value: ${deviceType}`);
}

// Check Device Properties
const deviceProps = DeviceProperties[deviceType];
if (deviceProps) {
    console.log(`✅ DeviceProperties found. Count: ${Object.keys(deviceProps).length}`);
} else {
    console.error(`❌ DeviceProperties is UNDEFINED!`);
}

// Check Station Properties
const stationProps = StationProperties[deviceType];
if (stationProps) {
    console.log(`✅ StationProperties found. Count: ${Object.keys(stationProps).length}`);
} else {
    console.error(`❌ StationProperties is UNDEFINED!`);
}

// Check Device Commands
const deviceCmds = DeviceCommands[deviceType];
if (deviceCmds) {
    console.log(`✅ DeviceCommands found. Count: ${deviceCmds.length}`);
} else {
    console.error(`❌ DeviceCommands is UNDEFINED!`);
}

// Check Station Commands
const stationCmds = StationCommands[deviceType];
if (stationCmds) {
    console.log(`✅ StationCommands found. Count: ${stationCmds.length}`);
} else {
    console.error(`❌ StationCommands is UNDEFINED!`);
}

// Check Device Class identification
console.log("\n--- Device Class Classifications ---");
console.log(`isCamera(${deviceType}): ${DeviceClass.isCamera(deviceType)}`);
console.log(`isOutdoorPanAndTiltCamera(${deviceType}): ${DeviceClass.isOutdoorPanAndTiltCamera(deviceType)}`);
console.log(`isSoloCameras(${deviceType}): ${DeviceClass.isSoloCameras(deviceType)}`);
console.log(`isIntegratedDeviceBySn("..."): (Depends on SN format check, skipping specific SN check)`);
console.log(`hasBattery(${deviceType}): ${DeviceClass.hasBattery(deviceType)}`);

console.log("\nTest Complete.");
