import { createSocket, Socket, RemoteInfo } from "dgram";
import { TypedEmitter } from "tiny-typed-emitter";
import NodeRSA from "node-rsa";
import { Readable } from "stream";
import { dummyLogger, Logger } from "ts-log";

import { Address, CmdCameraInfoResponse, CommandResult } from "./models";
import { sendMessage, hasHeader, buildCheckCamPayload, buildIntCommandPayload, buildIntStringCommandPayload, buildCommandHeader, MAGIC_WORD, buildCommandWithStringTypePayload, isPrivateIp, buildLookupWithKeyPayload, sortP2PMessageParts, buildStringTypeCommandPayload, getRSAPrivateKey, decryptAESData, getNewRSAPrivateKey } from "./utils";
import { RequestMessageType, ResponseMessageType, CommandType, ErrorCode, P2PDataType, P2PDataTypeHeader, AudioCodec, VideoCodec } from "./types";
import { AlarmMode } from "../http/types";
import { LookupAdresses, P2PDataMessage, P2PDataMessageAudio, P2PDataMessageBuilder, P2PMessageState, P2PDataMessageVideo, P2PMessage, P2PDataHeader, P2PDataMessageState, P2PClientProtocolEvents } from "./interfaces";

export class P2PClientProtocol extends TypedEmitter<P2PClientProtocolEvents> {

    private readonly MAX_RETRIES = 10;
    private readonly MAX_COMMAND_RESULT_WAIT = 20 * 1000;
    private readonly MAX_AKNOWLEDGE_TIMEOUT = 15 * 1000;
    private readonly MAX_LOOKUP_TIMEOUT = 15 * 1000;
    private readonly MAX_EXPECTED_SEQNO_WAIT = 20 * 1000;
    private readonly HEARTBEAT_INTERVAL = 5 * 1000;

    private readonly MAX_PAYLOAD_BYTES = 1028;
    private readonly MAX_PACKET_BYTES = 1024;

    private socket!: Socket;
    private binded = false;
    private connected = false;

    private seqNumber = 0;
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

    private cloud_addresses: Array<Address> = [
        { host: "18.197.212.165", port: 32100 },    // Germany Frankfurt
        { host: "34.235.4.153", port: 32100 },      // USA Ashburn
        { host: "54.153.101.7", port: 32100 },      // USA San Francisco
        { host: "18.223.127.200", port: 32100 },    // USA Columbus
        { host: "54.223.148.206", port: 32100 },    // China Beijing
        { host: "13.251.222.7", port: 32100 },      // Singapore
    ];

    private message_states: Map<number, P2PMessageState> = new Map<number, P2PMessageState>();
    private address_lookups: LookupAdresses = {};

    private connectTimeout?: NodeJS.Timeout;
    private lookupTimeout?: NodeJS.Timeout;
    private heartbeatTimeout?: NodeJS.Timeout;
    private connectTime: number | null = null;
    private lastPong: number | null = null;

    private addresses: Array<Address> = [];
    private current_address = 0;
    private p2p_did: string;
    private dsk_key: string;
    private log: Logger;

    constructor(p2p_did: string, dsk_key: string, log: Logger = dummyLogger) {
        super();
        this.p2p_did = p2p_did;
        this.dsk_key = dsk_key;
        this.log = log;

        this.socket = createSocket("udp4");
        this.socket.on("message", (msg, rinfo) => this.handleMsg(msg, rinfo));
        this.socket.on("error", (error) => this.onError(error));
        this.socket.on("close", () => this.onClose());

        let rsaKey: NodeRSA | null;
        for(let datatype = 0; datatype < 4; datatype++) {

            this.expectedSeqNo[datatype] = 0;

            if (datatype === P2PDataType.VIDEO)
                rsaKey = getNewRSAPrivateKey();
            else
                rsaKey = null;

            this.initializeMessageBuilder(datatype);
            this.initializeMessageState(datatype, rsaKey);
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
            }
        };
    }

    private _clearHeartbeat(): void {
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = undefined;
        }
    }

    private _disconnected(): void {
        this._clearHeartbeat();
        this.connected = false;
        this.lastPong = null;
        this.connectTime = null;
        this.emit("close");
    }

    public lookup(): void {
        this.cloud_addresses.map((address) => this.lookupByAddress(address, this.p2p_did, this.dsk_key));

        if (this.lookupTimeout)
            clearTimeout(this.lookupTimeout);

        this.lookupTimeout = setTimeout(() => {
            this.log.error(`${this.constructor.name}.lookup(): All address lookup tentatives failed.`);
            this._disconnected();
        }, this.MAX_LOOKUP_TIMEOUT);
    }

    private lookupByAddress(address: Address, p2pDid: string, dskKey: string): void {
        // Send lookup message
        const msgId = RequestMessageType.LOOKUP_WITH_KEY;
        const payload = buildLookupWithKeyPayload(this.socket, p2pDid, dskKey);
        sendMessage(this.socket, address, msgId, payload).catch((error) => {
            this.log.error(`${this.constructor.name}.lookup(): Error: ${error}`);
        });
    }

    public isConnected(): boolean {
        return this.connected;
    }

    private _connect(): void {
        this.log.debug(`${this.constructor.name}.connect(): Connecting to host ${this.addresses[this.current_address].host} on port ${this.addresses[this.current_address].port}...`);
        for (let i = 0; i < 4; i++)
            this.sendCamCheck();

        this.connectTimeout = setTimeout(() => {
            if (this.addresses.length - 1 > this.current_address) {
                this.log.warn(`${this.constructor.name}.connect(): Could not connect to host ${this.addresses[this.current_address].host} on port ${this.addresses[this.current_address].port}! Try next one...`);
                this.current_address++;
                this._connect();
                return;
            } else {
                this.log.warn(`${this.constructor.name}.connect(): Tried all hosts, no connection could be established.`);
                this._disconnected();
            }
        }, this.MAX_AKNOWLEDGE_TIMEOUT);
    }

    public async connect(): Promise<void> {
        if (!this.connected) {
            if (this.addresses.length === 0) {
                if (!this.binded)
                    this.socket.bind(0, () => {
                        this.binded = true;
                        this.socket.setRecvBufferSize(8388608);
                        this.lookup();
                    });
                else
                    this.lookup();
            } else {
                this._connect();
            }
        }
    }

    private sendCamCheck(port?: number): void {
        const payload = buildCheckCamPayload(this.p2p_did);
        if (port) {
            sendMessage(this.socket, { host: this.addresses[this.current_address].host, port: port}, RequestMessageType.CHECK_CAM, payload).catch((error) => {
                this.log.error(`${this.constructor.name}.sendCamCheck(): Error: ${error}`);
            });
        } else
            sendMessage(this.socket, this.addresses[this.current_address], RequestMessageType.CHECK_CAM, payload).catch((error) => {
                this.log.error(`${this.constructor.name}.sendCamCheck(): Error: ${error}`);
            });
    }

    public sendPing(): void {
        if ((this.lastPong && ((new Date().getTime() - this.lastPong) / this.getHeartbeatInterval() >= this.MAX_RETRIES)) ||
            (this.connectTime && !this.lastPong && ((new Date().getTime() - this.connectTime) / this.getHeartbeatInterval() >= this.MAX_RETRIES))) {
            this.log.warn(`${this.constructor.name}.sendPing(): Heartbeat check failed. Connection seems lost. Try to reconnect...`);
            this._disconnected();
        }
        sendMessage(this.socket, this.addresses[this.current_address], RequestMessageType.PING).catch((error) => {
            this.log.error(`${this.constructor.name}.sendPing(): Error: ${error}`);
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
                this.log.error(`${this.constructor.name}.sendCommandWithString(): CMD_SET_PAYLOAD - Error: ${error}`);
            }
        } else if (commandType == CommandType.CMD_DOORBELL_SET_PAYLOAD) {
            try {
                const json = JSON.parse(value);
                nested_commandType = json.commandType;
            } catch (error) {
                this.log.error(`${this.constructor.name}.sendCommandWithString(): CMD_DOORBELL_SET_PAYLOAD - Error: ${error}`);
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
        this.message_states.set(msgSeqNumber, message);

        this._sendCommand(message);
    }

    private _sendCommand(message: P2PMessageState): void {
        this.log.debug(`${this.constructor.name}._sendCommand(): sequence: ${message.sequence} command_type: ${message.command_type} channel: ${message.channel} retries: ${message.retries} message_states.size: ${this.message_states.size}`);
        if (message.retries < this.MAX_RETRIES) {
            if (message.return_code === ErrorCode.ERROR_FAILED_TO_REQUEST) {
                this.message_states.delete(message.sequence);
                message.sequence = this.seqNumber++;
                message.data.writeUInt16BE(message.sequence, 2);
                this.message_states.set(message.sequence, message);
            }
            sendMessage(this.socket, this.addresses[this.current_address], RequestMessageType.DATA, message.data).catch((error) => {
                this.log.error(`${this.constructor.name}._sendCommand(): Error: ${error}`);
            });
            const msg = this.message_states.get(message.sequence);
            if (msg) {
                msg.return_code = ErrorCode.ERROR_COMMAND_TIMEOUT;
                msg.retries++;
                msg.timeout = setTimeout(() => {
                    this._sendCommand(msg);
                }, this.MAX_AKNOWLEDGE_TIMEOUT);
                this.message_states.set(msg.sequence, msg);
            }
        } else {
            this.log.error(`${this.constructor.name}._sendCommand(): Max retries ${this.message_states.get(message.sequence)?.retries} - stop with error for sequence: ${message.sequence} command_type: ${message.command_type} channel: ${message.channel} retries: ${message.retries}`);
            this.emit("command", {
                command_type: message.nested_command_type !== undefined ? message.nested_command_type : message.command_type,
                channel: message.channel,
                return_code: message.return_code
            } as CommandResult);
            this.message_states.delete(message.sequence);
            if (message.return_code === ErrorCode.ERROR_COMMAND_TIMEOUT) {
                this.log.warn(`${this.constructor.name}._sendCommand(): Connection seems lost. Try to reconnect...`);
                this._disconnected();
            }
        }
    }

    private handleMsg(msg: Buffer, rinfo: RemoteInfo): void {
        if (hasHeader(msg, ResponseMessageType.LOOKUP_ADDR)) {
            const port = msg.slice(6, 8).readUInt16LE();
            const ip = `${msg[11]}.${msg[10]}.${msg[9]}.${msg[8]}`;

            this.log.debug(`${this.constructor.name}.handleMsg(): LOOKUP_ADDR - Got response from host ${rinfo.address}:${rinfo.port}: ip: ${ip} port: ${port}`);

            if (this.addresses.length === 2 && this.connected) {
                this.log.debug(`${this.constructor.name}.handleMsg(): LOOKUP_ADDR - Addresses already got, ignoring response from host ${rinfo.address}:${rinfo.port}: ip: ${ip} port: ${port}`);
            } else {
                if (ip === "0.0.0.0") {
                    this.log.debug(`${this.constructor.name}.handleMsg(): LOOKUP_ADDR - Got invalid ip address 0.0.0.0, ignoring response!`);
                    return;
                }
                const tmp = this.address_lookups[`${rinfo.address}:${rinfo.port}`];
                if (tmp) {
                    if (!tmp.includes({ host: ip, port: port }))
                        if (isPrivateIp(ip)) {
                            tmp.unshift({ host: ip, port: port });
                        } else {
                            tmp.push({ host: ip, port: port });
                        }
                    this.address_lookups[`${rinfo.address}:${rinfo.port}`] = tmp;
                } else {
                    this.address_lookups[`${rinfo.address}:${rinfo.port}`] = [{ host: ip, port: port }];
                }
                if (this.address_lookups[`${rinfo.address}:${rinfo.port}`].length === 2 && !!this.lookupTimeout) {
                    this.addresses = this.address_lookups[`${rinfo.address}:${rinfo.port}`];
                    this.address_lookups = {};
                    clearTimeout(this.lookupTimeout);
                    this.lookupTimeout = undefined;
                    this.log.debug(`${this.constructor.name}.handleMsg(): Got addresses (${JSON.stringify(this.addresses)})! Try to connect...`);
                    this._connect();
                }
            }
        } else if (hasHeader(msg, ResponseMessageType.CAM_ID)) {
            // Answer from the device to a CAM_CHECK message
            this.log.debug(`${this.constructor.name}.handleMsg(): CAM_ID - received from host ${rinfo.address}:${rinfo.port}`);
            if (!this.connected) {
                this.log.debug(`${this.constructor.name}.handleMsg(): CAM_ID - Connected!`);
                if (!!this.connectTimeout) {
                    clearTimeout(this.connectTimeout);
                }
                this.connected = true;
                this.connectTime = new Date().getTime();
                this.lastPong = null;
                this.heartbeatTimeout = setTimeout(() => {
                    this.scheduleHeartbeat();
                }, this.getHeartbeatInterval());
                this.emit("connect", this.addresses[this.current_address]);
            } else {
                this.log.debug(`${this.constructor.name}.handleMsg(): CAM_ID - Already connected, ignoring...`);
            }
        } else if (hasHeader(msg, ResponseMessageType.PONG)) {
            // Response to a ping from our side
            this.lastPong = new Date().getTime();
            return;
        } else if (hasHeader(msg, ResponseMessageType.PING)) {
            // Response with PONG to keep alive
            sendMessage(this.socket, this.addresses[this.current_address], RequestMessageType.PONG).catch((error) => {
                this.log.error(`${this.constructor.name}.handleMsg(): Error: ${error}`);
            });
            return;
        } else if (hasHeader(msg, ResponseMessageType.END)) {
            // Connection is closed by device
            this.log.debug(`${this.constructor.name}.handleMsg(): END - received from host ${rinfo.address}:${rinfo.port}`);
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
                this.log.debug(`${this.constructor.name}.handleMsg(): ACK ${P2PDataType[dataType]} - received from host ${rinfo.address}:${rinfo.port} for sequence ${ackedSeqNo}`);
                const msg_state = this.message_states.get(ackedSeqNo);
                if (msg_state && !msg_state.acknowledged) {
                    msg_state.acknowledged = true;
                    if (msg_state.timeout) {
                        clearTimeout(msg_state.timeout);
                    }
                    msg_state.timeout = setTimeout(() => {
                        this.log.warn(`${this.constructor.name}.handleMsg(): Result data for command not received - message: ${JSON.stringify(msg_state)}`);
                        this.message_states.delete(ackedSeqNo);
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

            this.sendAck(dataTypeBuffer, seqNo);
            this.log.debug(`${this.constructor.name}.handleMsg(): DATA ${P2PDataType[message.type]} - received from host ${rinfo.address}:${rinfo.port} - Processing sequence ${message.seqNo}...`);

            if (message.seqNo === this.expectedSeqNo[dataType]) {

                const timeout = this.currentMessageState[dataType].waitForSeqNoTimeout;
                if (timeout) {
                    clearTimeout(timeout);
                    this.currentMessageState[dataType].waitForSeqNoTimeout = undefined;
                }

                // expected seq packet arrived
                this.expectedSeqNo[dataType]++;
                this.parseDataMessage(message);

                this.log.debug(`${this.constructor.name}.handleMsg(): DATA ${P2PDataType[message.type]} - Received expected sequence (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);

                for (const element of this.currentMessageState[dataType].queuedData.values()) {
                    if (this.expectedSeqNo[dataType] === element.seqNo) {
                        this.log.debug(`${this.constructor.name}.handleMsg(): DATA ${P2PDataType[element.type]} - Work off queued data (seqNo: ${element.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                        this.expectedSeqNo[dataType]++;
                        this.parseDataMessage(element);
                        this.currentMessageState[dataType].queuedData.delete(element.seqNo);
                    } else {
                        this.log.debug(`${this.constructor.name}.handleMsg(): DATA ${P2PDataType[element.type]} - Work off missing data interrupt queue dismantle (seqNo: ${element.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                        break;
                    }
                }
            } else if (this.expectedSeqNo[dataType] > message.seqNo) {
                // We have already seen this message, skip!
                // This can happen because the device is sending the message till it gets a ACK
                // which can take some time.
                this.log.debug(`${this.constructor.name}.handleMsg(): DATA ${P2PDataType[message.type]} - Received already processed sequence (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                return;
            } else {
                if (!this.currentMessageState[dataType].waitForSeqNoTimeout)
                    this.currentMessageState[dataType].waitForSeqNoTimeout = setTimeout(() => {
                        this.endStream(dataType);
                        this.currentMessageState[dataType].waitForSeqNoTimeout = undefined;
                    }, this.MAX_EXPECTED_SEQNO_WAIT);

                if (!this.currentMessageState[dataType].queuedData.get(message.seqNo)) {
                    this.currentMessageState[dataType].queuedData.set(message.seqNo, message);
                    this.log.debug(`${this.constructor.name}.handleMsg(): DATA ${P2PDataType[message.type]} - Received not expected sequence, added to the queue for future processing (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                } else {
                    this.log.debug(`${this.constructor.name}.handleMsg(): DATA ${P2PDataType[message.type]} - Received not expected sequence, discarded since already present in queue for future processing (seqNo: ${message.seqNo} queuedData.size: ${this.currentMessageState[dataType].queuedData.size})`);
                }
            }
        } else {
            this.log.debug(`${this.constructor.name}.handleMsg(): received unknown message from host ${rinfo.address}:${rinfo.port} - msg.length: ${msg.length} msg: ${msg.toString("hex")}`);
        }
    }

    private parseDataMessage(message: P2PMessage): void {
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
            this.log.trace(`${this.constructor.name}.parseDataMessage(): seqNo: ${message.seqNo} header: ${JSON.stringify(this.currentMessageBuilder[message.type].header)} bytesRead: ${this.currentMessageBuilder[message.type].bytesRead} bytesToRead:${this.currentMessageBuilder[message.type].header.bytesToRead} firstPartMessage: ${firstPartMessage} msg_size: ${message.data.length}`);
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

                this.log.debug(`${this.constructor.name}.handleData(): commandId: ${commandStr} (${message.commandId}) - result: code: ${error_codeStr} (${return_code}) message: ${return_msg} - data: ${message.data.toString("hex")}`);

                const msg_state = this.message_states.get(message.seqNo);

                if (msg_state) {
                    if (msg_state.command_type === message.commandId) {
                        if (msg_state.timeout) {
                            clearTimeout(msg_state.timeout);
                        }
                        const command_type =  msg_state.nested_command_type !== undefined ? msg_state.nested_command_type : msg_state.command_type;
                        this.log.debug(`${this.constructor.name}.handleData(): Result data for command received - message: ${JSON.stringify(msg_state)} result: ${error_codeStr} (${return_code})`);
                        if (return_code === ErrorCode.ERROR_FAILED_TO_REQUEST) {
                            msg_state.return_code = return_code;
                            this._sendCommand(msg_state);
                        } else {
                            if (return_code === ErrorCode.ERROR_PPCS_SUCCESSFUL) {
                                if (command_type === CommandType.CMD_START_REALTIME_MEDIA || command_type === CommandType.CMD_RECORD_VIEW || (msg_state.nested_command_type !== undefined && msg_state.nested_command_type === 1000 && msg_state.command_type === CommandType.CMD_DOORBELL_SET_PAYLOAD)) {
                                    this.initializeStream(P2PDataType.VIDEO);
                                    this.currentMessageState[P2PDataType.VIDEO].streamChannel = msg_state.channel;
                                } else if (command_type === CommandType.CMD_STOP_REALTIME_MEDIA) { //TODO: CommandType.CMD_RECORD_PLAY_CTRL only if stop
                                    this.endStream(P2PDataType.VIDEO);
                                } else if (command_type === CommandType.CMD_DOWNLOAD_CANCEL) {
                                    this.endStream(P2PDataType.BINARY);
                                }
                            }
                            this.emit("command", {
                                command_type: command_type,
                                channel: msg_state.channel,
                                return_code: return_code
                            } as CommandResult);
                            this.message_states.delete(message.seqNo);
                        }
                    } else {
                        this.log.warn(`${this.constructor.name}.handleData(): data_type: ${P2PDataType[message.data_type]} commandtype and sequencenumber different!!!`);
                    }
                } else {
                    this.log.warn(`${this.constructor.name}.handleData(): data_type: ${P2PDataType[message.data_type]} sequence: ${message.seqNo} not present!!!`);
                }
            } else {
                this.log.warn(`${this.constructor.name}.handleData(): Unsupported response of data_type: ${P2PDataType[message.data_type]} commandId: ${commandStr} (${message.commandId}) - msg: ${message.data.toString("hex")}`);
            }
        } else if (message.data_type === P2PDataType.VIDEO || message.data_type === P2PDataType.BINARY) {
            this.handleDataBinaryAndVideo(message);
        } else {
            this.log.warn(`${this.constructor.name}.handleData(): Not implemented data type - seqNo: ${message.seqNo} dataType: ${message.data_type} commandId: ${message.commandId} msg: ${message.data.toString("hex")}`);
        }
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
                    //const isKeyFrame = message.data.slice(4, 5).readUInt8() === 1 ? true : false;

                    videoMetaData.videoDataLength = message.data.slice(0, 4).readUInt32LE();
                    videoMetaData.streamType = message.data.slice(5, 6).readUInt8();
                    videoMetaData.videoSeqNo = message.data.slice(6, 8).readUInt16LE();
                    videoMetaData.videoFPS = message.data.slice(8, 10).readUInt16LE();
                    videoMetaData.videoWidth = message.data.slice(10, 12).readUInt16LE();
                    videoMetaData.videoHeight = message.data.slice(12, 14).readUInt16LE();
                    videoMetaData.videoTimestamp = message.data.slice(14, 20).readUIntLE(0, 6);

                    let payloadStart = 22;
                    if (/*isKeyFrame &&*/ message.signCode > 0 && data_length >= 128) {
                        const key = message.data.slice(22, 150);
                        const rsaKey = this.currentMessageState[message.data_type].rsaKey;
                        if (rsaKey) {
                            try {
                                videoMetaData.aesKey = rsaKey.decrypt(key).toString("hex");
                                this.log.trace(`${this.constructor.name}.handleDataBinaryAndVideo(): Decrypted AES key: ${videoMetaData.aesKey}`);
                            } catch (error) {
                                this.log.warn(`${this.constructor.name}.handleDataBinaryAndVideo(): AES key could not be decrypted! The entire stream is discarded. - Error: ${error}`);
                                this.currentMessageState[message.data_type].invalidStream = true;
                                return;
                            }
                        } else {
                            this.log.warn(`${this.constructor.name}.handleDataBinaryAndVideo(): Private RSA key is missing! Stream could not be decrypted. The entire stream is discarded.`);
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

                    this.log.debug(`${this.constructor.name}.handleDataBinaryAndVideo(): CMD_VIDEO_FRAME: data_size: ${message.data.length} metadata: ${JSON.stringify(videoMetaData)} video_data_size: ${video_data.length}`);

                    if (this.currentMessageState[message.data_type].streamNotStarted) {
                        this.currentMessageState[message.data_type].streamFirstVideoDataReceived = true;
                        this.currentMessageState[message.data_type].streamMetadata.videoCodec = videoMetaData.streamType;
                        this.currentMessageState[message.data_type].streamMetadata.videoFPS = videoMetaData.videoFPS;
                        this.currentMessageState[message.data_type].streamMetadata.videoHeight = videoMetaData.videoHeight;
                        this.currentMessageState[message.data_type].streamMetadata.videoWidth = videoMetaData.videoWidth;

                        if (this.currentMessageState[message.data_type].streamFirstAudioDataReceived && this.currentMessageState[message.data_type].streamFirstVideoDataReceived) {
                            this.emitStreamStartEvent(message.data_type);
                        }
                    }

                    this.currentMessageState[message.data_type].videoStream?.push(video_data);
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
                    this.log.debug(`${this.constructor.name}.handleDataBinaryAndVideo(): CMD_AUDIO_FRAME: data_size: ${message.data.length} metadata: ${JSON.stringify(audioMetaData)} audio_data_size: ${audio_data.length}`);

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
                    this.log.warn(`${this.constructor.name}.handleDataBinaryAndVideo(): Not implemented - message with commandId: ${CommandType[message.commandId]} (${message.commandId}) channel: ${message.channel} - data: ${message.data.toString("hex")}`);
                    break;
            }
        } else {
            this.log.debug(`${this.constructor.name}.handleDataBinaryAndVideo(): Invalid stream data, dropping complete stream - message with commandId: ${CommandType[message.commandId]} (${message.commandId}) channel: ${message.channel} - data: ${message.data.toString("hex")}`);
        }
    }

    private handleDataControl(message: P2PDataMessage): void {
        switch(message.commandId) {
            case CommandType.CMD_GET_ALARM_MODE:
                this.log.debug(`${this.constructor.name}.handleDataControl(): Alarm mode changed to: ${AlarmMode[message.data.readUIntBE(0, 1)]}`);
                this.emit("alarm_mode", message.data.readUIntBE(0, 1) as AlarmMode);
                break;
            case CommandType.CMD_CAMERA_INFO:
                try {
                    this.log.debug(`${this.constructor.name}.handleDataControl(): Camera info: ${message.data.toString()}`);
                    this.emit("camera_info", JSON.parse(message.data.toString()) as CmdCameraInfoResponse);
                } catch (error) {
                    this.log.error(`${this.constructor.name}.handleDataControl(): Camera info - Error: ${error}`);
                }
                break;
            case CommandType.CMD_CONVERT_MP4_OK:
                const totalBytes = message.data.slice(1).readUInt32LE();
                this.log.debug(`${this.constructor.name}.handleDataControl(): CMD_CONVERT_MP4_OK channel: ${message.channel} totalBytes: ${totalBytes}`);
                this.downloadTotalBytes = totalBytes;
                this.initializeStream(P2PDataType.BINARY);
                this.currentMessageState[P2PDataType.BINARY].streamChannel = message.channel;
                break;
            case CommandType.CMD_WIFI_CONFIG:
                const rssi = message.data.readInt32LE();
                this.log.debug(`${this.constructor.name}.handleDataControl(): CMD_WIFI_CONFIG channel: ${message.channel} rssi: ${rssi}`);
                this.emit("wifi_rssi", message.channel, rssi);
                break;
            case CommandType.CMD_DOWNLOAD_FINISH:
                this.log.debug(`${this.constructor.name}.handleDataControl(): CMD_DOWNLOAD_FINISH channel: ${message.channel}`);
                this.endStream(P2PDataType.BINARY);
                break;
            case CommandType.CMD_DOORBELL_NOTIFY_PAYLOAD:
                try {
                    this.log.debug(`${this.constructor.name}.handleDataControl(): CMD_DOORBELL_NOTIFY_PAYLOAD payload: ${message.data.toString()}`);
                    //TODO: Finish implementation, emit an event...
                    //this.emit("camera_info", JSON.parse(message.data.toString()) as xy);
                } catch (error) {
                    this.log.error(`${this.constructor.name}.handleDataControl(): CMD_DOORBELL_NOTIFY_PAYLOAD payload: ${error}`);
                }
                break;
            default:
                this.log.warn(`${this.constructor.name}.handleDataControl(): Not implemented - CONTROL message with commandId: ${CommandType[message.commandId]} (${message.commandId}) channel: ${message.channel} - data: ${message.data.toString("hex")}`);
                break;
        }
    }

    private sendAck(dataType: Buffer, seqNo: number): void {
        const num_pending_acks = 1;  // Max possible: 17 in one ack packet
        const pendingAcksBuffer = Buffer.allocUnsafe(2);
        pendingAcksBuffer.writeUInt16BE(num_pending_acks, 0);
        const seqBuffer = Buffer.allocUnsafe(2);
        seqBuffer.writeUInt16BE(seqNo, 0);
        const payload = Buffer.concat([dataType, pendingAcksBuffer, seqBuffer]);
        sendMessage(this.socket, this.addresses[this.current_address], RequestMessageType.ACK, payload).catch((error) => {
            this.log.error(`${this.constructor.name}.sendAck(): Error: ${error}`);
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
        if (this.socket) {
            if (this.connected)
                await sendMessage(this.socket, this.addresses[this.current_address], RequestMessageType.END).catch((error) => {
                    this.log.error(`${this.constructor.name}.close(): Error: ${error}`);
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
        this.log.debug(`${this.constructor.name}.onClose():`);
        this._disconnected();
    }

    private onError(error: any): void {
        this.log.debug(`${this.constructor.name}.onError(): Error: ${error}`);
    }

    private scheduleHeartbeat(): void {
        if (this.isConnected()) {
            this.sendPing();
            this.heartbeatTimeout = setTimeout(() => {
                this.scheduleHeartbeat();
            }, this.getHeartbeatInterval());
        } else {
            this.log.debug(`${this.constructor.name}.scheduleHeartbeat(): disabled!`);
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

        this.currentMessageState[datatype].streaming = true;
    }

    private endStream(datatype: P2PDataType): void {
        this.currentMessageState[datatype].videoStream?.push(null);
        this.currentMessageState[datatype].audioStream?.push(null);
        this.currentMessageState[datatype].videoStream?.destroy();
        this.currentMessageState[datatype].audioStream?.destroy();
        this.currentMessageState[datatype].videoStream = null;
        this.currentMessageState[datatype].audioStream = null;

        if (!this.currentMessageState[datatype].invalidStream)
            this.emitStreamStopEvent(datatype);

        this.currentMessageState[datatype].streaming = false;
        this.initializeMessageBuilder(datatype);
        this.initializeMessageState(datatype, this.currentMessageState[datatype].rsaKey);
    }

    private emitStreamStartEvent(datatype: P2PDataType): void {
        this.log.trace(`${this.constructor.name}.emitStreamStartEvent():`);
        this.currentMessageState[datatype].streamNotStarted = false;
        if (datatype === P2PDataType.VIDEO) {
            this.emit("start_livestream", this.currentMessageState[datatype].streamChannel, this.currentMessageState[datatype].streamMetadata, this.currentMessageState[datatype].videoStream!, this.currentMessageState[datatype].audioStream!);
        } else if (datatype === P2PDataType.BINARY) {
            this.emit("start_download", this.currentMessageState[datatype].streamChannel, this.currentMessageState[datatype].streamMetadata, this.currentMessageState[datatype].videoStream!, this.currentMessageState[datatype].audioStream!);
        }
    }

    private emitStreamStopEvent(datatype: P2PDataType): void {
        this.log.trace(`${this.constructor.name}.emitStreamStopEvent():`);
        if (datatype === P2PDataType.VIDEO) {
            this.emit("stop_livestream", this.currentMessageState[datatype].streamChannel);
        } else if (datatype === P2PDataType.BINARY) {
            this.emit("finish_download", this.currentMessageState[datatype].streamChannel);
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
}