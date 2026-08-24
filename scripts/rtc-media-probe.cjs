#!/usr/bin/env node

const { mkdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const { EufySecurity, encodeRTCCommandFrame } = require("../build");
const rtc = require("node-datachannel");

const [persistentFile, usernameFile, passwordFile, sctpDirectory, captureDirectory] = process.argv.slice(2);
if (!persistentFile || !usernameFile || !passwordFile || !sctpDirectory || !captureDirectory) {
  console.error(
    "Usage: node scripts/rtc-media-probe.cjs persistent.json username.txt password.txt sctp-dir capture-dir"
  );
  process.exit(2);
}

const timeout = (promise, label, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out during ${label}`)), timeoutMs)),
  ]);

const createFecManager = async (role, dataChannelId, onFrame, onPacket) => {
  const initialize = require(join(sctpDirectory, "libsctp.js"));
  const module = await initialize({ wasmBinary: readFileSync(join(sctpDirectory, "libsctp.wasm")) });
  module._set_mxlog_level(5);
  const manager = module._sctp_frame_manager_create(
    role === "send" ? 1 : 0,
    dataChannelId,
    15_000,
    role === "send" ? 1_000 : 5_000,
    1_000,
    10
  );
  if (!manager) throw new Error(`Unable to create ${role} FEC manager`);

  const callbacks = [];
  if (onFrame) {
    const callback = module.addFunction((id, channel, pointer, size) => {
      onFrame(channel, Buffer.from(module.HEAPU8.slice(pointer, pointer + size)));
      return 0;
    }, "iiiii");
    callbacks.push(callback);
    module._sctp_frame_manager_set_recv_frame_callback(manager, callback);
  }
  if (onPacket) {
    const callback = module.addFunction((id, pointer, size) => {
      onPacket(Buffer.from(module.HEAPU8.slice(pointer, pointer + size)));
      return 0;
    }, "iiii");
    callbacks.push(callback);
    module._sctp_frame_manager_set_send_packet_callback(manager, callback);
  }

  return {
    receive(packet) {
      const packetBuffer = module._sctp_frame_manager_get_packet_buffer(manager, packet.byteLength);
      if (!packetBuffer) throw new Error("Unable to allocate an incoming FEC packet");
      const data = module._sctp_packet_get_data(packetBuffer);
      module.HEAPU8.set(packet, data);
      const result = module._sctp_frame_manager_push_packet_data(manager, packetBuffer);
      if (result) throw new Error(`Incoming FEC packet failed with ${result}`);
    },
    send(channel, frame) {
      const frameBuffer = module._sctp_frame_manager_get_frame_buffer(manager, frame.byteLength);
      if (!frameBuffer) throw new Error("Unable to allocate an outgoing FEC frame");
      const data = module._sctp_frame_buffer_get_data(frameBuffer);
      module.HEAPU8.set(frame, data);
      module._sctp_frame_buffer_set_size(frameBuffer, frame.byteLength);
      const linkToChannel = new Map([
        [1, 0],
        [2, 3],
        [3, 2],
        [4, 4],
        [5, 5],
        [6, 5],
      ]);
      const result = module._sctp_frame_manager_push_frame_data(manager, frameBuffer, linkToChannel.get(channel));
      if (result) throw new Error(`Outgoing FEC frame failed with ${result}`);
    },
    tick() {
      module._sctp_frame_manager_on_100ms_timer(manager, Date.now());
    },
    close() {
      module._sctp_frame_manager_destroy(manager);
    },
  };
};

const describeFrame = (channel, frame) => {
  const description = {
    channel,
    bytes: frame.byteLength,
    prefix: frame.subarray(0, 16).toString("hex"),
  };
  if (
    frame.byteLength >= 16 &&
    frame[0] === 0x58 &&
    frame[1] === 0x5a &&
    frame[2] === 0x59 &&
    frame[3] === 0x48
  ) {
    description.command = frame.readUInt16LE(4);
    description.payloadBytes = frame.readUInt32LE(6);
    description.segment = frame[11];
    description.channelId = frame[12];
    description.response = frame[14];
    description.deviceType = frame[15];
  }
  return description;
};

const main = async () => {
  mkdirSync(captureDirectory, { recursive: true });
  const persisted = JSON.parse(readFileSync(persistentFile, "utf8"));
  const driver = await EufySecurity.initialize({
    username: readFileSync(usernameFile, "utf8").trim(),
    password: readFileSync(passwordFile, "utf8").trim(),
    country: persisted.country || persisted.megaApi.ab || "US",
    language: "en",
    trustedDeviceName: "LocalRTCMediaProbe",
    persistentData: JSON.stringify(persisted),
    pollingIntervalMinutes: 60,
  });

  let signal;
  let peer;
  let sendFec;
  let receiveFec;
  let fecTimer;
  let sampleCount = 0;
  let remoteDescriptionSet = false;
  let targetConfig;
  let commandScheduled = false;
  const channels = [];
  const pendingCandidates = [];
  const mediaChannelIds = new Set();
  const result = {
    connected: false,
    answer: false,
    channels: 0,
    packets: 0,
    frames: 0,
    liveFrames: 0,
    localCandidates: 0,
    remoteCandidates: 0,
    peerState: "new",
    outgoingPackets: 0,
    channelIds: [],
    heartbeats: 0,
    offerSetup: "",
    answerSetup: "",
    cameraCount: 0,
    targetChannel: -1,
    targetType: -1,
    accountMatchesCloudUser: false,
    targetChannels: [],
    mediaChannelIds: [],
  };

  try {
    await timeout(driver.connect(), "driver connection", 45_000);
    const devices = await driver.getDevices();
    result.cameraCount = devices.filter((device) => device.isCamera()).length;
    const eligibleTargets = [];
    for (const device of devices) {
      const station = await driver.getStation(device.getStationSerial());
      if (station.isRTCConnectableDevice() && device.isCamera()) {
        eligibleTargets.push(device);
        targetConfig = station.getRTCTransportConfig();
      }
    }
    const targetIndex = Number(process.env.RTC_PROBE_CAMERA_INDEX || 0);
    const targets = eligibleTargets.slice(targetIndex, targetIndex + Number(process.env.RTC_PROBE_CAMERA_COUNT || 1));
    const target = targets[0];
    if (!target || !targetConfig) throw new Error("No RTC-managed camera is available");
    result.targetChannel = target.getChannel();
    result.targetType = target.getDeviceType();
    result.accountMatchesCloudUser = targetConfig.accountId === persisted.megaApi.user_id;
    result.targetChannels = targets.map((device) => device.getChannel());
    signal = await driver.getRTCSignalClient(target.getSerial());

    let resolveDone;
    const done = new Promise((resolve) => {
      resolveDone = resolve;
    });

    signal.once("servers", async (turn) => {
      const iceServers = [
        {
          hostname: turn.turn_addr,
          port: turn.turn_port,
          username: turn.turn_user,
          password: turn.turn_password,
          relayType: "TurnUdp",
        },
      ];
      peer = new rtc.PeerConnection("local-rtc-probe", {
        iceServers,
        disableAutoNegotiation: true,
      });
      peer.onLocalDescription((sdp, type) => {
        result.answerSetup = sdp.match(/a=setup:([^\r\n]+)/)?.[1] ?? "";
        if (type.toLowerCase() === "answer") {
          result.answer = true;
          signal.sendSdpAnswer(sdp);
        }
      });
      peer.onLocalCandidate((candidate) => {
        result.localCandidates += 1;
        signal.sendCandidate(candidate);
      });
      peer.onStateChange((state) => {
        result.peerState = state;
        result.connected = state === "connected";
      });

      receiveFec = await createFecManager(
        "receive",
        1,
        (channel, frame) => {
          result.frames += 1;
          if (channel === 1 || channel === 5) result.liveFrames += 1;
          if (frame.byteLength >= 16 && frame.readUInt16LE(4) === 1300) {
            mediaChannelIds.add(frame[12]);
            result.mediaChannelIds = [...mediaChannelIds];
          }
          if (sampleCount < 40) {
            writeFileSync(join(captureDirectory, `frame-${String(sampleCount).padStart(3, "0")}.bin`), frame);
            console.log(JSON.stringify(describeFrame(channel, frame)));
            sampleCount += 1;
          }
          if (result.liveFrames >= 20 && mediaChannelIds.size >= targets.length) resolveDone();
        },
        (packet) => {
          const channel = channels.find((candidate) => candidate && candidate.isOpen());
          if (channel) channel.sendMessageBinary(packet);
        }
      );
      sendFec = await createFecManager("send", 0, undefined, (packet) => {
        result.outgoingPackets += 1;
        const channel = channels.find((candidate) => candidate && candidate.isOpen());
        if (channel) channel.sendMessageBinary(packet);
      });
      fecTimer = setInterval(() => receiveFec.tick(), 100);

      const labels = ["WebrtcDataChannel", "audio", "idr", "video", "notify", "download"];
      labels.forEach((label, index) => {
        const channel = peer.createDataChannel(label);
        channels[index] = channel;
        result.channelIds[index] = channel.getId();
        channel.onOpen(() => {
          result.channelIds[index] = channel.getId();
          result.channels = channels.filter((candidate) => candidate?.isOpen()).length;
          if (index === 0) {
            const heartbeat = Buffer.alloc(36);
            heartbeat.set([0x00, 0x09, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x63], 0);
            heartbeat.set(encodeRTCCommandFrame({ commandId: 1139, channelId: 0 }), 20);
            channel.sendMessageBinary(heartbeat);
          }
          if (result.channels !== labels.length || commandScheduled) return;
          commandScheduled = true;
          const closeLive = encodeRTCCommandFrame({
            commandId: 1350,
            channelId: 255,
            payload: {
              account_id: targetConfig.accountId,
              cmd: 1004,
              payload: {},
            },
            segment: 1,
          });
          const openLive = encodeRTCCommandFrame({
            commandId: 1350,
            channelId: 255,
            payload: {
              account_id: targetConfig.accountId,
              cmd: 1003,
              payload: {
                ClientOS: "WEB",
                entrytype: 1,
                camera_type: 0,
                streamtype: Number(process.env.RTC_PROBE_STREAM_TYPE || 2),
                key: "",
                msg_id: "",
                audio_chn: -1,
                stitch_mode: 1,
                chn_list: targets.map((device, targetIndex) => ({
                  index: targetIndex,
                  chn: device.getChannel(),
                  sensor: Number(process.env.RTC_PROBE_SENSOR || 0),
                })),
              },
            },
            segment: 2,
          });
          setTimeout(() => {
            sendFec.send(1, closeLive);
            setTimeout(() => sendFec.send(1, openLive), 500);
          }, 500);
        });
        channel.onMessage((message) => {
          const packet =
            typeof message === "string"
              ? Buffer.from(message)
              : Buffer.isBuffer(message)
                ? message
                : Buffer.from(message);
          result.packets += 1;
          if (packet.byteLength >= 26 && packet.readUInt16LE(24) === 1139) result.heartbeats += 1;
          if (
            packet.byteLength >= 4 &&
            packet[0] === 0x50 &&
            packet[1] === 0x54 &&
            packet[2] === 0x43 &&
            packet[3] === 0x53
          ) {
            receiveFec.receive(packet);
          }
        });
      });
    });

    signal.once("offer", (offer) => {
      result.offerSetup = offer.match(/a=setup:([^\r\n]+)/)?.[1] ?? "";
      peer?.setRemoteDescription(offer, "offer");
      peer?.setLocalDescription("answer");
      remoteDescriptionSet = true;
      pendingCandidates.splice(0).forEach((candidate) => peer?.addRemoteCandidate(candidate, "2"));
    });
    signal.on("candidate", (candidate) => {
      result.remoteCandidates += 1;
      if (remoteDescriptionSet) peer?.addRemoteCandidate(candidate, "2");
      else pendingCandidates.push(candidate);
    });
    signal.on("error", (error) => {
      console.error(JSON.stringify({ signalingError: error.message }));
    });
    await timeout(signal.connect(), "signaling connection", 20_000);
    await timeout(done, "live media", 30_000);
    console.log(JSON.stringify({ summary: result }));
  } catch (error) {
    console.error(JSON.stringify({ summary: result, error: error.message }));
    throw error;
  } finally {
    clearInterval(fecTimer);
    try {
      if (sendFec) {
        sendFec.send(
          1,
          encodeRTCCommandFrame({
            commandId: 1350,
            channelId: 255,
            payload: { account_id: targetConfig?.accountId ?? "", cmd: 1004, payload: {} },
            segment: 0,
          })
        );
      }
    } catch {}
    receiveFec?.close();
    sendFec?.close();
    channels.forEach((channel) => channel?.close());
    peer?.close();
    signal?.close();
    driver.close();
    rtc.cleanup();
  }
};

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
});
