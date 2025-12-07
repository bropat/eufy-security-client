import { UserPasswordType, UserType } from "./types";
export interface ApiResponse {
    status: number;
    statusText: string;
    data: any;
    headers: any;
}
export interface ResultResponse {
    code: number;
    msg: string;
    data?: any;
    outline?: any;
}
export interface LoginResultResponse {
    user_id: string;
    email: string;
    nick_name: string;
    auth_token: string;
    token_expires_at: number;
    avatar: string;
    invitation_code: string;
    inviter_code: string;
    verify_code_url: string;
    mac_addr: string;
    domain: string;
    ab_code: string;
    geo_key: string;
    privilege: number;
    phone: string;
    phone_code: string;
    server_secret_info: {
        public_key: string;
    } | null;
    params: Array<{
        param_type: number;
        param_value: string;
    }> | null;
    trust_list: Array<TrustDevice>;
}
export interface CaptchaResponse {
    captcha_id: string;
    item: string;
}
export interface LoginRequest {
    ab: string;
    client_secret_info: {
        public_key: string;
    };
    enc: number;
    email: string;
    password: string;
    time_zone: number;
    verify_code?: string;
    captcha_id?: string;
    answer?: string;
    transaction: string;
}
export interface Member {
    family_id: number;
    station_sn: string;
    admin_user_id: string;
    member_user_id: string;
    short_user_id: string;
    member_type: number;
    permissions: number;
    member_nick: string;
    action_user_id: string;
    fence_state: number;
    extra: string;
    member_avatar: string;
    house_id: string;
    create_time: number;
    update_time: number;
    status: number;
    email: string;
    nick_name: string;
    avatar: string;
    action_user_email: string;
    action_user_name: string;
}
export interface StationListDevice {
    device_id: number;
    is_init_complete: boolean;
    device_sn: string;
    device_name: string;
    device_model: string;
    time_zone: string;
    device_type: number;
    device_channel: number;
    station_sn: string;
    schedule: string;
    schedulex: string;
    wifi_mac: string;
    sub1g_mac: string;
    main_sw_version: string;
    main_hw_version: string;
    sec_sw_version: string;
    sec_hw_version: string;
    sector_id: number;
    event_num: number;
    wifi_ssid: string;
    ip_addr: string;
    main_sw_time: number;
    sec_sw_time: number;
    bind_time: number;
    local_ip: string;
    language: string;
    sku_number: string;
    lot_number: string;
    cpu_id: string;
    create_time: number;
    update_time: number;
    status: number;
}
export interface StationListResponse {
    readonly [index: string]: unknown;
    station_id: number;
    station_sn: string;
    station_name: string;
    station_model: string;
    time_zone: string;
    wifi_ssid: string;
    ip_addr: string;
    wifi_mac: string;
    sub1g_mac: string;
    main_sw_version: string;
    main_hw_version: string;
    sec_sw_version: string;
    sec_hw_version: string;
    volume: string;
    main_sw_time: number;
    sec_sw_time: number;
    bt_mac: string;
    setup_code: string;
    setup_id: string;
    device_type: number;
    event_num: number;
    sku_number: string;
    lot_number: string;
    create_time: number;
    update_time: number;
    status: number;
    station_status: number;
    status_change_time: number;
    p2p_did: string;
    push_did: string;
    p2p_license: string;
    push_license: string;
    ndt_did: string;
    ndt_license: string;
    wakeup_flag: number;
    p2p_conn: string;
    app_conn: string;
    wipn_enc_dec_key: string;
    wipn_ndt_aes128key: string;
    query_server_did: string;
    prefix: string;
    wakeup_key: string;
    member: Member;
    params: Array<ParameterResponse>;
    devices: Array<StationListDevice>;
    sensor_info: null;
    is_init_complete: boolean;
    virtual_version: string;
    house_id?: string;
}
export interface ParameterResponse {
    param_id: number;
    station_sn: string;
    param_type: number;
    param_value: string;
    create_time: number;
    update_time: number;
    status: number;
}
export interface DeviceResponse {
    device_id: number;
    is_init_complete: boolean;
    device_sn: string;
    device_name: string;
    device_model: string;
    time_zone: string;
    device_type: number;
    device_channel: number;
    station_sn: string;
    schedule: string;
    schedulex: string;
    wifi_mac: string;
    sub1g_mac: string;
    main_sw_version: string;
    main_hw_version: string;
    sec_sw_version: string;
    sec_hw_version: string;
    sector_id: number;
    event_num: number;
    wifi_ssid: string;
    ip_addr: string;
    main_sw_time: number;
    sec_sw_time: number;
    bind_time: number;
    cover_path: string;
    cover_time: number;
    local_ip: string;
    language: string;
    sku_number: string;
    lot_number: string;
    create_time: number;
    update_time: number;
    status: number;
}
export interface DeviceRequest {
    device_sn: string;
    num: number;
    orderby: string;
    page: number;
    station_sn: string;
}
export interface DeviceListResponse {
    readonly [index: string]: unknown;
    device_id: number;
    is_init_complete: boolean;
    device_sn: string;
    device_name: string;
    device_model: string;
    time_zone: string;
    device_type: number;
    device_channel: number;
    station_sn: string;
    schedule: string;
    schedulex: string;
    wifi_mac: string;
    sub1g_mac: string;
    main_sw_version: string;
    main_hw_version: string;
    sec_sw_version: string;
    sec_hw_version: string;
    sector_id: number;
    event_num: number;
    wifi_ssid: string;
    ip_addr: string;
    volume: string;
    main_sw_time: number;
    sec_sw_time: number;
    bind_time: number;
    bt_mac: string;
    cover_path: string;
    cover_time: number;
    local_ip: string;
    language: string;
    sku_number: string;
    lot_number: string;
    cpu_id: string;
    create_time: number;
    update_time: number;
    status: number;
    svr_domain: string;
    svr_port: number;
    station_conn: {
        station_sn: string;
        station_name: string;
        station_model: string;
        main_sw_version: string;
        main_hw_version: string;
        p2p_did: string;
        push_did: string;
        ndt_did: string;
        p2p_conn: string;
        app_conn: string;
        binded: false;
        setup_code: string;
        setup_id: string;
        bt_mac: string;
        wifi_mac: string;
        dsk_key: string;
        expiration: number;
    };
    family_num: number;
    member: Member;
    permission: any;
    params: Array<ParameterResponse>;
    pir_total: number;
    pir_none: number;
    pir_missing: number;
    week_pir_total: number;
    week_pir_none: number;
    month_pir_total: number;
    month_pir_none: number;
    charging_days: number;
    charing_total: number;
    charging_reserve: number;
    charging_missing: number;
    battery_usage_last_week: number;
    virtual_version: string;
    relate_devices: any;
    house_id?: string;
}
export interface DskKeyResponse {
    enabled: boolean;
    dsk_keys: Array<{
        station_sn: string;
        dsk_key: string;
        expiration: number;
        about_to_be_replaced: boolean;
    }>;
}
export interface EventRecordResponse {
    monitor_id: number;
    transfer_monitor_id: number;
    station_sn: string;
    device_sn: string;
    storage_type: number;
    storage_path: string;
    hevc_storage_path: string;
    cloud_path: string;
    frame_num: number;
    thumb_path: string;
    thumb_data: string;
    start_time: number;
    end_time: number;
    cipher_id: number;
    cipher_user_id: string;
    has_human: number;
    volume: string;
    vision: number;
    device_name: string;
    device_type: number;
    video_type: number;
    extra: string;
    user_range_id: number;
    viewed: boolean;
    create_time: number;
    update_time: number;
    status: number;
    station_name: string;
    p2p_did: string;
    push_did: string;
    p2p_license: string;
    push_license: string;
    ndt_did: string;
    ndt_license: string;
    wakeup_flag: number;
    p2p_conn: string;
    app_conn: string;
    wipn_enc_dec_key: string;
    wipn_ndt_aes128key: string;
    query_server_did: string;
    prefix: string;
    wakeup_key: string;
    ai_faces: Array<{
        is_stranger: number;
        face_url: string;
        owner_id: string;
        user_range_id: number;
    }>;
    is_favorite: boolean;
    storage_alias: number;
}
export interface EventRecordRequest {
    device_sn: string;
    end_time: number;
    id: number;
    id_type: number;
    is_favorite: boolean;
    num: number;
    pullup: boolean;
    shared: boolean;
    start_time: number;
    station_sn: string;
    storage: number;
}
export interface StreamRequest {
    device_sn: string;
    station_sn: string;
    proto?: number;
}
export interface TrustDevice {
    open_udid: string;
    phone_model: string;
    is_current_device: number;
}
export interface Cipher {
    cipher_id: number;
    user_id: string;
    private_key: string;
}
export interface Voice {
    voice_id: number;
    user_id: string;
    desc: string;
    device_sn: string;
    voice_link: string;
    voice_type: number;
    key_prefix: string;
}
export interface DeviceInvite {
    device_sn: string;
    checked: boolean;
}
export interface Invite {
    invite_id: number;
    station_sn: string;
    email: string;
    devices: Array<DeviceInvite>;
    action_user_id: string;
    member_nick: string;
    member_type: number;
    permissions: number;
    create_time: number;
    update_time: number;
    status: number;
    action_user_email: string;
    action_user_nick: string;
}
export interface ConfirmInvite {
    device_sns: Array<string>;
    invite_id: number;
    station_sn: string;
}
export interface SensorHistoryEntry {
    trigger_time: number;
    create_time: number;
    status: string;
}
export interface HouseUser {
    id: number;
    house_id: string;
    email: string;
    avatar: string;
    user_id: string;
    admin_user_id: string;
    state: string;
    role_type: number;
}
export interface HouseDetail {
    house_id: string;
    house_name: string;
    is_default: number;
    id: number;
    geofence_id: number;
    address: string;
    latitude: number;
    longitude: number;
    radius_range: number;
    away_mode: number;
    home_mode: number;
    location_msg: number;
    create_time: number;
    house_users: Array<HouseUser>;
    house_stations: any;
}
export interface HouseListResponse {
    readonly [index: string]: unknown;
    house_id: string;
    user_id: string;
    admin_user_id: string;
    role_type: number;
    house_name: string;
    is_default: number;
    geofence_id: number;
    address: string;
    latitude: number;
    longitude: number;
    radius_range: number;
    location_msg: number;
    create_time: number;
    away_mode: number;
    home_mode: number;
}
export interface HouseInviteListResponse {
    readonly [index: string]: unknown;
    id: number;
    house_name: string;
    action_user_nick: string;
    action_user_email: string;
    house_id: string;
    email: string;
    user_id: string;
    role_type: number;
}
export interface ConfirmHouseInvite {
    house_id: string;
    invite_id: number;
    is_inviter: number;
    user_id: string;
}
export interface PassportProfileResponse {
    user_id: string;
    email: string;
    nick_name: string;
    avatar: string;
    invitation_code: string;
    inviter_code: string;
    verify_code_url: string;
    mac_addr: string;
    country: {
        id: number;
        name: string;
        code: string;
    };
}
export interface StationSecuritySettings {
    account_id: string;
    count_down_alarm: StationSecuritySettingsDelayDetails;
    count_down_arm: StationSecuritySettingsDelayDetails;
    devices: StationSecuritySettingsDeviceDetails;
}
export interface StationSecuritySettingsDelayDetails {
    account_id: string;
    channel_list: number[];
    delay_time: number;
}
export interface StationSecuritySettingsDeviceDetails {
    action: number;
    device_channel: number;
}
export interface SnoozeDetail {
    snooze_time: number;
    snooze_chime?: boolean;
    snooze_motion?: boolean;
    snooze_homebase?: boolean;
}
export interface RawSchedule {
    endDay: string;
    week: string;
    startDay: string;
    startTime: string;
    endTime: string;
}
export interface UserPassword {
    expiration_time: number;
    is_permanent: number;
    password: string;
    password_id: string;
    password_type: UserPasswordType;
    name: string;
    schedule: RawSchedule;
}
export interface User {
    avatar: string;
    password_list: Array<UserPassword>;
    user_id: string;
    short_user_id: string;
    user_name: string;
    user_type: UserType;
    is_show: boolean;
}
export interface UsersResponse {
    device_sn: string;
    user_list: Array<User>;
}
export interface AddUserResponse {
    user_id: string;
    short_user_id: string;
}
export interface GarageDoorSensorsProperty {
    cmd: number;
    data: {
        door_1: {
            power: number;
            mac_address: string;
            version: string;
            name: string;
            sn: string;
            playalarm: number;
            ota: number;
            needota: number;
        };
        door_2: {
            power: number;
            mac_address: string;
            version: string;
            name: string;
            sn: string;
            playalarm: number;
            ota: number;
            needota: number;
        };
    };
}
export interface FloodlightDetectionRangeT8425Property {
    cur_mode: number;
    test_mode: number;
    mode0: Array<{
        id: number;
        sst: number;
    }>;
    mode1: Array<{
        id: number;
        sst: number;
    }>;
    mode2: Array<{
        id: number;
        sst: number;
    }>;
}
export interface FloodlightLightSettingsBrightnessScheduleT8425Property {
    sunset2rise: number;
    longtitude: string;
    latitude: string;
    brightness: number;
    schedule: Array<unknown>;
}
export interface FloodlightLightSettingsMotionT8425Property {
    brightness: number;
    enable: number;
    mode: number;
    time: number;
}
