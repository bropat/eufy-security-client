import * as crypto from "crypto";
import { Category } from "typescript-logging-category-style";
import EventEmitter from "events";

import { ErrorObject, EufySecurityPersistentData } from "./interfaces";
import { BaseError, InvalidPropertyValueError, ensureError } from "./error";
import {
  PropertyMetadataAny,
  PropertyMetadataNumeric,
  PropertyMetadataObject,
  PropertyMetadataString,
} from "./http";

/**
 *  Get error structure from error object
 * @param error
 */
export const getError = function (error: BaseError): ErrorObject {
  return {
    cause: error.cause,
    message: `${error.name}: ${error.message}`,
    context: error.context,
    stacktrace: error.stack,
  };
};

/**
 *  Remove last character from the string given
 *
 * @param text
 * @param char
 */
export const removeLastChar = function (text: string, char: string): string {
  const strArr = [...text];
  strArr.splice(text.lastIndexOf(char), 1);
  return strArr.join("");
};

/**
 *  Generate a UDID
 */
export const generateUDID = function (): string {
  return crypto.randomBytes(8).readBigUInt64BE().toString(16);
};

/**
 * Generate a random serial number
 * @param length
 */
export const generateSerialnumber = function (length: number): string {
  return crypto.randomBytes(length / 2).toString("hex");
};

/**
 *  Generate md5 from a given string
 *
 * @param contents
 */
export const md5 = (contents: string): string =>
  crypto.createHash("md5").update(contents).digest("hex");


export const handleUpdate = function (
  config: EufySecurityPersistentData,
  oldVersion: number,
): EufySecurityPersistentData {
  if (oldVersion <= 1.24) {
    config.cloud_token = "";
    config.cloud_token_expiration = 0;
  }
  return config;
};



/**
 *  Checking if a string is empty
 *
 *  TODO: shouldnt you do a trim to remove any spaces too?
 *
 * @param str
 */
export const isEmpty = function (str: string | null | undefined): boolean {
  if (str) {
    if (str.length > 0) return false;
    return true;
  }
  return true;
};

/**
 *  Try to parse the value as boolean otherwise raise and exception
 *
 * @param metadata
 * @param value
 */
export const parseValueBoolean = (metadata: PropertyMetadataAny, value: unknown,) : boolean => {
  let successParsing : boolean = false;
  let parsedValue: boolean = false;
  switch (typeof value) {
    case "boolean":
      successParsing = true;
      parsedValue = value;
      break;
    case "number":
      if (value === 0 || value === 1)  {
        parsedValue = value === 1;
        successParsing = true;
      }
      break;
    case "string":
      if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
        parsedValue = value.toLowerCase() === "true";
        successParsing = true;
      }
      break;
    default:
      break;
  }

  if (!successParsing) {
    throw new InvalidPropertyValueError(
        "Property expects a boolean value",
        {
          context: {
            propertyName: metadata.name,
            propertyValue: value,
            metadata: metadata,
          },
        },
    );
  }
  return parsedValue;
}

/**
 * Try to parse the value as number otherwise raise and exception
 *
 * @param metadata
 * @param value
 */
export const parseValueNumber = (metadata: PropertyMetadataAny, value: unknown) : Number => {
  let successParsing : boolean = false;
  let parsedValue: Number = 0;
  let causeError: undefined | Error = undefined;
  switch (typeof value) {
    case "number":
      successParsing = true;
      parsedValue = value;
      break;
    case "string":
      try {
        successParsing = true;
        parsedValue = Number.parseInt(value);
      } catch (err) {
        causeError = ensureError(err);
      }
      break;
    default:
      break;
  }

  if (!successParsing) {
    throw new InvalidPropertyValueError(
        "Property expects a number value",
        {
          cause: causeError,
          context: {
            propertyName: metadata.name,
            propertyValue: value,
            metadata: metadata,
          },
        },
    );
  }
  return parsedValue;
}

/**
 * Try to parse the value as string otherwise raise and exception
 *
 * @param metadata
 * @param value
 */
export const parseValueString= (metadata: PropertyMetadataAny, value: unknown): string => {
  let successParsing : boolean = false;
  let parsedValue: string = "";

  switch (typeof value) {
    case "number":
      successParsing = true;
      parsedValue = value.toString();
      break;
    case "string":
      successParsing = true;
      parsedValue = value;
      break;
    case "boolean":
      parsedValue = value ? "true" : "false";
      break;
    default:
      break;
  }

  if (!successParsing) {
    throw new InvalidPropertyValueError(
        "Property expects a string value",
        {
          context: {
            propertyName: metadata.name,
            propertyValue: value,
            metadata: metadata,
          },
        },
    );
  }
  return parsedValue;
}

/**
 * Try to parse the value as object otherwise raise and exception
 *
 * @param metadata
 * @param value
 */
export const parseValueObject =  (metadata: PropertyMetadataAny, value: unknown): Any => {
  if (value === null) {
    throw new InvalidPropertyValueError("Property expects an object value", {
      context: {
        propertyName: metadata.name,
        propertyValue: value,
        metadata: metadata,
      },
    });
  }
  return value;
}

/**
 *  Parse the value given to match the metadata from the propperty
 * @param metadata
 * @param value
 */
export const parseValue = function (
  metadata: PropertyMetadataAny,
  value: unknown,
): unknown {
  let parsedValue: unknown;

  if (value === undefined) {
    throw new InvalidPropertyValueError(`Property expects a ${metadata.type} value`, {
      context: {
        propertyName: metadata.name,
        propertyValue: value,
        metadata: metadata,
      },
    });
  }

  if (metadata.type === "boolean") {
    parsedValue = parseValueBoolean(metadata, value);
  } else if (metadata.type === "number") {
    parsedValue = parseValueNumber(metadata, value);
  } else if (metadata.type === "string") {
    parsedValue = parseValueString(metadata, value);
  } else if (metadata.type === "object") {
    parsedValue = parseValueObject(metadata, value);
  } else {
    throw new InvalidPropertyValueError(
      `Property expects a ${metadata.type} value`,
      {
        context: {
          propertyName: metadata.name,
          propertyValue: value,
          metadata: metadata,
        },
      },
    );
  }
  return value;
};


/**
 * Parse data as json otherwise return undefined
 *
 * @param data
 * @param log
 */
export const parseJSON = function (data: string, log: Category): T | undefined {
  try {
    return JSON.parse(data.replace(/[\0]+$/g, ""));
  } catch (err) {
    const error = ensureError(err);
    log.debug("JSON parse error", { error: getError(error), data: data });
  }
  return undefined;
};

/**
 * Validate the value based on the metadata property
 *
 * @param metadata
 * @param value
 */
export const validValue = function (
  metadata: PropertyMetadataAny,
  value: unknown,
): void {
  let isValidData = true;

  if (metadata.type === "number") {
    const numberMetadata = metadata as PropertyMetadataNumeric;
    const numericValue = Number(value);
    if (
      (numberMetadata.min !== undefined && numberMetadata.min > numericValue) ||
      (numberMetadata.max !== undefined && numberMetadata.max < numericValue) ||
      (numberMetadata.states !== undefined &&
        numberMetadata.states[numericValue] === undefined) ||
      Number.isNaN(numericValue)
    ) isValidData = false;
  } else if (metadata.type === "string") {
    const stringMetadata = metadata as PropertyMetadataString;
    const stringValue = String(value);
    if (
      (stringMetadata.format !== undefined &&
        stringValue.match(stringMetadata.format) === null) ||
      (stringMetadata.minLength !== undefined &&
        stringMetadata.minLength > stringValue.length) ||
      (stringMetadata.maxLength !== undefined &&
        stringMetadata.maxLength < stringValue.length)
    ) isValidData = false;
  } else if (metadata.type === "boolean") {
    const str = String(value).toLowerCase().trim();
    if (str !== "true" && str !== "false" && str !== "1" && str !== "0") isValidData = false;
  } else if (metadata.type === "object") {
    const metadataObject = metadata as PropertyMetadataObject;
    if (
        value !== undefined &&
        value !== null &&
        metadataObject.isValidObject !== undefined
    ) isValidData = metadataObject.isValidObject(value);
  } else {
    isValidData = false;
  }

  if (!isValidData) {
    throw new InvalidPropertyValueError(
        `Invalid value for this property according to metadata type ${metadata.type}`,
        {
          context: {
            propertyName: metadata.name,
            propertyValue: value,
            metadata: metadata,
          },
        },
    );
  }
};

/**
 *
 * @param target
 * @param source
 */
export const mergeDeep = function (
  target: Record<string, any> | undefined,
  source: Record<string, any>,
): Record<string, any> {
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
};

/**
 *
 * @param emitter
 * @param event
 */
export function waitForEvent<T>(
  emitter: EventEmitter,
  event: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const success = (val: T): void => {
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

/**
 * Get short url from given url and ensure password is reeducated
 *
 * @param url
 * @param prefixUrl
 */
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

/**
 *  Check if it is a valid url
 *
 * @param value
 * @param protocols
 */
export function isValidUrl(
  value: string,
  protocols: Array<string> = ["http", "https"],
): boolean {
  try {
    const url = new URL(value);
    return protocols
      ? url.protocol
        ? protocols
            .map((protocol) => `${protocol.toLowerCase()}:`)
            .includes(url.protocol)
        : false
      : true;
  } catch (_) {
    return false;
  }
}
