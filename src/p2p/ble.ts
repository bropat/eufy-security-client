import { BleAdditionalDataError, BleCommandCodeError, BleDataError, BleDataTypeError, BleInvalidChecksumError, BleInvalidDataHeaderError, BleVersionCodeError } from "./error";

export enum BleCommandFactorySeparator {
    a = -96,
    b = -95,
    c = -94,
    d = -93,
    e = -92,
    f = -91,
    g = -90,
    h = -89,
    i = -88,
    j = -87,
    k = -86,
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

    constructor(data?: string | Buffer) {
        if (data !== undefined) {
            if (typeof data === "string") {
                data = Buffer.from(data, "hex");
            }
            if (data.readInt8(0) !== BleCommandFactory.HEADER[0] && data.readInt8(1) !== BleCommandFactory.HEADER[1]) {
                throw new BleInvalidDataHeaderError("Invalid BLE data header");
            }
            this.versionCode = data.readUint8(4);
            this.commandCode = data.readUint8(6);
            this.dataType = data.readUint8();
            this.packageFlag = data.readInt8(7);
            this.responseCode = this.packageFlag === -64 ? data.readUint8(8) : data.readUint8(12);
            this.data = data.subarray(this.packageFlag === -64 ? 8 : 12, data.length - 1);
            if (BleCommandFactory.generateHash(data.subarray(0, data.length - 1)) !== data.readUint8(data.length - 1)) {
                throw new BleInvalidChecksumError("Invalid BLE data, checksum mismatch");
            }
        }
    }

    public toString = () : string => {
        return `BleCommandFactory (versionCode: ${this.versionCode} commandCode: ${this.commandCode} dataType: ${this.dataType} packageFlag: ${this.packageFlag} responseCode: ${this.responseCode} data: ${this.data?.toString("hex")})`;
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

        this.setAdditionalDataSeparator(BleCommandFactorySeparator.a);
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

}