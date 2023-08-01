/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as path from "path";
import { dummyLogger, Logger } from "ts-log";
import { BufferReader, load, Root } from "protobufjs";
import { TypedEmitter } from "tiny-typed-emitter";

import { MessageTag, ProcessingState } from "./models";
import { PushClientParserEvents } from "./interfaces";
import { ensureError } from "../error";
import { MCSProtocolMessageTagError, MCSProtocolProcessingStateError, MCSProtocolVersionError } from "./error";

export class PushClientParser extends TypedEmitter<PushClientParserEvents> {

    private static proto: Root | null = null;
    private state: ProcessingState = ProcessingState.MCS_VERSION_TAG_AND_SIZE;
    private data: Buffer = Buffer.alloc(0);
    private isWaitingForData = true;
    private sizePacketSoFar = 0;
    private messageSize = 0;
    private messageTag = 0;
    private handshakeComplete = false;

    private log: Logger;

    private constructor(log: Logger = dummyLogger) {
        super();
        this.log = log;
    }

    public resetState(): void {
        this.state = ProcessingState.MCS_VERSION_TAG_AND_SIZE;
        this.data = Buffer.alloc(0);
        this.isWaitingForData = true;
        this.sizePacketSoFar = 0;
        this.messageSize = 0;
        this.messageTag = 0;
        this.handshakeComplete = false;
        this.removeAllListeners();
    }

    public static async init(log: Logger = dummyLogger): Promise<PushClientParser> {
        this.proto = await load(path.join(__dirname, "./proto/mcs.proto"));
        return new PushClientParser(log);
    }

    handleData(newData: Buffer): void {
        this.data = Buffer.concat([this.data, newData]);
        if (this.isWaitingForData) {
            this.isWaitingForData = false;
            this.waitForData();
        }
    }

    private waitForData(): void {
        const minBytesNeeded = this.getMinBytesNeeded();

        // If we don't have all bytes yet, wait some more
        if (this.data.length < minBytesNeeded) {
            this.isWaitingForData = true;
            return;
        } else {
            this.handleFullMessage();
        }
    }

    private handleFullMessage(): void {
        switch (this.state) {
            case ProcessingState.MCS_VERSION_TAG_AND_SIZE:
                this.onGotVersion();
                break;
            case ProcessingState.MCS_TAG_AND_SIZE:
                this.onGotMessageTag();
                break;
            case ProcessingState.MCS_SIZE:
                this.onGotMessageSize();
                break;
            case ProcessingState.MCS_PROTO_BYTES:
                this.onGotMessageBytes();
                break;
            default:
                this.log.warn("Unknown state", { state: this.state });
                break;
        }
    }

    private onGotVersion(): void {
        const version = this.data.readInt8(0);
        this.data = this.data.slice(1);
        if (version < 41 && version !== 38) {
            throw new MCSProtocolVersionError("Got wrong protocol version", { context: { version: version } });
        }

        // Process the LoginResponse message tag.
        this.onGotMessageTag();
    }

    private onGotMessageTag(): void {
        this.messageTag = this.data.readInt8(0);
        this.data = this.data.slice(1);
        this.onGotMessageSize();
    }

    private onGotMessageSize(): void {
        let incompleteSizePacket = false;
        const reader = new BufferReader(this.data);

        try {
            this.messageSize = reader.int32();
        } catch (err) {
            const error = ensureError(err);
            if (error instanceof Error && error.message.startsWith("index out of range:")) {
                incompleteSizePacket = true;
            } else {
                throw error;
            }
        }

        if (incompleteSizePacket) {
            this.sizePacketSoFar = reader.pos;
            this.state = ProcessingState.MCS_SIZE;
            this.waitForData();
            return;
        }

        this.data = this.data.slice(reader.pos);
        this.sizePacketSoFar = 0;

        if (this.messageSize > 0) {
            this.state = ProcessingState.MCS_PROTO_BYTES;
            this.waitForData();
        } else {
            this.onGotMessageBytes();
        }
    }

    private onGotMessageBytes(): void {
        const protobuf = this.buildProtobufFromTag(this.messageTag);

        if (this.messageSize === 0) {
            this.emit("message", { tag: this.messageTag, object: {} });
            this.getNextMessage();
            return;
        }

        if (this.data.length < this.messageSize) {
            this.state = ProcessingState.MCS_PROTO_BYTES;
            this.waitForData();
            return;
        }

        const buffer = this.data.slice(0, this.messageSize);
        this.data = this.data.slice(this.messageSize);
        const message = protobuf.decode(buffer);
        const object = protobuf.toObject(message, {
            longs: String,
            enums: String,
            bytes: Buffer,
        });

        this.emit("message", { tag: this.messageTag, object: object });

        if (this.messageTag === MessageTag.LoginResponse) {
            if (this.handshakeComplete) {
                this.log.error("Unexpected login response!");
            } else {
                this.handshakeComplete = true;
            }
        }

        this.getNextMessage();
    }

    private getNextMessage(): void {
        this.messageTag = 0;
        this.messageSize = 0;
        this.state = ProcessingState.MCS_TAG_AND_SIZE;
        this.waitForData();
    }

    private getMinBytesNeeded(): number {
        switch (this.state) {
            case ProcessingState.MCS_VERSION_TAG_AND_SIZE:
                return 1 + 1 + 1;
            case ProcessingState.MCS_TAG_AND_SIZE:
                return 1 + 1;
            case ProcessingState.MCS_SIZE:
                return this.sizePacketSoFar + 1;
            case ProcessingState.MCS_PROTO_BYTES:
                return this.messageSize;
            default:
                throw new MCSProtocolProcessingStateError("Unknown protocol processing state", { context: { state: this.state } });
        }
    }

    private buildProtobufFromTag(messageTag: number): any {
        switch (messageTag) {
            case MessageTag.HeartbeatPing:
                return PushClientParser.proto!.lookupType("mcs_proto.HeartbeatPing");
            case MessageTag.HeartbeatAck:
                return PushClientParser.proto!.lookupType("mcs_proto.HeartbeatAck");
            case MessageTag.LoginRequest:
                return PushClientParser.proto!.lookupType("mcs_proto.LoginRequest");
            case MessageTag.LoginResponse:
                return PushClientParser.proto!.lookupType("mcs_proto.LoginResponse");
            case MessageTag.Close:
                return PushClientParser.proto!.lookupType("mcs_proto.Close");
            case MessageTag.IqStanza:
                return PushClientParser.proto!.lookupType("mcs_proto.IqStanza");
            case MessageTag.DataMessageStanza:
                return PushClientParser.proto!.lookupType("mcs_proto.DataMessageStanza");
            case MessageTag.StreamErrorStanza:
                return PushClientParser.proto!.lookupType("mcs_proto.StreamErrorStanza");
            default:
                throw new MCSProtocolMessageTagError("Unknown protocol message tag", { context: { messageTag: this.messageTag } });
        }
    }
}
