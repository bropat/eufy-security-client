/**
 * eufy-security-client Demo
 *
 * This demo shows how to connect to Eufy Security and interact with devices.
 *
 * Setup:
 *   1. Copy .env.example to .env
 *   2. Fill in your Eufy credentials
 *   3. Run: npm install && npm start
 */

import { exec } from "child_process";
import "dotenv/config";
import {
  Device,
  EufySecurity,
  EufySecurityConfig,
  LogLevel,
  P2PConnectionType,
  Picture,
  PropertyValue,
  Station,
  StreamMetadata,
} from "eufy-security-client";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Directory to save camera images
const IMAGES_DIR = path.join(process.cwd(), "images");

// ANSI color codes for pretty output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
} as const;

type ColorKey = keyof typeof colors;

function log(icon: string, message: string, color: string = colors.reset): void {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${icon} ${color}${message}${colors.reset}`);
}

function logSection(title: string): void {
  console.log(`\n${colors.bright}${colors.cyan}═══ ${title} ═══${colors.reset}\n`);
}

// Ensure images directory exists
function ensureImagesDir(): void {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

// Save camera image to file (overwrites previous image for same camera)
function saveCameraImage(deviceName: string, imageData: Buffer, extension: string = "jpg"): string {
  ensureImagesDir();

  // Sanitize device name for filename
  const safeName = deviceName.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase();
  const filename = `${safeName}.${extension}`;
  const filepath = path.join(IMAGES_DIR, filename);

  fs.writeFileSync(filepath, imageData);
  return filepath;
}

// Prompt for user input
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  console.log(`
${colors.bright}${colors.magenta}
╔═══════════════════════════════════════════════════════════╗
║           eufy-security-client Demo                       ║
║           Control your Eufy devices from Node.js          ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Validate environment variables
  const username = process.env.EUFY_USERNAME;
  const password = process.env.EUFY_PASSWORD;
  const country = process.env.EUFY_COUNTRY || "US";

  if (!username || !password) {
    console.error(`${colors.red}Error: Missing credentials!${colors.reset}`);
    console.log(`
Please create a .env file with your Eufy credentials:

  ${colors.cyan}cp .env.example .env${colors.reset}

Then edit .env and add your credentials.
`);
    process.exit(1);
  }

  log("🔧", `Initializing with country: ${country}`, colors.blue);

  // Initialize the client
  const config: EufySecurityConfig = {
    username,
    password,
    country,
    language: "en",
    p2pConnectionSetup: P2PConnectionType.QUICKEST,
    pollingIntervalMinutes: 10,
    eventDurationSeconds: 10,
    persistentDir: process.cwd(),
    logging: {
      level: LogLevel.Info,
    },
  };

  let eufySecurity: EufySecurity;

  try {
    eufySecurity = await EufySecurity.initialize(config);
  } catch (err) {
    const error = err as Error;
    log("❌", `Failed to initialize: ${error.message}`, colors.red);
    process.exit(1);
  }

  // Set up event handlers
  setupEventHandlers(eufySecurity);

  // Handle 2FA
  eufySecurity.on("tfa request", async () => {
    log("🔐", "Two-factor authentication required!", colors.yellow);
    const code = await prompt(`${colors.yellow}Enter your 2FA code: ${colors.reset}`);
    await eufySecurity.connect({ verifyCode: code, force: false });
  });

  // Handle captcha
  eufySecurity.on("captcha request", async (id: string, captcha: string) => {
    log("🖼️", "Captcha required!", colors.yellow);

    // Save captcha image to file for viewing
    const captchaPath = `${process.cwd()}/captcha.png`;
    const base64Data = captcha.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(captchaPath, Buffer.from(base64Data, "base64"));

    console.log(`\n${colors.cyan}Captcha saved to: ${captchaPath}${colors.reset}`);

    // Try to open the image automatically (macOS)
    exec(`open "${captchaPath}"`, (err) => {
      if (err) {
        console.log(`${colors.dim}(Could not auto-open image - please open manually)${colors.reset}`);
      }
    });

    const solution = await prompt(`\n${colors.yellow}Enter captcha solution: ${colors.reset}`);

    // Clean up captcha file after input
    try {
      fs.unlinkSync(captchaPath);
      log("🧹", "Captcha file removed", colors.dim);
    } catch {
      // Ignore if file doesn't exist
    }

    await eufySecurity.connect({
      captcha: { captchaId: id, captchaCode: solution },
      force: false
    });
  });

  // Connect
  log("🔌", "Connecting to Eufy Cloud...", colors.blue);

  try {
    await eufySecurity.connect();
  } catch (err) {
    const error = err as Error;
    log("❌", `Connection failed: ${error.message}`, colors.red);
  }

  // Keep alive and handle graceful shutdown
  process.on("SIGINT", () => {
    log("👋", "Shutting down...", colors.yellow);
    eufySecurity.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    eufySecurity.close();
    process.exit(0);
  });

  // Keep the process running
  log("💡", "Press Ctrl+C to exit", colors.dim);
}

function setupEventHandlers(eufySecurity: EufySecurity): void {
  // Connection events
  eufySecurity.on("connect", async () => {
    log("✅", "Connected to Eufy Cloud!", colors.green);
    await displayDevices(eufySecurity);
    await displayStations(eufySecurity);
    showInteractiveMenu();
  });

  eufySecurity.on("close", () => {
    log("🔌", "Disconnected from Eufy Cloud", colors.yellow);
  });

  eufySecurity.on("connection error", (error: Error & { context?: { code?: string; message?: string } }) => {
    log("❌", `Connection error: ${error.message}`, colors.red);
    // Show detailed error info if available
    if (error.context) {
      console.log(`${colors.dim}    Error details:${colors.reset}`);
      console.log(`${colors.dim}      Code: ${error.context.code}${colors.reset}`);
      console.log(`${colors.dim}      Message: ${error.context.message}${colors.reset}`);
    }
  });

  // Push notification events
  eufySecurity.on("push connect", () => {
    log("📬", "Push notifications connected", colors.green);
  });

  eufySecurity.on("push close", () => {
    log("📭", "Push notifications disconnected", colors.yellow);
  });

  // Device events
  eufySecurity.on("device added", (device: Device) => {
    log("➕", `Device added: ${device.getName()}`, colors.green);
  });

  eufySecurity.on("device removed", (device: Device) => {
    log("➖", `Device removed: ${device.getName()}`, colors.yellow);
  });

  eufySecurity.on("device property changed", (device: Device, name: string, value: PropertyValue) => {
    // Handle picture property - save to file instead of logging binary data
    if (name === "picture" && value && typeof value === "object" && "data" in value) {
      const picture = value as Picture;
      const ext = picture.type?.ext || "jpg";
      const filepath = saveCameraImage(device.getName(), picture.data, ext);
      log("📷", `${device.getName()}: New camera image saved to ${filepath}`, colors.blue);
    } else {
      log("📝", `${device.getName()}: ${name} = ${JSON.stringify(value)}`, colors.blue);
    }
  });

  // Detection events
  eufySecurity.on("device motion detected", (device: Device, state: boolean) => {
    if (state) {
      log("🚶", `Motion detected on ${device.getName()}!`, colors.magenta);
    } else {
      log("🚶", `Motion cleared on ${device.getName()}`, colors.dim);
    }
  });

  eufySecurity.on("device person detected", (device: Device, state: boolean, person: string) => {
    if (state) {
      log("👤", `Person detected on ${device.getName()}: ${person || "Unknown"}`, colors.magenta);
    }
  });

  eufySecurity.on("device pet detected", (device: Device, state: boolean) => {
    if (state) {
      log("🐕", `Pet detected on ${device.getName()}!`, colors.magenta);
    }
  });

  eufySecurity.on("device vehicle detected", (device: Device, state: boolean) => {
    if (state) {
      log("🚗", `Vehicle detected on ${device.getName()}!`, colors.magenta);
    }
  });

  eufySecurity.on("device crying detected", (device: Device, state: boolean) => {
    if (state) {
      log("👶", `Crying detected on ${device.getName()}!`, colors.magenta);
    }
  });

  eufySecurity.on("device sound detected", (device: Device, state: boolean) => {
    if (state) {
      log("🔊", `Sound detected on ${device.getName()}!`, colors.magenta);
    }
  });

  // Doorbell events
  eufySecurity.on("device rings", (device: Device, state: boolean) => {
    if (state) {
      log("🔔", `Doorbell ringing: ${device.getName()}!`, colors.yellow);
    }
  });

  // Lock events
  eufySecurity.on("device locked", (device: Device, state: boolean) => {
    log("🔒", `${device.getName()} is now ${state ? "locked" : "unlocked"}`, colors.blue);
  });

  // Station events
  eufySecurity.on("station connect", (station: Station) => {
    log("📡", `Station connected: ${station.getName()}`, colors.green);
  });

  eufySecurity.on("station close", (station: Station) => {
    log("📡", `Station disconnected: ${station.getName()}`, colors.yellow);
  });

  eufySecurity.on("station guard mode", (station: Station, guardMode: number) => {
    const modes: Record<number, string> = { 0: "Home", 1: "Away", 63: "Disarmed" };
    log("🛡️", `${station.getName()} guard mode: ${modes[guardMode] || guardMode}`, colors.blue);
  });

  eufySecurity.on("station alarm event", (station: Station, alarmEvent: number) => {
    log("🚨", `Alarm event on ${station.getName()}: ${alarmEvent}`, colors.red);
  });

  // Livestream events
  eufySecurity.on("station livestream start", (station: Station, device: Device, metadata: StreamMetadata) => {
    log("📹", `Livestream started: ${device.getName()}`, colors.green);
    log("📊", `Video: ${metadata.videoCodec}, Audio: ${metadata.audioCodec}`, colors.dim);
  });

  eufySecurity.on("station livestream stop", (station: Station, device: Device) => {
    log("📹", `Livestream stopped: ${device.getName()}`, colors.yellow);
  });
  // Persistent data
  eufySecurity.on("persistent data", () => {
    log("💾", "Session data saved", colors.dim);
  });
}

// Format property value for display
function formatPropertyValue(name: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  // Handle picture/image data - don't dump binary
  if (name === "picture" && typeof value === "object" && value !== null && "data" in value) {
    const pic = value as Picture;
    return `[Image: ${pic.type?.ext || "unknown"} format, ${pic.data?.length || 0} bytes]`;
  }

  // Handle Buffer data
  if (Buffer.isBuffer(value)) {
    return `[Buffer: ${value.length} bytes]`;
  }

  // Handle dates
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle objects/arrays
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    // Truncate long values
    if (str.length > 80) {
      return str.substring(0, 77) + "...";
    }
    return str;
  }

  return String(value);
}

async function displayDevices(eufySecurity: EufySecurity): Promise<void> {
  logSection("Your Devices");

  const devices = await eufySecurity.getDevices();

  if (devices.length === 0) {
    log("📭", "No devices found", colors.yellow);
    return;
  }

  for (const device of devices) {
    const serial = device.getSerial();
    const name = device.getName();
    const model = device.getModel();

    console.log(`  ${colors.cyan}●${colors.reset} ${colors.bright}${name}${colors.reset}`);
    console.log(`    ${colors.dim}Serial:${colors.reset} ${serial}`);
    console.log(`    ${colors.dim}Model:${colors.reset} ${model}`);
    console.log(`    ${colors.dim}Type:${colors.reset} ${device.getDeviceType()}`);

    // List all properties
    const properties = device.getProperties();
    const propertyNames = Object.keys(properties).sort();

    if (propertyNames.length > 0) {
      console.log(`    ${colors.dim}─── Properties ───${colors.reset}`);
      for (const propName of propertyNames) {
        const value = properties[propName];
        const displayValue = formatPropertyValue(propName, value);
        console.log(`    ${colors.dim}${propName}:${colors.reset} ${displayValue}`);
      }
    }

    console.log();
  }
}

async function displayStations(eufySecurity: EufySecurity): Promise<void> {
  logSection("Your Stations");

  const stations = await eufySecurity.getStations();

  if (stations.length === 0) {
    log("📭", "No stations found", colors.yellow);
    return;
  }

  for (const station of stations) {
    const serial = station.getSerial();
    const name = station.getName();
    const model = station.getModel();
    const connected = station.isConnected() ? "Yes" : "No";

    console.log(`  ${colors.green}●${colors.reset} ${colors.bright}${name}${colors.reset}`);
    console.log(`    ${colors.dim}Serial:${colors.reset} ${serial}`);
    console.log(`    ${colors.dim}Model:${colors.reset} ${model}`);
    console.log(`    ${colors.dim}P2P Connected:${colors.reset} ${connected}`);

    // List all properties
    const properties = station.getProperties();
    const propertyNames = Object.keys(properties).sort();

    if (propertyNames.length > 0) {
      console.log(`    ${colors.dim}─── Properties ───${colors.reset}`);
      for (const propName of propertyNames) {
        const value = properties[propName];
        const displayValue = formatPropertyValue(propName, value);
        console.log(`    ${colors.dim}${propName}:${colors.reset} ${displayValue}`);
      }
    }

    console.log();
  }
}

function showInteractiveMenu(): void {
  logSection("Listening for Events");
  console.log(`${colors.dim}The demo is now monitoring for device events.${colors.reset}`);
  console.log(`${colors.dim}Try triggering motion detection or pressing your doorbell!${colors.reset}\n`);

  console.log(`${colors.bright}Available actions:${colors.reset}`);
  console.log(`  ${colors.cyan}Ctrl+C${colors.reset} - Exit the demo\n`);
}

// Run the demo
main().catch((error: Error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
});

