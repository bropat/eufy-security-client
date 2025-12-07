export type Jsonable = string | number | boolean | object | null | undefined | readonly Jsonable[] | {
    readonly [key: string]: Jsonable;
} | {
    toJSON(): Jsonable;
};
export declare class BaseError extends Error {
    readonly context?: Jsonable;
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare function ensureError(value: unknown): BaseError;
export declare class InvalidCountryCodeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class InvalidLanguageCodeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class StationNotFoundError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class DeviceNotFoundError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class NotSupportedError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class WrongStationError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class RTSPPropertyNotEnabledError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class InvalidPropertyValueError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class InvalidCommandValueError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ReadOnlyPropertyError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class LivestreamError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class TalkbackError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class StationConnectTimeoutError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class AddUserError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class DeleteUserError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class UpdateUserUsernameError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class UpdateUserScheduleError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class UpdateUserPasscodeError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class PinNotVerifiedError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
