"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageSeedError = exports.ImageBaseCodeError = exports.ApiRequestError = exports.ApiBaseLoadError = exports.ApiGenericError = exports.ApiHTTPResponseCodeError = exports.ApiInvalidResponseError = exports.ApiResponseCodeError = exports.PropertyNotSupportedError = exports.LivestreamNotRunningError = exports.LivestreamAlreadyRunningError = exports.InvalidPropertyError = void 0;
const error_1 = require("../error");
class InvalidPropertyError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidPropertyError.name;
    }
}
exports.InvalidPropertyError = InvalidPropertyError;
class LivestreamAlreadyRunningError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = LivestreamAlreadyRunningError.name;
    }
}
exports.LivestreamAlreadyRunningError = LivestreamAlreadyRunningError;
class LivestreamNotRunningError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = LivestreamNotRunningError.name;
    }
}
exports.LivestreamNotRunningError = LivestreamNotRunningError;
class PropertyNotSupportedError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = PropertyNotSupportedError.name;
    }
}
exports.PropertyNotSupportedError = PropertyNotSupportedError;
class ApiResponseCodeError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiResponseCodeError.name;
    }
}
exports.ApiResponseCodeError = ApiResponseCodeError;
class ApiInvalidResponseError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiInvalidResponseError.name;
    }
}
exports.ApiInvalidResponseError = ApiInvalidResponseError;
class ApiHTTPResponseCodeError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiHTTPResponseCodeError.name;
    }
}
exports.ApiHTTPResponseCodeError = ApiHTTPResponseCodeError;
class ApiGenericError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiGenericError.name;
    }
}
exports.ApiGenericError = ApiGenericError;
class ApiBaseLoadError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiBaseLoadError.name;
    }
}
exports.ApiBaseLoadError = ApiBaseLoadError;
class ApiRequestError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ApiRequestError.name;
    }
}
exports.ApiRequestError = ApiRequestError;
class ImageBaseCodeError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ImageBaseCodeError.name;
    }
}
exports.ImageBaseCodeError = ImageBaseCodeError;
class ImageSeedError extends error_1.BaseError {
    constructor(message, options = {}) {
        super(message, options);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = ImageSeedError.name;
    }
}
exports.ImageSeedError = ImageSeedError;
//# sourceMappingURL=error.js.map