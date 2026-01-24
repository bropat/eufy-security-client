import { Category } from "typescript-logging-category-style";
import {ParameterHelper} from "../parameter";
import {ParamType} from "../types";
import {CommandType, TrackerCommandType} from "../../p2p";
import { createCipheriv, createDecipheriv , randomBytes} from "crypto";


describe('Parameter file', () => {
    test("Test base64 decode function" , () => {
        const data = {"test": "data"}
        const encodedJson = btoa(JSON.stringify(data));

        const mockLog = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };

        const TYPE_SNOOZE = ParamType.SNOOZE_MODE;
        let result: string | undefined = ParameterHelper.readValue("testsn",  TYPE_SNOOZE, encodedJson, mockLog as Category )

        expect(result).toStrictEqual(data);
    });

    test("Test text decode function" , () => {
        const data = {"test": "data"}
        const encodedJson = JSON.stringify(data);

        const mockLog = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };

        const TYPE_NOTIFICATION = CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE;
        let result: string | undefined = ParameterHelper.readValue("testsn",  TYPE_NOTIFICATION, encodedJson,mockLog as Category )

        expect(result).toStrictEqual(data);
    });

    test("Test text decode encrypted data function" , () => {
        const data = "more test data";
        const sn =  "T8425T2765123462";
        const cipher = createCipheriv("aes-128-ecb", sn, null);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const mockLog = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };

        const TYPE_NOTIFICATION = TrackerCommandType.COMMAND_NEW_LOCATION
        let result: string | undefined = ParameterHelper.readValue(sn,  TYPE_NOTIFICATION, encrypted,mockLog as Category )

        expect(result).toMatch(data);
    });

    test("Test sending anything" , () => {
        const data = "whatever";

        const mockLog = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };

        let result: string | undefined = ParameterHelper.readValue("testsn",  999999999999999, data,mockLog as Category )

        expect(result).toMatch(data);
    });

    test("Test write value with correct type" , () => {
        const data = "whatever";

        const TYPE = ParamType.SNOOZE_MODE;

        let result: string | undefined = ParameterHelper.writeValue(  TYPE, data);

        expect(result).toMatch(btoa(JSON.stringify(data)));
    });

    test("Test write value with unknown type" , () => {
        const data = "whatever";

        let result: string | undefined = ParameterHelper.writeValue(  999999999, data);

        expect(result).toMatch(data);
    });
});