export class InvalidPropertyError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidPropertyError.name;
    }
}

export class LivestreamAlreadyRunningError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = LivestreamAlreadyRunningError.name;
    }
}

export class LivestreamNotRunningError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = LivestreamNotRunningError.name;
    }
}

export class PropertyNotSupportedError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = PropertyNotSupportedError.name;
    }
}

export class ApiBaseLoadError extends Error {

    public code: number;

    constructor(code: number, message?: string) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiBaseLoadError.name;
    }
}