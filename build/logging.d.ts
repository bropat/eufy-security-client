import { LogLevel } from "typescript-logging";
export type LoggingCategories = "all" | "main" | "http" | "p2p" | "push" | "mqtt";
export { LogLevel };
export interface Logger {
    trace(message: unknown, ...args: unknown[]): void;
    debug(message: unknown, ...args: unknown[]): void;
    info(message: unknown, ...args: unknown[]): void;
    warn(message: unknown, ...args: unknown[]): void;
    error(message: unknown, ...args: unknown[]): void;
    fatal?(message: unknown, ...args: unknown[]): void;
}
export declare const dummyLogger: Logger;
export declare class InternalLogger {
    static logger: Logger | undefined;
}
export declare const rootMainLogger: import("typescript-logging-category-style").Category;
export declare const rootHTTPLogger: import("typescript-logging-category-style").Category;
export declare const rootMQTTLogger: import("typescript-logging-category-style").Category;
export declare const rootPushLogger: import("typescript-logging-category-style").Category;
export declare const rootP2PLogger: import("typescript-logging-category-style").Category;
export declare const setLoggingLevel: (category?: LoggingCategories, level?: LogLevel) => void;
export declare const getLoggingLevel: (category?: LoggingCategories) => number;
