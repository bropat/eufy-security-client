import { RTCSignalClient, RTCWebSocketLike, RTCWebSocketMessageEvent } from "./signaling";

class FakeWebSocket implements RTCWebSocketLike {
  public readyState = 1;
  public onopen: (() => void) | null = null;
  public onmessage: ((event: RTCWebSocketMessageEvent) => void) | null = null;
  public onerror: ((event: unknown) => void) | null = null;
  public onclose: (() => void) | null = null;
  public readonly sent: Array<string> = [];

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  public open(): void {
    this.onopen?.();
  }

  public receive(data: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

const innerMessage = (dataType: string | undefined, data: Record<string, unknown>, action = 3) => ({
  data: JSON.stringify({
    action,
    dataType,
    data: JSON.stringify(data),
  }),
});

describe("RTC signaling", () => {
  it("authenticates, starts scall, and consumes TURN/SDP/ICE messages", async () => {
    const socket = new FakeWebSocket();
    let socketUrl = "";
    let socketProtocols: Array<string> = [];
    const client = new RTCSignalClient({
      endpoint: new URL("https://signal.example.test"),
      stationSerial: "station-local",
      deviceSerial: "camera-local",
      channel: 0,
      accountId: "account-local",
      authToken: "token-local",
      globalToken: "global-local",
      country: "us",
      signalingDeviceType: "NVR",
      signalingRequestType: "nvr",
      getSign: async () => "sign-local",
      now: () => 1234000,
      createMessageId: () => "message-local",
      webSocketFactory: (url, protocols) => {
        socketUrl = url;
        socketProtocols = protocols;
        return socket;
      },
    });

    const servers = jest.fn();
    const offers = jest.fn();
    const candidates = jest.fn();
    client.on("servers", servers);
    client.on("offer", offers);
    client.on("candidate", candidates);

    const connecting = client.connect();
    await Promise.resolve();
    socket.open();
    await connecting;

    expect(socketUrl).toBe("wss://signal.example.test/v1/rtc/ws/join?reqtype=nvr");
    expect(socketProtocols[0]).toBe("v1");
    const protocol = JSON.parse(Buffer.from(socketProtocols[1], "base64url").toString("utf8"));
    expect(protocol).toMatchObject({
      region: "US",
      type: "NVR",
      sn: "station-local",
      token: "token-local",
      sign: "sign-local",
      appName: "eufy_mega",
      modelType: "WEB",
    });

    const auth = JSON.parse(JSON.parse(socket.sent[0]).data);
    expect(auth).toMatchObject({ action: 1, code: 200, source: "WEB", data: "sign-local" });

    socket.receive(innerMessage(undefined, {}, 1));
    await Promise.resolve();
    const call = JSON.parse(JSON.parse(socket.sent[1]).data);
    expect(call).toMatchObject({
      action: 3,
      dataType: "scall",
      sessionId: "sign-local",
      source: "WEB",
    });

    const turn = {
      turn_addr: "192.0.2.20",
      turn_port: 3478,
      turn_user: "turn-user",
      turn_password: "turn-password",
    };
    socket.receive(innerMessage("scall", { status: 100, turn }));
    socket.receive(
      innerMessage("info", {
        format: "SDP",
        value: JSON.stringify({ ice: { ufrag: "u", pwd: "p", fingerprint: "0011" } }),
      })
    );
    socket.receive(innerMessage("info", { format: "CANDIDATE", value: "candidate-value" }));
    await Promise.resolve();

    expect(servers).toHaveBeenCalledWith(turn);
    expect(offers.mock.calls[0][0]).toContain("m=application 9 UDP/DTLS/SCTP webrtc-datachannel");
    expect(candidates).toHaveBeenCalledWith("candidate-value");
    client.close();
  });

  it("sends compact SDP answers and candidates as info messages", async () => {
    const socket = new FakeWebSocket();
    const client = new RTCSignalClient({
      endpoint: new URL("https://signal.example.test"),
      stationSerial: "station-local",
      accountId: "account-local",
      authToken: "token-local",
      globalToken: "global-local",
      country: "us",
      signalingDeviceType: "NVR",
      signalingRequestType: "nvr",
      getSign: async () => "sign-local",
      now: () => 1234000,
      createMessageId: () => "message-local",
      webSocketFactory: () => socket,
    });
    const connecting = client.connect();
    await Promise.resolve();
    socket.open();
    await connecting;

    client.sendSdpAnswer("v=0\r\na=ice-ufrag:u\r\na=ice-pwd:p\r\na=fingerprint:sha-256 00:11\r\na=setup:active\r\n");
    client.sendCandidate("candidate-value");

    const answer = JSON.parse(JSON.parse(socket.sent[1]).data);
    const answerData = JSON.parse(answer.data);
    expect(answer.dataType).toBe("info");
    expect(JSON.parse(answerData.sdp)).toMatchObject({
      setup: "active",
      ice: { ufrag: "u", pwd: "p", fingerprint: "0011" },
    });

    const candidate = JSON.parse(JSON.parse(socket.sent[2]).data);
    expect(JSON.parse(candidate.data).candidate).toBe("candidate-value");
    client.close();
  });
});
