export interface CusPushData {
    a?: number;                          // Event type, see enum PushEvent
    alarm?: number;                     // ?
    alarm_delay?: number;               // alarm delay...
    alarm_type?: number;
    arming?: number;                    // Station mode (for example 2=SCHEDULE)
    automation_id?: number;
    batt_powered?: number;
    c?: number;                         // Channel (received on event security)
    channel?: number;
    click_action?: string;
    create_time?: number;
    device_name?: string;
    e?: string;                         // Sensor Open (1=True, 0=False)
    event_time?: number;
    event_type?: number;
    f?: string;                         // Person?
    i?: string;                         // (received on event security) FetchId / FaceId?
    j?: number;                         // SenseID
    k?: number;                         // Secret Key (received on event security) / Cipher
    cipher?: number;                     // Secret Key (received on event security) / Cipher
    m?: number;                         // Device status (0=offline, 1=online)
    mode?: number;                      // Station mode (if arming=2=SCHEDULE, this parameter shows the changed mode by SCHEDULE; on manually changing mode, mode=arming)
    n?: string;                         // Nickname / Device name
    name?: string;
    news_id?: number;
    nick_name?: string;
    notification_style?: number;
    p?: string;                         // Filename
    file_path?: string;
    pic_url?: string;
    push_count?: number;
    s: string;                          // Station serial number
    session_id?: string;
    short_user_id?: string;
    storage_type?: number;
    t?: string;                         // Timestamp (received on change station mode)
    tfcard?: number;
    type?: number;
    unique_id?: string;
    user?: number;                      // User Type (NORMAL=0, ADMIN=1, SUPER_ADMIN=2, ENTRY_ONLY=4)
    user_id?: string;
    user_name?: string;                 // Username
    bat_low?: string;
}

export interface EufyPushMessage {
    content: string;
    device_sn: string;
    event_time: string;
    payload?: CusPushData | IndoorPushData | ServerPushData | BatteryDoorbellPushData | LockPushData | SmartSafeData;
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

export interface SmartSafeData {
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

export enum ProcessingState {
    MCS_VERSION_TAG_AND_SIZE = 0,
    MCS_TAG_AND_SIZE = 1,
    MCS_SIZE = 2,
    MCS_PROTO_BYTES = 3,
}

export enum MessageTag {
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
    NumProtoTypes = 16,
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
}