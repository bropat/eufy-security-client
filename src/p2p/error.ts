export class BleVersionCodeError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleVersionCodeError.name;
    }
}

export class BleCommandCodeError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleCommandCodeError.name;
    }
}

export class BleDataTypeError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleDataTypeError.name;
    }
}

export class BleDataError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleDataError.name;
    }
}

export class BleAdditionalDataError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleAdditionalDataError.name;
    }
}

export class BleAdditionalDataSeparatorError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleAdditionalDataSeparatorError.name;
    }
}

export class BleInvalidDataHeaderError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleInvalidDataHeaderError.name;
    }
}

export class BleInvalidChecksumError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleInvalidChecksumError.name;
    }
}

