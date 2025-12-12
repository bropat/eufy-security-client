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
npx ts-node --transpile-only scripts/discover-device.ts your.email@example.com yourpassword US
```

**Authentication:**
- The script will connect to your Eufy account using the provided credentials.
- If a **Captcha** is required, the image will be saved to a file in your current directory (named `captcha_<id>.png`). You can open this file to view the captcha image and enter the code when prompted.
- If **2FA (Two-Factor Authentication)** is enabled, you will be prompted to enter the verification code sent to your email or SMS. The script will retry if an incorrect code is entered.

**Output:**
- Lists all stations (hubs) and their configurations
- Lists all devices with their types, models, serials, and parameters
- Includes a device property analysis showing which properties are present/missing
- Helpful for debugging device configuration and parameter issues

## Device Verification Script

Verifies that all devices on your account are correctly recognized by the system's device classification functions (isCamera, hasBattery, isPanAndTiltCamera, etc.).

**Usage:**
```bash
npx ts-node --transpile-only scripts/verify-devices.ts <email> <password> [country]
```

**Example:**
```bash
npx ts-node --transpile-only scripts/verify-devices.ts your.email@example.com yourpassword GB
```

**Authentication:**
- Same as Device Discovery Script: handles Captcha and 2FA prompts interactively
- Saves captcha images to disk for manual viewing if needed
- Retries 2FA code entry until successful

**Output:**
- Classifies each device and shows test results (isCamera, hasBattery, isPanAndTilt, etc.)
- Highlights any misclassifications that need fixing
- Useful for ensuring device type configuration is correct

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
