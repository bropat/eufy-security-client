# eufy-security-client Demo

A simple TypeScript demo showing how to use the `eufy-security-client` library to interact with your Eufy security devices.

## Features

- Written in TypeScript with full type safety
- Connect to Eufy Cloud with 2FA support
- List all devices and stations
- Real-time event monitoring (motion, person detection, doorbell rings, etc.)
- Pretty console output with colors and emojis
- Uses `tsx` for direct TypeScript execution (no build step needed)

## Setup

1. **Install dependencies:**

   ```bash
   cd demo
   npm install
   ```

2. **Configure credentials:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Eufy account credentials:

   ```
   EUFY_USERNAME=your-email@example.com
   EUFY_PASSWORD=your-password
   EUFY_COUNTRY=US
   ```

3. **Build the parent library** (if not already built):

   ```bash
   cd ..
   npm install
   npm run build
   cd demo
   ```

## Running the Demo

```bash
npm start
```

Or with auto-reload during development (watches for file changes):

```bash
npm run dev
```

## What the Demo Does

1. **Connects** to the Eufy Cloud using your credentials
2. **Handles 2FA** if your account has two-factor authentication enabled
3. **Lists** all your devices and stations with their details
4. **Monitors** events in real-time:
   - Motion detection
   - Person detection
   - Pet detection
   - Vehicle detection
   - Doorbell rings
   - Lock state changes
   - Guard mode changes
   - Alarm events

## Example Output

```
╔═══════════════════════════════════════════════════════════╗
║           eufy-security-client Demo                       ║
║           Control your Eufy devices from Node.js          ║
╚═══════════════════════════════════════════════════════════╝

[10:30:15] 🔧 Initializing with country: US
[10:30:15] 🔌 Connecting to Eufy Cloud...
[10:30:17] ✅ Connected to Eufy Cloud!

═══ Your Devices ═══

  ● Front Door Camera
    Serial: T1234ABC567890
    Model: eufyCam 2 Pro
    Enabled: true
    Battery: 85%

  ● Backyard Camera
    Serial: T5678DEF123456
    Model: eufyCam 2C
    Enabled: true
    Battery: 62%

═══ Your Stations ═══

  ● Home Base
    Serial: T9012GHI789012
    Model: HomeBase 2
    P2P Connected: Yes

═══ Listening for Events ═══

The demo is now monitoring for device events.
Try triggering motion detection or pressing your doorbell!

[10:32:45] 🚶 Motion detected on Front Door Camera!
[10:32:46] 👤 Person detected on Front Door Camera: Unknown
[10:32:55] 🚶 Motion cleared on Front Door Camera
```

## Extending the Demo

You can modify `index.ts` to add more functionality:

### Start a Livestream

```typescript
import { Readable } from "stream";
import * as fs from "fs";

// After connecting
const devices = await eufySecurity.getDevices();
const camera = devices.find(d => d.getName() === "Front Door Camera");

if (camera) {
  await eufySecurity.startStationLivestream(camera.getSerial());
  
  eufySecurity.on("station livestream start", (station, device, metadata, videostream: Readable, audiostream: Readable) => {
    // Handle video/audio streams
    videostream.pipe(fs.createWriteStream("video.h264"));
  });
}
```

### Change Guard Mode

```typescript
const stations = await eufySecurity.getStations();
const homeBase = stations[0];

// Set to Away mode
await eufySecurity.setStationProperty(
  homeBase.getSerial(), 
  "guardMode", 
  1 // 0=Home, 1=Away, 63=Disarmed
);
```

### Control a Device

```typescript
// Enable/disable a device
await eufySecurity.setDeviceProperty(deviceSerial, "enabled", false);

// Turn on/off motion detection
await eufySecurity.setDeviceProperty(deviceSerial, "motionDetection", true);
```

## Troubleshooting

### "Missing credentials" error
Make sure you've created the `.env` file with your credentials.

### 2FA not working
Enter the code exactly as shown in your authenticator app without spaces.

### "Cannot find module" errors
Make sure you've built the parent library:
```bash
cd ..
npm install && npm run build
cd demo
npm install
```

### Connection timeouts
- Check your internet connection
- Verify your credentials are correct
- Try a different country code if you're outside the US

## Security Note

Never commit your `.env` file or share your credentials. The `.gitignore` file is configured to exclude sensitive files.

