import { BaseError, Jsonable } from '../error';

export class InvalidPropertyError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidPropertyError.name;
    }
}

export class LivestreamAlreadyRunningError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = LivestreamAlreadyRunningError.name;
    }
}

export class LivestreamNotRunningError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = LivestreamNotRunningError.name;
    }
}

export class PropertyNotSupportedError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = PropertyNotSupportedError.name;
    }
}

export class ApiResponseCodeError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiResponseCodeError.name;
    }
}

export class ApiInvalidResponseError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiInvalidResponseError.name;
    }
}

export class ApiHTTPResponseCodeError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiHTTPResponseCodeError.name;
    }
}

export class ApiGenericError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiGenericError.name;
    }
}

export class ApiBaseLoadError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiBaseLoadError.name;
    }
}

export class ApiRequestError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiRequestError.name;
    }
}

export class ImageBaseCodeError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ImageBaseCodeError.name;
    }
}

export class ImageSeedError extends BaseError {
    constructor(
        message: string,
        options: { cause?: Error; context?: Jsonable } = {}
    ) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ImageSeedError.name;
    }
}
