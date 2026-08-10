# Usage Guide

This guide explains how to use the `eufy-security-client` library to interact with Eufy security devices.

## Installation

```bash
npm install eufy-security-client
```

**Requirements:** Node.js >= 20.0.0

## Quick Start

```typescript
import { EufySecurity, EufySecurityConfig, P2PConnectionType, LogLevel } from "eufy-security-client";

const config: EufySecurityConfig = {
  username: "your-eufy-email@example.com",
  password: "your-eufy-password",
  country: "US",                              // Your country code
  language: "en",                             // Language preference
  p2pConnectionSetup: P2PConnectionType.QUICKEST,
  pollingIntervalMinutes: 10,
  eventDurationSeconds: 10,
};

// Initialize the client
const eufySecurity = await EufySecurity.initialize(config);

// Connect to Eufy Cloud
await eufySecurity.connect();

// Listen for connection events
eufySecurity.on("connect", () => {
  console.log("Connected to Eufy Cloud!");
});

// Get all devices
const devices = await eufySecurity.getDevices();
console.log("Devices:", devices.map(d => d.getName()));

// Get all stations/hubs
const stations = await eufySecurity.getStations();
console.log("Stations:", stations.map(s => s.getName()));

// Close the connection when done
eufySecurity.close();
```

## Configuration Options

The `EufySecurityConfig` interface supports the following options:

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `username` | `string` | Yes | - | Your Eufy account email |
| `password` | `string` | Yes | - | Your Eufy account password |
| `country` | `string` | No | `"US"` | Two-letter country code |
| `language` | `string` | No | `"en"` | Language preference |
| `trustedDeviceName` | `string` | No | Auto-generated | Device name shown in Eufy app |
| `persistentDir` | `string` | No | Library directory | Directory for persistent data storage |
| `persistentData` | `string` | No | - | JSON string of persistent data (alternative to file) |
| `p2pConnectionSetup` | `number` | No | `QUICKEST` | P2P connection type (see below) |
| `pollingIntervalMinutes` | `number` | No | `10` | Cloud polling interval in minutes |
| `eventDurationSeconds` | `number` | No | `10` | Duration for event detection states |
| `acceptInvitations` | `boolean` | No | `false` | Auto-accept device sharing invitations |
| `stationIPAddresses` | `object` | No | - | Manual IP addresses for stations |
| `logging` | `object` | No | - | Logging configuration |

### P2P Connection Types

```typescript
import { P2PConnectionType } from "eufy-security-client";

// Try local connection first, then remote
P2PConnectionType.QUICKEST  // Value: 2 (default)

// Only use local network connection
P2PConnectionType.ONLY_LOCAL  // Value: 1
```

### Logging Configuration

```typescript
import { LogLevel } from "eufy-security-client";

const config: EufySecurityConfig = {
  // ... other options
  logging: {
    level: LogLevel.Debug,  // Global log level
    categories: [
      { category: "http", level: LogLevel.Info },
      { category: "p2p", level: LogLevel.Debug },
      { category: "push", level: LogLevel.Warn },
      { category: "mqtt", level: LogLevel.Error },
    ]
  }
};
```

Available log levels: `Trace`, `Debug`, `Info`, `Warn`, `Error`, `Fatal`

Available categories: `all`, `main`, `http`, `p2p`, `push`, `mqtt`

## Authentication

### Basic Authentication

```typescript
await eufySecurity.connect();
```

### Two-Factor Authentication (2FA)

If your account has 2FA enabled, listen for the `tfa request` event:

```typescript
eufySecurity.on("tfa request", () => {
  console.log("2FA code required!");
  // Prompt user for the code, then:
  const code = "123456"; // Get from user
  eufySecurity.connect({ verifyCode: code, force: false });
});

// Initial connection attempt
await eufySecurity.connect();
```

### Captcha Handling

Some login attempts may require a captcha:

```typescript
eufySecurity.on("captcha request", (id: string, captcha: string) => {
  console.log("Captcha required!");
  // Display the captcha image (base64) to the user
  // Get the captcha solution, then:
  const solution = "ABC123"; // Get from user
  eufySecurity.connect({
    captcha: { captchaId: id, captchaCode: solution },
    force: false
  });
});
```

## Working with Devices

### Getting Devices

```typescript
// Get all devices
const devices = await eufySecurity.getDevices();

// Get a specific device by serial number
const device = await eufySecurity.getDevice("T1234ABC567890");

// Get devices from a specific station
const stationDevices = await eufySecurity.getDevicesFromStation("T5678DEF123456");
```

### Device Properties

```typescript
// Get a property value
const enabled = device.getPropertyValue("enabled");
const batteryLevel = device.getPropertyValue("battery");

// Check if device has a property
if (device.hasProperty("motionDetection")) {
  const motionEnabled = device.getPropertyValue("motionDetection");
}

// Set a device property
await eufySecurity.setDeviceProperty(device.getSerial(), "enabled", true);
await eufySecurity.setDeviceProperty(device.getSerial(), "motionDetection", true);
```

### Device Events

```typescript
// Motion detection
eufySecurity.on("device motion detected", (device, state) => {
  console.log(`Motion ${state ? "detected" : "cleared"} on ${device.getName()}`);
});

// Person detection
eufySecurity.on("device person detected", (device, state, person) => {
  console.log(`Person ${state ? "detected" : "left"}: ${person}`);
});

// Doorbell rings
eufySecurity.on("device rings", (device, state) => {
  console.log(`Doorbell ${state ? "ringing" : "stopped"}`);
});

// Device property changes
eufySecurity.on("device property changed", (device, name, value) => {
  console.log(`${device.getName()}: ${name} = ${value}`);
});

// Device added/removed
eufySecurity.on("device added", (device) => {
  console.log(`New device: ${device.getName()}`);
});

eufySecurity.on("device removed", (device) => {
  console.log(`Device removed: ${device.getName()}`);
});
```

## Working with Stations

### Getting Stations

```typescript
// Get all stations
const stations = await eufySecurity.getStations();

// Get a specific station
const station = await eufySecurity.getStation("T5678DEF123456");
```

### Station Connection

```typescript
// Connect to a station's P2P interface
await eufySecurity.connectToStation("T5678DEF123456", P2PConnectionType.QUICKEST);

// Check if station is connected
const isConnected = await eufySecurity.isStationConnected("T5678DEF123456");
```

### Guard Mode

```typescript
import { PropertyName } from "eufy-security-client";

// Get current guard mode
const station = await eufySecurity.getStation("T5678DEF123456");
const currentMode = station.getPropertyValue(PropertyName.StationCurrentMode);

// Set guard mode
await eufySecurity.setStationProperty("T5678DEF123456", PropertyName.StationGuardMode, 0); // Home
await eufySecurity.setStationProperty("T5678DEF123456", PropertyName.StationGuardMode, 1); // Away
await eufySecurity.setStationProperty("T5678DEF123456", PropertyName.StationGuardMode, 63); // Disarmed
```

### Station Events

```typescript
// Station connection
eufySecurity.on("station connect", (station) => {
  console.log(`Connected to station: ${station.getName()}`);
});

eufySecurity.on("station close", (station) => {
  console.log(`Disconnected from station: ${station.getName()}`);
});

// Guard mode changes
eufySecurity.on("station guard mode", (station, guardMode) => {
  console.log(`Guard mode changed to: ${guardMode}`);
});

// Alarm events
eufySecurity.on("station alarm event", (station, alarmEvent) => {
  console.log(`Alarm event: ${alarmEvent}`);
});
```

## Livestream

### Start/Stop Livestream

```typescript
// Start livestream
await eufySecurity.startStationLivestream(device.getSerial());

// Stop livestream
await eufySecurity.stopStationLivestream(device.getSerial());
```

### Handling Livestream Data

```typescript
eufySecurity.on("station livestream start", (station, device, metadata, videostream, audiostream) => {
  console.log(`Livestream started for ${device.getName()}`);
  console.log(`Video codec: ${metadata.videoCodec}, Audio codec: ${metadata.audioCodec}`);
  
  // Handle video stream
  videostream.on("data", (chunk) => {
    // Process video data
  });
  
  // Handle audio stream
  audiostream.on("data", (chunk) => {
    // Process audio data
  });
});

eufySecurity.on("station livestream stop", (station, device) => {
  console.log(`Livestream stopped for ${device.getName()}`);
});
```

### RTSP Livestream

For devices that support RTSP:

```typescript
// Start RTSP stream
await eufySecurity.startStationRTSPLivestream(device.getSerial());

// Listen for RTSP URL
eufySecurity.on("station rtsp url", (station, device, url) => {
  console.log(`RTSP URL: ${url}`);
});

// Stop RTSP stream
await eufySecurity.stopStationRTSPLivestream(device.getSerial());
```

## Push Notifications

Push notifications provide real-time event updates:

```typescript
eufySecurity.on("push connect", () => {
  console.log("Push notification service connected");
});

eufySecurity.on("push close", () => {
  console.log("Push notification service disconnected");
});

eufySecurity.on("push message", (message) => {
  console.log("Push notification:", message);
});
```

## Lock Devices

### Lock/Unlock

```typescript
// Lock the device
await eufySecurity.setDeviceProperty(lockSerial, "locked", true);

// Unlock the device
await eufySecurity.setDeviceProperty(lockSerial, "locked", false);
```

### Lock Events

```typescript
eufySecurity.on("device locked", (device, state) => {
  console.log(`Lock ${device.getName()} is now ${state ? "locked" : "unlocked"}`);
});

// MQTT events for smart locks
eufySecurity.on("mqtt lock message", (message) => {
  console.log("Lock MQTT message:", message);
});
```

## Talkback (Two-Way Audio)

```typescript
// Start talkback
await eufySecurity.startStationTalkback(device.getSerial());

eufySecurity.on("station talkback start", (station, device, talkbackStream) => {
  console.log("Talkback started");
  
  // Send audio data to the talkback stream
  talkbackStream.write(audioBuffer);
});

// Stop talkback
await eufySecurity.stopStationTalkback(device.getSerial());
```

## Persistent Data

The library saves authentication tokens and credentials to avoid repeated logins:

```typescript
// Listen for persistent data updates
eufySecurity.on("persistent data", (data) => {
  // Save this data to restore the session later
  fs.writeFileSync("eufy-persistent.json", data);
});

// Restore persistent data on next startup
const config: EufySecurityConfig = {
  // ... other options
  persistentData: fs.readFileSync("eufy-persistent.json", "utf8"),
};
```

## Error Handling

The library provides specific error types:

```typescript
import {
  DeviceNotFoundError,
  StationNotFoundError,
  NotSupportedError,
  ReadOnlyPropertyError,
} from "eufy-security-client";

try {
  await eufySecurity.getDevice("invalid-serial");
} catch (error) {
  if (error instanceof DeviceNotFoundError) {
    console.log("Device not found");
  }
}

try {
  await eufySecurity.setDeviceProperty(deviceSN, "someProperty", value);
} catch (error) {
  if (error instanceof NotSupportedError) {
    console.log("This device doesn't support this feature");
  } else if (error instanceof ReadOnlyPropertyError) {
    console.log("This property is read-only");
  }
}
```

## Complete Example

```typescript
import { 
  EufySecurity, 
  EufySecurityConfig, 
  P2PConnectionType,
  Device,
  Station
} from "eufy-security-client";

async function main() {
  const config: EufySecurityConfig = {
    username: process.env.EUFY_USERNAME!,
    password: process.env.EUFY_PASSWORD!,
    country: "US",
    p2pConnectionSetup: P2PConnectionType.QUICKEST,
    pollingIntervalMinutes: 10,
    eventDurationSeconds: 10,
  };

  const eufySecurity = await EufySecurity.initialize(config);

  // Set up event listeners
  eufySecurity.on("connect", async () => {
    console.log("Connected to Eufy Cloud!");
    
    const devices = await eufySecurity.getDevices();
    const stations = await eufySecurity.getStations();
    
    console.log(`Found ${devices.length} devices and ${stations.length} stations`);
    
    for (const device of devices) {
      console.log(`- ${device.getName()} (${device.getSerial()})`);
    }
  });

  eufySecurity.on("device motion detected", (device, state) => {
    if (state) {
      console.log(`🚶 Motion detected on ${device.getName()}`);
    }
  });

  eufySecurity.on("device person detected", (device, state, person) => {
    if (state) {
      console.log(`👤 Person detected on ${device.getName()}: ${person}`);
    }
  });

  eufySecurity.on("tfa request", () => {
    console.log("2FA required - please provide the code");
    // Handle 2FA
  });

  eufySecurity.on("connection error", (error) => {
    console.error("Connection error:", error);
  });

  // Connect
  await eufySecurity.connect();

  // Keep the process running
  process.on("SIGINT", () => {
    console.log("Shutting down...");
    eufySecurity.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## API Reference

For a complete list of available methods, properties, and events, refer to the TypeScript definitions exported by the package. Key exports include:

- `EufySecurity` - Main client class
- `EufySecurityConfig` - Configuration interface
- `EufySecurityEvents` - Event types
- `Device`, `Station` - Device and station classes
- `Camera`, `Lock`, `Doorbell`, etc. - Specific device types
- `PropertyName`, `CommandName` - Property and command enums
- `P2PConnectionType` - Connection type enum
- `LogLevel`, `LoggingCategories` - Logging utilities

