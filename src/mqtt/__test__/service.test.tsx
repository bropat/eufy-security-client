import { MQTTService } from "../service";
import * as mqtt from "mqtt";
import { EventEmitter } from "events";
import { load } from "protobufjs";
import { readFileSync } from "fs";

jest.mock("mqtt");
jest.mock("protobufjs", () => ({
    load: jest.fn(),
}));
jest.mock("fs", () => ({
    ...jest.requireActual("fs"),
    readFileSync: jest.fn().mockReturnValue(Buffer.from("fake-cert")),
}));
jest.mock("../../logging", () => ({
    rootMainLogger: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
    rootMQTTLogger: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const mockLoad = load as jest.MockedFunction<typeof load>;
const mockMqttConnect = mqtt.connect as jest.MockedFunction<typeof mqtt.connect>;

function createMockClient(): mqtt.MqttClient {
    const emitter = new EventEmitter();
    return Object.assign(emitter, {
        subscribe: jest.fn((_topic: any, _opts: any, cb?: any) => {
            if (typeof cb === "function") cb(null, []);
        }),
        end: jest.fn(),
        publish: jest.fn(),
        unsubscribe: jest.fn(),
        reconnect: jest.fn(),
        connected: true,
        disconnecting: false,
        disconnected: false,
        reconnecting: false,
        incomingStore: undefined,
        outgoingStore: undefined,
        options: {},
        queueQoSZero: true,
    }) as unknown as mqtt.MqttClient;
}

const mockProtoType = {
    decode: jest.fn().mockReturnValue({}),
    toObject: jest.fn().mockReturnValue({
        eventType: 1,
        userId: "user123",
        data: {
            timestamp: 1000,
            uuid: "uuid-123",
            data: {
                stationSn: "SN001",
                deviceSn: "DSN001",
                eventType: 1,
                eventTime: 1000,
                shortUserId: "short1",
                unknown1: "",
                nickName: "test",
                userId: "user123",
                unknown2: "",
                deviceName: "Lock",
                unknown3: "",
                lockState: "locked",
            },
        },
    }),
};

async function createService(): Promise<MQTTService> {
    mockLoad.mockResolvedValue({
        lookupType: jest.fn().mockReturnValue(mockProtoType),
    } as any);
    return MQTTService.init();
}

describe("MQTTService", () => {
    let mockClient: mqtt.MqttClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = createMockClient();
        mockMqttConnect.mockReturnValue(mockClient);
    });

    describe("init", () => {
        it("should create an instance via init()", async () => {
            const service = await createService();
            expect(service).toBeInstanceOf(MQTTService);
        });

        it("should load the protobuf schema", async () => {
            await createService();
            expect(mockLoad).toHaveBeenCalledWith(expect.stringContaining("lock.proto"));
        });
    });

    describe("isConnected", () => {
        it("should return false initially", async () => {
            const service = await createService();
            expect(service.isConnected()).toBe(false);
        });

        it("should return true after connect event", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});
            expect(service.isConnected()).toBe(true);
        });
    });

    describe("connect", () => {
        it("should not connect if no locks are subscribed", async () => {
            const service = await createService();
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            expect(mockMqttConnect).not.toHaveBeenCalled();
        });

        it("should connect when locks are queued", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            expect(mockMqttConnect).toHaveBeenCalledWith(
                "mqtts://security-mqtt.eufylife.com",
                expect.objectContaining({
                    port: 8789,
                    keepalive: 60,
                    clean: true,
                    username: "eufy_client1",
                    password: "test@test.com",
                    clientId: "android_EufySecurity_client1_android1",
                }),
            );
        });

        it("should not connect twice when already connecting", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            expect(mockMqttConnect).toHaveBeenCalledTimes(1);
        });

        it("should subscribe to notice topic on connect", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});
            expect(mockClient.subscribe).toHaveBeenCalledWith("/phone/client1/notice", { qos: 1 });
        });

        it("should subscribe queued locks on connect", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.subscribeLock("DEVICE002");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});
            expect(mockClient.subscribe).toHaveBeenCalledWith(
                "/phone/smart_lock/DEVICE001/push_message",
                { qos: 1 },
                expect.any(Function),
            );
            expect(mockClient.subscribe).toHaveBeenCalledWith(
                "/phone/smart_lock/DEVICE002/push_message",
                { qos: 1 },
                expect.any(Function),
            );
        });

        it("should emit connect event", async () => {
            const service = await createService();
            const connectHandler = jest.fn();
            service.on("connect", connectHandler);
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});
            expect(connectHandler).toHaveBeenCalled();
        });

        it("should emit close event when connection closes", async () => {
            const service = await createService();
            const closeHandler = jest.fn();
            service.on("close", closeHandler);
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("close");
            expect(closeHandler).toHaveBeenCalled();
        });

        it("should set connected to false on close event", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});
            expect(service.isConnected()).toBe(true);
            (mockClient as unknown as EventEmitter).emit("close");
            expect(service.isConnected()).toBe(false);
        });
    });

    describe("broker URL mapping", () => {
        const cases: [string, string][] = [
            ["https://security-app.eufylife.com", "mqtts://security-mqtt.eufylife.com"],
            ["https://security-app-ci.eufylife.com", "mqtts://security-mqtt-ci.eufylife.com"],
            ["https://security-app-qa.eufylife.com", "mqtts://security-mqtt-qa.eufylife.com"],
            ["https://security-app-cn-qa.anker-in.com", "mqtts://security-mqtt-qa.eufylife.com"],
            ["https://security-app-eu.eufylife.com", "mqtts://security-mqtt-eu.eufylife.com"],
            ["https://security-app-short-qa.eufylife.com", "mqtts://security-mqtt-short-qa.eufylife.com"],
            ["https://unknown-api.example.com", "mqtts://security-mqtt.eufylife.com"],
        ];

        it.each(cases)("should map %s to %s", async (apiBase, expectedBroker) => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", apiBase, "test@test.com");
            expect(mockMqttConnect).toHaveBeenCalledWith(expectedBroker, expect.any(Object));
        });
    });

    describe("subscribeLock", () => {
        it("should queue lock if not connected", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            // No connect call yet, so mqtt.connect should not be called
            expect(mockMqttConnect).not.toHaveBeenCalled();
        });

        it("should not queue duplicate lock serial numbers", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});
            const lockCalls = (mockClient.subscribe as jest.Mock).mock.calls.filter(
                (call) => call[0] === "/phone/smart_lock/DEVICE001/push_message",
            );
            expect(lockCalls).toHaveLength(1);
        });

        it("should subscribe immediately if already connected", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});
            jest.clearAllMocks();

            service.subscribeLock("DEVICE002");
            expect(mockClient.subscribe).toHaveBeenCalledWith(
                "/phone/smart_lock/DEVICE002/push_message",
                { qos: 1 },
                expect.any(Function),
            );
        });

        it("should trigger connect when credentials are already set", async () => {
            const service = await createService();
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            // connect was not called because no locks were queued
            expect(mockMqttConnect).not.toHaveBeenCalled();

            service.subscribeLock("DEVICE001");
            // Now subscribeLock should trigger connect since credentials exist
            expect(mockMqttConnect).toHaveBeenCalled();
        });
    });

    describe("message handling", () => {
        it("should emit lock message for smart_lock topics", async () => {
            const service = await createService();
            const lockMsgHandler = jest.fn();
            service.on("lock message", lockMsgHandler);
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});

            (mockClient as unknown as EventEmitter).emit(
                "message",
                "/phone/smart_lock/DEVICE001/push_message",
                Buffer.from("test"),
                {},
            );

            expect(mockProtoType.decode).toHaveBeenCalledWith(Buffer.from("test"));
            expect(lockMsgHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 1,
                    userId: "user123",
                }),
            );
        });

        it("should not emit lock message for non-smart_lock topics", async () => {
            const service = await createService();
            const lockMsgHandler = jest.fn();
            service.on("lock message", lockMsgHandler);
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});

            (mockClient as unknown as EventEmitter).emit("message", "/phone/client1/notice", Buffer.from("test"), {});

            expect(lockMsgHandler).not.toHaveBeenCalled();
        });
    });

    describe("error handling", () => {
        it("should end client on fatal error codes", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");

            for (const code of [1, 2, 4, 5]) {
                jest.clearAllMocks();
                const error = Object.assign(new Error("MQTT error"), { code });
                (mockClient as unknown as EventEmitter).emit("error", error);
                expect(mockClient.end).toHaveBeenCalled();
            }
        });

        it("should not end client on non-fatal error codes", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");

            const error = Object.assign(new Error("MQTT error"), { code: 3 });
            (mockClient as unknown as EventEmitter).emit("error", error);
            expect(mockClient.end).not.toHaveBeenCalled();
        });
    });

    describe("close", () => {
        it("should close the connection when connected", async () => {
            const service = await createService();
            service.subscribeLock("DEVICE001");
            service.connect("client1", "android1", "https://security-app.eufylife.com", "test@test.com");
            (mockClient as unknown as EventEmitter).emit("connect", {});

            service.close();
            expect(mockClient.end).toHaveBeenCalledWith(true);
            expect(service.isConnected()).toBe(false);
        });

        it("should do nothing when not connected", async () => {
            const service = await createService();
            service.close();
            expect(mockClient.end).not.toHaveBeenCalled();
        });
    });
});