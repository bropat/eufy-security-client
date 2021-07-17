
export class InvalidCountryCodeError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidCountryCodeError.name;
    }
}

export class InvalidLanguageCodeError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidLanguageCodeError.name;
    }
}

export class StationNotFoundError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = StationNotFoundError.name;
    }
}

export class DuplicateStationError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = DuplicateStationError.name;
    }
}

export class DeviceNotFoundError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = DeviceNotFoundError.name;
    }
}

export class DuplicateDeviceError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = DuplicateDeviceError.name;
    }
}

export class NotSupportedError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = NotSupportedError.name;
    }
}

export class WrongStationError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = WrongStationError.name;
    }
}

export class NotConnectedError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = NotConnectedError.name;
    }
}

export class InvalidPropertyValueError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidPropertyValueError.name;
    }
}

export class InvalidCommandValueError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidCommandValueError.name;
    }
}

export class ReadOnlyPropertyError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ReadOnlyPropertyError.name;
    }
}