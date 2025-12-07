"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinNotVerifiedError = exports.UpdateUserPasscodeError = exports.UpdateUserScheduleError = exports.UpdateUserUsernameError = exports.DeleteUserError = exports.AddUserError = exports.StationConnectTimeoutError = exports.TalkbackError = exports.LivestreamError = exports.ReadOnlyPropertyError = exports.InvalidCommandValueError = exports.InvalidPropertyValueError = exports.RTSPPropertyNotEnabledError = exports.WrongStationError = exports.NotSupportedError = exports.DeviceNotFoundError = exports.StationNotFoundError = exports.InvalidLanguageCodeError = exports.InvalidCountryCodeError = exports.BaseError = void 0;
exports.ensureError = ensureError;
class BaseError extends Error {
    context;
    constructor(message, options = {}) {
        const { cause, context } = options;
        super(message, { cause }); //NodeJs 16.9.0
        this.name = this.constructor.name;
        this.context = context;
    }
}
exports.BaseError = BaseError;
function ensureError(value) {
    if (value instanceof Error)
        return value;
    let stringified = "[Unable to stringify the thrown value]";
    try {
        stringified = JSON.stringify(value);
    }
    catch { }
    const error = new Error(`This value was thrown as is, not through an Error: ${stringified}`);
    return error;
}
class InvalidCountryCodeError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidCountryCodeError.name;
    }
}
exports.InvalidCountryCodeError = InvalidCountryCodeError;
class InvalidLanguageCodeError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidLanguageCodeError.name;
    }
}
exports.InvalidLanguageCodeError = InvalidLanguageCodeError;
class StationNotFoundError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = StationNotFoundError.name;
    }
}
exports.StationNotFoundError = StationNotFoundError;
class DeviceNotFoundError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = DeviceNotFoundError.name;
    }
}
exports.DeviceNotFoundError = DeviceNotFoundError;
class NotSupportedError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = NotSupportedError.name;
    }
}
exports.NotSupportedError = NotSupportedError;
class WrongStationError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = WrongStationError.name;
    }
}
exports.WrongStationError = WrongStationError;
class RTSPPropertyNotEnabledError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = RTSPPropertyNotEnabledError.name;
    }
}
exports.RTSPPropertyNotEnabledError = RTSPPropertyNotEnabledError;
class InvalidPropertyValueError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidPropertyValueError.name;
    }
}
exports.InvalidPropertyValueError = InvalidPropertyValueError;
class InvalidCommandValueError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidCommandValueError.name;
    }
}
exports.InvalidCommandValueError = InvalidCommandValueError;
class ReadOnlyPropertyError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ReadOnlyPropertyError.name;
    }
}
exports.ReadOnlyPropertyError = ReadOnlyPropertyError;
class LivestreamError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = LivestreamError.name;
    }
}
exports.LivestreamError = LivestreamError;
class TalkbackError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = TalkbackError.name;
    }
}
exports.TalkbackError = TalkbackError;
class StationConnectTimeoutError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = StationConnectTimeoutError.name;
    }
}
exports.StationConnectTimeoutError = StationConnectTimeoutError;
class AddUserError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = AddUserError.name;
    }
}
exports.AddUserError = AddUserError;
class DeleteUserError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = DeleteUserError.name;
    }
}
exports.DeleteUserError = DeleteUserError;
class UpdateUserUsernameError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UpdateUserUsernameError.name;
    }
}
exports.UpdateUserUsernameError = UpdateUserUsernameError;
class UpdateUserScheduleError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UpdateUserScheduleError.name;
    }
}
exports.UpdateUserScheduleError = UpdateUserScheduleError;
class UpdateUserPasscodeError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UpdateUserPasscodeError.name;
    }
}
exports.UpdateUserPasscodeError = UpdateUserPasscodeError;
class PinNotVerifiedError extends BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = PinNotVerifiedError.name;
    }
}
exports.PinNotVerifiedError = PinNotVerifiedError;
//# sourceMappingURL=error.js.map