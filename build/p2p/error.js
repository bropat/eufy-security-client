"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BleInvalidChecksumError = exports.BleInvalidDataHeaderError = exports.BleAdditionalDataSeparatorError = exports.BleAdditionalDataError = exports.BleDataError = exports.BleDataTypeError = exports.BleCommandCodeError = exports.BleVersionCodeError = void 0;
const error_1 = require("../error");
class BleVersionCodeError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleVersionCodeError.name;
    }
}
exports.BleVersionCodeError = BleVersionCodeError;
class BleCommandCodeError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleCommandCodeError.name;
    }
}
exports.BleCommandCodeError = BleCommandCodeError;
class BleDataTypeError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleDataTypeError.name;
    }
}
exports.BleDataTypeError = BleDataTypeError;
class BleDataError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleDataError.name;
    }
}
exports.BleDataError = BleDataError;
class BleAdditionalDataError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleAdditionalDataError.name;
    }
}
exports.BleAdditionalDataError = BleAdditionalDataError;
class BleAdditionalDataSeparatorError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleAdditionalDataSeparatorError.name;
    }
}
exports.BleAdditionalDataSeparatorError = BleAdditionalDataSeparatorError;
class BleInvalidDataHeaderError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleInvalidDataHeaderError.name;
    }
}
exports.BleInvalidDataHeaderError = BleInvalidDataHeaderError;
class BleInvalidChecksumError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = BleInvalidChecksumError.name;
    }
}
exports.BleInvalidChecksumError = BleInvalidChecksumError;
//# sourceMappingURL=error.js.map