import {getLoggingLevel, setLoggingLevel} from "../logging";
import { LogLevel } from "typescript-logging";

describe('Logging index file', () => {
    test("Set all logger to be Debug and assert it is set" , () => {
        setLoggingLevel("all", LogLevel.Debug);
        const logger = getLoggingLevel("all");
        expect(logger).toBe(LogLevel.Debug);
    });

    test("Set all to Debug and mqtt to be info" , () => {
        setLoggingLevel("all", LogLevel.Debug);
        setLoggingLevel("mqtt", LogLevel.Info);
        const loggerAll = getLoggingLevel("all");
        expect(loggerAll).toBe(LogLevel.Debug);

        const loggerMQTT = getLoggingLevel("mqtt");
        expect(loggerMQTT).toBe(LogLevel.Info);
    });
});