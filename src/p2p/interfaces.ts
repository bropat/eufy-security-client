import NodeRSA from "node-rsa";
import { Readable } from "stream";

import { AlarmMode } from "../http/types";
import { Address, CmdCameraInfoResponse, CommandResult } from "./models";
import { AudioCodec, CommandType, P2PDataType, VideoCodec } from "./types";

export interface P2PClientProtocolEvents {
    "alarm_mode": (mode: AlarmMode) => void;
    "camera_info": (camera_info: CmdCameraInfoResponse) => void;
    "connect": (address: Address) => void;
    "close": () => void;
    "command": (result: CommandResult) => void;
    "start_download": (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => void;
    "finish_download": (channel: number) => void;
    "start_livestream": (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => void;
    "stop_livestream": (channel: number) => void;
    "wifi_rssi": (channel: number, rssi: number) => void;
}

export interface P2PMessageState {
    sequence: number;
    command_type: CommandType;
    nested_command_type?: CommandType;
    channel: number;
    data: Buffer;
    retries: number;
    acknowledged: boolean;
    return_code: number;
    timeout?: NodeJS.Timeout;
}

export interface LookupAdresses {
    [index: string]: Array<Address>;
}

export interface P2PMessageParts {
    [index: number]: Buffer;
}

export interface P2PMessage {
    bytesToRead: number;
    type: P2PDataType;
    seqNo: number;
    data: Buffer;
}

export interface P2PDataHeader {
    commandId: number;
    bytesToRead: number;
    channel: number,
    signCode: number;
    type: number;
}

export interface P2PDataMessage extends P2PDataHeader {
    seqNo: number;
    data_type: P2PDataType;
    data: Buffer;
}

export interface P2PDataMessageBuilder {
    header: P2PDataHeader;
    bytesRead: number;
    messages: P2PMessageParts;
}

export interface P2PDataMessageState {
    leftoverData: Buffer;
    queuedData: Map<number, P2PMessage>;
    rsaKey: NodeRSA | null;
    videoStream: Readable | null;
    audioStream: Readable | null;
    invalidStream: boolean;
    streaming: boolean;
    streamNotStarted: boolean;
    streamChannel: number;
    streamFirstAudioDataReceived: boolean;
    streamFirstVideoDataReceived: boolean;
    streamMetadata: StreamMetadata;
    waitForSeqNoTimeout?: NodeJS.Timeout;
}

export interface P2PDataMessageVideo {
    streamType: number;
    videoSeqNo: number;
    videoFPS: number;
    videoWidth: number;
    videoHeight: number;
    videoTimestamp: number;
    videoDataLength: number;
    aesKey: string;
}

export interface P2PDataMessageAudio {
    audioType: number;
    audioSeqNo: number;
    audioTimestamp: number;
    audioDataLength: number;
}

export interface P2PBinaryMessageBuilder extends P2PDataMessageBuilder {
    metadata: P2PDataMessageVideo | P2PDataMessageAudio | null
}

export interface StreamMetadata {
    videoCodec: VideoCodec;
    videoFPS: number;
    videoWidth: number;
    videoHeight: number;
    audioCodec: AudioCodec;
}