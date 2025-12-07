"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCSProtocolMessageTagError = exports.MCSProtocolProcessingStateError = exports.MCSProtocolVersionError = exports.FidGenerationError = exports.BuildHeartbeatAckRequestError = exports.BuildHeartbeatPingRequestError = exports.BuildLoginRequestError = exports.RegisterGcmError = exports.ExecuteCheckInError = exports.RenewFidTokenFailedError = exports.FidRegistrationFailedError = exports.UnknownExpiryFormaError = void 0;
const error_1 = require("../error");
class UnknownExpiryFormaError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UnknownExpiryFormaError.name;
    }
}
exports.UnknownExpiryFormaError = UnknownExpiryFormaError;
class FidRegistrationFailedError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = FidRegistrationFailedError.name;
    }
}
exports.FidRegistrationFailedError = FidRegistrationFailedError;
class RenewFidTokenFailedError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = RenewFidTokenFailedError.name;
    }
}
exports.RenewFidTokenFailedError = RenewFidTokenFailedError;
class ExecuteCheckInError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ExecuteCheckInError.name;
    }
}
exports.ExecuteCheckInError = ExecuteCheckInError;
class RegisterGcmError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = RegisterGcmError.name;
    }
}
exports.RegisterGcmError = RegisterGcmError;
class BuildLoginRequestError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BuildLoginRequestError.name;
    }
}
exports.BuildLoginRequestError = BuildLoginRequestError;
class BuildHeartbeatPingRequestError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BuildHeartbeatPingRequestError.name;
    }
}
exports.BuildHeartbeatPingRequestError = BuildHeartbeatPingRequestError;
class BuildHeartbeatAckRequestError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BuildHeartbeatAckRequestError.name;
    }
}
exports.BuildHeartbeatAckRequestError = BuildHeartbeatAckRequestError;
class FidGenerationError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = FidGenerationError.name;
    }
}
exports.FidGenerationError = FidGenerationError;
class MCSProtocolVersionError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MCSProtocolVersionError.name;
    }
}
exports.MCSProtocolVersionError = MCSProtocolVersionError;
class MCSProtocolProcessingStateError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MCSProtocolProcessingStateError.name;
    }
}
exports.MCSProtocolProcessingStateError = MCSProtocolProcessingStateError;
class MCSProtocolMessageTagError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MCSProtocolMessageTagError.name;
    }
}
exports.MCSProtocolMessageTagError = MCSProtocolMessageTagError;
//# sourceMappingURL=error.js.map