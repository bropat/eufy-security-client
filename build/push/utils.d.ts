import { CheckinResponse } from "./models";
export declare const VALID_FID_PATTERN: RegExp;
export declare function generateFid(): string;
export declare const buildCheckinRequest: () => Promise<Uint8Array>;
export declare const parseCheckinResponse: (data: Buffer) => Promise<CheckinResponse>;
export declare const sleep: (ms: number) => Promise<void>;
export declare function convertTimestampMs(timestamp: number): number;
