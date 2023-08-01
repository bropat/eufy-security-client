import { BaseError, Jsonable } from "../error";
export class BleVersionCodeError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleVersionCodeError.name;
    }
}

export class BleCommandCodeError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleCommandCodeError.name;
    }
}

export class BleDataTypeError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleDataTypeError.name;
    }
}

export class BleDataError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleDataError.name;
    }
}

export class BleAdditionalDataError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleAdditionalDataError.name;
    }
}

export class BleAdditionalDataSeparatorError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleAdditionalDataSeparatorError.name;
    }
}

export class BleInvalidDataHeaderError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleInvalidDataHeaderError.name;
    }
}

export class BleInvalidChecksumError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleInvalidChecksumError.name;
    }
}

