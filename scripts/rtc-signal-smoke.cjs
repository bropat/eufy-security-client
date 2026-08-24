#!/usr/bin/env node

const { readFileSync } = require("fs");
const { EufySecurity } = require("../build");

const persistentFile = process.argv[2];
const usernameFile = process.argv[3];
const passwordFile = process.argv[4];
if (!persistentFile || !usernameFile || !passwordFile) {
  console.error(
    "Usage: node scripts/rtc-signal-smoke.cjs /path/to/persistent.json /path/to/username /path/to/password"
  );
  process.exit(2);
}

const waitForSignal = (client, event) =>
  new Promise((resolve) => {
    const onEvent = (...args) => {
      resolve(args);
    };
    client.once(event, onEvent);
  });

const withTimeout = async (promise, label, timeoutMs) => {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out during RTC ${label}`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
};

const main = async () => {
  const persisted = JSON.parse(readFileSync(persistentFile, "utf8"));
  if (!persisted.megaApi) throw new Error("No persisted v6 session is available");
  const driver = await EufySecurity.initialize({
    username: readFileSync(usernameFile, "utf8").trim(),
    password: readFileSync(passwordFile, "utf8").trim(),
    country: persisted.country || persisted.megaApi.ab || "US",
    language: "en",
    trustedDeviceName: "LocalRTCSignalSmokeTest",
    persistentData: JSON.stringify(persisted),
    pollingIntervalMinutes: 60,
  });
  const result = {
    driverConnected: false,
    inventory: false,
    socketOpen: false,
    authenticated: false,
    turn: false,
    offer: false,
    candidates: 0,
  };
  let client;

  try {
    await withTimeout(driver.connect(), "driver connection", 45_000);
    if (!driver.isConnected()) throw new Error("The driver did not reach its connected state");
    result.driverConnected = true;

    const devices = await driver.getDevices();
    let target;
    for (const device of devices) {
      const station = await driver.getStation(device.getStationSerial());
      if (station.isRTCConnectableDevice()) {
        target = device;
        break;
      }
    }
    if (!target) throw new Error("No RTC-managed device was found");
    result.inventory = true;

    client = await driver.getRTCSignalClient(target.getSerial());
    client.on("authenticated", () => {
      result.authenticated = true;
    });
    client.on("servers", () => {
      result.turn = true;
    });
    client.on("offer", () => {
      result.offer = true;
    });
    client.on("candidate", () => {
      result.candidates += 1;
    });
    client.on("connection limit", () => {
      throw new Error("The RTC service reported its connection limit");
    });
    client.on("error", (error) => {
      console.error(`RTC signaling error: ${error.message}`);
    });

    const offer = waitForSignal(client, "offer");
    await withTimeout(client.connect(), "socket open", 15_000);
    result.socketOpen = true;
    await withTimeout(offer, "offer", 20_000);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ ...result, error: error.message }));
    throw error;
  } finally {
    client?.close();
    driver.close();
  }
};

main().catch((error) => {
  console.error(`RTC signaling smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
