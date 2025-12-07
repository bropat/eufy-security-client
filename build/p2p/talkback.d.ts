import { Transform } from "stream";
export declare class TalkbackStream extends Transform {
    private isStreaming;
    constructor();
    _transform(data: Buffer, _encoding: string, callback: (err?: Error | null) => void): void;
    startTalkback(): void;
    stopTalkback(): void;
}
