"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoggingLevel = exports.setLoggingLevel = exports.rootP2PLogger = exports.rootPushLogger = exports.rootMQTTLogger = exports.rootHTTPLogger = exports.rootMainLogger = exports.InternalLogger = exports.LogLevel = void 0;
const typescript_logging_1 = require("typescript-logging");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return typescript_logging_1.LogLevel; } });
const typescript_logging_category_style_1 = require("typescript-logging-category-style");
class InternalLogger {
    static logger;
}
exports.InternalLogger = InternalLogger;
const getMethodName = function () {
    const matches = new Error("").stack?.split("\n")[6].match(/ at( new){0,1} ([a-zA-Z0-9_\.]+) /);
    if (matches !== null && matches !== undefined && matches[2] !== undefined && matches[2] !== "eval") {
        return matches[2];
    }
    return undefined;
};
const provider = typescript_logging_category_style_1.CategoryProvider.createProvider("EufySecurityClientProvider", {
    level: typescript_logging_1.LogLevel.Off,
    channel: {
        type: "RawLogChannel",
        write: (msg, _formatArg) => {
            const methodName = getMethodName();
            const method = methodName ? `[${methodName}] ` : "";
            switch (msg.level) {
                case typescript_logging_1.LogLevel.Trace:
                    if (msg.args)
                        InternalLogger.logger?.trace(`[${msg.logNames}] ${method}${msg.message}`, ...msg.args);
                    else
                        InternalLogger.logger?.trace(`[${msg.logNames}] ${method}${msg.message}`);
                    break;
                case typescript_logging_1.LogLevel.Debug:
                    if (msg.args)
                        InternalLogger.logger?.debug(`[${msg.logNames}] ${method}${msg.message}`, ...msg.args);
                    else
                        InternalLogger.logger?.debug(`[${msg.logNames}] ${method}${msg.message}`);
                    break;
                case typescript_logging_1.LogLevel.Info:
                    if (msg.args)
                        InternalLogger.logger?.info(`[${msg.logNames}] ${method}${msg.message}`, ...msg.args);
                    else
                        InternalLogger.logger?.info(`[${msg.logNames}] ${method}${msg.message}`);
                    break;
                case typescript_logging_1.LogLevel.Warn:
                    if (msg.args)
                        InternalLogger.logger?.warn(`[${msg.logNames}] ${method}${msg.message}`, ...msg.args);
                    else
                        InternalLogger.logger?.warn(`[${msg.logNames}] ${method}${msg.message}`);
                    break;
                case typescript_logging_1.LogLevel.Error:
                    if (msg.args)
                        InternalLogger.logger?.error(`[${msg.logNames}] ${method}${msg.message}`, ...msg.args);
                    else
                        InternalLogger.logger?.error(`[${msg.logNames}] ${method}${msg.message}`);
                    break;
                case typescript_logging_1.LogLevel.Fatal:
                    if (InternalLogger.logger && InternalLogger.logger.fatal)
                        if (msg.args)
                            InternalLogger.logger.fatal(`[${msg.logNames}] ${method}${msg.message}`, ...msg.args);
                        else
                            InternalLogger.logger.fatal(`[${msg.logNames}] ${method}${msg.message}`);
                    break;
            }
        },
    },
});
exports.rootMainLogger = provider.getCategory("main");
exports.rootHTTPLogger = provider.getCategory("http");
exports.rootMQTTLogger = provider.getCategory("mqtt");
exports.rootPushLogger = provider.getCategory("push");
exports.rootP2PLogger = provider.getCategory("p2p");
const setLoggingLevel = function (category = "all", level = typescript_logging_1.LogLevel.Off) {
    switch (category) {
        case "all":
            provider.updateRuntimeSettings({
                level: level
            });
            break;
        case "main":
            provider.updateRuntimeSettingsCategory(exports.rootMainLogger, {
                level: level
            });
            break;
        case "http":
            provider.updateRuntimeSettingsCategory(exports.rootHTTPLogger, {
                level: level
            });
            break;
        case "mqtt":
            provider.updateRuntimeSettingsCategory(exports.rootMQTTLogger, {
                level: level
            });
            break;
        case "p2p":
            provider.updateRuntimeSettingsCategory(exports.rootP2PLogger, {
                level: level
            });
            break;
        case "push":
            provider.updateRuntimeSettingsCategory(exports.rootPushLogger, {
                level: level
            });
            break;
    }
};
exports.setLoggingLevel = setLoggingLevel;
const getLoggingLevel = function (category = "all") {
    switch (category) {
        case "all":
            return provider.runtimeConfig.level;
        default:
            return provider.getCategory(category).logLevel;
    }
};
exports.getLoggingLevel = getLoggingLevel;
//# sourceMappingURL=logging.js.map