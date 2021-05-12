import { createSocket, Socket, RemoteInfo } from "dgram";
import { TypedEmitter } from "tiny-typed-emitter";
import NodeRSA from "node-rsa";
import { Readable } from "stream";
import { dummyLogger, Logger } from "ts-log";

import { Address, CmdCameraInfoResponse, CmdESLNotifyPayload, CommandResult } from "./models";
import { sendMessage, hasHeader, buildCheckCamPayload, buildIntCommandPayload, buildIntStringCommandPayload, buildCommandHeader, MAGIC_WORD, buildCommandWithStringTypePayload, isPrivateIp, buildLookupWithKeyPayload, sortP2PMessageParts, buildStringTypeCommandPayload, getRSAPrivateKey, decryptAESData, getNewRSAPrivateKey, findStartCode, isIFrame, generateLockSequence, decodeLockPayload, generateLockAESKey, getLockVectorBytes, decryptLockAESData, buildLookupWithKeyPayload2, buildCheckCamPayload2, buildLookupWithKeyPayload3, decodeBase64 } from "./utils";
import { RequestMessageType, ResponseMessageType, CommandType, ErrorCode, P2PDataType, P2PDataTypeHeader, AudioCodec, VideoCodec, ESLInnerCommand, P2PConnectionType } from "./types";
import { AlarmMode } from "../http/types";
import { P2PDataMessage, P2PDataMessageAudio, P2PDataMessageBuilder, P2PMessageState, P2PDataMessageVideo, P2PMessage, P2PDataHeader, P2PDataMessageState, P2PClientProtocolEvents, DeviceSerial } from "./interfaces";

export class P2PClientProtocol extends TypedEmitter<P2PClientProtocolEvents> {

    private readonly MAX_RETRIES = 10;
    private readonly MAX_COMMAND_RESULT_WAIT = 20 * 1000;
    private readonly MAX_AKNOWLEDGE_TIMEOUT = 15 * 1000;
    private readonly MAX_LOOKUP_TIMEOUT = 15 * 1000;
    private readonly MAX_EXPECTED_SEQNO_WAIT = 20 * 1000;
    private readonly HEARTBEAT_INTERVAL = 5 * 1000;

    private readonly UDP_RECVBUFFERSIZE_BYTES = 1048576;
    private readonly MAX_PAYLOAD_BYTES = 1028;
    private readonly MAX_PACKET_BYTES = 1024;
    private readonly MAX_VIDEO_PACKET_BYTES = 655360;

    private socket!: Socket;
    private binded = false;
    private connected = false;
    private stationSerial = "";

    private seqNumber = 0;
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

    private downloadTotalBytes = 0;
    private downloadReceivedBytes = 0;

    private cloudAddresses: Array<Address> = [
        { host: "18.197.212.165", port: 32100 },    // Germany Frankfurt
        { host: "34.235.4.153", port: 32100 },      // USA Ashburn
        { host: "54.153.101.7", port: 32100 },      // USA San Francisco
        { host: "18.223.127.200", port: 32100 },    // USA Columbus
        { host: "54.223.148.206", port: 32100 },    // China Beijing
        { host: "13.251.222.7", port: 32100 },      // Singapore
    ];

    private messageStates: Map<number, P2PMessageState> = new Map<number, P2PMessageState>();

    private connectTimeout?: NodeJS.Timeout;
    private lookupTimeout?: NodeJS.Timeout;
    private heartbeatTimeout?: NodeJS.Timeout;
    private connectTime: number | null = null;
    private lastPong: number | null = null;
    private quickStreamStart = false;
    private connectionType: P2PConnectionType = P2PConnectionType.PREFER_LOCAL;
    private fallbackAddresses: Array<Address> = [];

    private connectAddress: Address | undefined = undefined;
    private p2pDid: string;
    private dskKey: string;
    private log: Logger;
    private deviceSNs: DeviceSerial;

    constructor(p2pDid: string, dskKey: string, stationSerial: string, deviceSNs: DeviceSerial = {}, log: Logger = dummyLogger) {
        super();
        this.p2pDid = p2pDid;
        this.dskKey = dskKey;
        this.stationSerial = stationSerial;
        this.log = log;
        this.deviceSNs = deviceSNs;

        this.socket = createSocket("udp4");
        this.socket.on("message", (msg, rinfo) => this.handleMsg(msg, rinfo));
        this.socket.on("error", (error) => this.onError(error));
        this.socket.on("close", () => this.onClose());

        this._initialize();
    }

    private _initialize(): void {
        let rsaKey: NodeRSA | null;

        this.binded = false;
        this.connected = false;
        this.lastPong = null;
        this.connectTime = null;
        this.seqNumber = 0;
        this.lockSeqNumber = -1;
        this.connectAddress = undefined;

        this._clearMessageStateTimeouts();
        this.messageStates.clear();

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
            queuedData: new Map<number, P2PMessage>(),
            rsaKey: rsaKey,
            videoStream: null,
            audioStream: null,
            invalidStream: false,
            streaming: false,
            streamNotStarted: true,
            streamChannel: 0,
            streamFirstAudioDataReceived: false,
            streamFirstVideoDataReceived: false,
            streamMetadata: {
                videoCodec: VideoCodec.H264,
                videoFPS: 15,
                videoHeight: 1080,
                videoWidth: 1920,
                audioCodec: AudioCodec.AAC
            },
            receivedFirstIFrame: false,
            preFrameVideoData: Buffer.from([])
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

    private _clearHeartbeatTimeout(): void {
        this._clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = undefined;
    }

    private _clearConnectTimeout(): void {
        this._clearTimeout(this.connectTimeout);
        this.connectTimeout = undefined;
    }

    private _clearLookupTimeout(): void {
        this._clearTimeout(this.lookupTimeout);
        this.lookupTimeout = undefined;
    }

    private _disconnected(): void {
        this._clearHeartbeatTimeout();
        if (this.currentMessageState[P2PDataType.VIDEO].streaming) {
            this.endStream(P2PDataType.VIDEO)
        }
        if (this.currentMessageState[P2PDataType.BINARY].streaming) {
            this.endStream(P2PDataType.BINARY)
        }
        this._initialize();
        this.emit("close");
    }

    public lookup(): void {
        this.fallbackAddresses = [];
        this.cloudAddresses.map((address) => this.lookupByAddress(address, this.p2pDid, this.dskKey));
        this.cloudAddresses.map((address) => this.lookupByAddress2(address, this.p2pDid, this.dskKey));

        this._clearLookupTimeout();

        this.lookupTimeout = setTimeout(() => {
            this.lookupTimeout = undefined;
            this.log.error(`${this.constructor.name}.lookup(): station: ${this.stationSerial} - All address lookup tentatives failed.`);
            this._disconnected();
        }, this.MAX_LOOKUP_TIMEOUT);
    }

    public lookup2(origAddress: Address, data: Buffer): void {
        this.cloudAddresses.map((address) => this.lookupByAddress3(address, this.p2pDid, origAddress, data));
    }

    private lookupByAddress(address: Address, p2pDid: string, dskKey: string): void {
        // Send lookup message
        const msgId = RequestMessageType.LOOKUP_WITH_KEY;
        const payload = buildLookupWithKeyPayload(this.socket, p2pDid, dskKey);
        sendMessage(this.socket, address, msgId, payload).catch((error) => {
            this.log.error(`Lookup addresses for station ${this.stationSerial} - Error:`, error);
        });
    }

    private lookupByAddress2(address: Address, p2pDid: string, dskKey: string): void {
        // Send lookup message2
        const msgId = RequestMessageType.LOOKUP_WITH_KEY2;
        const payload = buildLookupWithKeyPayload2(p2pDid, dskKey);
        sendMessage(this.socket, address, msgId, payload).catch((error) => {
            this.log.error(`Lookup addresses for station ${this.stationSerial} - Error:`, error);
        });
    }

    private lookupByAddress3(address: Address, p2pDid: string, origAddress: Address, data: Buffer): void {
        // Send lookup message3
        const msgId = RequestMessageType.LOOKUP_WITH_KEY3;
        const payload = buildLookupWithKeyPayload3(p2pDid, origAddress, data);
        sendMessage(this.socket, address, msgId, payload).catch((error) => {
            this.log.error(`Lookup addresses for station ${this.stationSerial} - Error:`, error);
        });
    }

    public isConnected(): boolean {
        return this.connected;
    }

    private _startConnectTimeout(): void {
        if (this.connectTimeout === undefined)
            this.connectTimeout = setTimeout(() => {
                if (this.connectionType === P2PConnectionType.PREFER_LOCAL) {
                    if (this.fallbackAddresses.length > 0) {
                        this.connectTimeout = undefined;
                        const tmp_addresses = this.fallbackAddresses;
                        this.fallbackAddresses = [];
                        for(const addr of tmp_addresses) {
                            this._connect({ host: addr.host, port: addr.port });
                        }
                        return;
                    }
                }
                this.log.warn(`Station ${this.stationSerial} - Tried all hosts, no connection could be established`);
                this._disconnected();
            }, this.MAX_AKNOWLEDGE_TIMEOUT);
    }

    private _connect(address: Address): void {
        this.log.debug(`Station ${this.stationSerial} - Connecting to host ${address.host} on port ${address.port}...`);
        for (let i = 0; i < 4; i++)
            this.sendCamCheck(address);

        this._startConnectTimeout();
    }

    public async connect(): Promise<void> {
        if (!this.connected) {
            if (!this.binded)
                this.socket.bind(0, () => {
                    this.binded = true;
                    try {
                        this.socket.setRecvBufferSize(this.UDP_RECVBUFFERSIZE_BYTES);
                    } catch (error) {
                        this.log.error(`Station ${this.stationSerial} - Error:`, { error: error, currentRecBufferSize: this.socket.getRecvBufferSize(), recBufferRequestedSize: this.UDP_RECVBUFFERSIZE_BYTES });
                    }
                    this.lookup();
                });
            else
                this.lookup();
        }
    }

    private sendCamCheck(address: Address): void {
        const payload = buildCheckCamPayload(this.p2pDid);
        sendMessage(this.socket, address, RequestMessageType.CHECK_CAM, payload).catch((error) => {
            this.log.error(`Send cam check to station ${this.stationSerial} - Error:`, error);
        });
    }

    private sendCamCheck2(address: Address, data: Buffer): void {
        const payload = buildCheckCamPayload2(this.p2pDid, data);
        sendMessage(this.socket, address, RequestMessageType.CHECK_CAM2, payload).catch((error) => {
            this.log.error(`Send cam check to station ${this.stationSerial} - Error:`, error);
        });
    }

    public sendPing(address: Address): void {
        if ((this.lastPong && ((new Date().getTime() - this.lastPong) / this.getHeartbeatInterval() >= this.MAX_RETRIES)) ||
            (this.connectTime && !this.lastPong && ((new Date().getTime() - this.connectTime) / this.getHeartbeatInterval() >= this.MAX_RETRIES))) {
            this.log.warn(`Station ${this.stationSerial} - Heartbeat check failed. Connection seems lost. Try to reconnect...`);
            this._disconnected();
        }
        sendMessage(this.socket, address, RequestMessageType.PING).catch((error) => {
            this.log.error(`Station ${this.stationSerial} - Error:`, error);
        });
    }

    public sendCommandWithIntString(commandType: CommandType, value: number, valueSub = 0, strValue = "", strValueSub = "", channel = 0): void {
        const payload = buildIntStringCommandPayload(value, valueSub, strValue, strValueSub, channel);
        this.sendCommand(commandType, payload, channel);
    }

    public sendCommandWithInt(commandType: CommandType, value: number, strValue = "", channel = 255): void {
        const payload = buildIntCommandPayload(value, strValue, channel);
        this.sendCommand(commandType, payload, channel);
    }

    public sendCommandWithStringPayload(commandType: CommandType, value: string, channel = 0): void {
        const payload = buildCommandWithStringTypePayload(value, channel);
        let nested_commandType = undefined;

        if (commandType == CommandType.CMD_SET_PAYLOAD) {
            try {
                const json = JSON.parse(value);
                nested_commandType = json.cmd;
            } catch (error) {
                this.log.error(`CMD_SET_PAYLOAD - Station ${this.stationSerial} - Error:`, error);
            }
        } else if (commandType == CommandType.CMD_DOORBELL_SET_PAYLOAD) {
            try {
                const json = JSON.parse(value);
                nested_commandType = json.commandType;
            } catch (error) {
                this.log.error(`CMD_DOORBELL_SET_PAYLOAD - Station ${this.stationSerial} - Error:`, error);
            }
        }

        this.sendCommand(commandType, payload, channel, nested_commandType);
    }

    public sendCommandWithString(commandType: CommandType, strValue: string, strValueSub:string, channel = 255): void {
        const payload = buildStringTypeCommandPayload(strValue, strValueSub, channel);
        this.sendCommand(commandType, payload, channel, commandType);
    }

    private sendCommand(commandType: CommandType, payload: Buffer, channel: number, nested_commandType?: CommandType): void {
        // Command header
        const msgSeqNumber = this.seqNumber++;
        const commandHeader = buildCommandHeader(msgSeqNumber, commandType);
        const data = Buffer.concat([commandHeader, payload]);

        const message: P2PMessageState = {
            sequence: msgSeqNumber,
            command_type: commandType,
            nested_command_type: nested_commandType,
            channel: channel,
            data: data,
            retries: 0,
            acknowledged: false,
            return_code: ErrorCode.ERROR_COMMAND_TIMEOUT
        };
        this.messageStates.set(msgSeqNumber, message);

        if (commandType === CommandType.CMD_START_REALTIME_MEDIA ||
            (nested_commandType !== undefined && nested_commandType === CommandType.CMD_START_REALTIME_MEDIA && commandType === CommandType.CMD_SET_PAYLOAD) ||
            commandType === CommandType.CMD_RECORD_VIEW ||
            (nested_commandType !== undefined && nested_commandType === 1000 && commandType === CommandType.CMD_DOORBELL_SET_PAYLOAD)
        ) {
            this.currentMessageState[P2PDataType.VIDEO].streaming = true;
            this.currentMessageState[P2PDataType.VIDEO].streamChannel = channel;
        } else if (commandType === CommandType.CMD_DOWNLOAD_VIDEO) {
            this.currentMessageState[P2PDataType.BINARY].streaming = true;
            this.currentMessageState[P2PDataType.BINARY].streamChannel = channel;
        } else if (commandType === CommandType.CMD_STOP_REALTIME_MEDIA) { //TODO: CommandType.CMD_RECORD_PLAY_CTRL only if stop
            this.endStream(P2PDataType.VIDEO);
        } else if (commandType === CommandType.CMD_DOWNLOAD_CANCEL) {
            this.endStream(P2PDataType.BINARY);
        }

        this._sendCommand(message);
    }

    private _sendCommand(message: P2PMessageState): void {
        this.log.debug("Sending p2p command...", { station: this.stationSerial, sequence: message.sequence, commandType: message.command_type, channel: message.channel, retries: message.retries, messageStatesSize: this.messageStates.size });
        if (message.retries < this.MAX_RETRIES) {
            if (message.return_code === ErrorCode.ERROR_FAILED_TO_REQUEST) {
                this.messageStates.delete(message.sequence);
                message.sequence = this.seqNumber++;
                message.data.writeUInt16BE(message.sequence, 2);
                this.messageStates.set(message.sequence, message);
            }
            sendMessage(this.socket, this.connectAddress!, RequestMessageType.DATA, message.data).catch((error) => {
                this.log.error(`Station ${this.stationSerial} - Error:`, error);
            });
            const msg = this.messageStates.get(message.sequence);
            if (msg) {
                msg.return_code = ErrorCode.ERROR_COMMAND_TIMEOUT;
                msg.retries++;
                msg.timeout = setTimeout(() => {
                    this._sendCommand(msg);
                }, this.MAX_AKNOWLEDGE_TIMEOUT);
                this.messageStates.set(msg.sequence, msg);
            }
        } else {
            this.log.error(`Station ${this.stationSerial} - Max retries ${this.messageStates.get(message.sequence)?.retries} - stop with error`, { sequence: message.sequence, commandType: message.command_type, channel: message.channel, retries: message.retries });
            this.emit("command", {
                command_type: message.nested_command_type !== undefined ? message.nested_command_type : message.command_type,
                channel: message.channel,
                return_code: message.return_code
            } as CommandResult);
            this.messageStates.delete(message.sequence);
            if (message.return_code === ErrorCode.ERROR_COMMAND_TIMEOUT) {
                this.log.warn(`Station ${this.stationSerial} - Connection seems lost. Try to reconnect...`);
                this._disconnected();
            }
        }
    }

    private handleMsg(msg: Buffer, rinfo: RemoteInfo): void {
        if (hasHeader(msg, ResponseMessageType.LOOKUP_ADDR)) {
            const port = msg.slice(6, 8).readUInt16LE();
            const ip = `${msg[11]}.${msg[10]}.${msg[9]}.${msg[8]}`;

            this.log.debug(`Station ${this.stationSerial} - LOOKUP_ADDR - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { ip: ip, port: port }});

            if (ip === "0.0.0.0") {
                this.log.debug(`Station ${this.stationSerial} - LOOKUP_ADDR - Got invalid ip address 0.0.0.0, ignoring response...`);
                return;
            }
            if (!this.connected) {
                if (this.connectionType === P2PConnectionType.PREFER_LOCAL) {
                    this._clearLookupTimeout();
                    if (isPrivateIp(ip)) {
                        this.log.debug(`Station ${this.stationSerial} - PREFER_LOCAL - Try to connect to ${ip}:${port}...`);
                        this._connect({ host: ip, port: port });
                    } else {
                        if (!this.fallbackAddresses.includes({ host: ip, port: port }))
                            this.fallbackAddresses.push({ host: ip, port: port });
                    }
                } else if (this.connectionType === P2PConnectionType.ONLY_LOCAL) {
                    if (isPrivateIp(ip)) {
                        this._clearLookupTimeout();
                        this.log.debug(`Station ${this.stationSerial} - ONLY_LOCAL - Try to connect to ${ip}:${port}...`);
                        this._connect({ host: ip, port: port });
                    }
                } else if (this.connectionType === P2PConnectionType.QUICKEST) {
                    this._clearLookupTimeout();
                    this.log.debug(`Station ${this.stationSerial} - QUICKEST - Try to connect to ${ip}:${port}...`);
                    this._connect({ host: ip, port: port });
                }

            } else {

            }
        } else if (hasHeader(msg, ResponseMessageType.CAM_ID) || hasHeader(msg, ResponseMessageType.CAM_ID2)) {
            // Answer from the device to a CAM_CHECK message
            if (!this.connected) {
                this.log.debug(`Station ${this.stationSerial} - CAM_ID - Connected to station ${this.stationSerial} on host ${rinfo.address} port ${rinfo.port}`);
                this._clearConnectTimeout();
                this.connected = true;
                this.connectTime = new Date().getTime();
                this.lastPong = null;

                this.connectAddress = { host: rinfo.address, port: rinfo.port };

                this.heartbeatTimeout = setTimeout(() => {
                    this.scheduleHeartbeat();
                }, this.getHeartbeatInterval());
                this.emit("connect", this.connectAddress);
            } else {
                this.log.debug(`Station ${this.stationSerial} - CAM_ID - Already connected, ignoring...`);
            }
        } else if (hasHeader(msg, ResponseMessageType.PONG)) {
            // Response to a ping from our side
            this.lastPong = new Date().getTime();
            return;
        } else if (hasHeader(msg, ResponseMessageType.PING)) {
            // Response with PONG to keep alive
            sendMessage(this.socket, { host: rinfo.address, port: rinfo.port }, RequestMessageType.PONG).catch((error) => {
                this.log.error(`Station ${this.stationSerial} - Error:`, error);
            });
            return;
        } else if (hasHeader(msg, ResponseMessageType.END)) {
            // Connection is closed by device
            this.log.debug(`Station ${this.stationSerial} - END - received from host ${rinfo.address}:${rinfo.port}`);
            this.socket.close();
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
                this.log.debug(`Station ${this.stationSerial} - ACK ${P2PDataType[dataType]} - received from host ${rinfo.address}:${rinfo.port} for sequence ${ackedSeqNo}`);
                const msg_state = this.messageStates.get(ackedSeqNo);
                if (msg_state && !msg_state.acknowledged) {
                    msg_state.acknowledged = true;
                    this._clearTimeout(msg_state.timeout);
                    msg_state.timeout = setTimeout(() => {
                        this.log.warn(`Station ${this.stationSerial} - Result data for command not received`, { message: msg_state });
                        this.messageStates.delete(ackedSeqNo);
                        this.emit("command", {
                            command_type: msg_state.nested_command_type !== undefined ? msg_state.nested_command_type : msg_state.command_type,
                            channel: msg_state.channel,
                            return_code: ErrorCode.ERROR_COMMAND_TIMEOUT
                        } as CommandResult);
                    }, this.MAX_COMMAND_RESULT_WAIT);
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.DATA)) {
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
            this.log.debug(`Station ${this.stationSerial} - DATA ${P2PDataType[message.type]} - received from host ${rinfo.address}:${rinfo.port} - Processing sequence ${message.seqNo}...`);

            if (message.seqNo === this.expectedSeqNo[dataType]) {

                const timeout = this.currentMessageState[dataType].waitForSeqNoTimeout;
                if (!!timeout) {
                    clearTimeout(timeout);
                    this.currentMessageState[dataType].waitForSeqNoTimeout = undefined;
                }

                // expected seq packet arrived
                this.expectedSeqNo[dataType]++;
                this.parseDataMessage(message);

                this.log.debug(`Station ${this.stationSerial} - DATA ${P2PDataType[message.type]} - Received expected sequence (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);

                for (const element of this.currentMessageState[dataType].queuedData.values()) {
                    if (this.expectedSeqNo[dataType] === element.seqNo) {
                        this.log.debug(`Station ${this.stationSerial} - DATA ${P2PDataType[element.type]} - Work off queued data (seqNo: ${element.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                        this.expectedSeqNo[dataType]++;
                        this.parseDataMessage(element);
                        this.currentMessageState[dataType].queuedData.delete(element.seqNo);
                    } else {
                        this.log.debug(`Station ${this.stationSerial} - DATA ${P2PDataType[element.type]} - Work off missing data interrupt queue dismantle (seqNo: ${element.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                        break;
                    }
                }
            } else if (this.expectedSeqNo[dataType] > message.seqNo) {
                // We have already seen this message, skip!
                // This can happen because the device is sending the message till it gets a ACK
                // which can take some time.
                this.log.debug(`Station ${this.stationSerial} - DATA ${P2PDataType[message.type]} - Received already processed sequence (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                return;
            } else {
                if (!this.currentMessageState[dataType].waitForSeqNoTimeout)
                    this.currentMessageState[dataType].waitForSeqNoTimeout = setTimeout(() => {
                        this.endStream(dataType);
                        this.currentMessageState[dataType].waitForSeqNoTimeout = undefined;
                    }, this.MAX_EXPECTED_SEQNO_WAIT);

                if (!this.currentMessageState[dataType].queuedData.get(message.seqNo)) {
                    this.currentMessageState[dataType].queuedData.set(message.seqNo, message);
                    this.log.debug(`Station ${this.stationSerial} - DATA ${P2PDataType[message.type]} - Received not expected sequence, added to the queue for future processing (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                } else {
                    this.log.debug(`Station ${this.stationSerial} - DATA ${P2PDataType[message.type]} - Received not expected sequence, discarded since already present in queue for future processing (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.LOOKUP_ADDR2)) {
            if (!this.connected) {
                const port = msg.slice(6, 8).readUInt16LE();
                const ip = `${msg[11]}.${msg[10]}.${msg[9]}.${msg[8]}`;
                const data = msg.slice(20, 24);

                this.log.debug(`Station ${this.stationSerial} - LOOKUP_ADDR2 - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { ip: ip, port: port, data: data.toString("hex") }});

                for (let i = 0; i < 4; i++)
                    this.sendCamCheck2({ host: ip, port: port }, data);

                this._startConnectTimeout();

                sendMessage(this.socket, { host: ip, port: port }, RequestMessageType.UNKNOWN_70).catch((error) => {
                    this.log.error(`Station ${this.stationSerial} - UNKNOWN_70 - Error:`, error);
                });
            }
        } else if (hasHeader(msg, ResponseMessageType.UNKNOWN_71)) {
            if (!this.connected) {
                this.log.debug(`Station ${this.stationSerial} - UNKNOWN_71 - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { message: msg.toString("hex"), length: msg.length }});

                sendMessage(this.socket, { host: rinfo.address, port: rinfo.port }, RequestMessageType.UNKNOWN_71).catch((error) => {
                    this.log.error(`Station ${this.stationSerial} - UNKNOWN_71 - Error:`, error);
                });
            }
        } else if (hasHeader(msg, ResponseMessageType.UNKNOWN_73)) {
            if (!this.connected) {
                const port = msg.slice(8, 10).readUInt16BE();
                const data = msg.slice(4, 8);

                this.log.debug(`Station ${this.stationSerial} - UNKNOWN_73 - Got response`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { port: port, data: data.toString("hex") }});

                this.lookup2({ host: rinfo.address, port: port }, data);
            }
        } else if (hasHeader(msg, ResponseMessageType.UNKNOWN_81) || hasHeader(msg, ResponseMessageType.UNKNOWN_83)) {
            // Do nothing / ignore
        } else {
            this.log.debug(`Station ${this.stationSerial} - received unknown message`, { remoteAddress: rinfo.address, remotePort: rinfo.port, response: { message: msg.toString("hex"), length: msg.length }});
        }
    }

    private parseDataMessage(message: P2PMessage): void {
        if ((message.type === P2PDataType.BINARY || message.type === P2PDataType.VIDEO) && !this.currentMessageState[message.type].streaming) {
            this.log.debug(`Station ${this.stationSerial} - DATA ${P2PDataType[message.type]} - Stream not started ignore this data`, {seqNo: message.seqNo, header: this.currentMessageBuilder[message.type].header, bytesRead: this.currentMessageBuilder[message.type].bytesRead, bytesToRead: this.currentMessageBuilder[message.type].header.bytesToRead, messageSize: message.data.length });
        } else {
            if (this.currentMessageState[message.type].leftoverData.length > 0) {
                message.data = Buffer.concat([this.currentMessageState[message.type].leftoverData, message.data]);
                this.currentMessageState[message.type].leftoverData = Buffer.from([]);
            }

            let data = message.data;
            const data_offset = 16;
            do {
                // is this the first message?
                const firstPartMessage = data.slice(0, 4).toString() === MAGIC_WORD;

                if (firstPartMessage) {
                    const header: P2PDataHeader = {commandId: 0, bytesToRead: 0, channel: 0, signCode: 0, type: 0};
                    header.commandId = data.slice(4, 6).readUIntLE(0, 2);
                    header.bytesToRead = data.slice(6, 8).readUIntLE(0, 2);
                    header.channel = data.slice(12, 13).readUInt8();
                    header.signCode = data.slice(13, 14).readInt8();
                    header.type = data.slice(14, 15).readUInt8();

                    this.currentMessageBuilder[message.type].header = header;

                    if (data.length - data_offset > header.bytesToRead) {
                        const payload = data.slice(data_offset, header.bytesToRead + data_offset);
                        this.currentMessageBuilder[message.type].messages[message.seqNo] = payload;
                        this.currentMessageBuilder[message.type].bytesRead = payload.byteLength;

                        data = data.slice(header.bytesToRead + data_offset);
                        if (data.length <= data_offset) {
                            this.currentMessageState[message.type].leftoverData = data;
                            data = Buffer.from([]);
                        }
                    } else {
                        const payload = data.slice(data_offset);
                        this.currentMessageBuilder[message.type].messages[message.seqNo] = payload;
                        this.currentMessageBuilder[message.type].bytesRead = payload.byteLength;
                        data = Buffer.from([]);
                    }
                } else {
                    // finish message and print
                    if (this.currentMessageBuilder[message.type].header.bytesToRead - this.currentMessageBuilder[message.type].bytesRead < data.length) {
                        const payload = data.slice(0, this.currentMessageBuilder[message.type].header.bytesToRead - this.currentMessageBuilder[message.type].bytesRead);
                        this.currentMessageBuilder[message.type].messages[message.seqNo] = payload;
                        this.currentMessageBuilder[message.type].bytesRead += payload.byteLength;

                        data = data.slice(payload.byteLength);
                        if (data.length <= data_offset) {
                            this.currentMessageState[message.type].leftoverData = data;
                            data = Buffer.from([]);
                        }
                    } else {
                        this.currentMessageBuilder[message.type].messages[message.seqNo] = data;
                        this.currentMessageBuilder[message.type].bytesRead += data.byteLength;
                        data = Buffer.from([]);
                    }
                }
                this.log.debug(`Station ${this.stationSerial} - Received data`, { seqNo: message.seqNo, header: this.currentMessageBuilder[message.type].header, bytesRead: this.currentMessageBuilder[message.type].bytesRead, bytesToRead: this.currentMessageBuilder[message.type].header.bytesToRead, firstPartMessage: firstPartMessage, messageSize: message.data.length });
                if (this.currentMessageBuilder[message.type].bytesRead === this.currentMessageBuilder[message.type].header.bytesToRead) {
                    const completeMessage = sortP2PMessageParts(this.currentMessageBuilder[message.type].messages);
                    const data_message: P2PDataMessage = {
                        ...this.currentMessageBuilder[message.type].header,
                        seqNo: message.seqNo,
                        data_type: message.type,
                        data: completeMessage
                    }
                    this.handleData(data_message);
                    this.initializeMessageBuilder(message.type);
                }
            } while (data.length > 0)
        }
    }

    private handleData(message: P2PDataMessage): void {
        if (message.data_type === P2PDataType.CONTROL) {
            this.handleDataControl(message);
        } else if (message.data_type === P2PDataType.DATA) {
            const commandStr = CommandType[message.commandId];
            const result_msg = message.type === 1 ? true : false;

            if (result_msg) {
                const return_code = message.data.slice(0, 4).readUInt32LE()|0;
                const return_msg = message.data.slice(4, 4 + 128).toString();

                const error_codeStr = ErrorCode[return_code];

                this.log.debug(`Station ${this.stationSerial} - Received data`, { commandIdName: commandStr, commandId: message.commandId, resultCodeName: error_codeStr, resultCode: return_code, message: return_msg, data: message.data.toString("hex") });

                const msg_state = this.messageStates.get(message.seqNo);

                if (msg_state) {
                    if (msg_state.command_type === message.commandId) {
                        this._clearTimeout(msg_state.timeout);
                        const command_type =  msg_state.nested_command_type !== undefined ? msg_state.nested_command_type : msg_state.command_type;
                        this.log.debug(`Station ${this.stationSerial} - Result data for command received`, { messageState: msg_state, resultCodeName: error_codeStr, resultCode: return_code });
                        if (return_code === ErrorCode.ERROR_FAILED_TO_REQUEST) {
                            msg_state.return_code = return_code;
                            this._sendCommand(msg_state);
                        } else {
                            this.emit("command", {
                                command_type: command_type,
                                channel: msg_state.channel,
                                return_code: return_code
                            } as CommandResult);
                            this.messageStates.delete(message.seqNo);
                        }
                    } else {
                        this.log.debug(`Station ${this.stationSerial} - data_type: ${P2PDataType[message.data_type]} commandtype and sequencenumber different!`);
                    }
                } else {
                    this.log.debug(`Station ${this.stationSerial} - data_type: ${P2PDataType[message.data_type]} sequence: ${message.seqNo} not present!`);
                }
            } else {
                this.log.debug(`Station ${this.stationSerial} - Unsupported response`, { dataType: P2PDataType[message.data_type], commandIdName: commandStr, commandId: message.commandId, message: message.data.toString("hex") });
            }
        } else if (message.data_type === P2PDataType.VIDEO || message.data_type === P2PDataType.BINARY) {
            this.handleDataBinaryAndVideo(message);
        } else {
            this.log.debug(`Station ${this.stationSerial} - Not implemented data type`, { seqNo: message.seqNo, dataType: message.data_type, commandId: message.commandId, message: message.data.toString("hex") });
        }
    }

    private isIFrame(data: Buffer, isKeyFrame: boolean): boolean {
        if (this.stationSerial.startsWith("T8410") || this.stationSerial.startsWith("T8400") || this.stationSerial.startsWith("T8401") || this.stationSerial.startsWith("T8411") ||
            this.stationSerial.startsWith("T8202") || this.stationSerial.startsWith("T8422") || this.stationSerial.startsWith("T8424") || this.stationSerial.startsWith("T8423") ||
            this.stationSerial.startsWith("T8130") || this.stationSerial.startsWith("T8131") || (!this.stationSerial.startsWith("T8420") || this.stationSerial.length <= 7 || this.stationSerial[6] !== "6")) {
            return isKeyFrame;
        }
        return isIFrame(data);
    }

    private handleDataBinaryAndVideo(message: P2PDataMessage): void {
        if (!this.currentMessageState[message.data_type].invalidStream) {
            switch(message.commandId) {
                case CommandType.CMD_VIDEO_FRAME:
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
                        const rsaKey = this.currentMessageState[message.data_type].rsaKey;
                        if (rsaKey) {
                            try {
                                videoMetaData.aesKey = rsaKey.decrypt(key).toString("hex");
                                this.log.debug(`Station ${this.stationSerial} - Decrypted AES key: ${videoMetaData.aesKey}`);
                            } catch (error) {
                                this.log.warn(`Station ${this.stationSerial} - AES key could not be decrypted! The entire stream is discarded. - Error:`, error);
                                this.currentMessageState[message.data_type].invalidStream = true;
                                return;
                            }
                        } else {
                            this.log.warn(`Station ${this.stationSerial} - Private RSA key is missing! Stream could not be decrypted. The entire stream is discarded.`);
                            this.currentMessageState[message.data_type].invalidStream = true;
                            return;
                        }
                        payloadStart = 151;
                    }

                    let video_data: Buffer;
                    if (videoMetaData.aesKey !== "") {
                        let unencrypted_data: Buffer = Buffer.from([]);
                        if (videoMetaData.videoDataLength > 128) {
                            unencrypted_data = message.data.slice(payloadStart + 128, payloadStart + videoMetaData.videoDataLength - 128);
                        }
                        const encrypted_data = message.data.slice(payloadStart, payloadStart + 128);
                        video_data = Buffer.concat([decryptAESData(videoMetaData.aesKey, encrypted_data), unencrypted_data]);
                    } else {
                        video_data = message.data.slice(payloadStart, payloadStart + videoMetaData.videoDataLength);
                    }

                    this.log.debug(`Station ${this.stationSerial} - CMD_VIDEO_FRAME`, { dataSize: message.data.length, metadata: videoMetaData, videoDataSize: video_data.length });

                    if (this.currentMessageState[message.data_type].streamNotStarted) {
                        this.currentMessageState[message.data_type].streamFirstVideoDataReceived = true;
                        this.currentMessageState[message.data_type].streamMetadata.videoCodec = videoMetaData.streamType;
                        this.currentMessageState[message.data_type].streamMetadata.videoFPS = videoMetaData.videoFPS;
                        this.currentMessageState[message.data_type].streamMetadata.videoHeight = videoMetaData.videoHeight;
                        this.currentMessageState[message.data_type].streamMetadata.videoWidth = videoMetaData.videoWidth;

                        if ((this.currentMessageState[message.data_type].streamFirstAudioDataReceived && this.currentMessageState[message.data_type].streamFirstVideoDataReceived && !this.quickStreamStart) || (this.currentMessageState[message.data_type].streamFirstVideoDataReceived && this.quickStreamStart)) {
                            this.emitStreamStartEvent(message.data_type);
                        }
                    }

                    if (findStartCode(video_data)) {
                        this.log.debug(`Station ${this.stationSerial} - CMD_VIDEO_FRAME: startcode found`, { isKeyFrame: isKeyFrame, preFrameVideoDataLength: this.currentMessageState[message.data_type].preFrameVideoData.length });
                        if (!this.currentMessageState[message.data_type].receivedFirstIFrame)
                            this.currentMessageState[message.data_type].receivedFirstIFrame = this.isIFrame(video_data, isKeyFrame);

                        if (this.currentMessageState[message.data_type].receivedFirstIFrame) {
                            if (this.currentMessageState[message.data_type].preFrameVideoData.length > this.MAX_VIDEO_PACKET_BYTES)
                                this.currentMessageState[message.data_type].preFrameVideoData = Buffer.from([]);

                            if (this.currentMessageState[message.data_type].preFrameVideoData.length > 0) {
                                this.currentMessageState[message.data_type].videoStream?.push(this.currentMessageState[message.data_type].preFrameVideoData);
                            }
                            this.currentMessageState[message.data_type].preFrameVideoData = video_data;
                        } else {
                            this.log.debug(`Station ${this.stationSerial} - CMD_VIDEO_FRAME: Skipping because first frame is not an I frame.`);
                        }
                    } else {
                        this.log.debug(`Station ${this.stationSerial} - CMD_VIDEO_FRAME: No startcode found`, {isKeyFrame: isKeyFrame, preFrameVideoDataLength: this.currentMessageState[message.data_type].preFrameVideoData.length });
                        if (this.currentMessageState[message.data_type].preFrameVideoData.length > 0) {
                            this.currentMessageState[message.data_type].preFrameVideoData = Buffer.concat([this.currentMessageState[message.data_type].preFrameVideoData, video_data]);
                        }
                    }
                    break;
                case CommandType.CMD_AUDIO_FRAME:
                    const audioMetaData: P2PDataMessageAudio = {
                        audioType: 0,
                        audioSeqNo: 0,
                        audioTimestamp: 0,
                        audioDataLength: 0
                    };

                    audioMetaData.audioDataLength = message.data.slice(0, 4).readUInt32LE();
                    audioMetaData.audioType = message.data.slice(5, 6).readUInt8();
                    audioMetaData.audioSeqNo = message.data.slice(6, 8).readUInt16LE();
                    audioMetaData.audioTimestamp = message.data.slice(8, 14).readUIntLE(0, 6);

                    const audio_data = message.data.slice(16);
                    this.log.debug(`Station ${this.stationSerial} - CMD_AUDIO_FRAME`, { dataSize: message.data.length, metadata: audioMetaData, audioDataSize: audio_data.length });

                    if (this.currentMessageState[message.data_type].streamNotStarted) {
                        this.currentMessageState[message.data_type].streamFirstAudioDataReceived = true;
                        this.currentMessageState[message.data_type].streamMetadata.audioCodec = audioMetaData.audioType;

                        if (this.currentMessageState[message.data_type].streamFirstAudioDataReceived && this.currentMessageState[message.data_type].streamFirstVideoDataReceived) {
                            this.emitStreamStartEvent(message.data_type);
                        }
                    }

                    this.currentMessageState[message.data_type].audioStream?.push(audio_data);
                    break;
                default:
                    this.log.debug(`Station ${this.stationSerial} - Not implemented message`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: message.data.toString("hex") });
                    break;
            }
        } else {
            this.log.debug(`Station ${this.stationSerial} - Invalid stream data, dropping complete stream`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: message.data.toString("hex") });
        }
    }

    private handleDataControl(message: P2PDataMessage): void {
        switch(message.commandId) {
            case CommandType.CMD_GET_ALARM_MODE:
                this.log.debug(`Station ${this.stationSerial} - Alarm mode changed to: ${AlarmMode[message.data.readUIntBE(0, 1)]}`);
                this.emit("alarm mode", message.data.readUIntBE(0, 1) as AlarmMode);
                break;
            case CommandType.CMD_CAMERA_INFO:
                try {
                    this.log.debug(`Station ${this.stationSerial} - Camera info`, { camerInfo: message.data.toString() });
                    this.emit("camera info", JSON.parse(message.data.toString()) as CmdCameraInfoResponse);
                } catch (error) {
                    this.log.error(`Station ${this.stationSerial} - Camera info - Error:`, error);
                }
                break;
            case CommandType.CMD_CONVERT_MP4_OK:
                const totalBytes = message.data.slice(1).readUInt32LE();
                this.log.debug(`Station ${this.stationSerial} - CMD_CONVERT_MP4_OK`, { channel: message.channel, totalBytes: totalBytes });
                this.downloadTotalBytes = totalBytes;
                //this.initializeStream(P2PDataType.BINARY);
                this.currentMessageState[P2PDataType.BINARY].streaming = true;
                this.currentMessageState[P2PDataType.BINARY].streamChannel = message.channel;
                break;
            case CommandType.CMD_WIFI_CONFIG:
                const rssi = message.data.readInt32LE();
                this.log.debug(`Station ${this.stationSerial} - CMD_WIFI_CONFIG`, { channel: message.channel, rssi: rssi });
                this.emit("wifi rssi", message.channel, rssi);
                break;
            case CommandType.CMD_DOWNLOAD_FINISH:
                this.log.debug(`Station ${this.stationSerial} - CMD_DOWNLOAD_FINISH`, { channel: message.channel });
                this.endStream(P2PDataType.BINARY);
                break;
            case CommandType.CMD_DOORBELL_NOTIFY_PAYLOAD:
                try {
                    this.log.debug(`Station ${this.stationSerial} - CMD_DOORBELL_NOTIFY_PAYLOAD`, { payload: message.data.toString() });
                    //TODO: Finish implementation, emit an event...
                    //this.emit("", JSON.parse(message.data.toString()) as xy);
                } catch (error) {
                    this.log.error(`Station ${this.stationSerial} - CMD_DOORBELL_NOTIFY_PAYLOAD - Error:`, error);
                }
                break;
            case CommandType.CMD_NAS_SWITCH:
                try {
                    this.log.debug(`Station ${this.stationSerial} - CMD_NAS_SWITCH`, { payload: message.data.toString() });
                    this.emit("rtsp url", message.channel, message.data.toString());
                } catch (error) {
                    this.log.error(`Station ${this.stationSerial} - CMD_NAS_SWITCH - Error:`, error);
                }
                break;
            case CommandType.SUB1G_REP_UNPLUG_POWER_LINE:
                try {
                    this.log.debug(`Station ${this.stationSerial} - SUB1G_REP_UNPLUG_POWER_LINE`, { payload: message.data.toString() });
                    //TODO: Finish implementation, emit an event...
                    //this.emit("", );
                } catch (error) {
                    this.log.error(`Station ${this.stationSerial} - SUB1G_REP_UNPLUG_POWER_LINE - Error:`, error);
                }
                break;
            case CommandType.CMD_NOTIFY_PAYLOAD:
                try {
                    this.log.debug(`Station ${this.stationSerial} - CMD_NOTIFY_PAYLOAD`, { payload: message.data.toString() });
                    const json: CmdESLNotifyPayload = JSON.parse(message.data.toString()) as CmdESLNotifyPayload;
                    if (json.cmd === CommandType.CMD_DOORLOCK_P2P_SEQ) {
                        switch (json.payload.lock_cmd) {
                            case 0:
                                if (json.payload.seq_num !== undefined) {
                                    this.lockSeqNumber = json.payload.seq_num;
                                    this.log.debug(`Station ${this.stationSerial} - CMD_NOTIFY_PAYLOAD - Lock sequence number`, { lockSeqNumber: this.lockSeqNumber });
                                }
                                break;
                            default:
                                this.log.debug(`Station ${this.stationSerial} - CMD_NOTIFY_PAYLOAD - Not implemented`, { message: message.data.toString() });
                                break;
                        }
                    } else if (json.cmd === CommandType.CMD_DOORLOCK_DATA_PASS_THROUGH) {
                        if (this.deviceSNs[message.channel] !== undefined) {
                            if (json.payload.lock_payload !== undefined) {
                                const decoded = decodeBase64(decodeLockPayload(Buffer.from(json.payload.lock_payload)));
                                const key = generateLockAESKey(this.deviceSNs[message.channel].admin_user_id, this.stationSerial);
                                const iv = getLockVectorBytes(this.stationSerial);

                                this.log.debug(`Station ${this.stationSerial} - CMD_DOORLOCK_DATA_PASS_THROUGH`, { commandIdName: CommandType[json.cmd], commandId: json.cmd, key: key, iv: iv, decoded: decoded.toString("hex") });

                                json.payload.lock_payload = decryptLockAESData(key, iv, decoded).toString("hex");

                                switch (json.payload.lock_cmd) {
                                    case ESLInnerCommand.NOTIFY:
                                        const notifyBuffer = Buffer.from(json.payload.lock_payload, "hex");
                                        this.emit("esl parameter", message.channel, CommandType.CMD_GET_BATTERY, notifyBuffer.slice(3, 4).readInt8().toString());
                                        this.emit("esl parameter", message.channel, CommandType.CMD_DOORLOCK_GET_STATE, notifyBuffer.slice(6, 7).readInt8().toString());
                                        break;
                                    default:
                                        this.log.debug(`Station ${this.stationSerial} - CMD_DOORLOCK_DATA_PASS_THROUGH - Not implemented`, { message: message.data.toString() });
                                        break;
                                }
                            }
                        }
                    } else {
                        this.log.debug(`Station ${this.stationSerial} - CMD_NOTIFY_PAYLOAD - Not implemented`, { commandIdName: CommandType[json.cmd], commandId: json.cmd, message: message.data.toString() });
                    }
                } catch (error) {
                    this.log.error(`Station ${this.stationSerial} - CMD_NOTIFY_PAYLOAD Error:`, { erorr: error, payload: message.data.toString() });
                }
                break;
            default:
                this.log.debug(`Station ${this.stationSerial} - Not implemented - CONTROL message`, { commandIdName: CommandType[message.commandId], commandId: message.commandId, channel: message.channel, data: message.data.toString("hex") });
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
            this.log.error(`Station ${this.stationSerial} - Error:`, error);
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
        this._clearLookupTimeout();
        this._clearConnectTimeout();
        this._clearHeartbeatTimeout();
        this._clearMessageStateTimeouts();
        if (this.socket) {
            if (this.connected)
                await sendMessage(this.socket, this.connectAddress!, RequestMessageType.END).catch((error) => {
                    this.log.error(`Station ${this.stationSerial} - Error`, error);
                });
            else
                try {
                    this.socket.close();
                } catch(error) {
                }
        }
    }

    private getHeartbeatInterval(): number {
        return this.HEARTBEAT_INTERVAL;
    }

    private onClose(): void {
        this._disconnected();
    }

    private onError(error: any): void {
        this.log.debug(`Station ${this.stationSerial} - Error:`, error);
    }

    private scheduleHeartbeat(): void {
        if (this.isConnected()) {
            this.sendPing(this.connectAddress!);
            this.heartbeatTimeout = setTimeout(() => {
                this.scheduleHeartbeat();
            }, this.getHeartbeatInterval());
        } else {
            this.log.debug(`Station ${this.stationSerial} - Heartbeat disabled!`);
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

        this.currentMessageState[datatype].streaming = false;
    }

    private endStream(datatype: P2PDataType): void {
        if (this.currentMessageState[datatype].streaming) {
            this.currentMessageState[datatype].streaming = false;

            this.currentMessageState[datatype].videoStream?.push(null);
            this.currentMessageState[datatype].audioStream?.push(null);

            if (!this.currentMessageState[datatype].invalidStream)
                this.emitStreamStopEvent(datatype);

            this.initializeMessageBuilder(datatype);
            this.initializeMessageState(datatype, this.currentMessageState[datatype].rsaKey);
            this.initializeStream(datatype);
        }
    }

    private emitStreamStartEvent(datatype: P2PDataType): void {
        this.currentMessageState[datatype].streamNotStarted = false;
        if (datatype === P2PDataType.VIDEO) {
            this.emit("livestream started", this.currentMessageState[datatype].streamChannel, this.currentMessageState[datatype].streamMetadata, this.currentMessageState[datatype].videoStream!, this.currentMessageState[datatype].audioStream!);
        } else if (datatype === P2PDataType.BINARY) {
            this.emit("download started", this.currentMessageState[datatype].streamChannel, this.currentMessageState[datatype].streamMetadata, this.currentMessageState[datatype].videoStream!, this.currentMessageState[datatype].audioStream!);
        }
    }

    private emitStreamStopEvent(datatype: P2PDataType): void {
        if (datatype === P2PDataType.VIDEO) {
            this.emit("livestream stopped", this.currentMessageState[datatype].streamChannel);
        } else if (datatype === P2PDataType.BINARY) {
            this.emit("download finished", this.currentMessageState[datatype].streamChannel);
        }
    }

    public isStreaming(channel: number, datatype: P2PDataType): boolean {
        if (this.currentMessageState[datatype].streamChannel === channel)
            return this.currentMessageState[datatype].streaming;
        return false;
    }

    public isLiveStreaming(channel: number): boolean {
        return this.isStreaming(channel, P2PDataType.VIDEO);
    }

    public isDownloading(channel: number): boolean {
        return this.isStreaming(channel, P2PDataType.BINARY);
    }

    public setQuickStreamStart(value: boolean): void {
        this.quickStreamStart = value;
    }

    public getQuickStreamStart(): boolean {
        return this.quickStreamStart;
    }

    public getLockSequenceNumber(): number {
        if (this.lockSeqNumber === -1)
            this.lockSeqNumber = generateLockSequence();
        return this.lockSeqNumber;
    }

    public incLockSequenceNumber(): number {
        if (this.lockSeqNumber === -1)
            this.lockSeqNumber = generateLockSequence();
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
}