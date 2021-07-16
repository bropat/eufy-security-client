import NodeRSA from "node-rsa";
import { Readable } from "stream";
import { SortedMap } from "sweet-collections";

import { AlarmMode } from "../http/types";
import { Address, CmdCameraInfoResponse, CommandResult } from "./models";
import { AudioCodec, CommandType, P2PDataType, VideoCodec } from "./types";

export interface P2PClientProtocolEvents {
    "alarm mode": (mode: AlarmMode) => void;
    "camera info": (cameraInfo: CmdCameraInfoResponse) => void;
    "connect": (address: Address) => void;
    "close": () => void;
    "command": (result: CommandResult) => void;
    "download started": (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => void;
    "download finished": (channel: number) => void;
    "livestream started": (channel: number, metadata: StreamMetadata, videoStream: Readable, audioStream: Readable) => void;
    "livestream stopped": (channel: number) => void;
    "wifi rssi": (channel: number, rssi: number) => void;
    "rtsp url": (channel: number, rtspUrl: string) => void;
    "esl parameter": (channel: number, param: number, value: string) => void;
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
    dataType: P2PDataType;
    data: Buffer;
}

export interface P2PDataMessageBuilder {
    header: P2PDataHeader;
    bytesRead: number;
    messages: P2PMessageParts;
}

export interface P2PDataMessageState {
    leftoverData: Buffer;
    queuedData: SortedMap<number, P2PMessage>;
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
    receivedFirstIFrame: boolean;
    preFrameVideoData: Buffer;
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

export interface StreamMetadata {
    videoCodec: VideoCodec;
    videoFPS: number;
    videoWidth: number;
    videoHeight: number;
    audioCodec: AudioCodec;
}

export interface DeviceSerial {
    [index: number]: {
        sn: string;
        admin_user_id: string;
    };
}