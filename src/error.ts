
export type Jsonable = string | number | boolean | object | null | undefined | readonly Jsonable[] | { readonly [key: string]: Jsonable } | { toJSON(): Jsonable };

export class BaseError extends Error {

    public readonly context?: Jsonable

    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        const { cause, context } = options;

        super(message, { cause }); //NodeJs 16.9.0
        this.name = this.constructor.name;

        this.context = context;
    }
}

export function ensureError(value: unknown): BaseError {
    if (value instanceof Error)
        return value
    let stringified = "[Unable to stringify the thrown value]";
    try {
        stringified = JSON.stringify(value);
    } catch {}

    const error = new Error(`This value was thrown as is, not through an Error: ${stringified}`);
    return error;
}

export class InvalidCountryCodeError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidCountryCodeError.name;
    }
}

export class InvalidLanguageCodeError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidLanguageCodeError.name;
    }
}

export class StationNotFoundError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = StationNotFoundError.name;
    }
}

export class DeviceNotFoundError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = DeviceNotFoundError.name;
    }
}

export class NotSupportedError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = NotSupportedError.name;
    }
}

export class WrongStationError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = WrongStationError.name;
    }
}

export class RTSPPropertyNotEnabledError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = RTSPPropertyNotEnabledError.name;
    }
}

export class InvalidPropertyValueError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidPropertyValueError.name;
    }
}

export class InvalidCommandValueError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidCommandValueError.name;
    }
}

export class ReadOnlyPropertyError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ReadOnlyPropertyError.name;
    }
}

export class LivestreamError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = LivestreamError.name;
    }
}

export class TalkbackError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = TalkbackError.name;
    }
}

export class StationConnectTimeoutError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = StationConnectTimeoutError.name;
    }
}

export class AddUserError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = AddUserError.name;
    }
}

export class DeleteUserError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = DeleteUserError.name;
    }
}

export class UpdateUserUsernameError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UpdateUserUsernameError.name;
    }
}

export class UpdateUserScheduleError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UpdateUserScheduleError.name;
    }
}

export class UpdateUserPasscodeError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UpdateUserPasscodeError.name;
    }
}

export class PinNotVerifiedError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = PinNotVerifiedError.name;
    }
}