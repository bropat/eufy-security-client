
import { generateFid, VALID_FID_PATTERN, buildCheckinRequest, parseCheckinResponse, sleep, convertTimestampMs } from "../utils";
import { load } from "protobufjs";
import * as path from "path";

jest.mock("../../logging", () => ({
    rootPushLogger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe("push/utils", () => {
    describe("VALID_FID_PATTERN", () => {
        it("should match a valid FID starting with c-f and 21 word chars", () => {
            expect(VALID_FID_PATTERN.test("cabcdefghijklmnopqrstu")).toBe(true);
            expect(VALID_FID_PATTERN.test("dabcdefghijklmnopqrstu")).toBe(true);
            expect(VALID_FID_PATTERN.test("eabcdefghijklmnopqrstu")).toBe(true);
            expect(VALID_FID_PATTERN.test("fabcdefghijklmnopqrstu")).toBe(true);
        });

        it("should reject FIDs not starting with c-f", () => {
            expect(VALID_FID_PATTERN.test("aabcdefghijklmnopqrstu")).toBe(false);
            expect(VALID_FID_PATTERN.test("babcdefghijklmnopqrstu")).toBe(false);
            expect(VALID_FID_PATTERN.test("gabcdefghijklmnopqrstu")).toBe(false);
        });

        it("should reject FIDs with wrong length", () => {
            expect(VALID_FID_PATTERN.test("cabcdefghijklmnopqrst")).toBe(false);
            expect(VALID_FID_PATTERN.test("cabcdefghijklmnopqrstuv")).toBe(false);
        });

        it("should allow hyphens and underscores in the body", () => {
            expect(VALID_FID_PATTERN.test("cabc-efghijklmnopqrstu")).toBe(true);
            expect(VALID_FID_PATTERN.test("cabc_efghijklmnopqrstu")).toBe(true);
        });
    });

    describe("generateFid", () => {
        it("should return a 22-character string", () => {
            const fid = generateFid();
            expect(fid).toHaveLength(22);
        });

        it("should match the VALID_FID_PATTERN", () => {
            for (let i = 0; i < 20; i++) {
                const fid = generateFid();
                expect(VALID_FID_PATTERN.test(fid)).toBe(true);
            }
        });

        it("should start with c, d, e, or f", () => {
            for (let i = 0; i < 20; i++) {
                const fid = generateFid();
                expect(["c", "d", "e", "f"]).toContain(fid[0]);
            }
        });

        it("should generate unique FIDs", () => {
            const fids = new Set<string>();
            for (let i = 0; i < 50; i++) {
                fids.add(generateFid());
            }
            expect(fids.size).toBe(50);
        });
    });

    describe("buildCheckinRequest", () => {
        it("should return a Uint8Array", async () => {
            const result = await buildCheckinRequest();
            expect(result).toBeInstanceOf(Uint8Array);
        });

        it("should return a non-empty buffer", async () => {
            const result = await buildCheckinRequest();
            expect(result.length).toBeGreaterThan(0);
        });

        it("should produce consistent output", async () => {
            const result1 = await buildCheckinRequest();
            const result2 = await buildCheckinRequest();
            expect(Buffer.from(result1).equals(Buffer.from(result2))).toBe(true);
        });
    });

    describe("parseCheckinResponse", () => {
        it("should decode a checkin response encoded by the same proto", async () => {
            const root = await load(path.join(__dirname, "../proto/checkin.proto"));
            const CheckinResponseModel = root.lookupType("CheckinResponse");

            const payload = {
                statsOk: true,
                timeMs: 1234567890,
                androidId: 9876543210,
                securityToken: 555666777,
                versionInfo: "1.0",
                deviceDataVersionInfo: "2.0",
            };
            const message = CheckinResponseModel.create(payload);
            const encoded = Buffer.from(CheckinResponseModel.encode(message).finish());

            const result = await parseCheckinResponse(encoded);
            expect(result.statsOk).toBe(true);
            expect(result.androidId).toBe("9876543210");
            expect(result.securityToken).toBe("555666777");
        });
    });

    describe("sleep", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it("should resolve after the specified time", async () => {
            const callback = jest.fn();
            const promise = sleep(1000).then(callback);

            expect(callback).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1000);
            await promise;
            expect(callback).toHaveBeenCalled();
        });

        it("should resolve with undefined", async () => {
            const promise = sleep(100);
            jest.advanceTimersByTime(100);
            const result = await promise;
            expect(result).toBeUndefined();
        });
    });

    describe("convertTimestampMs", () => {
        it("should convert a 10-digit timestamp (seconds) to milliseconds", () => {
            expect(convertTimestampMs(1672531200)).toBe(1672531200000);
        });

        it("should return a 13-digit timestamp (milliseconds) as-is", () => {
            expect(convertTimestampMs(1672531200000)).toBe(1672531200000);
        });

        it("should return other length timestamps as-is", () => {
            expect(convertTimestampMs(12345678901)).toBe(12345678901);
        });

        it("should handle zero", () => {
            expect(convertTimestampMs(0)).toBe(0);
        });
    });
});
