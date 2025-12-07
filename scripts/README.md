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

## Notes

- **Country**: Use 2-letter ISO country code (e.g., US, GB, DE, FR). Should match your Eufy app setting.
- **2FA/Captcha**: If prompted for 2FA or captcha, you may need to log in via the Eufy app first.
- Scripts require `npm install` to have been run first.
