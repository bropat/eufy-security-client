import * as crypto from "crypto";
import { InvalidPropertyValueError } from "./error";
import { PropertyMetadataAny } from "./http";

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
export const handleUpdate = function(oldVersion: number): void {
    // for future updates
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
                        throw new InvalidPropertyValueError(`Property ${metadata.name} expects a boolean value`);
                    }
                    break;
                case "string":
                    if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
                        value = value.toLowerCase() === "true" ? true : false;
                    } else {
                        throw new InvalidPropertyValueError(`Property ${metadata.name} expects a boolean value`);
                    }
                    break;
                default:
                    throw new InvalidPropertyValueError(`Property ${metadata.name} expects a boolean value`);
            }
        } else {
            throw new InvalidPropertyValueError(`Property ${metadata.name} expects a boolean value`);
        }
    } else if (metadata.type === "number") {
        if (value !== undefined) {
            switch (typeof value) {
                case "number":
                    break;
                case "string":
                    try {
                        value = Number.parseInt(value);
                    } catch (error) {
                        throw new InvalidPropertyValueError(`Property ${metadata.name} expects a number value`);
                    }
                    break;
                default:
                    throw new InvalidPropertyValueError(`Property ${metadata.name} expects a number value`);
            }
        } else {
            throw new InvalidPropertyValueError(`Property ${metadata.name} expects a number value`);
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
                    throw new InvalidPropertyValueError(`Property ${metadata.name} expects a number value`);
            }
        } else {
            throw new InvalidPropertyValueError(`Property ${metadata.name} expects a number value`);
        }
    } else {
        throw new InvalidPropertyValueError(`Property ${metadata.name} expects a ${metadata.type} value`);
    }
    return value;
};