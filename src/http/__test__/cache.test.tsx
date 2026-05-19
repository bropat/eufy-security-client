import { Cache } from "../cache";

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe("Cache", () => {
    it("should store and retrieve a value", () => {
        const cache = new Cache();
        cache.set("key", "value");
        expect(cache.get("key")).toBe("value");
    });

    it("should return undefined for a missing key", () => {
        const cache = new Cache();
        expect(cache.get("missing")).toBeUndefined();
    });

    it("should use default TTL of 60 seconds", () => {
        const cache = new Cache();
        cache.set("key", "value");

        jest.advanceTimersByTime(59999);
        expect(cache.get("key")).toBe("value");

        jest.advanceTimersByTime(1);
        expect(cache.get("key")).toBeUndefined();
    });

    it("should accept a custom TTL via constructor", () => {
        const cache = new Cache(5000);
        cache.set("key", "value");

        jest.advanceTimersByTime(4999);
        expect(cache.get("key")).toBe("value");

        jest.advanceTimersByTime(1);
        expect(cache.get("key")).toBeUndefined();
    });

    it("should accept a per-entry TTL override", () => {
        const cache = new Cache();
        cache.set("short", "value", 1000);
        cache.set("long", "value", 10000);

        jest.advanceTimersByTime(1000);
        expect(cache.get("short")).toBeUndefined();
        expect(cache.get("long")).toBe("value");

        jest.advanceTimersByTime(9000);
        expect(cache.get("long")).toBeUndefined();
    });

    it("should overwrite existing value and reset TTL on re-set", () => {
        const cache = new Cache(5000);
        cache.set("key", "first");

        jest.advanceTimersByTime(3000);
        cache.set("key", "second");

        jest.advanceTimersByTime(3000);
        expect(cache.get("key")).toBe("second");

        jest.advanceTimersByTime(2000);
        expect(cache.get("key")).toBeUndefined();
    });

    it("should delete a value and clear its timer", () => {
        const cache = new Cache();
        cache.set("key", "value");

        const result = cache.delete("key");
        expect(result).toBe(true);
        expect(cache.get("key")).toBeUndefined();
    });

    it("should return false when deleting a non-existent key", () => {
        const cache = new Cache();
        expect(cache.delete("missing")).toBe(false);
    });

    it("should handle multiple keys independently", () => {
        const cache = new Cache(10000);
        cache.set("a", 1);
        cache.set("b", 2);
        cache.set("c", 3);

        cache.delete("b");

        expect(cache.get("a")).toBe(1);
        expect(cache.get("b")).toBeUndefined();
        expect(cache.get("c")).toBe(3);

        jest.advanceTimersByTime(10000);
        expect(cache.get("a")).toBeUndefined();
        expect(cache.get("c")).toBeUndefined();
    });

    it("should support non-string keys", () => {
        const cache = new Cache();
        const objKey = { id: 1 };

        cache.set(objKey, "obj-value");
        cache.set(42, "num-value");

        expect(cache.get(objKey)).toBe("obj-value");
        expect(cache.get(42)).toBe("num-value");
    });

    it("should return itself from set() for chaining", () => {
        const cache = new Cache();
        const result = cache.set("key", "value");
        expect(result).toBe(cache);
    });

    it("should report correct size", () => {
        const cache = new Cache();
        cache.set("a", 1);
        cache.set("b", 2);
        expect(cache.size).toBe(2);

        cache.delete("a");
        expect(cache.size).toBe(1);

        jest.advanceTimersByTime(60000);
        expect(cache.size).toBe(0);
    });

    it("should not expire entry if deleted before TTL", () => {
        const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
        const cache = new Cache(5000);

        cache.set("key", "value");
        cache.delete("key");

        expect(clearTimeoutSpy).toHaveBeenCalled();
        jest.advanceTimersByTime(5000);
        expect(cache.size).toBe(0);

        clearTimeoutSpy.mockRestore();
    });
});