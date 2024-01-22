import * as crypto from "crypto";
import { Category } from "typescript-logging-category-style";
import EventEmitter from "events";

import { ErrorObject, EufySecurityPersistentData } from "./interfaces";
import { BaseError, InvalidPropertyValueError, ensureError } from "./error";
import { PropertyMetadataAny, PropertyMetadataNumeric, PropertyMetadataObject, PropertyMetadataString } from "./http/interfaces";

export const getError = function(error: BaseError): ErrorObject {
    return {
        cause: error.cause,
        message: `${error.name}: ${error.message}`,
        context: error.context,
        stacktrace: error.stack
    };
}

export const removeLastChar = function(text: string, char: string): string {
    const strArr = [...text];
    strArr.splice(text.lastIndexOf(char), 1);
    return strArr.join("");
}

export const generateUDID = function(): string {
    return crypto.randomBytes(8).readBigUInt64BE().toString(16);
};

export const generateSerialnumber = function(length: number): string {
    return crypto.randomBytes(length/2).toString("hex");
};

export const md5 = (contents: string): string => crypto.createHash("md5").update(contents).digest("hex");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleUpdate = function(config: EufySecurityPersistentData, oldVersion: number): EufySecurityPersistentData {
    if (oldVersion <= 1.24) {
        config.cloud_token = "";
        config.cloud_token_expiration = 0;
    }
    return config;
};

export const isEmpty = function(str: string | null | undefined): boolean {
    if (str) {
        if (str.length > 0)
            return false;
        return true;
    }
    return true;
};

export const parseValue = function(metadata: PropertyMetadataAny, value: unknown): unknown {
    if (metadata.type === "boolean") {
        if (value !== undefined) {
            switch (typeof value) {
                case "boolean":
                    break;
                case "number":
                    if (value === 0 || value === 1) {
                        value = value === 1 ? true : false;
                    } else {
                        throw new InvalidPropertyValueError("Property expects a boolean value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
                    }
                    break;
                case "string":
                    if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
                        value = value.toLowerCase() === "true" ? true : false;
                    } else {
                        throw new InvalidPropertyValueError("Property expects a boolean value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
                    }
                    break;
                default:
                    throw new InvalidPropertyValueError("Property expects a boolean value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
            }
        } else {
            throw new InvalidPropertyValueError("Property expects a boolean value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
        }
    } else if (metadata.type === "number") {
        if (value !== undefined) {
            switch (typeof value) {
                case "number":
                    break;
                case "string":
                    try {
                        value = Number.parseInt(value);
                    } catch (err) {
                        const error = ensureError(err);
                        throw new InvalidPropertyValueError("Property expects a number value", { cause: error, context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
                    }
                    break;
                default:
                    throw new InvalidPropertyValueError("Property expects a number value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
            }
        } else {
            throw new InvalidPropertyValueError("Property expects a number value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
        }
    } else if (metadata.type === "string") {
        if (value !== undefined) {
            switch (typeof value) {
                case "number":
                    value = value.toString();
                    break;
                case "string":
                    break;
                case "boolean":
                    value = value === true ? "true" : "false";
                    break;
                default:
                    throw new InvalidPropertyValueError("Property expects a string value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
            }
        } else {
            throw new InvalidPropertyValueError("Property expects a string value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
        }
    } else if (metadata.type === "object") {
        if (value === undefined || value === null) {
            throw new InvalidPropertyValueError("Property expects an object value", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
        }
    } else {
        throw new InvalidPropertyValueError(`Property expects a ${metadata.type} value`, { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
    }
    return value;
};

export const parseJSON = function(data: string, log: Category): any {
    try {
        return JSON.parse(data.replace(/[\0]+$/g, ""));
    } catch(err) {
        const error = ensureError(err);
        log.debug("JSON parse error", { error: getError(error), data: data });
    }
    return undefined;
}

export const validValue = function(metadata: PropertyMetadataAny, value: unknown): void {
    if (metadata.type === "number") {
        const numberMetadata = metadata as PropertyMetadataNumeric;
        const numericValue = Number(value);
        if ((numberMetadata.min !== undefined && numberMetadata.min > numericValue) || (numberMetadata.max !== undefined && numberMetadata.max < numericValue) || (numberMetadata.states !== undefined && numberMetadata.states[numericValue] === undefined) || Number.isNaN(numericValue)) {
            throw new InvalidPropertyValueError("Invalid value for this property according to metadata", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
        }
    } else if (metadata.type === "string") {
        const stringMetadata = metadata as PropertyMetadataString;
        const stringValue = String(value);
        if ((stringMetadata.format !== undefined && stringValue.match(stringMetadata.format) === null) || (stringMetadata.minLength !== undefined && stringMetadata.minLength > stringValue.length) || (stringMetadata.maxLength !== undefined && stringMetadata.maxLength < stringValue.length)) {
            throw new InvalidPropertyValueError("Invalid value for this property according to metadata", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
        }
    } else if (metadata.type === "boolean") {
        const str = String(value).toLowerCase().trim();
        if (str !== "true" && str !== "false" && str !== "1" && str !== "0") {
            throw new InvalidPropertyValueError("Invalid value for this property according to metadata", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
        }
    } else if (metadata.type === "object") {
        const metadataObject = metadata as PropertyMetadataObject;
        if (value !== undefined && value !== null && metadataObject.isValidObject !== undefined) {
            if (!metadataObject.isValidObject(value)) {
                throw new InvalidPropertyValueError("Invalid value for this property according to metadata", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
            }
        } else {
            throw new InvalidPropertyValueError("Invalid value for this property according to metadata", { context: { propertyName: metadata.name, propertyValue: value, metadata: metadata } });
        }
    }
}

export const mergeDeep = function (target: Record<string, any> | undefined,	source: Record<string, any>): Record<string, any> {
    target = target || {};
    for (const [key, value] of Object.entries(source)) {
        if (!(key in target)) {
            target[key] = value;
        } else {
            if (typeof value === "object") {
                // merge objects
                target[key] = mergeDeep(target[key], value);
            } else if (typeof target[key] === "undefined") {
                // don't override single keys
                target[key] = value;
            }
        }
    }
    return target;
}

export function waitForEvent<T>(emitter: EventEmitter, event: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const success = (val: T): void => {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            emitter.off("error", fail);
            resolve(val);
        };
        const fail = (err: Error): void => {
            emitter.off(event, success);
            reject(err);
        };
        emitter.once(event, success);
        emitter.once("error", fail);
    });
}

export function getShortUrl(url: URL, prefixUrl?: string): string {
    if (url.password) {
        url = new URL(url.toString()); // prevent original url mutation
        url.password = "[redacted]";
    }
    let shortUrl = url.toString();
    if (prefixUrl && shortUrl.startsWith(prefixUrl)) {
        shortUrl = shortUrl.slice(prefixUrl.length);
    }

    return shortUrl;
}