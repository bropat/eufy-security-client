import { BaseError, Jsonable } from "../error";
export declare class InvalidPropertyError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class LivestreamAlreadyRunningError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class LivestreamNotRunningError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class PropertyNotSupportedError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ApiResponseCodeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ApiInvalidResponseError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ApiHTTPResponseCodeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ApiGenericError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ApiBaseLoadError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ApiRequestError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ImageBaseCodeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ImageSeedError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
