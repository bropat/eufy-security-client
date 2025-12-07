import * as NodeRSA from "node-rsa";
import { Readable } from "stream";
import { SortedMap } from "sweet-collections";
import { AlarmMode, DeviceType, MicStatus, ParamType, TriggerType, VideoType } from "../http/types";
import { Address, CmdCameraInfoResponse, CommandResult, CustomData, StorageInfoBodyHB3 } from "./models";
import { TalkbackStream } from "./talkback";
import { AlarmEvent, AudioCodec, CommandType, DatabaseReturnCode, IndoorSoloSmartdropCommandType, P2PDataType, SmartSafeAlarm911Event, SmartSafeShakeAlarmEvent, P2PStorageType, TFCardStatus, VideoCodec, InternalP2PCommandType } from "./types";
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
    "charging state": (channel: number, chargeType: number, batteryLevel: number) => void;
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
    "sd info ex": (sdStatus: TFCardStatus, sdCapacity: number, sdCapacityAvailable: number) => void;
    "image download": (file: string, image: Buffer) => void;
    "tfcard status": (channel: number, status: TFCardStatus) => void;
    "database query latest": (returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLatestInfo>) => void;
    "database query local": (returnCode: DatabaseReturnCode, data: Array<DatabaseQueryLocal>) => void;
    "database count by date": (returnCode: DatabaseReturnCode, data: Array<DatabaseCountByDate>) => void;
    "database delete": (returnCode: DatabaseReturnCode, failedIds: Array<unknown>) => void;
    "sensor status": (channel: number, status: number) => void;
    "garage door status": (channel: number, doorId: number, status: number) => void;
    "storage info hb3": (channel: number, storageInfo: StorageInfoBodyHB3) => void;
    "sequence error": (channel: number, command: number, sequence: number, serialnumber: string) => void;
}
export interface P2PQueueMessage {
    p2pCommandType: InternalP2PCommandType;
    p2pCommand: P2PCommand;
    nestedCommandType?: CommandType;
    nestedCommandType2?: number;
    timestamp: number;
    customData?: CustomData;
}
export interface P2PMessageState {
    sequence: number;
    commandType: CommandType;
    nestedCommandType?: CommandType | IndoorSoloSmartdropCommandType | ParamType;
    nestedCommandType2?: number;
    channel: number;
    data: Buffer;
    retries: number;
    acknowledged: boolean;
    returnCode?: number;
    retryTimeout?: NodeJS.Timeout;
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
    channel: number;
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
    rtspStream: {
        [index: number]: boolean;
    };
    rtspStreaming: {
        [index: number]: boolean;
    };
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
export interface P2PDatabaseQueryLatestInfoResponse {
    device_sn: string;
    payload: {
        event_count: number;
        crop_hb3_path: string;
        crop_cloud_path: string;
    };
}
export interface P2PDatabaseCountByDateResponse {
    days: string;
    count: number;
}
export interface P2PDatabaseQueryLocalHistoryRecordInfo {
    record_id: number;
    account: string;
    station_sn: string;
    device_sn: string;
    device_type: DeviceType;
    start_time: string;
    end_time: string;
    frame_num: number;
    storage_type: P2PStorageType;
    storage_cloud: boolean;
    cipher_id: number;
    vision: number;
    video_type: VideoType;
    has_lock: boolean;
    automation_id: number;
    trigger_type: TriggerType;
    push_mode: number;
    mic_status: MicStatus;
    res_change: number;
    res_best_width: number;
    res_best_height: number;
    self_learning: number;
    int_reserve: number;
    int_extra: number;
    storage_path: string;
    thumb_path: string;
    write_status: number;
    str_extra: string;
    cloud_path: string;
    folder_size: number;
    storage_status: number;
    storage_label: string;
    time_zone: string;
    mp4_cloud: string;
    snapshot_cloud: string;
    table_version: string;
    update_time: string;
}
export interface P2PDatabaseQueryLocalRecordCropPictureInfo {
    picture_id: number;
    record_id: number;
    station_sn: string;
    device_sn: string;
    detection_type: number;
    person_id: number;
    crop_path: string;
    event_time: string;
    str_reserve: string;
    person_recog_flag: boolean;
    crop_pic_quality: number;
    pic_marking_flag: boolean;
    group_id: number;
    int_reserve: number;
    crop_id: number;
    start_time: string;
    reserve2_int: number;
    reserve2_date: string;
    reserve2_string: string;
    storage_type: P2PStorageType;
    storage_status: number;
    storage_label: string;
    table_version: string;
    update_time: string;
}
export interface P2PDatabaseQueryLocalResponse {
    payload: Array<P2PDatabaseQueryLocalHistoryRecordInfo> | Array<P2PDatabaseQueryLocalRecordCropPictureInfo>;
    table_name: string;
}
export interface P2PDatabaseDeleteResponse {
    failed_delete: Array<unknown>;
}
export interface P2PDatabaseResponse {
    data: Array<P2PDatabaseQueryLatestInfoResponse> | Array<P2PDatabaseCountByDateResponse> | Array<P2PDatabaseQueryLocalResponse> | P2PDatabaseDeleteResponse;
    start_id?: number;
    end_id?: number;
    count?: number;
    transaction: string;
    table: string;
    cmd: number;
    mIntRet: DatabaseReturnCode;
    version: string;
    msg: string;
}
export interface DatabaseQueryLatestInfoBase {
    device_sn: string;
    event_count: number;
}
export interface DatabaseQueryLatestInfoCloud extends DatabaseQueryLatestInfoBase {
    crop_cloud_path: string;
}
export interface DatabaseQueryLatestInfoLocal extends DatabaseQueryLatestInfoBase {
    crop_local_path: string;
}
export type DatabaseQueryLatestInfo = DatabaseQueryLatestInfoCloud | DatabaseQueryLatestInfoLocal;
export interface DatabaseCountByDate {
    day: Date;
    count: number;
}
export interface HistoryRecordInfo {
    device_type: DeviceType;
    account: string;
    start_time: Date;
    end_time: Date;
    frame_num: number;
    storage_type: P2PStorageType;
    storage_cloud: boolean;
    cipher_id: number;
    vision: number;
    video_type: VideoType;
    has_lock: boolean;
    automation_id: number;
    trigger_type: TriggerType;
    push_mode: number;
    mic_status: MicStatus;
    res_change: number;
    res_best_width: number;
    res_best_height: number;
    self_learning: number;
    storage_path: string;
    thumb_path: string;
    write_status: number;
    cloud_path: string;
    folder_size: number;
    storage_status: number;
    storage_label: string;
    time_zone: string;
    mp4_cloud: string;
    snapshot_cloud: string;
    table_version: string;
}
export interface CropPictureInfo {
    picture_id: number;
    detection_type: number;
    person_id: number;
    crop_path: string;
    event_time: Date | null;
    person_recog_flag: boolean;
    crop_pic_quality: number;
    pic_marking_flag: boolean;
    group_id: number;
    crop_id: number;
    start_time: Date;
    storage_type: P2PStorageType;
    storage_status: number;
    storage_label: string;
    table_version: string;
    update_time: string;
}
export interface DatabaseQueryLocal {
    record_id: number;
    station_sn: string;
    device_sn?: string;
    history: HistoryRecordInfo;
    picture: Array<CropPictureInfo>;
}
export interface RGBColor {
    red: number;
    green: number;
    blue: number;
}
export interface InternalColoredLighting {
    color: number;
}
export interface DynamicLighting {
    name: string;
    mode: number;
    speed: number;
    colors: Array<RGBColor>;
}
export interface InternalDynamicLighting {
    name: string;
    mode: number;
    id: number;
    speed: number;
    colors: Array<number>;
}
export interface MotionZonePoint {
    x: number;
    y: number;
}
export interface MotionZonePoints {
    points: Array<MotionZonePoint>;
}
export interface MotionZone {
    polygens: Array<MotionZonePoints>;
}
export interface VideoStreamingRecordingQuality {
    mode_0: {
        quality: number;
    };
    mode_1: {
        quality: number;
    };
    cur_mode: number;
}
export interface CrossTrackingGroupEntry {
    value: Array<string>;
}
export interface CustomDataType {
    [index: number]: {
        channel: number;
        customData: CustomData;
        timestamp: number;
    };
}
