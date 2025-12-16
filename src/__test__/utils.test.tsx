import {
    getError,
    removeLastChar,
    generateUDID,
    generateSerialnumber,
    md5,
    handleUpdate,
    isEmpty,
    parseValueBoolean,
    parseValueNumber,
    parseValueString,
    parseValueObject,
    parseValue,
    parseJSON,
    validValue,
    mergeDeep, getShortUrl, isValidUrl
} from "../utils";
import {BaseError, InvalidPropertyValueError} from "../error";
import {EufySecurityPersistentData} from "../interfaces";
import {
    PropertyMetadataAny,
    PropertyMetadataNumeric,
    PropertyMetadataObject,
    PropertyMetadataString,
    PropertyName
} from "../http";
import { Category } from "typescript-logging-category-style";


describe('Utils index file', () => {
    test("Test getError function" , () => {
        const error = new BaseError("This is a error");
        const result = getError(error);
        expect(result["message"]).toBe("BaseError: This is a error");
        expect(result["cause"]).toBe(undefined);
        expect(result["context"]).toBe(undefined);
    });

    test("Test removeLastChar function" , () => {
        const result = removeLastChar("this is text a text", "x")
        expect(result).toBe("this is text a tet")
    });

    test("Test generateUDID function" , () => {
        // Ensure it is 16 chars long
        const result = generateUDID();
        expect(result.length).toBe(16)
    });

    test("Test generateSerialnumber function" , () => {
        // Ensure it is 12 chars long
        const result = generateSerialnumber(12);
        expect(result.length).toBe(12)
    });

    test("Test md5 function" , () => {
        // Ensure md5 of hello is converted correctly, used this https://www.md5hashgenerator.com/
        const result = md5("hello");
        expect(result).toBe("5d41402abc4b2a76b9719d911017c592")
    });

    test("Test handleUpdate function" , () => {
        // Test the functionality when the version is lower than 1.24 and above 1.24
        const config: EufySecurityPersistentData = {
            country: "uk",
            login_hash: "test",
            openudid: "test",
            serial_number: "xxxxx",
            push_credentials: undefined,
            version: "1.10",
            cloud_token: "token1",
            cloud_token_expiration: 10,
            push_persistentIds: []
        }
        let result = handleUpdate(config, 1.25)
        expect(result["cloud_token"]).toBe("token1")
        expect(result["cloud_token_expiration"]).toBe(10)

        result = handleUpdate(config, 1.24)
        expect(result["cloud_token"]).toBe("")
        expect(result["cloud_token_expiration"]).toBe(0)
    });

    test("Test isEmpty function" , () => {
        // Ensure md5 of hello is converted correctly, used this https://www.md5hashgenerator.com/
        const result = isEmpty("hello");
        expect(result).toBe(false);

        const resultEmpty = isEmpty("");
        expect(resultEmpty).toBe(true);
    });

    test("Test parseValueBoolean function" , () => {
        //Ensure parsing is correctly done
        const metadata: PropertyMetadataAny = {
            key: "key1",
            name: PropertyName.Name,
            type: "boolean",
            readable: false,
            writeable: false
        }

        let result = parseValueBoolean(metadata, "true");
        expect(result).toBe(true);

        result = parseValueBoolean(metadata, true);
        expect(result).toBe(true);

        result = parseValueBoolean(metadata, 0);
        expect(result).toBe(false);

        // Ensure it throws an error when not invalid
        const t = () => {
            parseValueBoolean(metadata, "hello");
        }
        expect(t).toThrow(InvalidPropertyValueError);

    });

    test("Test parseValueNumber function" , () => {
        //Ensure parsing is correctly done
        const metadata: PropertyMetadataAny = {
            key: "key1",
            name: PropertyName.Name,
            type: "number",
            readable: false,
            writeable: false
        }

        let result = parseValueNumber(metadata, "10");
        expect(result).toBe(10);

        result = parseValueNumber(metadata, 12);
        expect(result).toBe(12);

        // Ensure it throws an error when not invalid
        const t = () => {
            parseValueNumber(metadata, "Hello");
        }
        expect(t).toThrow(InvalidPropertyValueError);

    });

    test("Test parseValueString function" , () => {
        //Ensure parsing is correctly done
        const metadata: PropertyMetadataAny = {
            key: "key1",
            name: PropertyName.Name,
            type: "string",
            readable: false,
            writeable: false
        }

        let result = parseValueString(metadata, 10);
        expect(result).toBe("10");

        result = parseValueString(metadata, "hello world");
        expect(result).toBe("hello world");

        result = parseValueString(metadata, true);
        expect(result).toBe("true");

        // Ensure it throws an error when not invalid
        const t = () => {
            parseValueString(metadata, new BaseError(""));
        }
        expect(t).toThrow(InvalidPropertyValueError);

    });

    test("Test parseValueObject function" , () => {
        //Ensure parsing is correctly done
        const metadata: PropertyMetadataAny = {
            key: "key1",
            name: PropertyName.Name,
            type: "object",
            readable: false,
            writeable: false
        }

        let result = parseValueObject(metadata, new BaseError(""));
        expect(result).toBeInstanceOf(Error);

        // Ensure it throws an error when not invalid
        const t = () => {
            parseValueObject(metadata, null);
        }
        expect(t).toThrow(InvalidPropertyValueError);

    });

    test("Test parseValue function" , () => {
        //Ensure parsing is correctly done
        const metadata: PropertyMetadataAny = {
            key: "key1",
            name: PropertyName.Name,
            type: "number",
            readable: false,
            writeable: false
        }

        let result = parseValue(metadata, "100");
        expect(result).toBe(100);

        metadata.type = "boolean"
        result = parseValue(metadata, "true");
        expect(result).toBe(true);


        metadata.type = "string"
        result = parseValue(metadata, 1020);
        expect(result).toBe("1020");

        metadata.type = "object"
        result = parseValue(metadata, new BaseError("error"));
        expect(result).toBeInstanceOf(Error);

    });

    test("Test parseJSON function" , () => {
        //Ensure parsing is correctly done
        const testJSON: string = '{ "foo": "bar" }';

        const mockLog = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };

        let result = parseJSON(testJSON, mockLog as Category);
        expect(result).toStrictEqual({"foo": "bar"});

        result = parseJSON("asdasdasd", mockLog as Category);
        expect(result).toBe(undefined);
        expect(mockLog.debug).toHaveBeenCalledTimes(1);
    });

    test("Test validValue number function" , () => {
        //Ensure parsing is correctly done

        const metadata: PropertyMetadataNumeric = {
            key: "key1",
            name: PropertyName.Name,
            type: "number",
            readable: false,
            writeable: false,
            min: 10,
        }


        // Ensure it throws an error when not invalid
        const t = () => {
            validValue(metadata, 5);
        }
        expect(t).toThrow(InvalidPropertyValueError);

        // Ensure it doesnt throws an error
        const t_success = () => {
            validValue(metadata, 15);
        }
        expect(t_success).not.toThrow(InvalidPropertyValueError);

    });

    test("Test validValue string function" , () => {
        //Ensure parsing is correctly done

        const metadata: PropertyMetadataString = {
            key: "key1",
            name: PropertyName.Name,
            type: "string",
            readable: false,
            writeable: false,
            minLength: 10,
        }


        // Ensure it throws an error when not invalid
        const t = () => {
            validValue(metadata, "100");
        }
        expect(t).toThrow(InvalidPropertyValueError);

        // Ensure it doesnt throws an error
        const t_success = () => {
            validValue(metadata, "hello world");
        }
        expect(t_success).not.toThrow(InvalidPropertyValueError);

    });

    test("Test validValue boolean function" , () => {
        //Ensure parsing is correctly done

        const metadata: PropertyMetadataAny = {
            key: "key1",
            name: PropertyName.Name,
            type: "boolean",
            readable: false,
            writeable: false,
            minLength: 10,
        }


        // Ensure it throws an error when not invalid
        const t = () => {
            validValue(metadata, "100");
        }
        expect(t).toThrow(InvalidPropertyValueError);

        // Ensure it doesnt throws an error
        const t_success = () => {
            validValue(metadata, "true");
        }
        expect(t_success).not.toThrow(InvalidPropertyValueError);

    });

    test("Test validValue object function" , () => {
        //Ensure parsing is correctly done

        const metadata: PropertyMetadataObject = {
            key: "key1",
            name: PropertyName.Name,
            type: "object",
            readable: false,
            writeable: false,
            isValidObject: true,
        }


        // Ensure it throws an error when not invalid
        const t = () => {
            validValue(metadata, "100");
        }
        expect(t).toThrow(TypeError);

        // Ensure it doesnt throws an error
        const t_success = () => {
            validValue(metadata, new BaseError("error"));
        }
        expect(t_success).not.toThrow(InvalidPropertyValueError);

    });


    test("Test mergeDeep function" , () => {
        const records = {
            key: "key1",
            name: PropertyName.Name,
            type: "object",
            readable: false,
            writeable: false,
            isValidObject: true,
        }


        let result = mergeDeep(records, {});
        expect(result).toStrictEqual(
            {
                key: "key1",
                name: PropertyName.Name,
                type: "object",
                readable: false,
                writeable: false,
                isValidObject: true,
            }
        );

    });

    test("Test getShortUrl function" , () => {

        const url = new URL("https://www.google.com/hello");

        let result = getShortUrl(url, "https://");
        expect(result).toBe("www.google.com/hello");

        // Test redaction of password
        const url_with_pass = new URL("https://www.google.com/hello");
        url_with_pass.password = "test"

        result = getShortUrl(url_with_pass, "https://");
        expect(result).toBe(":%5Bredacted%5D@www.google.com/hello");
    });

    test("Test isValidUrl function" , () => {

        const url = "https://www.google.com";

        let result = isValidUrl(url, ["https"]);
        expect(result).toBe(true);

        result = isValidUrl(url, ["http"]);
        expect(result).toBe(false);
    });

});