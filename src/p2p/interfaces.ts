import * as NodeRSA from "node-rsa";
import { Readable } from "stream";
import { SortedMap } from "sweet-collections";

import { AlarmMode } from "../http/types";
import { Address, CmdCameraInfoResponse, CommandResult, CustomData } from "./models";
import { TalkbackStream } from "./talkback";
import { AlarmEvent, AudioCodec, ChargingType, CommandType, IndoorSoloSmartdropCommandType, P2PDataType, SmartSafeAlarm911Event, SmartSafeShakeAlarmEvent, VideoCodec } from "./types";

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
    "livestream error": (channel: number, error: Error) => void;
    "wifi rssi": (channel: number, rssi: number) => void;
    "rtsp url": (channel: number, rtspUrl: string) => void;
    "parameter": (channel: number, param: number, value: string) => void;
    "timeout": () => void;
    "runtime state": (channel: number, batteryLevel: number, temperature: number) => void;
    "charging state": (channel: number, chargeType: ChargingType, batteryLevel: number) => void;
    "rtsp livestream started": (channel: number) => void;
    "rtsp livestream stopped": (channel: number) => void;
    "floodlight manual switch": (channel: number, enabled: boolean) => void;
    "alarm delay": (alarmDelayEvent: AlarmEvent, alarmDelay: number) => void;
    "alarm armed": () => void;
    "alarm event": (alarmEvent: AlarmEvent) => void;
    "talkback started": (channel: number, talkbackStream: TalkbackStream) => void;
    "talkback stopped": (channel: number) => void;
    "talkback error": (channel: number, error: Error) => void;
    "secondary command": (result: CommandResult) => void;
    "jammed": (channel: number) => void;
    "low battery": (channel: number) => void;
    "shake alarm": (channel: number, detail: SmartSafeShakeAlarmEvent) => void;
    "911 alarm": (channel: number, detail: SmartSafeAlarm911Event) => void;
    "wrong try-protect alarm": (channel: number) => void;
}

export interface P2PQueueMessage {
    commandType: CommandType;
    nestedCommandType?: CommandType;
    channel: number;
    payload: Buffer;
    timestamp: number;
    customData?: CustomData;
}

export interface P2PMessageState {
    sequence: number;
    commandType: CommandType;
    nestedCommandType?: CommandType | IndoorSoloSmartdropCommandType;
    channel: number;
    data: Buffer;
    retries: number;
    acknowledged: boolean;
    returnCode: number;
    timeout?: NodeJS.Timeout;
    customData?: CustomData;
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
    p2pTalkback: boolean;
    p2pTalkbackChannel: number;
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

export interface P2PVideoMessageState {
    sequence: number;
    channel: number;
    data: Buffer;
    retries: number;
    timeout?: NodeJS.Timeout;
}