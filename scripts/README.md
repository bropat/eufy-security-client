# Development Utility Scripts

This directory contains utility scripts for development and testing.

## Device Discovery Script

Discovers all devices on your Eufy account and displays their properties and parameters.

**Usage:**
```bash
npx ts-node --transpile-only scripts/discover-device.ts <email> <password> [country]
```

**Example:**
```bash
npx ts-node --transpile-only scripts/discover-device.ts user@email.com password123 US
```

## Device Verification Script

Verifies that all devices on your account are correctly recognized by the system's device classification functions (isCamera, hasBattery, isPanAndTiltCamera, etc.).

**Usage:**
```bash
npx ts-node --transpile-only scripts/verify-devices.ts <email> <password> [country]
```

**Example:**
```bash
npx ts-node --transpile-only scripts/verify-devices.ts user@email.com password123 GB
```

## Universal Camera Properties Test

Checks if a specific device type has its Properties and Commands correctly defined in the `http/types.ts` configuration maps. Also checks classification (isCamera, etc.).

**Usage:**
```bash
npx ts-node --transpile-only scripts/test_camera_properties.ts <DeviceTypeNumber>
```

**Example:**
```bash
# Test EufyCam S4 (Type 89)
npx ts-node --transpile-only scripts/test_camera_properties.ts 89
```

## Universal Camera P2P Flow Test

Simulates an incoming P2P parameter update for a specific device to verify that `ParameterHelper` correctly parses the raw value.

**Usage:**
```bash
npx ts-node --transpile-only scripts/test_camera_p2p_flow.ts [DeviceTypeNumber] [DeviceSN] [StationSN]
```

**Arguments:**
- `DeviceTypeNumber`: Integer (default: 89 for S4)
- `DeviceSN`: String (default: "T8172DEMO")
- `StationSN`: String (default: "T8030DEMO")

**Example:**
```bash
npx ts-node --transpile-only scripts/test_camera_p2p_flow.ts 89 T8172TEST1 T8030TEST1
```

## Notes

- **Country**: Use 2-letter ISO country code (e.g., US, GB, DE, FR). Should match your Eufy app setting.
- **2FA/Captcha**: If prompted for 2FA or captcha, you may need to log in via the Eufy app first.
- Scripts require `npm install` to have been run first.
