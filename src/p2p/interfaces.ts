import * as NodeRSA from "node-rsa";
import { Readable } from "stream";
import { SortedMap } from "sweet-collections";

import { AlarmMode } from "../http/types";
import { Address, CmdCameraInfoResponse, CommandResult, PropertyData } from "./models";
import { AudioCodec, ChargingType, CommandType, P2PDataType, VideoCodec } from "./types";

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
    "timeout": () => void;
    "runtime state": (channel: number, batteryLevel: number, temperature: number) => void;
    "charging state": (channel: number, chargeType: ChargingType, batteryLevel: number) => void;
    "rtsp livestream started": (channel: number) => void;
    "rtsp livestream stopped": (channel: number) => void;
    "floodlight manual switch": (channel: number, enabled: boolean) => void;
    "indoor camera alarm": (data: string) => void;
}

export interface P2PQueueMessage {
    commandType: CommandType;
    nestedCommandType?: CommandType;
    channel: number;
    payload: Buffer;
    timestamp: number;
    property?: PropertyData;
}

export interface P2PMessageState {
    sequence: number;
    commandType: CommandType;
    nestedCommandType?: CommandType;
    channel: number;
    data: Buffer;
    retries: number;
    acknowledged: boolean;
    returnCode: number;
    timeout?: NodeJS.Timeout;
    property?: PropertyData;
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
    p2pStreaming: boolean;
    p2pStreamNotStarted: boolean;
    p2pStreamChannel: number;
    p2pStreamFirstAudioDataReceived: boolean;
    p2pStreamFirstVideoDataReceived: boolean;
    p2pStreamMetadata: StreamMetadata;
    p2pStreamingTimeout?: NodeJS.Timeout;
    rtspStream: { [index: number]: boolean };
    rtspStreaming: { [index: number]: boolean };
    waitForSeqNoTimeout?: NodeJS.Timeout;
    waitForAudioData?: NodeJS.Timeout;
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
        adminUserId: string;
    };
}

export interface P2PCommand {
    commandType: CommandType;
    value?: number | string;
    valueSub?: number;
    strValue?: string;
    strValueSub?: string;
    channel?: number;
}