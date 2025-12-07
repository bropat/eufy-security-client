import { UserType } from "../http/types";
import { AlarmAction } from "./types";
export interface CusPushData {
    a?: number;
    alarm?: number;
    alarm_delay?: number;
    alarm_type?: number;
    arming?: number;
    automation_id?: number;
    batt_powered?: number;
    c?: number;
    channel?: number;
    click_action?: string;
    create_time?: number;
    device_name?: string;
    e?: string;
    event_time?: number;
    event_type?: number;
    f?: string;
    i?: string;
    j?: number;
    k?: number;
    cipher?: number;
    m?: number;
    mode?: number;
    n?: string;
    name?: string;
    news_id?: number;
    nick_name?: string;
    notification_style?: number;
    p?: string;
    file_path?: string;
    pic_url?: string;
    push_count?: number;
    s: string;
    session_id?: string;
    short_user_id?: string;
    storage_type?: number;
    t?: string;
    tfcard?: number;
    type?: number;
    unique_id?: string;
    user?: UserType;
    user_id?: string;
    user_name?: string;
    bat_low?: string;
    msg_type: number;
    r?: string;
    u?: string;
}
export interface EufyPushMessage {
    content: string;
    device_sn: string;
    event_time: string;
    payload?: CusPushData | IndoorPushData | ServerPushData | BatteryDoorbellPushData | LockPushData | SmartSafePushData | GarageDoorPushData | AlarmPushData;
    push_time: string;
    station_sn: string;
    title: string;
    type: string;
    doorbell?: string;
    "google.c.sender.id": string;
}
export interface SmartSafeEventValueDetail {
    type: number;
    action: number;
    figure_id: number;
    user_id: number;
    name?: string;
}
export interface SmartSafePushData {
    dev_name: string;
    event_type: number;
    event_time: number;
    event_value: number | SmartSafeEventValueDetail;
}
export interface LockPushData {
    event_type: number;
    event_time: number;
    short_user_id: string;
    nick_name: string;
    user_id: string;
    device_name: string;
    device_sn: string;
}
export interface GarageDoorPushData {
    a: number;
    msg_type: number;
    event_type: number;
    door_id: number;
    user_name: string;
    door_name: string;
    pic_url: string;
    file_path: string;
    storage_type: number;
    unique_id: string;
    power?: number;
}
export interface BatteryDoorbellPushData {
    name: string;
    channel: number;
    cipher: number;
    create_time: number;
    device_sn: string;
    session_id: string;
    event_type: number;
    file_path: string;
    pic_url: string;
    push_count: number;
    notification_style: number;
    objects?: DoorbellPeopleNames;
    nick_name?: string;
}
export interface DoorbellPeopleNames {
    names: string[];
}
export interface RawPushMessage {
    id: string;
    from: string;
    to: string;
    category: string;
    persistentId: string;
    ttl: number;
    sent: string;
    payload: EufyPushMessage;
}
export interface FidTokenResponse {
    token: string;
    expiresIn: string;
    expiresAt: number;
}
export interface FidInstallationResponse {
    name: string;
    fid: string;
    refreshToken: string;
    authToken: FidTokenResponse;
}
export interface CheckinResponse {
    statsOk: boolean;
    timeMs: string;
    androidId: string;
    securityToken: string;
    versionInfo: string;
    deviceDataVersionInfo: string;
}
export interface GcmRegisterResponse {
    token: string;
}
export interface Message {
    tag: number;
    object: any;
}
export declare enum ProcessingState {
    MCS_VERSION_TAG_AND_SIZE = 0,
    MCS_TAG_AND_SIZE = 1,
    MCS_SIZE = 2,
    MCS_PROTO_BYTES = 3
}
export declare enum MessageTag {
    HeartbeatPing = 0,
    HeartbeatAck = 1,
    LoginRequest = 2,
    LoginResponse = 3,
    Close = 4,
    MessageStanza = 5,
    PresenceStanza = 6,
    IqStanza = 7,
    DataMessageStanza = 8,
    BatchPresenceStanza = 9,
    StreamErrorStanza = 10,
    HttpRequest = 11,
    HttpResponse = 12,
    BindAccountRequest = 13,
    BindAccountResponse = 14,
    TalkMetadata = 15,
    NumProtoTypes = 16
}
export interface Credentials {
    fidResponse: FidInstallationResponse;
    checkinResponse: CheckinResponse;
    gcmResponse: GcmRegisterResponse;
}
export interface DoorbellPushData {
    campaign_name: string;
    channel: number;
    cipher: number;
    content: string;
    create_time: number;
    device_sn: string;
    event_session: string;
    event_time: number;
    event_type: number;
    file_path: string;
    person_name?: string;
    outer_body: string;
    outer_title: string;
    pic_url: string;
    push_count: number;
    station_sn: string;
    title: string;
    url: string;
    url_ex: string;
    video_url: string;
}
export interface IndoorPushData {
    a: number;
    channel: number;
    cipher: number;
    create_time: number;
    trigger_time: number;
    device_sn: string;
    event_type: number;
    file_path: string;
    msg_type: number;
    name: string;
    notification_style: number;
    pic_url: string;
    push_count: number;
    session_id: string;
    storage_type: number;
    t: number;
    tfcard_status: number;
    timeout: number;
    unique_id: string;
}
export interface ServerPushData {
    email: string;
    nick_name: string;
    verify_code: string;
}
export interface PushMessage {
    name: string;
    event_time: number;
    type: number;
    station_sn: string;
    device_sn: string;
    title?: string;
    content?: string;
    push_time?: number;
    channel?: number;
    cipher?: number;
    event_session?: string;
    event_type?: number;
    file_path?: string;
    pic_url?: string;
    push_count?: number;
    notification_style?: number;
    tfcard_status?: number;
    alarm_delay_type?: number;
    alarm_delay?: number;
    alarm_type?: number;
    sound_alarm?: boolean;
    user_name?: string;
    user_type?: number;
    user_id?: string;
    short_user_id?: string;
    station_guard_mode?: number;
    station_current_mode?: number;
    person_name?: string;
    sensor_open?: boolean;
    device_online?: boolean;
    fetch_id?: number;
    sense_id?: number;
    battery_powered?: boolean;
    battery_low?: number;
    storage_type?: number;
    unique_id?: string;
    automation_id?: number;
    click_action?: string;
    news_id?: number;
    doorbell_url?: string;
    doorbell_url_ex?: string;
    doorbell_video_url?: string;
    msg_type?: number;
    timeout?: number;
    event_value?: number | SmartSafeEventValueDetail;
    person_id?: number;
    door_id?: number;
    power?: number;
    email?: string;
    verify_code?: string;
    alarm_status?: string;
    alarm_action?: AlarmAction;
    open?: number;
    openType?: number;
    pin?: string;
}
export interface PlatformPushMode {
    a: number;
    alarm: number;
    arming: number;
    channel: number;
    cipher: number;
    create_time: number;
    device_sn: string;
    event_type: number;
    face_id: number;
    file_path: string;
    mode: number;
    msg_type: number;
    name: string;
    nick_name: string;
    notification_style: number;
    parted_status: number;
    pic_url: string;
    push_count: number;
    record_id: number;
    s: string;
    session_id: string;
    storage_type: number;
    t: number;
    tfcard_status: number;
    timeout: number;
    unique_id: string;
    user: number;
    user_name: string;
    pic_filepath: string;
    trigger_time: number;
    alarm_delay: number;
    person_id: number;
}
export interface AlarmPushData {
    alarm_action_channel: AlarmAction;
    alarm_id: string;
    alarm_status: string;
    alert_time: number;
    device_sn: string;
    station_sn: string;
}
