import { BleAdditionalDataError, BleCommandCodeError, BleDataError, BleDataTypeError, BleInvalidChecksumError, BleInvalidDataHeaderError, BleVersionCodeError } from "./error";

export enum BleParameterIndex {
    ZERO = -96,
    ONE = -95,
    TWO = -94,
    THREE = -93,
    FOUR = -92,
    FIVE = -91,
    SIX = -90,
    SEVEN = -89,
    EIGHT = -88,
    NINE = -87,
    TEN = -86,
    ELEVEN = -85,
    TWELVE = -84,
    THIRTEEN = -83,
}

export class BleCommandFactory {

    private static readonly HEADER = Buffer.from([-1, 9]);

    private data?: Buffer;
    private commandCode?: number;
    private versionCode?: number;
    private dataType?: number;
    private packageFlag?: number;
    private unknown?: Buffer;
    private additionalDataSeparatorByte?: Buffer;
    private additionalData?: Buffer;
    private responseCode?: number;
    private encrypted?: boolean;
    private partial?: boolean;

    public static parseLockV12(data: string | Buffer): BleCommandFactory {
        if (typeof data === "string") {
            data = Buffer.from(data, "hex");
        }
        if (data.readInt8(0) !== BleCommandFactory.HEADER[0] && data.readInt8(1) !== BleCommandFactory.HEADER[1]) {
            throw new BleInvalidDataHeaderError("Invalid BLE data header");
        }
        const fac = new BleCommandFactory();
        fac.setVersionCode(data.readUint8(4))
        fac.setCommandCode(data.readUint8(6));
        fac.setDataType(data.readUint8());
        fac.setPackageFlag(data.readInt8(7));
        fac.setResponseCode(fac.getPackageFlag() === -64 ? data.readUint8(8) : data.readUint8(12));
        fac.setData(data.subarray(fac.getPackageFlag() === -64 ? 8 : 12, data.length - 1)); //TODO: Verify if position 8 is correct for data (i think it should be 9 or 13)...
        if (BleCommandFactory.generateHash(data.subarray(0, data.length - 1)) !== data.readUint8(data.length - 1)) {
            throw new BleInvalidChecksumError("Invalid BLE data, checksum mismatch");
        }
        return fac;
    }

    public static parseSmartSafe(data: string | Buffer): BleCommandFactory {
        return BleCommandFactory.parseLockV12(data);
    }

    public static parseSmartLock(data: string | Buffer): BleCommandFactory {
        if (typeof data === "string") {
            data = Buffer.from(data, "hex");
        }
        if (data.length < 9 || (data.readInt8(0) !== BleCommandFactory.HEADER[0] && data.readInt8(1) !== BleCommandFactory.HEADER[1])) {
            throw new BleInvalidDataHeaderError("Invalid BLE data header");
        }
        if (BleCommandFactory.generateHash(data.subarray(0, data.length - 1)) !== data.readUint8(data.length - 1)) {
            throw new BleInvalidChecksumError("Invalid BLE data, checksum mismatch");
        }
        const fac = new BleCommandFactory();
        const flags = data.readUint16BE(7);
        fac.setVersionCode(data.readUint8(4))
        fac.setDataType(data.readUint8(6));
        fac.setPartial((flags >> 15) === 1);
        fac.setEncrypted(((flags  << 1) >> 15) === 1);
        fac.setCommandCode(((flags  << 4) & 32767) >> 4);
        fac.setData(data.subarray(9, data.length - 1));
        return fac;
    }

    public toString = (): string => {
        return `BleCommandFactory (versionCode: ${this.versionCode} commandCode: ${this.commandCode} dataType: ${this.dataType} partial: ${this.partial} encrypted: ${this.encrypted} data: ${this.data?.toString("hex")} packageFlag: ${this.packageFlag} responseCode: ${this.responseCode})`;
    }

    private setResponseCode(code: number): void {
        this.responseCode = code;
    }

    public getResponseCode(): number|undefined {
        return this.responseCode;
    }

    public setVersionCode(version: number): BleCommandFactory {
        this.versionCode = version;
        return this;
    }

    public getVersionCode(): number|undefined {
        return this.versionCode;
    }

    public setCommandCode(command: number): BleCommandFactory {
        this.commandCode = command;
        return this;
    }

    public getCommandCode(): number|undefined {
        return this.commandCode;
    }

    public setDataType(type: number): BleCommandFactory {
        this.dataType = type;
        return this;
    }

    public getDataType(): number|undefined {
        return this.dataType;
    }

    public setPackageFlag(flag: number): BleCommandFactory {
        this.packageFlag = flag;
        return this;
    }

    public getPackageFlag(): number|undefined {
        return this.packageFlag;
    }

    public setAdditionalDataSeparator(separator: number): BleCommandFactory {
        this.additionalDataSeparatorByte = Buffer.from([separator]);
        return this;
    }

    public getAdditionalDataSeparator(): Buffer|undefined {
        return this.additionalDataSeparatorByte;
    }

    public setAdditionalData(data: Buffer): BleCommandFactory {
        this.additionalData = data;
        return this;
    }

    public getAdditionalData(): Buffer|undefined {
        return this.additionalData;
    }

    public setData(data: Buffer): BleCommandFactory {
        this.data = data;
        return this;
    }

    public getData(): Buffer|undefined {
        return this.data;
    }


    public setUnknown(data: Buffer): BleCommandFactory {
        this.unknown = data;
        return this;
    }

    public static generateHash(data: Buffer): number {
        let result = 0;
        for (const value of data) {
            result = result ^ value;
        }
        return result;
    }

    public isEncrypted(): boolean|undefined {
        return this.encrypted;
    }

    public setEncrypted(encrypted: boolean): BleCommandFactory {
        this.encrypted = encrypted;
        return this;
    }

    public isPartial(): boolean|undefined {
        return this.partial;
    }

    public setPartial(partial: boolean): BleCommandFactory {
        this.partial = partial;
        return this;
    }

    public getLockV12Command(): Buffer {
        if (this.versionCode === undefined)
            throw new BleVersionCodeError("BleCommandFactory version code value missing");
        if (this.dataType === undefined)
            throw new BleDataTypeError("BleCommandFactory data type value missing");
        if (this.commandCode === undefined)
            throw new BleCommandCodeError("BleCommandFactory command code value missing");
        if (this.data === undefined)
            throw new BleDataError("BleCommandFactory data value missing");
        if (this.additionalData === undefined)
            throw new BleAdditionalDataError("BleCommandFactory additional data value missing");

        this.setAdditionalDataSeparator(BleParameterIndex.ZERO);
        const bVersionCode = Buffer.from([this.versionCode]);
        const bDataType = Buffer.from([this.dataType]);
        const bCommandCode = Buffer.from([this.commandCode]);
        const bPackageFlag = this.packageFlag === undefined ? Buffer.from([-64]) : Buffer.from([this.packageFlag]);
        const bAdditionalDataLength = Buffer.from([this.additionalData.length]);
        const size = Buffer.allocUnsafe(2);
        size.writeInt16LE(
            BleCommandFactory.HEADER.length +
            size.length +
            bVersionCode.length +
            bDataType.length +
            bCommandCode.length +
            bPackageFlag.length +
            this.additionalDataSeparatorByte!.length +
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
            this.additionalDataSeparatorByte!,
            bAdditionalDataLength,
            this.additionalData,
            this.data
        ]);
        const hash = BleCommandFactory.generateHash(data);
        return Buffer.concat([data, Buffer.from([hash])]);
    }

    public getSmartSafeCommand(): Buffer {
        if (this.versionCode === undefined)
            throw new BleVersionCodeError("BleCommandFactory version code value missing");
        if (this.dataType === undefined)
            throw new BleDataTypeError("BleCommandFactory data type value missing");
        if (this.commandCode === undefined)
            throw new BleCommandCodeError("BleCommandFactory command code value missing");
        if (this.data === undefined)
            throw new BleDataError("BleCommandFactory data value missing");

        const bVersionCode = Buffer.from([this.versionCode]);
        const bDataType = Buffer.from([this.dataType]);
        const bCommandCode = Buffer.from([this.commandCode]);
        const bPackageFlag = this.packageFlag === undefined ? Buffer.from([-64]) : Buffer.from([this.packageFlag]);
        const size = Buffer.allocUnsafe(2);
        size.writeInt16LE(
            BleCommandFactory.HEADER.length +
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

    public getSmartLockCommand(): Buffer {
        if (this.versionCode === undefined)
            throw new BleVersionCodeError("BleCommandFactory version code value missing");
        if (this.dataType === undefined)
            throw new BleDataTypeError("BleCommandFactory data type value missing");
        if (this.commandCode === undefined)
            throw new BleCommandCodeError("BleCommandFactory command code value missing");
        if (this.data === undefined)
            throw new BleDataError("BleCommandFactory data value missing");

        const bVersionCode = Buffer.from([this.versionCode]);
        const bDataType = Buffer.from([this.dataType]);
        const unknown = Buffer.alloc(1);
        const partial = false;
        const encrypted = true;
        const commandCodeEncoded = Buffer.allocUnsafe(2);
        commandCodeEncoded.writeInt16BE(((partial ? 1 : 0) << 15) + ((encrypted ? 1 : 0) << 14) + this.commandCode);
        const size = Buffer.allocUnsafe(2);
        size.writeInt16LE(
            BleCommandFactory.HEADER.length +
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