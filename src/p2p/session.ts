import { createSocket, Socket, RemoteInfo } from "dgram";
import { TypedEmitter } from "tiny-typed-emitter";
import * as NodeRSA from "node-rsa";
import { Readable } from "stream";
import { Logger } from "ts-log";
import { SortedMap } from "sweet-collections";

import { Address, CmdCameraInfoResponse, CmdNotifyPayload, CommandResult, ESLAdvancedLockStatusNotification, PropertyData, ESLStationP2PThroughData } from "./models";
import { sendMessage, hasHeader, buildCheckCamPayload, buildIntCommandPayload, buildIntStringCommandPayload, buildCommandHeader, MAGIC_WORD, buildCommandWithStringTypePayload, isPrivateIp, buildLookupWithKeyPayload, sortP2PMessageParts, buildStringTypeCommandPayload, getRSAPrivateKey, decryptAESData, getNewRSAPrivateKey, findStartCode, isIFrame, generateLockSequence, decodeLockPayload, generateBasicLockAESKey, getLockVectorBytes, decryptLockAESData, buildLookupWithKeyPayload2, buildCheckCamPayload2, buildLookupWithKeyPayload3, decodeBase64, getVideoCodec, checkT8420, buildVoidCommandPayload, isP2PQueueMessage, buildTalkbackAudioFrameHeader } from "./utils";
import { RequestMessageType, ResponseMessageType, CommandType, ErrorCode, P2PDataType, P2PDataTypeHeader, AudioCodec, VideoCodec, ESLInnerCommand, P2PConnectionType, ChargingType, AlarmEvent, IndoorSoloSmartdropCommandType } from "./types";
import { AlarmMode } from "../http/types";
import { P2PDataMessage, P2PDataMessageAudio, P2PDataMessageBuilder, P2PMessageState, P2PDataMessageVideo, P2PMessage, P2PDataHeader, P2PDataMessageState, P2PClientProtocolEvents, DeviceSerial, P2PQueueMessage, P2PCommand, P2PVideoMessageState } from "./interfaces";
import { DskKeyResponse, ResultResponse, StationListResponse } from "../http/models";
import { HTTPApi } from "../http/api";
import { Device } from "../http/device";
import { getAdvancedLockTimezone } from "../http/utils";
import { TalkbackStream } from "./talkback";
import { LivestreamError, TalkbackError } from "../error";

export class P2PClientProtocol extends TypedEmitter<P2PClientProtocolEvents> {

    private readonly MAX_RETRIES = 10;
    private readonly MAX_COMMAND_RESULT_WAIT = 30 * 1000;
    private readonly MAX_AKNOWLEDGE_TIMEOUT = 15 * 1000;
    private readonly MAX_LOOKUP_TIMEOUT = 15 * 1000;
    private readonly LOOKUP_RETRY_TIMEOUT = 150;
    private readonly MAX_EXPECTED_SEQNO_WAIT = 20 * 1000;
    private readonly HEARTBEAT_INTERVAL = 5 * 1000;
    private readonly MAX_COMMAND_QUEUE_TIMEOUT = 120 * 1000;
    private readonly AUDIO_CODEC_ANALYZE_TIMEOUT = 650;
    private readonly KEEPALIVE_INTERVAL = 5 * 1000;
    private readonly ESD_DISCONNECT_TIMEOUT = 15 * 1000;
    private readonly MAX_STREAM_DATA_WAIT = 5 * 1000;

    private readonly UDP_RECVBUFFERSIZE_BYTES = 1048576;
    private readonly MAX_PAYLOAD_BYTES = 1028;
    private readonly MAX_PACKET_BYTES = 1024;
    private readonly MAX_VIDEO_PACKET_BYTES = 655360;

    private readonly P2P_DATA_HEADER_BYTES = 16;

    private readonly MAX_SEQUENCE_NUMBER = 65535;

    private socket: Socket;
    private binded = false;
    private connected = false;
    private connecting = false;
    private terminating = false;

    private seqNumber = 0;
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

    private talkbackStream = new TalkbackStream();

    private downloadTotalBytes = 0;
    private downloadReceivedBytes = 0;

    private cloudAddresses: Array<Address> = [
        { host: "18.197.212.165", port: 32100 },    // Germany Frankfurt
        { host: "34.235.4.153", port: 32100 },      // USA Ashburn
        { host: "54.153.101.7", port: 32100 },      // USA San Francisco
        { host: "18.223.127.200", port: 32100 },    // USA Columbus
        { host: "54.223.148.206", port: 32100 },    // China Beijing
        { host: "13.251.222.7", port: 32100 },      // Singapore
        { host: "54.167.31.60", port: 32100 },      // USA Ashburn
        { host: "204.236.133.68", port: 32100 },    // USA San Jose
        { host: "3.131.209.36", port: 32100 },      // USA Columbus
    ];

    private messageStates: SortedMap<number, P2PMessageState> = new SortedMap<number, P2PMessageState>((a: number, b: number) => a - b);
    private messageVideoStates: SortedMap<number, P2PVideoMessageState> = new SortedMap<number, P2PVideoMessageState>((a: number, b: number) => a - b);
    private sendQueue: Array<P2PQueueMessage> = new Array<P2PQueueMessage>();

    private connectTimeout?: NodeJS.Timeout;
    private lookupTimeout?: NodeJS.Timeout;
    private lookupRetryTimeout?: NodeJS.Timeout;
    private heartbeatTimeout?: NodeJS.Timeout;
    private keepaliveTimeout?: NodeJS.Timeout;
    private esdDisconnectTimeout?: NodeJS.Timeout;
    private connectTime: number | null = null;
    private lastPong: number | null = null;
    private connectionType: P2PConnectionType = P2PConnectionType.QUICKEST;

    private energySavingDevice = false;
    private energySavingDeviceP2PSeqMapping: Map<number, number> = new Map<number, number>();
    private energySavingDeviceP2PDataSeqNumber = 0;

    private connectAddress: Address | undefined = undefined;
    private dskKey = "";
    private dskExpiration: Date | null = null;
    private log: Logger;
    private deviceSNs: DeviceSerial = {};
    private api: HTTPApi;
    private rawStation!: StationListResponse;

    constructor(rawStation: StationListResponse, api: HTTPApi) {
        super();
        this.api = api;
        this.log = api.getLog();
        this.updateRawStation(rawStation);

        this.socket = createSocket("udp4");
        this.socket.on("message", (msg, rinfo) => this.handleMsg(msg, rinfo));
        this.socket.on("error", (error) => this.onError(error));
        this.socket.on("close", () => this.onClose());

        this.initializeTalkbackStream();
        this._initialize();
    }

    private _incrementSequence(sequence: number): number {
        if (sequence < this.MAX_SEQUENCE_NUMBER)
            return sequence + 1;
        return 0;
    }

    private _initialize(): void {
        let rsaKey: NodeRSA | null;

        this.connected = false;
        this.connecting = false;
        this.lastPong = null;
        this.connectTime = null;
        this.seqNumber = 0;
        this.videoSeqNumber = 0;
        this.energySavingDeviceP2PDataSeqNumber = 0;
        this.lockSeqNumber = -1;
        this.connectAddress = undefined;

        this._clearMessageStateTimeouts();
        this._clearMessageVideoStateTimeouts();
        this.messageStates.clear();
        this.messageVideoStates.clear();
        this.energySavingDeviceP2PSeqMapping.clear();

        for(let datatype = 0; datatype < 4; datatype++) {

            this.expectedSeqNo[datatype] = 0;

            if (datatype === P2PDataType.VIDEO)
                rsaKey = getNewRSAPrivateKey();
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

    private _clearLookupRetryTimeout(): void {
        this._clearTimeout(this.lookupRetryTimeout);
        this.lookupRetryTimeout = undefined;
    }

    private _clearESDDisconnectTimeout(): void {
        this._clearTimeout(this.esdDisconnectTimeout);
        this.esdDisconnectTimeout = undefined;
    }

    private _disconnected(): void {
        this._clearHeartbeatTimeout();
        this._clearKeepaliveTimeout();
        this._clearLookupRetryTimeout();
        this._clearLookupTimeout();
        this._clearConnectTimeout();
        this._clearESDDisconnectTimeout();
        if (this.currentMessageState[P2PDataType.VIDEO].p2pStreaming) {
            this.endStream(P2PDataType.VIDEO)
        }
        if (this.currentMessageState[P2PDataType.BINARY].p2pStreaming) {
            this.endStream(P2PDataType.BINARY)
        }
        for (const channel in this.currentMessageState[P2PDataType.DATA].rtspStreaming) {
            this.endRTSPStream(Number.parseInt(channel));
        }
        this.sendQueue = this.sendQueue.filter((queue) => queue.commandType !== CommandType.CMD_PING && queue.commandType !== CommandType.CMD_GET_DEVICE_PING);
        if (this.connected) {
            this.emit("close");
        } else if (!this.terminating) {
            this.emit("timeout");
        }
        this._initialize();
    }

    private closeEnergySavingDevice(): void {
        if (this.sendQueue.filter((queue) => queue.commandType !== CommandType.CMD_PING && queue.commandType !== CommandType.CMD_GET_DEVICE_PING).length === 0 && this.energySavingDevice) {
            if (this.esdDisconnectTimeout === undefined) {
                this.log.debug(`Station ${this.rawStation.station_sn} - Energy saving device - No more p2p commands to execute, initiate disconnect timeout in ${this.ESD_DISCONNECT_TIMEOUT} milliseconds...`);
                this.esdDisconnectTimeout = setTimeout(() => {
                    this.esdDisconnectTimeout = undefined;
                    sendMessage(this.socket, this.connectAddress!, RequestMessageType.END).catch((error) => {
                        this.log.error(`Station ${this.rawStation.station_sn} - Error`, error);
                    });
                    this.log.info(`Initiated closing of connection to station ${this.rawStation.station_sn} for saving battery.`);
                    this.terminating = true;
                    this._disconnected();
                }, this.ESD_DISCONNECT_TIMEOUT);
            }
        }
    }

    private async renewDSKKey(): Promise<void> {
        if (this.dskKey === "" || (this.dskExpiration && (new Date()).getTime() >= this.dskExpiration.getTime())) {
            this.log.debug(`Station ${this.rawStation.station_sn} DSK keys not present or expired, get/renew it`, { dskKey: this.dskKey, dskExpiration: this.dskExpiration });
            await this.getDSKKeys();
        }
    }

    public lookup(): void {
        this.cloudAddresses.map((address) => this.lookupByAddress(address));
        this.cloudAddresses.map((address) => this.lookupByAddress2(address));

        this._clearLookupTimeout();
        this._clearLookupRetryTimeout();

        this.lookupTimeout = setTimeout(() => {
            this.lookupTimeout = undefined;
            this.log.error(`${this.constructor.name}.lookup(): station: ${this.rawStation.station_sn} - All address lookup tentatives failed.`);
            this._disconnected();
        }, this.MAX_LOOKUP_TIMEOUT);
    }

    public lookup2(origAddress: Address, data: Buffer): void {
        this.cloudAddresses.map((address) => this.lookupByAddress3(address, origAddress, data));
    }

    private async lookupByAddress(address: Address): Promise<void> {
        // Send lookup message
        const msgId = RequestMessageType.LOOKUP_WITH_KEY;
        const payload = buildLookupWithKeyPayload(this.socket, this.rawStation.p2p_did, this.dskKey);
        sendMessage(this.socket, address, msgId, payload).catch((error) => {
            this.log.error(`Lookup addresses for station ${this.rawStation.station_sn} - Error:`, error);
        });
    }

    private async lookupByAddress2(address: Address): Promise<void> {
        // Send lookup message2
        const msgId = RequestMessageType.LOOKUP_WITH_KEY2;
        const payload = buildLookupWithKeyPayload2(this.rawStation.p2p_did, this.dskKey);
        sendMessage(this.socket, address, msgId, payload).catch((error) => {
            this.log.error(`Lookup addresses for station ${this.rawStation.station_sn} - Error:`, error);
        });
    }

    private lookupByAddress3(address: Address, origAddress: Address, data: Buffer): void {
        // Send lookup message3
        const msgId = RequestMessageType.LOOKUP_WITH_KEY3;
        const payload = buildLookupWithKeyPayload3(this.rawStation.p2p_did, origAddress, data);
        sendMessage(this.socket, address, msgId, payload).catch((error) => {
            this.log.error(`Lookup addresses for station ${this.rawStation.station_sn} - Error:`, error);
        });
    }

    public isConnected(): boolean {
        return this.connected;
    }

    private _startConnectTimeout(): void {
        if (this.connectTimeout === undefined)
            this.connectTimeout = setTimeout(() => {
                this.log.warn(`Station ${this.rawStation.station_sn} - Tried all hosts, no connection could be established`);
                this._disconnected();
            }, this.MAX_AKNOWLEDGE_TIMEOUT);
    }

    private _connect(address: Address): void {
        this.log.debug(`Station ${this.rawStation.station_sn} - CHECK_CAM - Connecting to host ${address.host} on port ${address.port}...`);
        for (let i = 0; i < 4; i++)
            this.sendCamCheck(address);

        this._startConnectTimeout();
    }

    public async connect(): Promise<void> {
        if (!this.connected && !this.connecting && this.rawStation.p2p_did !== undefined) {
            this.connecting = true;
            this.terminating = false;
            await this.renewDSKKey();
            if (!this.binded)
                this.socket.bind(0, () => {
                    this.binded = true;
                    try {
                        this.socket.setRecvBufferSize(this.UDP_RECVBUFFERSIZE_BYTES);
                    } catch (error) {
                        this.log.error(`Station ${this.rawStation.station_sn} - Error:`, { error: error, currentRecBufferSize: this.socket.getRecvBufferSize(), recBufferRequestedSize: this.UDP_RECVBUFFERSIZE_BYTES });
                    }
                    this.lookup();
                });
            else
                this.lookup();
        }
    }

    private sendCamCheck(address: Address): void {
        const payload = buildCheckCamPayload(this.rawStation.p2p_did);
        sendMessage(this.socket, address, RequestMessageType.CHECK_CAM, payload).catch((error) => {
            this.log.error(`Send cam check to station ${this.rawStation.station_sn} - Error:`, error);
        });
    }

    private sendCamCheck2(address: Address, data: Buffer): void {
        const payload = buildCheckCamPayload2(this.rawStation.p2p_did, data);
        sendMessage(this.socket, address, RequestMessageType.CHECK_CAM2, payload).catch((error) => {
            this.log.error(`Send cam check to station ${this.rawStation.station_sn} - Error:`, error);
        });
    }

    public sendPing(address: Address): void {
        if ((this.lastPong && ((new Date().getTime() - this.lastPong) / this.getHeartbeatInterval() >= this.MAX_RETRIES)) ||
            (this.connectTime && !this.lastPong && ((new Date().getTime() - this.connectTime) / this.getHeartbeatInterval() >= this.MAX_RETRIES))) {
            if (!this.energySavingDevice)
                this.log.warn(`Station ${this.rawStation.station_sn} - Heartbeat check failed. Connection seems lost. Try to reconnect...`);
            this._disconnected();
        }
        sendMessage(this.socket, address, RequestMessageType.PING).catch((error) => {
            this.log.error(`Station ${this.rawStation.station_sn} - Error:`, error);
        });
    }

    //public sendCommandWithIntString(commandType: CommandType, value: number, valueSub = 0, strValue = "", strValueSub = "", channel = 0): void {
    public sendCommandWithIntString(p2pcommand: P2PCommand, property?: PropertyData): void {
        if (p2pcommand.channel === undefined)
            p2pcommand.channel = 0;
        if (p2pcommand.value === undefined || typeof p2pcommand.value !== "number")
            throw new TypeError("value must be a number");

        const payload = buildIntStringCommandPayload(p2pcommand.value, p2pcommand.valueSub === undefined ? 0 : p2pcommand.valueSub, p2pcommand.strValue === undefined ? "" : p2pcommand.strValue , p2pcommand.strValueSub === undefined ? "" : p2pcommand.strValueSub, p2pcommand.channel);
        if (p2pcommand.commandType === CommandType.CMD_NAS_TEST) {
            this.currentMessageState[P2PDataType.DATA].rtspStream[p2pcommand.channel] = p2pcommand.value === 1 ? true : false;
        }
        this.sendCommand(p2pcommand.commandType, payload, p2pcommand.channel, undefined, property);
    }

    //public sendCommandWithInt(commandType: CommandType, value: number, strValue = "", channel = 255): void {
    public sendCommandWithInt(p2pcommand: P2PCommand, property?: PropertyData): void {
        if (p2pcommand.channel === undefined)
            p2pcommand.channel = 255;
        if (p2pcommand.value === undefined || typeof p2pcommand.value !== "number")
            throw new TypeError("value must be a number");

        const payload = buildIntCommandPayload(p2pcommand.value, p2pcommand.strValue === undefined ? "" : p2pcommand.strValue, p2pcommand.channel);
        this.sendCommand(p2pcommand.commandType, payload, p2pcommand.channel, undefined, property);
    }

    //public sendCommandWithStringPayload(commandType: CommandType, value: string, channel = 0): void {
    public sendCommandWithStringPayload(p2pcommand: P2PCommand, property?: PropertyData): void {
        if (p2pcommand.channel === undefined)
            p2pcommand.channel = 0;
        if (p2pcommand.value === undefined || typeof p2pcommand.value !== "string")
            throw new TypeError("value must be a string");

        const payload = buildCommandWithStringTypePayload(p2pcommand.value, p2pcommand.channel);
        let nested_commandType = undefined;

        if (p2pcommand.commandType == CommandType.CMD_SET_PAYLOAD) {
            try {
                const json = JSON.parse(p2pcommand.value);
                nested_commandType = json.cmd;
            } catch (error) {
                this.log.error(`CMD_SET_PAYLOAD - Station ${this.rawStation.station_sn} - Error:`, error);
            }
        } else if (p2pcommand.commandType == CommandType.CMD_DOORBELL_SET_PAYLOAD) {
            try {
                const json = JSON.parse(p2pcommand.value);
                nested_commandType = json.commandType;
            } catch (error) {
                this.log.error(`CMD_DOORBELL_SET_PAYLOAD - Station ${this.rawStation.station_sn} - Error:`, error);
            }
        }

        this.sendCommand(p2pcommand.commandType, payload, p2pcommand.channel, nested_commandType, property);
    }

    //public sendCommandWithString(commandType: CommandType, strValue: string, strValueSub:string, channel = 255): void {
    public sendCommandWithString(p2pcommand: P2PCommand, property?: PropertyData): void {
        if (p2pcommand.channel === undefined)
            p2pcommand.channel = 255;
        if (p2pcommand.strValue === undefined)
            throw new TypeError("strValue must be defined");
        if (p2pcommand.strValueSub === undefined)
            throw new TypeError("strValueSub must be defined");

        const payload = buildStringTypeCommandPayload(p2pcommand.strValue, p2pcommand.strValueSub, p2pcommand.channel);
        this.sendCommand(p2pcommand.commandType, payload, p2pcommand.channel, p2pcommand.commandType, property);
    }

    public sendCommandPing(channel = 255): void {
        const payload = buildVoidCommandPayload(channel);
        this.sendCommand(CommandType.CMD_PING, payload, channel);
    }

    public sendCommandDevicePing(channel = 255): void {
        const payload = buildVoidCommandPayload(channel);
        this.sendCommand(CommandType.CMD_GET_DEVICE_PING, payload, channel);
    }

    public sendCommandWithoutData(commandType: CommandType, channel = 255): void {
        const payload = buildVoidCommandPayload(channel);
        this.sendCommand(commandType, payload, channel);
    }

    private sendQueuedMessage(): void {
        if (this.sendQueue.length > 0 && this.connected) {
            let queuedMessage: P2PQueueMessage;
            while ((queuedMessage = this.sendQueue.shift()!) !== undefined) {
                let exists = false;
                this.messageStates.forEach(stateMessage => {
                    if (stateMessage.commandType === queuedMessage.commandType) {
                        exists = true;
                    }
                });
                if (!exists) {
                    this._sendCommand(queuedMessage);
                } else {
                    this.sendQueue.unshift(queuedMessage);
                    break;
                }
            }
        } else if (!this.connected) {
            this.connect();
        }
    }

    private sendCommand(commandType: CommandType, payload: Buffer, channel: number, nestedCommandType?: CommandType, property?: PropertyData): void {
        const message: P2PQueueMessage = {
            commandType: commandType,
            nestedCommandType: nestedCommandType,
            channel: channel,
            payload: payload,
            timestamp: +new Date,
            property: property
        };
        this.sendQueue.push(message);
        if (message.commandType !== CommandType.CMD_PING && message.commandType !== CommandType.CMD_GET_DEVICE_PING)
            this._clearESDDisconnectTimeout();
        this.sendQueuedMessage();
    }

    private _sendCommand(message: P2PMessageState|P2PQueueMessage):void {
        if (isP2PQueueMessage(message)) {
            const ageing = +new Date - message.timestamp;
            if (ageing <= this.MAX_COMMAND_QUEUE_TIMEOUT) {
                const commandHeader = buildCommandHeader(this.seqNumber, message.commandType);
                const data = Buffer.concat([commandHeader, message.payload]);
                const messageState: P2PMessageState = {
                    sequence: this.seqNumber,
                    commandType: message.commandType,
                    nestedCommandType: message.nestedCommandType,
                    channel: message.channel,
                    data: data,
                    retries: 0,
                    acknowledged: false,
                    returnCode: ErrorCode.ERROR_COMMAND_TIMEOUT,
                    property: message.property
                };
                message = messageState;
                this.seqNumber = this._incrementSequence(this.seqNumber);
            } else if (message.commandType === CommandType.CMD_PING || message.commandType === CommandType.CMD_GET_DEVICE_PING) {
                return;
            } else {
                this.log.warn(`Station ${this.rawStation.station_sn} - Command aged out from queue`, { commandType: message.commandType, nestedCommandType: message.nestedCommandType, channel: message.channel, ageing: ageing, maxAgeing: this.MAX_COMMAND_QUEUE_TIMEOUT });
                this.emit("command", {
                    command_type: message.nestedCommandType !== undefined ? message.nestedCommandType : message.commandType,
                    channel: message.channel,
                    return_code: ErrorCode.ERROR_CONNECT_TIMEOUT,
                    property: message.property
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
                this.log.error(`Station ${this.rawStation.station_sn} - Max retries ${this.messageStates.get(message.sequence)?.retries} - stop with error ${ErrorCode[message.returnCode]}`, { sequence: message.sequence, commandType: message.commandType, channel: message.channel, retries: message.retries, returnCode: message.returnCode });
                this.emit("command", {
                    command_type: message.nestedCommandType !== undefined ? message.nestedCommandType : message.commandType,
                    channel: message.channel,
                    return_code: message.returnCode,
                    property: message.property
                } as CommandResult);
                this.messageStates.delete(message.sequence);
                this.sendQueuedMessage();
                return;
            }
        }

        message = message as P2PMessageState;
        message.returnCode = ErrorCode.ERROR_COMMAND_TIMEOUT;
        message.timeout = setTimeout(() => {
            this._sendCommand(message);
        }, this.MAX_AKNOWLEDGE_TIMEOUT);
        this.messageStates.set(message.sequence, message);

        if (message.commandType !== CommandType.CMD_PING && this.energySavingDevice) {
            this.energySavingDeviceP2PSeqMapping.set(this.energySavingDeviceP2PDataSeqNumber, message.sequence);
            this.log.debug(`Station ${this.rawStation.station_sn} - Energy saving Device - Added sequence number mapping`, { commandType: message.commandType, seqNumber: message.sequence, energySavingDeviceP2PDataSeqNumber: this.energySavingDeviceP2PDataSeqNumber, energySavingDeviceP2PSeqMappingCount: this.energySavingDeviceP2PSeqMapping.size });
            this.energySavingDeviceP2PDataSeqNumber = this._incrementSequence(this.energySavingDeviceP2PDataSeqNumber);
        }

        this.log.debug("Sending p2p command...", { station: this.rawStation.station_sn, sequence: message.sequence, commandType: message.commandType, channel: message.channel, retries: message.retries, messageStatesSize: this.messageStates.size });
        sendMessage(this.socket, this.connectAddress!, RequestMessageType.DATA, message.data).catch((error) => {
            this.log.error(`Station ${this.rawStation.station_sn} - Error:`, error);
        });

        if (message.retries === 0) {
            if (message.commandType === CommandType.CMD_START_REALTIME_MEDIA ||
                (message.nestedCommandType !== undefined && message.nestedCommandType === CommandType.CMD_START_REALTIME_MEDIA && message.commandType === CommandType.CMD_SET_PAYLOAD) ||
                message.commandType === CommandType.CMD_RECORD_VIEW ||
                (message.nestedCommandType !== undefined && message.nestedCommandType === 1000 && message.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD)
            ) {
                if (this.currentMessageState[P2PDataType.VIDEO].p2pStreaming && message.channel !== this.currentMessageState[P2PDataType.VIDEO].p2pStreamChannel) {
                    this.endStream(P2PDataType.VIDEO)
                }
                this.currentMessageState[P2PDataType.VIDEO].p2pStreaming = true;
                this.currentMessageState[P2PDataType.VIDEO].p2pStreamChannel = message.channel;
            } else if (message.commandType === CommandType.CMD_DOWNLOAD_VIDEO) {
                if (this.currentMessageState[P2PDataType.BINARY].p2pStreaming && message.channel !== this.currentMessageState[P2PDataType.BINARY].p2pStreamChannel) {
                    this.endStream(P2PDataType.BINARY)
                }
                this.currentMessageState[P2PDataType.BINARY].p2pStreaming = true;
                this.currentMessageState[P2PDataType.BINARY].p2pStreamChannel = message.channel;
            } else if (message.commandType === CommandType.CMD_STOP_REALTIME_MEDIA) { //TODO: CommandType.CMD_RECORD_PLAY_CTRL only if stop
                this.endStream(P2PDataType.VIDEO);
            } else if (message.commandType === CommandType.CMD_DOWNLOAD_CANCEL) {
                this.endStream(P2PDataType.BINARY);
            } else if (message.commandType === CommandType.CMD_NAS_TEST) {
                if (this.currentMessageState[P2PDataType.DATA].rtspStream[message.channel]) {
                    this.currentMessageState[P2PDataType.DATA].rtspStreaming[message.channel] = true;
                    this.emit("rtsp livestream started", message.channel);
                } else {
                    this.endRTSPStream(message.channel);
                }
            }
        }
    }

    private handleMsg(msg: Buffer, rinfo: RemoteInfo): void {
        if (hasHeader(msg, ResponseMessageType.LOOKUP_ADDR)) {
            const port = msg.slice(6, 8).readUInt16LE();
            const ip = `${msg[11]}.${msg[10]}.${msg[9]}.${msg[8]}`;

            this.log.debug(`Station ${this.rawStation.station_sn} - LOOKUP_ADDR - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { ip: ip, port: port }});

            if (ip === "0.0.0.0") {
                this.log.debug(`Station ${this.rawStation.station_sn} - LOOKUP_ADDR - Got invalid ip address 0.0.0.0, ignoring response...`);
                return;
            }
            if (!this.connected) {
                if (this.connectionType === P2PConnectionType.ONLY_LOCAL) {
                    if (isPrivateIp(ip)) {
                        this._clearLookupTimeout();
                        this._clearLookupRetryTimeout();
                        this.log.debug(`Station ${this.rawStation.station_sn} - ONLY_LOCAL - Try to connect to ${ip}:${port}...`);
                        this._connect({ host: ip, port: port });
                    }
                } else if (this.connectionType === P2PConnectionType.QUICKEST) {
                    this._clearLookupTimeout();
                    this._clearLookupRetryTimeout();
                    this.log.debug(`Station ${this.rawStation.station_sn} - QUICKEST - Try to connect to ${ip}:${port}...`);
                    this._connect({ host: ip, port: port });
                }

            } else {

            }
        } else if (hasHeader(msg, ResponseMessageType.CAM_ID) || hasHeader(msg, ResponseMessageType.CAM_ID2)) {
            // Answer from the device to a CAM_CHECK message
            if (!this.connected) {
                this.log.debug(`Station ${this.rawStation.station_sn} - CAM_ID - Connected to station ${this.rawStation.station_sn} on host ${rinfo.address} port ${rinfo.port}`);
                this._clearLookupRetryTimeout();
                this._clearLookupTimeout();
                this._clearConnectTimeout();
                this.connected = true;
                this.connectTime = new Date().getTime();
                this.lastPong = null;

                this.connectAddress = { host: rinfo.address, port: rinfo.port };

                this.heartbeatTimeout = setTimeout(() => {
                    this.scheduleHeartbeat();
                }, this.getHeartbeatInterval());

                if (this.energySavingDevice) {
                    this.keepaliveTimeout = setTimeout(() => {
                        this.scheduleP2PKeepalive();
                    }, this.KEEPALIVE_INTERVAL);
                }

                this.emit("connect", this.connectAddress);

                if (Device.isLockWifi(this.rawStation.device_type) || Device.isLockWifiNoFinger(this.rawStation.device_type)) {
                    const tmpSendQueue: Array<P2PQueueMessage> = [ ...this.sendQueue ];
                    this.sendQueue = [];
                    this.sendCommandWithoutData(CommandType.CMD_GATEWAYINFO, 255);
                    this.sendCommandWithStringPayload({
                        commandType: CommandType.CMD_SET_PAYLOAD,
                        value: JSON.stringify({
                            "account_id": this.rawStation.member.admin_user_id,
                            "cmd": CommandType.P2P_QUERY_STATUS_IN_LOCK,
                            "mChannel": 0,
                            "mValue3": 0,
                            "payload": {
                                "timezone": this.rawStation.time_zone === undefined || this.rawStation.time_zone === "" ? getAdvancedLockTimezone(this.rawStation.station_sn) : this.rawStation.time_zone,
                            }}),
                        channel: 0
                    } as P2PCommand);
                    tmpSendQueue.forEach(element => {
                        this.sendQueue.push(element);
                    });
                }
                this.sendQueuedMessage();
            } else {
                this.log.debug(`Station ${this.rawStation.station_sn} - CAM_ID - Already connected, ignoring...`);
            }
        } else if (hasHeader(msg, ResponseMessageType.PONG)) {
            // Response to a ping from our side
            this.lastPong = new Date().getTime();
            return;
        } else if (hasHeader(msg, ResponseMessageType.PING)) {
            // Response with PONG to keep alive
            sendMessage(this.socket, { host: rinfo.address, port: rinfo.port }, RequestMessageType.PONG).catch((error) => {
                this.log.error(`Station ${this.rawStation.station_sn} - Error:`, error);
            });
            return;
        } else if (hasHeader(msg, ResponseMessageType.END)) {
            // Connection is closed by device
            this.log.debug(`Station ${this.rawStation.station_sn} - END - received from host ${rinfo.address}:${rinfo.port}`);
            //this._disconnected();
            this.onClose();
            return;
        } else if (hasHeader(msg, ResponseMessageType.ACK)) {
            // Device ACK a message from our side
            // Number of Acks sended in the message

            const dataTypeBuffer = msg.slice(4, 6);
            const dataType = this.getDataType(dataTypeBuffer);
            const numAcksBuffer = msg.slice(6, 8);
            const numAcks = numAcksBuffer.readUIntBE(0, numAcksBuffer.length);
            for (let i = 1; i <= numAcks; i++) {
                const idx = 6 + i * 2;
                const seqBuffer = msg.slice(idx, idx + 2);
                const ackedSeqNo = seqBuffer.readUIntBE(0, seqBuffer.length);
                // -> Message with seqNo was received at the station
                this.log.debug(`Station ${this.rawStation.station_sn} - ACK ${P2PDataType[dataType]} - received from host ${rinfo.address}:${rinfo.port} for sequence ${ackedSeqNo}`);
                if (dataType === P2PDataType.DATA) {
                    const msg_state = this.messageStates.get(ackedSeqNo);
                    if (msg_state && !msg_state.acknowledged) {
                        this._clearTimeout(msg_state.timeout);
                        if (msg_state.commandType === CommandType.CMD_PING || msg_state.commandType === CommandType.CMD_GET_DEVICE_PING) {
                            this.messageStates.delete(ackedSeqNo);
                        } else {
                            msg_state.acknowledged = true;
                            msg_state.timeout = setTimeout(() => {
                                //TODO: Retry command in these case?
                                this.log.warn(`Station ${this.rawStation.station_sn} - Result data for command not received`, { message: { sequence: msg_state.sequence, commandType: msg_state.commandType, nestedCommandType: msg_state.nestedCommandType, channel: msg_state.channel, acknowledged: msg_state.acknowledged, retries: msg_state.retries, returnCode: msg_state.returnCode, data: msg_state.data } });
                                this.messageStates.delete(ackedSeqNo);
                                this.emit("command", {
                                    command_type: msg_state.nestedCommandType !== undefined ? msg_state.nestedCommandType : msg_state.commandType,
                                    channel: msg_state.channel,
                                    return_code: ErrorCode.ERROR_COMMAND_TIMEOUT,
                                    property: msg_state.property
                                } as CommandResult);
                                this.sendQueuedMessage();
                                this.closeEnergySavingDevice();
                            }, this.MAX_COMMAND_RESULT_WAIT);
                            this.messageStates.set(ackedSeqNo, msg_state);
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
                const seqNo = msg.slice(6, 8).readUInt16BE();
                const dataTypeBuffer = msg.slice(4, 6);
                const dataType = this.getDataType(dataTypeBuffer);

                const message: P2PMessage = {
                    bytesToRead: msg.slice(2, 4).readUInt16BE(),
                    type: dataType,
                    seqNo: seqNo,
                    data: msg.slice(8)
                };

                this.sendAck({ host: rinfo.address, port: rinfo.port}, dataTypeBuffer, seqNo);
                this.log.debug(`Station ${this.rawStation.station_sn} - DATA ${P2PDataType[message.type]} - received from host ${rinfo.address}:${rinfo.port} - Processing sequence ${message.seqNo}...`);

                if (message.seqNo === this.expectedSeqNo[dataType]) {
                    // expected seq packet arrived

                    const timeout = this.currentMessageState[dataType].waitForSeqNoTimeout;
                    if (!!timeout) {
                        clearTimeout(timeout);
                        this.currentMessageState[dataType].waitForSeqNoTimeout = undefined;
                    }

                    this.expectedSeqNo[dataType] = this._incrementSequence(this.expectedSeqNo[dataType]);
                    this.parseDataMessage(message);

                    this.log.debug(`Station ${this.rawStation.station_sn} - DATA ${P2PDataType[message.type]} - Received expected sequence (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);

                    for (const element of this.currentMessageState[dataType].queuedData.values()) {
                        if (this.expectedSeqNo[dataType] === element.seqNo) {
                            this.log.debug(`Station ${this.rawStation.station_sn} - DATA ${P2PDataType[element.type]} - Work off queued data (seqNo: ${element.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                            this.expectedSeqNo[dataType]++;
                            this.parseDataMessage(element);
                            this.currentMessageState[dataType].queuedData.delete(element.seqNo);
                        } else {
                            this.log.debug(`Station ${this.rawStation.station_sn} - DATA ${P2PDataType[element.type]} - Work off missing data interrupt queue dismantle (seqNo: ${element.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                            break;
                        }
                    }
                } else if (this.expectedSeqNo[dataType] > message.seqNo) {
                    // We have already seen this message, skip!
                    // This can happen because the device is sending the message till it gets a ACK
                    // which can take some time.
                    this.log.debug(`Station ${this.rawStation.station_sn} - DATA ${P2PDataType[message.type]} - Received already processed sequence (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                    return;
                } else {
                    if (!this.currentMessageState[dataType].waitForSeqNoTimeout)
                        this.currentMessageState[dataType].waitForSeqNoTimeout = setTimeout(() => {
                            //TODO: End stream doesn't stop device for sending video and audio data
                            this.endStream(dataType);
                            this.currentMessageState[dataType].waitForSeqNoTimeout = undefined;
                        }, this.MAX_EXPECTED_SEQNO_WAIT);

                    if (!this.currentMessageState[dataType].queuedData.get(message.seqNo)) {
                        this.currentMessageState[dataType].queuedData.set(message.seqNo, message);
                        this.log.debug(`Station ${this.rawStation.station_sn} - DATA ${P2PDataType[message.type]} - Received not expected sequence, added to the queue for future processing (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                    } else {
                        this.log.debug(`Station ${this.rawStation.station_sn} - DATA ${P2PDataType[message.type]} - Received not expected sequence, discarded since already present in queue for future processing (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                    }
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.LOOKUP_ADDR2)) {
            if (!this.connected) {
                const port = msg.slice(6, 8).readUInt16LE();
                const ip = `${msg[11]}.${msg[10]}.${msg[9]}.${msg[8]}`;
                const data = msg.slice(20, 24);

                this._clearLookupTimeout();
                this._clearLookupRetryTimeout();

                this.log.debug(`Station ${this.rawStation.station_sn} - LOOKUP_ADDR2 - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { ip: ip, port: port, data: data.toString("hex") }});
                this.log.debug(`Station ${this.rawStation.station_sn} - CHECK_CAM2 - Connecting to host ${ip} on port ${port}...`);

                for (let i = 0; i < 4; i++)
                    this.sendCamCheck2({ host: ip, port: port }, data);

                this._startConnectTimeout();

                sendMessage(this.socket, { host: ip, port: port }, RequestMessageType.UNKNOWN_70).catch((error) => {
                    this.log.error(`Station ${this.rawStation.station_sn} - UNKNOWN_70 - Error:`, error);
                });
            }
        } else if (hasHeader(msg, ResponseMessageType.UNKNOWN_71)) {
            if (!this.connected) {
                this.log.debug(`Station ${this.rawStation.station_sn} - UNKNOWN_71 - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { message: msg.toString("hex"), length: msg.length }});

                sendMessage(this.socket, { host: rinfo.address, port: rinfo.port }, RequestMessageType.UNKNOWN_71).catch((error) => {
                    this.log.error(`Station ${this.rawStation.station_sn} - UNKNOWN_71 - Error:`, error);
                });
            }
        } else if (hasHeader(msg, ResponseMessageType.UNKNOWN_73)) {
            if (!this.connected) {
                const port = msg.slice(8, 10).readUInt16BE();
                const data = msg.slice(4, 8);

                this.log.debug(`Station ${this.rawStation.station_sn} - UNKNOWN_73 - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { port: port, data: data.toString("hex") }});

                this.lookup2({ host: rinfo.address, port: port }, data);
            }
        } else if (hasHeader(msg, ResponseMessageType.UNKNOWN_81) || hasHeader(msg, ResponseMessageType.UNKNOWN_83)) {
            // Do nothing / ignore
        } else if (hasHeader(msg, ResponseMessageType.LOOKUP_RESP)) {
            if (!this.connected) {
                const responseCode = msg.slice(4, 6).readUInt16LE();

                this.log.debug(`Station ${this.rawStation.station_sn} - LOOKUP_RESP - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { responseCode: responseCode }});

                if (responseCode !== 0 && this.lookupTimeout !== undefined && this.lookupRetryTimeout === undefined) {
                    this.lookupRetryTimeout = setTimeout(() => {
                        this.lookupRetryTimeout = undefined;
                        this.cloudAddresses.map((address) => this.lookupByAddress(address));
                    }, this.LOOKUP_RETRY_TIMEOUT);
                }
            }
        } else {
            this.log.debug(`Station ${this.rawStation.station_sn} - received unknown message`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { message: msg.toString("hex"), length: msg.length }});
        }
    }

    private parseDataMessage(message: P2PMessage): void {
        if ((message.type === P2PDataType.BINARY || message.type === P2PDataType.VIDEO) && !this.currentMessageState[message.type].p2pStreaming) {
            this.log.debug(`Station ${this.rawStation.station_sn} - DATA ${P2PDataType[message.type]} - Stream not started ignore this data`, {seqNo: message.seqNo, header: this.currentMessageBuilder[message.type].header, bytesRead: this.currentMessageBuilder[message.type].bytesRead, bytesToRead: this.currentMessageBuilder[message.type].header.bytesToRead, messageSize: message.data.length });
        } else {
            if (this.currentMessageState[message.type].leftoverData.length > 0) {
                message.data = Buffer.concat([this.currentMessageState[message.type].leftoverData, message.data]);
                this.currentMessageState[message.type].leftoverData = Buffer.from([]);
            }

            let data = message.data;
            do {
                // is this the first message?
                const firstPartMessage = data.slice(0, 4).toString() === MAGIC_WORD;

                if (firstPartMessage) {
                    const header: P2PDataHeader = {
                        commandId: 0,
                        bytesToRead: 0,
                        channel: 0,
                        signCode: 0,
                        type: 0
                    };
                    header.commandId = data.slice(4, 6).readUIntLE(0, 2);
                    header.bytesToRead = data.slice(6, 10).readUIntLE(0, 4);
                    header.channel = data.slice(12, 13).readUInt8();
                    header.signCode = data.slice(13, 14).readInt8();
                    header.type = data.slice(14, 15).readUInt8();

                    this.currentMessageBuilder[message.type].header = header;

                    data = data.slice(this.P2P_DATA_HEADER_BYTES);

                    if (data.length >= header.bytesToRead) {
                        const payload = data.slice(0, header.bytesToRead);
                        this.currentMessageBuilder[message.type].messages[message.seqNo] = payload;
                        this.currentMessageBuilder[message.type].bytesRead = payload.byteLength;

                        data = data.slice(header.bytesToRead);
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
                        const payload = data.slice(0, this.currentMessageBuilder[message.type].header.bytesToRead - this.currentMessageBuilder[message.type].bytesRead);
                        this.currentMessageBuilder[message.type].messages[message.seqNo] = payload;
                        this.currentMessageBuilder[message.type].bytesRead += payload.byteLength;

                        data = data.slice(payload.byteLength);
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
                this.log.debug(`Station ${this.rawStation.station_sn} - Received data`, { seqNo: message.seqNo, header: this.currentMessageBuilder[message.type].header, bytesRead: this.currentMessageBuilder[message.type].bytesRead, bytesToRead: this.currentMessageBuilder[message.type].header.bytesToRead, firstPartMessage: firstPartMessage, messageSize: message.data.length });
                if (this.currentMessageBuilder[message.type].bytesRead === this.currentMessageBuilder[message.type].header.bytesToRead) {
                    const completeMessage = sortP2PMessageParts(this.currentMessageBuilder[message.type].messages);
                    const data_message: P2PDataMessage = {
                        ...this.currentMessageBuilder[message.type].header,
                        //TODO: Check if this is the correct approach
                        seqNo: message.seqNo,
                        dataType: message.type,
                        data: completeMessage
                    }
                    this.handleData(data_message);
                    this.initializeMessageBuilder(message.type);
                }
            } while (data.length > 0)
        }
    }

    private handleData(message: P2PDataMessage): void {
        if (message.dataType === P2PDataType.CONTROL) {
            this.handleDataControl(message);
        } else if (message.dataType === P2PDataType.DATA) {
            const commandStr = CommandType[message.commandId];
            const result_msg = message.type === 1 ? true : false;

            if (result_msg) {
                const return_code = message.data.slice(0, 4).readUInt32LE()|0;
                const return_msg = message.data.slice(4, 4 + 128).toString();

                const error_codeStr = ErrorCode[return_code];

                this.log.debug(`Station ${this.rawStation.station_sn} - Received data`, { commandIdName: commandStr, commandId: message.commandId, resultCodeName: error_codeStr, resultCode: return_code, message: return_msg, data: message.data.toString("hex") });

                let msg_state = this.messageStates.get(message.seqNo);
                if (!msg_state && this.energySavingDevice) {
                    const goodSeqNumber = this.energySavingDeviceP2PSeqMapping.get(message.seqNo);
                    if (goodSeqNumber) {
                        this.energySavingDeviceP2PSeqMapping.delete(message.seqNo);
                        msg_state = this.messageStates.get(goodSeqNumber);
                        this.log.debug(`Station ${this.rawStation.station_sn} - Energy saving Device - Result data received - Detecting correct sequence number`, { commandIdName: commandStr, commandId: message.commandId, seqNumber: message.seqNo, newSeqNumber: goodSeqNumber, energySavingDeviceP2PSeqMappingCount: this.energySavingDeviceP2PSeqMapping.size });
                        message.seqNo = goodSeqNumber;
                    }
                }

                if (msg_state) {
                    if (msg_state.commandType === message.commandId) {
                        this._clearTimeout(msg_state.timeout);
                        const command_type =  msg_state.nestedCommandType !== undefined ? msg_state.nestedCommandType : msg_state.commandType;
                        this.log.debug(`Station ${this.rawStation.station_sn} - Result data for command received`, { messageState: msg_state, resultCodeName: error_codeStr, resultCode: return_code });
                        if (return_code === ErrorCode.ERROR_FAILED_TO_REQUEST) {
                            msg_state.returnCode = return_code;
                            this._sendCommand(msg_state);
                        } else {
                            this.emit("command", {
                                command_type: command_type,
                                channel: msg_state.channel,
                                return_code: return_code,
                                property: msg_state.property
                            } as CommandResult);
                            this.messageStates.delete(message.seqNo);
                            this.sendQueuedMessage();
                            this.closeEnergySavingDevice();

                            if (msg_state.commandType === CommandType.CMD_START_REALTIME_MEDIA ||
                                (msg_state.nestedCommandType !== undefined && msg_state.nestedCommandType === CommandType.CMD_START_REALTIME_MEDIA && msg_state.commandType === CommandType.CMD_SET_PAYLOAD) ||
                                msg_state.commandType === CommandType.CMD_RECORD_VIEW ||
                                (msg_state.nestedCommandType !== undefined && msg_state.nestedCommandType === 1000 && msg_state.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD)
                            ) {
                                this.waitForStreamData(P2PDataType.VIDEO);
                            } else if (msg_state.commandType === CommandType.CMD_DOWNLOAD_VIDEO) {
                                this.waitForStreamData(P2PDataType.BINARY);
                            } else if (msg_state.commandType === CommandType.CMD_START_TALKBACK || (msg_state.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD && msg_state.nestedCommandType === IndoorSoloSmartdropCommandType.CMD_START_SPEAK)) {
                                if (return_code === ErrorCode.ERROR_PPCS_SUCCESSFUL) {
                                    this.currentMessageState[message.dataType].p2pTalkback = true;
                                    this.currentMessageState[message.dataType].p2pTalkbackChannel = msg_state.channel;
                                    this.talkbackStream.startTalkback();
                                    this.emit("talkback started", msg_state.channel, this.talkbackStream);
                                } else if (return_code === ErrorCode.ERROR_NOT_FIND_DEV) {
                                    this.emit("talkback error", msg_state.channel, new TalkbackError(`Station ${this.rawStation.station_sn} channel ${msg_state.channel} someone is responding now.`));
                                } else if (return_code === ErrorCode.ERROR_DEV_BUSY) {
                                    this.emit("talkback error", msg_state.channel, new TalkbackError(`Station ${this.rawStation.station_sn} channel ${msg_state.channel} wait a second, device is busy.`));
                                } else {
                                    this.emit("talkback error", msg_state.channel, new TalkbackError(`Station ${this.rawStation.station_sn} channel ${msg_state.channel} connect failed please try again later.`));
                                }
                            } else if (msg_state.commandType === CommandType.CMD_STOP_TALKBACK || (msg_state.commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD && msg_state.nestedCommandType === IndoorSoloSmartdropCommandType.CMD_END_SPEAK)) {
                                this.currentMessageState[message.dataType].p2pTalkback = false;
                                this.currentMessageState[message.dataType].p2pTalkbackChannel = -1;
                                this.talkbackStream.stopTalkback();
                                this.emit("talkback stopped", msg_state.channel);
                            }
                        }
                    } else {
                        this.messageStates.delete(message.seqNo);
                        this.log.debug(`Station ${this.rawStation.station_sn} - dataType: ${P2PDataType[message.dataType]} commandtype and sequencenumber different!`, { msg_sequence: msg_state.sequence, msg_channel: msg_state.channel, msg_commandType: msg_state.commandType, message: message });
                        this.log.warn(`P2P protocol instability detected for station ${this.rawStation.station_sn}. Please reinitialise the connection to solve the problem!`);
                    }
                } else if (message.commandId !== CommandType.CMD_PING && message.commandId !== CommandType.CMD_GET_DEVICE_PING) {
                    this.log.debug(`Station ${this.rawStation.station_sn} - dataType: ${P2PDataType[message.dataType]} commandId: ${message.commandId} sequence: ${message.seqNo} not present!`);
                }
            } else {
                this.log.debug(`Station ${this.rawStation.station_sn} - Unsupported response`, { dataType: P2PDataType[message.dataType], commandIdName: commandStr, commandId: message.commandId, message: message.data.toString("hex") });
            }
        } else if (message.dataType === P2PDataType.VIDEO || message.dataType === P2PDataType.BINARY) {
            this.handleDataBinaryAndVideo(message);
        } else {
            this.log.debug(`Station ${this.rawStation.station_sn} - Not implemented data type`, { seqNo: message.seqNo, dataType: message.dataType, commandId: message.commandId, message: message.data.toString("hex") });
        }
    }

    private isIFrame(data: Buffer, isKeyFrame: boolean): boolean {
        if (this.rawStation.station_sn.startsWith("T8410") || this.rawStation.station_sn.startsWith("T8400") || this.rawStation.station_sn.startsWith("T8401") || this.rawStation.station_sn.startsWith("T8411") ||
            this.rawStation.station_sn.startsWith("T8202") || this.rawStation.station_sn.startsWith("T8422") || this.rawStation.station_sn.startsWith("T8424") || this.rawStation.station_sn.startsWith("T8423") ||
            this.rawStation.station_sn.startsWith("T8130") || this.rawStation.station_sn.startsWith("T8131") || this.rawStation.station_sn.startsWith("T8420") || this.rawStation.station_sn.startsWith("T8440") ||
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

    private waitForStreamData(dataType: P2PDataType): void {
        if (this.currentMessageState[dataType].p2pStreamingTimeout) {
            clearTimeout(this.currentMessageState[dataType].p2pStreamingTimeout!);
        }
        this.currentMessageState[dataType].p2pStreamingTimeout = setTimeout(() => {
            this.log.info(`Stopping the station stream for the device ${this.deviceSNs[this.currentMessageState[dataType].p2pStreamChannel]?.sn}, because we haven't received any data for ${this.MAX_STREAM_DATA_WAIT} seconds`);
            this.endStream(dataType);
        }, this.MAX_STREAM_DATA_WAIT);
    }

    private handleDataBinaryAndVideo(message: P2PDataMessage): void {
        if (!this.currentMessageState[message.dataType].invalidStream) {
            switch(message.commandId) {
                case CommandType.CMD_VIDEO_FRAME:
                    this.waitForStreamData(message.dataType);

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
                    const isKeyFrame = message.data.slice(4, 5).readUInt8() === 1 ? true : false;

                    videoMetaData.videoDataLength = message.data.slice(0, 4).readUInt32LE();
                    videoMetaData.streamType = message.data.slice(5, 6).readUInt8();
                    videoMetaData.videoSeqNo = message.data.slice(6, 8).readUInt16LE();
                    videoMetaData.videoFPS = message.data.slice(8, 10).readUInt16LE();
                    videoMetaData.videoWidth = message.data.slice(10, 12).readUInt16LE();
                    videoMetaData.videoHeight = message.data.slice(12, 14).readUInt16LE();
                    videoMetaData.videoTimestamp = message.data.slice(14, 20).readUIntLE(0, 6);

                    let payloadStart = 22;
                    if (message.signCode > 0 && data_length >= 128) {
                        const key = message.data.slice(22, 150);
                        const rsaKey = this.currentMessageState[message.dataType].rsaKey;
                        if (rsaKey) {
                            try {
                                videoMetaData.aesKey = rsaKey.decrypt(key).toString("hex");
                                this.log.debug(`Station ${this.rawStation.station_sn} - Decrypted AES key: ${videoMetaData.aesKey}`);
                            } catch (error) {
                                this.log.warn(`Station ${this.rawStation.station_sn} - AES key could not be decrypted! The entire stream is discarded. - Error:`, error);
                                this.currentMessageState[message.dataType].invalidStream = true;
                                this.emit("livestream error", message.channel, new LivestreamError(`Station ${this.rawStation.station_sn} AES key could not be decrypted! The entire stream is discarded.`));
                                return;
                            }
                        } else {
                            this.log.warn(`Station ${this.rawStation.station_sn} - Private RSA key is missing! Stream could not be decrypted. The entire stream is discarded.`);
                            this.currentMessageState[message.dataType].invalidStream = true;
                            this.emit("livestream error", message.channel, new LivestreamError(`Station ${this.rawStation.station_sn} private RSA key is missing! Stream could not be decrypted. The entire stream is discarded.`));
                            return;
                        }
                        payloadStart = 151;
                    }

                    let video_data: Buffer;
                    if (videoMetaData.aesKey !== "") {
                        const encrypted_data = message.data.slice(payloadStart, payloadStart + 128);
                        const unencrypted_data = message.data.slice(payloadStart + 128, payloadStart + videoMetaData.videoDataLength);
                        video_data = Buffer.concat([decryptAESData(videoMetaData.aesKey, encrypted_data), unencrypted_data]);
                    } else {
                        video_data = message.data.slice(payloadStart, payloadStart + videoMetaData.videoDataLength);
                    }

                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME`, { dataSize: message.data.length, metadata: videoMetaData, videoDataSize: video_data.length });

                    this.currentMessageState[message.dataType].p2pStreamMetadata.videoFPS = videoMetaData.videoFPS;
                    this.currentMessageState[message.dataType].p2pStreamMetadata.videoHeight = videoMetaData.videoHeight;
                    this.currentMessageState[message.dataType].p2pStreamMetadata.videoWidth = videoMetaData.videoWidth;

                    if (!this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived) {
                        if (this.rawStation.station_sn.startsWith("T8410") || this.rawStation.station_sn.startsWith("T8400") || this.rawStation.station_sn.startsWith("T8401") || this.rawStation.station_sn.startsWith("T8411") ||
                            this.rawStation.station_sn.startsWith("T8202") || this.rawStation.station_sn.startsWith("T8422") || this.rawStation.station_sn.startsWith("T8424") || this.rawStation.station_sn.startsWith("T8423") ||
                            this.rawStation.station_sn.startsWith("T8130") || this.rawStation.station_sn.startsWith("T8131") || this.rawStation.station_sn.startsWith("T8420") || this.rawStation.station_sn.startsWith("T8440") ||
                            this.rawStation.station_sn.startsWith("T8441") || this.rawStation.station_sn.startsWith("T8442") || checkT8420(this.rawStation.station_sn)) {
                            this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec = videoMetaData.streamType === 1 ? VideoCodec.H264 : videoMetaData.streamType === 2 ? VideoCodec.H265 : getVideoCodec(video_data);
                            this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME - Video codec information received from packet`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                        } else if (this.isIFrame(video_data, isKeyFrame)) {
                            this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec = getVideoCodec(video_data);
                            this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME - Video codec extracted from video data`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                        } else {
                            this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec = getVideoCodec(video_data);
                            if (this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec === VideoCodec.UNKNOWN) {
                                this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec = videoMetaData.streamType === 1 ? VideoCodec.H264 : videoMetaData.streamType === 2 ? VideoCodec.H265 : VideoCodec.UNKNOWN;
                                if (this.currentMessageState[message.dataType].p2pStreamMetadata.videoCodec === VideoCodec.UNKNOWN) {
                                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME - Unknown video codec`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                                } else {
                                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME - Fallback, using video codec information received from packet`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                                }
                            } else {
                                this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME - Fallback, video codec extracted from video data`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, metadata: videoMetaData });
                            }
                        }
                        this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived = true;
                        this.currentMessageState[message.dataType].waitForAudioData = setTimeout(() => {
                            this.currentMessageState[message.dataType].waitForAudioData = undefined;
                            this.currentMessageState[message.dataType].p2pStreamMetadata.audioCodec = AudioCodec.NONE;
                            this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived = true;
                            if (this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived && this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived) {
                                this.emitStreamStartEvent(message.dataType);
                            }
                        }, this.AUDIO_CODEC_ANALYZE_TIMEOUT);
                    }
                    if (this.currentMessageState[message.dataType].p2pStreamNotStarted) {
                        if (this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived && this.currentMessageState[message.dataType].p2pStreamFirstVideoDataReceived) {
                            this.emitStreamStartEvent(message.dataType);
                        }
                    }

                    if (message.dataType === P2PDataType.VIDEO) {
                        if (findStartCode(video_data)) {
                            this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME: startcode found`, { isKeyFrame: isKeyFrame, preFrameVideoDataLength: this.currentMessageState[message.dataType].preFrameVideoData.length });
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
                                this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME: Skipping because first frame is not an I frame.`);
                            }
                        } else {
                            this.log.debug(`Station ${this.rawStation.station_sn} - CMD_VIDEO_FRAME: No startcode found`, {isKeyFrame: isKeyFrame, preFrameVideoDataLength: this.currentMessageState[message.dataType].preFrameVideoData.length });
                            if (this.currentMessageState[message.dataType].preFrameVideoData.length > 0) {
                                this.currentMessageState[message.dataType].preFrameVideoData = Buffer.concat([this.currentMessageState[message.dataType].preFrameVideoData, video_data]);
                            }
                        }
                    } else if (message.dataType === P2PDataType.BINARY) {
                        this.currentMessageState[message.dataType].videoStream?.push(video_data);
                    }
                    break;
                case CommandType.CMD_AUDIO_FRAME:
                    this.waitForStreamData(message.dataType);

                    const audioMetaData: P2PDataMessageAudio = {
                        audioType: AudioCodec.NONE,
                        audioSeqNo: 0,
                        audioTimestamp: 0,
                        audioDataLength: 0
                    };

                    audioMetaData.audioDataLength = message.data.slice(0, 4).readUInt32LE();
                    audioMetaData.audioType = message.data.slice(5, 6).readUInt8();
                    audioMetaData.audioSeqNo = message.data.slice(6, 8).readUInt16LE();
                    audioMetaData.audioTimestamp = message.data.slice(8, 14).readUIntLE(0, 6);

                    const audio_data = Buffer.from(message.data.slice(16));
                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_AUDIO_FRAME`, { dataSize: message.data.length, metadata: audioMetaData, audioDataSize: audio_data.length });

                    if (!this.currentMessageState[message.dataType].p2pStreamFirstAudioDataReceived) {
                        if (this.currentMessageState[message.dataType].waitForAudioData !== undefined) {
                            clearTimeout(this.currentMessageState[message.dataType].waitForAudioData!);
                        }
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
                    this.log.debug(`Station ${this.rawStation.station_sn} - Not implemented message`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: message.data.toString("hex") });
                    break;
            }
        } else {
            this.log.debug(`Station ${this.rawStation.station_sn} - Invalid stream data, dropping complete stream`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: message.data.toString("hex") });
        }
    }

    private handleDataControl(message: P2PDataMessage): void {
        switch(message.commandId) {
            case CommandType.CMD_GET_ALARM_MODE:
                this.log.debug(`Station ${this.rawStation.station_sn} - Alarm mode changed to: ${AlarmMode[message.data.readUIntBE(0, 1)]}`);
                this.emit("alarm mode", message.data.readUIntBE(0, 1) as AlarmMode);
                break;
            case CommandType.CMD_CAMERA_INFO:
                try {
                    this.log.debug(`Station ${this.rawStation.station_sn} - Camera info`, { cameraInfo: message.data.toString() });
                    this.emit("camera info", JSON.parse(message.data.toString()) as CmdCameraInfoResponse);
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - Camera info - Error:`, error);
                }
                break;
            case CommandType.CMD_CONVERT_MP4_OK:
                const totalBytes = message.data.slice(1).readUInt32LE();
                this.log.debug(`Station ${this.rawStation.station_sn} - CMD_CONVERT_MP4_OK`, { channel: message.channel, totalBytes: totalBytes });
                this.downloadTotalBytes = totalBytes;
                this.currentMessageState[P2PDataType.BINARY].p2pStreaming = true;
                this.currentMessageState[P2PDataType.BINARY].p2pStreamChannel = message.channel;
                break;
            case CommandType.CMD_WIFI_CONFIG:
                const rssi = message.data.readInt32LE();
                this.log.debug(`Station ${this.rawStation.station_sn} - CMD_WIFI_CONFIG`, { channel: message.channel, rssi: rssi });
                this.emit("wifi rssi", message.channel, rssi);
                break;
            case CommandType.CMD_DOWNLOAD_FINISH:
                this.log.debug(`Station ${this.rawStation.station_sn} - CMD_DOWNLOAD_FINISH`, { channel: message.channel });
                this.endStream(P2PDataType.BINARY);
                break;
            case CommandType.CMD_DOORBELL_NOTIFY_PAYLOAD:
                try {
                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_DOORBELL_NOTIFY_PAYLOAD`, { payload: message.data.toString() });
                    //TODO: Finish implementation, emit an event...
                    //VDBStreamInfo (1005) and VoltageEvent (1015)
                    //this.emit("", JSON.parse(message.data.toString()) as xy);
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - CMD_DOORBELL_NOTIFY_PAYLOAD - Error:`, error);
                }
                break;
            case CommandType.CMD_NAS_SWITCH:
                try {
                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_NAS_SWITCH`, { payload: message.data.toString() });
                    this.emit("rtsp url", message.channel, message.data.toString("utf8", 0, message.data.indexOf("\0", 0, "utf8")));
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - CMD_NAS_SWITCH - Error:`, error);
                }
                break;
            case CommandType.SUB1G_REP_UNPLUG_POWER_LINE:
                try {
                    this.log.debug(`Station ${this.rawStation.station_sn} - SUB1G_REP_UNPLUG_POWER_LINE`, { payload: message.data.toString() });
                    const chargeType = message.data.slice(0, 4).readUInt32LE() as ChargingType;
                    const batteryLevel = message.data.slice(4, 8).readUInt32LE();
                    this.emit("charging state", message.channel, chargeType, batteryLevel);
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - SUB1G_REP_UNPLUG_POWER_LINE - Error:`, error);
                }
                break;
            case CommandType.SUB1G_REP_RUNTIME_STATE:
                try {
                    this.log.debug(`Station ${this.rawStation.station_sn} - SUB1G_REP_RUNTIME_STATE`, { payload: message.data.toString() });
                    const batteryLevel = message.data.slice(0, 4).readUInt32LE();
                    const temperature = message.data.slice(4, 8).readUInt32LE();
                    this.emit("runtime state", message.channel, batteryLevel, temperature);
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - SUB1G_REP_RUNTIME_STATE - Error:`, error);
                }
                break;
            case CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH:
                try {
                    const enabled = message.data.readUIntBE(0, 1) === 1 ? true : false;
                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_SET_FLOODLIGHT_MANUAL_SWITCH`, { enabled: enabled, payload: message.data.toString() });
                    this.emit("floodlight manual switch", message.channel, enabled);
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - CMD_SET_FLOODLIGHT_MANUAL_SWITCH - Error:`, error);
                }
                break;
            case CommandType.CMD_GET_DEVICE_PING:
                try {
                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_GET_DEVICE_PING`, { payload: message.data.toString() });
                    this.sendCommandDevicePing(message.channel);
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - CMD_GET_DEVICE_PING - Error:`, error);
                }
                break;
            case CommandType.CMD_NOTIFY_PAYLOAD:
                try {
                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_NOTIFY_PAYLOAD`, { payload: message.data.toString() });
                    const json: CmdNotifyPayload = JSON.parse(message.data.toString()) as CmdNotifyPayload;
                    if (this.rawStation.station_sn.startsWith("T8520")) {
                        //TODO: Implement notification payload or T8520
                        if (json.cmd === CommandType.P2P_ADD_PW || json.cmd === CommandType.P2P_QUERY_PW || json.cmd === CommandType.P2P_GET_LOCK_PARAM || json.cmd === CommandType.P2P_GET_USER_AND_PW_ID) {
                            // encrypted data
                            //TODO: Handle decryption of encrypted Data (AES) - For decryption use the cached aeskey used for sending the command!
                        } else if (json.cmd === CommandType.P2P_QUERY_STATUS_IN_LOCK) {
                            // Example: {"code":0,"slBattery":"82","slState":"4","trigger":2}
                            const payload: ESLAdvancedLockStatusNotification = json.payload as ESLAdvancedLockStatusNotification;
                            this.emit("esl parameter", message.channel, CommandType.CMD_SMARTLOCK_QUERY_BATTERY_LEVEL, payload.slBattery);
                            this.emit("esl parameter", message.channel, CommandType.CMD_SMARTLOCK_QUERY_STATUS, payload.slState);
                        } else {
                            this.log.debug(`Station ${this.rawStation.station_sn} - CMD_NOTIFY_PAYLOAD - Not implemented`, { commandIdName: CommandType[json.cmd], commandId: json.cmd, message: message.data.toString() });
                        }
                    } else if (json.cmd === CommandType.CMD_DOORLOCK_P2P_SEQ) {
                        const payload: ESLStationP2PThroughData = json.payload as ESLStationP2PThroughData;
                        switch (payload.lock_cmd) {
                            case 0:
                                if (payload.seq_num !== undefined) {
                                    this.lockSeqNumber = payload.seq_num;
                                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_NOTIFY_PAYLOAD - Lock sequence number`, { lockSeqNumber: this.lockSeqNumber });
                                }
                                break;
                            default:
                                this.log.debug(`Station ${this.rawStation.station_sn} - CMD_NOTIFY_PAYLOAD - Not implemented`, { message: message.data.toString() });
                                break;
                        }
                    } else if (json.cmd === CommandType.CMD_DOORLOCK_DATA_PASS_THROUGH) {
                        const payload: ESLStationP2PThroughData = json.payload as ESLStationP2PThroughData;
                        if (this.deviceSNs[message.channel] !== undefined) {
                            if (payload.lock_payload !== undefined) {
                                const decoded = decodeBase64(decodeLockPayload(Buffer.from(payload.lock_payload)));
                                const key = generateBasicLockAESKey(this.deviceSNs[message.channel].adminUserId, this.rawStation.station_sn);
                                const iv = getLockVectorBytes(this.rawStation.station_sn);

                                this.log.debug(`Station ${this.rawStation.station_sn} - CMD_DOORLOCK_DATA_PASS_THROUGH`, { commandIdName: CommandType[json.cmd], commandId: json.cmd, key: key, iv: iv, decoded: decoded.toString("hex") });

                                payload.lock_payload = decryptLockAESData(key, iv, decoded).toString("hex");

                                switch (payload.lock_cmd) {
                                    case ESLInnerCommand.NOTIFY:
                                        const notifyBuffer = Buffer.from(payload.lock_payload, "hex");
                                        this.emit("esl parameter", message.channel, CommandType.CMD_GET_BATTERY, notifyBuffer.slice(3, 4).readInt8().toString());
                                        this.emit("esl parameter", message.channel, CommandType.CMD_DOORLOCK_GET_STATE, notifyBuffer.slice(6, 7).readInt8().toString());
                                        break;
                                    default:
                                        this.log.debug(`Station ${this.rawStation.station_sn} - CMD_DOORLOCK_DATA_PASS_THROUGH - Not implemented`, { message: message.data.toString() });
                                        break;
                                }
                            }
                        }
                    } else {
                        this.log.debug(`Station ${this.rawStation.station_sn} - CMD_NOTIFY_PAYLOAD - Not implemented`, { commandIdName: CommandType[json.cmd], commandId: json.cmd, message: message.data.toString() });
                    }
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - CMD_NOTIFY_PAYLOAD Error:`, { error: error, payload: message.data.toString() });
                }
                break;
            case CommandType.CMD_GET_DELAY_ALARM:
                try {
                    this.log.debug(`Station ${this.rawStation.station_sn} - CMD_GET_DELAY_ALARM :`, { payload: message.data.toString("hex") });
                    //When the alarm is activated, CMD_GET_DELAY_ALARM is called with 0 data, so ignore it
                    if (message.data.readUIntBE(0, 1) !== 0) {
                        this.emit("alarm delay", message.data.readUIntBE(0, 1) as AlarmEvent, message.data.readUIntBE(4, 1));
                    }
                } catch (error) {
                    this.log.error(`Station ${this.rawStation.station_sn} - CMD_GET_DELAY_ALARM - Error:`, { error: error, payload: message.data.toString("hex") });
                }
                break;
            case CommandType.CMD_PING:
                // Ignore
                break;
            default:
                this.log.debug(`Station ${this.rawStation.station_sn} - Not implemented - CONTROL message`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: message.data.toString("hex") });
                break;
        }
    }

    private sendAck(address: Address, dataType: Buffer, seqNo: number): void {
        const num_pending_acks = 1;  // Max possible: 17 in one ack packet
        const pendingAcksBuffer = Buffer.allocUnsafe(2);
        pendingAcksBuffer.writeUInt16BE(num_pending_acks, 0);
        const seqBuffer = Buffer.allocUnsafe(2);
        seqBuffer.writeUInt16BE(seqNo, 0);
        const payload = Buffer.concat([dataType, pendingAcksBuffer, seqBuffer]);
        sendMessage(this.socket, address, RequestMessageType.ACK, payload).catch((error) => {
            this.log.error(`Station ${this.rawStation.station_sn} - Error:`, error);
        });
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
        this._clearLookupRetryTimeout();
        this._clearConnectTimeout();
        this._clearHeartbeatTimeout();
        this._clearMessageStateTimeouts();
        this._clearMessageVideoStateTimeouts();
        this.sendQueue = [];
        if (this.socket) {
            if (this.connected) {
                await sendMessage(this.socket, this.connectAddress!, RequestMessageType.END).catch((error) => {
                    this.log.error(`Station ${this.rawStation.station_sn} - Error`, error);
                });
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

    private onError(error: any): void {
        this.log.debug(`Station ${this.rawStation.station_sn} - Error:`, error);
    }

    private scheduleHeartbeat(): void {
        if (this.isConnected()) {
            this.sendPing(this.connectAddress!);
            this.heartbeatTimeout = setTimeout(() => {
                this.scheduleHeartbeat();
            }, this.getHeartbeatInterval());
        } else {
            this.log.debug(`Station ${this.rawStation.station_sn} - Heartbeat disabled!`);
        }
    }

    private scheduleP2PKeepalive(): void {
        if (this.isConnected()) {
            if (this.sendQueue.length === 0)
                this.sendCommandPing();
            this.keepaliveTimeout = setTimeout(() => {
                this.scheduleP2PKeepalive();
            }, this.KEEPALIVE_INTERVAL);
            this.closeEnergySavingDevice();
        } else {
            this.log.debug(`Station ${this.rawStation.station_sn} - p2p keepalive disabled!`);
        }
    }

    public setDownloadRSAPrivateKeyPem(pem: string): void {
        this.currentMessageState[P2PDataType.BINARY].rsaKey = getRSAPrivateKey(pem);
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

    private endStream(datatype: P2PDataType): void {
        if (this.currentMessageState[datatype].p2pStreaming) {
            this.currentMessageState[datatype].p2pStreaming = false;

            this.currentMessageState[datatype].videoStream?.push(null);
            this.currentMessageState[datatype].audioStream?.push(null);

            if (this.currentMessageState[datatype].p2pStreamingTimeout) {
                clearTimeout(this.currentMessageState[datatype].p2pStreamingTimeout!);
                this.currentMessageState[datatype].p2pStreamingTimeout = undefined;
            }

            if (!this.currentMessageState[datatype].invalidStream && !this.currentMessageState[datatype].p2pStreamNotStarted)
                this.emitStreamStopEvent(datatype);

            this.initializeMessageBuilder(datatype);
            this.initializeMessageState(datatype, this.currentMessageState[datatype].rsaKey);
            this.initializeStream(datatype);
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

    public isRTSPLiveStreaming(channel: number): boolean {
        return this.currentMessageState[P2PDataType.DATA].rtspStreaming[channel] ? this.currentMessageState[P2PDataType.DATA].rtspStreaming[channel] : false;
    }

    public isDownloading(channel: number): boolean {
        return this.isStreaming(channel, P2PDataType.BINARY);
    }

    public getLockSequenceNumber(): number {
        if (this.lockSeqNumber === -1)
            this.lockSeqNumber = generateLockSequence(this.rawStation.devices[0].device_type);
        return this.lockSeqNumber;
    }

    public incLockSequenceNumber(): number {
        if (this.lockSeqNumber === -1)
            this.lockSeqNumber = generateLockSequence(this.rawStation.devices[0].device_type);
        else
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
                this.log.debug(`Station ${this.rawStation.station_sn} - Response:`, response.data);

                if (response.status == 200) {
                    const result: ResultResponse = response.data;
                    if (result.code == 0) {
                        const dataresult: DskKeyResponse = result.data;
                        dataresult.dsk_keys.forEach(key => {
                            if (key.station_sn == this.rawStation.station_sn) {
                                this.dskKey = key.dsk_key;
                                this.dskExpiration = new Date(key.expiration * 1000);
                                this.log.debug(`${this.constructor.name}.getDSKKeys(): dskKey: ${this.dskKey} dskExpiration: ${this.dskExpiration}`);
                            }
                        });
                    } else {
                        this.log.error(`Station ${this.rawStation.station_sn} - Response code not ok`, { code: result.code, msg: result.msg });
                    }
                } else {
                    this.log.error(`Station ${this.rawStation.station_sn} - Status return code not 200`, { status: response.status, statusText: response.statusText });
                }
            } catch (error) {
                this.log.error(`Station ${this.rawStation.station_sn} - Generic Error:`, error);
            }
        }
    }

    public updateRawStation(value: StationListResponse): void {
        this.rawStation = value;
        if (this.rawStation.devices?.length === 1) {
            if (!this.energySavingDevice) {
                this.energySavingDevice = this.rawStation.station_sn === this.rawStation.devices[0].device_sn && Device.hasBattery(this.rawStation.devices[0].device_type);
                if (this.energySavingDevice)
                    this.log.debug(`Identified standalone battery device ${this.rawStation.station_sn} => activate p2p keepalive command`);
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

    private initializeTalkbackStream(): void {
        this.talkbackStream = new TalkbackStream();
        this.talkbackStream.on("data", (audioData) => { this.sendTalkbackAudioFrame(audioData) });
        this.talkbackStream.on("error", (error) => { this.onTalkbackStreamError(error) });
        this.talkbackStream.on("close", () => { this.onTalkbackStreamClose() });
    }

    private sendTalkbackAudioFrame(audioData: Buffer): void {
        //TODO: Pass channel information to buildTalkbackAudioFrameHeader
        this.videoSeqNumber = this._incrementSequence(this.videoSeqNumber);
        const messageHeader = buildCommandHeader(this.videoSeqNumber, CommandType.CMD_AUDIO_FRAME, P2PDataTypeHeader.VIDEO);
        const messageAudioHeader = buildTalkbackAudioFrameHeader(audioData);
        const messageData = Buffer.concat([messageHeader, messageAudioHeader, audioData]);

        const message: P2PVideoMessageState = {
            sequence: this.videoSeqNumber,
            channel: 0,
            data: messageData,
            retries: 0
        };

        this._sendVideoData(message);
    }

    private onTalkbackStreamClose(): void {
        this.talkbackStream.removeAllListeners();
        this.initializeTalkbackStream();
    }

    private onTalkbackStreamError(error: any): void {
        this.log.debug(`Station ${this.rawStation.station_sn} - Talkback Error:`, error);
    }

    private _sendVideoData(message: P2PVideoMessageState):void {
        if (message.retries < this.MAX_RETRIES) {
            message.retries++;
        } else {
            this.log.error(`Station ${this.rawStation.station_sn} - Max send video data retries ${this.messageVideoStates.get(message.sequence)?.retries} reached. Discard data.`, { sequence: message.sequence, channel: message.channel, retries: message.retries });
            this.messageVideoStates.delete(message.sequence);
            this.emit("talkback error", message.channel, new TalkbackError(`Station ${this.rawStation.station_sn} max send video data retries ${this.messageVideoStates.get(message.sequence)?.retries} reached. Discard data packet.`));
            return;
        }

        message = message as P2PVideoMessageState;
        message.timeout = setTimeout(() => {
            this._sendVideoData(message);
        }, this.MAX_AKNOWLEDGE_TIMEOUT);
        this.messageVideoStates.set(message.sequence, message);

        this.log.debug("Sending p2p video data...", { station: this.rawStation.station_sn, sequence: message.sequence, channel: message.channel, retries: message.retries, messageVideoStatesSize: this.messageVideoStates.size });
        sendMessage(this.socket, this.connectAddress!, RequestMessageType.DATA, message.data).catch((error) => {
            this.log.error(`Station ${this.rawStation.station_sn} - Error:`, error);
        });
    }

    public isTalkbackOngoing(channel: number): boolean {
        if (this.currentMessageState[P2PDataType.VIDEO].p2pTalkbackChannel === channel)
            return this.currentMessageState[P2PDataType.VIDEO].p2pTalkback;
        return false;
    }

}