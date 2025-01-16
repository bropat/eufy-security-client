import { createSocket, Socket, RemoteInfo } from "dgram";
import { TypedEmitter } from "tiny-typed-emitter";
import * as NodeRSA from "node-rsa";
import { Readable } from "stream";
import { SortedMap } from "sweet-collections";
import date from "date-and-time";

import { Address, CmdCameraInfoResponse, CmdNotifyPayload, CommandResult, ESLAdvancedLockStatusNotification, ESLStationP2PThroughData, SmartSafeSettingsNotification, SmartSafeStatusNotification, CustomData, ESLBleV12P2PThroughData, CmdDatabaseImageResponse, EntrySensorStatus, GarageDoorStatus, StorageInfoHB3, ESLAdvancedLockStatusNotificationT8530, SmartLockP2PThroughData, SmartLockP2PSequenceData } from "./models";
import { sendMessage, hasHeader, buildCheckCamPayload, buildIntCommandPayload, buildIntStringCommandPayload, buildCommandHeader, MAGIC_WORD, buildCommandWithStringTypePayload, isPrivateIp, buildLookupWithKeyPayload, sortP2PMessageParts, buildStringTypeCommandPayload, getRSAPrivateKey, decryptAESData, getNewRSAPrivateKey, findStartCode, isIFrame, generateLockSequence, decodeLockPayload, generateBasicLockAESKey, getLockVectorBytes, decryptLockAESData, buildLookupWithKeyPayload2, buildCheckCamPayload2, buildLookupWithKeyPayload3, decodeBase64, getVideoCodec, checkT8420, buildVoidCommandPayload, isP2PQueueMessage, buildTalkbackAudioFrameHeader, getLocalIpAddress, decodeP2PCloudIPs, decodeSmartSafeData, decryptPayloadData, decryptP2PData, getP2PCommandEncryptionKey, getNullTerminatedString, generateSmartLockAESKey, readNullTerminatedBuffer } from "./utils";
import { RequestMessageType, ResponseMessageType, CommandType, ErrorCode, P2PDataType, P2PDataTypeHeader, AudioCodec, VideoCodec, P2PConnectionType, AlarmEvent, IndoorSoloSmartdropCommandType, SmartSafeCommandCode, ESLCommand, ESLBleCommand, TFCardStatus, EncryptionType, InternalP2PCommandType, SmartLockCommand, SmartLockBleCommandFunctionType2, SmartLockBleCommandFunctionType1, SmartLockFunctionType } from "./types";
import { AlarmMode } from "../http/types";
import { P2PDataMessage, P2PDataMessageAudio, P2PDataMessageBuilder, P2PMessageState, P2PDataMessageVideo, P2PMessage, P2PDataHeader, P2PDataMessageState, P2PClientProtocolEvents, DeviceSerial, P2PQueueMessage, P2PCommand, P2PVideoMessageState, P2PDatabaseResponse, P2PDatabaseQueryLatestInfoResponse, P2PDatabaseDeleteResponse, DatabaseQueryLatestInfo, DatabaseCountByDate, P2PDatabaseCountByDateResponse, P2PDatabaseQueryLocalResponse, DatabaseQueryLocal, P2PDatabaseQueryLocalHistoryRecordInfo, P2PDatabaseQueryLocalRecordCropPictureInfo, CustomDataType } from "./interfaces";
import { DskKeyResponse, ResultResponse, StationListResponse } from "../http/models";
import { HTTPApi } from "../http/api";
import { Device } from "../http/device";
import { ParsePayload, decodeImage } from "../http/utils";
import { TalkbackStream } from "./talkback";
import { LivestreamError, TalkbackError, ensureError } from "../error";
import { SmartSafeEvent } from "../push/types";
import { SmartSafeEventValueDetail } from "../push/models";
import { BleCommandFactory, BleParameterIndex } from "./ble";
import { CommandName, ParamType, Station } from "../http";
import { getError, parseJSON } from "../utils";
import { rootP2PLogger } from "../logging";

export class P2PClientProtocol extends TypedEmitter<P2PClientProtocolEvents> {

    private readonly MAX_RETRIES = 10;
    private readonly MAX_COMMAND_RESULT_WAIT = 30 * 1000;
    private readonly MAX_GATEWAY_COMMAND_RESULT_WAIT = 5 * 1000;
    private readonly MAX_CONNECTION_TIMEOUT = 25 * 1000;
    private readonly MAX_AKNOWLEDGE_TIMEOUT = 5 * 1000;
    private readonly MAX_LOOKUP_TIMEOUT = 20 * 1000;
    private readonly LOCAL_LOOKUP_RETRY_TIMEOUT = 1 * 1000;
    private readonly LOOKUP_RETRY_TIMEOUT = 1 * 1000;
    private readonly LOOKUP2_TIMEOUT = 3 * 1000;
    private readonly LOOKUP2_RETRY_TIMEOUT = 1 * 1000;
    private readonly MAX_EXPECTED_SEQNO_WAIT = 20 * 1000;
    private readonly HEARTBEAT_INTERVAL = 5 * 1000;
    private readonly MAX_COMMAND_QUEUE_TIMEOUT = 120 * 1000;
    private readonly AUDIO_CODEC_ANALYZE_TIMEOUT = 650;
    private readonly KEEPALIVE_INTERVAL = 2 * 1000;
    private readonly ESD_DISCONNECT_TIMEOUT = 30 * 1000;
    private readonly MAX_STREAM_DATA_WAIT = 5 * 1000;
    private readonly RESEND_NOT_ACKNOWLEDGED_COMMAND = 100;

    private readonly UDP_RECVBUFFERSIZE_BYTES = 1048576;
    private readonly MAX_PAYLOAD_BYTES = 1028;
    private readonly MAX_PACKET_BYTES = 1024;
    private readonly MAX_VIDEO_PACKET_BYTES = 655360;

    private readonly P2P_DATA_HEADER_BYTES = 16;

    private readonly MAX_SEQUENCE_NUMBER = 65535;

    private readonly LOOP_RUNAWAY_LIMIT = 1000;
    /*
    * SEQUENCE_PROCESSING_BOUNDARY is used to determine if an incoming sequence number
    * that is lower than the expected one was already processed.
    * If it is within the boundary, it is determined as 'already processed',
    * If it is even lower, it is assumed that the sequence count has reached
    * MAX_SEQUENCE_NUMBER and restarted at 0.
    * */
    private readonly SEQUENCE_PROCESSING_BOUNDARY = 20000; // worth of approx. 90 seconds of continous streaming

    private socket: Socket;
    private binded = false;
    private connected = false;
    private connecting = false;
    private terminating = false;
    private p2pTurnHandshaking: {
        [host: string]: boolean;
    } = {};
    private p2pTurnConfirmed = false;

    private seqNumber = 0;
    private offsetDataSeqNumber = 0;
    private videoSeqNumber = 0;
    private lockSeqNumber = -1;
    private expectedSeqNo: {
        [dataType: number]: number;
    } = {};
    private currentMessageBuilder: {
        [dataType: number]: P2PDataMessageBuilder;
    } = {};
    private currentMessageState: {
        [dataType: number]: P2PDataMessageState;
    } = {};

    private talkbackStream?: TalkbackStream;

    private downloadTotalBytes = 0;
    private downloadReceivedBytes = 0;

    private cloudAddresses: Array<Address>;

    private messageStates: SortedMap<number, P2PMessageState> = new SortedMap<number, P2PMessageState>((a: number, b: number) => a - b);
    private messageVideoStates: SortedMap<number, P2PVideoMessageState> = new SortedMap<number, P2PVideoMessageState>((a: number, b: number) => a - b);
    private sendQueue: Array<P2PQueueMessage> = new Array<P2PQueueMessage>();

    private connectTimeout?: NodeJS.Timeout;
    private lookupTimeout?: NodeJS.Timeout;
    private localLookupRetryTimeout?: NodeJS.Timeout;
    private lookupRetryTimeout?: NodeJS.Timeout;
    private lookup2Timeout?: NodeJS.Timeout;
    private lookup2RetryTimeout?: NodeJS.Timeout;
    private heartbeatTimeout?: NodeJS.Timeout;
    private keepaliveTimeout?: NodeJS.Timeout;
    private esdDisconnectTimeout?: NodeJS.Timeout;
    private secondaryCommandTimeout?: NodeJS.Timeout;
    private connectTime: number | null = null;
    private lastPong: number | null = null;
    private lastPongData: Buffer | undefined = undefined;
    private connectionType: P2PConnectionType = P2PConnectionType.QUICKEST;

    private energySavingDevice = false;

    private p2pSeqMapping: Map<number, number> = new Map<number, number>();
    private p2pDataSeqNumber = 0;

    private connectAddress: Address | undefined = undefined;
    private localIPAddress: string | undefined = undefined;
    private preferredIPAddress: string | undefined = undefined;
    private listeningPort: number = 0;
    private dskKey = "";
    private dskExpiration: Date | null = null;
    private deviceSNs: DeviceSerial = {};
    private api: HTTPApi;
    private rawStation!: StationListResponse;
    private customDataStaging: CustomDataType = {};
    private lockPublicKey: string;
    private lockAESKeys: Map<number, string> = new Map<number, string>();
    private channel = Station.CHANNEL;
    private encryption: EncryptionType = EncryptionType.NONE;
    private p2pKey?: Buffer;
    private enableEmbeddedPKCS1Support = false;

    constructor(rawStation: StationListResponse, api: HTTPApi, ipAddress?:string, listeningPort = 0, publicKey = "", enableEmbeddedPKCS1Support = false) {
        super();
        this.api = api;
        this.lockPublicKey = publicKey;
        this.preferredIPAddress = ipAddress;
        if (listeningPort >= 0)
            this.listeningPort = listeningPort;
        this.enableEmbeddedPKCS1Support = enableEmbeddedPKCS1Support;
        this.cloudAddresses = decodeP2PCloudIPs(rawStation.app_conn);
        rootP2PLogger.debug("Loaded P2P cloud ip addresses", { stationSN: rawStation.station_sn, ipAddress: ipAddress, cloudAddresses: this.cloudAddresses });
        this.updateRawStation(rawStation);

        this.socket = createSocket("udp4");
        this.socket.on("message", (msg, rinfo) => this.handleMsg(msg, rinfo));
        this.socket.on("error", (error) => this.onError(error));
        this.socket.on("close", () => this.onClose());

        this._initialize();
    }

    private _incrementSequence(sequence: number): number {
        if (sequence < this.MAX_SEQUENCE_NUMBER)
            return sequence + 1;
        return 0;
    }

    private _isBetween(n: number, lowBoundary: number, highBoundary: number): boolean {
        if (n < lowBoundary) return false;
        if (n >= highBoundary) return false;
        return true;
    }

    private _wasSequenceNumberAlreadyProcessed(expectedSequence: number, receivedSequence: number): boolean {
        if ((expectedSequence - this.SEQUENCE_PROCESSING_BOUNDARY) > 0) { // complete boundary without squence number reset
            return this._isBetween(receivedSequence, expectedSequence - this.SEQUENCE_PROCESSING_BOUNDARY, expectedSequence);
        } else { // there was a sequence number reset recently
            const isInRangeAfterReset = this._isBetween(receivedSequence, 0, expectedSequence);
            const isInRangeBeforeReset = this._isBetween(receivedSequence, this.MAX_SEQUENCE_NUMBER + (expectedSequence - this.SEQUENCE_PROCESSING_BOUNDARY), this.MAX_SEQUENCE_NUMBER);
            return (isInRangeBeforeReset || isInRangeAfterReset);
        }
    }

    private _initialize(): void {
        let rsaKey: NodeRSA | null;

        this.connected = false;
        this.p2pTurnHandshaking = {};
        this.p2pTurnConfirmed = false;
        this.connecting = false;
        this.lastPong = null;
        this.lastPongData = undefined;
        this.connectTime = null;
        this.seqNumber = 0;
        this.offsetDataSeqNumber = 0;
        this.videoSeqNumber = 0;
        this.p2pDataSeqNumber = 0;
        this.connectAddress = undefined;
        this.customDataStaging = {}
        this.encryption = EncryptionType.NONE;
        this.p2pKey = undefined;
        this.lockAESKeys.clear();

        this._clearMessageStateTimeouts();
        this._clearMessageVideoStateTimeouts();
        this.messageStates.clear();
        this.messageVideoStates.clear();
        this.p2pSeqMapping.clear();

        for(let datatype = 0; datatype < 4; datatype++) {

            this.expectedSeqNo[datatype] = 0;

            if (datatype === P2PDataType.VIDEO)
                rsaKey = getNewRSAPrivateKey(this.enableEmbeddedPKCS1Support);
            else
                rsaKey = null;

            this.initializeMessageBuilder(datatype);
            this.initializeMessageState(datatype, rsaKey);
            this.initializeStream(datatype);
        }
    }

    private initializeMessageBuilder(datatype: P2PDataType): void {
        this.currentMessageBuilder[datatype] = {
            header: {
                commandId: 0,
                bytesToRead: 0,
                channel: 0,
                signCode: 0,
                type: 0
            },
            bytesRead: 0,
            messages: {}
        };
    }

    private initializeMessageState(datatype: P2PDataType, rsaKey: NodeRSA | null = null): void {
        this.currentMessageState[datatype] = {
            leftoverData: Buffer.from([]),
            queuedData: new SortedMap<number, P2PMessage>((a: number, b: number) => a - b),
            rsaKey: rsaKey,
            videoStream: null,
            audioStream: null,
            invalidStream: false,
            p2pStreaming: false,
            p2pStreamNotStarted: true,
            p2pStreamChannel: -1,
            p2pStreamFirstAudioDataReceived: false,
            p2pStreamFirstVideoDataReceived: false,
            p2pStreamMetadata: {
                videoCodec: VideoCodec.H264,
                videoFPS: 15,
                videoHeight: 1080,
                videoWidth: 1920,
                audioCodec: AudioCodec.NONE
            },
            rtspStream: {},
            rtspStreaming: {},
            receivedFirstIFrame: false,
            preFrameVideoData: Buffer.from([]),
            p2pTalkback: false,
            p2pTalkbackChannel: -1
        };
    }

    private _clearTimeout(timeout: NodeJS.Timeout | undefined): void {
        if (!!timeout) {
            clearTimeout(timeout);
        }
    }

    private _clearMessageStateTimeouts(): void {
        for(const message of this.messageStates.values()) {
            this._clearTimeout(message.timeout);
        }
    }

    private _clearMessageVideoStateTimeouts(): void {
        for(const message of this.messageVideoStates.values()) {
            this._clearTimeout(message.timeout);
        }
    }

    private _clearHeartbeatTimeout(): void {
        this._clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = undefined;
    }

    private _clearKeepaliveTimeout(): void {
        this._clearTimeout(this.keepaliveTimeout);
        this.keepaliveTimeout = undefined;
    }

    private _clearConnectTimeout(): void {
        this._clearTimeout(this.connectTimeout);
        this.connectTimeout = undefined;
    }

    private _clearLookupTimeout(): void {
        this._clearTimeout(this.lookupTimeout);
        this.lookupTimeout = undefined;
    }

    private _clearLocalLookupRetryTimeout(): void {
        this._clearTimeout(this.localLookupRetryTimeout);
        this.localLookupRetryTimeout = undefined;
    }

    private _clearLookupRetryTimeout(): void {
        this._clearTimeout(this.lookupRetryTimeout);
        this.lookupRetryTimeout = undefined;
    }

    private _clearLookup2RetryTimeout(): void {
        this._clearTimeout(this.lookup2RetryTimeout);
        this.lookup2RetryTimeout = undefined;
    }

    private _clearLookup2Timeout(): void {
        this._clearTimeout(this.lookup2Timeout);
        this.lookup2Timeout = undefined;
    }

    private _clearESDDisconnectTimeout(): void {
        this._clearTimeout(this.esdDisconnectTimeout);
        this.esdDisconnectTimeout = undefined;
    }

    private _clearSecondaryCommandTimeout(): void {
        this._clearTimeout(this.secondaryCommandTimeout);
        this.secondaryCommandTimeout = undefined;
    }

    private async sendMessage(errorSubject: string, address: Address, msgID: Buffer, payload?: Buffer): Promise<void> {
        await sendMessage(this.socket, address, msgID, payload).catch((err) => {
            const error = ensureError(err);
            rootP2PLogger.error(`${errorSubject} - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, address: address, msgID: msgID.toString("hex"), payload: payload?.toString("hex") });
        });
    }

    private _disconnected(): void {
        this._clearHeartbeatTimeout();
        this._clearKeepaliveTimeout();
        this._clearLocalLookupRetryTimeout();
        this._clearLookupRetryTimeout();
        this._clearLookup2Timeout();
        this._clearLookupTimeout();
        this._clearConnectTimeout();
        this._clearESDDisconnectTimeout();
        this._clearSecondaryCommandTimeout();
        this._clearMessageStateTimeouts();
        this._clearMessageVideoStateTimeouts();
        if (this.currentMessageState[P2PDataType.VIDEO].p2pStreaming) {
            this.endStream(P2PDataType.VIDEO);
        }
        if (this.currentMessageState[P2PDataType.BINARY].p2pStreaming) {
            this.endStream(P2PDataType.BINARY);
        }
        for (const channel in this.currentMessageState[P2PDataType.DATA].rtspStreaming) {
            this.endRTSPStream(Number.parseInt(channel));
        }
        this.sendQueue = this.sendQueue.filter((queue) => queue.p2pCommand.commandType !== CommandType.CMD_PING && queue.p2pCommand.commandType !== CommandType.CMD_GET_DEVICE_PING);
        if (this.connected) {
            this.emit("close");
        } else if (!this.terminating) {
            this.emit("timeout");
        }
        this._initialize();
    }

    private closeEnergySavingDevice(): void {
        if (this.sendQueue.filter((queue) => queue.p2pCommand.commandType !== CommandType.CMD_PING && queue.p2pCommand.commandType !== CommandType.CMD_GET_DEVICE_PING).length === 0 &&
            this.energySavingDevice &&
            !this.isCurrentlyStreaming() &&
            Array.from(this.messageStates.values()).filter((msgState) => msgState.acknowledged === false).length === 0) {
            if (this.esdDisconnectTimeout === undefined) {
                rootP2PLogger.debug(`Energy saving device - No more p2p commands to execute or running streams, initiate disconnect timeout in ${this.ESD_DISCONNECT_TIMEOUT} milliseconds...`, { stationSN: this.rawStation.station_sn });
                this.esdDisconnectTimeout = setTimeout(() => {
                    this.esdDisconnectTimeout = undefined;
                    this.sendMessage(`Closing of connection for battery saving`, this.connectAddress!, RequestMessageType.END);
                    rootP2PLogger.info(`Initiated closing of connection to station ${this.rawStation.station_sn} for saving battery.`);
                    this.terminating = true;
                    this._disconnected();
                }, this.ESD_DISCONNECT_TIMEOUT);
            }
        }
    }

    private async renewDSKKey(): Promise<void> {
        if (this.dskKey === "" || (this.dskExpiration && (new Date()).getTime() >= this.dskExpiration.getTime())) {
            rootP2PLogger.debug(`DSK keys not present or expired, get/renew it`, { stationSN: this.rawStation.station_sn, dskKey: this.dskKey, dskExpiration: this.dskExpiration });
            await this.getDSKKeys();
        }
    }

    private localLookup(host: string): void {
        rootP2PLogger.debug(`Trying to local lookup address for station ${this.rawStation.station_sn} with host ${host}`);
        this.localLookupByAddress({ host: host, port: 32108 });
        this._clearLocalLookupRetryTimeout();
        this.lookupRetryTimeout = setTimeout(() => {
            this.localLookup(host);
        }, this.LOCAL_LOOKUP_RETRY_TIMEOUT);
    }

    private cloudLookup(): void {
        this.cloudAddresses.map((address) => this.cloudLookupByAddress(address));
        this._clearLookupRetryTimeout();
        this.lookupRetryTimeout = setTimeout(() => {
            this.cloudLookup();
        }, this.LOOKUP_RETRY_TIMEOUT);
    }

    private cloudLookup2(): void {
        this.cloudAddresses.map((address) => this.cloudLookupByAddress2(address));
        this._clearLookup2RetryTimeout();
        this.lookup2RetryTimeout = setTimeout(() => {
            this.cloudLookup2();
        }, this.LOOKUP2_RETRY_TIMEOUT);
    }

    private cloudLookupWithTurnServer(origAddress: Address, data: Buffer): void {
        this.cloudAddresses.map((address) => this.cloudLookupByAddressWithTurnServer(address, origAddress, data));
    }

    private async localLookupByAddress(address: Address): Promise<void> {
        // Send lookup message
        const msgId = RequestMessageType.LOCAL_LOOKUP;
        const payload = Buffer.from([0, 0]);
        await this.sendMessage(`Local lookup address`, address, msgId, payload);
    }

    private async cloudLookupByAddress(address: Address): Promise<void> {
        // Send lookup message
        const msgId = RequestMessageType.LOOKUP_WITH_KEY;
        const payload = buildLookupWithKeyPayload(this.socket, this.rawStation.p2p_did, this.dskKey);
        await this.sendMessage(`Cloud lookup addresses`, address, msgId, payload);
    }

    private async cloudLookupByAddress2(address: Address): Promise<void> {
        // Send lookup message2
        const msgId = RequestMessageType.LOOKUP_WITH_KEY2;
        const payload = buildLookupWithKeyPayload2(this.rawStation.p2p_did, this.dskKey);
        await this.sendMessage(`Cloud lookup addresses (2)`, address, msgId, payload);
    }

    private async cloudLookupByAddressWithTurnServer(address: Address, origAddress: Address, data: Buffer): Promise<void> {
        // Send lookup message3
        const msgId = RequestMessageType.TURN_LOOKUP_WITH_KEY;
        const payload = buildLookupWithKeyPayload3(this.rawStation.p2p_did, origAddress, data);
        await this.sendMessage(`Cloud lookup addresses with turn server`, address, msgId, payload);
    }

    public isConnected(): boolean {
        return this.connected;
    }

    private _startConnectTimeout(): void {
        if (this.connectTimeout === undefined)
            this.connectTimeout = setTimeout(() => {
                rootP2PLogger.warn(`Tried all hosts, no connection could be established to station ${this.rawStation.station_sn}.`);
                this._disconnected();
            }, this.MAX_CONNECTION_TIMEOUT);
    }

    private _connect(address: Address, p2p_did: string): void {
        rootP2PLogger.debug(`Connecting to host ${address.host} on port ${address.port} (CHECK_CAM)`, { stationSN: this.rawStation.station_sn, address: address, p2pDid: p2p_did });

        this.sendCamCheck(address, p2p_did);
        for (let i = address.port - 3; i < address.port; i++)
            this.sendCamCheck({ host: address.host, port: i }, p2p_did);
        for (let i = address.port + 1; i <= address.port + 3; i++)
            this.sendCamCheck({ host: address.host, port: i }, p2p_did);

        this._startConnectTimeout();
    }

    private lookup(host?: string): void {
        if (host === undefined) {
            if (this.preferredIPAddress !== undefined) {
                host = this.preferredIPAddress;
            } else if (this.localIPAddress !== undefined) {
                host = this.localIPAddress;
            } else {
                const localIP = getLocalIpAddress();
                host = localIP.substring(0, localIP.lastIndexOf(".") + 1).concat("255")
            }
        }
        this.localLookup(host);
        this.cloudLookup();

        this._clearLookup2Timeout();
        this.lookup2Timeout = setTimeout(() => {
            this.cloudLookup2();
        }, this.LOOKUP2_TIMEOUT);

        this._clearLookupTimeout();
        this.lookupTimeout = setTimeout(() => {
            this.lookupTimeout = undefined;
            rootP2PLogger.error(`All address lookup tentatives failed.`, { stationSN: this.rawStation.station_sn });
            if (this.localIPAddress !== undefined)
                this.localIPAddress = undefined
            this._disconnected();
        }, this.MAX_LOOKUP_TIMEOUT);
    }

    public async connect(host?: string): Promise<void> {
        if (!this.connected && !this.connecting && this.rawStation.p2p_did !== undefined) {
            this.connecting = true;
            this.terminating = false;
            await this.renewDSKKey();
            if (!this.binded)
                this.socket.bind(this.listeningPort, () => {
                    this.binded = true;
                    try {
                        this.socket.setRecvBufferSize(this.UDP_RECVBUFFERSIZE_BYTES);
                        this.socket.setBroadcast(true);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`connect - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, host: host, currentRecBufferSize: this.socket.getRecvBufferSize(), recBufferRequestedSize: this.UDP_RECVBUFFERSIZE_BYTES });
                    }
                    this.lookup(host);
                });
            else {
                this.lookup(host);
            }
        }
    }

    private async sendCamCheck(address: Address, p2p_did: string): Promise<void> {
        const payload = buildCheckCamPayload(p2p_did);
        await this.sendMessage(`Send cam check`, address, RequestMessageType.CHECK_CAM, payload);
    }

    private async sendCamCheck2(address: Address, data: Buffer): Promise<void> {
        const payload = buildCheckCamPayload2(this.rawStation.p2p_did, data);
        await this.sendMessage(`Send cam check (2)`, address, RequestMessageType.CHECK_CAM2, payload);
    }

    public async sendPing(address: Address): Promise<void> {
        if ((this.lastPong && ((new Date().getTime() - this.lastPong) / this.getHeartbeatInterval() >= this.MAX_RETRIES)) ||
            (this.connectTime && !this.lastPong && ((new Date().getTime() - this.connectTime) / this.getHeartbeatInterval() >= this.MAX_RETRIES))) {
            if (!this.energySavingDevice)
                rootP2PLogger.warn(`Heartbeat check failed for station ${this.rawStation.station_sn}. Connection seems lost. Try to reconnect...`);
            this._disconnected();
        }
        await this.sendMessage(`Send ping`, address, RequestMessageType.PING, this.lastPongData);
    }

    public sendCommandWithIntString(p2pcommand: P2PCommand, customData?: CustomData): void {
        if (p2pcommand.channel === undefined)
            p2pcommand.channel = 0;
        if (p2pcommand.value === undefined || typeof p2pcommand.value !== "number")
            throw new TypeError("value must be a number");

        this.sendCommand(p2pcommand, InternalP2PCommandType.WithIntString, undefined, customData);
    }

    public sendCommandWithInt(p2pcommand: P2PCommand, customData?: CustomData): void {
        if (p2pcommand.channel === undefined)
            p2pcommand.channel = this.channel;
        if (p2pcommand.value === undefined || typeof p2pcommand.value !== "number")
            throw new TypeError("value must be a number");

        this.sendCommand(p2pcommand, InternalP2PCommandType.WithInt, undefined, customData);
    }

    public sendCommandWithStringPayload(p2pcommand: P2PCommand, customData?: CustomData): void {
        if (p2pcommand.channel === undefined)
            p2pcommand.channel = 0;
        if (p2pcommand.value === undefined || typeof p2pcommand.value !== "string")
            throw new TypeError("value must be a string");

        let nested_commandType = undefined;
        let nested_commandType2 = undefined;

        rootP2PLogger.debug(`sendCommandWithStringPayload:`, { p2pcommand: p2pcommand, customData: customData });

        if (p2pcommand.commandType == CommandType.CMD_SET_PAYLOAD) {
            try {
                const json = JSON.parse(p2pcommand.value);
                nested_commandType = json.cmd;
                if(json.payload && json.payload.apiCommand !== undefined) {
                    nested_commandType2 = json.payload.apiCommand;
                }
            } catch (err) {
                const error = ensureError(err);
                rootP2PLogger.error(`sendCommandWithStringPayload CMD_SET_PAYLOAD - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, p2pcommand: p2pcommand, customData: customData });
            }
        } else if (p2pcommand.commandType == CommandType.CMD_DOORBELL_SET_PAYLOAD) {
            try {
                const json = JSON.parse(p2pcommand.value);
                nested_commandType = json.commandType;
            } catch (err) {
                const error = ensureError(err);
                rootP2PLogger.error(`sendCommandWithStringPayload CMD_DOORBELL_SET_PAYLOAD - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, p2pcommand: p2pcommand, customData: customData });
            }
        }

        this.sendCommand(p2pcommand, InternalP2PCommandType.WithStringPayload, nested_commandType, customData, nested_commandType2);
    }

    public sendCommandWithString(p2pcommand: P2PCommand, customData?: CustomData): void {
        if (p2pcommand.channel === undefined)
            p2pcommand.channel = this.channel;
        if (p2pcommand.strValue === undefined)
            throw new TypeError("strValue must be defined");
        if (p2pcommand.strValueSub === undefined)
            throw new TypeError("strValueSub must be defined");

        this.sendCommand(p2pcommand, InternalP2PCommandType.WithString, p2pcommand.commandType, customData);
    }

    public sendCommandPing(channel = this.channel): void {
        this.sendCommand({
            commandType: CommandType.CMD_PING,
            channel: channel
        }, InternalP2PCommandType.WithoutData);
    }

    public sendCommandDevicePing(channel = this.channel): void {
        this.sendCommand({
            commandType: CommandType.CMD_GET_DEVICE_PING,
            channel: channel
        }, InternalP2PCommandType.WithoutData);
    }

    public sendCommandWithoutData(commandType: CommandType, channel = this.channel): void {
        this.sendCommand({
            commandType: commandType,
            channel: channel
        }, InternalP2PCommandType.WithoutData);
    }

    private sendQueuedMessage(): void {
        if (this.sendQueue.length > 0) {
            if (this.connected) {
                let queuedMessage: P2PQueueMessage;
                while ((queuedMessage = this.sendQueue.shift()!) !== undefined) {
                    let exists = false;
                    let waitingAcknowledge = false;
                    this.messageStates.forEach(stateMessage => {
                        if (stateMessage.commandType === queuedMessage.p2pCommand.commandType && stateMessage.nestedCommandType === queuedMessage.nestedCommandType && !stateMessage.acknowledged) {
                            exists = true;
                        }
                        if (!stateMessage.acknowledged || stateMessage.commandType === CommandType.CMD_GATEWAYINFO) {
                            waitingAcknowledge = true;
                        }
                    });
                    if (!exists && !waitingAcknowledge) {
                        this._sendCommand(queuedMessage);
                        break;
                    } else {
                        this.sendQueue.unshift(queuedMessage);
                        break;
                    }
                }
            } else if (!this.connected && this.sendQueue.filter((queue) => queue.p2pCommand.commandType !== CommandType.CMD_PING && queue.p2pCommand.commandType !== CommandType.CMD_GET_DEVICE_PING).length > 0) {
                rootP2PLogger.debug(`Initiate station p2p connection to send queued data`, { stationSN: this.rawStation.station_sn, queuedDataCount: this.sendQueue.filter((queue) => queue.p2pCommand.commandType !== CommandType.CMD_PING && queue.p2pCommand.commandType !== CommandType.CMD_GET_DEVICE_PING).length });
                this.connect();
            }
        }
        this.closeEnergySavingDevice();
    }

    private sendCommand(p2pcommand: P2PCommand, p2pcommandType: InternalP2PCommandType, nestedCommandType?: CommandType, customData?: CustomData, nested_commandType2?: number): void {
        const message: P2PQueueMessage = {
            p2pCommand: p2pcommand,
            nestedCommandType: nestedCommandType,
            nestedCommandType2: nested_commandType2,
            timestamp: +new Date,
            customData: customData,
            p2pCommandType: p2pcommandType
        };
        this.sendQueue.push(message);
        if (p2pcommand.commandType !== CommandType.CMD_PING && p2pcommand.commandType !== CommandType.CMD_GET_DEVICE_PING)
            this._clearESDDisconnectTimeout();
        this.sendQueuedMessage();
    }

    private resendNotAcknowledgedCommand(sequence: number): void {
        const messageState = this.messageStates.get(sequence);
        if (messageState) {
            this._clearTimeout(messageState.retryTimeout);
            messageState.retryTimeout = setTimeout(() => {
                if (this.connectAddress) {
                    sendMessage(this.socket, this.connectAddress, RequestMessageType.DATA, messageState.data).catch((err) => {
                        const error = ensureError(err);
                        rootP2PLogger.error(`resendNotAcknowledgedCommand - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, sequence: sequence });
                    });
                    this.resendNotAcknowledgedCommand(sequence);
                }
            }, this.RESEND_NOT_ACKNOWLEDGED_COMMAND);
        }
    }

    private async _sendCommand(message: P2PMessageState|P2PQueueMessage): Promise<void> {
        if (isP2PQueueMessage(message)) {
            const ageing = +new Date - message.timestamp;
            if (ageing <= this.MAX_COMMAND_QUEUE_TIMEOUT) {
                const commandHeader = buildCommandHeader(this.seqNumber, message.p2pCommand.commandType);
                let payload: Buffer;
                const channel = message.p2pCommand.channel !== undefined ? message.p2pCommand.channel : 0;
                switch(message.p2pCommandType) {
                    case InternalP2PCommandType.WithInt:
                        payload = buildIntCommandPayload(this.encryption, this.p2pKey, this.rawStation.station_sn, this.rawStation.p2p_did, message.p2pCommand.commandType, message.p2pCommand.value as number, message.p2pCommand.strValue === undefined ? "" : message.p2pCommand.strValue, channel);
                        break;
                    case InternalP2PCommandType.WithIntString:
                        payload = buildIntStringCommandPayload(this.encryption, this.p2pKey, this.rawStation.station_sn, this.rawStation.p2p_did, message.p2pCommand.commandType, message.p2pCommand.value as number, message.p2pCommand.valueSub === undefined ? 0 : message.p2pCommand.valueSub, message.p2pCommand.strValue === undefined ? "" : message.p2pCommand.strValue , message.p2pCommand.strValueSub === undefined ? "" : message.p2pCommand.strValueSub, channel);
                        //TODO: Check if this "if" can be moved elsewhere
                        if (message.p2pCommand.commandType === CommandType.CMD_NAS_TEST) {
                            this.currentMessageState[P2PDataType.DATA].rtspStream[channel] = message.p2pCommand.value === 1 ? true : false;
                        }
                        break;
                    case InternalP2PCommandType.WithString:
                        payload = buildStringTypeCommandPayload(this.encryption, this.p2pKey, this.rawStation.station_sn, this.rawStation.p2p_did, message.p2pCommand.commandType, message.p2pCommand.strValue as string, message.p2pCommand.strValueSub as string, channel);
                        break;
                    case InternalP2PCommandType.WithStringPayload:
                        payload = buildCommandWithStringTypePayload(this.encryption, this.p2pKey, this.rawStation.station_sn, this.rawStation.p2p_did, message.p2pCommand.commandType, message.p2pCommand.value as string, channel);
                        break;
                    default:
                        payload = buildVoidCommandPayload(channel);
                        break;
                }
                const data = Buffer.concat([commandHeader, payload]);
                const messageState: P2PMessageState = {
                    sequence: this.seqNumber,
                    commandType: message.p2pCommand.commandType,
                    nestedCommandType: message.nestedCommandType,
                    nestedCommandType2: message.nestedCommandType2,
                    channel: channel,
                    data: data,
                    retries: 0,
                    acknowledged: false,
                    customData: message.customData
                };
                message = messageState;
                this.seqNumber = this._incrementSequence(this.seqNumber);
            } else if (message.p2pCommand.commandType === CommandType.CMD_PING || message.p2pCommand.commandType === CommandType.CMD_GET_DEVICE_PING) {
                return;
            } else {
                rootP2PLogger.warn(`Command aged out from send queue for station ${this.rawStation.station_sn}`, { commandType: message.p2pCommand.commandType, nestedCommandType: message.nestedCommandType, channel: message.p2pCommand.channel, ageing: ageing, maxAgeing: this.MAX_COMMAND_QUEUE_TIMEOUT });
                this.emit("command", {
                    command_type: message.nestedCommandType !== undefined ? message.nestedCommandType : message.p2pCommand.commandType,
                    channel: message.p2pCommand.channel,
                    return_code: ErrorCode.ERROR_CONNECT_TIMEOUT,
                    customData: message.customData
                } as CommandResult);
                return;
            }
        } else {
            if (message.retries < this.MAX_RETRIES && message.returnCode !== ErrorCode.ERROR_CONNECT_TIMEOUT) {
                if (message.returnCode === ErrorCode.ERROR_FAILED_TO_REQUEST) {
                    this.messageStates.delete(message.sequence);
                    message.sequence = this.seqNumber;
                    message.data.writeUInt16BE(message.sequence, 2);
                    this.seqNumber = this._incrementSequence(this.seqNumber);
                    this.messageStates.set(message.sequence, message);
                }
                message.retries++;
            } else {
                rootP2PLogger.error(`Max p2p command send retries reached.`, { stationSN: this.rawStation.station_sn, sequence: message.sequence, commandType: message.commandType, channel: message.channel, retries: message.retries, returnCode: message.returnCode });
                this.emit("command", {
                    command_type: message.nestedCommandType !== undefined ? message.nestedCommandType : message.commandType,
                    channel: message.channel,
                    return_code: ErrorCode.ERROR_COMMAND_TIMEOUT,
                    customData: message.customData
                } as CommandResult);

                if (message.commandType === CommandType.CMD_START_REALTIME_MEDIA ||
                    (message.nestedCommandType === CommandType.CMD_START_REALTIME_MEDIA && message.commandType === CommandType.CMD_SET_PAYLOAD) ||
                    message.commandType === CommandType.CMD_RECORD_VIEW ||
                    (message.nestedCommandType === ParamType.COMMAND_START_LIVESTREAM && message.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD)
                ) {
                    if (this.currentMessageState[P2PDataType.VIDEO].p2pStreaming && message.channel === this.currentMessageState[P2PDataType.VIDEO].p2pStreamChannel) {
                        this.endStream(P2PDataType.VIDEO);
                    }
                } else if (message.commandType === CommandType.CMD_DOWNLOAD_VIDEO) {
                    if (this.currentMessageState[P2PDataType.BINARY].p2pStreaming && message.channel === this.currentMessageState[P2PDataType.BINARY].p2pStreamChannel) {
                        this.endStream(P2PDataType.BINARY);
                    }
                }

                this.messageStates.delete(message.sequence);
                this.sendQueuedMessage();
                return;
            }
        }

        const messageState = message as P2PMessageState;
        messageState.timeout = setTimeout(() => {
            this._clearTimeout(messageState.retryTimeout);
            this._sendCommand(messageState);
            this._clearESDDisconnectTimeout();
            this.closeEnergySavingDevice();
        }, this.MAX_AKNOWLEDGE_TIMEOUT);
        this.messageStates.set(messageState.sequence, messageState);
        messageState.retryTimeout = setTimeout(() => {
            this.resendNotAcknowledgedCommand(messageState.sequence);
        }, this.RESEND_NOT_ACKNOWLEDGED_COMMAND);

        if (messageState.commandType !== CommandType.CMD_PING) {
            this.p2pSeqMapping.set(this.p2pDataSeqNumber, message.sequence);
            rootP2PLogger.trace(`Added sequence number mapping`, { stationSN: this.rawStation.station_sn, commandType: message.commandType, seqNumber: message.sequence, p2pDataSeqNumber: this.p2pDataSeqNumber, p2pSeqMappingCount: this.p2pSeqMapping.size });
            this.p2pDataSeqNumber = this._incrementSequence(this.p2pDataSeqNumber);
        }

        rootP2PLogger.debug("Sending p2p command...", { station: this.rawStation.station_sn, sequence: messageState.sequence, commandType: messageState.commandType, channel: messageState.channel, retries: messageState.retries, messageStatesSize: this.messageStates.size });
        await this.sendMessage(`Send p2p command`, this.connectAddress!, RequestMessageType.DATA, messageState.data);

        if (messageState.retries === 0) {
            if (messageState.commandType === CommandType.CMD_START_REALTIME_MEDIA ||
                (messageState.nestedCommandType === CommandType.CMD_START_REALTIME_MEDIA && messageState.commandType === CommandType.CMD_SET_PAYLOAD) ||
                messageState.commandType === CommandType.CMD_RECORD_VIEW ||
                (messageState.nestedCommandType === ParamType.COMMAND_START_LIVESTREAM && messageState.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD)
            ) {
                if (this.currentMessageState[P2PDataType.VIDEO].p2pStreaming && messageState.channel !== this.currentMessageState[P2PDataType.VIDEO].p2pStreamChannel) {
                    this.endStream(P2PDataType.VIDEO);
                }
                this.currentMessageState[P2PDataType.VIDEO].p2pStreaming = true;
                this.currentMessageState[P2PDataType.VIDEO].p2pStreamChannel = messageState.channel;
                this.waitForStreamData(P2PDataType.VIDEO);
            } else if (messageState.commandType === CommandType.CMD_DOWNLOAD_VIDEO) {
                if (this.currentMessageState[P2PDataType.BINARY].p2pStreaming && messageState.channel !== this.currentMessageState[P2PDataType.BINARY].p2pStreamChannel) {
                    this.endStream(P2PDataType.BINARY);
                }
                this.currentMessageState[P2PDataType.BINARY].p2pStreaming = true;
                this.currentMessageState[P2PDataType.BINARY].p2pStreamChannel = message.channel;
                this.waitForStreamData(P2PDataType.BINARY);
            } else if (messageState.commandType === CommandType.CMD_STOP_REALTIME_MEDIA) { //TODO: CommandType.CMD_RECORD_PLAY_CTRL only if stop
                this.endStream(P2PDataType.VIDEO);
            } else if (messageState.commandType === CommandType.CMD_DOWNLOAD_CANCEL) {
                this.endStream(P2PDataType.BINARY);
            } else if (messageState.commandType === CommandType.CMD_NAS_TEST) {
                if (this.currentMessageState[P2PDataType.DATA].rtspStream[messageState.channel]) {
                    this.currentMessageState[P2PDataType.DATA].rtspStreaming[messageState.channel] = true;
                    this.emit("rtsp livestream started", messageState.channel);
                } else {
                    this.endRTSPStream(messageState.channel);
                }
            }
        }
    }

    private handleMsg(msg: Buffer, rinfo: RemoteInfo): void {
        if (hasHeader(msg, ResponseMessageType.LOCAL_LOOKUP_RESP)) {
            if (!this.connected) {
                this._clearLookupTimeout();
                this._clearLocalLookupRetryTimeout();

                const p2pDid = `${msg.subarray(4, 12).toString("utf8").replace(/[\0]+$/g, "")}-${msg.subarray(12, 16).readUInt32BE().toString().padStart(6, "0")}-${msg.subarray(16, 24).toString("utf8").replace(/[\0]+$/g, "")}`;
                rootP2PLogger.trace(`Received message - LOCAL_LOOKUP_RESP - Got response`, { stationSN: this.rawStation.station_sn, ip: rinfo.address, port: rinfo.port, p2pDid: p2pDid });

                if (p2pDid === this.rawStation.p2p_did) {
                    rootP2PLogger.debug(`Received message - LOCAL_LOOKUP_RESP - Wanted device was found, connect to it`, { stationSN: this.rawStation.station_sn, ip: rinfo.address, port: rinfo.port, p2pDid: p2pDid });
                    this._connect({ host: rinfo.address, port: rinfo.port }, p2pDid);
                } else {
                    rootP2PLogger.debug(`Received message - LOCAL_LOOKUP_RESP - Unwanted device was found, don't connect to it`, { stationSN: this.rawStation.station_sn, ip: rinfo.address, port: rinfo.port, p2pDid: p2pDid });
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.LOOKUP_ADDR)) {
            if (!this.connected) {
                const port = msg.subarray(6, 8).readUInt16LE();
                const ip = `${msg[11]}.${msg[10]}.${msg[9]}.${msg[8]}`;

                rootP2PLogger.trace(`Received message - LOOKUP_ADDR - Got response`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, response: { ip: ip, port: port } });

                if (ip === "0.0.0.0") {
                    rootP2PLogger.trace(`Received message - LOOKUP_ADDR - Got invalid ip address 0.0.0.0, ignoring response...`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, response: { ip: ip, port: port } });
                    return;
                }

                if (isPrivateIp(ip))
                    this.localIPAddress = ip;

                if (this.connectionType === P2PConnectionType.ONLY_LOCAL) {
                    if (isPrivateIp(ip)) {
                        this._clearLookupTimeout();
                        this._clearLookupRetryTimeout();
                        rootP2PLogger.debug(`Trying to connect in ONLY_LOCAL mode...`, { stationSN: this.rawStation.station_sn, ip: ip, port: port });
                        this._connect({ host: ip, port: port }, this.rawStation.p2p_did);
                    }
                } else if (this.connectionType === P2PConnectionType.QUICKEST) {
                    this._clearLookupTimeout();
                    this._clearLookupRetryTimeout();
                    rootP2PLogger.debug(`Trying to connect in QUICKEST mode...`, { stationSN: this.rawStation.station_sn, ip: ip, port: port });
                    this._connect({ host: ip, port: port }, this.rawStation.p2p_did);
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.CAM_ID) || hasHeader(msg, ResponseMessageType.TURN_SERVER_CAM_ID)) {
            // Answer from the device to a CAM_CHECK message
            if (!this.connected) {
                rootP2PLogger.debug(`Received message - CAM_ID - Connected to station ${this.rawStation.station_sn} on host ${rinfo.address} port ${rinfo.port}`);
                this._clearLocalLookupRetryTimeout();
                this._clearLookupRetryTimeout();
                this._clearLookup2RetryTimeout();
                this._clearLookupTimeout();
                this._clearConnectTimeout();
                this._clearLookup2Timeout();
                this.connected = true;
                this.connectTime = new Date().getTime();
                this.lastPong = null;
                this.lastPongData = undefined;

                this.connectAddress = { host: rinfo.address, port: rinfo.port };
                if (isPrivateIp(rinfo.address))
                    this.localIPAddress = rinfo.address;

                this.scheduleHeartbeat();

                if (Device.isSmartSafe(this.rawStation.device_type)) {
                    const payload = buildVoidCommandPayload(Station.CHANNEL);
                    const data = Buffer.concat([buildCommandHeader(this.seqNumber, CommandType.CMD_GATEWAYINFO), payload]);
                    const message: P2PMessageState = {
                        sequence: this.seqNumber,
                        commandType: CommandType.CMD_GATEWAYINFO,
                        channel: Station.CHANNEL,
                        data: data,
                        retries: 0,
                        acknowledged: false,
                    };
                    this.messageStates.set(message.sequence, message);
                    message.retryTimeout = setTimeout(() => {
                        this.resendNotAcknowledgedCommand(message.sequence);
                    }, this.RESEND_NOT_ACKNOWLEDGED_COMMAND);
                    this.seqNumber = this._incrementSequence(this.seqNumber);

                    this.sendMessage(`Send smartsafe gateway command to station`, this.connectAddress!, RequestMessageType.DATA, data);
                    const tmpSendQueue: Array<P2PQueueMessage> = [ ...this.sendQueue ];
                    this.sendQueue = [];
                    this.sendCommandPing(Station.CHANNEL);
                    tmpSendQueue.forEach(element => {
                        this.sendQueue.push(element);
                    });
                } else if (Device.isLockWifiR10(this.rawStation.device_type) || Device.isLockWifiR20(this.rawStation.device_type)) {
                    const tmpSendQueue: Array<P2PQueueMessage> = [ ...this.sendQueue ];
                    this.sendQueue = [];
                    const payload = buildVoidCommandPayload(Station.CHANNEL);
                    const data = Buffer.concat([buildCommandHeader(0, CommandType.CMD_GATEWAYINFO), payload.subarray(0, payload.length - 2), buildCommandHeader(0, CommandType.CMD_PING).subarray(2), payload]);
                    const message: P2PMessageState = {
                        sequence: this.seqNumber,
                        commandType: CommandType.CMD_PING,
                        channel: Station.CHANNEL,
                        data: data,
                        retries: 0,
                        acknowledged: false,
                    };
                    this.messageStates.set(message.sequence, message);
                    message.retryTimeout = setTimeout(() => {
                        this.resendNotAcknowledgedCommand(message.sequence);
                    }, this.RESEND_NOT_ACKNOWLEDGED_COMMAND);
                    this.seqNumber = this._incrementSequence(this.seqNumber);
                    this.sendMessage(`Send lock wifi gateway v12 command to station`, this.connectAddress!, RequestMessageType.DATA, data);
                    tmpSendQueue.forEach(element => {
                        this.sendQueue.push(element);
                    });
                } else if (this.rawStation.devices !== undefined && this.rawStation.devices !== null && this.rawStation.devices.length !== undefined && this.rawStation.devices.length > 0 && Device.isLockWifiVideo(this.rawStation.devices[0]?.device_type)) {
                    const tmpSendQueue: Array<P2PQueueMessage> = [ ...this.sendQueue ];
                    this.sendQueue = [];
                    const payload = buildVoidCommandPayload(Station.CHANNEL);
                    const data = Buffer.concat([buildCommandHeader(0, CommandType.CMD_GATEWAYINFO), payload.subarray(0, payload.length - 2), buildCommandHeader(0, CommandType.CMD_PING).subarray(2), payload]);
                    const message: P2PMessageState = {
                        sequence: this.seqNumber,
                        commandType: CommandType.CMD_PING,
                        channel: Station.CHANNEL,
                        data: data,
                        retries: 0,
                        acknowledged: false,
                    };
                    this.messageStates.set(message.sequence, message);
                    message.retryTimeout = setTimeout(() => {
                        this.resendNotAcknowledgedCommand(message.sequence);
                    }, this.RESEND_NOT_ACKNOWLEDGED_COMMAND);
                    this.seqNumber = this._incrementSequence(this.seqNumber);
                    this.sendMessage(`Send lock wifi gateway command to station`, this.connectAddress!, RequestMessageType.DATA, data);
                    tmpSendQueue.forEach(element => {
                        this.sendQueue.push(element);
                    });
                } else {
                    const tmpSendQueue: Array<P2PQueueMessage> = [ ...this.sendQueue ];
                    this.sendQueue = [];
                    this.sendCommandWithoutData(CommandType.CMD_GATEWAYINFO, Station.CHANNEL);
                    tmpSendQueue.forEach(element => {
                        this.sendQueue.push(element);
                    });
                }
                this.sendQueuedMessage();
                if (this.energySavingDevice) {
                    this.scheduleP2PKeepalive();
                }
                this.emit("connect", this.connectAddress);
            }
        } else if (hasHeader(msg, ResponseMessageType.PONG)) {
            // Response to a ping from our side
            this.lastPong = new Date().getTime();

            if (msg.length > 4)
                this.lastPongData = msg.subarray(4);
            else
                this.lastPongData = undefined;

            return;
        } else if (hasHeader(msg, ResponseMessageType.PING)) {
            // Response with PONG to keep alive
            this.sendMessage(`Send pong`, { host: rinfo.address, port: rinfo.port }, RequestMessageType.PONG);
            return;
        } else if (hasHeader(msg, ResponseMessageType.END)) {
            // Connection is closed by device
            rootP2PLogger.debug(`Received message - END`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port });
            this.onClose();
            return;
        } else if (hasHeader(msg, ResponseMessageType.ACK)) {
            // Device ACK a message from our side
            // Number of Acks sended in the message

            const dataTypeBuffer = msg.subarray(4, 6);
            const dataType = this.getDataType(dataTypeBuffer);
            const numAcksBuffer = msg.subarray(6, 8);
            const numAcks = numAcksBuffer.readUIntBE(0, numAcksBuffer.length);
            for (let i = 1; i <= numAcks; i++) {
                const idx = 6 + i * 2;
                const seqBuffer = msg.subarray(idx, idx + 2);
                const ackedSeqNo = seqBuffer.readUIntBE(0, seqBuffer.length);
                // -> Message with seqNo was received at the station
                rootP2PLogger.trace(`Received message - ACK ${P2PDataType[dataType]} - sequence ${ackedSeqNo}`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, ackedSeqNo: ackedSeqNo, dataType: P2PDataType[dataType] });
                if (dataType === P2PDataType.DATA) {
                    const msg_state = this.messageStates.get(ackedSeqNo);
                    if (msg_state && !msg_state.acknowledged) {
                        this._clearTimeout(msg_state.retryTimeout);
                        this._clearTimeout(msg_state.timeout);
                        if (msg_state.commandType === CommandType.CMD_PING || msg_state.commandType === CommandType.CMD_GET_DEVICE_PING) {
                            this.messageStates.delete(ackedSeqNo);
                            this.sendQueuedMessage();
                        } else {
                            msg_state.acknowledged = true;
                            msg_state.timeout = setTimeout(() => {
                                //TODO: Retry command in these case?
                                if (msg_state.commandType !== CommandType.CMD_GATEWAYINFO) {
                                    rootP2PLogger.warn(`Result data for command not received`, { stationSN: this.rawStation.station_sn, message: { sequence: msg_state.sequence, commandType: msg_state.commandType, nestedCommandType: msg_state.nestedCommandType, channel: msg_state.channel, acknowledged: msg_state.acknowledged, retries: msg_state.retries, returnCode: msg_state.returnCode, data: msg_state.data } });
                                    this.emit("command", {
                                        command_type: msg_state.nestedCommandType !== undefined ? msg_state.nestedCommandType : msg_state.commandType,
                                        channel: msg_state.channel,
                                        return_code: ErrorCode.ERROR_COMMAND_TIMEOUT,
                                        customData: msg_state.customData
                                    } as CommandResult);
                                } else {
                                    this.p2pSeqMapping.forEach((value: number, key: number, map: Map<number, number>) => {
                                        if (value === ackedSeqNo) {
                                            map.delete(key);
                                        }
                                    })
                                    this.p2pDataSeqNumber--;
                                    rootP2PLogger.debug(`Result data for command CMD_GATEWAYINFO not received`, { stationSN: this.rawStation.station_sn, message: { sequence: msg_state.sequence, commandType: msg_state.commandType, nestedCommandType: msg_state.nestedCommandType, channel: msg_state.channel, acknowledged: msg_state.acknowledged, retries: msg_state.retries, returnCode: msg_state.returnCode, data: msg_state.data } });
                                }
                                this.messageStates.delete(ackedSeqNo);
                                this.sendQueuedMessage();
                            }, msg_state.commandType !== CommandType.CMD_GATEWAYINFO ? this.MAX_COMMAND_RESULT_WAIT : this.MAX_GATEWAY_COMMAND_RESULT_WAIT);
                            this.messageStates.set(ackedSeqNo, msg_state);
                            this.sendQueuedMessage();
                        }
                    }
                } else if (dataType === P2PDataType.VIDEO) {
                    const msg_state = this.messageVideoStates.get(ackedSeqNo);
                    if (msg_state) {
                        this._clearTimeout(msg_state.timeout);
                        this.messageVideoStates.delete(ackedSeqNo);
                    }
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.DATA)) {
            if (this.connected) {
                const seqNo = msg.subarray(6, 8).readUInt16BE();
                const dataTypeBuffer = msg.subarray(4, 6);
                const dataType = this.getDataType(dataTypeBuffer);

                const message: P2PMessage = {
                    bytesToRead: msg.subarray(2, 4).readUInt16BE(),
                    type: dataType,
                    seqNo: seqNo,
                    data: msg.subarray(8)
                };

                this.sendAck({ host: rinfo.address, port: rinfo.port}, dataTypeBuffer, seqNo);
                rootP2PLogger.debug(`Received message - DATA ${P2PDataType[message.type]} - Processing sequence ${message.seqNo}...`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, dataType: P2PDataType[message.type], seqNo: message.seqNo });

                if (message.seqNo === this.expectedSeqNo[dataType]) {
                    // expected seq packet arrived

                    const timeout = this.currentMessageState[dataType].waitForSeqNoTimeout;
                    if (!!timeout) {
                        clearTimeout(timeout);
                        this.currentMessageState[dataType].waitForSeqNoTimeout = undefined;
                    }

                    this.expectedSeqNo[dataType] = this._incrementSequence(this.expectedSeqNo[dataType]);
                    this.parseDataMessage(message);

                    rootP2PLogger.trace(`Received message - DATA ${P2PDataType[message.type]} - Received expected sequence`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, dataType: P2PDataType[message.type], seqNo: message.seqNo, expectedSeqNo: this.expectedSeqNo[dataType], queuedDataSize: this.currentMessageState[dataType].queuedData.size });

                    let queuedMessage = this.currentMessageState[dataType].queuedData.get(this.expectedSeqNo[dataType]);
                    while (queuedMessage) {
                        rootP2PLogger.trace(`Received message - DATA ${P2PDataType[queuedMessage.type]} - Work off queued data`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, dataType: P2PDataType[message.type], seqNo: queuedMessage.seqNo, expectedSeqNo: this.expectedSeqNo[dataType], queuedDataSize: this.currentMessageState[dataType].queuedData.size });
                        this.expectedSeqNo[dataType] = this._incrementSequence(this.expectedSeqNo[dataType]);
                        this.parseDataMessage(queuedMessage);
                        this.currentMessageState[dataType].queuedData.delete(queuedMessage.seqNo);
                        queuedMessage = this.currentMessageState[dataType].queuedData.get(this.expectedSeqNo[dataType]);
                    }

                } else if (this._wasSequenceNumberAlreadyProcessed(this.expectedSeqNo[dataType], message.seqNo)) {
                    // We have already seen this message, skip!
                    // This can happen because the device is sending the message till it gets a ACK
                    // which can take some time.
                    rootP2PLogger.trace(`Received message - DATA ${P2PDataType[message.type]} - Received already processed sequence`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, dataType: P2PDataType[message.type], seqNo: message.seqNo, expectedSeqNo: this.expectedSeqNo[dataType], queuedDataSize: this.currentMessageState[dataType].queuedData.size });
                    return;
                } else {
                    if (!this.currentMessageState[dataType].waitForSeqNoTimeout)
                        this.currentMessageState[dataType].waitForSeqNoTimeout = setTimeout(() => {
                            this.endStream(dataType, true);
                            this.currentMessageState[dataType].waitForSeqNoTimeout = undefined;
                        }, this.MAX_EXPECTED_SEQNO_WAIT);

                    if (!this.currentMessageState[dataType].queuedData.get(message.seqNo)) {
                        this.currentMessageState[dataType].queuedData.set(message.seqNo, message);
                        rootP2PLogger.trace(`Received message - DATA ${P2PDataType[message.type]} - Received not expected sequence, added to the queue for future processing`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, dataType: P2PDataType[message.type], seqNo: message.seqNo, expectedSeqNo: this.expectedSeqNo[dataType], queuedDataSize: this.currentMessageState[dataType].queuedData.size });
                    } else {
                        rootP2PLogger.trace(`Received message - DATA ${P2PDataType[message.type]} - Received not expected sequence, discarded since already present in queue for future processing`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, dataType: P2PDataType[message.type], seqNo: message.seqNo, expectedSeqNo: this.expectedSeqNo[dataType], queuedDataSize: this.currentMessageState[dataType].queuedData.size });
                    }
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.LOOKUP_ADDR2)) {
            if (!this.connected) {
                const port = msg.subarray(6, 8).readUInt16LE();
                const ip = `${msg[11]}.${msg[10]}.${msg[9]}.${msg[8]}`;
                const data = msg.subarray(20, 24);

                this._clearLookupTimeout();
                this._clearLookupRetryTimeout();
                this._clearLookup2RetryTimeout();

                rootP2PLogger.trace(`Received message - LOOKUP_ADDR2 - Got response`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, response: { ip: ip, port: port, data: data.toString("hex") }});
                rootP2PLogger.debug(`Connecting to host ${ip} on port ${port} (CHECK_CAM2)...`, { stationSN: this.rawStation.station_sn, ip: ip, port: port, data: data.toString("hex") });

                for (let i = 0; i < 4; i++)
                    this.sendCamCheck2({ host: ip, port: port }, data);

                this._startConnectTimeout();
                if (this.p2pTurnHandshaking[ip] === undefined) {
                    this.p2pTurnHandshaking[ip] = true;
                    this.sendMessage(`Send TURN_SERVER_INIT`, { host: ip, port: port }, RequestMessageType.TURN_SERVER_INIT);
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.TURN_SERVER_OK)) {
            if (!this.connected && !this.p2pTurnConfirmed) {
                rootP2PLogger.trace(`Received message - TURN_SERVER_OK - Got response`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, response: { message: msg.toString("hex"), length: msg.length }});
                this.sendMessage(`Send TURN_CLIENT_OK`, { host: rinfo.address, port: rinfo.port }, RequestMessageType.TURN_CLIENT_OK);
                this.p2pTurnConfirmed = true;
            }
        } else if (hasHeader(msg, ResponseMessageType.TURN_SERVER_TOKEN)) {
            if (!this.connected) {
                const ip = `${msg[7]}.${msg[6]}.${msg[5]}.${msg[4]}`;
                const port = msg.subarray(8, 10).readUInt16BE();
                const binaryIP = msg.subarray(4, 8);

                rootP2PLogger.debug(`Connecting to host ${ip} on port ${port} (CHECK_CAM2)...`, { stationSN: this.rawStation.station_sn, ip: ip, port: port, binaryIP: binaryIP.toString("hex") });
                for (let i = 0; i < 4; i++)
                    this.sendCamCheck2({ host: rinfo.address, port: port }, binaryIP);

                rootP2PLogger.trace(`Received message - TURN_SERVER_TOKEN - Got response`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, response: { port: port, binaryIP: binaryIP.toString("hex") }});
                this.cloudLookupWithTurnServer({ host: rinfo.address, port: port }, binaryIP);
            }
        } else if (hasHeader(msg, ResponseMessageType.TURN_SERVER_LOOKUP_OK) || hasHeader(msg, ResponseMessageType.UNKNOWN_83) || hasHeader(msg, ResponseMessageType.TURN_SERVER_LIST)) {
            // Do nothing / ignore
        } else if (hasHeader(msg, ResponseMessageType.LOOKUP_RESP)) {
            if (!this.connected) {
                const responseCode = msg.subarray(4, 6).readUInt16LE();

                rootP2PLogger.trace(`Received message - LOOKUP_RESP - Got response`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, response: { responseCode: responseCode }});
            }
        } else {
            rootP2PLogger.debug(`Received unknown message`, { stationSN: this.rawStation.station_sn, remoteAddress: rinfo.address, remotePort: rinfo.port, response: { message: msg.toString("hex"), length: msg.length }});
        }
    }

    private parseDataMessage(message: P2PMessage): void {
        if ((message.type === P2PDataType.BINARY || message.type === P2PDataType.VIDEO) && !this.currentMessageState[message.type].p2pStreaming) {
            rootP2PLogger.trace(`Parsing message - DATA ${P2PDataType[message.type]} - Stream not started ignore this data`, { stationSN: this.rawStation.station_sn, seqNo: message.seqNo, header: this.currentMessageBuilder[message.type].header, bytesRead: this.currentMessageBuilder[message.type].bytesRead, bytesToRead: message.bytesToRead, messageSize: message.data.length });
        } else {
            if (this.currentMessageState[message.type].leftoverData.length > 0) {
                message.data = Buffer.concat([this.currentMessageState[message.type].leftoverData, message.data]);
                this.currentMessageState[message.type].leftoverData = Buffer.from([]);
            }

            let data = message.data;
            let runaway_limit = 0;
            do {
                // is this the first message?
                const firstPartMessage = data.subarray(0, 4).toString() === MAGIC_WORD;

                if (firstPartMessage) {
                    const header: P2PDataHeader = {
                        commandId: 0,
                        bytesToRead: 0,
                        channel: 0,
                        signCode: 0,
                        type: 0
                    };
                    header.commandId = data.subarray(4, 6).readUIntLE(0, 2);
                    header.bytesToRead = data.subarray(6, 10).readUIntLE(0, 4);
                    header.channel = data.subarray(12, 13).readUInt8();
                    header.signCode = data.subarray(13, 14).readUInt8();
                    header.type = data.subarray(14, 15).readUInt8();

                    this.currentMessageBuilder[message.type].header = header;

                    data = data.subarray(this.P2P_DATA_HEADER_BYTES);

                    if (data.length >= header.bytesToRead) {
                        const payload = data.subarray(0, header.bytesToRead);
                        this.currentMessageBuilder[message.type].messages[message.seqNo] = payload;
                        this.currentMessageBuilder[message.type].bytesRead = payload.byteLength;

                        data = data.subarray(header.bytesToRead);
                        if (data.length <= this.P2P_DATA_HEADER_BYTES) {
                            this.currentMessageState[message.type].leftoverData = data;
                            data = Buffer.from([]);
                        }
                    } else {
                        if (data.length <= this.P2P_DATA_HEADER_BYTES) {
                            this.currentMessageState[message.type].leftoverData = data;
                        } else {
                            this.currentMessageBuilder[message.type].messages[message.seqNo] = data;
                            this.currentMessageBuilder[message.type].bytesRead = data.byteLength;
                        }
                        data = Buffer.from([]);
                    }
                } else {
                    // finish message and print
                    if (this.currentMessageBuilder[message.type].header.bytesToRead - this.currentMessageBuilder[message.type].bytesRead <= data.length) {
                        const payload = data.subarray(0, this.currentMessageBuilder[message.type].header.bytesToRead - this.currentMessageBuilder[message.type].bytesRead);
                        this.currentMessageBuilder[message.type].messages[message.seqNo] = payload;
                        this.currentMessageBuilder[message.type].bytesRead += payload.byteLength;

                        data = data.subarray(payload.byteLength);
                        if (data.length <= this.P2P_DATA_HEADER_BYTES) {
                            this.currentMessageState[message.type].leftoverData = data;
                            data = Buffer.from([]);
                        }
                    } else {
                        if (data.length <= this.P2P_DATA_HEADER_BYTES) {
                            this.currentMessageState[message.type].leftoverData = data;
                        } else {
                            this.currentMessageBuilder[message.type].messages[message.seqNo] = data;
                            this.currentMessageBuilder[message.type].bytesRead += data.byteLength;
                        }
                        data = Buffer.from([]);
                    }
                }
                rootP2PLogger.trace(`Parsing message - DATA ${P2PDataType[message.type]} - Received data`, { stationSN: this.rawStation.station_sn, seqNo: message.seqNo, header: this.currentMessageBuilder[message.type].header, bytesRead: this.currentMessageBuilder[message.type].bytesRead, bytesToRead: this.currentMessageBuilder[message.type].header.bytesToRead, firstPartMessage: firstPartMessage, messageSize: message.data.length, runaway_limit: runaway_limit });
                if (this.currentMessageBuilder[message.type].bytesRead === this.currentMessageBuilder[message.type].header.bytesToRead) {
                    const completeMessage = sortP2PMessageParts(this.currentMessageBuilder[message.type].messages);
                    const data_message: P2PDataMessage = {
                        ...this.currentMessageBuilder[message.type].header,
                        seqNo: (message.seqNo + this.offsetDataSeqNumber),
                        dataType: message.type,
                        data: completeMessage
                    }
                    this.handleData(data_message);
                    this.initializeMessageBuilder(message.type);
                    if (data.length > 0 && message.type === P2PDataType.DATA) {
                        rootP2PLogger.debug(`Parsing message - DATA ${P2PDataType[message.type]} - Parsed data`, { stationSN: this.rawStation.station_sn, seqNo: message.seqNo, data_message: data_message,  datalen: data.length, data: data.toString("hex"), offsetDataSeqNumber: this.offsetDataSeqNumber, seqNumber: this.seqNumber, p2pDataSeqNumber: this.p2pDataSeqNumber });
                        this.offsetDataSeqNumber++;
                    }
                }
                runaway_limit++;
            } while ((data.length > 0) && (runaway_limit < this.LOOP_RUNAWAY_LIMIT))
            if (runaway_limit >= this.LOOP_RUNAWAY_LIMIT) {
                rootP2PLogger.warn(`Infinite loop detected (limit >= ${this.LOOP_RUNAWAY_LIMIT}) during parsing of p2p message`, { stationSN: this.rawStation.station_sn, seqNo: message.seqNo, dataType: P2PDataType[message.type], header: this.currentMessageBuilder[message.type].header, bytesRead: this.currentMessageBuilder[message.type].bytesRead, bytesToRead: this.currentMessageBuilder[message.type].header.bytesToRead, message: message.data.toString("hex"), messageSize: message.data.length });
                this.initializeMessageBuilder(message.type);
            }
        }
    }

    private handleData(message: P2PDataMessage): void {
        if (message.dataType === P2PDataType.CONTROL) {
            this.handleDataControl(message);
        } else if (message.dataType === P2PDataType.DATA) {
            const commandStr = CommandType[message.commandId];
            const result_msg = message.type === 1 ? true : false;

            if (result_msg) {
                let return_code = 0;
                let resultData: Buffer|undefined;
                if (message.bytesToRead > 0) {
                    if (message.signCode > 0) {
                        try {
                            message.data = decryptP2PData(message.data, this.p2pKey!);
                        } catch(err) {
                            const error = ensureError(err);
                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Decrypt Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                        }
                    }
                    return_code = message.data.subarray(0, 4).readUInt32LE()|0;
                    resultData = message.data.subarray(4);
                }
                const error_codeStr = ErrorCode[return_code];

                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Received data`, { stationSN: this.rawStation.station_sn, seqNo: message.seqNo, commandIdName: commandStr, commandId: message.commandId, resultCodeName: error_codeStr, resultCode: return_code, resultData: resultData?.toString("hex"), data: message.data.toString("hex"), seqNumber: this.seqNumber, p2pDataSeqNumber: this.p2pDataSeqNumber, offsetDataSeqNumber: this.offsetDataSeqNumber });

                let msg_state = this.messageStates.get(message.seqNo);
                const goodSeqNumber = this.p2pSeqMapping.get(message.seqNo);
                if (goodSeqNumber) {
                    this.p2pSeqMapping.delete(message.seqNo);
                    msg_state = this.messageStates.get(goodSeqNumber);
                    rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - Result data received - Detecting correct sequence number`, { stationSN: this.rawStation.station_sn, commandIdName: commandStr, commandId: message.commandId, seqNumber: message.seqNo, newSeqNumber: goodSeqNumber, p2pSeqMappingCount: this.p2pSeqMapping.size });
                    message.seqNo = goodSeqNumber;
                }
                if (msg_state) {
                    if (msg_state.commandType === message.commandId) {
                        this._clearTimeout(msg_state.timeout);
                        const command_type =  msg_state.nestedCommandType !== undefined ? msg_state.nestedCommandType : msg_state.commandType;
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Result data for command received`, { stationSN: this.rawStation.station_sn, message: { sequence: msg_state.sequence, commandType: msg_state.commandType, nestedCommandType: msg_state.nestedCommandType, channel: msg_state.channel, acknowledged: msg_state.acknowledged, retries: msg_state.retries, returnCode: return_code, data: msg_state.data, customData: msg_state.customData }, resultCodeName: error_codeStr, resultCode: return_code });
                        if (return_code === ErrorCode.ERROR_FAILED_TO_REQUEST) {
                            msg_state.returnCode = return_code;
                            this._sendCommand(msg_state);
                        } else {
                            if (command_type !== CommandType.CMD_GATEWAYINFO) {
                                this.emit("command", {
                                    command_type: command_type,
                                    channel: msg_state.channel,
                                    return_code: return_code,
                                    customData: msg_state.customData
                                } as CommandResult);
                            }
                            this.messageStates.delete(message.seqNo);
                            if (command_type === CommandType.CMD_SMARTSAFE_SETTINGS || command_type === CommandType.CMD_SET_PAYLOAD_LOCKV12 || command_type === CommandType.CMD_TRANSFER_PAYLOAD) {
                                if (msg_state.customData) {
                                    for (const index of Object.keys(this.customDataStaging)) {
                                        const id = Number.parseInt(index);
                                        if (new Date().getTime() - this.customDataStaging[id].timestamp > 2 * 60 * 1000) {
                                            delete this.customDataStaging[id];
                                        }
                                    }
                                    this.customDataStaging[msg_state.nestedCommandType2 ? msg_state.nestedCommandType2 : msg_state.nestedCommandType ? msg_state.nestedCommandType : msg_state.commandType] = {
                                        channel: msg_state.channel,
                                        customData: msg_state.customData,
                                        timestamp: new Date().getTime(),
                                    };
                                }
                                this.secondaryCommandTimeout = setTimeout(() => {
                                    rootP2PLogger.warn(`Handle DATA ${P2PDataType[message.dataType]} - Result data for secondary command not received`, { stationSN: this.rawStation.station_sn, message: { sequence: msg_state!.sequence, commandType: msg_state!.commandType, nestedCommandType: msg_state!.nestedCommandType, channel: msg_state!.channel, acknowledged: msg_state!.acknowledged, retries: msg_state!.retries, returnCode: msg_state!.returnCode, data: msg_state!.data, customData: msg_state!.customData } });
                                    this.secondaryCommandTimeout = undefined;
                                    this.emit("secondary command", {
                                        command_type: msg_state!.nestedCommandType !== undefined ? msg_state!.nestedCommandType : msg_state!.commandType,
                                        channel: msg_state!.channel,
                                        return_code: ErrorCode.ERROR_COMMAND_TIMEOUT,
                                        customData: msg_state!.customData
                                    } as CommandResult);
                                    this._clearESDDisconnectTimeout();
                                    this.sendQueuedMessage();
                                }, this.MAX_COMMAND_RESULT_WAIT);
                            } else {
                                this._clearESDDisconnectTimeout();
                                this.sendQueuedMessage();
                            }

                            if (msg_state.commandType === CommandType.CMD_START_REALTIME_MEDIA ||
                                (msg_state.nestedCommandType === CommandType.CMD_START_REALTIME_MEDIA && msg_state.commandType === CommandType.CMD_SET_PAYLOAD) ||
                                msg_state.commandType === CommandType.CMD_RECORD_VIEW ||
                                (msg_state.nestedCommandType === ParamType.COMMAND_START_LIVESTREAM && msg_state.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD)
                            ) {
                                this.waitForStreamData(P2PDataType.VIDEO, true);
                            } else if (msg_state.commandType === CommandType.CMD_DOWNLOAD_VIDEO) {
                                this.waitForStreamData(P2PDataType.BINARY, true);
                            } else if (msg_state.commandType === CommandType.CMD_START_TALKBACK || (msg_state.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD && msg_state.nestedCommandType === IndoorSoloSmartdropCommandType.CMD_START_SPEAK)) {
                                if (return_code === ErrorCode.ERROR_PPCS_SUCCESSFUL) {
                                    this.startTalkback(msg_state.channel);
                                } else if (return_code === ErrorCode.ERROR_NOT_FIND_DEV) {
                                    this.emit("talkback error", msg_state.channel, new TalkbackError("Someone is responding now.", { context: { station: this.rawStation.station_sn, channel: msg_state.channel } }));
                                } else if (return_code === ErrorCode.ERROR_DEV_BUSY) {
                                    this.emit("talkback error", msg_state.channel, new TalkbackError("Wait a second, device is busy.", { context: { station: this.rawStation.station_sn, channel: msg_state.channel } }));
                                } else {
                                    this.emit("talkback error", msg_state.channel, new TalkbackError("Connect failed please try again later.", { context: { station: this.rawStation.station_sn, channel: msg_state.channel } }));
                                }
                            } else if (msg_state.commandType === CommandType.CMD_STOP_TALKBACK || (msg_state.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD && msg_state.nestedCommandType === IndoorSoloSmartdropCommandType.CMD_END_SPEAK)) {
                                this.stopTalkback(msg_state.channel);
                            } else if (msg_state.commandType === CommandType.CMD_SDINFO_EX && resultData && resultData.length >= 8) {
                                const totalCapacity = resultData.subarray(0, 4).readUInt32LE();
                                const availableCapacity = resultData.subarray(4, 8).readUInt32LE();
                                if (return_code >= -1) {
                                    this.emit("sd info ex", return_code, totalCapacity, availableCapacity);
                                }
                            }
                        }
                    } else {
                        this.messageStates.delete(message.seqNo);
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Expected different command type for received sequencenumber!`, { stationSN: this.rawStation.station_sn, msg_sequence: msg_state.sequence, msg_channel: msg_state.channel, msg_commandType: msg_state.commandType, seqNumber: this.seqNumber, p2pDataSeqNumber: this.p2pDataSeqNumber, offsetDataSeqNumber: this.offsetDataSeqNumber, message: { seqNo: message.seqNo, commandType: CommandType[message.commandId], channel: message.channel, signCode: message.signCode, data: message.data.toString("hex") } });
                        rootP2PLogger.warn(`P2P protocol instability detected for station ${this.rawStation.station_sn}. Please reinitialise the connection to solve the problem!`);
                    }
                } else if (message.commandId !== CommandType.CMD_PING && message.commandId !== CommandType.CMD_GET_DEVICE_PING && message.commandId !== CommandType.CMD_GATEWAYINFO) {
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Received unexpected data!`, { stationSN: this.rawStation.station_sn, seqNumber: this.seqNumber, p2pDataSeqNumber: this.p2pDataSeqNumber, offsetDataSeqNumber: this.offsetDataSeqNumber, message: { seqNo: message.seqNo, commandType: CommandType[message.commandId], channel: message.channel, signCode: message.signCode, data: message.data.toString("hex") } });
                }
            } else {
                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Unsupported response`, { stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, commandType: message.commandId, channel: message.channel, signCode: message.signCode, data: message.data.toString("hex") } });
            }
        } else if (message.dataType === P2PDataType.VIDEO || message.dataType === P2PDataType.BINARY) {
            this.handleDataBinaryAndVideo(message);
        } else {
            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Not implemented data type`, { stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, commandType: message.commandId, channel: message.channel, signCode: message.signCode, data: message.data.toString("hex") } });
        }
    }

    private isIFrame(data: Buffer, isKeyFrame: boolean): boolean {
        if (this.rawStation.station_sn.startsWith("T8410") || this.rawStation.station_sn.startsWith("T8400") || this.rawStation.station_sn.startsWith("T8401") || this.rawStation.station_sn.startsWith("T8411") ||
            this.rawStation.station_sn.startsWith("T8202") || this.rawStation.station_sn.startsWith("T8422") || this.rawStation.station_sn.startsWith("T8424") || this.rawStation.station_sn.startsWith("T8423") ||
            this.rawStation.station_sn.startsWith("T8130") || this.rawStation.station_sn.startsWith("T8131") || this.rawStation.station_sn.startsWith("T8420") || this.rawStation.station_sn.startsWith("T8440") ||
            this.rawStation.station_sn.startsWith("T8171") || this.rawStation.station_sn.startsWith("T8426") ||
            this.rawStation.station_sn.startsWith("T8441") || this.rawStation.station_sn.startsWith("T8442") || checkT8420(this.rawStation.station_sn)) {
            //TODO: Need to add battery doorbells as seen in source => T8210,T8220,T8221,T8222
            return isKeyFrame;
        }
        const iframe = isIFrame(data);
        if (iframe === false) {
            // Fallback
            return isKeyFrame;
        }
        return iframe;
    }

    private waitForStreamData(dataType: P2PDataType, sendStopCommand = false): void {
        if (this.currentMessageState[dataType].p2pStreamingTimeout) {
            clearTimeout(this.currentMessageState[dataType].p2pStreamingTimeout!);
        }
        this.currentMessageState[dataType].p2pStreamingTimeout = setTimeout(() => {
            rootP2PLogger.info(`Stopping the station stream for the device ${this.deviceSNs[this.currentMessageState[dataType].p2pStreamChannel]?.sn}, because we haven't received any data for ${this.MAX_STREAM_DATA_WAIT / 1000} seconds`);
            this.endStream(dataType, sendStopCommand);
        }, this.MAX_STREAM_DATA_WAIT);
    }

    private handleDataBinaryAndVideo(message: P2PDataMessage): void {
        if (!this.currentMessageState[message.dataType].invalidStream) {
            switch(message.commandId) {
                case CommandType.CMD_VIDEO_FRAME:
                    this.waitForStreamData(message.dataType, true);

                    const videoMetaData: P2PDataMessageVideo = {
                        streamType: 0,
                        videoSeqNo: 0,
                        videoFPS: 15,
                        videoWidth: 1920,
                        videoHeight: 1080,
                        videoTimestamp: 0,
                        videoDataLength: 0,
                        aesKey: ""
                    };
                    const data_length = message.data.readUInt32LE();
                    const isKeyFrame = message.data.subarray(4, 5).readUInt8() === 1 ? true : false;

                    videoMetaData.videoDataLength = message.data.subarray(0, 4).readUInt32LE();
                    videoMetaData.streamType = message.data.subarray(5, 6).readUInt8();
                    videoMetaData.videoSeqNo = message.data.subarray(6, 8).readUInt16LE();
                    videoMetaData.videoFPS = message.data.subarray(8, 10).readUInt16LE();
                    videoMetaData.videoWidth = message.data.subarray(10, 12).readUInt16LE();
                    videoMetaData.videoHeight = message.data.subarray(12, 14).readUInt16LE();
                    videoMetaData.videoTimestamp = message.data.subarray(14, 20).readUIntLE(0, 6);

                    let payloadStart = 22;
                    if (message.signCode > 0 && data_length >= 128) {
                        const key = message.data.subarray(22, 150);
                        const rsaKey = this.currentMessageState[message.dataType].rsaKey;
                        if (rsaKey) {
                            try {
                                videoMetaData.aesKey = rsaKey.decrypt(key).toString("hex");
                                rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - Decrypted AES key`, { stationSN: this.rawStation.station_sn, key: videoMetaData.aesKey });
                            } catch (err) {
                                const error = ensureError(err);
                                rootP2PLogger.warn(`Error: AES key could not be decrypted! The entire stream is discarded.`, { error: getError(error), stationSN: this.rawStation.station_sn, key: key.toString("hex") });
                                this.currentMessageState[message.dataType].invalidStream = true;
                                this.emit("livestream error", message.channel, new LivestreamError("Station AES key could not be decrypted! The entire stream is discarded.", { context: { station: this.rawStation.station_sn } }));
                                return;
                            }
                        } else {
                            rootP2PLogger.warn(`Private RSA key is missing! Stream could not be decrypted. The entire stream for station ${this.rawStation.station_sn} is discarded.`);
                            this.currentMessageState[message.dataType].invalidStream = true;
                            this.emit("livestream error", message.channel, new LivestreamError("Station Private RSA key is missing! Stream could not be decrypted. The entire stream is discarded.", { context: { station: this.rawStation.station_sn } }));
                            return;
                        }
                        payloadStart = 151;
                    }

                    let video_data: Buffer;
                    if (videoMetaData.aesKey !== "") {
                        const encrypted_data = message.data.subarray(payloadStart, payloadStart + 128);
                        const unencrypted_data = message.data.subarray(payloadStart + 128, payloadStart + videoMetaData.videoDataLength);
                        video_data = Buffer.concat([decryptAESData(videoMetaData.aesKey, encrypted_data), unencrypted_data]);
                    } else {
                        video_data = message.data.subarray(payloadStart, payloadStart + videoMetaData.videoDataLength);
                    }

                    rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME`, { stationSN: this.rawStation.station_sn, dataSize: message.data.length, metadata: videoMetaData, videoDataSize: video_data.length });

                    this.currentMessageState[message.dataType].p2pStreamMetadata.videoFPS = videoMetaData.videoFPS;
                    this.currentMessageState[message.dataType].p2pStreamMetadata.videoHeight = videoMetaData.videoHeight;
                    this.currentMessageState[message.dataType].p2pStreamMetadata.videoWidth = videoMetaData.videoWidth;

                    if (!this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived) {
                        if (this.rawStation.station_sn.startsWith("T8410") || this.rawStation.station_sn.startsWith("T8400") || this.rawStation.station_sn.startsWith("T8401") || this.rawStation.station_sn.startsWith("T8411") ||
                            this.rawStation.station_sn.startsWith("T8202") || this.rawStation.station_sn.startsWith("T8422") || this.rawStation.station_sn.startsWith("T8424") || this.rawStation.station_sn.startsWith("T8423") ||
                            this.rawStation.station_sn.startsWith("T8130") || this.rawStation.station_sn.startsWith("T8131") || this.rawStation.station_sn.startsWith("T8420") || this.rawStation.station_sn.startsWith("T8440") ||
                            this.rawStation.station_sn.startsWith("T8171") || this.rawStation.station_sn.startsWith("T8426") ||
                            this.rawStation.station_sn.startsWith("T8441") || this.rawStation.station_sn.startsWith("T8442") || checkT8420(this.rawStation.station_sn)) {
                            this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec = videoMetaData.streamType === 1 ? VideoCodec.H264 : videoMetaData.streamType === 2 ? VideoCodec.H265 : getVideoCodec(video_data);
                            rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME - Video codec information received from packet`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                        } else if (this.isIFrame(video_data, isKeyFrame)) {
                            this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec = getVideoCodec(video_data);
                            rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME - Video codec extracted from video data`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                        } else {
                            this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec = getVideoCodec(video_data);
                            if (this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec === VideoCodec.UNKNOWN) {
                                this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec = videoMetaData.streamType === 1 ? VideoCodec.H264 : videoMetaData.streamType === 2 ? VideoCodec.H265 : VideoCodec.UNKNOWN;
                                if (this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec === VideoCodec.UNKNOWN) {
                                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME - Unknown video codec`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                                } else {
                                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME - Fallback, using video codec information received from packet`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                                }
                            } else {
                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME - Fallback, video codec extracted from video data`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                            }
                        }
                        this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived = true;
                        if (!this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived) {
                            this.currentMessageState[message.dataType].waitForAudioData = setTimeout(() => {
                                this.currentMessageState[message.dataType].waitForAudioData = undefined;
                                this.currentMessageState[message.dataType].p2pStreamMetadata.audioCodec = AudioCodec.NONE;
                                this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived = true;
                                if (this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived && this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived && this.currentMessageState[message.dataType].p2pStreamNotStarted) {
                                    this.emitStreamStartEvent(message.dataType);
                                }
                            }, this.AUDIO_CODEC_ANALYZE_TIMEOUT);
                        }
                    }
                    if (this.currentMessageState[message.dataType].p2pStreamNotStarted) {
                        if (this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived && this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived) {
                            this.emitStreamStartEvent(message.dataType);
                        }
                    }

                    if (message.dataType === P2PDataType.VIDEO) {
                        if (findStartCode(video_data)) {
                            rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME: startcode found`, { stationSN: this.rawStation.station_sn, isKeyFrame: isKeyFrame, preFrameVideoDataLength: this.currentMessageState[message.dataType].preFrameVideoData.length });
                            if (!this.currentMessageState[message.dataType].receivedFirstIFrame)
                                this.currentMessageState[message.dataType].receivedFirstIFrame = this.isIFrame(video_data, isKeyFrame);

                            if (this.currentMessageState[message.dataType].receivedFirstIFrame) {
                                if (this.currentMessageState[message.dataType].preFrameVideoData.length > this.MAX_VIDEO_PACKET_BYTES)
                                    this.currentMessageState[message.dataType].preFrameVideoData = Buffer.from([]);

                                if (this.currentMessageState[message.dataType].preFrameVideoData.length > 0) {
                                    this.currentMessageState[message.dataType].videoStream?.push(this.currentMessageState[message.dataType].preFrameVideoData);
                                }
                                this.currentMessageState[message.dataType].preFrameVideoData = Buffer.from(video_data);
                            } else {
                                rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME: Skipping because first frame is not an I frame.`, { stationSN: this.rawStation.station_sn });
                            }
                        } else {
                            rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - CMD_VIDEO_FRAME: No startcode found`, { stationSN: this.rawStation.station_sn, isKeyFrame: isKeyFrame, preFrameVideoDataLength: this.currentMessageState[message.dataType].preFrameVideoData.length });
                            if (this.currentMessageState[message.dataType].preFrameVideoData.length > 0) {
                                this.currentMessageState[message.dataType].preFrameVideoData = Buffer.concat([this.currentMessageState[message.dataType].preFrameVideoData, video_data]);
                            }
                        }
                    } else if (message.dataType === P2PDataType.BINARY) {
                        this.currentMessageState[message.dataType].videoStream?.push(video_data);
                    }
                    break;
                case CommandType.CMD_AUDIO_FRAME:
                    this.waitForStreamData(message.dataType, true);

                    const audioMetaData: P2PDataMessageAudio = {
                        audioType: AudioCodec.NONE,
                        audioSeqNo: 0,
                        audioTimestamp: 0,
                        audioDataLength: 0
                    };

                    audioMetaData.audioDataLength = message.data.subarray(0, 4).readUInt32LE();
                    audioMetaData.audioType = message.data.subarray(5, 6).readUInt8();
                    audioMetaData.audioSeqNo = message.data.subarray(6, 8).readUInt16LE();
                    audioMetaData.audioTimestamp = message.data.subarray(8, 14).readUIntLE(0, 6);

                    const audio_data = Buffer.from(message.data.subarray(16));
                    rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - CMD_AUDIO_FRAME`, { stationSN: this.rawStation.station_sn, dataSize: message.data.length, metadata: audioMetaData, audioDataSize: audio_data.length });

                    if (this.currentMessageState[message.dataType].waitForAudioData !== undefined) {
                        clearTimeout(this.currentMessageState[message.dataType].waitForAudioData!);
                    }
                    if (!this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived) {
                        this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived = true;
                        this.currentMessageState[message.dataType].p2pStreamMetadata.audioCodec = audioMetaData.audioType === 0 ? AudioCodec.AAC : audioMetaData.audioType === 1 ? AudioCodec.AAC_LC : audioMetaData.audioType === 7 ? AudioCodec.AAC_ELD : AudioCodec.UNKNOWN;
                    }
                    if (this.currentMessageState[message.dataType].p2pStreamNotStarted) {
                        if (this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived && this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived) {
                            this.emitStreamStartEvent(message.dataType);
                        }
                    }

                    this.currentMessageState[message.dataType].audioStream?.push(audio_data);
                    break;
                default:
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Not implemented message`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: message.data.toString("hex") });
                    break;
            }
        } else {
            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Invalid stream data, dropping complete stream`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: message.data.toString("hex") });
        }
    }

    private handleDataControl(message: P2PDataMessage): void {
        try {
            let data: Buffer = message.data;
            if (message.signCode > 0) {
                //data = decryptP2PData(message.data, this.p2pKey!);
                try {
                    data = decryptP2PData(message.data, Buffer.from(getP2PCommandEncryptionKey(this.rawStation.station_sn, this.rawStation.p2p_did)));
                } catch(err) {
                    const error = ensureError(err);
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Decrypt Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                }
            }
            rootP2PLogger.trace(`Handle DATA ${P2PDataType[message.dataType]} - Received data`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, data: message.data.toString("hex"), seqNumber: this.seqNumber, p2pDataSeqNumber: this.p2pDataSeqNumber, offsetDataSeqNumber: this.offsetDataSeqNumber });
            switch(message.commandId) {
                case CommandType.CMD_GET_ALARM_MODE:
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Alarm mode changed to: ${AlarmMode[data.readUIntBE(0, 1)]}`, { stationSN: this.rawStation.station_sn,  });
                    this.emit("alarm mode", data.readUIntBE(0, 1) as AlarmMode);
                    break;
                case CommandType.CMD_CAMERA_INFO:
                    try {
                        const cameraData = getNullTerminatedString(data, "utf8");
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Camera info`, { stationSN: this.rawStation.station_sn, cameraInfo: cameraData });
                        this.emit("camera info", parseJSON(cameraData, rootP2PLogger) as CmdCameraInfoResponse);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - Camera info - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_CONVERT_MP4_OK:
                    const totalBytes = data.subarray(1).readUInt32LE();
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_CONVERT_MP4_OK`, { stationSN: this.rawStation.station_sn, channel: message.channel, totalBytes: totalBytes });
                    this.downloadTotalBytes = totalBytes;
                    this.currentMessageState[P2PDataType.BINARY].p2pStreaming = true;
                    this.currentMessageState[P2PDataType.BINARY].p2pStreamChannel = message.channel;
                    break;
                case CommandType.CMD_WIFI_CONFIG:
                    const rssi = data.readInt32LE();
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_WIFI_CONFIG`, { stationSN: this.rawStation.station_sn, channel: message.channel, rssi: rssi });
                    this.emit("wifi rssi", message.channel, rssi);
                    break;
                case CommandType.CMD_DOWNLOAD_FINISH:
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DOWNLOAD_FINISH`, { stationSN: this.rawStation.station_sn, channel: message.channel });
                    this.endStream(P2PDataType.BINARY);
                    break;
                case CommandType.CMD_DOORBELL_NOTIFY_PAYLOAD:
                    try {
                        const str = getNullTerminatedString(data, "utf8");
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DOORBELL_NOTIFY_PAYLOAD`, { stationSN: this.rawStation.station_sn, payload: str });
                        //TODO: Finish implementation, emit an event...
                        //VDBStreamInfo (1005) and VoltageEvent (1015)
                        //this.emit("", parseJSON(str, this.log) as xy);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DOORBELL_NOTIFY_PAYLOAD - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_NAS_SWITCH:
                    try {
                        const str = getNullTerminatedString(data, "utf8");
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NAS_SWITCH`, { stationSN: this.rawStation.station_sn, payload: str });
                        this.emit("rtsp url", message.channel, str);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NAS_SWITCH - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.SUB1G_REP_UNPLUG_POWER_LINE:
                    try {
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - SUB1G_REP_UNPLUG_POWER_LINE`, { stationSN: this.rawStation.station_sn, payload: data.toString() });
                        const chargeType = data.subarray(0, 4).readUInt32LE();
                        const batteryLevel = data.subarray(4, 8).readUInt32LE();
                        this.emit("charging state", message.channel, chargeType, batteryLevel);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - SUB1G_REP_UNPLUG_POWER_LINE - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.SUB1G_REP_RUNTIME_STATE:
                    try {
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - SUB1G_REP_RUNTIME_STATE`, { stationSN: this.rawStation.station_sn, payload: data.toString() });
                        const batteryLevel = data.subarray(0, 4).readUInt32LE();
                        const temperature = data.subarray(4, 8).readUInt32LE();
                        this.emit("runtime state", message.channel, batteryLevel, temperature);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - SUB1G_REP_RUNTIME_STATE - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH:
                    try {
                        const enabled = data.readUIntBE(0, 1) === 1 ? true : false;
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_SET_FLOODLIGHT_MANUAL_SWITCH`, { stationSN: this.rawStation.station_sn, enabled: enabled, payload: data.toString() });
                        this.emit("floodlight manual switch", message.channel, enabled);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_SET_FLOODLIGHT_MANUAL_SWITCH - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_GET_DEVICE_PING:
                    try {
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GET_DEVICE_PING`, { stationSN: this.rawStation.station_sn, payload: data.toString() });
                        this.sendCommandDevicePing(message.channel);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GET_DEVICE_PING - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_NOTIFY_PAYLOAD:
                    try {
                        rootP2PLogger.debug(`Station Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD`, { stationSN: this.rawStation.station_sn, payload: data.toString() });
                        const json: CmdNotifyPayload = parseJSON(getNullTerminatedString(data, "utf8"), rootP2PLogger) as CmdNotifyPayload;
                        if (json !== undefined) {
                            if (Device.isLockWifi(this.rawStation.device_type, this.rawStation.station_sn)) {
                                //TODO: Implement notification payload or T8520
                                if (json.cmd === CommandType.P2P_ADD_PW || json.cmd === CommandType.P2P_QUERY_PW || json.cmd === CommandType.P2P_GET_LOCK_PARAM || json.cmd === CommandType.P2P_GET_USER_AND_PW_ID) {
                                    // encrypted data
                                    //TODO: Handle decryption of encrypted Data (AES) - For decryption use the cached aeskey used for sending the command!
                                    const aesKey = this.getLockAESKey(json.cmd);
                                    if (aesKey !== undefined) {
                                        const decryptedPayload = decryptPayloadData(Buffer.from(json.payload as string, "base64"), Buffer.from(aesKey, "hex"), Buffer.from(getLockVectorBytes(this.rawStation.station_sn), "hex")).toString()
                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Lock - Received`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, decryptedPayload: decryptedPayload, aesKey: aesKey });
                                        switch (json.cmd) {
                                            case CommandType.P2P_ADD_PW:
                                                // decryptedPayload: {"code":0,"passwordId":"002C"}
                                                break;
                                        }
                                    }
                                } else if (json.cmd === CommandType.P2P_QUERY_STATUS_IN_LOCK) {
                                    // Example: {"code":0,"slBattery":"82","slState":"4","trigger":2}
                                    const payload: ESLAdvancedLockStatusNotification = json.payload as ESLAdvancedLockStatusNotification;
                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_QUERY_BATTERY_LEVEL, payload.slBattery);
                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_QUERY_STATUS, payload.slState);
                                } else {
                                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD - Not implemented`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, message: data.toString() });
                                }
                            } else if (json.cmd === CommandType.P2P_QUERY_STATUS_IN_LOCK) {
                                // Example: {"code":0,"slBattery":"99","slState":"4","slOpenDirection":"1","trigger":2}
                                const payload: ESLAdvancedLockStatusNotificationT8530 = json.payload as ESLAdvancedLockStatusNotificationT8530;
                                this.emit("parameter", message.channel, CommandType.CMD_GET_BATTERY, payload.slBattery);
                                this.emit("parameter", message.channel, CommandType.CMD_DOORLOCK_GET_STATE, payload.slState);
                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_NIGHT_VISION_SIDE, payload.slOpenDirection);
                            } else if (json.cmd === CommandType.CMD_DOORLOCK_P2P_SEQ) {
                                if (Device.isLockWifi(this.rawStation.devices[0]?.device_type, this.rawStation.devices[0]?.device_sn) || Device.isLockWifiNoFinger(this.rawStation.devices[0]?.device_type)) {
                                    const payload: ESLStationP2PThroughData = json.payload as ESLStationP2PThroughData;
                                    if (payload.seq_num !== undefined) {
                                        this.lockSeqNumber = payload.seq_num;
                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD - Lock sequence number`, { stationSN: this.rawStation.station_sn, lockSeqNumber: this.lockSeqNumber, payload: payload });
                                    }
                                    if (payload.lock_cmd > 0) {
                                        this.emit("sequence error", message.channel, payload.lock_cmd, payload.seq_num!, payload.stationSn!);
                                    }
                                } else {
                                    const payload: SmartLockP2PSequenceData = json.payload as SmartLockP2PSequenceData;
                                    if (payload.seq_num !== undefined) {
                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD - Lock sequence number`, { stationSN: this.rawStation.station_sn, oldSequenceNumber: this.lockSeqNumber, newSequenceNumber: this.lockSeqNumber + 1, payload: payload });
                                        this.lockSeqNumber = payload.seq_num + 1;
                                    }
                                    if (payload.lock_cmd > 0) {
                                        if (Device.isLockWifiR10(this.rawStation.devices[0]?.device_type) || Device.isLockWifiR20(this.rawStation.devices[0]?.device_type)) {
                                            this.emit("sequence error", message.channel, ESLCommand[ESLBleCommand[payload.lock_cmd] as unknown as number] as unknown as number, payload.seq_num, payload.dev_sn);
                                        } else if (Device.isLockWifiT8506(this.rawStation.devices[0]?.device_type) || Device.isLockWifiT8502(this.rawStation.devices[0]?.device_type) || Device.isLockWifiT8510P(this.rawStation.devices[0]?.device_type, this.rawStation.devices[0]?.device_sn) || Device.isLockWifiT8520P(this.rawStation.devices[0]?.device_type, this.rawStation.devices[0]?.device_sn)) {
                                            this.emit("sequence error", message.channel, SmartLockCommand[payload.bus_type! == SmartLockFunctionType.TYPE_2 ? SmartLockBleCommandFunctionType2[payload.lock_cmd] as unknown as number : SmartLockBleCommandFunctionType1[payload.lock_cmd] as unknown as number] as unknown as number, payload.seq_num, payload.dev_sn);
                                        } else {
                                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD - Lock sequence number - Unknwon device`, { stationSN: this.rawStation.station_sn, oldSequenceNumber: this.lockSeqNumber, newSequenceNumber: this.lockSeqNumber + 1, payload: payload });
                                        }
                                    }
                                }
                            } else if (json.cmd === CommandType.CMD_DOORLOCK_DATA_PASS_THROUGH) {
                                const payload: ESLStationP2PThroughData = json.payload as ESLStationP2PThroughData;
                                if (this.deviceSNs[message.channel] !== undefined) {
                                    if (payload.lock_payload !== undefined) {
                                        const decoded = decodeBase64(decodeLockPayload(Buffer.from(payload.lock_payload)));
                                        const key = generateBasicLockAESKey(this.deviceSNs[message.channel].adminUserId, this.rawStation.station_sn);
                                        const iv = getLockVectorBytes(this.rawStation.station_sn);

                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DOORLOCK_DATA_PASS_THROUGH`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, key: key, iv: iv, decoded: decoded.toString("hex") });

                                        payload.lock_payload = decryptLockAESData(key, iv, decoded).toString("hex");

                                        switch (payload.lock_cmd) {
                                            case ESLBleCommand.NOTIFY:
                                                const notifyBuffer = Buffer.from(payload.lock_payload, "hex");
                                                this.emit("parameter", message.channel, CommandType.CMD_GET_BATTERY, notifyBuffer.subarray(3, 4).readInt8().toString());
                                                this.emit("parameter", message.channel, CommandType.CMD_DOORLOCK_GET_STATE, notifyBuffer.subarray(6, 7).readInt8().toString());
                                                break;
                                            default:
                                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DOORLOCK_DATA_PASS_THROUGH - Not implemented`, { stationSN: this.rawStation.station_sn, message: data.toString() });
                                                break;
                                        }
                                    }
                                }
                            } else if (json.cmd === CommandType.CMD_SET_PAYLOAD_LOCKV12) {
                                const payload: ESLBleV12P2PThroughData = json.payload as ESLBleV12P2PThroughData;
                                if (payload.lock_payload !== undefined) {
                                    const fac = BleCommandFactory.parseLockV12(payload.lock_payload);
                                    if (fac.getCommandCode() !== ESLBleCommand.NOTIFY) {
                                        const aesKey = this.getLockAESKey(fac.getCommandCode()!);
                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Lock V12 - Received`, { stationSN: this.rawStation.station_sn, fac: fac.toString(), aesKey: aesKey });
                                        let data = fac.getData()!;
                                        try {
                                            if (aesKey !== undefined) {
                                                data = decryptPayloadData(data,  Buffer.from(aesKey, "hex"), Buffer.from(getLockVectorBytes(this.rawStation.station_sn), "hex"))
                                            }
                                            const returnCode = data.readInt8(0);
                                            const commandType = Number.parseInt(ESLCommand[ESLBleCommand[fac.getCommandCode()!] as unknown as number]);
                                            const customData = {
                                                ...this.customDataStaging[commandType]
                                            };
                                            if (this.customDataStaging[commandType]) {
                                                const result: CommandResult = {
                                                    channel: customData.channel,
                                                    command_type: commandType,
                                                    return_code: returnCode,
                                                    customData: customData.customData
                                                };
                                                this.emit("secondary command", result);
                                                delete this.customDataStaging[commandType];
                                            }
                                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Lock V12 return code: ${returnCode}`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, decoded: data.toString("hex"), bleCommandCode: ESLBleCommand[fac.getCommandCode()!], returnCode: returnCode, channel: customData?.channel, customData: customData?.customData });
                                            const parsePayload = new ParsePayload(data.subarray(1));
                                            switch (fac.getCommandCode()) {
                                                case ESLBleCommand.QUERY_STATUS_IN_LOCK:
                                                case ESLBleCommand.NOTIFY:
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_QUERY_BATTERY_LEVEL, parsePayload.readInt8(BleParameterIndex.ONE).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_QUERY_STATUS, parsePayload.readInt8(BleParameterIndex.TWO).toString());
                                                    break;
                                                case ESLBleCommand.GET_LOCK_PARAM:
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_LOCK_SOUND, parsePayload.readInt8(BleParameterIndex.ONE).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK, parsePayload.readInt8(BleParameterIndex.TWO).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK_TIMER, parsePayload.readUint16LE(BleParameterIndex.THREE).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE, parsePayload.readInt8(BleParameterIndex.FOUR).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_STARTTIME, parsePayload.readStringHex(BleParameterIndex.FIVE));
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_ENDTIME, parsePayload.readStringHex(BleParameterIndex.SIX));
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_ONE_TOUCH_LOCK, parsePayload.readInt8(BleParameterIndex.SEVEN).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_WRONG_TRY_PROTECT, parsePayload.readInt8(BleParameterIndex.EIGHT).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_WRONG_TRY_LOCKDOWN, parsePayload.readUint16LE(BleParameterIndex.NINE).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_WRONG_TRY_ATTEMPTS, parsePayload.readInt8(BleParameterIndex.TEN).toString());
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_SCRAMBLE_PASSCODE, parsePayload.readInt8(BleParameterIndex.ELEVEN).toString());
                                                    //this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_LOG, parsePayload.readInt8(BleParameterIndex.TWELVE).toString());
                                                    //this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_WIFI_STATUS, parsePayload.readInt8(BleParameterIndex.THIRTEEN).toString());
                                                    break;
                                                case ESLBleCommand.ADD_PW:
                                                    if (customData && customData.customData && customData.customData.command && customData.customData.command.name === CommandName.DeviceAddUser) {
                                                        this.api.updateUserPassword(customData.customData.command.value?.deviceSN, customData.customData.command.value?.shortUserId, parsePayload.readStringHex(BleParameterIndex.ONE), customData.customData.command.value?.schedule);
                                                    }
                                                    break;
                                                default:
                                                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock - Not implemented`, { stationSN: this.rawStation.station_sn, fac: fac.toString(), returnCode: returnCode, channel: customData?.channel, customData: customData?.customData });
                                                    break;
                                            }
                                        } catch (err) {
                                            const error = ensureError(err);
                                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Lock V12 unable to decrypt (maybe event from other lock connection)`, { error: getError(error), stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, payload: payload });
                                        }
                                        this._clearSecondaryCommandTimeout();
                                        this.sendQueuedMessage();
                                    } else {
                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Lock V12 - Received notify`, { stationSN: this.rawStation.station_sn, fac: fac.toString() });
                                    }
                                } else {
                                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Lock V12 - Unexpected response`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, message: data.toString() });
                                }
                            } else if (json.cmd === CommandType.CMD_TRANSFER_PAYLOAD) {
                                const payload: SmartLockP2PThroughData = json.payload as SmartLockP2PThroughData;
                                if (payload.lock_payload !== undefined) {
                                    try {
                                        const fac = BleCommandFactory.parseSmartLock(payload.lock_payload);
                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock - Received`, { stationSN: this.rawStation.station_sn, fac: fac.toString() });
                                        if (!fac.isPartial()) {
                                            let data = fac.getData();
                                            if (data) {
                                                if (fac.isEncrypted()) {
                                                    const aesKey = generateSmartLockAESKey(this.rawStation.member.admin_user_id, Number.parseInt(payload.time, 16));
                                                    const iv = getLockVectorBytes(payload.dev_sn);
                                                    if (aesKey !== undefined) {
                                                        data = decryptPayloadData(data, aesKey, Buffer.from(iv, "hex"));
                                                    }
                                                }
                                                if (data.length > 0 && fac.getDataType() !== undefined) {
                                                    const returnCode = data.readInt8(0);
                                                    const functionTypeCommand = fac.getDataType() === SmartLockFunctionType.TYPE_2 ? SmartLockBleCommandFunctionType2 : SmartLockBleCommandFunctionType1;
                                                    const commandType = Number.parseInt(SmartLockCommand[functionTypeCommand[fac.getCommandCode()!] as unknown as number]);
                                                    const customData = {
                                                        ...this.customDataStaging[commandType]
                                                    };
                                                    if (this.customDataStaging[commandType]) {
                                                        const result: CommandResult = {
                                                            channel: customData.channel,
                                                            command_type: commandType,
                                                            return_code: returnCode,
                                                            customData: customData.customData
                                                        };
                                                        this.emit("secondary command", result);
                                                        delete this.customDataStaging[commandType];
                                                    }
                                                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock  return code: ${returnCode}`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, decoded: data.toString("hex"), bleCommandCode: functionTypeCommand[fac.getCommandCode()!], returnCode: returnCode });
                                                    const parsePayload = new ParsePayload(data.subarray(1));
                                                    if (fac.getDataType() === SmartLockFunctionType.TYPE_2) {
                                                        switch (fac.getCommandCode()) {
                                                            case SmartLockBleCommandFunctionType2.QUERY_STATUS_IN_LOCK:
                                                            case SmartLockBleCommandFunctionType2.NOTIFY:
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_QUERY_BATTERY_LEVEL, parsePayload.readInt8(BleParameterIndex.ONE).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_QUERY_STATUS, parsePayload.readInt8(BleParameterIndex.TWO).toString());
                                                                break;
                                                            case SmartLockBleCommandFunctionType2.GET_LOCK_PARAM:
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK, parsePayload.readInt8(BleParameterIndex.ONE).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK_TIMER, parsePayload.readUint16LE(BleParameterIndex.TWO).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE, parsePayload.readInt8(BleParameterIndex.THREE).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_STARTTIME, parsePayload.readStringHex(BleParameterIndex.FOUR));
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_ENDTIME, parsePayload.readStringHex(BleParameterIndex.FIVE));
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_ONE_TOUCH_LOCK, parsePayload.readInt8(BleParameterIndex.SIX).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_SCRAMBLE_PASSCODE, parsePayload.readInt8(BleParameterIndex.SEVEN).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_WRONG_TRY_PROTECT, parsePayload.readInt8(BleParameterIndex.EIGHT).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_WRONG_TRY_ATTEMPTS, parsePayload.readInt8(BleParameterIndex.NINE).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_WRONG_TRY_LOCKDOWN, parsePayload.readUint16LE(BleParameterIndex.TEN).toString());
                                                                this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_LOCK_SOUND, parsePayload.readInt8(BleParameterIndex.ELEVEN).toString());
                                                                //this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_WIFI_STATUS, parsePayload.readInt8(BleParameterIndex.TWELVE).toString());
                                                                //this.emit("parameter", message.channel, CommandType.CMD_SMARTLOCK_LOG, parsePayload.readInt8(BleParameterIndex.THIRTEEN).toString());
                                                                break;
                                                            case SmartLockBleCommandFunctionType2.ADD_PW:
                                                                if (customData && customData.customData && customData.customData.command && customData.customData.command.name === CommandName.DeviceAddUser) {
                                                                    this.api.updateUserPassword(customData.customData.command.value?.deviceSN, customData.customData.command.value?.shortUserId, parsePayload.readStringHex(BleParameterIndex.ONE), customData.customData.command.value?.schedule);
                                                                }
                                                                break;
                                                            default:
                                                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock - Not implemented`, { stationSN: this.rawStation.station_sn, fac: fac.toString(), returnCode: returnCode, channel: customData?.channel, customData: customData?.customData });
                                                                break;
                                                        }
                                                    } else {
                                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock - Not implemented`, { stationSN: this.rawStation.station_sn, fac: fac.toString(), returnCode: returnCode, channel: customData?.channel, customData: customData?.customData });
                                                    }
                                                } else {
                                                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock - Unsupported data length or missint function type`, { stationSN: this.rawStation.station_sn, fac: fac.toString() });
                                                }
                                            } else {
                                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock - No data`, { stationSN: this.rawStation.station_sn, fac: fac.toString() });
                                            }
                                        } else {
                                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock - Partial data`, { stationSN: this.rawStation.station_sn, fac: fac.toString() });
                                        }
                                    } catch (err) {
                                        const error = ensureError(err);
                                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock Error`, { error: getError(error), stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, payload: payload });
                                    }
                                    this._clearSecondaryCommandTimeout();
                                    this.sendQueuedMessage();
                                } else {
                                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Smart Lock  - Unexpected response`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, message: data.toString() });
                                }
                            } else if (Device.isSmartSafe(this.rawStation.device_type)) {
                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD SmartSafe`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd });
                                switch (json.cmd) {
                                    case CommandType.CMD_SMARTSAFE_SETTINGS:
                                    {
                                        const payload = json.payload as SmartSafeSettingsNotification;
                                        try {
                                            const data = decodeSmartSafeData(this.rawStation.station_sn, Buffer.from(payload.data, "hex"));
                                            const returnCode = data.data.readInt8(0);
                                            const customData = {
                                                ...this.customDataStaging[payload.prj_id]
                                            };
                                            if (this.customDataStaging[payload.prj_id]) {
                                                const result: CommandResult = {
                                                    channel: customData.channel,
                                                    command_type: payload.prj_id,
                                                    return_code: returnCode,
                                                    customData: customData.customData
                                                };
                                                this.emit("secondary command", result);
                                                delete this.customDataStaging[payload.prj_id];
                                            }
                                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD SmartSafe return code: ${data.data.readInt8(0)}`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, decoded: data, commandCode: SmartSafeCommandCode[data.commandCode], returnCode: returnCode, channel: customData?.channel, customData: customData?.customData });
                                        } catch (err) {
                                            const error = ensureError(err);
                                            rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD SmartSafe Error`, { error: getError(error), stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, payload: payload });
                                        }
                                        this._clearSecondaryCommandTimeout();
                                        this.sendQueuedMessage();
                                        break;
                                    }
                                    case CommandType.CMD_SMARTSAFE_STATUS_UPDATE:
                                    {
                                        const payload = json.payload as SmartSafeStatusNotification;
                                        switch (payload.event_type) {
                                            case SmartSafeEvent.LOCK_STATUS:
                                            {
                                                const eventValues = payload.event_value as SmartSafeEventValueDetail;

                                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD SmartSafe Status update - LOCK_STATUS`, { stationSN: this.rawStation.station_sn, eventValues: eventValues });
                                                /*
                                                    type values:
                                                        1: Unlocked by PIN
                                                        2: Unlocked by User
                                                        3: Unlocked by key
                                                        4: Unlocked by App
                                                        5: Unlocked by Dual Unlock
                                                */
                                                if (eventValues.action === 0) {
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTSAFE_LOCK_STATUS, "0");
                                                } else if (eventValues.action === 1) {
                                                    this.emit("parameter", message.channel, CommandType.CMD_SMARTSAFE_LOCK_STATUS, "1");
                                                } else if (eventValues.action === 2) {
                                                    this.emit("jammed", message.channel);
                                                } else if (eventValues.action === 3) {
                                                    this.emit("low battery", message.channel);
                                                }
                                                break;
                                            }
                                            case SmartSafeEvent.SHAKE_ALARM:
                                                this.emit("shake alarm", message.channel, payload.event_value as number);
                                                break;
                                            case SmartSafeEvent.ALARM_911:
                                                this.emit("911 alarm", message.channel, payload.event_value as number);
                                                break;
                                            //case SmartSafeEvent.BATTERY_STATUS:
                                            //    break;
                                            case SmartSafeEvent.INPUT_ERR_MAX:
                                                this.emit("wrong try-protect alarm", message.channel);
                                                break;
                                            default:
                                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD SmartSafe Status update - Not implemented`, { stationSN: this.rawStation.station_sn, message: data.toString() });
                                                break;
                                        }
                                        break;
                                    }
                                    default:
                                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD SmartSafe - Not implemented`, { stationSN: this.rawStation.station_sn, message: data.toString() });
                                        break;
                                }
                            } else if (json.cmd === CommandType.CMD_ENTRY_SENSOR_STATUS) {
                                // {"cmd":1550,"payload":{"status":1}}
                                const payload = json.payload as EntrySensorStatus;
                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD EntrySensor Status update`, { stationSN: this.rawStation.station_sn, status: payload?.status });
                                if (payload) {
                                    this.emit("sensor status", message.channel, payload.status);
                                }
                            } else if (json.cmd === CommandType.CMD_CAMERA_GARAGE_DOOR_STATUS) {
                                // {"cmd":7500,"payload":{"type":24,"notify_tag":"","door_id":2}}
                                const payload = json.payload as GarageDoorStatus;
                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD GarageDoor Status update`, { stationSN: this.rawStation.station_sn, doorId: payload?.door_id, status: payload?.type, notify_tag: payload?.notify_tag });
                                if (payload) {
                                    this.emit("garage door status", message.channel, payload.door_id, payload.type);
                                }
                            } else if (json.cmd === CommandType.CMD_STORAGE_INFO_HB3) {
                                const payload = json.payload as StorageInfoHB3;
                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD StorageInfo HB3 update`, { stationSN: this.rawStation.station_sn, body: payload?.body });
                                if (payload) {
                                    this.emit("storage info hb3", message.channel, payload.body);
                                }
                            } else {
                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD - Not implemented`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[json.cmd], commandId: json.cmd, message: data.toString() });
                            }
                        }
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_NOTIFY_PAYLOAD Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString() } });
                    }
                    break;
                case CommandType.CMD_GET_DELAY_ALARM:
                    try {
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GET_DELAY_ALARM :`, { stationSN: this.rawStation.station_sn, payload: data.toString("hex") });
                        //When the alarm is armed, CMD_GET_DELAY_ALARM is called with event data 0, so ignore it
                        const alarmEventNumber = data.subarray(0, 4).readUInt32LE();
                        const alarmDelay = data.subarray(4, 8).readUInt32LE();
                        if (alarmEventNumber === 0) {
                            this.emit("alarm armed");
                        } else {
                            this.emit("alarm delay", alarmEventNumber as AlarmEvent, alarmDelay);
                        }
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GET_DELAY_ALARM - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_SET_TONE_FILE:
                    try {
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_SET_TONE_FILE :`, { stationSN: this.rawStation.station_sn, payload: data.toString("hex") });
                        const alarmEventNumber: AlarmEvent = data.subarray(0, 4).readUInt32LE();
                        this.emit("alarm event", alarmEventNumber);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_SET_TONE_FILE - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_SET_SNOOZE_MODE:
                    // Received for station managed devices when snooze time ends
                    try {
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_SET_SNOOZE_MODE`, { stationSN: this.rawStation.station_sn, payload: Buffer.from(data.toString(), "base64").toString() });
                        this.emit("parameter", message.channel, CommandType.CMD_SET_SNOOZE_MODE, data.toString());
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_SET_SNOOZE_MODE - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_PING:
                    // Ignore
                    break;
                case CommandType.CMD_DATABASE_IMAGE:
                    // Received data for preview image download
                    try {
                        const str = getNullTerminatedString(data, "utf8");
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DATABASE_IMAGE`, { stationSN: this.rawStation.station_sn, message: str });
                        const image = parseJSON(str, rootP2PLogger) as CmdDatabaseImageResponse;
                        this.emit("image download", image.file, decodeImage(this.rawStation.p2p_did, Buffer.from(image.content, "base64")));
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DATABASE_IMAGE - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString() } });
                    }
                    break;
                case CommandType.CMD_GET_TFCARD_STATUS:
                    try {
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GET_TFCARD_STATUS :`, { stationSN: this.rawStation.station_sn, payload: data.toString("hex") });
                        const tfCardStatus: TFCardStatus = data.subarray(0, 4).readUInt32LE();
                        this.emit("tfcard status", message.channel, tfCardStatus);
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GET_TFCARD_STATUS - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
                    }
                    break;
                case CommandType.CMD_DATABASE:
                    try {
                        const str = getNullTerminatedString(data, "utf8");
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DATABASE :`, { stationSN: this.rawStation.station_sn, payload: str });
                        const databaseResponse = parseJSON(str, rootP2PLogger) as P2PDatabaseResponse;
                        switch(databaseResponse.cmd) {
                            case CommandType.CMD_DATABASE_QUERY_LATEST_INFO:
                            {
                                let data: Array<P2PDatabaseQueryLatestInfoResponse> = [];
                                if (databaseResponse.data !== undefined && databaseResponse.data as unknown as string !== "[]")
                                    data = databaseResponse.data as Array<P2PDatabaseQueryLatestInfoResponse>;
                                const result: Array<DatabaseQueryLatestInfo> = [];
                                for (const record of data) {
                                    if (record.payload.crop_hb3_path !== "") {
                                        result.push({
                                            device_sn: record.device_sn,
                                            event_count: record.payload.event_count,
                                            crop_local_path: record.payload.crop_hb3_path
                                        });
                                    } else {
                                        result.push({
                                            device_sn: record.device_sn,
                                            event_count: record.payload.event_count,
                                            crop_cloud_path: record.payload.crop_cloud_path
                                        });
                                    }
                                }
                                this.emit("database query latest", databaseResponse.mIntRet, result);
                                break;
                            }
                            case CommandType.CMD_DATABASE_COUNT_BY_DATE: {
                                let data: Array<P2PDatabaseCountByDateResponse> = [];
                                if (databaseResponse.data !== undefined && databaseResponse.data as unknown as string !== "[]")
                                    data = databaseResponse.data as Array<P2PDatabaseCountByDateResponse>;
                                const result: Array<DatabaseCountByDate> = [];
                                for (const record of data) {
                                    result.push({
                                        day: date.parse(record.days, "YYYYMMDD"),
                                        count: record.count
                                    });
                                }
                                this.emit("database count by date", databaseResponse.mIntRet ,result);
                                break;
                            }
                            case CommandType.CMD_DATABASE_QUERY_LOCAL: {
                                let data: Array<P2PDatabaseQueryLocalResponse> = [];
                                if (databaseResponse.data !== undefined && databaseResponse.data as unknown as string !== "[]")
                                    data = databaseResponse.data as Array<P2PDatabaseQueryLocalResponse>;
                                const result: SortedMap<number, Partial<DatabaseQueryLocal>> = new SortedMap<number, Partial<DatabaseQueryLocal>>((a: number, b: number) => a - b);
                                for (const record of data) {
                                    for (const tableRecord of record.payload) {
                                        let tmpRecord = result.get(tableRecord.record_id);
                                        if (tmpRecord === undefined) {
                                            tmpRecord = {
                                                record_id: tableRecord.record_id,
                                                device_sn: tableRecord.device_sn,
                                                station_sn: tableRecord.station_sn,
                                            };
                                        }
                                        if (record.table_name === "history_record_info") {
                                            tmpRecord.history = {
                                                device_type: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).device_type,
                                                account: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).account,
                                                start_time: date.parse((tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).start_time, "YYYY-MM-DD HH:mm:ss"),
                                                end_time: date.parse((tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).end_time, "YYYY-MM-DD HH:mm:ss"),
                                                frame_num: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).frame_num,
                                                storage_type: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).storage_type,
                                                storage_cloud: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).storage_cloud,
                                                cipher_id: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).cipher_id,
                                                vision: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).vision,
                                                video_type: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).video_type,
                                                has_lock: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).has_lock,
                                                automation_id: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).automation_id,
                                                trigger_type: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).trigger_type,
                                                push_mode: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).push_mode,
                                                mic_status: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).mic_status,
                                                res_change: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).res_change,
                                                res_best_width: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).res_best_width,
                                                res_best_height: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).res_best_height,
                                                self_learning: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).self_learning,
                                                storage_path: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).storage_path,
                                                thumb_path: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).thumb_path,
                                                write_status: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).write_status,
                                                cloud_path: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).cloud_path,
                                                folder_size: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).folder_size,
                                                storage_status: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).storage_status,
                                                storage_label: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).storage_label,
                                                time_zone: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).time_zone,
                                                mp4_cloud: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).mp4_cloud,
                                                snapshot_cloud: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).snapshot_cloud,
                                                table_version: (tableRecord as P2PDatabaseQueryLocalHistoryRecordInfo).table_version,
                                            };
                                        } else if (record.table_name === "record_crop_picture_info") {
                                            if (tmpRecord.picture === undefined) {
                                                tmpRecord.picture = [];
                                            }
                                            tmpRecord.picture.push({
                                                picture_id: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).picture_id,
                                                detection_type: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).detection_type,
                                                person_id: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).person_id,
                                                crop_path: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).crop_path,
                                                event_time: date.parse((tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).event_time, "YYYY-MM-DD HH:mm:ss"),
                                                person_recog_flag: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).person_recog_flag,
                                                crop_pic_quality: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).crop_pic_quality,
                                                pic_marking_flag: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).pic_marking_flag,
                                                group_id: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).group_id,
                                                crop_id: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).crop_id,
                                                start_time: date.parse((tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).start_time, "YYYY-MM-DD HH:mm:ss"),
                                                storage_type: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).storage_type,
                                                storage_status: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).storage_status,
                                                storage_label: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).storage_label,
                                                table_version: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).table_version,
                                                update_time: (tableRecord as P2PDatabaseQueryLocalRecordCropPictureInfo).update_time,
                                            });
                                        } else {
                                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Not implemented - CMD_DATABASE_QUERY_LOCAL - table_name: ${record.table_name}`, { stationSN: this.rawStation.station_sn });
                                        }
                                        result.set(tableRecord.record_id, tmpRecord);
                                    }
                                }
                                this.emit("database query local", databaseResponse.mIntRet, Array.from(result.values()) as DatabaseQueryLocal[]);
                                break;
                            }
                            case CommandType.CMD_DATABASE_DELETE: {
                                const data = databaseResponse.data as P2PDatabaseDeleteResponse;
                                let failed_delete: Array<unknown> = [];
                                if (databaseResponse.data !== undefined && data.failed_delete as unknown as string !== "[]")
                                    failed_delete = data.failed_delete;
                                this.emit("database delete", databaseResponse.mIntRet, failed_delete);
                                break;
                            }
                            default:
                                rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Not implemented - CMD_DATABASE message`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, databaseResponse: databaseResponse });
                                break;
                        }
                    } catch (err) {
                        const error = ensureError(err);
                        rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - CMD_DATABASE - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString() } });
                    }
                    break;
                case CommandType.CMD_GATEWAYINFO:
                    const cipherID = data.subarray(0, 2).readUInt16LE();
                    //const unknownNumber = data.subarray(2, 2).readUInt16LE();
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GATEWAYINFO - cipherID`, { stationSN: this.rawStation.station_sn, channel: message.channel, data: data.toString("hex"), cipherID: cipherID });
                    const encryptedKey = readNullTerminatedBuffer(data.subarray(4));
                    this.api.getCipher(/*this.rawStation.station_sn, */cipherID, this.rawStation.member.admin_user_id).then((cipher) => {
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GATEWAYINFO - get cipher with cipherID`, { stationSN: this.rawStation.station_sn, channel: message.channel, data: data.toString("hex"), cipherID: cipherID, cipher: JSON.stringify(cipher) });
                        if (cipher !== undefined) {
                            this.encryption  = EncryptionType.LEVEL_2;
                            const rsa = getRSAPrivateKey(cipher.private_key, this.enableEmbeddedPKCS1Support);
                            this.p2pKey = rsa.decrypt(encryptedKey);
                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GATEWAYINFO - set encryption level 2`, { stationSN: this.rawStation.station_sn, key: this.p2pKey.toString("hex") });
                        } else {
                            this.encryption  = EncryptionType.LEVEL_1;
                            this.p2pKey = Buffer.from(getP2PCommandEncryptionKey(this.rawStation.station_sn, this.rawStation.p2p_did));
                            rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GATEWAYINFO - set encryption level 1`, { stationSN: this.rawStation.station_sn, key: this.p2pKey.toString("hex") });
                        }
                        this._clearTimeout(this.messageStates.get(message.seqNo)?.timeout);
                        this.p2pSeqMapping.forEach((value: number, key: number, map: Map<number, number>) => {
                            if (value === message.seqNo) {
                                map.delete(key);
                            }
                        })
                        this.p2pDataSeqNumber--;
                        this.messageStates.delete(message.seqNo);
                        this.sendQueuedMessage();
                    }).catch((err) => {
                        const error = ensureError(err);
                        this.encryption  = EncryptionType.LEVEL_1;
                        this.p2pKey = Buffer.from(getP2PCommandEncryptionKey(this.rawStation.station_sn, this.rawStation.p2p_did));
                        rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - CMD_GATEWAYINFO - set encryption level 1 (fallback)`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") }, key: this.p2pKey.toString("hex") });
                        this._clearTimeout(this.messageStates.get(message.seqNo)?.timeout);
                        this.p2pSeqMapping.forEach((value: number, key: number, map: Map<number, number>) => {
                            if (value === message.seqNo) {
                                map.delete(key);
                            }
                        })
                        this.p2pDataSeqNumber--;
                        this.messageStates.delete(message.seqNo);
                        this.sendQueuedMessage();
                    });
                    break;
                default:
                    rootP2PLogger.debug(`Handle DATA ${P2PDataType[message.dataType]} - Not implemented`, { stationSN: this.rawStation.station_sn, commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: data.toString("hex") });
                    break;
            }
        } catch (err) {
            const error = ensureError(err);
            rootP2PLogger.error(`Handle DATA ${P2PDataType[message.dataType]} - Error`, { error: getError(error), stationSN: this.rawStation.station_sn, message: { seqNo: message.seqNo, channel: message.channel, commandType: CommandType[message.commandId], signCode: message.signCode, type: message.type, dataType: P2PDataType[message.dataType], data: message.data.toString("hex") } });
        }
    }

    private async sendAck(address: Address, dataType: Buffer, seqNo: number): Promise<void> {
        const num_pending_acks = 1;  // Max possible: 17 in one ack packet
        const pendingAcksBuffer = Buffer.allocUnsafe(2);
        pendingAcksBuffer.writeUInt16BE(num_pending_acks, 0);
        const seqBuffer = Buffer.allocUnsafe(2);
        seqBuffer.writeUInt16BE(seqNo, 0);
        const payload = Buffer.concat([dataType, pendingAcksBuffer, seqBuffer]);
        await this.sendMessage(`Send ack`, address, RequestMessageType.ACK, payload);
    }

    private getDataType(input: Buffer): P2PDataType {
        if (input.compare(P2PDataTypeHeader.DATA) === 0) {
            return P2PDataType.DATA;
        } else if (input.compare(P2PDataTypeHeader.VIDEO) === 0) {
            return P2PDataType.VIDEO;
        } else if (input.compare(P2PDataTypeHeader.CONTROL) === 0) {
            return P2PDataType.CONTROL;
        } else if (input.compare(P2PDataTypeHeader.BINARY) === 0) {
            return P2PDataType.BINARY;
        }
        return P2PDataType.UNKNOWN;
    }

    public async close(): Promise<void> {
        this.terminating = true;
        this._clearLookupTimeout();
        this._clearLocalLookupRetryTimeout();
        this._clearLookupRetryTimeout();
        this._clearConnectTimeout();
        this._clearHeartbeatTimeout();
        this._clearMessageStateTimeouts();
        this._clearMessageVideoStateTimeouts();
        this._clearSecondaryCommandTimeout();
        this.sendQueue = [];
        if (this.socket) {
            if (this.connected) {
                await this.sendMessage(`Send end connection`, this.connectAddress!, RequestMessageType.END);
                this._disconnected();
            } else {
                this._initialize();
            }
        }
    }

    private getHeartbeatInterval(): number {
        return this.HEARTBEAT_INTERVAL;
    }

    private onClose(): void {
        this.socket.removeAllListeners();
        this.socket = createSocket("udp4");
        this.socket.on("message", (msg, rinfo) => this.handleMsg(msg, rinfo));
        this.socket.on("error", (error) => this.onError(error));
        this.socket.on("close", () => this.onClose());
        this.binded = false;
        this._disconnected();
    }

    private onError(err: any): void {
        const error = ensureError(err);
        rootP2PLogger.debug(`Socket Error:`, { error: getError(error), stationSN: this.rawStation.station_sn });
    }

    private scheduleHeartbeat(): void {
        if (this.isConnected()) {
            this.sendPing(this.connectAddress!);
            this.heartbeatTimeout = setTimeout(() => {
                this.scheduleHeartbeat();
            }, this.getHeartbeatInterval());
        } else {
            rootP2PLogger.debug(`Heartbeat not activated because no connection is present!`, { stationSN: this.rawStation.station_sn });
        }
    }

    private scheduleP2PKeepalive(): void {
        if (this.isConnected()) {
            this.sendCommandPing(Station.CHANNEL);
            this.keepaliveTimeout = setTimeout(() => {
                this.scheduleP2PKeepalive();
            }, this.KEEPALIVE_INTERVAL);
            this.closeEnergySavingDevice();
        } else {
            rootP2PLogger.debug(`P2P keepalive not activated because no connection is present`, { stationSN: this.rawStation.station_sn });
        }
    }

    public getDownloadRSAPrivateKey(): NodeRSA {
        if (this.currentMessageState[P2PDataType.BINARY].rsaKey === null) {
            this.currentMessageState[P2PDataType.BINARY].rsaKey = getNewRSAPrivateKey(this.enableEmbeddedPKCS1Support);
        }
        return this.currentMessageState[P2PDataType.BINARY].rsaKey!;
    }

    public setDownloadRSAPrivateKeyPem(pem: string): void {
        this.currentMessageState[P2PDataType.BINARY].rsaKey = getRSAPrivateKey(pem, this.enableEmbeddedPKCS1Support);
    }

    public getRSAPrivateKey(): NodeRSA | null {
        return this.currentMessageState[P2PDataType.VIDEO].rsaKey;
    }

    private initializeStream(datatype: P2PDataType): void {
        this.currentMessageState[datatype].videoStream?.destroy();
        this.currentMessageState[datatype].audioStream?.destroy();
        this.currentMessageState[datatype].videoStream = null;
        this.currentMessageState[datatype].audioStream = null;

        this.currentMessageState[datatype].videoStream = new Readable({ autoDestroy: true,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            read() {}/*,

            destroy(this, error, _callback) {
                if (error) {
                    this.emit("error", error);
                }
                this.emit("end");
                this.emit("close");
            }*/
        });
        this.currentMessageState[datatype].audioStream = new Readable({ autoDestroy: true,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            read() {}/*,

            destroy(this, error, _callback) {
                if (error) {
                    this.emit("error", error);
                }
                this.emit("end");
                this.emit("close");
            }*/
        });

        this.currentMessageState[datatype].p2pStreaming = false;

        if (this.currentMessageState[datatype].waitForSeqNoTimeout !== undefined) {
            clearTimeout(this.currentMessageState[datatype].waitForSeqNoTimeout!);
            this.currentMessageState[datatype].waitForSeqNoTimeout = undefined;
        }
        if (this.currentMessageState[datatype].waitForAudioData !== undefined) {
            clearTimeout(this.currentMessageState[datatype].waitForAudioData!);
            this.currentMessageState[datatype].waitForAudioData = undefined;
        }
    }

    private endStream(datatype: P2PDataType, sendStopCommand = false): void {
        if (this.currentMessageState[datatype].p2pStreaming) {
            if (sendStopCommand) {
                switch (datatype) {
                    case P2PDataType.VIDEO:
                        this.sendCommandWithInt({
                            commandType: CommandType.CMD_STOP_REALTIME_MEDIA,
                            value: this.currentMessageState[datatype].p2pStreamChannel,
                            channel: this.currentMessageState[datatype].p2pStreamChannel
                        }, {
                            command: {
                                name: CommandName.DeviceStopLivestream
                            }
                        });
                        break;
                    case P2PDataType.BINARY:
                        this.sendCommandWithInt({
                            commandType: CommandType.CMD_DOWNLOAD_CANCEL,
                            value: this.currentMessageState[datatype].p2pStreamChannel,
                            strValueSub: this.rawStation.member.admin_user_id,
                            channel: this.currentMessageState[datatype].p2pStreamChannel
                        }, {
                            command: {
                                name: CommandName.DeviceCancelDownload
                            }
                        });
                        break;
                }
            }
            this.currentMessageState[datatype].p2pStreaming = false;

            this.currentMessageState[datatype].videoStream?.push(null);
            this.currentMessageState[datatype].audioStream?.push(null);

            if (this.currentMessageState[datatype].p2pStreamingTimeout) {
                clearTimeout(this.currentMessageState[datatype].p2pStreamingTimeout!);
                this.currentMessageState[datatype].p2pStreamingTimeout = undefined;
            }

            if (!this.currentMessageState[datatype].invalidStream && !this.currentMessageState[datatype].p2pStreamNotStarted)
                this.emitStreamStopEvent(datatype);

            if (this.currentMessageState[datatype].queuedData.size > 0) {
                this.expectedSeqNo[datatype] = this._incrementSequence([...this.currentMessageState[datatype].queuedData.keys()][this.currentMessageState[datatype].queuedData.size - 1]);
            }
            this.initializeMessageBuilder(datatype);
            this.initializeMessageState(datatype, this.currentMessageState[datatype].rsaKey);
            this.initializeStream(datatype);
            this.closeEnergySavingDevice();
        }
    }

    private endRTSPStream(channel: number): void {
        if (this.currentMessageState[P2PDataType.DATA].rtspStreaming[channel]) {
            this.currentMessageState[P2PDataType.DATA].rtspStream[channel] = false;
            this.currentMessageState[P2PDataType.DATA].rtspStreaming[channel] = false;
            this.emit("rtsp livestream stopped", channel);
        }
    }

    private emitStreamStartEvent(datatype: P2PDataType): void {
        this.currentMessageState[datatype].p2pStreamNotStarted = false;
        if (datatype === P2PDataType.VIDEO) {
            this.emit("livestream started", this.currentMessageState[datatype].p2pStreamChannel, this.currentMessageState[datatype].p2pStreamMetadata, this.currentMessageState[datatype].videoStream!, this.currentMessageState[datatype].audioStream!);
        } else if (datatype === P2PDataType.BINARY) {
            this.emit("download started", this.currentMessageState[datatype].p2pStreamChannel, this.currentMessageState[datatype].p2pStreamMetadata, this.currentMessageState[datatype].videoStream!, this.currentMessageState[datatype].audioStream!);
        }
    }

    private emitStreamStopEvent(datatype: P2PDataType): void {
        if (datatype === P2PDataType.VIDEO) {
            this.emit("livestream stopped", this.currentMessageState[datatype].p2pStreamChannel);
        } else if (datatype === P2PDataType.BINARY) {
            this.emit("download finished", this.currentMessageState[datatype].p2pStreamChannel);
        }
    }

    public isStreaming(channel: number, datatype: P2PDataType): boolean {
        if (this.currentMessageState[datatype].p2pStreamChannel === channel)
            return this.currentMessageState[datatype].p2pStreaming;
        return false;
    }

    public isLiveStreaming(channel: number): boolean {
        return this.isStreaming(channel, P2PDataType.VIDEO);
    }

    private isCurrentlyStreaming(): boolean {
        for (const element of Object.values(this.currentMessageState)) {
            if (element.p2pStreaming || element.p2pTalkback)
                return true;
        }
        return false;
    }

    public isRTSPLiveStreaming(channel: number): boolean {
        return this.currentMessageState[P2PDataType.DATA].rtspStreaming[channel] ? this.currentMessageState[P2PDataType.DATA].rtspStreaming[channel] : false;
    }

    public isDownloading(channel: number): boolean {
        return this.isStreaming(channel, P2PDataType.BINARY);
    }

    public getLockSequenceNumber(): number {
        if (this.lockSeqNumber === -1) {
            let deviceType = undefined;
            let deviceSN = undefined;
            if (this.rawStation?.devices !== undefined && this.rawStation?.devices.length > 0) {
                deviceType = this.rawStation?.devices[0]?.device_type;
                deviceSN = this.rawStation?.devices[0]?.device_sn;
            }
            this.lockSeqNumber = generateLockSequence(deviceType, deviceSN);
        }
        return this.lockSeqNumber;
    }

    public incLockSequenceNumber(): number {
        if (this.lockSeqNumber === -1) {
            this.getLockSequenceNumber();
        } else
            this.lockSeqNumber++;
        return this.lockSeqNumber;
    }

    public setConnectionType(type: P2PConnectionType): void {
        this.connectionType = type;
    }

    public getConnectionType(): P2PConnectionType {
        return this.connectionType;
    }

    public isEnergySavingDevice(): boolean {
        return this.energySavingDevice;
    }

    private async getDSKKeys(): Promise<void> {
        if (this.api.isConnected()) {
            try {
                const data: {
                    invalid_dsks: {
                        [index: string]: string
                    },
                    station_sns: Array<string>,
                    transaction: string
                } = {
                    invalid_dsks: {
                    },
                    station_sns: [this.rawStation.station_sn],
                    transaction: `${new Date().getTime()}`
                };
                data.invalid_dsks[this.rawStation.station_sn] = "";
                const response = await this.api.request({
                    method: "post",
                    endpoint: "v1/app/equipment/get_dsk_keys",
                    data: data
                });
                rootP2PLogger.debug(`Get DSK keys - Response:`, { stationSN: this.rawStation.station_sn, data: response.data });

                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        const dataresult: DskKeyResponse = result.data;
                        dataresult.dsk_keys.forEach(key => {
                            if (key.station_sn == this.rawStation.station_sn) {
                                this.dskKey = key.dsk_key;
                                this.dskExpiration = new Date(key.expiration * 1000);
                                rootP2PLogger.debug(`Get DSK keys - received key and expiration`, { stationSN: this.rawStation.station_sn, dskKey: this.dskKey, dskExpiration: this.dskExpiration });
                            }
                        });
                    } else {
                        rootP2PLogger.error(`Get DSK keys - Response code not ok`, { stationSN: this.rawStation.station_sn, code: result.code, msg: result.msg });
                    }
                } else {
                    rootP2PLogger.error(`Get DSK keys - Status return code not 200`, { stationSN: this.rawStation.station_sn, status: response.status, statusText: response.statusText });
                }
            } catch (err) {
                const error = ensureError(err);
                rootP2PLogger.error(`Get DSK keys - Generic Error`, { error: getError(error), stationSN: this.rawStation.station_sn });
            }
        }
    }

    public updateRawStation(value: StationListResponse): void {
        this.rawStation = value;

        this.channel = Station.getChannel(value.device_type);

        if (this.rawStation.devices?.length > 0) {
            if (!this.energySavingDevice) {
                for (const device of this.rawStation.devices) {
                    if (device.device_sn === this.rawStation.station_sn && Device.hasBattery(device.device_type)) {
                        this.energySavingDevice = true;
                        break;
                    }
                }
                if (this.energySavingDevice)
                    rootP2PLogger.debug(`Identified standalone battery device ${this.rawStation.station_sn} => activate p2p keepalive command`);
            }
        } else {
            this.energySavingDevice = false;
        }
        if (this.rawStation.devices)
            for (const device of this.rawStation.devices) {
                this.deviceSNs[device.device_channel] = {
                    sn: device.device_sn,
                    adminUserId: this.rawStation.member.admin_user_id
                };
            }
    }

    private initializeTalkbackStream(channel = 0): void {
        this.talkbackStream = new TalkbackStream();
        this.talkbackStream.on("data", (audioData) => { this.sendTalkbackAudioFrame(audioData, channel) });
        this.talkbackStream.on("error", (error) => { this.onTalkbackStreamError(error) });
        this.talkbackStream.on("close", () => { this.onTalkbackStreamClose() });
    }

    private sendTalkbackAudioFrame(audioData: Buffer, channel: number): void {
        const messageHeader = buildCommandHeader(this.videoSeqNumber, CommandType.CMD_AUDIO_FRAME, P2PDataTypeHeader.VIDEO);
        const messageAudioHeader = buildTalkbackAudioFrameHeader(audioData, channel);
        const messageData = Buffer.concat([messageHeader, messageAudioHeader, audioData]);

        const message: P2PVideoMessageState = {
            sequence: this.videoSeqNumber,
            channel: channel,
            data: messageData,
            retries: 0
        };

        this.videoSeqNumber = this._incrementSequence(this.videoSeqNumber);
        this._sendVideoData(message);
    }

    private onTalkbackStreamClose(): void {
        this.talkbackStream?.removeAllListeners();
    }

    private onTalkbackStreamError(err: any): void {
        const error = ensureError(err);
        rootP2PLogger.debug(`Talkback Stream Error:`, { error: getError(error), stationSN: this.rawStation.station_sn });
    }

    private async _sendVideoData(message: P2PVideoMessageState): Promise<void> {
        if (message.retries < this.MAX_RETRIES) {
            message.retries++;
        } else {
            rootP2PLogger.error(`Sending video data - Max send video data retries ${this.messageVideoStates.get(message.sequence)?.retries} reached. Discard data.`, { stationSN: this.rawStation.station_sn, sequence: message.sequence, channel: message.channel, retries: message.retries });
            this.messageVideoStates.delete(message.sequence);
            this.emit("talkback error", message.channel, new TalkbackError("Max send video data retries reached. Discard data packet.", { context: { station: this.rawStation.station_sn, channel: message.channel, retries: message.retries } }));
            return;
        }

        message = message as P2PVideoMessageState;
        message.timeout = setTimeout(() => {
            this._sendVideoData(message);
        }, this.MAX_AKNOWLEDGE_TIMEOUT);
        this.messageVideoStates.set(message.sequence, message);

        rootP2PLogger.trace("Sending p2p video data...", { station: this.rawStation.station_sn, sequence: message.sequence, channel: message.channel, retries: message.retries, messageVideoStatesSize: this.messageVideoStates.size });
        await this.sendMessage(`Send video data`, this.connectAddress!, RequestMessageType.DATA, message.data);
    }

    public isTalkbackOngoing(channel: number): boolean {
        if (this.currentMessageState[P2PDataType.VIDEO].p2pTalkbackChannel === channel)
            return this.currentMessageState[P2PDataType.VIDEO].p2pTalkback;
        return false;
    }

    public startTalkback(channel = 0): void {
        this.currentMessageState[P2PDataType.VIDEO].p2pTalkback = true;
        this.currentMessageState[P2PDataType.VIDEO].p2pTalkbackChannel = channel;
        this.initializeTalkbackStream(channel);
        this.talkbackStream?.startTalkback();
        this.emit("talkback started", channel, this.talkbackStream!);
    }

    public stopTalkback(channel = 0): void {
        this.currentMessageState[P2PDataType.VIDEO].p2pTalkback = false;
        this.currentMessageState[P2PDataType.VIDEO].p2pTalkbackChannel = -1;
        this.talkbackStream?.stopTalkback();
        this.emit("talkback stopped", channel);
        this.closeEnergySavingDevice();
    }

    public setLockAESKey(commandCode: number, aesKey: string): void {
        this.lockAESKeys.set(commandCode, aesKey);
    }

    public getLockAESKey(commandCode: number): string|undefined {
        return this.lockAESKeys.get(commandCode);
    }

    public isConnecting(): boolean {
        return this.connecting;
    }

}
