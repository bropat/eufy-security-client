export declare enum BleParameterIndex {
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
    THIRTEEN = -83
}
export declare class BleCommandFactory {
    private static readonly HEADER;
    private data?;
    private commandCode?;
    private versionCode?;
    private dataType?;
    private packageFlag?;
    private unknown?;
    private additionalDataSeparatorByte?;
    private additionalData?;
    private responseCode?;
    private encrypted?;
    private partial?;
    static parseLockV12(data: string | Buffer): BleCommandFactory;
    static parseSmartSafe(data: string | Buffer): BleCommandFactory;
    static parseSmartLock(data: string | Buffer): BleCommandFactory;
    toString: () => string;
    private setResponseCode;
    getResponseCode(): number | undefined;
    setVersionCode(version: number): BleCommandFactory;
    getVersionCode(): number | undefined;
    setCommandCode(command: number): BleCommandFactory;
    getCommandCode(): number | undefined;
    setDataType(type: number): BleCommandFactory;
    getDataType(): number | undefined;
    setPackageFlag(flag: number): BleCommandFactory;
    getPackageFlag(): number | undefined;
    setAdditionalDataSeparator(separator: number): BleCommandFactory;
    getAdditionalDataSeparator(): Buffer | undefined;
    setAdditionalData(data: Buffer): BleCommandFactory;
    getAdditionalData(): Buffer | undefined;
    setData(data: Buffer): BleCommandFactory;
    getData(): Buffer | undefined;
    setUnknown(data: Buffer): BleCommandFactory;
    static generateHash(data: Buffer): number;
    isEncrypted(): boolean | undefined;
    setEncrypted(encrypted: boolean): BleCommandFactory;
    isPartial(): boolean | undefined;
    setPartial(partial: boolean): BleCommandFactory;
    getLockV12Command(): Buffer;
    getSmartSafeCommand(): Buffer;
    getSmartLockCommand(): Buffer;
}
