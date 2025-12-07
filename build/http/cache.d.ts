export declare class Cache extends Map {
    private ttl;
    private schedules;
    constructor(ttl?: number);
    delete(key: any): boolean;
    set(key: any, value: any, ttl?: number): this;
    get(key: any): any;
}
