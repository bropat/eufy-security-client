import { TypedEmitter } from "tiny-typed-emitter";
import { MQTTServiceEvents } from "./interface";
export declare class MQTTService extends TypedEmitter<MQTTServiceEvents> {
    private readonly CLIENT_ID_FORMAT;
    private readonly USERNAME_FORMAT;
    private readonly SUBSCRIBE_NOTICE_FORMAT;
    private readonly SUBSCRIBE_LOCK_FORMAT;
    private readonly SUBSCRIBE_DOORBELL_FORMAT;
    private static proto;
    private connected;
    private client;
    private connecting;
    private clientID?;
    private androidID?;
    private apiBase?;
    private email?;
    private subscribeLocks;
    private deviceSmartLockMessageModel;
    private constructor();
    static init(): Promise<MQTTService>;
    private parseSmartLockMessage;
    private getMQTTBrokerUrl;
    connect(clientID: string, androidID: string, apiBase: string, email: string): void;
    private _subscribeLock;
    subscribeLock(deviceSN: string): void;
    isConnected(): boolean;
    close(): void;
}
