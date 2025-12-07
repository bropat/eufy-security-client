"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BleCommandFactory = exports.BleParameterIndex = void 0;
const error_1 = require("./error");
var BleParameterIndex;
(function (BleParameterIndex) {
    BleParameterIndex[BleParameterIndex["ZERO"] = -96] = "ZERO";
    BleParameterIndex[BleParameterIndex["ONE"] = -95] = "ONE";
    BleParameterIndex[BleParameterIndex["TWO"] = -94] = "TWO";
    BleParameterIndex[BleParameterIndex["THREE"] = -93] = "THREE";
    BleParameterIndex[BleParameterIndex["FOUR"] = -92] = "FOUR";
    BleParameterIndex[BleParameterIndex["FIVE"] = -91] = "FIVE";
    BleParameterIndex[BleParameterIndex["SIX"] = -90] = "SIX";
    BleParameterIndex[BleParameterIndex["SEVEN"] = -89] = "SEVEN";
    BleParameterIndex[BleParameterIndex["EIGHT"] = -88] = "EIGHT";
    BleParameterIndex[BleParameterIndex["NINE"] = -87] = "NINE";
    BleParameterIndex[BleParameterIndex["TEN"] = -86] = "TEN";
    BleParameterIndex[BleParameterIndex["ELEVEN"] = -85] = "ELEVEN";
    BleParameterIndex[BleParameterIndex["TWELVE"] = -84] = "TWELVE";
    BleParameterIndex[BleParameterIndex["THIRTEEN"] = -83] = "THIRTEEN";
})(BleParameterIndex || (exports.BleParameterIndex = BleParameterIndex = {}));
class BleCommandFactory {
    static HEADER = Buffer.from([-1, 9]);
    data;
    commandCode;
    versionCode;
    dataType;
    packageFlag;
    unknown;
    additionalDataSeparatorByte;
    additionalData;
    responseCode;
    encrypted;
    partial;
    static parseLockV12(data) {
        if (typeof data === "string") {
            data = Buffer.from(data, "hex");
        }
        if (data.readInt8(0) !== BleCommandFactory.HEADER[0] && data.readInt8(1) !== BleCommandFactory.HEADER[1]) {
            throw new error_1.BleInvalidDataHeaderError("Invalid BLE data header");
        }
        const fac = new BleCommandFactory();
        fac.setVersionCode(data.readUint8(4));
        fac.setCommandCode(data.readUint8(6));
        fac.setDataType(data.readUint8());
        fac.setPackageFlag(data.readInt8(7));
        fac.setResponseCode(fac.getPackageFlag() === -64 ? data.readUint8(8) : data.readUint8(12));
        fac.setData(data.subarray(fac.getPackageFlag() === -64 ? 8 : 12, data.length - 1)); //TODO: Verify if position 8 is correct for data (i think it should be 9 or 13)...
        if (BleCommandFactory.generateHash(data.subarray(0, data.length - 1)) !== data.readUint8(data.length - 1)) {
            throw new error_1.BleInvalidChecksumError("Invalid BLE data, checksum mismatch");
        }
        return fac;
    }
    static parseSmartSafe(data) {
        return BleCommandFactory.parseLockV12(data);
    }
    static parseSmartLock(data) {
        if (typeof data === "string") {
            data = Buffer.from(data, "hex");
        }
        if (data.length < 9 || (data.readInt8(0) !== BleCommandFactory.HEADER[0] && data.readInt8(1) !== BleCommandFactory.HEADER[1])) {
            throw new error_1.BleInvalidDataHeaderError("Invalid BLE data header");
        }
        if (BleCommandFactory.generateHash(data.subarray(0, data.length - 1)) !== data.readUint8(data.length - 1)) {
            throw new error_1.BleInvalidChecksumError("Invalid BLE data, checksum mismatch");
        }
        const fac = new BleCommandFactory();
        const flags = data.readUint16BE(7);
        fac.setVersionCode(data.readUint8(4));
        fac.setDataType(data.readUint8(6));
        fac.setPartial((flags >> 15) === 1);
        fac.setEncrypted(((flags << 1) >> 15) === 1);
        fac.setCommandCode(((flags << 4) & 32767) >> 4);
        fac.setData(data.subarray(9, data.length - 1));
        return fac;
    }
    toString = () => {
        return `BleCommandFactory (versionCode: ${this.versionCode} commandCode: ${this.commandCode} dataType: ${this.dataType} partial: ${this.partial} encrypted: ${this.encrypted} data: ${this.data?.toString("hex")} packageFlag: ${this.packageFlag} responseCode: ${this.responseCode})`;
    };
    setResponseCode(code) {
        this.responseCode = code;
    }
    getResponseCode() {
        return this.responseCode;
    }
    setVersionCode(version) {
        this.versionCode = version;
        return this;
    }
    getVersionCode() {
        return this.versionCode;
    }
    setCommandCode(command) {
        this.commandCode = command;
        return this;
    }
    getCommandCode() {
        return this.commandCode;
    }
    setDataType(type) {
        this.dataType = type;
        return this;
    }
    getDataType() {
        return this.dataType;
    }
    setPackageFlag(flag) {
        this.packageFlag = flag;
        return this;
    }
    getPackageFlag() {
        return this.packageFlag;
    }
    setAdditionalDataSeparator(separator) {
        this.additionalDataSeparatorByte = Buffer.from([separator]);
        return this;
    }
    getAdditionalDataSeparator() {
        return this.additionalDataSeparatorByte;
    }
    setAdditionalData(data) {
        this.additionalData = data;
        return this;
    }
    getAdditionalData() {
        return this.additionalData;
    }
    setData(data) {
        this.data = data;
        return this;
    }
    getData() {
        return this.data;
    }
    setUnknown(data) {
        this.unknown = data;
        return this;
    }
    static generateHash(data) {
        let result = 0;
        for (const value of data) {
            result = result ^ value;
        }
        return result;
    }
    isEncrypted() {
        return this.encrypted;
    }
    setEncrypted(encrypted) {
        this.encrypted = encrypted;
        return this;
    }
    isPartial() {
        return this.partial;
    }
    setPartial(partial) {
        this.partial = partial;
        return this;
    }
    getLockV12Command() {
        if (this.versionCode === undefined)
            throw new error_1.BleVersionCodeError("BleCommandFactory version code value missing");
        if (this.dataType === undefined)
            throw new error_1.BleDataTypeError("BleCommandFactory data type value missing");
        if (this.commandCode === undefined)
            throw new error_1.BleCommandCodeError("BleCommandFactory command code value missing");
        if (this.data === undefined)
            throw new error_1.BleDataError("BleCommandFactory data value missing");
        if (this.additionalData === undefined)
            throw new error_1.BleAdditionalDataError("BleCommandFactory additional data value missing");
        this.setAdditionalDataSeparator(BleParameterIndex.ZERO);
        const bVersionCode = Buffer.from([this.versionCode]);
        const bDataType = Buffer.from([this.dataType]);
        const bCommandCode = Buffer.from([this.commandCode]);
        const bPackageFlag = this.packageFlag === undefined ? Buffer.from([-64]) : Buffer.from([this.packageFlag]);
        const bAdditionalDataLength = Buffer.from([this.additionalData.length]);
        const size = Buffer.allocUnsafe(2);
        size.writeInt16LE(BleCommandFactory.HEADER.length +
            size.length +
            bVersionCode.length +
            bDataType.length +
            bCommandCode.length +
            bPackageFlag.length +
            this.additionalDataSeparatorByte.length +
            bAdditionalDataLength.length +
            this.additionalData.length +
            this.data.length +
            1 // Hash
        );
        const data = Buffer.concat([
            BleCommandFactory.HEADER,
            size,
            bVersionCode,
            bDataType,
            bCommandCode,
            bPackageFlag,
            this.additionalDataSeparatorByte,
            bAdditionalDataLength,
            this.additionalData,
            this.data
        ]);
        const hash = BleCommandFactory.generateHash(data);
        return Buffer.concat([data, Buffer.from([hash])]);
    }
    getSmartSafeCommand() {
        if (this.versionCode === undefined)
            throw new error_1.BleVersionCodeError("BleCommandFactory version code value missing");
        if (this.dataType === undefined)
            throw new error_1.BleDataTypeError("BleCommandFactory data type value missing");
        if (this.commandCode === undefined)
            throw new error_1.BleCommandCodeError("BleCommandFactory command code value missing");
        if (this.data === undefined)
            throw new error_1.BleDataError("BleCommandFactory data value missing");
        const bVersionCode = Buffer.from([this.versionCode]);
        const bDataType = Buffer.from([this.dataType]);
        const bCommandCode = Buffer.from([this.commandCode]);
        const bPackageFlag = this.packageFlag === undefined ? Buffer.from([-64]) : Buffer.from([this.packageFlag]);
        const size = Buffer.allocUnsafe(2);
        size.writeInt16LE(BleCommandFactory.HEADER.length +
            size.length +
            bVersionCode.length +
            bDataType.length +
            bCommandCode.length +
            bPackageFlag.length +
            this.data.length +
            1 // Hash
        );
        const data = Buffer.concat([
            BleCommandFactory.HEADER,
            size,
            bVersionCode,
            bDataType,
            bCommandCode,
            bPackageFlag,
            this.data
        ]);
        const hash = BleCommandFactory.generateHash(data);
        return Buffer.concat([data, Buffer.from([hash])]);
    }
    getSmartLockCommand() {
        if (this.versionCode === undefined)
            throw new error_1.BleVersionCodeError("BleCommandFactory version code value missing");
        if (this.dataType === undefined)
            throw new error_1.BleDataTypeError("BleCommandFactory data type value missing");
        if (this.commandCode === undefined)
            throw new error_1.BleCommandCodeError("BleCommandFactory command code value missing");
        if (this.data === undefined)
            throw new error_1.BleDataError("BleCommandFactory data value missing");
        const bVersionCode = Buffer.from([this.versionCode]);
        const bDataType = Buffer.from([this.dataType]);
        const unknown = Buffer.alloc(1);
        const partial = false;
        const encrypted = true;
        const commandCodeEncoded = Buffer.allocUnsafe(2);
        commandCodeEncoded.writeInt16BE(((partial ? 1 : 0) << 15) + ((encrypted ? 1 : 0) << 14) + this.commandCode);
        const size = Buffer.allocUnsafe(2);
        size.writeInt16LE(BleCommandFactory.HEADER.length +
            size.length +
            bVersionCode.length +
            unknown.length +
            bDataType.length +
            commandCodeEncoded.length +
            this.data.length +
            1 // Hash
        );
        const data = Buffer.concat([
            BleCommandFactory.HEADER,
            size,
            bVersionCode,
            unknown,
            bDataType,
            commandCodeEncoded,
            this.data
        ]);
        const hash = BleCommandFactory.generateHash(data);
        return Buffer.concat([data, Buffer.from([hash])]);
    }
}
exports.BleCommandFactory = BleCommandFactory;
//# sourceMappingURL=ble.js.map