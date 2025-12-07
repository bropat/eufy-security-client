"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
class Cache extends Map {
    ttl = 60000;
    schedules = new Map();
    constructor(ttl) {
        super();
        if (ttl !== undefined)
            this.ttl = ttl;
    }
    delete(key) {
        const result = super.delete(key);
        clearTimeout(this.schedules.get(key));
        this.schedules.delete(key);
        return result;
    }
    set(key, value, ttl = this.ttl) {
        super.set(key, value);
        if (this.schedules.has(key)) {
            clearTimeout(this.schedules.get(key));
        }
        const schedule = setTimeout(() => {
            this.delete(key);
        }, ttl);
        this.schedules.set(key, schedule);
        return this;
    }
    get(key) {
        return super.get(key);
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map