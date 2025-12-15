import { BaseError, Jsonable } from "../error";

export class UnknownExpiryFormaError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UnknownExpiryFormaError.name;
    }
}

export class FidRegistrationFailedError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = FidRegistrationFailedError.name;
    }
}

export class RenewFidTokenFailedError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = RenewFidTokenFailedError.name;
    }
}

export class ExecuteCheckInError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ExecuteCheckInError.name;
    }
}

export class RegisterGcmError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = RegisterGcmError.name;
    }
}

export class BuildLoginRequestError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BuildLoginRequestError.name;
    }
}

export class BuildHeartbeatPingRequestError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BuildHeartbeatPingRequestError.name;
    }
}

export class BuildHeartbeatAckRequestError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BuildHeartbeatAckRequestError.name;
    }
}

export class FidGenerationError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = FidGenerationError.name;
    }
}

export class MCSProtocolVersionError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MCSProtocolVersionError.name;
    }
}

export class MCSProtocolProcessingStateError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MCSProtocolProcessingStateError.name;
    }
}

export class MCSProtocolMessageTagError extends BaseError {
    constructor(message: string, options: { cause?: Error, context?: Jsonable } = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MCSProtocolMessageTagError.name;
    }
}