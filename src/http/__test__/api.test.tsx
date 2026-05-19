import { HTTPApi } from "../api";
import { InvalidCountryCodeError } from "../../error";

jest.mock("../../logging", () => ({
    rootHTTPLogger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
    rootMainLogger: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

// Mock the static method and private loadLibraries to avoid real network/dynamic imports
const getApiBaseSpy = jest
    .spyOn(HTTPApi, "getApiBaseFromCloud")
    .mockResolvedValue("https://security-app.eufylife.com");

const loadLibsSpy = jest
    .spyOn(HTTPApi.prototype as any, "loadLibraries")
    .mockResolvedValue(undefined);

describe("HTTPApi", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("initialize", () => {
        it("should create an instance with a valid country code", async () => {
            const api = await HTTPApi.initialize("DE", "test@test.com", "password123");
            expect(api).toBeInstanceOf(HTTPApi);
            expect(getApiBaseSpy).toHaveBeenCalledWith("DE");
            expect(loadLibsSpy).toHaveBeenCalled();
        });

        it("should throw InvalidCountryCodeError for invalid country code", async () => {
            await expect(HTTPApi.initialize("XX", "test@test.com", "password123")).rejects.toThrow(
                InvalidCountryCodeError,
            );
        });

        it("should throw InvalidCountryCodeError for country code longer than 2 chars", async () => {
            await expect(HTTPApi.initialize("DEU", "test@test.com", "password123")).rejects.toThrow(
                InvalidCountryCodeError,
            );
        });

        it("should not be connected after initialization", async () => {
            const api = await HTTPApi.initialize("DE", "test@test.com", "password123");
            expect(api.isConnected()).toBe(false);
        });
    });

    describe("login", () => {
        it("should emit connection error on failed login when force is true", async () => {
            const api = await HTTPApi.initialize("US", "test@test.com", "password123");
            const errorHandler = jest.fn();
            api.on("connection error", errorHandler);

            // Force login will try to call the request method which doesn't exist (loadLibraries was mocked)
            await api.login({ force: true });

            expect(errorHandler).toHaveBeenCalled();
        });

        it("should emit connect when token is valid and passport profile succeeds", async () => {
            const api = await HTTPApi.initialize("GB", "test@test.com", "password123");
            const connectHandler = jest.fn();
            api.on("connect", connectHandler);

            // Set a valid token so login skips the API call and goes to getPassportProfile
            (api as any).token = "valid-token";
            (api as any).tokenExpiration = new Date(Date.now() + 100000);
            (api as any).getPassportProfile = jest.fn().mockResolvedValue({ email: "test@test.com" });
            (api as any).scheduleRenewAuthToken = jest.fn();

            await api.login();

            expect(connectHandler).toHaveBeenCalled();
            expect(api.isConnected()).toBe(true);
        });

        it("should emit connection error when passport profile returns null", async () => {
            const api = await HTTPApi.initialize("FR", "test@test.com", "password123");
            const errorHandler = jest.fn();
            api.on("connection error", errorHandler);

            (api as any).token = "valid-token";
            (api as any).tokenExpiration = new Date(Date.now() + 100000);
            (api as any).getPassportProfile = jest.fn().mockResolvedValue(null);

            await api.login();

            expect(errorHandler).toHaveBeenCalled();
            expect(api.isConnected()).toBe(false);
        });

        it("should emit connection error when passport profile throws", async () => {
            const api = await HTTPApi.initialize("IT", "test@test.com", "password123");
            const errorHandler = jest.fn();
            api.on("connection error", errorHandler);

            (api as any).token = "valid-token";
            (api as any).tokenExpiration = new Date(Date.now() + 100000);
            (api as any).getPassportProfile = jest.fn().mockRejectedValue(new Error("Network error"));

            await api.login();

            expect(errorHandler).toHaveBeenCalled();
            expect(api.isConnected()).toBe(false);
        });

        it("should not login again if already connected with valid token", async () => {
            const api = await HTTPApi.initialize("DE", "test@test.com", "password123");
            const connectHandler = jest.fn();
            api.on("connect", connectHandler);

            (api as any).token = "valid-token";
            (api as any).tokenExpiration = new Date(Date.now() + 100000);
            (api as any).connected = true;

            await api.login();

            // Should not emit connect again since already connected
            expect(connectHandler).not.toHaveBeenCalled();
        });
    });
});