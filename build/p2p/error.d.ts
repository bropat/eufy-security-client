import { BaseError, Jsonable } from "../error";
export declare class BleVersionCodeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BleCommandCodeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BleDataTypeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BleDataError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BleAdditionalDataError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BleAdditionalDataSeparatorError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BleInvalidDataHeaderError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BleInvalidChecksumError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
