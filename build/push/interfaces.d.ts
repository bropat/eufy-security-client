import { Credentials, RawPushMessage, PushMessage } from "./models";
export interface PushNotificationServiceEvents {
    "credential": (credentials: Credentials) => void;
    "connect": (token: string) => void;
    "close": () => void;
    "raw message": (message: RawPushMessage) => void;
    "message": (message: PushMessage) => void;
}
export interface PushClientEvents {
    "connect": () => void;
    "close": () => void;
    "message": (message: RawPushMessage) => void;
}
export interface PushClientParserEvents {
    "message": (message: {
        tag: number;
        object: any;
    }) => void;
}
