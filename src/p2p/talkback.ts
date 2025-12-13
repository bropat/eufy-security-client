import { Transform } from "stream";

export class TalkbackStream extends Transform {
    private isStreaming = false;

    constructor() {
        super();
    }

    _transform(
        data: Buffer,
        _encoding: string,
        callback: (err?: Error | null) => void
    ): void {
        if (this.isStreaming) this.push(data);
        callback();
    }

    public startTalkback(): void {
        this.isStreaming = true;
    }

    public stopTalkback(): void {
        this.isStreaming = false;
    }
}
