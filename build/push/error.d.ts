import { BaseError, Jsonable } from "../error";
export declare class UnknownExpiryFormaError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class FidRegistrationFailedError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class RenewFidTokenFailedError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class ExecuteCheckInError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class RegisterGcmError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BuildLoginRequestError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BuildHeartbeatPingRequestError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class BuildHeartbeatAckRequestError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class FidGenerationError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class MCSProtocolVersionError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class MCSProtocolProcessingStateError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
export declare class MCSProtocolMessageTagError extends BaseError {
    constructor(message: string, options?: {
        cause?: Error;
        context?: Jsonable;
    });
}
