/**
 *  Logging utils
 */

import { LogLevel } from "typescript-logging";
import { CategoryProvider } from "typescript-logging-category-style";

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

export class InternalLogger {
  public static logger: Logger | undefined;
}

/**
 *
 * Get method name
 *
 *
 */
const getMethodName = function (): string | undefined {
  const matches = new Error("").stack?.split("\n")[6].match(/ at( new){0,1} ([a-zA-Z0-9_.]+) /);
  if (matches !== null && matches !== undefined && matches[2] !== undefined && matches[2] !== "eval") {
    return matches[2];
  }
  return undefined;
};

const provider = CategoryProvider.createProvider("EufySecurityClientProvider", {
  level: LogLevel.Debug,
  channel: {
    type: "RawLogChannel",
    write: (msg) => {
      const methodName = getMethodName();
      const method = methodName ? `[${methodName}] ` : "";
      const logMessage = `[${msg.logNames}] ${method}${msg.message}`;

      switch (msg.level) {
        case LogLevel.Trace:
          InternalLogger.logger?.trace(logMessage, ...(msg.args ?? []));
          break;
        case LogLevel.Debug:
          InternalLogger.logger?.debug(logMessage, ...(msg.args ?? []));
          break;
        case LogLevel.Info:
          InternalLogger.logger?.info(logMessage, ...(msg.args ?? []));
          break;
        case LogLevel.Warn:
          InternalLogger.logger?.warn(logMessage, ...(msg.args ?? []));
          break;
        case LogLevel.Error:
          InternalLogger.logger?.error(logMessage, ...(msg.args ?? []));
          break;
        case LogLevel.Fatal:
          if (InternalLogger.logger && InternalLogger.logger.fatal)
            InternalLogger.logger.fatal(logMessage, ...(msg.args ?? []));
          break;
      }
    },
  },
});

export const rootMainLogger = provider.getCategory("main");
export const rootHTTPLogger = provider.getCategory("http");
export const rootMQTTLogger = provider.getCategory("mqtt");
export const rootPushLogger = provider.getCategory("push");
export const rootP2PLogger = provider.getCategory("p2p");

/**
 *  Set logging level
 *
 * @param category
 * @param level
 */
export const setLoggingLevel = function (category: LoggingCategories = "all", level: LogLevel = LogLevel.Off): void {
  level = LogLevel.Debug;
  switch (category) {
    case "all":
      provider.updateRuntimeSettings({
        level: level,
      });
      break;
    case "main":
      provider.updateRuntimeSettingsCategory(rootMainLogger, {
        level: level,
      });
      break;
    case "http":
      provider.updateRuntimeSettingsCategory(rootHTTPLogger, {
        level: level,
      });
      break;
    case "mqtt":
      provider.updateRuntimeSettingsCategory(rootMQTTLogger, {
        level: level,
      });
      break;
    case "p2p":
      provider.updateRuntimeSettingsCategory(rootP2PLogger, {
        level: level,
      });
      break;
    case "push":
      provider.updateRuntimeSettingsCategory(rootPushLogger, {
        level: level,
      });
      break;
  }
};

/**
 *  Get the logging level
 *
 * @param category
 */
export const getLoggingLevel = function (category: LoggingCategories = "all"): number {
  switch (category) {
    case "all":
      return provider.runtimeConfig.level;
    default:
      return provider.getCategory(category).logLevel;
  }
};
