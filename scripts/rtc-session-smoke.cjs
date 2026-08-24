#!/usr/bin/env node

const { readFileSync, writeFileSync } = require("fs");

const clientPath = process.env.EUFY_SECURITY_CLIENT_PATH || "../build";
const { EufySecurity, VideoCodec } = require(clientPath);

const [persistentFile, usernameFile, passwordFile] = process.argv.slice(2);
if (!persistentFile || !usernameFile || !passwordFile) {
  console.error("Usage: node rtc-session-smoke.cjs persistent.json username.txt password.txt");
  process.exit(2);
}

const withTimeout = (promise, label, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out during ${label}`)), timeoutMs)),
  ]);

const main = async () => {
  const persisted = JSON.parse(readFileSync(persistentFile, "utf8"));
  const driver = await EufySecurity.initialize({
    username: readFileSync(usernameFile, "utf8").trim(),
    password: readFileSync(passwordFile, "utf8").trim(),
    country: persisted.country || persisted.megaApi.ab || "US",
    language: "en",
    trustedDeviceName: "LocalRTCMultiStreamTest",
    persistentData: JSON.stringify(persisted),
    pollingIntervalMinutes: 60,
  });
  const records = new Map();
  let resolveStreams;
  let rejectStreams;
  const streamsReady = new Promise((resolve, reject) => {
    resolveStreams = resolve;
    rejectStreams = reject;
  });

  try {
    await withTimeout(driver.connect(), "driver connection", 45_000);
    const cameras = [];
    for (const device of await driver.getDevices()) {
      if (!device.isCamera()) continue;
      const station = await driver.getStation(device.getStationSerial());
      if (station.isRTCConnectableDevice()) cameras.push(device);
    }

    const requestedCount = Number(process.env.RTC_SMOKE_COUNT || cameras.length);
    const startIndex = Number(process.env.RTC_SMOKE_START || 0);
    const targets = cameras.slice(startIndex, startIndex + requestedCount);
    if (!targets.length) throw new Error("No RTC-managed cameras are available");
    if (process.env.RTC_SMOKE_TARGET_FILE) {
      writeFileSync(process.env.RTC_SMOKE_TARGET_FILE, targets[0].getSerial(), { mode: 0o600 });
    }
    const stations = new Map();
    for (const device of targets) {
      records.set(device.getSerial(), {
        stationSerial: device.getStationSerial(),
        channel: device.getChannel(),
        bytes: 0,
        chunks: 0,
        codec: "unknown",
        started: false,
        complete: false,
      });
      stations.set(device.getStationSerial(), await driver.getStation(device.getStationSerial()));
    }
    for (const station of stations.values()) {
      station.on("livestream error", (failedStation, channel, error) => {
        const record = [...records.values()].find(
          (candidate) => candidate.stationSerial === failedStation.getSerial() && candidate.channel === channel
        );
        if (record) rejectStreams(new Error(error.message));
      });
    }

    driver.on("station livestream start", (_station, device, metadata, videoStream) => {
      const record = records.get(device.getSerial());
      if (!record) return;
      record.started = true;
      record.codec = VideoCodec[metadata.videoCodec] || String(metadata.videoCodec);
      videoStream.on("data", (chunk) => {
        record.bytes += chunk.byteLength;
        record.chunks += 1;
        if (record.bytes >= 64 * 1024) record.complete = true;
        if ([...records.values()].every((candidate) => candidate.complete)) resolveStreams();
      });
      videoStream.on("error", rejectStreams);
    });
    driver.on("station livestream stop", (_station, device) => {
      const record = records.get(device.getSerial());
      if (record && !record.complete) rejectStreams(new Error("A stream stopped before delivering video"));
    });

    const staggerMs = Number(process.env.RTC_SMOKE_STAGGER_MS || 0);
    if (staggerMs > 0) {
      for (const device of targets) {
        await driver.startStationLivestream(device.getSerial());
        await new Promise((resolve) => setTimeout(resolve, staggerMs));
      }
    } else {
      await Promise.all(targets.map((device) => driver.startStationLivestream(device.getSerial())));
    }
    try {
      await withTimeout(streamsReady, "concurrent media delivery", 90_000);
    } catch (error) {
      const values = [...records.values()];
      throw new Error(
        `${error.message}; requested=${targets.length}, started=${values.filter((record) => record.started).length}, receiving=${values.filter((record) => record.bytes > 0).length}, complete=${values.filter((record) => record.complete).length}`
      );
    }

    const values = [...records.values()];
    console.log(
      JSON.stringify({
        eligibleCameras: cameras.length,
        requestedStreams: targets.length,
        streaming: values.filter((record) => record.complete).length,
        videoBytes: values.reduce((total, record) => total + record.bytes, 0),
        codecs: [...new Set(values.map((record) => record.codec))],
      })
    );

    await Promise.allSettled(targets.map((device) => driver.stopStationLivestream(device.getSerial())));
  } finally {
    driver.close();
  }
};

main().then(
  () => process.exit(0),
  (error) => {
    console.error(`RTC session smoke test failed: ${error.message}`);
    process.exit(1);
  }
);
