"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericHWVersionProperty = exports.DeviceSerialNumberProperty = exports.DeviceModelProperty = exports.DeviceNameProperty = exports.PropertyName = exports.DeviceEvent = exports.PresetPositionType = exports.ViewModeType = exports.MotionDetectionRangeType = exports.TrackerType = exports.GarageDoorState = exports.DynamicLightingEffect = exports.MotionActivationMode = exports.DailyLightingType = exports.LightingActiveMode = exports.TriggerType = exports.MicStatus = exports.RecordType = exports.MediaType = exports.VideoType = exports.FloodlightT8425NotificationTypes = exports.IndoorS350NotificationTypes = exports.IndoorMiniDetectionTypes = exports.IndoorDetectionTypes = exports.IndoorS350DetectionTypes = exports.SoloCameraDetectionTypes = exports.T8170DetectionTypes = exports.HB3DetectionTypes = exports.UserPasswordType = exports.UserType = exports.DualCamStreamMode = exports.VideoTypeStoreToNAS = exports.MotionDetectionMode = exports.SignalLevel = exports.TimeFormat = exports.GuardModeSecuritySettingsAction = exports.NotificationSwitchMode = exports.AlarmTone = exports.WalllightNotificationType = exports.NotificationType = exports.FloodlightMotionTriggeredDistance = exports.PublicKeyType = exports.PowerSource = exports.StorageType = exports.VerfyCodeTypes = exports.ResponseErrorCode = exports.GuardMode = exports.AlarmMode = exports.ParamType = exports.DeviceType = void 0;
exports.DeviceWatermarkProperty = exports.DeviceRTSPStreamUrlProperty = exports.DeviceRTSPStreamProperty = exports.DevicePetDetectionProperty = exports.DeviceSoundDetectionProperty = exports.DeviceMotionDetectionDoorbellProperty = exports.DeviceMotionDetectionIndoorSoloFloodProperty = exports.DeviceMotionDetectionProperty = exports.DeviceStatusLedT8200XProperty = exports.DeviceStatusLedDoorbellProperty = exports.DeviceStatusLedBatteryDoorbellDualProperty = exports.DeviceStatusLedIndoorS350Property = exports.DeviceStatusLedBatteryDoorbellProperty = exports.DeviceStatusLedIndoorFloodProperty = exports.DeviceStatusLedProperty = exports.DeviceEnabledIndoorS350Property = exports.DeviceEnabledIndoorMiniProperty = exports.DeviceEnabledSoloProperty = exports.DeviceEnabledStandaloneProperty = exports.DeviceEnabledProperty = exports.DeviceWifiRSSISmartSafeProperty = exports.DeviceWifiRSSIKeypadProperty = exports.DeviceWifiRSSIEntrySensorProperty = exports.DeviceWifiRSSILockProperty = exports.DeviceCellularICCIDProperty = exports.DeviceCellularIMEIProperty = exports.DeviceCellularBandProperty = exports.DeviceCellularSignalProperty = exports.DeviceCellularSignalLevelProperty = exports.DeviceCellularRSSIProperty = exports.DeviceWifiSignalLevelProperty = exports.DeviceWifiRSSIProperty = exports.DeviceNightvisionS350Property = exports.DeviceNightvisionProperty = exports.DeviceAutoNightvisionSoloProperty = exports.DeviceAutoNightvisionWiredDoorbellProperty = exports.DeviceAutoNightvisionProperty = exports.DeviceAntitheftDetectionProperty = exports.DeviceBatteryIsChargingKeypadProperty = exports.DeviceBatteryTempProperty = exports.DeviceBatteryLowSensorProperty = exports.DeviceBatteryLowKeypadProperty = exports.DeviceBatteryLowMotionSensorProperty = exports.DeviceBatteryTrackerProperty = exports.DeviceBatteryLockProperty = exports.DeviceBatteryProperty = exports.GenericDeviceProperties = exports.BaseDeviceProperties = exports.GenericTypeProperty = exports.GenericSWVersionProperty = void 0;
exports.DeviceHiddenMotionDetectionSensitivityWiredDoorbellProperty = exports.DeviceMotionDetectionSensitivityGarageCameraProperty = exports.DeviceMotionDetectionSensitivityFloodlightT8420Property = exports.DeviceMotionDetectionSensitivitySoloProperty = exports.DeviceMotionDetectionSensitivityWiredDoorbellProperty = exports.DeviceMotionDetectionSensitivityDoorbellE340Property = exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty = exports.DeviceMotionDetectionSensitivityIndoorProperty = exports.DeviceMotionDetectionSensitivityCamera1Property = exports.DeviceMotionDetectionSensitivityCamera2Property = exports.DeviceMotionDetectionTypeIndoorMiniProperty = exports.DeviceMotionDetectionTypeIndoorS350Property = exports.DeviceMotionDetectionTypeIndoorProperty = exports.DeviceMotionDetectionTypeFloodlightProperty = exports.DeviceMotionDetectionTypeFloodlightT8423Property = exports.DeviceMotionDetectionCamera1Property = exports.DeviceMotionDetectionTypeT8200XProperty = exports.DeviceMotionDetectionTypeProperty = exports.DeviceMotionDetectionTypeAllOtherMotionsWalllightProperty = exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty = exports.DeviceMotionHB3DetectionTypeVehicleProperty = exports.DeviceMotionHB3DetectionTypePetProperty = exports.DeviceMotionHB3DetectionTypeHumanRecognitionProperty = exports.DeviceMotionDetectionTypeHumanWallLightProperty = exports.DeviceMotionHB3DetectionTypeHumanProperty = exports.DevicePictureUrlProperty = exports.DeviceAdvancedLockStatusProperty = exports.DeviceBasicLockStatusProperty = exports.DeviceMotionSensorPIREventProperty = exports.DeviceSensorChangeTimeProperty = exports.DeviceSensorOpenProperty = exports.DeviceRingingProperty = exports.DeviceCryingDetectedProperty = exports.DeviceSoundDetectedProperty = exports.DevicePetDetectedProperty = exports.DevicePersonDetectedProperty = exports.DeviceMotionDetectedProperty = exports.DeviceLockedSmartSafeProperty = exports.DeviceLockedProperty = exports.DeviceBatteryUsageLastWeekProperty = exports.DeviceLastChargingFalseEventsProperty = exports.DeviceLastChargingRecordedEventsProperty = exports.DeviceLastChargingTotalEventsProperty = exports.DeviceLastChargingDaysProperty = exports.DeviceStateLockProperty = exports.DeviceStateProperty = exports.DeviceWatermarkGarageCameraProperty = exports.DeviceWatermarkBatteryDoorbellCamera1Property = exports.DeviceWatermarkSoloWiredDoorbellProperty = exports.DeviceWatermarkIndoorFloodProperty = void 0;
exports.DeviceRecordingEndClipMotionStopsProperty = exports.DeviceRecordingRetriggerIntervalFloodlightProperty = exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty = exports.DeviceRecordingRetriggerIntervalProperty = exports.DeviceRecordingClipLengthOutdoorPTProperty = exports.DeviceRecordingClipLengthWalllightS120Property = exports.DeviceRecordingClipLengthWalllightProperty = exports.DeviceRecordingClipLengthFloodlightProperty = exports.DeviceRecordingClipLengthProperty = exports.DeviceChargingStatusProperty = exports.DevicePowerWorkingModeBatteryDoorbellProperty = exports.DevicePowerWorkingModeSmartDropProperty = exports.DevicePowerWorkingModeProperty = exports.DevicePowerSourceProperty = exports.DeviceRingtoneVolumeT8200XProperty = exports.DeviceRingtoneVolumeWiredDoorbellProperty = exports.DeviceRingtoneVolumeBatteryDoorbellProperty = exports.DeviceSpeakerVolumeSmartDropProperty = exports.DeviceSpeakerVolumeWalllightProperty = exports.DeviceSpeakerVolumeFloodlightT8420Property = exports.DeviceSpeakerVolumeWiredDoorbellProperty = exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty = exports.DeviceSpeakerVolumeCamera3Property = exports.DeviceSpeakerVolumeSoloProperty = exports.DeviceSpeakerVolumeProperty = exports.DeviceMotionTrackingProperty = exports.DeviceAudioRecordingFloodlightT8420Property = exports.DeviceAudioRecordingWiredDoorbellProperty = exports.DeviceAudioRecordingStarlight4gLTEProperty = exports.DeviceAudioRecordingIndoorSoloFloodlightProperty = exports.DeviceAudioRecordingProperty = exports.DeviceSpeakerProperty = exports.DeviceMicrophoneProperty = exports.DeviceFloodlightLightSettingsMotionTriggeredTimerT8425Property = exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty = exports.DeviceFloodlightLightSettingsMotionTriggeredDistanceProperty = exports.DeviceFloodlightLightSettingsMotionTriggeredT8425Property = exports.DeviceFloodlightLightSettingsMotionTriggeredProperty = exports.DeviceFloodlightLightSettingsBrightnessScheduleT8425Property = exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty = exports.DeviceFloodlightLightSettingsBrightnessMotionT8425Property = exports.DeviceFloodlightLightSettingsBrightnessMotionProperty = exports.DeviceCameraLightSettingsBrightnessManualWalllightS120Property = exports.DeviceCameraLightSettingsBrightnessManualProperty = exports.DeviceLightSettingsBrightnessManualCamera3Property = exports.DeviceFloodlightLightSettingsBrightnessManualProperty = exports.DeviceFloodlightLightSettingsEnableProperty = exports.DeviceFloodlightLightProperty = exports.DeviceMotionZoneProperty = exports.DeviceHiddenMotionDetectionModeWiredDoorbellProperty = void 0;
exports.DeviceNotificationRingWiredDoorbellProperty = exports.DeviceNotificationRingProperty = exports.DeviceNotificationCryingProperty = exports.DeviceNotificationAllSoundProperty = exports.DeviceNotificationAllOtherMotionWalllightProperty = exports.DeviceNotificationAllOtherMotionProperty = exports.DeviceNotificationPetProperty = exports.DeviceNotificationPersonWalllightProperty = exports.DeviceNotificationPersonProperty = exports.DeviceSoundDetectionSensitivityProperty = exports.DeviceSoundDetectionTypeS350Property = exports.DeviceSoundDetectionTypeProperty = exports.DeviceImageMirroredProperty = exports.DeviceRotationSpeedProperty = exports.DeviceNotificationTypeWalllightProperty = exports.DeviceNotificationTypeWiredDoorbellProperty = exports.DeviceNotificationTypeBatteryDoorbellProperty = exports.DeviceNotificationTypeIndoorFloodlightProperty = exports.DeviceNotificationTypeProperty = exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty = exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty = exports.DeviceChimeHomebaseBatteryDoorbellProperty = exports.DeviceChimeIndoorT8200XProperty = exports.DeviceChimeIndoorWiredDoorbellProperty = exports.DeviceChimeIndoorBatteryDoorbellProperty = exports.DeviceWDRProperty = exports.DeviceVideoRecordingQualityT8530Property = exports.DeviceVideoRecordingQualitySoloCamerasHB3Property = exports.DeviceVideoRecordingQualitySoloProperty = exports.DeviceVideoRecordingQualityCamera3Property = exports.DeviceVideoRecordingQualityCamera2CProProperty = exports.DeviceVideoRecordingQualityT8200XProperty = exports.DeviceVideoRecordingQualityWalllightProperty = exports.DeviceVideoRecordingQualityS350Property = exports.DeviceVideoRecordingQualityS340Property = exports.DeviceVideoRecordingQualityDoorbellE340Property = exports.DeviceVideoRecordingQualityProperty = exports.DeviceVideoRecordingQualityWiredDoorbellProperty = exports.DeviceVideoRecordingQualityIndoorProperty = exports.DeviceVideoStreamingQualitySmartDropProperty = exports.DeviceVideoStreamingQualityS340Property = exports.DeviceVideoStreamingQualityS350Property = exports.DeviceVideoStreamingQualityDoorbellE340Property = exports.DeviceVideoStreamingQualityCameraProfessionalProperty = exports.DeviceVideoStreamingQualityCamera3Property = exports.DeviceVideoStreamingQualityWalllightProperty = exports.DeviceVideoStreamingQualitySoloProperty = exports.DeviceVideoStreamingQualityCameraProperty = exports.DeviceVideoStreamingQualityBatteryDoorbellProperty = exports.DeviceVideoStreamingQualityProperty = void 0;
exports.DeviceNotificationUnlockedProperty = exports.DeviceNotificationWalllightProperty = exports.DeviceNotificationSmartLockProperty = exports.DeviceNotificationProperty = exports.DeviceSoundSimpleProperty = exports.DeviceSoundProperty = exports.DeviceScramblePasscodeSmartSafeProperty = exports.DeviceScramblePasscodeProperty = exports.DeviceWrongTryAttemptsSmartSafeProperty = exports.DeviceWrongTryAttemptsProperty = exports.DeviceWrongTryLockdownTimeSmartSafeProperty = exports.DeviceWrongTryLockdownTimeProperty = exports.DeviceWrongTryProtectionSmartSafeProperty = exports.DeviceWrongTryProtectionProperty = exports.DeviceOneTouchLockingProperty = exports.DeviceAutoLockScheduleEndTimeProperty = exports.DeviceAutoLockScheduleStartTimeProperty = exports.DeviceAutoLockScheduleProperty = exports.DeviceAutoLockTimerProperty = exports.DeviceAutoLockProperty = exports.DeviceAutoCalibrationProperty = exports.DeviceVideoColorNightvisionProperty = exports.DeviceVideoNightvisionImageAdjustmentProperty = exports.DeviceLightSettingsMotionActivationModeT8425Property = exports.DeviceLightSettingsMotionActivationModeProperty = exports.DeviceLightSettingsColorTemperatureScheduleProperty = exports.DeviceLightSettingsColorTemperatureMotionProperty = exports.DeviceLightSettingsColorTemperatureManualProperty = exports.DeviceMotionOutOfViewDetectionProperty = exports.DeviceMotionAutoCruiseProperty = exports.DeviceMotionTrackingSensitivityProperty = exports.DeviceMotionDetectionTestModeT8425Property = exports.DeviceMotionDetectionTestModeProperty = exports.DeviceMotionDetectionRangeAdvancedRightSensitivityT8425Property = exports.DeviceMotionDetectionRangeAdvancedRightSensitivityProperty = exports.DeviceMotionDetectionRangeAdvancedMiddleSensitivityProperty = exports.DeviceMotionDetectionRangeAdvancedLeftSensitivityT8425Property = exports.DeviceMotionDetectionRangeAdvancedLeftSensitivityProperty = exports.DeviceMotionDetectionRangeStandardSensitivityT8425Property = exports.DeviceMotionDetectionRangeStandardSensitivityProperty = exports.DeviceMotionDetectionRangeT8425Property = exports.DeviceMotionDetectionRangeProperty = exports.DeviceVideoRingRecordWiredDoorbellProperty = exports.DeviceVideoDistortionCorrectionWiredDoorbellProperty = exports.DeviceVideoHDRWiredDoorbellProperty = exports.DeviceChirpToneEntrySensorProperty = exports.DeviceChirpVolumeEntrySensorProperty = exports.DeviceNotificationMotionWiredDoorbellProperty = exports.DeviceNotificationRadarDetectorProperty = exports.DeviceNotificationMotionProperty = void 0;
exports.StationCustom3SecuritySettings = exports.StationCustom2SecuritySettings = exports.StationCustom1SecuritySettings = exports.StationAwaySecuritySettings = exports.StationHomeSecuritySettings = exports.DeviceSoundDetectionRoundLookS350Property = exports.DeviceSoundDetectionRoundLookProperty = exports.DeviceNotificationIntervalTimeProperty = exports.DeviceDefaultAngleIdleTimeProperty = exports.DeviceDefaultAngleProperty = exports.DeviceContinuousRecordingTypeProperty = exports.DeviceContinuousRecordingProperty = exports.DeviceRingAutoResponseTimeToProperty = exports.DeviceRingAutoResponseTimeFromProperty = exports.DeviceRingAutoResponseVoiceResponseVoiceProperty = exports.DeviceRingAutoResponseVoiceResponseProperty = exports.DeviceRingAutoResponseProperty = exports.DeviceDualCamWatchViewModeS340Property = exports.DeviceDualCamWatchViewModeE340Property = exports.DeviceDualCamWatchViewModeProperty = exports.DeviceDeliveryGuardPackageLiveCheckAssistanceProperty = exports.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty = exports.DeviceDeliveryGuardUncollectedPackageAlertProperty = exports.DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty = exports.DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty = exports.DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty = exports.DeviceDeliveryGuardPackageGuardingProperty = exports.DeviceDeliveryGuardProperty = exports.DeviceLoiteringCustomResponseTimeToProperty = exports.DeviceLoiteringCustomResponseTimeFromProperty = exports.DeviceLoiteringCustomResponseHomeBaseNotificationProperty = exports.DeviceLoiteringCustomResponseAutoVoiceResponseVoiceProperty = exports.DeviceLoiteringCustomResponseAutoVoiceResponseProperty = exports.DeviceLoiteringCustomResponsePhoneNotificationProperty = exports.DeviceMotionDetectionSensitivityAdvancedHProperty = exports.DeviceMotionDetectionSensitivityAdvancedGProperty = exports.DeviceMotionDetectionSensitivityAdvancedFProperty = exports.DeviceMotionDetectionSensitivityAdvancedEProperty = exports.DeviceMotionDetectionSensitivityAdvancedDProperty = exports.DeviceMotionDetectionSensitivityAdvancedCProperty = exports.DeviceMotionDetectionSensitivityAdvancedBProperty = exports.DeviceMotionDetectionSensitivityAdvancedAProperty = exports.DeviceMotionDetectionSensitivityStandardProperty = exports.DeviceMotionDetectionSensitivityModeProperty = exports.DeviceLoiteringDetectionLengthProperty = exports.DeviceLoiteringDetectionRangeProperty = exports.DeviceLoiteringDetectionProperty = exports.DeviceNotificationLockedSmartLockProperty = exports.DeviceNotificationLockedProperty = exports.DeviceNotificationUnlockedSmartLockProperty = void 0;
exports.DeviceDetectionStatisticsDetectedEventsProperty = exports.DeviceDetectionStatisticsWorkingDaysProperty = exports.DeviceDogPoopDetectedProperty = exports.DeviceDogLickDetectedProperty = exports.DeviceDogDetectedProperty = exports.DeviceVehicleDetectedProperty = exports.DeviceStrangerPersonDetectedProperty = exports.DeviceIdentityPersonDetectedProperty = exports.DevicePersonNameProperty = exports.DeviceSnoozeChimeProperty = exports.DeviceSnoozeMotionProperty = exports.DeviceSnoozeHomebaseProperty = exports.DeviceSnoozeStartTimeWiredDoorbellProperty = exports.DeviceSnoozeStartTimeProperty = exports.DeviceSnoozeTimeProperty = exports.DeviceSnoozeProperty = exports.DeviceVideoTypeStoreToNASProperty = exports.DeviceWrongTryProtectAlertProperty = exports.DeviceLongTimeNotCloseAlertProperty = exports.DeviceLowBatteryAlertProperty = exports.DeviceShakeAlertEventProperty = exports.DeviceShakeAlertProperty = exports.Device911AlertEventProperty = exports.Device911AlertProperty = exports.DeviceJammedAlertProperty = exports.DeviceNotificationJammedProperty = exports.DeviceNotificationWrongTryProtectProperty = exports.DeviceNotificationDualLockProperty = exports.DeviceNotificationDualUnlockProperty = exports.DeviceNotificationUnlockByAppProperty = exports.DeviceNotificationUnlockByFingerprintProperty = exports.DeviceNotificationUnlockByPINProperty = exports.DeviceNotificationUnlockByKeyProperty = exports.DeviceAlarmVolumeProperty = exports.DevicePromptVolumeProperty = exports.DeviceRemoteUnlockMasterPINProperty = exports.DeviceRemoteUnlockProperty = exports.DeviceTamperAlarmProperty = exports.DeviceInteriorBrightnessDurationProperty = exports.DeviceInteriorBrightnessProperty = exports.DevicePowerSaveProperty = exports.DeviceDualUnlockProperty = exports.DeviceLeftOpenAlarmDurationProperty = exports.DeviceLeftOpenAlarmProperty = exports.DeviceRadarMotionDetectedProperty = exports.DeviceSomeoneLoiteringProperty = exports.DevicePackageTakenProperty = exports.DevicePackageStrandedProperty = exports.DevicePackageDeliveredProperty = exports.StationOffSecuritySettings = void 0;
exports.DeviceLeavingReactionEndTimeProperty = exports.DeviceLeavingReactionStartTimeProperty = exports.DeviceLeavingReactionNotificationProperty = exports.DeviceLeavingDetectionProperty = exports.DeviceNotificationVehicleProperty = exports.DeviceNotificationCryingS350Property = exports.DeviceNotificationAllSoundS350Property = exports.DeviceNotificationAllOtherMotionS350Property = exports.DeviceNotificationPetS350Property = exports.DeviceNotificationPersonS350Property = exports.DeviceFlickerAdjustmentProperty = exports.DeviceFindPhoneProperty = exports.DeviceLeftBehindAlarmProperty = exports.DeviceTrackerTypeProperty = exports.DeviceLocationLastUpdateProperty = exports.DeviceLocationAddressProperty = exports.DeviceLocationCoordinatesProperty = exports.DeviceDoorSensor2BatteryLevelProperty = exports.DeviceDoorSensor1BatteryLevelProperty = exports.DeviceDoorSensor2LowBatteryProperty = exports.DeviceDoorSensor1LowBatteryProperty = exports.DeviceDoorSensor2VersionProperty = exports.DeviceDoorSensor1VersionProperty = exports.DeviceDoorSensor2SerialNumberProperty = exports.DeviceDoorSensor1SerialNumberProperty = exports.DeviceDoorSensor2NameProperty = exports.DeviceDoorSensor1NameProperty = exports.DeviceDoorSensor2MacAddressProperty = exports.DeviceDoorSensor1MacAddressProperty = exports.DeviceDoorSensor2StatusProperty = exports.DeviceDoorSensor1StatusProperty = exports.DeviceDoor2OpenProperty = exports.DeviceDoor1OpenProperty = exports.DeviceDoorControlWarningProperty = exports.DeviceLightSettingsDynamicLightingThemesProperty = exports.DeviceLightSettingsColoredLightingColorsProperty = exports.DeviceLightSettingsScheduleLightingActiveModeProperty = exports.DeviceLightSettingsScheduleDynamicLightingProperty = exports.DeviceLightSettingsScheduleColoredLightingProperty = exports.DeviceLightSettingsScheduleDailyLightingProperty = exports.DeviceLightSettingsMotionLightingActiveModeProperty = exports.DeviceLightSettingsMotionDynamicLightingProperty = exports.DeviceLightSettingsMotionColoredLightingProperty = exports.DeviceLightSettingsMotionDailyLightingProperty = exports.DeviceLightSettingsManualLightingActiveModeProperty = exports.DeviceLightSettingsManualDynamicLightingProperty = exports.DeviceLightSettingsManualColoredLightingProperty = exports.DeviceLightSettingsManualDailyLightingProperty = exports.DevicePictureProperty = exports.DeviceDetectionStatisticsRecordedEventsProperty = void 0;
exports.StationAlarmProperty = exports.StationTurnOffAlarmWithButtonProperty = exports.StationAutoEndAlarmProperty = exports.StationSwitchModeWithAccessCodeProperty = exports.StationTimeZoneProperty = exports.StationTimeFormatProperty = exports.StationNotificationStartAlarmDelayProperty = exports.StationNotificationSwitchModeKeypadProperty = exports.StationNotificationSwitchModeAppProperty = exports.StationNotificationSwitchModeGeofenceProperty = exports.StationNotificationSwitchModeScheduleProperty = exports.StationAlarmToneProperty = exports.StationPromptVolumeProperty = exports.StationAlarmVolumeWalllightProperty = exports.StationAlarmVolumeProperty = exports.StationMacAddressProperty = exports.StationLanIpAddressStandaloneProperty = exports.StationLanIpAddressProperty = exports.StationCurrentModeKeyPadProperty = exports.StationCurrentModeProperty = exports.StationGuardModeKeyPadProperty = exports.StationGuardModeProperty = exports.BaseStationProperties = exports.StationSerialNumberProperty = exports.StationModelProperty = exports.StationNameProperty = exports.DeviceProperties = exports.LockT8520PDeviceProperties = exports.LockT8510PDeviceProperties = exports.WiredDoorbellT8200XDeviceProperties = exports.FloodlightT8420XDeviceProperties = exports.DeviceDeliveriesProperty = exports.DeviceHasMasterPinProperty = exports.DeviceIsDeliveryDeniedProperty = exports.DeviceBatteryFullyChargedAlertProperty = exports.DevicePinIncorrectAlertProperty = exports.DeviceLidStuckAlertProperty = exports.DeviceHighTemperatureAlertProperty = exports.DeviceLowTemperatureAlertProperty = exports.DeviceTamperingAlertProperty = exports.DeviceOpenedByNameProperty = exports.DeviceOpenedByTypeProperty = exports.DeviceOpenProperty = exports.DeviceMotionActivatedPromptProperty = exports.DeviceOpenMethodProperty = exports.DeviceNightvisionOptimizationSideProperty = exports.DeviceNightvisionOptimizationProperty = exports.DeviceBeepVolumeProperty = exports.DeviceLockEventOriginProperty = exports.DeviceSomeoneGoingProperty = void 0;
exports.StationCommands = exports.DeviceCommands = exports.CommandName = exports.StationProperties = exports.StationCrossTrackingGroupListProperty = exports.StationCrossTrackingCameraListProperty = exports.StationTrackingAssistanceProperty = exports.StationCrossCameraTrackingProperty = exports.StationContinuousTrackingTimeProperty = exports.StationStorageInfoHddProperty = exports.StationStorageInfoEmmcProperty = exports.StationSdAvailableCapacityProperty = exports.StationSdCapacityProperty = exports.StationSdStatusProperty = exports.StationAlarmDelayTypeProperty = exports.StationAlarmDelayProperty = exports.StationAlarmArmDelayProperty = exports.StationAlarmArmedProperty = exports.StationAlarmTypeProperty = void 0;
const types_1 = require("../p2p/types");
var DeviceType;
(function (DeviceType) {
    //List retrieved from com.oceanwing.battery.cam.binder.model.QueryDeviceData
    DeviceType[DeviceType["STATION"] = 0] = "STATION";
    DeviceType[DeviceType["CAMERA"] = 1] = "CAMERA";
    DeviceType[DeviceType["SENSOR"] = 2] = "SENSOR";
    DeviceType[DeviceType["FLOODLIGHT"] = 3] = "FLOODLIGHT";
    DeviceType[DeviceType["CAMERA_E"] = 4] = "CAMERA_E";
    DeviceType[DeviceType["DOORBELL"] = 5] = "DOORBELL";
    DeviceType[DeviceType["BATTERY_DOORBELL"] = 7] = "BATTERY_DOORBELL";
    DeviceType[DeviceType["CAMERA2C"] = 8] = "CAMERA2C";
    DeviceType[DeviceType["CAMERA2"] = 9] = "CAMERA2";
    DeviceType[DeviceType["MOTION_SENSOR"] = 10] = "MOTION_SENSOR";
    DeviceType[DeviceType["KEYPAD"] = 11] = "KEYPAD";
    DeviceType[DeviceType["CAMERA2_PRO"] = 14] = "CAMERA2_PRO";
    DeviceType[DeviceType["CAMERA2C_PRO"] = 15] = "CAMERA2C_PRO";
    DeviceType[DeviceType["BATTERY_DOORBELL_2"] = 16] = "BATTERY_DOORBELL_2";
    DeviceType[DeviceType["HB3"] = 18] = "HB3";
    DeviceType[DeviceType["CAMERA3"] = 19] = "CAMERA3";
    DeviceType[DeviceType["CAMERA3C"] = 23] = "CAMERA3C";
    DeviceType[DeviceType["PROFESSIONAL_247"] = 24] = "PROFESSIONAL_247";
    DeviceType[DeviceType["MINIBASE_CHIME"] = 25] = "MINIBASE_CHIME";
    DeviceType[DeviceType["CAMERA3_PRO"] = 26] = "CAMERA3_PRO";
    DeviceType[DeviceType["INDOOR_CAMERA"] = 30] = "INDOOR_CAMERA";
    DeviceType[DeviceType["INDOOR_PT_CAMERA"] = 31] = "INDOOR_PT_CAMERA";
    DeviceType[DeviceType["SOLO_CAMERA"] = 32] = "SOLO_CAMERA";
    DeviceType[DeviceType["SOLO_CAMERA_PRO"] = 33] = "SOLO_CAMERA_PRO";
    DeviceType[DeviceType["INDOOR_CAMERA_1080"] = 34] = "INDOOR_CAMERA_1080";
    DeviceType[DeviceType["INDOOR_PT_CAMERA_1080"] = 35] = "INDOOR_PT_CAMERA_1080";
    DeviceType[DeviceType["FLOODLIGHT_CAMERA_8422"] = 37] = "FLOODLIGHT_CAMERA_8422";
    DeviceType[DeviceType["FLOODLIGHT_CAMERA_8423"] = 38] = "FLOODLIGHT_CAMERA_8423";
    DeviceType[DeviceType["FLOODLIGHT_CAMERA_8424"] = 39] = "FLOODLIGHT_CAMERA_8424";
    DeviceType[DeviceType["INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT"] = 44] = "INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT";
    DeviceType[DeviceType["INDOOR_OUTDOOR_CAMERA_2K"] = 45] = "INDOOR_OUTDOOR_CAMERA_2K";
    DeviceType[DeviceType["INDOOR_OUTDOOR_CAMERA_1080P"] = 46] = "INDOOR_OUTDOOR_CAMERA_1080P";
    DeviceType[DeviceType["FLOODLIGHT_CAMERA_8425"] = 47] = "FLOODLIGHT_CAMERA_8425";
    DeviceType[DeviceType["OUTDOOR_PT_CAMERA"] = 48] = "OUTDOOR_PT_CAMERA";
    DeviceType[DeviceType["LOCK_BLE"] = 50] = "LOCK_BLE";
    DeviceType[DeviceType["LOCK_WIFI"] = 51] = "LOCK_WIFI";
    DeviceType[DeviceType["LOCK_BLE_NO_FINGER"] = 52] = "LOCK_BLE_NO_FINGER";
    DeviceType[DeviceType["LOCK_WIFI_NO_FINGER"] = 53] = "LOCK_WIFI_NO_FINGER";
    DeviceType[DeviceType["LOCK_8503"] = 54] = "LOCK_8503";
    DeviceType[DeviceType["LOCK_8530"] = 55] = "LOCK_8530";
    DeviceType[DeviceType["LOCK_85A3"] = 56] = "LOCK_85A3";
    DeviceType[DeviceType["LOCK_8592"] = 57] = "LOCK_8592";
    DeviceType[DeviceType["LOCK_8504"] = 58] = "LOCK_8504";
    DeviceType[DeviceType["SOLO_CAMERA_SPOTLIGHT_1080"] = 60] = "SOLO_CAMERA_SPOTLIGHT_1080";
    DeviceType[DeviceType["SOLO_CAMERA_SPOTLIGHT_2K"] = 61] = "SOLO_CAMERA_SPOTLIGHT_2K";
    DeviceType[DeviceType["SOLO_CAMERA_SPOTLIGHT_SOLAR"] = 62] = "SOLO_CAMERA_SPOTLIGHT_SOLAR";
    DeviceType[DeviceType["SOLO_CAMERA_SOLAR"] = 63] = "SOLO_CAMERA_SOLAR";
    DeviceType[DeviceType["SOLO_CAMERA_C210"] = 64] = "SOLO_CAMERA_C210";
    DeviceType[DeviceType["FLOODLIGHT_CAMERA_8426"] = 87] = "FLOODLIGHT_CAMERA_8426";
    DeviceType[DeviceType["SOLO_CAMERA_E30"] = 88] = "SOLO_CAMERA_E30";
    DeviceType[DeviceType["SMART_DROP"] = 90] = "SMART_DROP";
    DeviceType[DeviceType["BATTERY_DOORBELL_PLUS"] = 91] = "BATTERY_DOORBELL_PLUS";
    DeviceType[DeviceType["DOORBELL_SOLO"] = 93] = "DOORBELL_SOLO";
    DeviceType[DeviceType["BATTERY_DOORBELL_PLUS_E340"] = 94] = "BATTERY_DOORBELL_PLUS_E340";
    DeviceType[DeviceType["BATTERY_DOORBELL_C30"] = 95] = "BATTERY_DOORBELL_C30";
    DeviceType[DeviceType["BATTERY_DOORBELL_C31"] = 96] = "BATTERY_DOORBELL_C31";
    DeviceType[DeviceType["INDOOR_COST_DOWN_CAMERA"] = 100] = "INDOOR_COST_DOWN_CAMERA";
    DeviceType[DeviceType["CAMERA_GUN"] = 101] = "CAMERA_GUN";
    DeviceType[DeviceType["CAMERA_SNAIL"] = 102] = "CAMERA_SNAIL";
    DeviceType[DeviceType["INDOOR_PT_CAMERA_S350"] = 104] = "INDOOR_PT_CAMERA_S350";
    DeviceType[DeviceType["CAMERA_FG"] = 110] = "CAMERA_FG";
    DeviceType[DeviceType["CAMERA_GARAGE_T8453_COMMON"] = 131] = "CAMERA_GARAGE_T8453_COMMON";
    DeviceType[DeviceType["CAMERA_GARAGE_T8452"] = 132] = "CAMERA_GARAGE_T8452";
    DeviceType[DeviceType["CAMERA_GARAGE_T8453"] = 133] = "CAMERA_GARAGE_T8453";
    DeviceType[DeviceType["SMART_SAFE_7400"] = 140] = "SMART_SAFE_7400";
    DeviceType[DeviceType["SMART_SAFE_7401"] = 141] = "SMART_SAFE_7401";
    DeviceType[DeviceType["SMART_SAFE_7402"] = 142] = "SMART_SAFE_7402";
    DeviceType[DeviceType["SMART_SAFE_7403"] = 143] = "SMART_SAFE_7403";
    DeviceType[DeviceType["WALL_LIGHT_CAM"] = 151] = "WALL_LIGHT_CAM";
    DeviceType[DeviceType["SMART_TRACK_LINK"] = 157] = "SMART_TRACK_LINK";
    DeviceType[DeviceType["SMART_TRACK_CARD"] = 159] = "SMART_TRACK_CARD";
    DeviceType[DeviceType["LOCK_8502"] = 180] = "LOCK_8502";
    DeviceType[DeviceType["LOCK_8506"] = 184] = "LOCK_8506";
    DeviceType[DeviceType["WALL_LIGHT_CAM_81A0"] = 10005] = "WALL_LIGHT_CAM_81A0";
    DeviceType[DeviceType["INDOOR_PT_CAMERA_C220"] = 10008] = "INDOOR_PT_CAMERA_C220";
    DeviceType[DeviceType["INDOOR_PT_CAMERA_C210"] = 10009] = "INDOOR_PT_CAMERA_C210"; // T8419 / T8W11P?
})(DeviceType || (exports.DeviceType = DeviceType = {}));
var ParamType;
(function (ParamType) {
    //List retrieved from com.oceanwing.battery.cam.binder.model.CameraParams
    ParamType[ParamType["CHIME_STATE"] = 2015] = "CHIME_STATE";
    ParamType[ParamType["DETECT_EXPOSURE"] = 2023] = "DETECT_EXPOSURE";
    ParamType[ParamType["DETECT_MODE"] = 2004] = "DETECT_MODE";
    ParamType[ParamType["DETECT_MOTION_SENSITIVE"] = 2005] = "DETECT_MOTION_SENSITIVE";
    ParamType[ParamType["DETECT_SCENARIO"] = 2028] = "DETECT_SCENARIO";
    ParamType[ParamType["DETECT_SWITCH"] = 2027] = "DETECT_SWITCH";
    ParamType[ParamType["DETECT_ZONE"] = 2006] = "DETECT_ZONE";
    ParamType[ParamType["DOORBELL_AUDIO_RECODE"] = 2042] = "DOORBELL_AUDIO_RECODE";
    ParamType[ParamType["DOORBELL_BRIGHTNESS"] = 2032] = "DOORBELL_BRIGHTNESS";
    ParamType[ParamType["DOORBELL_DISTORTION"] = 2033] = "DOORBELL_DISTORTION";
    ParamType[ParamType["DOORBELL_HDR"] = 2029] = "DOORBELL_HDR";
    ParamType[ParamType["DOORBELL_IR_MODE"] = 2030] = "DOORBELL_IR_MODE";
    ParamType[ParamType["DOORBELL_LED_NIGHT_MODE"] = 2039] = "DOORBELL_LED_NIGHT_MODE";
    ParamType[ParamType["DOORBELL_MOTION_ADVANCE_OPTION"] = 2041] = "DOORBELL_MOTION_ADVANCE_OPTION";
    ParamType[ParamType["DOORBELL_MOTION_NOTIFICATION"] = 2035] = "DOORBELL_MOTION_NOTIFICATION";
    ParamType[ParamType["DOORBELL_NOTIFICATION_JUMP_MODE"] = 2038] = "DOORBELL_NOTIFICATION_JUMP_MODE";
    ParamType[ParamType["DOORBELL_NOTIFICATION_OPEN"] = 2036] = "DOORBELL_NOTIFICATION_OPEN";
    ParamType[ParamType["DOORBELL_RECORD_QUALITY"] = 2034] = "DOORBELL_RECORD_QUALITY";
    ParamType[ParamType["DOORBELL_RING_RECORD"] = 2040] = "DOORBELL_RING_RECORD";
    ParamType[ParamType["DOORBELL_SNOOZE_START_TIME"] = 2037] = "DOORBELL_SNOOZE_START_TIME";
    ParamType[ParamType["DOORBELL_VIDEO_QUALITY"] = 2031] = "DOORBELL_VIDEO_QUALITY";
    ParamType[ParamType["DOORBELL_CHIME_MODE"] = 100000] = "DOORBELL_CHIME_MODE";
    ParamType[ParamType["NIGHT_VISUAL"] = 2002] = "NIGHT_VISUAL";
    ParamType[ParamType["OPEN_DEVICE"] = 2001] = "OPEN_DEVICE";
    ParamType[ParamType["RINGING_VOLUME"] = 2022] = "RINGING_VOLUME";
    ParamType[ParamType["SDCARD"] = 2010] = "SDCARD";
    ParamType[ParamType["UN_DETECT_ZONE"] = 2007] = "UN_DETECT_ZONE";
    ParamType[ParamType["VOLUME"] = 2003] = "VOLUME";
    ParamType[ParamType["COMMAND_LED_NIGHT_OPEN"] = 1026] = "COMMAND_LED_NIGHT_OPEN";
    ParamType[ParamType["COMMAND_MOTION_DETECTION_PACKAGE"] = 1016] = "COMMAND_MOTION_DETECTION_PACKAGE";
    ParamType[ParamType["COMMAND_HDR"] = 1019] = "COMMAND_HDR";
    ParamType[ParamType["COMMAND_DISTORTION_CORRECTION"] = 1022] = "COMMAND_DISTORTION_CORRECTION";
    ParamType[ParamType["COMMAND_VIDEO_QUALITY"] = 1020] = "COMMAND_VIDEO_QUALITY";
    ParamType[ParamType["COMMAND_VIDEO_RECORDING_QUALITY"] = 1023] = "COMMAND_VIDEO_RECORDING_QUALITY";
    ParamType[ParamType["COMMAND_VIDEO_RING_RECORD"] = 1027] = "COMMAND_VIDEO_RING_RECORD";
    ParamType[ParamType["COMMAND_AUDIO_RECORDING"] = 1029] = "COMMAND_AUDIO_RECORDING";
    ParamType[ParamType["COMMAND_INDOOR_CHIME"] = 1006] = "COMMAND_INDOOR_CHIME";
    ParamType[ParamType["COMMAND_RINGTONE_VOLUME"] = 1012] = "COMMAND_RINGTONE_VOLUME";
    ParamType[ParamType["COMMAND_NOTIFICATION_RING"] = 1031] = "COMMAND_NOTIFICATION_RING";
    ParamType[ParamType["COMMAND_NOTIFICATION_TYPE"] = 1030] = "COMMAND_NOTIFICATION_TYPE";
    ParamType[ParamType["COMMAND_QUICK_RESPONSE"] = 1004] = "COMMAND_QUICK_RESPONSE";
    ParamType[ParamType["COMMAND_START_LIVESTREAM"] = 1000] = "COMMAND_START_LIVESTREAM";
    ParamType[ParamType["COMMAND_STREAM_INFO"] = 1005] = "COMMAND_STREAM_INFO";
    ParamType[ParamType["COMMAND_VOLTAGE_INFO"] = 1015] = "COMMAND_VOLTAGE_INFO";
    // Inferred from source
    ParamType[ParamType["SNOOZE_MODE"] = 1271] = "SNOOZE_MODE";
    ParamType[ParamType["WATERMARK_MODE"] = 1214] = "WATERMARK_MODE";
    ParamType[ParamType["DEVICE_UPGRADE_NOW"] = 1134] = "DEVICE_UPGRADE_NOW";
    ParamType[ParamType["CAMERA_UPGRADE_NOW"] = 1133] = "CAMERA_UPGRADE_NOW";
    ParamType[ParamType["DEFAULT_SCHEDULE_MODE"] = 1257] = "DEFAULT_SCHEDULE_MODE";
    ParamType[ParamType["GUARD_MODE"] = 1224] = "GUARD_MODE";
    ParamType[ParamType["FLOODLIGHT_MANUAL_SWITCH"] = 1400] = "FLOODLIGHT_MANUAL_SWITCH";
    ParamType[ParamType["FLOODLIGHT_MANUAL_BRIGHTNESS"] = 1401] = "FLOODLIGHT_MANUAL_BRIGHTNESS";
    ParamType[ParamType["FLOODLIGHT_MOTION_BRIGHTNESS"] = 1412] = "FLOODLIGHT_MOTION_BRIGHTNESS";
    ParamType[ParamType["FLOODLIGHT_SCHEDULE_BRIGHTNESS"] = 1413] = "FLOODLIGHT_SCHEDULE_BRIGHTNESS";
    ParamType[ParamType["FLOODLIGHT_MOTION_SENSITIVTY"] = 1272] = "FLOODLIGHT_MOTION_SENSITIVTY";
    ParamType[ParamType["CAMERA_SPEAKER_VOLUME"] = 1230] = "CAMERA_SPEAKER_VOLUME";
    ParamType[ParamType["CAMERA_RECORD_ENABLE_AUDIO"] = 1366] = "CAMERA_RECORD_ENABLE_AUDIO";
    ParamType[ParamType["CAMERA_RECORD_RETRIGGER_INTERVAL"] = 1250] = "CAMERA_RECORD_RETRIGGER_INTERVAL";
    ParamType[ParamType["CAMERA_RECORD_CLIP_LENGTH"] = 1249] = "CAMERA_RECORD_CLIP_LENGTH";
    ParamType[ParamType["CAMERA_IR_CUT"] = 1013] = "CAMERA_IR_CUT";
    ParamType[ParamType["CAMERA_PIR"] = 1011] = "CAMERA_PIR";
    ParamType[ParamType["CAMERA_WIFI_RSSI"] = 1142] = "CAMERA_WIFI_RSSI";
    ParamType[ParamType["CAMERA_MOTION_ZONES"] = 1204] = "CAMERA_MOTION_ZONES";
    // Set only params?
    ParamType[ParamType["PUSH_MSG_MODE"] = 1252] = "PUSH_MSG_MODE";
    ParamType[ParamType["PRIVATE_MODE"] = 99904] = "PRIVATE_MODE";
    ParamType[ParamType["CUSTOM_RTSP_URL"] = 999991] = "CUSTOM_RTSP_URL";
})(ParamType || (exports.ParamType = ParamType = {}));
var AlarmMode;
(function (AlarmMode) {
    AlarmMode[AlarmMode["AWAY"] = 0] = "AWAY";
    AlarmMode[AlarmMode["HOME"] = 1] = "HOME";
    AlarmMode[AlarmMode["CUSTOM1"] = 3] = "CUSTOM1";
    AlarmMode[AlarmMode["CUSTOM2"] = 4] = "CUSTOM2";
    AlarmMode[AlarmMode["CUSTOM3"] = 5] = "CUSTOM3";
    AlarmMode[AlarmMode["DISARMED"] = 63] = "DISARMED";
})(AlarmMode || (exports.AlarmMode = AlarmMode = {}));
var GuardMode;
(function (GuardMode) {
    GuardMode[GuardMode["UNKNOWN"] = -1] = "UNKNOWN";
    GuardMode[GuardMode["AWAY"] = 0] = "AWAY";
    GuardMode[GuardMode["HOME"] = 1] = "HOME";
    GuardMode[GuardMode["DISARMED"] = 63] = "DISARMED";
    GuardMode[GuardMode["SCHEDULE"] = 2] = "SCHEDULE";
    GuardMode[GuardMode["GEO"] = 47] = "GEO";
    GuardMode[GuardMode["CUSTOM1"] = 3] = "CUSTOM1";
    GuardMode[GuardMode["CUSTOM2"] = 4] = "CUSTOM2";
    GuardMode[GuardMode["CUSTOM3"] = 5] = "CUSTOM3";
    GuardMode[GuardMode["OFF"] = 6] = "OFF";
})(GuardMode || (exports.GuardMode = GuardMode = {}));
var ResponseErrorCode;
(function (ResponseErrorCode) {
    ResponseErrorCode[ResponseErrorCode["CODE_CONNECT_ERROR"] = 997] = "CODE_CONNECT_ERROR";
    ResponseErrorCode[ResponseErrorCode["CODE_ERROR_PIN"] = 36006] = "CODE_ERROR_PIN";
    //CODE_IS_OPEN = 25074,
    //CODE_IS_OPEN_OTHERS = 25080,
    ResponseErrorCode[ResponseErrorCode["CODE_MULTI_ALARM"] = 36002] = "CODE_MULTI_ALARM";
    ResponseErrorCode[ResponseErrorCode["CODE_NEED_VERIFY_CODE"] = 26052] = "CODE_NEED_VERIFY_CODE";
    ResponseErrorCode[ResponseErrorCode["CODE_NETWORK_ERROR"] = 998] = "CODE_NETWORK_ERROR";
    ResponseErrorCode[ResponseErrorCode["CODE_PHONE_NONE_SUPPORT"] = 26058] = "CODE_PHONE_NONE_SUPPORT";
    ResponseErrorCode[ResponseErrorCode["CODE_SERVER_ERROR"] = 999] = "CODE_SERVER_ERROR";
    ResponseErrorCode[ResponseErrorCode["CODE_SERVER_UNDER_MAINTENANCE"] = 424] = "CODE_SERVER_UNDER_MAINTENANCE";
    ResponseErrorCode[ResponseErrorCode["CODE_VERIFY_CODE_ERROR"] = 26050] = "CODE_VERIFY_CODE_ERROR";
    ResponseErrorCode[ResponseErrorCode["CODE_VERIFY_CODE_EXPIRED"] = 26051] = "CODE_VERIFY_CODE_EXPIRED";
    ResponseErrorCode[ResponseErrorCode["CODE_VERIFY_CODE_MAX"] = 26053] = "CODE_VERIFY_CODE_MAX";
    ResponseErrorCode[ResponseErrorCode["CODE_VERIFY_CODE_NONE_MATCH"] = 26054] = "CODE_VERIFY_CODE_NONE_MATCH";
    ResponseErrorCode[ResponseErrorCode["CODE_VERIFY_PASSWORD_ERROR"] = 26055] = "CODE_VERIFY_PASSWORD_ERROR";
    ResponseErrorCode[ResponseErrorCode["CODE_WHATEVER_ERROR"] = 0] = "CODE_WHATEVER_ERROR";
    ResponseErrorCode[ResponseErrorCode["CODE_EMAIL_LIMIT_EXCEED"] = 25077] = "CODE_EMAIL_LIMIT_EXCEED";
    ResponseErrorCode[ResponseErrorCode["CODE_GIVE_AWAY_EXPIRED"] = 25075] = "CODE_GIVE_AWAY_EXPIRED";
    ResponseErrorCode[ResponseErrorCode["CODE_GIVE_AWAY_INVALID"] = 25076] = "CODE_GIVE_AWAY_INVALID";
    ResponseErrorCode[ResponseErrorCode["CODE_GIVE_AWAY_NOT_EXIST"] = 25079] = "CODE_GIVE_AWAY_NOT_EXIST";
    ResponseErrorCode[ResponseErrorCode["CODE_GIVE_AWAY_PACKAGE_NOT_MATCH"] = 25078] = "CODE_GIVE_AWAY_PACKAGE_NOT_MATCH";
    ResponseErrorCode[ResponseErrorCode["CODE_GIVE_AWAY_PACKAGE_TYPE_NOT_MATCH"] = 25080] = "CODE_GIVE_AWAY_PACKAGE_TYPE_NOT_MATCH";
    ResponseErrorCode[ResponseErrorCode["CODE_GIVE_AWAY_RECORD_EXIST"] = 25074] = "CODE_GIVE_AWAY_RECORD_EXIST";
    ResponseErrorCode[ResponseErrorCode["CODE_INPUT_PARAM_INVALID"] = 10000] = "CODE_INPUT_PARAM_INVALID";
    ResponseErrorCode[ResponseErrorCode["CODE_MAX_FORGET_PASSWORD_ERROR"] = 100035] = "CODE_MAX_FORGET_PASSWORD_ERROR";
    ResponseErrorCode[ResponseErrorCode["CODE_MAX_LOGIN_LIMIT"] = 100028] = "CODE_MAX_LOGIN_LIMIT";
    ResponseErrorCode[ResponseErrorCode["CODE_MAX_REGISTER_ERROR"] = 100034] = "CODE_MAX_REGISTER_ERROR";
    ResponseErrorCode[ResponseErrorCode["EMAIL_NOT_REGISTERED_ERROR"] = 22008] = "EMAIL_NOT_REGISTERED_ERROR";
    ResponseErrorCode[ResponseErrorCode["LOGIN_CAPTCHA_ERROR"] = 100033] = "LOGIN_CAPTCHA_ERROR";
    ResponseErrorCode[ResponseErrorCode["LOGIN_DECRYPTION_FAIL"] = 100030] = "LOGIN_DECRYPTION_FAIL";
    ResponseErrorCode[ResponseErrorCode["LOGIN_ENCRYPTION_FAIL"] = 100029] = "LOGIN_ENCRYPTION_FAIL";
    ResponseErrorCode[ResponseErrorCode["LOGIN_INVALID_TOUCH_ID"] = 26047] = "LOGIN_INVALID_TOUCH_ID";
    ResponseErrorCode[ResponseErrorCode["LOGIN_NEED_CAPTCHA"] = 100032] = "LOGIN_NEED_CAPTCHA";
    ResponseErrorCode[ResponseErrorCode["MULTIPLE_EMAIL_PASSWORD_ERROR"] = 26006] = "MULTIPLE_EMAIL_PASSWORD_ERROR";
    ResponseErrorCode[ResponseErrorCode["MULTIPLE_INACTIVATED_ERROR"] = 26015] = "MULTIPLE_INACTIVATED_ERROR";
    ResponseErrorCode[ResponseErrorCode["MULTIPLE_REGISTRATION_ERROR"] = 26000] = "MULTIPLE_REGISTRATION_ERROR";
    ResponseErrorCode[ResponseErrorCode["RESP_ERROR_CODE_SESSION_TIMEOUT"] = 401] = "RESP_ERROR_CODE_SESSION_TIMEOUT";
    ResponseErrorCode[ResponseErrorCode["CODE_REQUEST_TOO_FAST"] = 250999] = "CODE_REQUEST_TOO_FAST";
})(ResponseErrorCode || (exports.ResponseErrorCode = ResponseErrorCode = {}));
var VerfyCodeTypes;
(function (VerfyCodeTypes) {
    VerfyCodeTypes[VerfyCodeTypes["TYPE_SMS"] = 0] = "TYPE_SMS";
    VerfyCodeTypes[VerfyCodeTypes["TYPE_PUSH"] = 1] = "TYPE_PUSH";
    VerfyCodeTypes[VerfyCodeTypes["TYPE_EMAIL"] = 2] = "TYPE_EMAIL";
})(VerfyCodeTypes || (exports.VerfyCodeTypes = VerfyCodeTypes = {}));
var StorageType;
(function (StorageType) {
    StorageType[StorageType["NONE"] = 0] = "NONE";
    StorageType[StorageType["LOCAL"] = 1] = "LOCAL";
    StorageType[StorageType["CLOUD"] = 2] = "CLOUD";
    StorageType[StorageType["LOCAL_AND_CLOUD"] = 3] = "LOCAL_AND_CLOUD";
})(StorageType || (exports.StorageType = StorageType = {}));
var PowerSource;
(function (PowerSource) {
    PowerSource[PowerSource["BATTERY"] = 0] = "BATTERY";
    PowerSource[PowerSource["SOLAR_PANEL"] = 1] = "SOLAR_PANEL";
})(PowerSource || (exports.PowerSource = PowerSource = {}));
var PublicKeyType;
(function (PublicKeyType) {
    PublicKeyType[PublicKeyType["SERVER"] = 1] = "SERVER";
    PublicKeyType[PublicKeyType["LOCK"] = 2] = "LOCK";
})(PublicKeyType || (exports.PublicKeyType = PublicKeyType = {}));
var FloodlightMotionTriggeredDistance;
(function (FloodlightMotionTriggeredDistance) {
    FloodlightMotionTriggeredDistance[FloodlightMotionTriggeredDistance["MIN"] = 66] = "MIN";
    FloodlightMotionTriggeredDistance[FloodlightMotionTriggeredDistance["LOW"] = 76] = "LOW";
    FloodlightMotionTriggeredDistance[FloodlightMotionTriggeredDistance["MEDIUM"] = 86] = "MEDIUM";
    FloodlightMotionTriggeredDistance[FloodlightMotionTriggeredDistance["HIGH"] = 91] = "HIGH";
    FloodlightMotionTriggeredDistance[FloodlightMotionTriggeredDistance["MAX"] = 96] = "MAX";
})(FloodlightMotionTriggeredDistance || (exports.FloodlightMotionTriggeredDistance = FloodlightMotionTriggeredDistance = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType[NotificationType["MOST_EFFICIENT"] = 1] = "MOST_EFFICIENT";
    NotificationType[NotificationType["INCLUDE_THUMBNAIL"] = 2] = "INCLUDE_THUMBNAIL";
    NotificationType[NotificationType["FULL_EFFECT"] = 3] = "FULL_EFFECT";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var WalllightNotificationType;
(function (WalllightNotificationType) {
    WalllightNotificationType[WalllightNotificationType["ONLY_TEXT"] = 1] = "ONLY_TEXT";
    WalllightNotificationType[WalllightNotificationType["WITH_THUMBNAIL"] = 2] = "WITH_THUMBNAIL";
})(WalllightNotificationType || (exports.WalllightNotificationType = WalllightNotificationType = {}));
var AlarmTone;
(function (AlarmTone) {
    AlarmTone[AlarmTone["ALARM_TONE1"] = 1] = "ALARM_TONE1";
    AlarmTone[AlarmTone["ALARM_TONE2"] = 2] = "ALARM_TONE2";
})(AlarmTone || (exports.AlarmTone = AlarmTone = {}));
var NotificationSwitchMode;
(function (NotificationSwitchMode) {
    NotificationSwitchMode[NotificationSwitchMode["APP"] = 16] = "APP";
    NotificationSwitchMode[NotificationSwitchMode["GEOFENCE"] = 32] = "GEOFENCE";
    NotificationSwitchMode[NotificationSwitchMode["SCHEDULE"] = 64] = "SCHEDULE";
    NotificationSwitchMode[NotificationSwitchMode["KEYPAD"] = 128] = "KEYPAD";
})(NotificationSwitchMode || (exports.NotificationSwitchMode = NotificationSwitchMode = {}));
var GuardModeSecuritySettingsAction;
(function (GuardModeSecuritySettingsAction) {
    GuardModeSecuritySettingsAction[GuardModeSecuritySettingsAction["VIDEO_RECORDING"] = 1] = "VIDEO_RECORDING";
    GuardModeSecuritySettingsAction[GuardModeSecuritySettingsAction["CAMERA_ALARM"] = 2] = "CAMERA_ALARM";
    GuardModeSecuritySettingsAction[GuardModeSecuritySettingsAction["HOMEBASE_ALARM"] = 4] = "HOMEBASE_ALARM";
    GuardModeSecuritySettingsAction[GuardModeSecuritySettingsAction["NOTIFICATON"] = 8] = "NOTIFICATON";
    GuardModeSecuritySettingsAction[GuardModeSecuritySettingsAction["PRIVACY"] = 16] = "PRIVACY";
    GuardModeSecuritySettingsAction[GuardModeSecuritySettingsAction["LIGHT_ALARM"] = 32] = "LIGHT_ALARM";
    GuardModeSecuritySettingsAction[GuardModeSecuritySettingsAction["PROFESSIONAL_SECURITY"] = 64] = "PROFESSIONAL_SECURITY";
})(GuardModeSecuritySettingsAction || (exports.GuardModeSecuritySettingsAction = GuardModeSecuritySettingsAction = {}));
var TimeFormat;
(function (TimeFormat) {
    TimeFormat[TimeFormat["FORMAT_12H"] = 0] = "FORMAT_12H";
    TimeFormat[TimeFormat["FORMAT_24H"] = 1] = "FORMAT_24H";
})(TimeFormat || (exports.TimeFormat = TimeFormat = {}));
var SignalLevel;
(function (SignalLevel) {
    SignalLevel[SignalLevel["NO_SIGNAL"] = 0] = "NO_SIGNAL";
    SignalLevel[SignalLevel["WEAK"] = 1] = "WEAK";
    SignalLevel[SignalLevel["NORMAL"] = 2] = "NORMAL";
    SignalLevel[SignalLevel["STRONG"] = 3] = "STRONG";
    SignalLevel[SignalLevel["FULL"] = 4] = "FULL";
})(SignalLevel || (exports.SignalLevel = SignalLevel = {}));
var MotionDetectionMode;
(function (MotionDetectionMode) {
    MotionDetectionMode[MotionDetectionMode["STANDARD"] = 0] = "STANDARD";
    MotionDetectionMode[MotionDetectionMode["ADVANCED"] = 1] = "ADVANCED";
})(MotionDetectionMode || (exports.MotionDetectionMode = MotionDetectionMode = {}));
var VideoTypeStoreToNAS;
(function (VideoTypeStoreToNAS) {
    VideoTypeStoreToNAS[VideoTypeStoreToNAS["Events"] = 0] = "Events";
    VideoTypeStoreToNAS[VideoTypeStoreToNAS["ContinuousRecording"] = 1] = "ContinuousRecording";
})(VideoTypeStoreToNAS || (exports.VideoTypeStoreToNAS = VideoTypeStoreToNAS = {}));
var DualCamStreamMode;
(function (DualCamStreamMode) {
    DualCamStreamMode[DualCamStreamMode["SINGLE_MAIN"] = 0] = "SINGLE_MAIN";
    DualCamStreamMode[DualCamStreamMode["SINGLE_SECOND"] = 1] = "SINGLE_SECOND";
    DualCamStreamMode[DualCamStreamMode["PIP_MAIN_UPPER_LEFT"] = 2] = "PIP_MAIN_UPPER_LEFT";
    DualCamStreamMode[DualCamStreamMode["PIP_MAIN_UPPER_RIGHT"] = 3] = "PIP_MAIN_UPPER_RIGHT";
    DualCamStreamMode[DualCamStreamMode["PIP_MAIN_LOWER_LEFT"] = 4] = "PIP_MAIN_LOWER_LEFT";
    DualCamStreamMode[DualCamStreamMode["PIP_MAIN_LOWER_RIGHT"] = 5] = "PIP_MAIN_LOWER_RIGHT";
    DualCamStreamMode[DualCamStreamMode["PIP_SECOND_UPPER_LEFT"] = 6] = "PIP_SECOND_UPPER_LEFT";
    DualCamStreamMode[DualCamStreamMode["PIP_SECOND_UPPER_RIGHT"] = 7] = "PIP_SECOND_UPPER_RIGHT";
    DualCamStreamMode[DualCamStreamMode["PIP_SECOND_LOWER_LEFT"] = 8] = "PIP_SECOND_LOWER_LEFT";
    DualCamStreamMode[DualCamStreamMode["PIP_SECOND_LOWER_RIGHT"] = 9] = "PIP_SECOND_LOWER_RIGHT";
    DualCamStreamMode[DualCamStreamMode["SPLICE_LEFT"] = 10] = "SPLICE_LEFT";
    DualCamStreamMode[DualCamStreamMode["SPLICE_RIGHT"] = 11] = "SPLICE_RIGHT";
    DualCamStreamMode[DualCamStreamMode["SPLICE_ABOVE"] = 12] = "SPLICE_ABOVE";
    DualCamStreamMode[DualCamStreamMode["SPLICE_UNDER"] = 13] = "SPLICE_UNDER";
    DualCamStreamMode[DualCamStreamMode["SPLICE_MIRROR"] = 14] = "SPLICE_MIRROR";
})(DualCamStreamMode || (exports.DualCamStreamMode = DualCamStreamMode = {}));
var UserType;
(function (UserType) {
    UserType[UserType["NORMAL"] = 0] = "NORMAL";
    UserType[UserType["ADMIN"] = 1] = "ADMIN";
    UserType[UserType["SUPER_ADMIN"] = 2] = "SUPER_ADMIN";
    UserType[UserType["ENTRY_ONLY"] = 4] = "ENTRY_ONLY";
})(UserType || (exports.UserType = UserType = {}));
var UserPasswordType;
(function (UserPasswordType) {
    UserPasswordType[UserPasswordType["PIN"] = 1] = "PIN";
    UserPasswordType[UserPasswordType["FINGERPRINT"] = 2] = "FINGERPRINT";
})(UserPasswordType || (exports.UserPasswordType = UserPasswordType = {}));
var HB3DetectionTypes;
(function (HB3DetectionTypes) {
    HB3DetectionTypes[HB3DetectionTypes["HUMAN_DETECTION"] = 2] = "HUMAN_DETECTION";
    HB3DetectionTypes[HB3DetectionTypes["VEHICLE_DETECTION"] = 4] = "VEHICLE_DETECTION";
    HB3DetectionTypes[HB3DetectionTypes["PET_DETECTION"] = 8] = "PET_DETECTION";
    HB3DetectionTypes[HB3DetectionTypes["ALL_OTHER_MOTION"] = 32768] = "ALL_OTHER_MOTION";
    HB3DetectionTypes[HB3DetectionTypes["HUMAN_RECOGNITION"] = 131072] = "HUMAN_RECOGNITION";
})(HB3DetectionTypes || (exports.HB3DetectionTypes = HB3DetectionTypes = {}));
var T8170DetectionTypes;
(function (T8170DetectionTypes) {
    T8170DetectionTypes[T8170DetectionTypes["HUMAN_DETECTION"] = 3] = "HUMAN_DETECTION";
    T8170DetectionTypes[T8170DetectionTypes["VEHICLE_DETECTION"] = 4] = "VEHICLE_DETECTION";
    T8170DetectionTypes[T8170DetectionTypes["ALL_OTHER_MOTION"] = 32768] = "ALL_OTHER_MOTION";
})(T8170DetectionTypes || (exports.T8170DetectionTypes = T8170DetectionTypes = {}));
var SoloCameraDetectionTypes;
(function (SoloCameraDetectionTypes) {
    SoloCameraDetectionTypes[SoloCameraDetectionTypes["HUMAN_DETECTION"] = 3] = "HUMAN_DETECTION";
    SoloCameraDetectionTypes[SoloCameraDetectionTypes["ALL_OTHER_MOTION"] = 32771] = "ALL_OTHER_MOTION";
})(SoloCameraDetectionTypes || (exports.SoloCameraDetectionTypes = SoloCameraDetectionTypes = {}));
var IndoorS350DetectionTypes;
(function (IndoorS350DetectionTypes) {
    IndoorS350DetectionTypes[IndoorS350DetectionTypes["HUMAN_DETECTION"] = 3] = "HUMAN_DETECTION";
    IndoorS350DetectionTypes[IndoorS350DetectionTypes["PET_DETECTION"] = 8] = "PET_DETECTION";
    IndoorS350DetectionTypes[IndoorS350DetectionTypes["ALL_OTHER_MOTION"] = 32768] = "ALL_OTHER_MOTION";
})(IndoorS350DetectionTypes || (exports.IndoorS350DetectionTypes = IndoorS350DetectionTypes = {}));
var IndoorDetectionTypes;
(function (IndoorDetectionTypes) {
    IndoorDetectionTypes[IndoorDetectionTypes["PERSON_DETECTION"] = 1] = "PERSON_DETECTION";
    IndoorDetectionTypes[IndoorDetectionTypes["PET_DETECTION"] = 2] = "PET_DETECTION";
    IndoorDetectionTypes[IndoorDetectionTypes["ALL_MOTION"] = 4] = "ALL_MOTION";
})(IndoorDetectionTypes || (exports.IndoorDetectionTypes = IndoorDetectionTypes = {}));
var IndoorMiniDetectionTypes;
(function (IndoorMiniDetectionTypes) {
    IndoorMiniDetectionTypes[IndoorMiniDetectionTypes["PERSON_DETECTION"] = 1] = "PERSON_DETECTION";
    IndoorMiniDetectionTypes[IndoorMiniDetectionTypes["ALL_MOTION"] = 4] = "ALL_MOTION";
})(IndoorMiniDetectionTypes || (exports.IndoorMiniDetectionTypes = IndoorMiniDetectionTypes = {}));
var IndoorS350NotificationTypes;
(function (IndoorS350NotificationTypes) {
    IndoorS350NotificationTypes[IndoorS350NotificationTypes["ALL_OTHER_MOTION"] = 801] = "ALL_OTHER_MOTION";
    IndoorS350NotificationTypes[IndoorS350NotificationTypes["HUMAN"] = 802] = "HUMAN";
    IndoorS350NotificationTypes[IndoorS350NotificationTypes["PET"] = 804] = "PET";
    IndoorS350NotificationTypes[IndoorS350NotificationTypes["CRYING"] = 808] = "CRYING";
    IndoorS350NotificationTypes[IndoorS350NotificationTypes["ALL_SOUND"] = 816] = "ALL_SOUND";
})(IndoorS350NotificationTypes || (exports.IndoorS350NotificationTypes = IndoorS350NotificationTypes = {}));
var FloodlightT8425NotificationTypes;
(function (FloodlightT8425NotificationTypes) {
    FloodlightT8425NotificationTypes[FloodlightT8425NotificationTypes["ALL_OTHER_MOTION"] = 1] = "ALL_OTHER_MOTION";
    FloodlightT8425NotificationTypes[FloodlightT8425NotificationTypes["HUMAN"] = 2] = "HUMAN";
    FloodlightT8425NotificationTypes[FloodlightT8425NotificationTypes["PET"] = 4] = "PET";
    FloodlightT8425NotificationTypes[FloodlightT8425NotificationTypes["VEHICLE"] = 512] = "VEHICLE";
})(FloodlightT8425NotificationTypes || (exports.FloodlightT8425NotificationTypes = FloodlightT8425NotificationTypes = {}));
var VideoType;
(function (VideoType) {
    VideoType[VideoType["RECEIVED_RING"] = 1000] = "RECEIVED_RING";
    VideoType[VideoType["MISSED_RING"] = 1001] = "MISSED_RING";
    VideoType[VideoType["MOTION"] = 1002] = "MOTION";
    VideoType[VideoType["PERSON"] = 1003] = "PERSON";
    VideoType[VideoType["PET"] = 1004] = "PET";
    VideoType[VideoType["CRYING"] = 1005] = "CRYING";
    VideoType[VideoType["SOUND"] = 1006] = "SOUND";
    VideoType[VideoType["PUTDOWN_PACKAGE"] = 65536] = "PUTDOWN_PACKAGE";
    VideoType[VideoType["TAKE_PACKAGE"] = 131072] = "TAKE_PACKAGE";
    VideoType[VideoType["DETECT_PACKAGE"] = 262144] = "DETECT_PACKAGE";
    VideoType[VideoType["RECEIVED_RING_ACK"] = 524288] = "RECEIVED_RING_ACK";
    VideoType[VideoType["RECEIVED_RING_MISS"] = 1048576] = "RECEIVED_RING_MISS";
    VideoType[VideoType["RECEIVED_CAR_GUARD"] = 2097152] = "RECEIVED_CAR_GUARD";
})(VideoType || (exports.VideoType = VideoType = {}));
var MediaType;
(function (MediaType) {
    MediaType[MediaType["NONE"] = -1] = "NONE";
    MediaType[MediaType["H264"] = 0] = "H264";
    MediaType[MediaType["H265"] = 1] = "H265";
})(MediaType || (exports.MediaType = MediaType = {}));
var RecordType;
(function (RecordType) {
    RecordType[RecordType["MOTION"] = 256] = "MOTION";
    RecordType[RecordType["PERSON"] = 512] = "PERSON";
    RecordType[RecordType["PET"] = 1024] = "PET";
    RecordType[RecordType["CRY"] = 2048] = "CRY";
    RecordType[RecordType["SOUND"] = 4096] = "SOUND";
    RecordType[RecordType["VEHICLE"] = 16384] = "VEHICLE";
    RecordType[RecordType["CAR_GUARD"] = 131072] = "CAR_GUARD";
})(RecordType || (exports.RecordType = RecordType = {}));
var MicStatus;
(function (MicStatus) {
    MicStatus[MicStatus["CLOSED"] = 0] = "CLOSED";
    MicStatus[MicStatus["OPENED"] = 1] = "OPENED";
})(MicStatus || (exports.MicStatus = MicStatus = {}));
var TriggerType;
(function (TriggerType) {
    TriggerType[TriggerType["MOTION1"] = 0] = "MOTION1";
    TriggerType[TriggerType["MOTION2"] = 1] = "MOTION2";
    TriggerType[TriggerType["MOTION3"] = 2] = "MOTION3";
    TriggerType[TriggerType["PERSON"] = 4] = "PERSON";
    TriggerType[TriggerType["RING"] = 8] = "RING";
    TriggerType[TriggerType["SENSOR"] = 16] = "SENSOR";
    TriggerType[TriggerType["UNKNOWN"] = 32] = "UNKNOWN";
    TriggerType[TriggerType["MISSED_RING"] = 64] = "MISSED_RING";
    TriggerType[TriggerType["ANSWER_RING"] = 128] = "ANSWER_RING";
})(TriggerType || (exports.TriggerType = TriggerType = {}));
var LightingActiveMode;
(function (LightingActiveMode) {
    LightingActiveMode[LightingActiveMode["DAILY"] = 0] = "DAILY";
    LightingActiveMode[LightingActiveMode["COLORED"] = 1] = "COLORED";
    LightingActiveMode[LightingActiveMode["DYNAMIC"] = 2] = "DYNAMIC";
})(LightingActiveMode || (exports.LightingActiveMode = LightingActiveMode = {}));
var DailyLightingType;
(function (DailyLightingType) {
    DailyLightingType[DailyLightingType["COLD"] = 0] = "COLD";
    DailyLightingType[DailyLightingType["WARM"] = 1] = "WARM";
    DailyLightingType[DailyLightingType["VERY_WARM"] = 2] = "VERY_WARM";
})(DailyLightingType || (exports.DailyLightingType = DailyLightingType = {}));
var MotionActivationMode;
(function (MotionActivationMode) {
    MotionActivationMode[MotionActivationMode["SMART"] = 0] = "SMART";
    MotionActivationMode[MotionActivationMode["FAST"] = 1] = "FAST";
})(MotionActivationMode || (exports.MotionActivationMode = MotionActivationMode = {}));
var DynamicLightingEffect;
(function (DynamicLightingEffect) {
    DynamicLightingEffect[DynamicLightingEffect["FADE"] = 1] = "FADE";
    DynamicLightingEffect[DynamicLightingEffect["BLINK"] = 2] = "BLINK";
})(DynamicLightingEffect || (exports.DynamicLightingEffect = DynamicLightingEffect = {}));
var GarageDoorState;
(function (GarageDoorState) {
    GarageDoorState[GarageDoorState["A_CLOSED"] = 2] = "A_CLOSED";
    GarageDoorState[GarageDoorState["A_CLOSING"] = -102] = "A_CLOSING";
    GarageDoorState[GarageDoorState["A_NO_MOTOR"] = -108] = "A_NO_MOTOR";
    GarageDoorState[GarageDoorState["A_OPENED"] = 1] = "A_OPENED";
    GarageDoorState[GarageDoorState["A_OPENING"] = -101] = "A_OPENING";
    GarageDoorState[GarageDoorState["A_UNKNOWN"] = 16] = "A_UNKNOWN";
    GarageDoorState[GarageDoorState["B_CLOSED"] = 8] = "B_CLOSED";
    GarageDoorState[GarageDoorState["B_CLOSING"] = -104] = "B_CLOSING";
    GarageDoorState[GarageDoorState["B_NO_MOTOR"] = -109] = "B_NO_MOTOR";
    GarageDoorState[GarageDoorState["B_OPENED"] = 4] = "B_OPENED";
    GarageDoorState[GarageDoorState["B_OPENING"] = -103] = "B_OPENING";
    GarageDoorState[GarageDoorState["B_UNKNOWN"] = 32] = "B_UNKNOWN";
    GarageDoorState[GarageDoorState["UNKNOWN"] = 0] = "UNKNOWN";
})(GarageDoorState || (exports.GarageDoorState = GarageDoorState = {}));
var TrackerType;
(function (TrackerType) {
    TrackerType[TrackerType["TRACKER"] = 0] = "TRACKER";
    TrackerType[TrackerType["KEY"] = 1] = "KEY";
    TrackerType[TrackerType["WALLET"] = 2] = "WALLET";
    TrackerType[TrackerType["BAG"] = 3] = "BAG";
    TrackerType[TrackerType["REMOTE"] = 4] = "REMOTE";
    TrackerType[TrackerType["CAMERA"] = 5] = "CAMERA";
    TrackerType[TrackerType["HEADPHONES"] = 6] = "HEADPHONES";
    TrackerType[TrackerType["TOY"] = 7] = "TOY";
    TrackerType[TrackerType["SUITCASE"] = 8] = "SUITCASE";
    TrackerType[TrackerType["HANDBAG"] = 9] = "HANDBAG";
})(TrackerType || (exports.TrackerType = TrackerType = {}));
var MotionDetectionRangeType;
(function (MotionDetectionRangeType) {
    MotionDetectionRangeType[MotionDetectionRangeType["STANDARD"] = 0] = "STANDARD";
    MotionDetectionRangeType[MotionDetectionRangeType["ADVANCED"] = 1] = "ADVANCED";
    MotionDetectionRangeType[MotionDetectionRangeType["AUTOMATIC"] = 2] = "AUTOMATIC";
})(MotionDetectionRangeType || (exports.MotionDetectionRangeType = MotionDetectionRangeType = {}));
var ViewModeType;
(function (ViewModeType) {
    ViewModeType[ViewModeType["SINGLE_VIEW"] = 0] = "SINGLE_VIEW";
    ViewModeType[ViewModeType["DUAL_VIEW"] = 12] = "DUAL_VIEW";
})(ViewModeType || (exports.ViewModeType = ViewModeType = {}));
var PresetPositionType;
(function (PresetPositionType) {
    PresetPositionType[PresetPositionType["PRESET_1"] = 0] = "PRESET_1";
    PresetPositionType[PresetPositionType["PRESET_2"] = 1] = "PRESET_2";
    PresetPositionType[PresetPositionType["PRESET_3"] = 2] = "PRESET_3";
    PresetPositionType[PresetPositionType["PRESET_4"] = 3] = "PRESET_4";
})(PresetPositionType || (exports.PresetPositionType = PresetPositionType = {}));
;
var DeviceEvent;
(function (DeviceEvent) {
    DeviceEvent[DeviceEvent["MotionDetected"] = 0] = "MotionDetected";
    DeviceEvent[DeviceEvent["PersonDetected"] = 1] = "PersonDetected";
    DeviceEvent[DeviceEvent["PetDetected"] = 2] = "PetDetected";
    DeviceEvent[DeviceEvent["SoundDetected"] = 3] = "SoundDetected";
    DeviceEvent[DeviceEvent["CryingDetected"] = 4] = "CryingDetected";
    DeviceEvent[DeviceEvent["Ringing"] = 5] = "Ringing";
    DeviceEvent[DeviceEvent["PackageDelivered"] = 6] = "PackageDelivered";
    DeviceEvent[DeviceEvent["PackageTaken"] = 7] = "PackageTaken";
    DeviceEvent[DeviceEvent["PackageStranded"] = 8] = "PackageStranded";
    DeviceEvent[DeviceEvent["SomeoneLoitering"] = 9] = "SomeoneLoitering";
    DeviceEvent[DeviceEvent["RadarMotionDetected"] = 10] = "RadarMotionDetected";
    DeviceEvent[DeviceEvent["SomeoneGoing"] = 11] = "SomeoneGoing";
    DeviceEvent[DeviceEvent["LeftOpen"] = 12] = "LeftOpen";
    DeviceEvent[DeviceEvent["Jammed"] = 13] = "Jammed";
    DeviceEvent[DeviceEvent["Alarm911"] = 14] = "Alarm911";
    DeviceEvent[DeviceEvent["LowBattery"] = 15] = "LowBattery";
    DeviceEvent[DeviceEvent["LongTimeNotClose"] = 16] = "LongTimeNotClose";
    DeviceEvent[DeviceEvent["ShakeAlarm"] = 17] = "ShakeAlarm";
    DeviceEvent[DeviceEvent["WrontTryProtectAlarm"] = 18] = "WrontTryProtectAlarm";
    DeviceEvent[DeviceEvent["IdentityPersonDetected"] = 19] = "IdentityPersonDetected";
    DeviceEvent[DeviceEvent["StrangerPersonDetected"] = 20] = "StrangerPersonDetected";
    DeviceEvent[DeviceEvent["VehicleDetected"] = 21] = "VehicleDetected";
    DeviceEvent[DeviceEvent["DogDetected"] = 22] = "DogDetected";
    DeviceEvent[DeviceEvent["DogLickDetected"] = 23] = "DogLickDetected";
    DeviceEvent[DeviceEvent["DogPoopDetected"] = 24] = "DogPoopDetected";
    DeviceEvent[DeviceEvent["Lock"] = 25] = "Lock";
    DeviceEvent[DeviceEvent["TamperingAlert"] = 26] = "TamperingAlert";
    DeviceEvent[DeviceEvent["LowTemperatureAlert"] = 27] = "LowTemperatureAlert";
    DeviceEvent[DeviceEvent["HighTemperatureAlert"] = 28] = "HighTemperatureAlert";
    DeviceEvent[DeviceEvent["LidStuckAlert"] = 29] = "LidStuckAlert";
    DeviceEvent[DeviceEvent["PinIncorrectAlert"] = 30] = "PinIncorrectAlert";
    DeviceEvent[DeviceEvent["BatteryFullyChargedAlert"] = 31] = "BatteryFullyChargedAlert";
})(DeviceEvent || (exports.DeviceEvent = DeviceEvent = {}));
var PropertyName;
(function (PropertyName) {
    PropertyName["Name"] = "name";
    PropertyName["Model"] = "model";
    PropertyName["SerialNumber"] = "serialNumber";
    PropertyName["HardwareVersion"] = "hardwareVersion";
    PropertyName["SoftwareVersion"] = "softwareVersion";
    PropertyName["Type"] = "type";
    PropertyName["DeviceStationSN"] = "stationSerialNumber";
    PropertyName["DeviceBattery"] = "battery";
    PropertyName["DeviceBatteryTemp"] = "batteryTemperature";
    PropertyName["DeviceBatteryLow"] = "batteryLow";
    PropertyName["DeviceBatteryIsCharging"] = "batteryIsCharging";
    PropertyName["DeviceLastChargingDays"] = "lastChargingDays";
    PropertyName["DeviceLastChargingTotalEvents"] = "lastChargingTotalEvents";
    PropertyName["DeviceLastChargingRecordedEvents"] = "lastChargingRecordedEvents";
    PropertyName["DeviceLastChargingFalseEvents"] = "lastChargingFalseEvents";
    PropertyName["DeviceBatteryUsageLastWeek"] = "batteryUsageLastWeek";
    PropertyName["DeviceWifiRSSI"] = "wifiRssi";
    PropertyName["DeviceWifiSignalLevel"] = "wifiSignalLevel";
    PropertyName["DeviceEnabled"] = "enabled";
    PropertyName["DeviceAntitheftDetection"] = "antitheftDetection";
    PropertyName["DeviceAutoNightvision"] = "autoNightvision";
    PropertyName["DeviceNightvision"] = "nightvision";
    PropertyName["DeviceStatusLed"] = "statusLed";
    PropertyName["DeviceMotionDetection"] = "motionDetection";
    PropertyName["DeviceMotionDetectionType"] = "motionDetectionType";
    PropertyName["DeviceMotionDetectionSensitivity"] = "motionDetectionSensitivity";
    PropertyName["DeviceMotionZone"] = "motionZone";
    PropertyName["DeviceMotionDetectionRange"] = "motionDetectionRange";
    PropertyName["DeviceMotionDetectionRangeStandardSensitivity"] = "motionDetectionRangeStandardSensitivity";
    PropertyName["DeviceMotionDetectionRangeAdvancedLeftSensitivity"] = "motionDetectionRangeAdvancedLeftSensitivity";
    PropertyName["DeviceMotionDetectionRangeAdvancedMiddleSensitivity"] = "motionDetectionRangeAdvancedMiddleSensitivity";
    PropertyName["DeviceMotionDetectionRangeAdvancedRightSensitivity"] = "motionDetectionRangeAdvancedRightSensitivity";
    PropertyName["DeviceMotionDetectionTestMode"] = "motionDetectionTestMode";
    PropertyName["DeviceMotionDetectionTypeHuman"] = "motionDetectionTypeHuman";
    PropertyName["DeviceMotionDetectionTypeHumanRecognition"] = "motionDetectionTypeHumanRecognition";
    PropertyName["DeviceMotionDetectionTypePet"] = "motionDetectionTypePet";
    PropertyName["DeviceMotionDetectionTypeVehicle"] = "motionDetectionTypeVehicle";
    PropertyName["DeviceMotionDetectionTypeAllOtherMotions"] = "motionDetectionTypeAllOtherMotions";
    PropertyName["DeviceMotionDetected"] = "motionDetected";
    PropertyName["DeviceMotionTracking"] = "motionTracking";
    PropertyName["DeviceMotionTrackingSensitivity"] = "motionTrackingSensitivity";
    PropertyName["DeviceMotionAutoCruise"] = "motionAutoCruise";
    PropertyName["DeviceMotionOutOfViewDetection"] = "motionOutOfViewDetection";
    PropertyName["DevicePersonDetected"] = "personDetected";
    PropertyName["DevicePersonName"] = "personName";
    PropertyName["DeviceRTSPStream"] = "rtspStream";
    PropertyName["DeviceRTSPStreamUrl"] = "rtspStreamUrl";
    PropertyName["DeviceWatermark"] = "watermark";
    PropertyName["DevicePictureUrl"] = "hidden-pictureUrl";
    PropertyName["DevicePicture"] = "picture";
    PropertyName["DeviceState"] = "state";
    PropertyName["DevicePetDetection"] = "petDetection";
    PropertyName["DevicePetDetected"] = "petDetected";
    PropertyName["DeviceSoundDetection"] = "soundDetection";
    PropertyName["DeviceSoundDetectionType"] = "soundDetectionType";
    PropertyName["DeviceSoundDetectionSensitivity"] = "soundDetectionSensitivity";
    PropertyName["DeviceSoundDetected"] = "soundDetected";
    PropertyName["DeviceCryingDetected"] = "cryingDetected";
    PropertyName["DeviceSensorOpen"] = "sensorOpen";
    PropertyName["DeviceSensorChangeTime"] = "sensorChangeTime";
    PropertyName["DeviceMotionSensorPIREvent"] = "motionSensorPirEvent";
    PropertyName["DeviceLocked"] = "locked";
    PropertyName["DeviceRinging"] = "ringing";
    PropertyName["DeviceLockStatus"] = "lockStatus";
    PropertyName["DeviceLight"] = "light";
    PropertyName["DeviceMicrophone"] = "microphone";
    PropertyName["DeviceSpeaker"] = "speaker";
    PropertyName["DeviceSpeakerVolume"] = "speakerVolume";
    PropertyName["DeviceRingtoneVolume"] = "ringtoneVolume";
    PropertyName["DeviceAudioRecording"] = "audioRecording";
    PropertyName["DevicePowerSource"] = "powerSource";
    PropertyName["DevicePowerWorkingMode"] = "powerWorkingMode";
    PropertyName["DeviceChargingStatus"] = "chargingStatus";
    PropertyName["DeviceRecordingEndClipMotionStops"] = "recordingEndClipMotionStops";
    PropertyName["DeviceRecordingClipLength"] = "recordingClipLength";
    PropertyName["DeviceRecordingRetriggerInterval"] = "recordingRetriggerInterval";
    PropertyName["DeviceVideoStreamingQuality"] = "videoStreamingQuality";
    PropertyName["DeviceVideoRecordingQuality"] = "videoRecordingQuality";
    PropertyName["DeviceVideoWDR"] = "videoWdr";
    PropertyName["DeviceLightSettingsEnable"] = "lightSettingsEnable";
    PropertyName["DeviceLightSettingsBrightnessManual"] = "lightSettingsBrightnessManual";
    PropertyName["DeviceLightSettingsColorTemperatureManual"] = "lightSettingsColorTemperatureManual";
    PropertyName["DeviceLightSettingsBrightnessMotion"] = "lightSettingsBrightnessMotion";
    PropertyName["DeviceLightSettingsColorTemperatureMotion"] = "lightSettingsColorTemperatureMotion";
    PropertyName["DeviceLightSettingsBrightnessSchedule"] = "lightSettingsBrightnessSchedule";
    PropertyName["DeviceLightSettingsColorTemperatureSchedule"] = "lightSettingsColorTemperatureSchedule";
    PropertyName["DeviceLightSettingsMotionTriggered"] = "lightSettingsMotionTriggered";
    PropertyName["DeviceLightSettingsMotionActivationMode"] = "lightSettingsMotionActivationMode";
    PropertyName["DeviceLightSettingsMotionTriggeredDistance"] = "lightSettingsMotionTriggeredDistance";
    PropertyName["DeviceLightSettingsMotionTriggeredTimer"] = "lightSettingsMotionTriggeredTimer";
    //DeviceLightSettingsSunsetToSunrise = "lightSettingsSunsetToSunrise",
    PropertyName["DeviceLightSettingsManualLightingActiveMode"] = "lightSettingsManualLightingActiveMode";
    PropertyName["DeviceLightSettingsManualDailyLighting"] = "lightSettingsManualDailyLighting";
    PropertyName["DeviceLightSettingsManualColoredLighting"] = "lightSettingsManualColoredLighting";
    PropertyName["DeviceLightSettingsManualDynamicLighting"] = "lightSettingsManualDynamicLighting";
    PropertyName["DeviceLightSettingsMotionLightingActiveMode"] = "lightSettingsMotionLightingActiveMode";
    PropertyName["DeviceLightSettingsMotionDailyLighting"] = "lightSettingsMotionDailyLighting";
    PropertyName["DeviceLightSettingsMotionColoredLighting"] = "lightSettingsMotionColoredLighting";
    PropertyName["DeviceLightSettingsMotionDynamicLighting"] = "lightSettingsMotionDynamicLighting";
    PropertyName["DeviceLightSettingsScheduleLightingActiveMode"] = "lightSettingsScheduleLightingActiveMode";
    PropertyName["DeviceLightSettingsScheduleDailyLighting"] = "lightSettingsScheduleDailyLighting";
    PropertyName["DeviceLightSettingsScheduleColoredLighting"] = "lightSettingsScheduleColoredLighting";
    PropertyName["DeviceLightSettingsScheduleDynamicLighting"] = "lightSettingsScheduleDynamicLighting";
    PropertyName["DeviceLightSettingsColoredLightingColors"] = "lightSettingsColoredLightingColors";
    PropertyName["DeviceLightSettingsDynamicLightingThemes"] = "lightSettingsDynamicLightingThemes";
    PropertyName["DeviceChimeIndoor"] = "chimeIndoor";
    PropertyName["DeviceChimeHomebase"] = "chimeHomebase";
    PropertyName["DeviceChimeHomebaseRingtoneVolume"] = "chimeHomebaseRingtoneVolume";
    PropertyName["DeviceChimeHomebaseRingtoneType"] = "chimeHomebaseRingtoneType";
    PropertyName["DeviceNotificationType"] = "notificationType";
    PropertyName["DeviceRotationSpeed"] = "rotationSpeed";
    PropertyName["DeviceImageMirrored"] = "imageMirrored";
    PropertyName["DeviceNotificationPerson"] = "notificationPerson";
    PropertyName["DeviceNotificationPet"] = "notificationPet";
    PropertyName["DeviceNotificationAllOtherMotion"] = "notificationAllOtherMotion";
    PropertyName["DeviceNotificationCrying"] = "notificationCrying";
    PropertyName["DeviceNotificationAllSound"] = "notificationAllSound";
    PropertyName["DeviceNotificationIntervalTime"] = "notificationIntervalTime";
    PropertyName["DeviceNotificationRing"] = "notificationRing";
    PropertyName["DeviceNotificationMotion"] = "notificationMotion";
    PropertyName["DeviceNotificationRadarDetector"] = "notificationRadarDetector";
    PropertyName["DeviceNotificationVehicle"] = "notificationVehicle";
    PropertyName["DeviceContinuousRecording"] = "continuousRecording";
    PropertyName["DeviceContinuousRecordingType"] = "continuousRecordingType";
    PropertyName["DeviceChirpVolume"] = "chirpVolume";
    PropertyName["DeviceChirpTone"] = "chirpTone";
    PropertyName["DeviceVideoHDR"] = "videoHdr";
    PropertyName["DeviceVideoDistortionCorrection"] = "videoDistortionCorrection";
    PropertyName["DeviceVideoRingRecord"] = "videoRingRecord";
    PropertyName["DeviceVideoNightvisionImageAdjustment"] = "videoNightvisionImageAdjustment";
    PropertyName["DeviceVideoColorNightvision"] = "videoColorNightvision";
    PropertyName["DeviceAutoCalibration"] = "autoCalibration";
    PropertyName["DeviceAutoLock"] = "autoLock";
    PropertyName["DeviceAutoLockTimer"] = "autoLockTimer";
    PropertyName["DeviceAutoLockSchedule"] = "autoLockSchedule";
    PropertyName["DeviceAutoLockScheduleStartTime"] = "autoLockScheduleStartTime";
    PropertyName["DeviceAutoLockScheduleEndTime"] = "autoLockScheduleEndTime";
    PropertyName["DeviceOneTouchLocking"] = "oneTouchLocking";
    PropertyName["DeviceWrongTryProtection"] = "wrongTryProtection";
    PropertyName["DeviceWrongTryAttempts"] = "wrongTryAttempts";
    PropertyName["DeviceWrongTryLockdownTime"] = "wrongTryLockdownTime";
    PropertyName["DeviceScramblePasscode"] = "scramblePasscode";
    PropertyName["DeviceSound"] = "sound";
    PropertyName["DeviceNotification"] = "notification";
    PropertyName["DeviceNotificationUnlocked"] = "notificationUnlocked";
    PropertyName["DeviceNotificationLocked"] = "notificationLocked";
    PropertyName["DeviceLoiteringDetection"] = "loiteringDetection";
    PropertyName["DeviceLoiteringDetectionRange"] = "loiteringDetectionRange";
    PropertyName["DeviceLoiteringDetectionLength"] = "loiteringDetectionLength";
    PropertyName["DeviceMotionDetectionSensitivityMode"] = "motionDetectionSensitivityMode";
    PropertyName["DeviceMotionDetectionSensitivityStandard"] = "motionDetectionSensitivityStandard";
    PropertyName["DeviceMotionDetectionSensitivityAdvancedA"] = "motionDetectionSensitivityAdvancedA";
    PropertyName["DeviceMotionDetectionSensitivityAdvancedB"] = "motionDetectionSensitivityAdvancedB";
    PropertyName["DeviceMotionDetectionSensitivityAdvancedC"] = "motionDetectionSensitivityAdvancedC";
    PropertyName["DeviceMotionDetectionSensitivityAdvancedD"] = "motionDetectionSensitivityAdvancedD";
    PropertyName["DeviceMotionDetectionSensitivityAdvancedE"] = "motionDetectionSensitivityAdvancedE";
    PropertyName["DeviceMotionDetectionSensitivityAdvancedF"] = "motionDetectionSensitivityAdvancedF";
    PropertyName["DeviceMotionDetectionSensitivityAdvancedG"] = "motionDetectionSensitivityAdvancedG";
    PropertyName["DeviceMotionDetectionSensitivityAdvancedH"] = "motionDetectionSensitivityAdvancedH";
    PropertyName["DeviceLoiteringCustomResponsePhoneNotification"] = "loiteringCustomResponsePhoneNotification";
    PropertyName["DeviceLoiteringCustomResponseAutoVoiceResponse"] = "loiteringCustomResponseAutoVoiceResponse";
    PropertyName["DeviceLoiteringCustomResponseAutoVoiceResponseVoice"] = "loiteringCustomResponseAutoVoiceResponseVoice";
    PropertyName["DeviceLoiteringCustomResponseHomeBaseNotification"] = "loiteringCustomResponseHomeBaseNotification";
    PropertyName["DeviceLoiteringCustomResponseTimeFrom"] = "loiteringCustomResponseTimeFrom";
    PropertyName["DeviceLoiteringCustomResponseTimeTo"] = "loiteringCustomResponseTimeTo";
    PropertyName["DeviceDeliveryGuard"] = "deliveryGuard";
    PropertyName["DeviceDeliveryGuardPackageGuarding"] = "deliveryGuardPackageGuarding";
    PropertyName["DeviceDeliveryGuardPackageGuardingVoiceResponseVoice"] = "deliveryGuardPackageGuardingVoiceResponseVoice";
    PropertyName["DeviceDeliveryGuardPackageGuardingActivatedTimeFrom"] = "deliveryGuardPackageGuardingActivatedTimeFrom";
    PropertyName["DeviceDeliveryGuardPackageGuardingActivatedTimeTo"] = "deliveryGuardPackageGuardingActivatedTimeTo";
    PropertyName["DeviceDeliveryGuardUncollectedPackageAlert"] = "deliveryGuardUncollectedPackageAlert";
    PropertyName["DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck"] = "deliveryGuardUncollectedPackageAlertTimeToCheck";
    PropertyName["DeviceDeliveryGuardPackageLiveCheckAssistance"] = "deliveryGuardPackageLiveCheckAssistance";
    PropertyName["DeviceDualCamWatchViewMode"] = "dualCamWatchViewMode";
    PropertyName["DeviceRingAutoResponse"] = "ringAutoResponse";
    PropertyName["DeviceRingAutoResponseVoiceResponse"] = "ringAutoResponseVoiceResponse";
    PropertyName["DeviceRingAutoResponseVoiceResponseVoice"] = "ringAutoResponseVoiceResponseVoice";
    PropertyName["DeviceRingAutoResponseTimeFrom"] = "ringAutoResponseTimeFrom";
    PropertyName["DeviceRingAutoResponseTimeTo"] = "ringAutoResponseTimeTo";
    PropertyName["DeviceDefaultAngle"] = "defaultAngle";
    PropertyName["DeviceDefaultAngleIdleTime"] = "defaultAngleIdleTime";
    PropertyName["DeviceSoundDetectionRoundLook"] = "soundDetectionRoundLook";
    PropertyName["DevicePackageDelivered"] = "packageDelivered";
    PropertyName["DevicePackageStranded"] = "packageStranded";
    PropertyName["DevicePackageTaken"] = "packageTaken";
    PropertyName["DeviceSomeoneLoitering"] = "someoneLoitering";
    PropertyName["DeviceRadarMotionDetected"] = "radarMotionDetected";
    PropertyName["DeviceLeftOpenAlarm"] = "leftOpenAlarm";
    PropertyName["DeviceLeftOpenAlarmDuration"] = "leftOpenAlarmDuration";
    PropertyName["DeviceDualUnlock"] = "dualUnlock";
    PropertyName["DevicePowerSave"] = "powerSave";
    PropertyName["DeviceInteriorBrightness"] = "interiorBrightness";
    PropertyName["DeviceInteriorBrightnessDuration"] = "interiorBrightnessDuration";
    PropertyName["DeviceTamperAlarm"] = "tamperAlarm";
    PropertyName["DeviceRemoteUnlock"] = "remoteUnlock";
    PropertyName["DeviceRemoteUnlockMasterPIN"] = "remoteUnlockMasterPIN";
    PropertyName["DeviceAlarmVolume"] = "alarmVolume";
    PropertyName["DevicePromptVolume"] = "promptVolume";
    PropertyName["DeviceNotificationUnlockByKey"] = "notificationUnlockByKey";
    PropertyName["DeviceNotificationUnlockByPIN"] = "notificationUnlockByPIN";
    PropertyName["DeviceNotificationUnlockByFingerprint"] = "notificationUnlockByFingerprint";
    PropertyName["DeviceNotificationUnlockByApp"] = "notificationUnlockByApp";
    PropertyName["DeviceNotificationDualUnlock"] = "notificationDualUnlock";
    PropertyName["DeviceNotificationDualLock"] = "notificationDualLock";
    PropertyName["DeviceNotificationWrongTryProtect"] = "notificationWrongTryProtect";
    PropertyName["DeviceNotificationJammed"] = "notificationJammed";
    PropertyName["DeviceJammedAlert"] = "jammedAlert";
    PropertyName["Device911Alert"] = "911Alert";
    PropertyName["Device911AlertEvent"] = "911AlertEvent";
    PropertyName["DeviceShakeAlert"] = "shakeAlert";
    PropertyName["DeviceShakeAlertEvent"] = "shakeAlertEvent";
    PropertyName["DeviceLowBatteryAlert"] = "lowBatteryAlert";
    PropertyName["DeviceLongTimeNotCloseAlert"] = "longTimeNotCloseAlert";
    PropertyName["DeviceWrongTryProtectAlert"] = "wrongTryProtectAlert";
    PropertyName["DeviceVideoTypeStoreToNAS"] = "videoTypeStoreToNAS";
    PropertyName["DeviceSnooze"] = "snooze";
    PropertyName["DeviceSnoozeTime"] = "snoozeTime";
    PropertyName["DeviceSnoozeStartTime"] = "snoozeStartTime";
    PropertyName["DeviceSnoozeHomebase"] = "snoozeHomebase";
    PropertyName["DeviceSnoozeMotion"] = "snoozeMotion";
    PropertyName["DeviceSnoozeChime"] = "snoozeStartChime";
    PropertyName["DeviceIdentityPersonDetected"] = "identityPersonDetected";
    PropertyName["DeviceStrangerPersonDetected"] = "strangerPersonDetected";
    PropertyName["DeviceVehicleDetected"] = "vehicleDetected";
    PropertyName["DeviceDogDetected"] = "dogDetected";
    PropertyName["DeviceDogLickDetected"] = "dogLickDetected";
    PropertyName["DeviceDogPoopDetected"] = "dogPoopDetected";
    PropertyName["DeviceDetectionStatisticsWorkingDays"] = "detectionStatisticsWorkingDays";
    PropertyName["DeviceDetectionStatisticsDetectedEvents"] = "detectionStatisticsDetectedEvents";
    PropertyName["DeviceDetectionStatisticsRecordedEvents"] = "detectionStatisticsRecordedEvents";
    PropertyName["DeviceCellularRSSI"] = "cellularRSSI";
    PropertyName["DeviceCellularSignalLevel"] = "cellularSignalLevel";
    PropertyName["DeviceCellularSignal"] = "cellularSignal";
    PropertyName["DeviceCellularBand"] = "cellularBand";
    PropertyName["DeviceCellularIMEI"] = "cellularIMEI";
    PropertyName["DeviceCellularICCID"] = "cellularICCID";
    PropertyName["DeviceDoorControlWarning"] = "doorControlWarning";
    PropertyName["DeviceDoor1Open"] = "door1Open";
    PropertyName["DeviceDoor2Open"] = "door2Open";
    PropertyName["DeviceDoorSensor1Status"] = "doorSensor1Status";
    PropertyName["DeviceDoorSensor2Status"] = "doorSensor2Status";
    PropertyName["DeviceDoorSensor1MacAddress"] = "doorSensor1MacAddress";
    PropertyName["DeviceDoorSensor2MacAddress"] = "doorSensor2MacAddress";
    PropertyName["DeviceDoorSensor1Name"] = "doorSensor1Name";
    PropertyName["DeviceDoorSensor2Name"] = "doorSensor2Name";
    PropertyName["DeviceDoorSensor1SerialNumber"] = "doorSensor1SerialNumber";
    PropertyName["DeviceDoorSensor2SerialNumber"] = "doorSensor2SerialNumber";
    PropertyName["DeviceDoorSensor1Version"] = "doorSensor1Version";
    PropertyName["DeviceDoorSensor2Version"] = "doorSensor2Version";
    PropertyName["DeviceDoorSensor1LowBattery"] = "doorSensor1LowBattery";
    PropertyName["DeviceDoorSensor2LowBattery"] = "doorSensor2LowBattery";
    PropertyName["DeviceDoorSensor1BatteryLevel"] = "doorSensor1BatteryLevel";
    PropertyName["DeviceDoorSensor2BatteryLevel"] = "doorSensor2BatteryLevel";
    PropertyName["DeviceLocationCoordinates"] = "locationCoordinates";
    PropertyName["DeviceLocationAddress"] = "locationAddress";
    PropertyName["DeviceLocationLastUpdate"] = "locationLastUpdate";
    PropertyName["DeviceTrackerType"] = "trackerType";
    PropertyName["DeviceLeftBehindAlarm"] = "leftBehindAlarm";
    PropertyName["DeviceFindPhone"] = "findPhone";
    PropertyName["DeviceFlickerAdjustment"] = "flickerAdjustment";
    PropertyName["DeviceLeavingDetection"] = "leavingDetection";
    PropertyName["DeviceLeavingReactionNotification"] = "leavingReactionNotification";
    PropertyName["DeviceLeavingReactionStartTime"] = "leavingReactionStartTime";
    PropertyName["DeviceLeavingReactionEndTime"] = "leavingReactionEndTime";
    PropertyName["DeviceSomeoneGoing"] = "someoneGoing";
    PropertyName["DeviceLockEventOrigin"] = "lockEventOrigin";
    PropertyName["DeviceBeepVolume"] = "beepVolume";
    PropertyName["DeviceNightvisionOptimization"] = "nightvisionOptimization";
    PropertyName["DeviceNightvisionOptimizationSide"] = "nightvisionOptimizationSide";
    PropertyName["DeviceOpenMethod"] = "openMethod";
    PropertyName["DeviceMotionActivatedPrompt"] = "motionActivatedPrompt";
    PropertyName["DeviceOpen"] = "open";
    PropertyName["DeviceOpenedByType"] = "openedByType";
    PropertyName["DeviceOpenedByName"] = "openedByName";
    PropertyName["DeviceTamperingAlert"] = "tamperingAlert";
    PropertyName["DeviceLowTemperatureAlert"] = "lowTemperatureAlert";
    PropertyName["DeviceHighTemperatureAlert"] = "highTemperatureAlert";
    PropertyName["DeviceLidStuckAlert"] = "lidStuckAlert";
    PropertyName["DevicePinIncorrectAlert"] = "pinIncorrectAlert";
    PropertyName["DeviceBatteryFullyChargedAlert"] = "batteryFullyChargedAlert";
    PropertyName["DeviceIsDeliveryDenied"] = "isDeliveryDenied";
    PropertyName["DeviceHasMasterPin"] = "hasMasterPin";
    PropertyName["DeviceDeliveries"] = "deliveries";
    PropertyName["DeviceHiddenMotionDetectionSensitivity"] = "hidden-motionDetectionSensitivity";
    PropertyName["DeviceHiddenMotionDetectionMode"] = "hidden-motionDetectionMode";
    PropertyName["StationLANIpAddress"] = "lanIpAddress";
    PropertyName["StationMacAddress"] = "macAddress";
    PropertyName["StationGuardMode"] = "guardMode";
    PropertyName["StationCurrentMode"] = "currentMode";
    PropertyName["StationTimeFormat"] = "timeFormat";
    PropertyName["StationTimeZone"] = "timeZone";
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    PropertyName["StationAlarmVolume"] = "alarmVolume";
    PropertyName["StationAlarmTone"] = "alarmTone";
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    PropertyName["StationPromptVolume"] = "promptVolume";
    PropertyName["StationNotificationSwitchModeSchedule"] = "notificationSwitchModeSchedule";
    PropertyName["StationNotificationSwitchModeGeofence"] = "notificationSwitchModeGeofence";
    PropertyName["StationNotificationSwitchModeApp"] = "notificationSwitchModeApp";
    PropertyName["StationNotificationSwitchModeKeypad"] = "notificationSwitchModeKeypad";
    PropertyName["StationNotificationStartAlarmDelay"] = "notificationStartAlarmDelay";
    PropertyName["StationSwitchModeWithAccessCode"] = "switchModeWithAccessCode";
    PropertyName["StationAutoEndAlarm"] = "autoEndAlarm";
    PropertyName["StationTurnOffAlarmWithButton"] = "turnOffAlarmWithButton";
    PropertyName["StationHomeSecuritySettings"] = "hidden-stationHomeSecuritySettings";
    PropertyName["StationAwaySecuritySettings"] = "hidden-stationAwaySecuritySettings";
    PropertyName["StationCustom1SecuritySettings"] = "hidden-stationCustom1SecuritySettings";
    PropertyName["StationCustom2SecuritySettings"] = "hidden-stationCustom2SecuritySettings";
    PropertyName["StationCustom3SecuritySettings"] = "hidden-stationCustom3SecuritySettings";
    PropertyName["StationOffSecuritySettings"] = "hidden-stationOffSecuritySettings";
    PropertyName["StationAlarm"] = "alarm";
    PropertyName["StationAlarmType"] = "alarmType";
    PropertyName["StationAlarmArmed"] = "alarmArmed";
    PropertyName["StationAlarmArmDelay"] = "alarmArmDelay";
    PropertyName["StationAlarmDelay"] = "alarmDelay";
    PropertyName["StationAlarmDelayType"] = "alarmDelayType";
    PropertyName["StationSdStatus"] = "sdStatus";
    PropertyName["StationSdCapacity"] = "sdCapacity";
    PropertyName["StationSdCapacityAvailable"] = "sdCapacityAvailable";
    PropertyName["StationStorageInfoEmmc"] = "storageInfoEmmc";
    PropertyName["StationStorageInfoHdd"] = "storageInfoHdd";
    PropertyName["StationCrossCameraTracking"] = "crossCameraTracking";
    PropertyName["StationContinuousTrackingTime"] = "continuousTrackingTime";
    PropertyName["StationTrackingAssistance"] = "trackingAssistance";
    PropertyName["StationCrossTrackingCameraList"] = "crossTrackingCameraList";
    PropertyName["StationCrossTrackingGroupList"] = "crossTrackingGroupList";
})(PropertyName || (exports.PropertyName = PropertyName = {}));
exports.DeviceNameProperty = {
    key: "device_name",
    name: PropertyName.Name,
    label: "Name",
    readable: true,
    writeable: false,
    type: "string",
};
exports.DeviceModelProperty = {
    key: "device_model",
    name: PropertyName.Model,
    label: "Model",
    readable: true,
    writeable: false,
    type: "string",
};
exports.DeviceSerialNumberProperty = {
    key: "device_sn",
    name: PropertyName.SerialNumber,
    label: "Serial number",
    readable: true,
    writeable: false,
    type: "string",
};
exports.GenericHWVersionProperty = {
    key: "main_hw_version",
    name: PropertyName.HardwareVersion,
    label: "Hardware version",
    readable: true,
    writeable: false,
    type: "string",
};
exports.GenericSWVersionProperty = {
    key: "main_sw_version",
    name: PropertyName.SoftwareVersion,
    label: "Software version",
    readable: true,
    writeable: false,
    type: "string",
};
exports.GenericTypeProperty = {
    key: "device_type",
    name: PropertyName.Type,
    label: "Type",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Station",
        1: "Camera",
        2: "Sensor (T8900)",
        3: "Floodlight",
        4: "Camera E",
        5: "Doorbell",
        7: "Battery Doorbell",
        8: "Camera 2",
        9: "eufyCam S210 (eufyCam 2C)",
        10: "Motion Sensor (T8910)",
        11: "Keypad",
        14: "eufyCam S221 (eufyCam 2 Pro)",
        15: "eufyCam S220 (eufyCam 2C Pro)",
        16: "Battery Doorbell 2",
        18: "HomeBase S380 (HomeBase 3; T8030)",
        19: "eufyCam S330 (eufyCam 3)",
        23: "eufyCam S300 (eufyCam 3C)",
        24: "eufyCam E330 (Professional)",
        25: "MiniBase Chime",
        26: "eufyCam S3 Pro",
        30: "Indoor Camera",
        31: "Indoor Camera PT",
        32: "Solo Camera",
        33: "Solo Camera Pro",
        34: "Indoor Camera 1080",
        35: "Indoor Camera PT 1080",
        37: "Floodlight 8422",
        38: "Floodlight 8423",
        39: "Floodlight 2",
        44: "Outdoor Camera 1080P No Light",
        45: "Outdoor Camera 2k",
        46: "Outdoor Camera 1080P",
        47: "Floodlight Camera E340",
        48: "Solo Camera S340",
        50: "Lock Basic",
        51: "Lock Advanced",
        52: "Lock Basic No Finger",
        53: "Lock Basic Advanced No Finger",
        54: "Retrofit Smart Lock E110 (T8503)",
        55: "Video Smart Lock S330 (T8530)",
        56: "Lock 85A3",
        57: "Lock 8592",
        58: "Retrofit Smart Lock E130 (T8504)",
        60: "Solo Camera Spotlight 1080p",
        61: "Solo Camera Spotlight 2k",
        62: "Solo Camera Spotlight Solar",
        63: "Solo Camera S230",
        64: "Solo Camera C210",
        87: "Floodlight Camera E30",
        88: "Solo Camera E30",
        90: "Smart Drop S300 (T8790)",
        91: "Video Doorbell Dual",
        93: "Video Doorbell Dual (Wired)",
        94: "Video Doorbell Dual (E340)",
        95: "Video Doorbell (C30)",
        100: "Indoor Cost Down Camera",
        101: "Camera Gun",
        102: "Camera Snail",
        104: "Indoor Camera S350",
        110: "Starlight 4G LTE", //T8150
        131: "Camera Garage T8453 Common",
        132: "Garage-Control Cam E110 (T8452)",
        133: "Garage-Control Cam E120 (T8453)",
        140: "Smart Safe S10 (T7400)",
        141: "Smart Safe S12 (T7401)",
        142: "Smart Safe (T7402)",
        143: "Smart Safe (T7403)",
        151: "Wired Wall Light Cam S100 (T84A1)",
        157: "SmartTrack Link (T87B0)",
        159: "SmartTrack Card (T87B2)",
        180: "Smart Lock C210 (T8502)",
        184: "Smart Lock C220 (T8506)",
        10005: "Solar Wall Light Cam S120 (T81A0)",
    },
};
exports.BaseDeviceProperties = {
    [exports.DeviceNameProperty.name]: exports.DeviceNameProperty,
    [exports.DeviceModelProperty.name]: exports.DeviceModelProperty,
    [exports.DeviceSerialNumberProperty.name]: exports.DeviceSerialNumberProperty,
    [exports.GenericTypeProperty.name]: exports.GenericTypeProperty,
    [exports.GenericHWVersionProperty.name]: exports.GenericHWVersionProperty,
    [exports.GenericSWVersionProperty.name]: exports.GenericSWVersionProperty,
};
exports.GenericDeviceProperties = {
    ...exports.BaseDeviceProperties,
    [PropertyName.DeviceStationSN]: {
        key: "station_sn",
        name: PropertyName.DeviceStationSN,
        label: "Station serial number",
        readable: true,
        writeable: false,
        type: "string",
    },
};
exports.DeviceBatteryProperty = {
    key: types_1.CommandType.CMD_GET_BATTERY,
    name: PropertyName.DeviceBattery,
    label: "Battery percentage",
    readable: true,
    writeable: false,
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
};
exports.DeviceBatteryLockProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_QUERY_BATTERY_LEVEL,
    name: PropertyName.DeviceBattery,
    label: "Battery percentage",
    readable: true,
    writeable: false,
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
};
exports.DeviceBatteryTrackerProperty = {
    ...exports.DeviceBatteryProperty,
    key: types_1.TrackerCommandType.COMMAND_BATTERY,
};
exports.DeviceBatteryLowMotionSensorProperty = {
    key: types_1.CommandType.CMD_MOTION_SENSOR_BAT_STATE,
    name: PropertyName.DeviceBatteryLow,
    label: "Battery low",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceBatteryLowKeypadProperty = {
    ...exports.DeviceBatteryLowMotionSensorProperty,
    key: types_1.CommandType.CMD_KEYPAD_BATTERY_CAP_STATE,
};
exports.DeviceBatteryLowSensorProperty = {
    ...exports.DeviceBatteryLowMotionSensorProperty,
    key: types_1.CommandType.CMD_ENTRY_SENSOR_BAT_STATE,
};
exports.DeviceBatteryTempProperty = {
    key: types_1.CommandType.CMD_GET_BATTERY_TEMP,
    name: PropertyName.DeviceBatteryTemp,
    label: "Battery Temperature",
    readable: true,
    writeable: false,
    type: "number",
    unit: "°C",
};
exports.DeviceBatteryIsChargingKeypadProperty = {
    key: types_1.CommandType.CMD_KEYPAD_BATTERY_CHARGER_STATE,
    name: PropertyName.DeviceBatteryIsCharging,
    label: "Battery is charging",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceAntitheftDetectionProperty = {
    key: types_1.CommandType.CMD_EAS_SWITCH,
    name: PropertyName.DeviceAntitheftDetection,
    label: "Antitheft Detection",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceAutoNightvisionProperty = {
    key: types_1.CommandType.CMD_IRCUT_SWITCH,
    name: PropertyName.DeviceAutoNightvision,
    label: "Auto Nightvision",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceAutoNightvisionWiredDoorbellProperty = {
    ...exports.DeviceAutoNightvisionProperty,
    key: ParamType.NIGHT_VISUAL,
};
exports.DeviceAutoNightvisionSoloProperty = {
    ...exports.DeviceAutoNightvisionProperty,
    key: types_1.CommandType.CMD_SET_NIGHT_VISION_TYPE,
    commandId: types_1.CommandType.CMD_SET_NIGHT_VISION_TYPE,
};
exports.DeviceNightvisionProperty = {
    key: types_1.CommandType.CMD_SET_NIGHT_VISION_TYPE,
    name: PropertyName.DeviceNightvision,
    label: "Nightvision",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "B&W Night Vision",
        2: "Color Night Vision",
    },
};
exports.DeviceNightvisionS350Property = {
    ...exports.DeviceNightvisionProperty,
    states: {
        0: "Off",
        1: "Auto",
        3: "On",
    },
};
exports.DeviceWifiRSSIProperty = {
    key: types_1.CommandType.CMD_GET_WIFI_RSSI,
    name: PropertyName.DeviceWifiRSSI,
    label: "Wifi RSSI",
    readable: true,
    writeable: false,
    type: "number",
    unit: "dBm",
};
exports.DeviceWifiSignalLevelProperty = {
    key: "custom_wifiSignalLevel",
    name: PropertyName.DeviceWifiSignalLevel,
    label: "Wifi Signal Level",
    readable: true,
    writeable: false,
    type: "number",
    min: 0,
    max: 4,
    states: {
        0: "No signal",
        1: "Weak",
        2: "Normal",
        3: "Strong",
        4: "Full",
    },
};
exports.DeviceCellularRSSIProperty = {
    key: types_1.CommandType.CELLULAR_SIGNAL_STRENGTH,
    name: PropertyName.DeviceCellularRSSI,
    label: "Cellular RSSI",
    readable: true,
    writeable: false,
    type: "number",
    unit: "dBm",
};
exports.DeviceCellularSignalLevelProperty = {
    key: "custom_cellularSignalLevel",
    name: PropertyName.DeviceCellularSignalLevel,
    label: "Cellular Signal Level",
    readable: true,
    writeable: false,
    type: "number",
    min: 1,
    max: 4,
    states: {
        1: "Weak",
        2: "Normal",
        3: "Strong",
        4: "Full",
    },
};
exports.DeviceCellularSignalProperty = {
    key: types_1.CommandType.CELLULAR_INFO,
    name: PropertyName.DeviceCellularSignal,
    label: "Cellular Signal",
    readable: true,
    writeable: false,
    type: "string",
};
exports.DeviceCellularBandProperty = {
    key: types_1.CommandType.CELLULAR_INFO,
    name: PropertyName.DeviceCellularBand,
    label: "Cellular Band",
    readable: true,
    writeable: false,
    type: "string",
};
exports.DeviceCellularIMEIProperty = {
    key: types_1.CommandType.CELLULAR_INFO,
    name: PropertyName.DeviceCellularIMEI,
    label: "Cellular IMEI",
    readable: true,
    writeable: false,
    type: "string",
};
exports.DeviceCellularICCIDProperty = {
    key: types_1.CommandType.CELLULAR_INFO,
    name: PropertyName.DeviceCellularICCID,
    label: "Cellular ICCID",
    readable: true,
    writeable: false,
    type: "string",
};
exports.DeviceWifiRSSILockProperty = {
    ...exports.DeviceWifiRSSIProperty,
    key: types_1.CommandType.CMD_GET_SUB1G_RSSI,
};
exports.DeviceWifiRSSIEntrySensorProperty = {
    ...exports.DeviceWifiRSSIProperty,
    key: types_1.CommandType.CMD_GET_SUB1G_RSSI,
};
exports.DeviceWifiRSSIKeypadProperty = {
    ...exports.DeviceWifiRSSIProperty,
    key: types_1.CommandType.CMD_GET_SUB1G_RSSI,
};
exports.DeviceWifiRSSISmartSafeProperty = {
    ...exports.DeviceWifiRSSIProperty,
    key: types_1.CommandType.CMD_SMARTSAFE_RSSI,
};
exports.DeviceEnabledProperty = {
    key: ParamType.PRIVATE_MODE,
    name: PropertyName.DeviceEnabled,
    label: "Camera enabled",
    readable: true,
    writeable: true,
    type: "boolean",
    commandId: types_1.CommandType.CMD_DEVS_SWITCH,
    default: true
};
exports.DeviceEnabledStandaloneProperty = {
    ...exports.DeviceEnabledProperty,
    key: ParamType.OPEN_DEVICE,
    commandId: types_1.CommandType.CMD_DEVS_SWITCH,
};
exports.DeviceEnabledSoloProperty = {
    ...exports.DeviceEnabledProperty,
    key: types_1.CommandType.CMD_DEVS_SWITCH,
};
exports.DeviceEnabledIndoorMiniProperty = {
    ...exports.DeviceEnabledSoloProperty,
    key: types_1.CommandType.CMD_DEVS_SWITCH,
    commandId: types_1.CommandType.CMD_INDOOR_ENABLE_PRIVACY_MODE,
};
exports.DeviceEnabledIndoorS350Property = {
    ...exports.DeviceEnabledSoloProperty,
    key: types_1.CommandType.CMD_DEVS_SWITCH,
    commandId: types_1.CommandType.CMD_INDOOR_ENABLE_PRIVACY_MODE_S350,
};
exports.DeviceStatusLedProperty = {
    key: types_1.CommandType.CMD_DEV_LED_SWITCH,
    name: PropertyName.DeviceStatusLed,
    label: "Status LED",
    readable: true,
    writeable: true,
    type: "boolean",
    commandId: types_1.CommandType.CMD_INDOOR_LED_SWITCH,
};
exports.DeviceStatusLedIndoorFloodProperty = {
    ...exports.DeviceStatusLedProperty,
    key: types_1.CommandType.CMD_INDOOR_LED_SWITCH,
};
exports.DeviceStatusLedBatteryDoorbellProperty = {
    ...exports.DeviceStatusLedProperty,
    key: types_1.CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE,
};
exports.DeviceStatusLedIndoorS350Property = {
    ...exports.DeviceStatusLedBatteryDoorbellProperty,
    key: types_1.CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE,
    commandId: types_1.CommandType.CMD_DEV_LED_SWITCH,
};
exports.DeviceStatusLedBatteryDoorbellDualProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE,
    name: PropertyName.DeviceStatusLed,
    label: "Status LED",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "All day",
        2: "At night",
    },
};
exports.DeviceStatusLedDoorbellProperty = {
    ...exports.DeviceStatusLedProperty,
    key: ParamType.DOORBELL_LED_NIGHT_MODE,
    commandId: ParamType.COMMAND_LED_NIGHT_OPEN,
};
exports.DeviceStatusLedT8200XProperty = {
    ...exports.DeviceStatusLedProperty,
    key: ParamType.COMMAND_LED_NIGHT_OPEN,
    commandId: ParamType.COMMAND_LED_NIGHT_OPEN,
};
exports.DeviceMotionDetectionProperty = {
    key: types_1.CommandType.CMD_PIR_SWITCH,
    name: PropertyName.DeviceMotionDetection,
    label: "Motion Detection",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceMotionDetectionIndoorSoloFloodProperty = {
    ...exports.DeviceMotionDetectionProperty,
    key: types_1.CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_ENABLE,
};
exports.DeviceMotionDetectionDoorbellProperty = {
    ...exports.DeviceMotionDetectionProperty,
    key: ParamType.DETECT_SWITCH,
    commandId: ParamType.COMMAND_MOTION_DETECTION_PACKAGE,
};
exports.DeviceSoundDetectionProperty = {
    key: types_1.CommandType.CMD_INDOOR_DET_SET_SOUND_DETECT_ENABLE,
    name: PropertyName.DeviceSoundDetection,
    label: "Sound Detection",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DevicePetDetectionProperty = {
    key: types_1.CommandType.CMD_INDOOR_DET_SET_PET_ENABLE,
    name: PropertyName.DevicePetDetection,
    label: "Pet Detection",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceRTSPStreamProperty = {
    key: types_1.CommandType.CMD_NAS_SWITCH,
    name: PropertyName.DeviceRTSPStream,
    label: "RTSP Stream",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceRTSPStreamUrlProperty = {
    key: "custom_rtspStreamUrl",
    name: PropertyName.DeviceRTSPStreamUrl,
    label: "RTSP Stream URL",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceWatermarkProperty = {
    key: types_1.CommandType.CMD_SET_DEVS_OSD,
    name: PropertyName.DeviceWatermark,
    label: "Watermark",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "Timestamp",
        2: "Timestamp and Logo",
    },
};
exports.DeviceWatermarkIndoorFloodProperty = {
    ...exports.DeviceWatermarkProperty,
    states: {
        0: "Timestamp",
        1: "Timestamp and Logo",
        2: "Off",
    },
};
exports.DeviceWatermarkSoloWiredDoorbellProperty = {
    ...exports.DeviceWatermarkProperty,
    states: {
        0: "Off",
        1: "On",
    },
};
exports.DeviceWatermarkBatteryDoorbellCamera1Property = {
    ...exports.DeviceWatermarkProperty,
    states: {
        1: "Off",
        2: "On",
    },
};
exports.DeviceWatermarkGarageCameraProperty = {
    ...exports.DeviceWatermarkProperty,
    states: {
        1: "Logo",
        2: "Off",
    },
};
exports.DeviceStateProperty = {
    key: types_1.CommandType.CMD_GET_DEV_STATUS,
    name: PropertyName.DeviceState,
    label: "State",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Offline",
        1: "Online",
        2: "Manually disabled",
        3: "Offline low battery",
        4: "Remove and readd",
        5: "Reset and readd",
    }
};
exports.DeviceStateLockProperty = {
    ...exports.DeviceStateProperty,
    key: types_1.CommandType.CMD_GET_DEV_STATUS,
};
exports.DeviceLastChargingDaysProperty = {
    key: "charging_days",
    name: PropertyName.DeviceLastChargingDays,
    label: "Days since last charging",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.DeviceLastChargingTotalEventsProperty = {
    key: "charing_total",
    name: PropertyName.DeviceLastChargingTotalEvents,
    label: "Total Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.DeviceLastChargingRecordedEventsProperty = {
    key: "charging_reserve",
    name: PropertyName.DeviceLastChargingRecordedEvents,
    label: "Total Recorded Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.DeviceLastChargingFalseEventsProperty = {
    key: "charging_missing",
    name: PropertyName.DeviceLastChargingFalseEvents,
    label: "False Events since last charging",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.DeviceBatteryUsageLastWeekProperty = {
    key: "battery_usage_last_week",
    name: PropertyName.DeviceBatteryUsageLastWeek,
    label: "Battery usage last week",
    readable: true,
    writeable: false,
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
    default: 0,
};
exports.DeviceLockedProperty = {
    key: "custom_locked",
    name: PropertyName.DeviceLocked,
    label: "locked",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceLockedSmartSafeProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_LOCK_STATUS,
    name: PropertyName.DeviceLocked,
    label: "locked",
    readable: true,
    writeable: false,
    type: "boolean",
};
exports.DeviceMotionDetectedProperty = {
    key: "custom_motionDetected",
    name: PropertyName.DeviceMotionDetected,
    label: "Motion detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DevicePersonDetectedProperty = {
    key: "custom_personDetected",
    name: PropertyName.DevicePersonDetected,
    label: "Person detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DevicePetDetectedProperty = {
    key: "custom_petDetected",
    name: PropertyName.DevicePetDetected,
    label: "Pet detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceSoundDetectedProperty = {
    key: "custom_soundDetected",
    name: PropertyName.DeviceSoundDetected,
    label: "Sound detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceCryingDetectedProperty = {
    key: "custom_cryingDetected",
    name: PropertyName.DeviceCryingDetected,
    label: "Crying detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceRingingProperty = {
    key: "custom_ringing",
    name: PropertyName.DeviceRinging,
    label: "Ringing",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceSensorOpenProperty = {
    key: types_1.CommandType.CMD_ENTRY_SENSOR_STATUS,
    name: PropertyName.DeviceSensorOpen,
    label: "Sensor open",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceSensorChangeTimeProperty = {
    key: types_1.CommandType.CMD_ENTRY_SENSOR_CHANGE_TIME,
    name: PropertyName.DeviceSensorChangeTime,
    label: "Sensor change time",
    readable: true,
    writeable: false,
    type: "number",
};
exports.DeviceMotionSensorPIREventProperty = {
    key: types_1.CommandType.CMD_MOTION_SENSOR_PIR_EVT,
    name: PropertyName.DeviceMotionSensorPIREvent,
    label: "Motion sensor PIR event",
    readable: true,
    writeable: false,
    type: "number",
    //TODO: Define states
};
exports.DeviceBasicLockStatusProperty = {
    key: types_1.CommandType.CMD_DOORLOCK_GET_STATE,
    name: PropertyName.DeviceLockStatus,
    label: "Lock status",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        1: "1", //TODO: Finish naming of states
        2: "2",
        3: "Unlocked",
        4: "Locked",
        5: "Mechanical anomaly",
        6: "6",
        7: "7",
    }
};
exports.DeviceAdvancedLockStatusProperty = {
    ...exports.DeviceBasicLockStatusProperty,
    key: types_1.CommandType.CMD_SMARTLOCK_QUERY_STATUS,
};
exports.DevicePictureUrlProperty = {
    key: "cover_path",
    name: PropertyName.DevicePictureUrl,
    label: "Last Camera Picture URL",
    readable: true,
    writeable: false,
    type: "string",
};
exports.DeviceMotionHB3DetectionTypeHumanProperty = {
    key: types_1.CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypeHuman,
    label: "Motion Detection Type Human",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceMotionDetectionTypeHumanWallLightProperty = {
    ...exports.DeviceMotionHB3DetectionTypeHumanProperty,
    key: types_1.CommandType.CMD_WALL_LIGHT_MOTION_DETECTION_TYPE_HUMAN,
};
exports.DeviceMotionHB3DetectionTypeHumanRecognitionProperty = {
    key: types_1.CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypeHumanRecognition,
    label: "Motion Detection Type Human Recognition",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceMotionHB3DetectionTypePetProperty = {
    key: types_1.CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypePet,
    label: "Motion Detection Type Pet",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceMotionHB3DetectionTypeVehicleProperty = {
    key: types_1.CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypeVehicle,
    label: "Motion Detection Type Vehicle",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty = {
    key: types_1.CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypeAllOtherMotions,
    label: "Motion Detection Type All Other Motions",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceMotionDetectionTypeAllOtherMotionsWalllightProperty = {
    ...exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty,
    key: types_1.CommandType.CMD_WALL_LIGHT_MOTION_DETECTION_TYPE_ALL,
};
exports.DeviceMotionDetectionTypeProperty = {
    key: types_1.CommandType.CMD_DEV_PUSHMSG_MODE,
    name: PropertyName.DeviceMotionDetectionType,
    label: "Motion Detection Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Humans only",
        2: "All motions",
    },
};
exports.DeviceMotionDetectionTypeT8200XProperty = {
    ...exports.DeviceMotionDetectionTypeProperty,
    key: types_1.CommandType.CMD_SET_DETECT_TYPE,
};
exports.DeviceMotionDetectionCamera1Property = {
    ...exports.DeviceMotionDetectionTypeProperty,
    states: {
        0: "Person Alerts",
        1: "Facial Alerts",
        2: "All Alerts",
    },
};
exports.DeviceMotionDetectionTypeFloodlightT8423Property = {
    ...exports.DeviceMotionDetectionTypeProperty,
    states: {
        2: "All motions",
        6: "Humans only",
    },
};
exports.DeviceMotionDetectionTypeFloodlightProperty = {
    ...exports.DeviceMotionDetectionTypeProperty,
    key: types_1.CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_TYPE,
    states: {
        1: "Humans only",
        5: "All motions",
    },
};
exports.DeviceMotionDetectionTypeIndoorProperty = {
    ...exports.DeviceMotionDetectionTypeProperty,
    key: types_1.CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_TYPE,
    states: {
        1: "Person",
        2: "Pet",
        3: "Person and Pet",
        4: "All other motions",
        5: "Person and all other motions",
        6: "Pet and all other motions",
        7: "Person, Pet and all other motions",
    },
};
exports.DeviceMotionDetectionTypeIndoorS350Property = {
    ...exports.DeviceMotionDetectionTypeProperty,
    key: types_1.CommandType.CMD_INDOOR_DET_SET_MOTION_DETECT_TYPE,
    states: {
        3: "Person",
        4: "All other motions",
        5: "Person and all other motions",
        6: "Pet and all other motions",
        7: "Person, Pet and all other motions",
    },
};
exports.DeviceMotionDetectionTypeIndoorMiniProperty = {
    ...exports.DeviceMotionDetectionTypeIndoorProperty,
    states: {
        1: "Person",
        4: "All other motions",
        5: "Person and all other motions",
    },
};
exports.DeviceMotionDetectionSensitivityCamera2Property = {
    key: types_1.CommandType.CMD_SET_PIRSENSITIVITY,
    name: PropertyName.DeviceMotionDetectionSensitivity,
    label: "Motion Detection Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 7,
};
exports.DeviceMotionDetectionSensitivityCamera1Property = {
    ...exports.DeviceMotionDetectionSensitivityCamera2Property,
    min: 1,
    max: 100,
    steps: 1,
};
exports.DeviceMotionDetectionSensitivityIndoorProperty = {
    ...exports.DeviceMotionDetectionSensitivityCamera2Property,
    key: types_1.CommandType.CMD_INDOOR_DET_SET_MOTION_SENSITIVITY_IDX,
    min: 1,
    max: 5,
};
exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty = {
    ...exports.DeviceMotionDetectionSensitivityCamera2Property,
    key: types_1.CommandType.CMD_SET_MOTION_SENSITIVITY,
    min: 1,
    max: 5,
};
exports.DeviceMotionDetectionSensitivityDoorbellE340Property = {
    ...exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
    key: types_1.CommandType.CMD_SET_MOTION_SENSITIVITY,
    min: 1,
    max: 7,
};
exports.DeviceMotionDetectionSensitivityWiredDoorbellProperty = {
    ...exports.DeviceMotionDetectionSensitivityCamera2Property,
    key: "custom_motionDetectionSensitivity",
    min: 1,
    max: 5,
};
exports.DeviceMotionDetectionSensitivitySoloProperty = {
    ...exports.DeviceMotionDetectionSensitivityCamera2Property,
    key: types_1.CommandType.CMD_SET_PIR_SENSITIVITY,
};
exports.DeviceMotionDetectionSensitivityFloodlightT8420Property = {
    ...exports.DeviceMotionDetectionSensitivityCamera2Property,
    key: types_1.CommandType.CMD_SET_MDSENSITIVITY,
    min: 1,
    max: 5,
};
exports.DeviceMotionDetectionSensitivityGarageCameraProperty = {
    ...exports.DeviceMotionDetectionSensitivityCamera2Property,
    key: types_1.CommandType.CMD_SET_MOTION_SENSITIVITY,
    min: 0,
    max: 4,
};
exports.DeviceHiddenMotionDetectionSensitivityWiredDoorbellProperty = {
    key: ParamType.DETECT_MOTION_SENSITIVE,
    name: PropertyName.DeviceHiddenMotionDetectionSensitivity,
    label: "HIDDEN Motion Detection Sensitivity",
    readable: true,
    writeable: false,
    type: "number",
    min: 1,
    max: 3,
};
exports.DeviceHiddenMotionDetectionModeWiredDoorbellProperty = {
    key: ParamType.DETECT_MODE,
    name: PropertyName.DeviceHiddenMotionDetectionMode,
    label: "HIDDEN Motion Detection Mode",
    readable: true,
    writeable: false,
    type: "number",
    min: 1,
    max: 3,
};
exports.DeviceMotionZoneProperty = {
    key: types_1.CommandType.CMD_INDOOR_DET_SET_ACTIVE_ZONE,
    name: PropertyName.DeviceMotionZone,
    label: "Motion Detection Zone",
    readable: true,
    writeable: true,
    type: "object",
    default: {
        polygens: []
    },
    isValidObject: (obj) => {
        if (typeof obj === "object" && "polygens" in obj) {
            if (Array.isArray(obj.polygens)) {
                return (obj.polygens.length > 0 &&
                    obj.polygens.every((value) => {
                        return typeof value === "object" &&
                            "points" in value &&
                            Array.isArray(value.points) &&
                            value.points.length > 0 &&
                            value.points.every((point) => {
                                return typeof point === "object" &&
                                    "x" in point &&
                                    "y" in point &&
                                    typeof point.x === "number" &&
                                    typeof point.y === "number";
                            });
                    })) || obj.polygens.length === 0;
            }
        }
        return false;
    }
};
exports.DeviceFloodlightLightProperty = {
    key: types_1.CommandType.CMD_SET_FLOODLIGHT_MANUAL_SWITCH,
    name: PropertyName.DeviceLight,
    label: "Light",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceFloodlightLightSettingsEnableProperty = {
    key: types_1.CommandType.CMD_SET_FLOODLIGHT_TOTAL_SWITCH,
    name: PropertyName.DeviceLightSettingsEnable,
    label: "Light Enable",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceFloodlightLightSettingsBrightnessManualProperty = {
    key: types_1.CommandType.CMD_SET_FLOODLIGHT_BRIGHT_VALUE,
    name: PropertyName.DeviceLightSettingsBrightnessManual,
    label: "Light Brightness Manual",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
};
exports.DeviceLightSettingsBrightnessManualCamera3Property = {
    ...exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
    states: {
        40: "Low",
        70: "Medium",
        100: "High",
    },
};
exports.DeviceCameraLightSettingsBrightnessManualProperty = {
    ...exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
    min: 40,
    default: 100,
};
exports.DeviceCameraLightSettingsBrightnessManualWalllightS120Property = {
    ...exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
    min: 10,
    default: 100,
};
exports.DeviceFloodlightLightSettingsBrightnessMotionProperty = {
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR,
    name: PropertyName.DeviceLightSettingsBrightnessMotion,
    label: "Light Brightness Motion",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
};
exports.DeviceFloodlightLightSettingsBrightnessMotionT8425Property = {
    ...exports.DeviceFloodlightLightSettingsBrightnessMotionProperty,
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425,
};
exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty = {
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH,
    name: PropertyName.DeviceLightSettingsBrightnessSchedule,
    label: "Light Brightness Schedule",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
};
exports.DeviceFloodlightLightSettingsBrightnessScheduleT8425Property = {
    ...exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty,
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_SCH_T8425,
};
exports.DeviceFloodlightLightSettingsMotionTriggeredProperty = {
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_PIR_SWITCH,
    name: PropertyName.DeviceLightSettingsMotionTriggered,
    label: "Light Motion Triggered Enable",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceFloodlightLightSettingsMotionTriggeredT8425Property = {
    ...exports.DeviceFloodlightLightSettingsMotionTriggeredProperty,
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425
};
exports.DeviceFloodlightLightSettingsMotionTriggeredDistanceProperty = {
    key: types_1.CommandType.CMD_SET_PIRSENSITIVITY,
    name: PropertyName.DeviceLightSettingsMotionTriggeredDistance,
    label: "Light Motion Triggered Distance",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Min",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Max",
    },
};
exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty = {
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_PIR_TIME,
    name: PropertyName.DeviceLightSettingsMotionTriggeredTimer,
    label: "Light Motion Triggered Timer",
    readable: true,
    writeable: true,
    type: "number",
    unit: "sec",
    states: {
        30: "30 sec.",
        60: "1 min.",
        180: "3 min.",
        300: "5 min.",
        900: "15 min.",
    },
};
exports.DeviceFloodlightLightSettingsMotionTriggeredTimerT8425Property = {
    ...exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425,
};
exports.DeviceMicrophoneProperty = {
    key: types_1.CommandType.CMD_SET_DEV_MIC_MUTE,
    name: PropertyName.DeviceMicrophone,
    label: "Microphone",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceSpeakerProperty = {
    key: types_1.CommandType.CMD_SET_DEV_SPEAKER_MUTE,
    name: PropertyName.DeviceSpeaker,
    label: "Speaker",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceAudioRecordingProperty = {
    key: types_1.CommandType.CMD_SET_AUDIO_MUTE_RECORD,
    name: PropertyName.DeviceAudioRecording,
    label: "Audio Recording",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceAudioRecordingIndoorSoloFloodlightProperty = {
    ...exports.DeviceAudioRecordingProperty,
    key: types_1.CommandType.CMD_INDOOR_SET_RECORD_AUDIO_ENABLE,
};
exports.DeviceAudioRecordingStarlight4gLTEProperty = {
    ...exports.DeviceAudioRecordingProperty,
    commandId: types_1.CommandType.CMD_INDOOR_SET_RECORD_AUDIO_ENABLE,
};
exports.DeviceAudioRecordingWiredDoorbellProperty = {
    ...exports.DeviceAudioRecordingProperty,
    key: ParamType.DOORBELL_AUDIO_RECODE,
    commandId: ParamType.COMMAND_AUDIO_RECORDING,
};
exports.DeviceAudioRecordingFloodlightT8420Property = {
    ...exports.DeviceAudioRecordingProperty,
    key: types_1.CommandType.CMD_RECORD_AUDIO_SWITCH,
};
exports.DeviceMotionTrackingProperty = {
    key: types_1.CommandType.CMD_INDOOR_PAN_MOTION_TRACK,
    name: PropertyName.DeviceMotionTracking,
    label: "Motion Tracking",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceSpeakerVolumeProperty = {
    key: types_1.CommandType.CMD_SET_DEV_SPEAKER_VOLUME,
    name: PropertyName.DeviceSpeakerVolume,
    label: "Speaker Volume",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        90: "Low",
        92: "Medium",
        93: "High"
    },
};
exports.DeviceSpeakerVolumeSoloProperty = {
    ...exports.DeviceSpeakerVolumeProperty,
    states: {
        70: "Low",
        80: "Medium",
        100: "High"
    },
};
exports.DeviceSpeakerVolumeCamera3Property = {
    ...exports.DeviceSpeakerVolumeProperty,
    states: {
        90: "Low",
        95: "Medium",
        100: "High"
    },
};
exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty = {
    key: types_1.CommandType.CMD_SET_DEV_SPEAKER_VOLUME,
    name: PropertyName.DeviceSpeakerVolume,
    label: "Speaker Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
};
exports.DeviceSpeakerVolumeWiredDoorbellProperty = {
    ...exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
    key: ParamType.VOLUME,
    max: 169,
};
exports.DeviceSpeakerVolumeFloodlightT8420Property = {
    ...exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
    min: 1,
    max: 63,
};
exports.DeviceSpeakerVolumeWalllightProperty = {
    ...exports.DeviceSpeakerVolumeProperty,
    key: types_1.CommandType.CMD_WALL_LIGHT_SPEAKER_VOLUME,
    states: {
        1: "Low",
        2: "Medium",
        3: "High"
    },
};
exports.DeviceSpeakerVolumeSmartDropProperty = {
    ...exports.DeviceSpeakerVolumeProperty,
    states: {
        75: "Low",
        85: "Medium",
        100: "High"
    },
};
exports.DeviceRingtoneVolumeBatteryDoorbellProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_SET_RINGTONE_VOLUME,
    name: PropertyName.DeviceRingtoneVolume,
    label: "Ringtone Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 100,
};
exports.DeviceRingtoneVolumeWiredDoorbellProperty = {
    ...exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
    key: ParamType.RINGING_VOLUME,
    commandId: ParamType.COMMAND_RINGTONE_VOLUME,
};
exports.DeviceRingtoneVolumeT8200XProperty = {
    ...exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
    key: types_1.CommandType.CMD_T8200X_SET_RINGTONE_VOLUME,
};
exports.DevicePowerSourceProperty = {
    key: types_1.CommandType.CMD_SET_POWER_CHARGE,
    name: PropertyName.DevicePowerSource,
    label: "Power Source",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Battery",
        1: "Solar Panel",
    },
};
exports.DevicePowerWorkingModeProperty = {
    key: types_1.CommandType.CMD_SET_PIR_POWERMODE,
    name: PropertyName.DevicePowerWorkingMode,
    label: "Power Working Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Optimal Battery Life",
        1: "Optimal Surveillance",
        2: "Custom Recording",
    },
};
exports.DevicePowerWorkingModeSmartDropProperty = {
    key: types_1.CommandType.CMD_SET_PIR_POWERMODE,
    name: PropertyName.DevicePowerWorkingMode,
    label: "Power Working Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Optimal Battery Life",
        1: "Optimal Surveillance",
        2: "Custom Recording",
        4: "Delivery Mode",
    },
};
exports.DevicePowerWorkingModeBatteryDoorbellProperty = {
    ...exports.DevicePowerWorkingModeProperty,
    states: {
        0: "Balance Surveillance",
        1: "Optimal Surveillance",
        2: "Custom Recording",
        3: "Optimal Battery Life",
    },
};
exports.DeviceChargingStatusProperty = {
    key: types_1.CommandType.SUB1G_REP_UNPLUG_POWER_LINE,
    name: PropertyName.DeviceChargingStatus,
    label: "Charging Status",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Not Charging",
        1: "Charging",
    },
};
exports.DeviceRecordingClipLengthProperty = {
    key: types_1.CommandType.CMD_DEV_RECORD_TIMEOUT,
    name: PropertyName.DeviceRecordingClipLength,
    label: "Recording Clip Length",
    readable: true,
    writeable: true,
    type: "number",
    min: 5,
    max: 120,
    default: 60,
    unit: "sec"
};
exports.DeviceRecordingClipLengthFloodlightProperty = {
    ...exports.DeviceRecordingClipLengthProperty,
    min: 30,
    max: 120,
    default: 100,
};
exports.DeviceRecordingClipLengthWalllightProperty = {
    ...exports.DeviceRecordingClipLengthProperty,
    min: 30,
    max: 120,
    default: 60,
};
exports.DeviceRecordingClipLengthWalllightS120Property = {
    ...exports.DeviceRecordingClipLengthProperty,
    min: 10,
    max: 60,
    default: 30,
};
exports.DeviceRecordingClipLengthOutdoorPTProperty = {
    ...exports.DeviceRecordingClipLengthProperty,
    min: 10,
    max: 120,
    default: 60,
};
exports.DeviceRecordingRetriggerIntervalProperty = {
    key: types_1.CommandType.CMD_DEV_RECORD_INTERVAL,
    name: PropertyName.DeviceRecordingRetriggerInterval,
    label: "Recording Retrigger Interval",
    readable: true,
    writeable: true,
    type: "number",
    unit: "sec",
    min: 5,
    max: 60,
    default: 5,
};
exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty = {
    ...exports.DeviceRecordingRetriggerIntervalProperty,
    min: 2,
    max: 60,
    default: 2,
};
exports.DeviceRecordingRetriggerIntervalFloodlightProperty = {
    ...exports.DeviceRecordingRetriggerIntervalProperty,
    min: 0,
    max: 30,
    default: 0,
};
exports.DeviceRecordingEndClipMotionStopsProperty = {
    key: types_1.CommandType.CMD_DEV_RECORD_AUTOSTOP,
    name: PropertyName.DeviceRecordingEndClipMotionStops,
    label: "Recording end clip early if motion stops",
    readable: true,
    writeable: true,
    type: "boolean",
    default: true,
};
exports.DeviceVideoStreamingQualityProperty = {
    key: ParamType.DOORBELL_VIDEO_QUALITY,
    name: PropertyName.DeviceVideoStreamingQuality,
    label: "Video Streaming Quality",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Auto",
        1: "Low",
        2: "Medium",
        3: "High",
    },
    commandId: ParamType.COMMAND_VIDEO_QUALITY,
};
exports.DeviceVideoStreamingQualityBatteryDoorbellProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY,
    name: PropertyName.DeviceVideoStreamingQuality,
    label: "Video Streaming Quality",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Auto / Low Encoding",
        1: "Low / Low Encoding",
        2: "Medium / Low Encoding",
        3: "High / Low Encoding",
        5: "Auto / High Encoding",
        6: "Low / High Encoding",
        7: "Medium / High Encoding",
        8: "High / High Encoding",
    },
};
exports.DeviceVideoStreamingQualityCameraProperty = {
    ...exports.DeviceVideoStreamingQualityProperty,
    key: types_1.CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY,
};
exports.DeviceVideoStreamingQualitySoloProperty = {
    ...exports.DeviceVideoStreamingQualityProperty,
    key: types_1.CommandType.CMD_SET_RESOLUTION,
    commandId: ParamType.COMMAND_VIDEO_QUALITY,
};
exports.DeviceVideoStreamingQualityWalllightProperty = {
    ...exports.DeviceVideoStreamingQualitySoloProperty,
    commandId: types_1.CommandType.CMD_SET_RESOLUTION,
};
exports.DeviceVideoStreamingQualityCamera3Property = {
    ...exports.DeviceVideoStreamingQualityBatteryDoorbellProperty,
    states: {
        5: "Auto",
        6: "Low",
        7: "Medium",
        8: "High",
        10: "Ultra 4K"
    },
};
exports.DeviceVideoStreamingQualityCameraProfessionalProperty = {
    ...exports.DeviceVideoStreamingQualityCamera3Property,
    states: {
        5: "Auto",
        6: "720P",
        7: "1080P",
        8: "2K",
        10: "Ultra 4K"
    },
};
exports.DeviceVideoStreamingQualityDoorbellE340Property = {
    ...exports.DeviceVideoStreamingQualityProperty,
    key: types_1.CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY2,
    commandId: types_1.CommandType.CMD_BAT_DOORBELL_VIDEO_QUALITY2,
};
exports.DeviceVideoStreamingQualityS350Property = {
    ...exports.DeviceVideoStreamingQualityDoorbellE340Property,
    states: {
        0: "Auto",
        1: "HD (720P)",
        2: "Full HD (1080P)",
        3: "2K HD",
        4: "Ultra 4K"
    },
};
exports.DeviceVideoStreamingQualityS340Property = {
    ...exports.DeviceVideoStreamingQualityDoorbellE340Property,
    states: {
        0: "Auto",
        1: "HD (720P)",
        2: "Full HD (1080P)",
        3: "3K HD",
    },
};
exports.DeviceVideoStreamingQualitySmartDropProperty = {
    ...exports.DeviceVideoStreamingQualityBatteryDoorbellProperty,
    states: {
        0: "Auto",
        1: "Low",
        2: "Medium",
        3: "High",
    },
};
exports.DeviceVideoRecordingQualityIndoorProperty = {
    key: ParamType.DOORBELL_RECORD_QUALITY,
    name: PropertyName.DeviceVideoRecordingQuality,
    label: "Video Recording Quality",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        2: "Full HD (1080P)",
        3: "2K HD",
    },
    commandId: ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
};
exports.DeviceVideoRecordingQualityWiredDoorbellProperty = {
    ...exports.DeviceVideoRecordingQualityIndoorProperty,
    key: ParamType.DOORBELL_RECORD_QUALITY,
    states: {
        1: "Storage Saver (1600 * 1200)",
        2: "Full HD (1600 * 1200)",
        3: "2K HD (2560 * 1920)",
    },
    commandId: ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
};
exports.DeviceVideoRecordingQualityProperty = {
    ...exports.DeviceVideoRecordingQualityIndoorProperty,
    key: types_1.CommandType.CMD_SET_RECORD_QUALITY,
    states: {
        2: "Full HD (1080P)",
        3: "2K HD",
    },
    commandId: ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
};
exports.DeviceVideoRecordingQualityDoorbellE340Property = {
    ...exports.DeviceVideoRecordingQualityIndoorProperty,
    key: types_1.CommandType.CMD_BAT_DOORBELL_RECORD_QUALITY2,
    states: {
        2: "Full HD (1080P)",
        3: "2K HD",
    },
    commandId: types_1.CommandType.CMD_BAT_DOORBELL_RECORD_QUALITY2,
};
exports.DeviceVideoRecordingQualityS340Property = {
    ...exports.DeviceVideoRecordingQualityDoorbellE340Property,
    states: {
        1: "HD (720P)",
        2: "Full HD (1080P)",
        3: "3K HD",
    },
};
exports.DeviceVideoRecordingQualityS350Property = {
    ...exports.DeviceVideoRecordingQualityDoorbellE340Property,
    states: {
        1: "HD (720P)",
        2: "Full HD (1080P)",
        3: "2K HD",
        4: "Ultra 4K",
    },
};
exports.DeviceVideoRecordingQualityWalllightProperty = {
    ...exports.DeviceVideoRecordingQualityIndoorProperty,
    key: types_1.CommandType.CMD_SET_RECORD_QUALITY,
    states: {
        2: "Full HD (1080P)",
        3: "2K HD",
    },
    commandId: types_1.CommandType.CMD_SET_RECORD_QUALITY,
};
exports.DeviceVideoRecordingQualityT8200XProperty = {
    ...exports.DeviceVideoRecordingQualityIndoorProperty,
    key: types_1.CommandType.CMD_SET_RECORD_QUALITY,
    states: {
        2: "Full HD (1600 * 1200)",
        3: "2K HD (2048 * 1536)",
    },
    commandId: ParamType.COMMAND_VIDEO_RECORDING_QUALITY,
};
exports.DeviceVideoRecordingQualityCamera2CProProperty = {
    ...exports.DeviceVideoRecordingQualityProperty,
    states: {
        1: "2K HD",
        2: "Full HD (1080P)",
    },
};
exports.DeviceVideoRecordingQualityCamera3Property = {
    ...exports.DeviceVideoRecordingQualityProperty,
    states: {
        1: "2K HD",
        2: "Full HD (1080P)",
        3: "Ultra 4K",
    },
};
exports.DeviceVideoRecordingQualitySoloProperty = {
    ...exports.DeviceVideoRecordingQualityIndoorProperty,
    key: types_1.IndoorSoloSmartdropCommandType.CMD_VIDEO_RECORD_QUALITY,
    states: {
        2: "Full HD (1080P)",
        3: "2K HD",
    },
    commandId: types_1.CommandType.CMD_SET_RECORD_QUALITY,
};
exports.DeviceVideoRecordingQualitySoloCamerasHB3Property = {
    ...exports.DeviceVideoRecordingQualityWalllightProperty,
    states: {
        1: "2K HD",
        2: "Full HD (1080P)",
    },
};
exports.DeviceVideoRecordingQualityT8530Property = {
    ...exports.DeviceVideoRecordingQualityIndoorProperty,
    key: types_1.CommandType.CMD_SET_RECORD_QUALITY,
    states: {
        1: "2K HD",
        2: "Full HD",
        3: "Storage Saver",
    },
    commandId: types_1.CommandType.CMD_SET_RECORD_QUALITY,
};
exports.DeviceWDRProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_WDR_SWITCH,
    name: PropertyName.DeviceVideoWDR,
    label: "WDR",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceChimeIndoorBatteryDoorbellProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_MECHANICAL_CHIME_SWITCH,
    name: PropertyName.DeviceChimeIndoor,
    label: "Indoor Chime Enabled",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceChimeIndoorWiredDoorbellProperty = {
    ...exports.DeviceChimeIndoorBatteryDoorbellProperty,
    key: ParamType.CHIME_STATE,
    commandId: ParamType.COMMAND_INDOOR_CHIME,
};
exports.DeviceChimeIndoorT8200XProperty = {
    ...exports.DeviceChimeIndoorBatteryDoorbellProperty,
    key: ParamType.COMMAND_INDOOR_CHIME,
    commandId: ParamType.COMMAND_INDOOR_CHIME,
};
exports.DeviceChimeHomebaseBatteryDoorbellProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_CHIME_SWITCH,
    name: PropertyName.DeviceChimeHomebase,
    label: "Homebase Chime Enabled",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_DINGDONG_V,
    name: PropertyName.DeviceChimeHomebaseRingtoneVolume,
    label: "Homebase Chime Ringtone Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 26,
};
exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_DINGDONG_R,
    name: PropertyName.DeviceChimeHomebaseRingtoneType,
    label: "Homebase Chime Ringtone Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Default",
        1: "Silent",
        2: "Beacon",
        3: "Chord",
        4: "Christmas",
        5: "Circuit",
        6: "Clock",
        7: "Ding",
        8: "Hillside",
        9: "Presto",
    },
};
exports.DeviceNotificationTypeProperty = {
    key: types_1.CommandType.CMD_SET_PUSH_EFFECT,
    name: PropertyName.DeviceNotificationType,
    label: "Notification Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Most Efficient",
        2: "Include Thumbnail",
        3: "Full Effect",
    },
    commandId: types_1.CommandType.CMD_INDOOR_PUSH_NOTIFY_TYPE,
};
exports.DeviceNotificationTypeIndoorFloodlightProperty = {
    ...exports.DeviceNotificationTypeProperty,
    key: types_1.CommandType.CMD_INDOOR_PUSH_NOTIFY_TYPE,
};
exports.DeviceNotificationTypeBatteryDoorbellProperty = {
    ...exports.DeviceNotificationTypeProperty,
    key: types_1.CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
};
exports.DeviceNotificationTypeWiredDoorbellProperty = {
    ...exports.DeviceNotificationTypeProperty,
    key: ParamType.DOORBELL_MOTION_NOTIFICATION,
    commandId: ParamType.COMMAND_NOTIFICATION_TYPE,
};
exports.DeviceNotificationTypeWalllightProperty = {
    ...exports.DeviceNotificationTypeProperty,
    key: types_1.CommandType.CMD_WALL_LIGHT_NOTIFICATION_TYPE,
    commandId: types_1.CommandType.CMD_WALL_LIGHT_NOTIFICATION_TYPE,
    states: {
        1: "Text Only",
        2: "With Thumbnail",
    },
};
exports.DeviceRotationSpeedProperty = {
    key: types_1.CommandType.CMD_INDOOR_PAN_SPEED,
    name: PropertyName.DeviceRotationSpeed,
    label: "Rotation Speed",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Min",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Max",
    },
    default: 3
};
exports.DeviceImageMirroredProperty = {
    key: types_1.CommandType.CMD_SET_MIRRORMODE,
    name: PropertyName.DeviceImageMirrored,
    label: "Image vertically mirrored",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceSoundDetectionTypeProperty = {
    key: types_1.CommandType.CMD_INDOOR_DET_SET_SOUND_DETECT_TYPE,
    name: PropertyName.DeviceSoundDetectionType,
    label: "Sound Detection Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Crying",
        2: "All Sounds",
    },
};
exports.DeviceSoundDetectionTypeS350Property = {
    ...exports.DeviceSoundDetectionTypeProperty,
    states: {
        128: "All Sounds",
        256: "Crying",
    },
};
exports.DeviceSoundDetectionSensitivityProperty = {
    key: types_1.CommandType.CMD_INDOOR_DET_SET_SOUND_SENSITIVITY_IDX,
    name: PropertyName.DeviceSoundDetectionSensitivity,
    label: "Sound Detection Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Min",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Max",
    },
};
exports.DeviceNotificationPersonProperty = {
    key: types_1.CommandType.CMD_INDOOR_AI_PERSON_ENABLE,
    name: PropertyName.DeviceNotificationPerson,
    label: "Notification Person detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationPersonWalllightProperty = {
    ...exports.DeviceNotificationPersonProperty,
    key: types_1.CommandType.CMD_WALL_LIGHT_NOTIFICATION_TYPE_HUMAN,
};
exports.DeviceNotificationPetProperty = {
    key: types_1.CommandType.CMD_INDOOR_AI_PET_ENABLE,
    name: PropertyName.DeviceNotificationPet,
    label: "Notification Pet detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationAllOtherMotionProperty = {
    key: types_1.CommandType.CMD_INDOOR_AI_MOTION_ENABLE,
    name: PropertyName.DeviceNotificationAllOtherMotion,
    label: "Notification All Other Motion",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationAllOtherMotionWalllightProperty = {
    ...exports.DeviceNotificationAllOtherMotionProperty,
    key: types_1.CommandType.CMD_WALL_LIGHT_NOTIFICATION_TYPE_ALL,
};
exports.DeviceNotificationAllSoundProperty = {
    key: types_1.CommandType.CMD_INDOOR_AI_SOUND_ENABLE,
    name: PropertyName.DeviceNotificationAllSound,
    label: "Notification Sound detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationCryingProperty = {
    key: types_1.CommandType.CMD_INDOOR_AI_CRYING_ENABLE,
    name: PropertyName.DeviceNotificationCrying,
    label: "Notification Crying detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationRingProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
    name: PropertyName.DeviceNotificationRing,
    label: "Notification Ring detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationRingWiredDoorbellProperty = {
    ...exports.DeviceNotificationRingProperty,
    key: ParamType.DOORBELL_NOTIFICATION_OPEN,
    commandId: ParamType.COMMAND_NOTIFICATION_RING,
};
exports.DeviceNotificationMotionProperty = {
    key: types_1.CommandType.CMD_BAT_DOORBELL_SET_NOTIFICATION_MODE,
    name: PropertyName.DeviceNotificationMotion,
    label: "Notification Motion detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationRadarDetectorProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_NOTIFICATION_HUMAN_DETECT,
    name: PropertyName.DeviceNotificationRadarDetector,
    label: "Notification Radar Detector Motion detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationMotionWiredDoorbellProperty = {
    ...exports.DeviceNotificationMotionProperty,
    key: ParamType.DOORBELL_NOTIFICATION_OPEN,
    commandId: ParamType.COMMAND_NOTIFICATION_RING,
};
exports.DeviceChirpVolumeEntrySensorProperty = {
    key: types_1.CommandType.CMD_SENSOR_SET_CHIRP_VOLUME,
    name: PropertyName.DeviceChirpVolume,
    label: "Chirp Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 26,
    steps: 1,
};
exports.DeviceChirpToneEntrySensorProperty = {
    key: types_1.CommandType.CMD_SENSOR_SET_CHIRP_TONE,
    name: PropertyName.DeviceChirpTone,
    label: "Chirp Tone",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "None",
        1: "Water",
        2: "Classic",
        3: "Light",
        4: "Ding",
    }
};
exports.DeviceVideoHDRWiredDoorbellProperty = {
    key: ParamType.DOORBELL_HDR,
    name: PropertyName.DeviceVideoHDR,
    label: "HDR",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceVideoDistortionCorrectionWiredDoorbellProperty = {
    key: ParamType.DOORBELL_DISTORTION,
    name: PropertyName.DeviceVideoDistortionCorrection,
    label: "Distortion Correction",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceVideoRingRecordWiredDoorbellProperty = {
    key: ParamType.DOORBELL_RING_RECORD,
    name: PropertyName.DeviceVideoRingRecord,
    label: "Record while live viewing after opening notification",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Disabled",
        1: "Enabled - Recording Quality Preferred",
        2: "Enabled - Streaming Quality Preferred",
    }
};
exports.DeviceMotionDetectionRangeProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE,
    name: PropertyName.DeviceMotionDetectionRange,
    label: "Motion Detection Range",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Standard",
        1: "Advanced",
        2: "Automatic",
    },
};
exports.DeviceMotionDetectionRangeT8425Property = {
    ...exports.DeviceMotionDetectionRangeProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
};
exports.DeviceMotionDetectionRangeStandardSensitivityProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_STD_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionRangeStandardSensitivity,
    label: "Motion Detection Range Standard Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "Min",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Max",
    },
};
exports.DeviceMotionDetectionRangeStandardSensitivityT8425Property = {
    ...exports.DeviceMotionDetectionRangeStandardSensitivityProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
};
exports.DeviceMotionDetectionRangeAdvancedLeftSensitivityProperty = {
    ...exports.DeviceMotionDetectionRangeStandardSensitivityProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_LEFT_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity,
    label: "Motion Detection Range Advanced Left Sensitivity",
};
exports.DeviceMotionDetectionRangeAdvancedLeftSensitivityT8425Property = {
    ...exports.DeviceMotionDetectionRangeAdvancedLeftSensitivityProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
};
exports.DeviceMotionDetectionRangeAdvancedMiddleSensitivityProperty = {
    ...exports.DeviceMotionDetectionRangeStandardSensitivityProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_MIDDLE_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionRangeAdvancedMiddleSensitivity,
    label: "Motion Detection Range Advanced Middle Sensitivity",
};
exports.DeviceMotionDetectionRangeAdvancedRightSensitivityProperty = {
    ...exports.DeviceMotionDetectionRangeStandardSensitivityProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_ADV_RIGHT_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity,
    label: "Motion Detection Range Advanced Right Sensitivity",
};
exports.DeviceMotionDetectionRangeAdvancedRightSensitivityT8425Property = {
    ...exports.DeviceMotionDetectionRangeAdvancedRightSensitivityProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
};
exports.DeviceMotionDetectionTestModeProperty = {
    key: types_1.CommandType.CMD_SET_PIR_TEST_MODE,
    name: PropertyName.DeviceMotionDetectionTestMode,
    label: "Motion Detection Test Mode",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceMotionDetectionTestModeT8425Property = {
    ...exports.DeviceMotionDetectionTestModeProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_DETECTION_RANGE_T8425,
};
exports.DeviceMotionTrackingSensitivityProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_MOTION_TRACKING_SENSITIVITY,
    name: PropertyName.DeviceMotionTrackingSensitivity,
    label: "Motion Tracking Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Level 1",
        2: "Level 2",
        3: "Level 3",
    },
    default: 3,
};
exports.DeviceMotionAutoCruiseProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_MOTION_AUTO_CRUISE,
    name: PropertyName.DeviceMotionAutoCruise,
    label: "Motion Auto-Cruise",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceMotionOutOfViewDetectionProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_MOTION_OUT_OF_VIEW_DETECTION,
    name: PropertyName.DeviceMotionOutOfViewDetection,
    label: "Motion Out-of-View Detection",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceLightSettingsColorTemperatureManualProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_MANUAL,
    name: PropertyName.DeviceLightSettingsColorTemperatureManual,
    label: "Light Setting Color Temperature Manual",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 100,
    default: 50,
};
exports.DeviceLightSettingsColorTemperatureMotionProperty = {
    ...exports.DeviceLightSettingsColorTemperatureManualProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_MOTION,
    name: PropertyName.DeviceLightSettingsColorTemperatureMotion,
    label: "Light Setting Color Temperature Motion",
};
exports.DeviceLightSettingsColorTemperatureScheduleProperty = {
    ...exports.DeviceLightSettingsColorTemperatureManualProperty,
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_LIGHT_COLOR_TEMP_SCHEDULE,
    name: PropertyName.DeviceLightSettingsColorTemperatureSchedule,
    label: "Light Setting Color Temperature Schedule",
};
exports.DeviceLightSettingsMotionActivationModeProperty = {
    key: types_1.CommandType.CMD_SET_FLOODLIGHT_STREET_LAMP,
    name: PropertyName.DeviceLightSettingsMotionActivationMode,
    label: "Light Settings Motion Activation Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Smart",
        1: "Fast",
    },
};
exports.DeviceLightSettingsMotionActivationModeT8425Property = {
    ...exports.DeviceLightSettingsMotionActivationModeProperty,
    key: types_1.CommandType.CMD_SET_LIGHT_CTRL_BRIGHT_PIR_T8425,
};
exports.DeviceVideoNightvisionImageAdjustmentProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_VIDEO_NIGHTVISION_IMAGE_ADJUSTMENT,
    name: PropertyName.DeviceVideoNightvisionImageAdjustment,
    label: "Video Nightvision Image Adjustment",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceVideoColorNightvisionProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_VIDEO_COLOR_NIGHTVISION,
    name: PropertyName.DeviceVideoColorNightvision,
    label: "Video Color Nightvision",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceAutoCalibrationProperty = {
    key: types_1.CommandType.CMD_FLOODLIGHT_SET_AUTO_CALIBRATION,
    name: PropertyName.DeviceAutoCalibration,
    label: "Auto Calibration",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceAutoLockProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_AUTO_LOCK,
    name: PropertyName.DeviceAutoLock,
    label: "Auto Lock",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceAutoLockTimerProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_AUTO_LOCK_TIMER,
    name: PropertyName.DeviceAutoLockTimer,
    label: "Auto Lock Timer",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "1 sec.",
        30: "30 sec.",
        60: "1 min.",
        90: "1,5 min.",
        120: "2 min.",
        150: "2,5 min.",
        180: "3 min.",
    },
    default: 60,
    unit: "sec",
};
exports.DeviceAutoLockScheduleProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE,
    name: PropertyName.DeviceAutoLockSchedule,
    label: "Auto Lock Schedule",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceAutoLockScheduleStartTimeProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_STARTTIME,
    name: PropertyName.DeviceAutoLockScheduleStartTime,
    label: "Auto Lock Schedule Starttime (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "06:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceAutoLockScheduleEndTimeProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_AUTO_LOCK_SCHEDULE_ENDTIME,
    name: PropertyName.DeviceAutoLockScheduleEndTime,
    label: "Auto Lock Schedule Endtime (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "23:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceOneTouchLockingProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_ONE_TOUCH_LOCK,
    name: PropertyName.DeviceOneTouchLocking,
    label: "One-Touch Locking",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceWrongTryProtectionProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_WRONG_TRY_PROTECT,
    name: PropertyName.DeviceWrongTryProtection,
    label: "Wrong Try Protection",
    readable: true,
    writeable: true,
    type: "boolean",
    default: true,
};
exports.DeviceWrongTryProtectionSmartSafeProperty = {
    ...exports.DeviceWrongTryProtectionProperty,
    key: types_1.CommandType.CMD_SMARTSAFE_IS_ENABLE_CRACK_PROTECT,
};
exports.DeviceWrongTryLockdownTimeProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_WRONG_TRY_LOCKDOWN,
    name: PropertyName.DeviceWrongTryLockdownTime,
    label: "Wrong Try Lockdown Time",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        60: "1 min.",
        120: "2 min.",
        180: "3 min.",
        240: "4 min.",
        300: "5 min.",
    },
    default: 180,
    unit: "sec",
};
exports.DeviceWrongTryLockdownTimeSmartSafeProperty = {
    ...exports.DeviceWrongTryLockdownTimeProperty,
    key: types_1.CommandType.CMD_SMARTSAFE_PROTECT_COOLDOWN_SECONDS,
    default: 60,
};
exports.DeviceWrongTryAttemptsProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_WRONG_TRY_ATTEMPTS,
    name: PropertyName.DeviceWrongTryAttempts,
    label: "Wrong Try Attempts",
    readable: true,
    writeable: true,
    type: "number",
    min: 3,
    max: 10,
    default: 5,
};
exports.DeviceWrongTryAttemptsSmartSafeProperty = {
    ...exports.DeviceWrongTryAttemptsProperty,
    key: types_1.CommandType.CMD_SMARTSAFE_MAX_WRONG_PIN_TIMES,
    min: 5,
    max: 10,
    default: 5,
};
exports.DeviceScramblePasscodeProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_SCRAMBLE_PASSCODE,
    name: PropertyName.DeviceScramblePasscode,
    label: "Scramble Passcode",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceScramblePasscodeSmartSafeProperty = {
    ...exports.DeviceScramblePasscodeProperty,
    key: types_1.CommandType.CMD_SMARTSAFE_IS_SET_PREFIX_PWD,
    label: "Scramble PIN",
};
exports.DeviceSoundProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_LOCK_SOUND,
    name: PropertyName.DeviceSound,
    label: "Sound",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        1: "Low",
        2: "Medium",
        3: "High",
    },
    default: 2,
};
exports.DeviceSoundSimpleProperty = {
    ...exports.DeviceSoundProperty,
    states: {
        0: "Off",
        2: "On",
    },
    default: 2,
};
exports.DeviceNotificationProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_NOTIFICATION,
    name: PropertyName.DeviceNotification,
    label: "Notification",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationSmartLockProperty = {
    ...exports.DeviceNotificationProperty,
    key: types_1.CommandType.CMD_DOORLOCK_SET_PUSH_MODE,
};
exports.DeviceNotificationWalllightProperty = {
    ...exports.DeviceNotificationProperty,
    key: types_1.CommandType.CMD_WALL_LIGHT_NOTIFICATION,
};
exports.DeviceNotificationUnlockedProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_NOTIFICATION_UNLOCKED,
    name: PropertyName.DeviceNotificationUnlocked,
    label: "Notification Unlocked",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationUnlockedSmartLockProperty = {
    ...exports.DeviceNotificationUnlockedProperty,
    key: types_1.CommandType.CMD_DOORLOCK_SET_PUSH_MODE,
};
exports.DeviceNotificationLockedProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_NOTIFICATION_LOCKED,
    name: PropertyName.DeviceNotificationLocked,
    label: "Notification Locked",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationLockedSmartLockProperty = {
    ...exports.DeviceNotificationLockedProperty,
    key: types_1.CommandType.CMD_DOORLOCK_SET_PUSH_MODE,
};
exports.DeviceLoiteringDetectionProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_SWITCH,
    name: PropertyName.DeviceLoiteringDetection,
    label: "Loitering Detection",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceLoiteringDetectionRangeProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DISTANCE,
    name: PropertyName.DeviceLoiteringDetectionRange,
    label: "Loitering Detection Range",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "within 2ft",
        2: "within 4ft",
        3: "within 6ft",
        4: "within 8ft",
        5: "within 10ft",
    },
    default: 3,
};
exports.DeviceLoiteringDetectionLengthProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_TIME,
    name: PropertyName.DeviceLoiteringDetectionLength,
    label: "Loitering Detection Length",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "15s",
        2: "20s",
        3: "25s",
        4: "30s",
        5: "45s",
        6: "60s",
    },
    default: 1,
};
exports.DeviceMotionDetectionSensitivityModeProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionSensitivityMode,
    label: "Motion Detection Sensitivity Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Standard",
        1: "Advanced",
    },
};
exports.DeviceMotionDetectionSensitivityStandardProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionSensitivityStandard,
    label: "Motion Detection Standard Sensitivity",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 5,
    default: 3,
};
exports.DeviceMotionDetectionSensitivityAdvancedAProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_DETECTION_SENSITIVITY,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedA,
    label: "Motion Detection Advanced Sensitivity A",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 5,
    default: 3,
};
exports.DeviceMotionDetectionSensitivityAdvancedBProperty = {
    ...exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedB,
    label: "Motion Detection Advanced Sensitivity B",
};
exports.DeviceMotionDetectionSensitivityAdvancedCProperty = {
    ...exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedC,
    label: "Motion Detection Advanced Sensitivity C",
};
exports.DeviceMotionDetectionSensitivityAdvancedDProperty = {
    ...exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedD,
    label: "Motion Detection Advanced Sensitivity D",
};
exports.DeviceMotionDetectionSensitivityAdvancedEProperty = {
    ...exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedE,
    label: "Motion Detection Advanced Sensitivity E",
};
exports.DeviceMotionDetectionSensitivityAdvancedFProperty = {
    ...exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedF,
    label: "Motion Detection Advanced Sensitivity F",
};
exports.DeviceMotionDetectionSensitivityAdvancedGProperty = {
    ...exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedG,
    label: "Motion Detection Advanced Sensitivity G",
};
exports.DeviceMotionDetectionSensitivityAdvancedHProperty = {
    ...exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
    name: PropertyName.DeviceMotionDetectionSensitivityAdvancedH,
    label: "Motion Detection Advanced Sensitivity H",
};
exports.DeviceLoiteringCustomResponsePhoneNotificationProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE,
    name: PropertyName.DeviceLoiteringCustomResponsePhoneNotification,
    label: "Loitering Custom Response Phone Notification",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceLoiteringCustomResponseAutoVoiceResponseProperty = {
    ...exports.DeviceLoiteringCustomResponsePhoneNotificationProperty,
    name: PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse,
    label: "Loitering Custom Response Auto Voice Response",
};
exports.DeviceLoiteringCustomResponseAutoVoiceResponseVoiceProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE,
    name: PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice,
    label: "Loitering Custom Response Auto Voice Response Voice",
    readable: true,
    writeable: true,
    type: "number",
    default: 1,
    // states loaded dynamically
};
exports.DeviceLoiteringCustomResponseHomeBaseNotificationProperty = {
    ...exports.DeviceLoiteringCustomResponsePhoneNotificationProperty,
    name: PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification,
    label: "Loitering Custom Response HomeBase Notification",
};
exports.DeviceLoiteringCustomResponseTimeFromProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RADAR_WD_AUTO_RESPONSE,
    name: PropertyName.DeviceLoiteringCustomResponseTimeFrom,
    label: "Loitering Custom Response Time From (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "00:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceLoiteringCustomResponseTimeToProperty = {
    ...exports.DeviceLoiteringCustomResponseTimeFromProperty,
    name: PropertyName.DeviceLoiteringCustomResponseTimeTo,
    label: "Loitering Custom Response Time To (24-hour clock)",
    default: "23:59",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceDeliveryGuardProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_DELIVERY_GUARD_SWITCH,
    name: PropertyName.DeviceDeliveryGuard,
    label: "Delivery Guard",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceDeliveryGuardPackageGuardingProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_SWITCH,
    name: PropertyName.DeviceDeliveryGuardPackageGuarding,
    label: "Delivery Guard Package Guarding",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_VOICE,
    name: PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice,
    label: "Delivery Guard Package Guarding Voice Response Voice",
    readable: true,
    writeable: true,
    type: "number",
    default: 2,
    // states loaded dynamically
};
exports.DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_PACKAGE_GUARD_TIME,
    name: PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom,
    label: "Delivery Guard Package Guarding Activated Time From (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "00:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty = {
    ...exports.DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty,
    name: PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo,
    label: "Delivery Guard Package Guarding Activated Time To (24-hour clock)",
    default: "23:59",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceDeliveryGuardUncollectedPackageAlertProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_SWITCH,
    name: PropertyName.DeviceDeliveryGuardUncollectedPackageAlert,
    label: "Delivery Guard Uncollected Package Alert",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_PACKAGE_STRAND_TIME,
    name: PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck,
    label: "Delivery Guard Uncollected Package Alert Time To Check (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "20:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceDeliveryGuardPackageLiveCheckAssistanceProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_PACKAGE_ASSISTANT_SWITCH,
    name: PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance,
    label: "Delivery Guard Package Live Check Assistance",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceDualCamWatchViewModeProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_VIEW_MODE,
    name: PropertyName.DeviceDualCamWatchViewMode,
    label: "Dual Cam Watch View Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        2: "Top-Left Picture-in-Picture",
        3: "Top-Right Picture-in-Picture",
        4: "Bottom-Left Picture-in-Picture",
        5: "Bottom-Right Picture-in-Picture",
        12: "Split-view",
    },
    default: 12,
};
exports.DeviceDualCamWatchViewModeE340Property = {
    ...exports.DeviceDualCamWatchViewModeProperty,
    key: types_1.CommandType.CMD_DOORBELL_DUAL_VIEW_MODE2,
};
exports.DeviceDualCamWatchViewModeS340Property = {
    ...exports.DeviceDualCamWatchViewModeProperty,
    key: types_1.CommandType.CMD_DOORBELL_DUAL_VIEW_MODE2,
    states: {
        0: "Single view",
        12: "Double view",
    },
    default: 0,
};
exports.DeviceRingAutoResponseProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE,
    name: PropertyName.DeviceRingAutoResponse,
    label: "Ring Auto-Response",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceRingAutoResponseVoiceResponseProperty = {
    ...exports.DeviceRingAutoResponseProperty,
    name: PropertyName.DeviceRingAutoResponseVoiceResponse,
    label: "Ring Auto-Response Voice Response",
};
exports.DeviceRingAutoResponseVoiceResponseVoiceProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE,
    name: PropertyName.DeviceRingAutoResponseVoiceResponseVoice,
    label: "Ring Auto-Response Voice Response Voice",
    readable: true,
    writeable: true,
    type: "number",
    default: 2,
    // states loaded dynamically
};
exports.DeviceRingAutoResponseTimeFromProperty = {
    key: types_1.CommandType.CMD_DOORBELL_DUAL_RING_AUTO_RESPONSE,
    name: PropertyName.DeviceRingAutoResponseTimeFrom,
    label: "Ring Auto-Response Time From (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "00:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceRingAutoResponseTimeToProperty = {
    ...exports.DeviceRingAutoResponseTimeFromProperty,
    name: PropertyName.DeviceRingAutoResponseTimeTo,
    label: "Ring Auto-Response Time To (24-hour clock)",
    default: "23:59",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceContinuousRecordingProperty = {
    key: types_1.CommandType.CMD_INDOOR_SET_CONTINUE_ENABLE,
    name: PropertyName.DeviceContinuousRecording,
    label: "Continuos Recording",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceContinuousRecordingTypeProperty = {
    key: types_1.CommandType.CMD_INDOOR_SET_CONTINUE_TYPE,
    name: PropertyName.DeviceContinuousRecordingType,
    label: "Continuos Recording Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Always",
        1: "Schedule"
    }
};
exports.DeviceDefaultAngleProperty = {
    key: types_1.CommandType.CMD_INDOOR_DEFAULT_ANGLE_ENABLE,
    name: PropertyName.DeviceDefaultAngle,
    label: "Default Angle",
    readable: true,
    writeable: true,
    type: "boolean",
    default: false,
};
exports.DeviceDefaultAngleIdleTimeProperty = {
    key: types_1.CommandType.CMD_INDOOR_DEFAULT_ANGLE_IDLE_TIME,
    name: PropertyName.DeviceDefaultAngleIdleTime,
    label: "Default Angle Idle Time",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        10: "10s",
        20: "20s",
        40: "40s",
        60: "1 min",
        120: "2 mins",
        300: "5 mins",
    },
    default: 60,
};
exports.DeviceNotificationIntervalTimeProperty = {
    key: types_1.CommandType.CMD_DEV_RECORD_INTERVAL,
    name: PropertyName.DeviceNotificationIntervalTime,
    label: "Notification Interval Time",
    readable: true,
    writeable: true,
    type: "number",
    unit: "min",
    default: 0,
    states: {
        0: "0",
        60: "1",
        120: "2",
        180: "3",
        240: "4",
        300: "5",
    }
};
exports.DeviceSoundDetectionRoundLookProperty = {
    key: types_1.CommandType.CMD_INDOOR_SET_SOUND_DETECT_ROUND_LOOK,
    name: PropertyName.DeviceSoundDetectionRoundLook,
    label: "Sound Detection Round-Look",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceSoundDetectionRoundLookS350Property = {
    key: types_1.CommandType.CMD_INDOOR_SET_SOUND_DETECT_ROUND_LOOK_S350,
    name: PropertyName.DeviceSoundDetectionRoundLook,
    label: "Sound Detection Round-Look",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationHomeSecuritySettings = {
    key: types_1.CommandType.ARM_DELAY_HOME,
    name: PropertyName.StationHomeSecuritySettings,
    label: "Security Settings Home",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationAwaySecuritySettings = {
    key: types_1.CommandType.ARM_DELAY_AWAY,
    name: PropertyName.StationAwaySecuritySettings,
    label: "Security Settings Away",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationCustom1SecuritySettings = {
    key: types_1.CommandType.ARM_DELAY_CUS1,
    name: PropertyName.StationCustom1SecuritySettings,
    label: "Security Settings Custom1",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationCustom2SecuritySettings = {
    key: types_1.CommandType.ARM_DELAY_CUS2,
    name: PropertyName.StationCustom2SecuritySettings,
    label: "Security Settings Custom2",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationCustom3SecuritySettings = {
    key: types_1.CommandType.ARM_DELAY_CUS3,
    name: PropertyName.StationCustom3SecuritySettings,
    label: "Security Settings Custom3",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationOffSecuritySettings = {
    key: types_1.CommandType.ARM_DELAY_OFF,
    name: PropertyName.StationOffSecuritySettings,
    label: "Security Settings Off",
    readable: true,
    writeable: false,
    type: "string",
};
exports.DevicePackageDeliveredProperty = {
    key: "custom_packageDelivered",
    name: PropertyName.DevicePackageDelivered,
    label: "Package Delivered",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DevicePackageStrandedProperty = {
    key: "custom_packageStranded",
    name: PropertyName.DevicePackageStranded,
    label: "Package Stranded",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DevicePackageTakenProperty = {
    key: "custom_packageTaken",
    name: PropertyName.DevicePackageTaken,
    label: "Package Taken",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceSomeoneLoiteringProperty = {
    key: "custom_someoneLoitering",
    name: PropertyName.DeviceSomeoneLoitering,
    label: "Someone Loitering",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceRadarMotionDetectedProperty = {
    key: "custom_radarMotionDetected",
    name: PropertyName.DeviceRadarMotionDetected,
    label: "Radar Motion Detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceLeftOpenAlarmProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_IS_ENABLE_LEFT_OPEN,
    name: PropertyName.DeviceLeftOpenAlarm,
    label: "Left Open Alarm",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceLeftOpenAlarmDurationProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_LEFT_OPEN_SECONDS,
    name: PropertyName.DeviceLeftOpenAlarmDuration,
    label: "Left Open Alarm Duration",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        30: "30 sec.",
        60: "60 sec.",
        90: "90 sec.",
        120: "120 sec.",
    },
    default: 120,
    unit: "sec",
};
exports.DeviceDualUnlockProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_IS_ENABLE_TOW_FACTOR_CHK,
    name: PropertyName.DeviceDualUnlock,
    label: "Dual Unlock",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DevicePowerSaveProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_POWER_SAVE_ON,
    name: PropertyName.DevicePowerSave,
    label: "Power Save",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceInteriorBrightnessProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_LED_BRIGHTNESS_LEVEL,
    name: PropertyName.DeviceInteriorBrightness,
    label: "Interior Brightness Level",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        25: "Low",
        60: "Mid",
        100: "High",
    },
    default: 60,
};
exports.DeviceInteriorBrightnessDurationProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_LED_BRIGHTNESS_SECOND,
    name: PropertyName.DeviceInteriorBrightnessDuration,
    label: "Interior Brightness Duration",
    readable: true,
    writeable: true,
    type: "number",
    default: 10,
    min: 5,
    max: 60,
    steps: 1,
    unit: "sec",
};
exports.DeviceTamperAlarmProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_IS_ENABLE_SHAKE_ALARM,
    name: PropertyName.DeviceTamperAlarm,
    label: "Tamper Alarm",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Off",
        2: "Tamper Alarm",
        3: "Move Alarm",
    },
    default: 2,
};
exports.DeviceRemoteUnlockProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_REMOTE_OPEN_TYPE,
    name: PropertyName.DeviceRemoteUnlock,
    label: "Remote Unlock",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceRemoteUnlockMasterPINProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_REMOTE_OPEN_TYPE,
    name: PropertyName.DeviceRemoteUnlockMasterPIN,
    label: "Remote Unlock Master PIN",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DevicePromptVolumeProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_VOLUME,
    name: PropertyName.DevicePromptVolume,
    label: "Prompt Volume",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Mute",
        1: "Soft",
        2: "Max",
    },
    default: 1,
};
exports.DeviceAlarmVolumeProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_ALERT_VOLUME,
    name: PropertyName.DeviceAlarmVolume,
    label: "Alarm Volume",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Low",
        1: "Medium",
        2: "High",
    },
    default: 2,
};
exports.DeviceNotificationUnlockByKeyProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationUnlockByKey,
    label: "Notification Unlock By Key",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationUnlockByPINProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationUnlockByPIN,
    label: "Notification Unlock By PIN",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationUnlockByFingerprintProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationUnlockByFingerprint,
    label: "Notification Unlock By Fingerprint",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationUnlockByAppProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationUnlockByApp,
    label: "Notification Unlock By App",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationDualUnlockProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationDualUnlock,
    label: "Notification Dual Unlock",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationDualLockProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationDualLock,
    label: "Notification Dual Lock",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationWrongTryProtectProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationWrongTryProtect,
    label: "Notification Wrong-Try Protect",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationJammedProperty = {
    key: types_1.CommandType.CMD_SMARTSAFE_NOTIF,
    name: PropertyName.DeviceNotificationJammed,
    label: "Notification Jammed",
    readable: true,
    writeable: false,
    type: "boolean",
};
exports.DeviceJammedAlertProperty = {
    key: "custom_jammedAlert",
    name: PropertyName.DeviceJammedAlert,
    label: "Jammed Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.Device911AlertProperty = {
    key: "custom_911Alert",
    name: PropertyName.Device911Alert,
    label: "911 Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.Device911AlertEventProperty = {
    key: "custom_911AlertEvent",
    name: PropertyName.Device911AlertEvent,
    label: "911 Alert Event",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Cancel Alarm",
        1: "Alarm",
        2: "Alarm Success",
        3: "Alarm Not Open",
        4: "Alarm Open Failed",
    },
};
exports.DeviceShakeAlertProperty = {
    key: "custom_shakeAlert",
    name: PropertyName.DeviceShakeAlert,
    label: "Shake Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceShakeAlertEventProperty = {
    key: "custom_shakeAlertEvent",
    name: PropertyName.DeviceShakeAlertEvent,
    label: "Shake Alert Event",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Cancel Alarm",
        1: "Alarm",
    },
};
exports.DeviceLowBatteryAlertProperty = {
    key: "custom_lowBatteryAlert",
    name: PropertyName.DeviceLowBatteryAlert,
    label: "Low Battery Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceLongTimeNotCloseAlertProperty = {
    key: "custom_longTimeNotCloseAlert",
    name: PropertyName.DeviceLongTimeNotCloseAlert,
    label: "Long Time Not Close Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceWrongTryProtectAlertProperty = {
    key: "custom_wrongTryProtectAlert",
    name: PropertyName.DeviceWrongTryProtectAlert,
    label: "Wrong Try-Protect Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceVideoTypeStoreToNASProperty = {
    key: types_1.CommandType.CMD_INDOOR_NAS_STORAGE_TYPE,
    name: PropertyName.DeviceVideoTypeStoreToNAS,
    label: "Video Type Store To NAS",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Events",
        1: "Continuous Recording",
    },
};
exports.DeviceSnoozeProperty = {
    key: types_1.CommandType.CMD_SET_SNOOZE_MODE,
    name: PropertyName.DeviceSnooze,
    label: "Snooze",
    readable: true,
    writeable: false,
    type: "boolean",
};
exports.DeviceSnoozeTimeProperty = {
    key: types_1.CommandType.CMD_SET_SNOOZE_MODE,
    name: PropertyName.DeviceSnoozeTime,
    label: "Snooze Time",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
    unit: "sec",
};
exports.DeviceSnoozeStartTimeProperty = {
    key: types_1.CommandType.CMD_SET_SNOOZE_MODE,
    name: PropertyName.DeviceSnoozeStartTime,
    label: "Snooze Start Time",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.DeviceSnoozeStartTimeWiredDoorbellProperty = {
    ...exports.DeviceSnoozeStartTimeProperty,
    key: ParamType.DOORBELL_SNOOZE_START_TIME,
};
exports.DeviceSnoozeHomebaseProperty = {
    key: types_1.CommandType.CMD_SET_SNOOZE_MODE,
    name: PropertyName.DeviceSnoozeHomebase,
    label: "Snooze Homebase",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceSnoozeMotionProperty = {
    key: types_1.CommandType.CMD_SET_SNOOZE_MODE,
    name: PropertyName.DeviceSnoozeMotion,
    label: "Snooze Motion",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceSnoozeChimeProperty = {
    key: types_1.CommandType.CMD_SET_SNOOZE_MODE,
    name: PropertyName.DeviceSnoozeChime,
    label: "Snooze Chime",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DevicePersonNameProperty = {
    key: "custom_personName",
    name: PropertyName.DevicePersonName,
    label: "Person Name",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceIdentityPersonDetectedProperty = {
    key: "custom_identityPersonDetected",
    name: PropertyName.DeviceIdentityPersonDetected,
    label: "Identity Person detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceStrangerPersonDetectedProperty = {
    key: "custom_strangerPersonDetected",
    name: PropertyName.DeviceStrangerPersonDetected,
    label: "Stranger Person detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceVehicleDetectedProperty = {
    key: "custom_vehicleDetected",
    name: PropertyName.DeviceVehicleDetected,
    label: "Vehicle detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceDogDetectedProperty = {
    key: "custom_dogDetected",
    name: PropertyName.DeviceDogDetected,
    label: "Dog detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceDogLickDetectedProperty = {
    key: "custom_dogLickDetected",
    name: PropertyName.DeviceDogLickDetected,
    label: "Dog Lick detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceDogPoopDetectedProperty = {
    key: "custom_dogPoopDetected",
    name: PropertyName.DeviceDogPoopDetected,
    label: "Dog Poop detected",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceDetectionStatisticsWorkingDaysProperty = {
    key: types_1.CommandType.CMD_GET_WORKING_DAYS_HB3,
    name: PropertyName.DeviceDetectionStatisticsWorkingDays,
    label: "Detection Statistics - Working Days",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.DeviceDetectionStatisticsDetectedEventsProperty = {
    key: types_1.CommandType.CMD_GET_DETECTED_EVENTS_HB3,
    name: PropertyName.DeviceDetectionStatisticsDetectedEvents,
    label: "Detection Statistics - Detected Events",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.DeviceDetectionStatisticsRecordedEventsProperty = {
    key: types_1.CommandType.CMD_GET_RECORDED_EVENTS_HB3,
    name: PropertyName.DeviceDetectionStatisticsRecordedEvents,
    label: "Detection Statistics - Recorded Events",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.DevicePictureProperty = {
    key: "custom_picture",
    name: PropertyName.DevicePicture,
    label: "Last Camera Picture",
    readable: true,
    writeable: false,
    type: "object",
    default: null,
};
exports.DeviceLightSettingsManualDailyLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_DAILY_LIGHTING,
    name: PropertyName.DeviceLightSettingsManualDailyLighting,
    label: "Light Setting Manual Daily Lighting Selection",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        "0": "Cold",
        "1": "Warm",
        "2": "Very warm",
    },
};
exports.DeviceLightSettingsManualColoredLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_COLORED_LIGHTING,
    name: PropertyName.DeviceLightSettingsManualColoredLighting,
    label: "Light Setting Manual Colored Lighting Selection",
    readable: true,
    writeable: true,
    type: "object",
    isValidObject: (obj) => {
        return typeof obj === "object" && "red" in obj && "green" in obj && "blue" in obj && typeof obj.red === "number" && typeof obj.green === "number" && typeof obj.blue === "number";
    },
};
exports.DeviceLightSettingsManualDynamicLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_DYNAMIC_LIGHTING,
    name: PropertyName.DeviceLightSettingsManualDynamicLighting,
    label: "Light Setting Manual Dynamic Lighting Selection",
    readable: true,
    writeable: true,
    type: "number",
};
exports.DeviceLightSettingsManualLightingActiveModeProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_MANUAL_LIGHTING_ACTIVE_MODE,
    name: PropertyName.DeviceLightSettingsManualLightingActiveMode,
    label: "Light Setting Manual Lighting Active Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        "0": "Daily",
        "1": "Colored",
        "2": "Dynamic",
    },
};
exports.DeviceLightSettingsMotionDailyLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_DAILY_LIGHTING,
    name: PropertyName.DeviceLightSettingsMotionDailyLighting,
    label: "Light Setting Motion Daily Lighting Selection",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        "0": "Cold",
        "1": "Warm",
        "2": "Very warm",
    },
};
exports.DeviceLightSettingsMotionColoredLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_COLORED_LIGHTING,
    name: PropertyName.DeviceLightSettingsMotionColoredLighting,
    label: "Light Setting Motion Colored Lighting Selection",
    readable: true,
    writeable: true,
    type: "object",
    isValidObject: (obj) => {
        return typeof obj === "object" && "red" in obj && "green" in obj && "blue" in obj && typeof obj.red === "number" && typeof obj.green === "number" && typeof obj.blue === "number";
    },
};
exports.DeviceLightSettingsMotionDynamicLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_DYNAMIC_LIGHTING,
    name: PropertyName.DeviceLightSettingsMotionDynamicLighting,
    label: "Light Setting Motion Dynamic Lighting Selection",
    readable: true,
    writeable: true,
    type: "number",
};
exports.DeviceLightSettingsMotionLightingActiveModeProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_MOTION_LIGHTING_ACTIVE_MODE,
    name: PropertyName.DeviceLightSettingsMotionLightingActiveMode,
    label: "Light Setting Motion Lighting Active Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        "0": "Daily",
        "1": "Colored",
        "2": "Dynamic",
    },
};
exports.DeviceLightSettingsScheduleDailyLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_DAILY_LIGHTING,
    name: PropertyName.DeviceLightSettingsScheduleDailyLighting,
    label: "Light Setting Schedule Daily Lighting Selection",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        "0": "Cold",
        "1": "Warm",
        "2": "Very warm",
    },
};
exports.DeviceLightSettingsScheduleColoredLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_COLORED_LIGHTING,
    name: PropertyName.DeviceLightSettingsScheduleColoredLighting,
    label: "Light Setting Schedule Colored Lighting Selection",
    readable: true,
    writeable: true,
    type: "object",
    isValidObject: (obj) => {
        return typeof obj === "object" && "red" in obj && "green" in obj && "blue" in obj && typeof obj.red === "number" && typeof obj.green === "number" && typeof obj.blue === "number";
    },
};
exports.DeviceLightSettingsScheduleDynamicLightingProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_DYNAMIC_LIGHTING,
    name: PropertyName.DeviceLightSettingsScheduleDynamicLighting,
    label: "Light Setting Schedule Dynamic Lighting Selection",
    readable: true,
    writeable: true,
    type: "number",
};
exports.DeviceLightSettingsScheduleLightingActiveModeProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_SCHEDULE_LIGHTING_ACTIVE_MODE,
    name: PropertyName.DeviceLightSettingsScheduleLightingActiveMode,
    label: "Light Setting Schedule Lighting Active Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        "0": "Daily",
        "1": "Colored",
        "2": "Dynamic",
    },
};
exports.DeviceLightSettingsColoredLightingColorsProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_COLORED_LIGHTING_COLORS,
    name: PropertyName.DeviceLightSettingsColoredLightingColors,
    label: "Light Setting Colored Lighting Colors",
    readable: true,
    writeable: true,
    type: "object",
    isValidObject: (obj) => {
        if (Array.isArray(obj)) {
            return obj.length > 0 &&
                obj.every((value) => {
                    return typeof value === "object" &&
                        "red" in value &&
                        "green" in value &&
                        "blue" in value &&
                        typeof value.red === "number" &&
                        value.red >= 0 &&
                        value.red <= 255 &&
                        typeof value.green === "number" &&
                        value.green >= 0 &&
                        value.green <= 255 &&
                        typeof value.blue === "number" &&
                        value.blue >= 0 &&
                        value.blue <= 255;
                });
        }
        return false;
    },
};
exports.DeviceLightSettingsDynamicLightingThemesProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_SETTINGS_DYNAMIC_LIGHTING_THEMES,
    name: PropertyName.DeviceLightSettingsDynamicLightingThemes,
    label: "Light Setting Dynamic Lighting Themes",
    readable: true,
    writeable: true,
    type: "object",
    isValidObject: (obj) => {
        if (Array.isArray(obj)) {
            return obj.length > 0 &&
                obj.every((value) => {
                    return typeof value === "object" &&
                        "name" in value &&
                        "mode" in value &&
                        "speed" in value &&
                        "colors" in value &&
                        typeof value.name === "string" &&
                        value.name !== "" &&
                        typeof value.mode === "number" &&
                        value.mode in DynamicLightingEffect &&
                        typeof value.speed === "number" &&
                        [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000].includes(value.speed) && // msec.
                        Array.isArray(value.colors) &&
                        value.colors.length > 0 &&
                        value.colors.length <= 5 &&
                        value.colors.every((value) => {
                            return typeof value === "object" &&
                                "red" in value &&
                                "green" in value &&
                                "blue" in value &&
                                typeof value.red === "number" &&
                                value.red >= 0 &&
                                value.red <= 255 &&
                                typeof value.green === "number" &&
                                value.green >= 0 &&
                                value.green <= 255 &&
                                typeof value.blue === "number" &&
                                value.blue >= 0 &&
                                value.blue <= 255;
                        });
                });
        }
        return false;
    },
};
exports.DeviceDoorControlWarningProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorControlWarning,
    label: "Door Control Warning",
    readable: true,
    writeable: true,
    type: "boolean",
    commandId: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_CONTROL_WARNING,
};
exports.DeviceDoor1OpenProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_STATUS,
    name: PropertyName.DeviceDoor1Open,
    label: "Door 1 Open",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceDoor2OpenProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_STATUS,
    name: PropertyName.DeviceDoor2Open,
    label: "Door 2 Open",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceDoorSensor1StatusProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor1Status,
    label: "Door Sensor 1 Status",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Offline",
        1: "Online"
    }
};
exports.DeviceDoorSensor2StatusProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor2Status,
    label: "Door Sensor 2 Status",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Offline",
        1: "Online"
    },
    default: 0
};
exports.DeviceDoorSensor1MacAddressProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor1MacAddress,
    label: "Door Sensor 1 Mac Address",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceDoorSensor2MacAddressProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor2MacAddress,
    label: "Door Sensor 2 Mac Address",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceDoorSensor1NameProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor1Name,
    label: "Door Sensor 1 Name",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceDoorSensor2NameProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor2Name,
    label: "Door Sensor 2 Name",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceDoorSensor1SerialNumberProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor1SerialNumber,
    label: "Door Sensor 1 Serial Number",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceDoorSensor2SerialNumberProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor2SerialNumber,
    label: "Door Sensor 2 Serial Number",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceDoorSensor1VersionProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor1Version,
    label: "Door Sensor 1 Version",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceDoorSensor2VersionProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor2Version,
    label: "Door Sensor 2 Version",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceDoorSensor1LowBatteryProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_STATUS,
    name: PropertyName.DeviceDoorSensor1LowBattery,
    label: "Door Sensor 1 Low Battery",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceDoorSensor2LowBatteryProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_STATUS,
    name: PropertyName.DeviceDoorSensor2LowBattery,
    label: "Door Sensor 2 Low Battery",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceDoorSensor1BatteryLevelProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor1BatteryLevel,
    label: "Door Sensor 1 Battery Level",
    readable: true,
    writeable: false,
    type: "number",
    min: 0,
    max: 5,
    default: 0
};
exports.DeviceDoorSensor2BatteryLevelProperty = {
    key: types_1.CommandType.CMD_CAMERA_GARAGE_DOOR_SENSORS,
    name: PropertyName.DeviceDoorSensor2BatteryLevel,
    label: "Door Sensor 2 Battery Level",
    readable: true,
    writeable: false,
    type: "number",
    min: 0,
    max: 5,
    default: 0
};
exports.DeviceLocationCoordinatesProperty = {
    key: types_1.TrackerCommandType.COMMAND_NEW_LOCATION,
    name: PropertyName.DeviceLocationCoordinates,
    label: "Location Coordinates",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceLocationAddressProperty = {
    key: types_1.TrackerCommandType.LOCATION_NEW_ADDRESS,
    name: PropertyName.DeviceLocationAddress,
    label: "Location Address",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceLocationLastUpdateProperty = {
    key: types_1.TrackerCommandType.COMMAND_NEW_LOCATION,
    name: PropertyName.DeviceLocationLastUpdate,
    label: "Location Last Update",
    readable: true,
    writeable: false,
    type: "number",
    default: 0
};
exports.DeviceTrackerTypeProperty = {
    key: types_1.TrackerCommandType.TYPE_ICON_INDEX,
    name: PropertyName.DeviceTrackerType,
    label: "Tracker Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Tracker",
        1: "Key",
        2: "Wallet",
        3: "Bag",
        4: "Remote",
        5: "Camera",
        6: "Headphones",
        7: "Toy",
        8: "Suitcase",
        9: "Handbag",
    }
};
exports.DeviceLeftBehindAlarmProperty = {
    key: types_1.TrackerCommandType.COMMAND_ANTILOST,
    name: PropertyName.DeviceLeftBehindAlarm,
    label: "Left Behind Alarm",
    readable: true,
    writeable: true,
    type: "boolean",
    default: false,
};
exports.DeviceFindPhoneProperty = {
    key: types_1.TrackerCommandType.COMMAND_TYPE_FINDMYPHONE,
    name: PropertyName.DeviceFindPhone,
    label: "Find Phone",
    readable: true,
    writeable: true,
    type: "boolean",
    default: false,
};
exports.DeviceFlickerAdjustmentProperty = {
    key: types_1.CommandType.CMD_SET_FLICKER_ADJUSTMENT,
    name: PropertyName.DeviceFlickerAdjustment,
    label: "Flicker Adjustment",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "50Hz",
        2: "60Hz",
    }
};
exports.DeviceNotificationPersonS350Property = {
    key: types_1.CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE,
    name: PropertyName.DeviceNotificationPerson,
    label: "Notification Person detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationPetS350Property = {
    key: types_1.CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE,
    name: PropertyName.DeviceNotificationPet,
    label: "Notification Pet detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationAllOtherMotionS350Property = {
    key: types_1.CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE,
    name: PropertyName.DeviceNotificationAllOtherMotion,
    label: "Notification All Other Motion",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationAllSoundS350Property = {
    key: types_1.CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE,
    name: PropertyName.DeviceNotificationAllSound,
    label: "Notification Sound detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationCryingS350Property = {
    key: types_1.CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE,
    name: PropertyName.DeviceNotificationCrying,
    label: "Notification Crying detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNotificationVehicleProperty = {
    key: types_1.CommandType.CMD_INDOOR_SET_MOTION_DETECTION_TYPE,
    name: PropertyName.DeviceNotificationVehicle,
    label: "Notification Vehicle detected",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceLeavingDetectionProperty = {
    key: types_1.CommandType.CMD_MOTION_SET_LEAVING_DETECTION,
    name: PropertyName.DeviceLeavingDetection,
    label: "Leaving Detection",
    readable: true,
    writeable: true,
    type: "boolean",
    default: false,
};
exports.DeviceLeavingReactionNotificationProperty = {
    key: types_1.CommandType.CMD_MOTION_SET_LEAVING_REACTIONS,
    name: PropertyName.DeviceLeavingReactionNotification,
    label: "Leaving Reaction Notification",
    readable: true,
    writeable: true,
    type: "boolean",
    default: false,
};
exports.DeviceLeavingReactionStartTimeProperty = {
    key: types_1.CommandType.CMD_MOTION_SET_LEAVING_REACTIONS,
    name: PropertyName.DeviceLeavingReactionStartTime,
    label: "Leaving Reaction Starttime (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "0:00",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceLeavingReactionEndTimeProperty = {
    key: types_1.CommandType.CMD_MOTION_SET_LEAVING_REACTIONS,
    name: PropertyName.DeviceLeavingReactionEndTime,
    label: "Leaving Reaction Endtime (24-hour clock)",
    readable: true,
    writeable: true,
    type: "string",
    default: "23:59",
    format: /^[0-9]{1,2}:[0-9]{1,2}$/,
};
exports.DeviceSomeoneGoingProperty = {
    key: "custom_someoneGoing",
    name: PropertyName.DeviceSomeoneGoing,
    label: "Someone Going",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceLockEventOriginProperty = {
    key: "custom_lockEventOrigin",
    name: PropertyName.DeviceLockEventOrigin,
    label: "Lock Event Origin",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "None",
        1: "Automatic",
        2: "Manual",
        3: "App",
        4: "Password",
        5: "Fingerprint",
        6: "Temporary Password",
        7: "Keypad",
    },
    default: 0,
};
exports.DeviceBeepVolumeProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_VOLUME,
    name: PropertyName.DeviceBeepVolume,
    label: "Beep Volume",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Mute",
        1: "Soft",
        2: "Medium",
        3: "Loud",
    },
};
exports.DeviceNightvisionOptimizationProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_NIGHT_VISION_ENHANCE,
    name: PropertyName.DeviceNightvisionOptimization,
    label: "Nighvision Optimization",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceNightvisionOptimizationSideProperty = {
    key: types_1.CommandType.CMD_SMARTLOCK_NIGHT_VISION_SIDE,
    name: PropertyName.DeviceNightvisionOptimizationSide,
    label: "Nighvision Optimization Side",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Left",
        2: "Right",
    },
};
exports.DeviceOpenMethodProperty = {
    //TODO: Check cloud property ID
    key: types_1.CommandType.CMD_SMART_DROP_DELIVERY_MODE,
    name: PropertyName.DeviceOpenMethod,
    label: "Open Method",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Auto Switch (Recommended)",
        1: "Open via PIN",
        2: "Press to Open",
    },
};
exports.DeviceMotionActivatedPromptProperty = {
    key: types_1.CommandType.CMD_SET_AUDIO_MOTION_ACTIVATED_PROMPT,
    name: PropertyName.DeviceMotionActivatedPrompt,
    label: "Motion-Activated Prompt",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.DeviceOpenProperty = {
    key: types_1.CommandType.CMD_SMART_DROP_OPEN,
    name: PropertyName.DeviceOpen,
    label: "Open",
    readable: true,
    writeable: false,
    type: "boolean",
};
exports.DeviceOpenedByTypeProperty = {
    key: "custom_openedByType",
    name: PropertyName.DeviceOpenedByType,
    label: "Opened By Type",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "None",
        1: "App",
        2: "Master PIN",
        3: "Delivery PIN",
        4: "Without Key",
        5: "Emergency Release Button",
        6: "Key",
    },
    default: 0,
};
exports.DeviceOpenedByNameProperty = {
    key: "custom_openedByName",
    name: PropertyName.DeviceOpenedByName,
    label: "Opened By Name",
    readable: true,
    writeable: false,
    type: "string",
    default: "",
};
exports.DeviceTamperingAlertProperty = {
    key: "custom_tamperingAlert",
    name: PropertyName.DeviceTamperingAlert,
    label: "Tampering Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceLowTemperatureAlertProperty = {
    key: "custom_lowTemperatureAlert",
    name: PropertyName.DeviceLowTemperatureAlert,
    label: "Low Temperature Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceHighTemperatureAlertProperty = {
    key: "custom_highTemperatureAlert",
    name: PropertyName.DeviceHighTemperatureAlert,
    label: "High Temperature Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceLidStuckAlertProperty = {
    key: "custom_lidStuckAlert",
    name: PropertyName.DeviceLidStuckAlert,
    label: "Lid Stuck Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DevicePinIncorrectAlertProperty = {
    key: "custom_pinIncorrectAlert",
    name: PropertyName.DevicePinIncorrectAlert,
    label: "PIN Incorrect Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceBatteryFullyChargedAlertProperty = {
    key: "custom_batteryFullyChargedAlert",
    name: PropertyName.DeviceBatteryFullyChargedAlert,
    label: "Battery Fully Charged Alert",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceIsDeliveryDeniedProperty = {
    key: types_1.CommandType.CMD_SMART_DROP_IS_DENIED_DELIVERY,
    name: PropertyName.DeviceIsDeliveryDenied,
    label: "Is Delivery Denied",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceHasMasterPinProperty = {
    key: types_1.CommandType.CMD_SMART_DROP_HAS_MASTER_PIN,
    name: PropertyName.DeviceHasMasterPin,
    label: "Has Master PIN",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.DeviceDeliveriesProperty = {
    key: types_1.CommandType.CMD_SMART_DROP_IS_PIN_REQUIRED,
    name: PropertyName.DeviceDeliveries,
    label: "Deliveries",
    readable: true,
    writeable: false,
    type: "number",
    default: 0,
};
exports.FloodlightT8420XDeviceProperties = {
    ...exports.GenericDeviceProperties,
    [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
    [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
    [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
    [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
    [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
    [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
    [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
    [PropertyName.DevicePicture]: exports.DevicePictureProperty,
    [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
    [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
    [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
    [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
    [PropertyName.DeviceLightSettingsBrightnessMotion]: exports.DeviceFloodlightLightSettingsBrightnessMotionProperty,
    [PropertyName.DeviceLightSettingsBrightnessSchedule]: exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty,
    [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredProperty,
    [PropertyName.DeviceLightSettingsMotionTriggeredDistance]: exports.DeviceFloodlightLightSettingsMotionTriggeredDistanceProperty,
    [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
    [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
    [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
    [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
    [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
    [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
    [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeFloodlightProperty,
    [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthFloodlightProperty,
    [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalFloodlightProperty,
    [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
    [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
    [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
    [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
    [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
    [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
    [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
};
exports.WiredDoorbellT8200XDeviceProperties = {
    ...exports.GenericDeviceProperties,
    [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
    [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
    [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
    [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
    [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedT8200XProperty,
    [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
    [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
    [PropertyName.DeviceState]: exports.DeviceStateProperty,
    [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
    [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
    [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
    [PropertyName.DevicePicture]: exports.DevicePictureProperty,
    [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
    [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
    [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeT8200XProperty,
    [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
    [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeT8200XProperty,
    [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
    [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
    [PropertyName.DeviceVideoHDR]: exports.DeviceVideoHDRWiredDoorbellProperty,
    [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
    [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingWiredDoorbellProperty,
    [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionWiredDoorbellProperty,
    [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
    [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
    [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
    //[PropertyName.DeviceSnoozeHomebase]: DeviceSnoozeHomebaseProperty,
    [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
    [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
    [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityT8200XProperty,
    [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorT8200XProperty,
};
exports.LockT8510PDeviceProperties = {
    ...exports.GenericDeviceProperties,
    [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
    [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
    [PropertyName.DeviceLockStatus]: exports.DeviceAdvancedLockStatusProperty,
    [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
    [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
    [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
    [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
    [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
    [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
    [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
    [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
    [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
    [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
    [PropertyName.DeviceSound]: exports.DeviceSoundProperty,
    [PropertyName.DeviceNotification]: exports.DeviceNotificationSmartLockProperty,
    [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedSmartLockProperty,
    [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedSmartLockProperty,
    [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
    [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
    [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
};
exports.LockT8520PDeviceProperties = {
    ...exports.GenericDeviceProperties,
    [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
    [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
    [PropertyName.DeviceLockStatus]: exports.DeviceAdvancedLockStatusProperty,
    [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
    [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
    [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
    [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
    [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
    [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
    [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
    [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
    [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
    [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
    [PropertyName.DeviceSound]: exports.DeviceSoundProperty,
    [PropertyName.DeviceNotification]: exports.DeviceNotificationSmartLockProperty,
    [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedSmartLockProperty,
    [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedSmartLockProperty,
    [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
    [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
    [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
};
exports.DeviceProperties = {
    [DeviceType.CAMERA2]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.CAMERA2C]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceCameraLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.CAMERA2C_PRO]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityCameraProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityCamera2CProProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceCameraLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.CAMERA2_PRO]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.CAMERA3]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeCamera3Property,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityCamera3Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityCamera3Property,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceLightSettingsBrightnessManualCamera3Property,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
    },
    [DeviceType.CAMERA3C]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeCamera3Property,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityCamera3Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityCamera3Property,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceLightSettingsBrightnessManualCamera3Property,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
    },
    [DeviceType.CAMERA3_PRO]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeCamera3Property,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityCamera3Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityCamera3Property,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceLightSettingsBrightnessManualCamera3Property,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
    },
    [DeviceType.PROFESSIONAL_247]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty, //TODO: Check cloud property id
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeCamera3Property,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty, //Placeholder...
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityCameraProfessionalProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceLightSettingsBrightnessManualCamera3Property,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceImageMirrored]: exports.DeviceImageMirroredProperty,
        [PropertyName.DeviceFlickerAdjustment]: exports.DeviceFlickerAdjustmentProperty,
    },
    [DeviceType.CAMERA]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera1Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionCamera1Property,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.CAMERA_E]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera1Property,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionCamera1Property,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.DOORBELL]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionDoorbellProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedDoorbellProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceHiddenMotionDetectionSensitivity]: exports.DeviceHiddenMotionDetectionSensitivityWiredDoorbellProperty,
        [PropertyName.DeviceHiddenMotionDetectionMode]: exports.DeviceHiddenMotionDetectionModeWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityWiredDoorbellProperty,
        [PropertyName.DeviceVideoHDR]: exports.DeviceVideoHDRWiredDoorbellProperty,
        [PropertyName.DeviceVideoDistortionCorrection]: exports.DeviceVideoDistortionCorrectionWiredDoorbellProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityWiredDoorbellProperty,
        [PropertyName.DeviceVideoRingRecord]: exports.DeviceVideoRingRecordWiredDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingWiredDoorbellProperty,
        [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorWiredDoorbellProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeWiredDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeWiredDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingWiredDoorbellProperty,
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionWiredDoorbellProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeWiredDoorbellProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeWiredDoorbellProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoWDR]: exports.DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: exports.DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DeviceSnoozeHomebase]: exports.DeviceSnoozeHomebaseProperty,
        [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
        [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL_2]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoWDR]: exports.DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: exports.DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeHomebase]: exports.DeviceSnoozeHomebaseProperty,
        [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
        [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL_PLUS]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedBatteryDoorbellDualProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoWDR]: exports.DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: exports.DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionProperty,
        [PropertyName.DeviceNotificationRadarDetector]: exports.DeviceNotificationRadarDetectorProperty,
        [PropertyName.DeviceMotionDetectionSensitivityMode]: exports.DeviceMotionDetectionSensitivityModeProperty,
        [PropertyName.DeviceMotionDetectionSensitivityStandard]: exports.DeviceMotionDetectionSensitivityStandardProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedA]: exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedB]: exports.DeviceMotionDetectionSensitivityAdvancedBProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedC]: exports.DeviceMotionDetectionSensitivityAdvancedCProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedD]: exports.DeviceMotionDetectionSensitivityAdvancedDProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedE]: exports.DeviceMotionDetectionSensitivityAdvancedEProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedF]: exports.DeviceMotionDetectionSensitivityAdvancedFProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedG]: exports.DeviceMotionDetectionSensitivityAdvancedGProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedH]: exports.DeviceMotionDetectionSensitivityAdvancedHProperty,
        [PropertyName.DeviceLoiteringDetection]: exports.DeviceLoiteringDetectionProperty,
        [PropertyName.DeviceLoiteringDetectionLength]: exports.DeviceLoiteringDetectionLengthProperty,
        [PropertyName.DeviceLoiteringDetectionRange]: exports.DeviceLoiteringDetectionRangeProperty,
        [PropertyName.DeviceLoiteringCustomResponsePhoneNotification]: exports.DeviceLoiteringCustomResponsePhoneNotificationProperty,
        [PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse]: exports.DeviceLoiteringCustomResponseAutoVoiceResponseProperty,
        [PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice]: exports.DeviceLoiteringCustomResponseAutoVoiceResponseVoiceProperty,
        [PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification]: exports.DeviceLoiteringCustomResponseHomeBaseNotificationProperty,
        [PropertyName.DeviceLoiteringCustomResponseTimeFrom]: exports.DeviceLoiteringCustomResponseTimeFromProperty,
        [PropertyName.DeviceLoiteringCustomResponseTimeTo]: exports.DeviceLoiteringCustomResponseTimeToProperty,
        [PropertyName.DeviceDeliveryGuard]: exports.DeviceDeliveryGuardProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuarding]: exports.DeviceDeliveryGuardPackageGuardingProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom]: exports.DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo]: exports.DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice]: exports.DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty,
        [PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance]: exports.DeviceDeliveryGuardPackageLiveCheckAssistanceProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlert]: exports.DeviceDeliveryGuardUncollectedPackageAlertProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck]: exports.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeProperty,
        [PropertyName.DeviceRingAutoResponse]: exports.DeviceRingAutoResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponse]: exports.DeviceRingAutoResponseVoiceResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponseVoice]: exports.DeviceRingAutoResponseVoiceResponseVoiceProperty,
        [PropertyName.DeviceRingAutoResponseTimeFrom]: exports.DeviceRingAutoResponseTimeFromProperty,
        [PropertyName.DeviceRingAutoResponseTimeTo]: exports.DeviceRingAutoResponseTimeToProperty,
        [PropertyName.DevicePackageDelivered]: exports.DevicePackageDeliveredProperty,
        [PropertyName.DevicePackageStranded]: exports.DevicePackageStrandedProperty,
        [PropertyName.DevicePackageTaken]: exports.DevicePackageTakenProperty,
        [PropertyName.DeviceSomeoneLoitering]: exports.DeviceSomeoneLoiteringProperty,
        [PropertyName.DeviceRadarMotionDetected]: exports.DeviceRadarMotionDetectedProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DeviceSnoozeHomebase]: exports.DeviceSnoozeHomebaseProperty,
        [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
        [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL_C30]: {
        ...exports.BaseDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityDoorbellE340Property,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityDoorbellE340Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityDoorbellE340Property,
        [PropertyName.DeviceVideoWDR]: exports.DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: exports.DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DeviceSnoozeHomebase]: exports.DeviceSnoozeHomebaseProperty,
        [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
        [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL_C31]: {
        ...exports.BaseDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityDoorbellE340Property,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityDoorbellE340Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityDoorbellE340Property,
        [PropertyName.DeviceVideoWDR]: exports.DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: exports.DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DeviceSnoozeHomebase]: exports.DeviceSnoozeHomebaseProperty,
        [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
        [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.BATTERY_DOORBELL_PLUS_E340]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedBatteryDoorbellProperty,
        //[PropertyName.DeviceLight]: DeviceFloodlightLightProperty,   TODO: DISABLED => when the light is activated, this event is communicated via the p2p connection with the wrong channel of the device if the doorbell is connected to the station. e.g. the device is assigned to channel 2, but the event is communicated for the device on channel 0, which is wrong
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityDoorbellE340Property,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityDoorbellE340Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityDoorbellE340Property,
        [PropertyName.DeviceVideoWDR]: exports.DeviceWDRProperty,
        [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: exports.DeviceChimeHomebaseBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebaseRingtoneType]: exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionProperty,
        [PropertyName.DeviceDeliveryGuard]: exports.DeviceDeliveryGuardProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuarding]: exports.DeviceDeliveryGuardPackageGuardingProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom]: exports.DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo]: exports.DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice]: exports.DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty,
        [PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance]: exports.DeviceDeliveryGuardPackageLiveCheckAssistanceProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlert]: exports.DeviceDeliveryGuardUncollectedPackageAlertProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck]: exports.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeE340Property,
        [PropertyName.DeviceRingAutoResponse]: exports.DeviceRingAutoResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponse]: exports.DeviceRingAutoResponseVoiceResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponseVoice]: exports.DeviceRingAutoResponseVoiceResponseVoiceProperty,
        [PropertyName.DeviceRingAutoResponseTimeFrom]: exports.DeviceRingAutoResponseTimeFromProperty,
        [PropertyName.DeviceRingAutoResponseTimeTo]: exports.DeviceRingAutoResponseTimeToProperty,
        [PropertyName.DevicePackageDelivered]: exports.DevicePackageDeliveredProperty,
        [PropertyName.DevicePackageStranded]: exports.DevicePackageStrandedProperty,
        [PropertyName.DevicePackageTaken]: exports.DevicePackageTakenProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DeviceSnoozeHomebase]: exports.DeviceSnoozeHomebaseProperty,
        [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
        [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.DOORBELL_SOLO]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedBatteryDoorbellProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeBatteryDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoWDR]: exports.DeviceWDRProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeBatteryDoorbellProperty,
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingProperty,
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionProperty,
        [PropertyName.DeviceDeliveryGuard]: exports.DeviceDeliveryGuardProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuarding]: exports.DeviceDeliveryGuardPackageGuardingProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeFrom]: exports.DeviceDeliveryGuardPackageGuardingActivatedTimeFromProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingActivatedTimeTo]: exports.DeviceDeliveryGuardPackageGuardingActivatedTimeToProperty,
        [PropertyName.DeviceDeliveryGuardPackageGuardingVoiceResponseVoice]: exports.DeviceDeliveryGuardPackageGuardingVoiceResponseVoiceProperty,
        [PropertyName.DeviceDeliveryGuardPackageLiveCheckAssistance]: exports.DeviceDeliveryGuardPackageLiveCheckAssistanceProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlert]: exports.DeviceDeliveryGuardUncollectedPackageAlertProperty,
        [PropertyName.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheck]: exports.DeviceDeliveryGuardUncollectedPackageAlertTimeToCheckProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeProperty,
        [PropertyName.DeviceRingAutoResponse]: exports.DeviceRingAutoResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponse]: exports.DeviceRingAutoResponseVoiceResponseProperty,
        [PropertyName.DeviceRingAutoResponseVoiceResponseVoice]: exports.DeviceRingAutoResponseVoiceResponseVoiceProperty,
        [PropertyName.DeviceRingAutoResponseTimeFrom]: exports.DeviceRingAutoResponseTimeFromProperty,
        [PropertyName.DeviceRingAutoResponseTimeTo]: exports.DeviceRingAutoResponseTimeToProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DeviceSnoozeHomebase]: exports.DeviceSnoozeHomebaseProperty,
        [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
        [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DevicePackageDelivered]: exports.DevicePackageDeliveredProperty,
        [PropertyName.DevicePackageStranded]: exports.DevicePackageStrandedProperty,
        [PropertyName.DevicePackageTaken]: exports.DevicePackageTakenProperty,
        [PropertyName.DeviceSomeoneLoitering]: exports.DeviceSomeoneLoiteringProperty,
    },
    [DeviceType.LOCK_8530]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty, //OK
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty, //OK
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty, //OK
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property, //OK
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceRinging]: exports.DeviceRingingProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty, //OK
        [PropertyName.DeviceRingtoneVolume]: exports.DeviceRingtoneVolumeBatteryDoorbellProperty, //OK
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty, // OK
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeBatteryDoorbellProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalBatteryDoorbellProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityBatteryDoorbellProperty, //OK
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityT8530Property, //OK
        [PropertyName.DeviceChimeIndoor]: exports.DeviceChimeIndoorBatteryDoorbellProperty,
        [PropertyName.DeviceChimeHomebase]: exports.DeviceChimeHomebaseBatteryDoorbellProperty, //OK
        [PropertyName.DeviceChimeHomebaseRingtoneVolume]: exports.DeviceChimeHomebaseRingtoneVolumeBatteryDoorbellProperty, //OK
        [PropertyName.DeviceChimeHomebaseRingtoneType]: exports.DeviceChimeHomebaseRingtoneTypeBatteryDoorbellProperty, //OK
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeBatteryDoorbellProperty, //OK
        [PropertyName.DeviceNotificationRing]: exports.DeviceNotificationRingProperty, //OK
        [PropertyName.DeviceNotificationMotion]: exports.DeviceNotificationMotionProperty, //OK
        [PropertyName.DeviceMotionDetectionSensitivityMode]: exports.DeviceMotionDetectionSensitivityModeProperty,
        [PropertyName.DeviceMotionDetectionSensitivityStandard]: exports.DeviceMotionDetectionSensitivityStandardProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedA]: exports.DeviceMotionDetectionSensitivityAdvancedAProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedB]: exports.DeviceMotionDetectionSensitivityAdvancedBProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedC]: exports.DeviceMotionDetectionSensitivityAdvancedCProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedD]: exports.DeviceMotionDetectionSensitivityAdvancedDProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedE]: exports.DeviceMotionDetectionSensitivityAdvancedEProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedF]: exports.DeviceMotionDetectionSensitivityAdvancedFProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedG]: exports.DeviceMotionDetectionSensitivityAdvancedGProperty,
        [PropertyName.DeviceMotionDetectionSensitivityAdvancedH]: exports.DeviceMotionDetectionSensitivityAdvancedHProperty,
        [PropertyName.DeviceLoiteringDetection]: exports.DeviceLoiteringDetectionProperty, //OK
        [PropertyName.DeviceLoiteringDetectionLength]: exports.DeviceLoiteringDetectionLengthProperty,
        [PropertyName.DeviceLoiteringDetectionRange]: exports.DeviceLoiteringDetectionRangeProperty,
        [PropertyName.DeviceLoiteringCustomResponsePhoneNotification]: exports.DeviceLoiteringCustomResponsePhoneNotificationProperty,
        [PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponse]: exports.DeviceLoiteringCustomResponseAutoVoiceResponseProperty,
        [PropertyName.DeviceLoiteringCustomResponseAutoVoiceResponseVoice]: exports.DeviceLoiteringCustomResponseAutoVoiceResponseVoiceProperty,
        [PropertyName.DeviceLoiteringCustomResponseHomeBaseNotification]: exports.DeviceLoiteringCustomResponseHomeBaseNotificationProperty,
        [PropertyName.DeviceLoiteringCustomResponseTimeFrom]: exports.DeviceLoiteringCustomResponseTimeFromProperty,
        [PropertyName.DeviceLoiteringCustomResponseTimeTo]: exports.DeviceLoiteringCustomResponseTimeToProperty,
        [PropertyName.DeviceSomeoneLoitering]: exports.DeviceSomeoneLoiteringProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DeviceSnoozeHomebase]: exports.DeviceSnoozeHomebaseProperty,
        [PropertyName.DeviceSnoozeChime]: exports.DeviceSnoozeChimeProperty,
        [PropertyName.DeviceSnoozeMotion]: exports.DeviceSnoozeMotionProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceBasicLockStatusProperty,
        [PropertyName.DeviceLeavingDetection]: exports.DeviceLeavingDetectionProperty,
        [PropertyName.DeviceLeavingReactionNotification]: exports.DeviceLeavingReactionNotificationProperty,
        [PropertyName.DeviceLeavingReactionStartTime]: exports.DeviceLeavingReactionStartTimeProperty,
        [PropertyName.DeviceLeavingReactionEndTime]: exports.DeviceLeavingReactionEndTimeProperty,
        [PropertyName.DeviceSomeoneGoing]: exports.DeviceSomeoneGoingProperty,
        [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
        [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedProperty,
        [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedProperty,
        [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
        [PropertyName.DeviceBeepVolume]: exports.DeviceBeepVolumeProperty,
        [PropertyName.DeviceNightvisionOptimization]: exports.DeviceNightvisionOptimizationProperty,
        [PropertyName.DeviceNightvisionOptimizationSide]: exports.DeviceNightvisionOptimizationSideProperty,
    },
    [DeviceType.FLOODLIGHT]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkBatteryDoorbellCamera1Property,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: exports.DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredDistance]: exports.DeviceFloodlightLightSettingsMotionTriggeredDistanceProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityFloodlightT8420Property,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeFloodlightT8420Property,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingFloodlightT8420Property,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionTestMode]: exports.DeviceMotionDetectionTestModeProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8422]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: exports.DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeFloodlightProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8423]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: exports.DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeFloodlightT8423Property,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceMotionDetectionRange]: exports.DeviceMotionDetectionRangeProperty,
        [PropertyName.DeviceMotionDetectionRangeStandardSensitivity]: exports.DeviceMotionDetectionRangeStandardSensitivityProperty,
        [PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity]: exports.DeviceMotionDetectionRangeAdvancedLeftSensitivityProperty,
        [PropertyName.DeviceMotionDetectionRangeAdvancedMiddleSensitivity]: exports.DeviceMotionDetectionRangeAdvancedMiddleSensitivityProperty,
        [PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity]: exports.DeviceMotionDetectionRangeAdvancedRightSensitivityProperty,
        [PropertyName.DeviceMotionDetectionTestMode]: exports.DeviceMotionDetectionTestModeProperty,
        [PropertyName.DeviceMotionTrackingSensitivity]: exports.DeviceMotionTrackingSensitivityProperty,
        [PropertyName.DeviceMotionAutoCruise]: exports.DeviceMotionAutoCruiseProperty,
        [PropertyName.DeviceMotionOutOfViewDetection]: exports.DeviceMotionOutOfViewDetectionProperty,
        [PropertyName.DeviceLightSettingsColorTemperatureManual]: exports.DeviceLightSettingsColorTemperatureManualProperty,
        [PropertyName.DeviceLightSettingsColorTemperatureMotion]: exports.DeviceLightSettingsColorTemperatureMotionProperty,
        [PropertyName.DeviceLightSettingsColorTemperatureSchedule]: exports.DeviceLightSettingsColorTemperatureScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionActivationMode]: exports.DeviceLightSettingsMotionActivationModeProperty,
        [PropertyName.DeviceVideoNightvisionImageAdjustment]: exports.DeviceVideoNightvisionImageAdjustmentProperty,
        [PropertyName.DeviceVideoColorNightvision]: exports.DeviceVideoColorNightvisionProperty,
        [PropertyName.DeviceAutoCalibration]: exports.DeviceAutoCalibrationProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8424]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: exports.DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeFloodlightProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthFloodlightProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalFloodlightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityIndoorProperty,
        //[PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        //[PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8425]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceVehicleDetected]: exports.DeviceVehicleDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorS350Property,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: exports.DeviceFloodlightLightSettingsBrightnessMotionT8425Property,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: exports.DeviceFloodlightLightSettingsBrightnessScheduleT8425Property,
        [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredT8425Property,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: exports.DeviceFloodlightLightSettingsMotionTriggeredTimerT8425Property,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeFloodlightT8423Property,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityS340Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityS340Property,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceMotionDetectionRange]: exports.DeviceMotionDetectionRangeT8425Property,
        [PropertyName.DeviceMotionDetectionRangeStandardSensitivity]: exports.DeviceMotionDetectionRangeStandardSensitivityT8425Property,
        [PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity]: exports.DeviceMotionDetectionRangeAdvancedLeftSensitivityT8425Property,
        [PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity]: exports.DeviceMotionDetectionRangeAdvancedRightSensitivityT8425Property,
        [PropertyName.DeviceMotionDetectionTestMode]: exports.DeviceMotionDetectionTestModeT8425Property,
        [PropertyName.DeviceMotionAutoCruise]: exports.DeviceMotionAutoCruiseProperty,
        [PropertyName.DeviceMotionOutOfViewDetection]: exports.DeviceMotionOutOfViewDetectionProperty,
        [PropertyName.DeviceLightSettingsMotionActivationMode]: exports.DeviceLightSettingsMotionActivationModeT8425Property,
        [PropertyName.DeviceAutoCalibration]: exports.DeviceAutoCalibrationProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeS340Property,
        [PropertyName.DeviceImageMirrored]: exports.DeviceImageMirroredProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonS350Property,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetS350Property,
        [PropertyName.DeviceNotificationVehicle]: exports.DeviceNotificationVehicleProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionS350Property,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8426]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceVehicleDetected]: exports.DeviceVehicleDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorS350Property,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: exports.DeviceFloodlightLightSettingsBrightnessMotionT8425Property,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: exports.DeviceFloodlightLightSettingsBrightnessScheduleT8425Property,
        [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredT8425Property,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: exports.DeviceFloodlightLightSettingsMotionTriggeredTimerT8425Property,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeFloodlightT8423Property,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityS340Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityS340Property,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceMotionDetectionRange]: exports.DeviceMotionDetectionRangeT8425Property,
        [PropertyName.DeviceMotionDetectionRangeStandardSensitivity]: exports.DeviceMotionDetectionRangeStandardSensitivityT8425Property,
        [PropertyName.DeviceMotionDetectionRangeAdvancedLeftSensitivity]: exports.DeviceMotionDetectionRangeAdvancedLeftSensitivityT8425Property,
        [PropertyName.DeviceMotionDetectionRangeAdvancedRightSensitivity]: exports.DeviceMotionDetectionRangeAdvancedRightSensitivityT8425Property,
        [PropertyName.DeviceMotionDetectionTestMode]: exports.DeviceMotionDetectionTestModeT8425Property,
        [PropertyName.DeviceMotionAutoCruise]: exports.DeviceMotionAutoCruiseProperty,
        [PropertyName.DeviceMotionOutOfViewDetection]: exports.DeviceMotionOutOfViewDetectionProperty,
        [PropertyName.DeviceLightSettingsMotionActivationMode]: exports.DeviceLightSettingsMotionActivationModeT8425Property,
        [PropertyName.DeviceAutoCalibration]: exports.DeviceAutoCalibrationProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeS340Property,
        [PropertyName.DeviceImageMirrored]: exports.DeviceImageMirroredProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonS350Property,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetS350Property,
        [PropertyName.DeviceNotificationVehicle]: exports.DeviceNotificationVehicleProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionS350Property,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
    },
    [DeviceType.INDOOR_CAMERA]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: exports.DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_CAMERA_1080]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: exports.DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_COST_DOWN_CAMERA]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledIndoorMiniProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeIndoorMiniProperty,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceDefaultAngle]: exports.DeviceDefaultAngleProperty,
        [PropertyName.DeviceDefaultAngleIdleTime]: exports.DeviceDefaultAngleIdleTimeProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceSoundDetectionRoundLook]: exports.DeviceSoundDetectionRoundLookProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: exports.DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceMotionZone]: exports.DeviceMotionZoneProperty,
        [PropertyName.DeviceImageMirrored]: exports.DeviceImageMirroredProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_1080]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: exports.DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: exports.DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: exports.DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_2K]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledStandaloneProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DevicePetDetection]: exports.DevicePetDetectionProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkIndoorFloodProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeProperty,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeIndoorProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityIndoorProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundProperty,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.OUTDOOR_PT_CAMERA]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingFalseEvents]: exports.DeviceLastChargingFalseEventsProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceVehicleDetected]: exports.DeviceVehicleDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsEnable]: exports.DeviceFloodlightLightSettingsEnableProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionHB3DetectionTypeHumanProperty,
        [PropertyName.DeviceMotionDetectionTypeVehicle]: exports.DeviceMotionHB3DetectionTypeVehicleProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityS340Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityS340Property,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceMotionZone]: exports.DeviceMotionZoneProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthOutdoorPTProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeS340Property,
    },
    [DeviceType.INDOOR_PT_CAMERA_S350]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledIndoorS350Property,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionS350Property,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeS350Property,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionHB3DetectionTypeHumanProperty,
        [PropertyName.DeviceMotionDetectionTypePet]: exports.DeviceMotionHB3DetectionTypePetProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityS350Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityS350Property,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonS350Property,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetS350Property,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionS350Property,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundS350Property,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingS350Property,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceSoundDetectionRoundLook]: exports.DeviceSoundDetectionRoundLookS350Property,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceMotionAutoCruise]: exports.DeviceMotionAutoCruiseProperty,
        [PropertyName.DeviceAutoCalibration]: exports.DeviceAutoCalibrationProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeS340Property,
        [PropertyName.DeviceImageMirrored]: exports.DeviceImageMirroredProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_C210]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledIndoorS350Property,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeS350Property,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionHB3DetectionTypeHumanProperty,
        [PropertyName.DeviceMotionDetectionTypePet]: exports.DeviceMotionHB3DetectionTypePetProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityS350Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityS350Property,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonS350Property,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetS350Property,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionS350Property,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundS350Property,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingS350Property,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceSoundDetectionRoundLook]: exports.DeviceSoundDetectionRoundLookS350Property,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceMotionAutoCruise]: exports.DeviceMotionAutoCruiseProperty,
        [PropertyName.DeviceAutoCalibration]: exports.DeviceAutoCalibrationProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeS340Property,
        [PropertyName.DeviceImageMirrored]: exports.DeviceImageMirroredProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_C220]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledIndoorS350Property,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceSoundDetection]: exports.DeviceSoundDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePetDetected]: exports.DevicePetDetectedProperty,
        [PropertyName.DeviceSoundDetected]: exports.DeviceSoundDetectedProperty,
        [PropertyName.DeviceSoundDetectionType]: exports.DeviceSoundDetectionTypeS350Property,
        [PropertyName.DeviceSoundDetectionSensitivity]: exports.DeviceSoundDetectionSensitivityProperty,
        [PropertyName.DeviceCryingDetected]: exports.DeviceCryingDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedIndoorFloodProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityIndoorProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionHB3DetectionTypeHumanProperty,
        [PropertyName.DeviceMotionDetectionTypePet]: exports.DeviceMotionHB3DetectionTypePetProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityS350Property,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityS350Property,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonS350Property,
        [PropertyName.DeviceNotificationPet]: exports.DeviceNotificationPetS350Property,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionS350Property,
        [PropertyName.DeviceNotificationAllSound]: exports.DeviceNotificationAllSoundS350Property,
        [PropertyName.DeviceNotificationCrying]: exports.DeviceNotificationCryingS350Property,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceMotionTracking]: exports.DeviceMotionTrackingProperty,
        [PropertyName.DeviceSoundDetectionRoundLook]: exports.DeviceSoundDetectionRoundLookS350Property,
        [PropertyName.DeviceRotationSpeed]: exports.DeviceRotationSpeedProperty,
        [PropertyName.DeviceMotionAutoCruise]: exports.DeviceMotionAutoCruiseProperty,
        [PropertyName.DeviceAutoCalibration]: exports.DeviceAutoCalibrationProperty,
        [PropertyName.DeviceDualCamWatchViewMode]: exports.DeviceDualCamWatchViewModeS340Property,
        [PropertyName.DeviceImageMirrored]: exports.DeviceImageMirroredProperty,
        [PropertyName.DeviceNotificationIntervalTime]: exports.DeviceNotificationIntervalTimeProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
    },
    [DeviceType.CAMERA_FG]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingStarlight4gLTEProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        //[PropertyName.DeviceWifiRSSI]: DeviceWifiRSSIProperty,
        //[PropertyName.DeviceWifiSignalLevel]: DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceAntitheftDetection]: exports.DeviceAntitheftDetectionProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
        [PropertyName.DeviceCellularRSSI]: exports.DeviceCellularRSSIProperty,
        [PropertyName.DeviceCellularSignalLevel]: exports.DeviceCellularSignalLevelProperty,
        [PropertyName.DeviceCellularSignal]: exports.DeviceCellularSignalProperty,
        [PropertyName.DeviceCellularBand]: exports.DeviceCellularBandProperty,
        [PropertyName.DeviceCellularIMEI]: exports.DeviceCellularIMEIProperty,
        [PropertyName.DeviceCellularICCID]: exports.DeviceCellularICCIDProperty,
    },
    [DeviceType.SOLO_CAMERA]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_PRO]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_1080]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_2K]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceNightvision]: exports.DeviceNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceLastChargingDays]: exports.DeviceLastChargingDaysProperty,
        [PropertyName.DeviceLastChargingRecordedEvents]: exports.DeviceLastChargingRecordedEventsProperty,
        [PropertyName.DeviceLastChargingTotalEvents]: exports.DeviceLastChargingTotalEventsProperty,
        [PropertyName.DeviceBatteryUsageLastWeek]: exports.DeviceBatteryUsageLastWeekProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.SOLO_CAMERA_SOLAR]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionSoloProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionHB3DetectionTypeHumanProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualitySoloProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceDetectionStatisticsWorkingDays]: exports.DeviceDetectionStatisticsWorkingDaysProperty,
        [PropertyName.DeviceDetectionStatisticsDetectedEvents]: exports.DeviceDetectionStatisticsDetectedEventsProperty,
        [PropertyName.DeviceDetectionStatisticsRecordedEvents]: exports.DeviceDetectionStatisticsRecordedEventsProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DevicePowerSource]: exports.DevicePowerSourceProperty,
    },
    [DeviceType.SOLO_CAMERA_C210]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionSoloProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingIndoorSoloFloodlightProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionHB3DetectionTypeHumanProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualitySoloProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceDetectionStatisticsWorkingDays]: exports.DeviceDetectionStatisticsWorkingDaysProperty,
        [PropertyName.DeviceDetectionStatisticsDetectedEvents]: exports.DeviceDetectionStatisticsDetectedEventsProperty,
        [PropertyName.DeviceDetectionStatisticsRecordedEvents]: exports.DeviceDetectionStatisticsRecordedEventsProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
    },
    [DeviceType.SOLO_CAMERA_E30]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceBatteryTemp]: exports.DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionSoloProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSoloProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionHB3DetectionTypeHumanProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionHB3DetectionTypeAllOtherMotionsProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualitySoloProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivitySoloProperty,
        [PropertyName.DeviceDetectionStatisticsWorkingDays]: exports.DeviceDetectionStatisticsWorkingDaysProperty,
        [PropertyName.DeviceDetectionStatisticsDetectedEvents]: exports.DeviceDetectionStatisticsDetectedEventsProperty,
        [PropertyName.DeviceDetectionStatisticsRecordedEvents]: exports.DeviceDetectionStatisticsRecordedEventsProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceChargingStatus]: exports.DeviceChargingStatusProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeProperty,
    },
    [DeviceType.KEYPAD]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBatteryLow]: exports.DeviceBatteryLowKeypadProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIKeypadProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceBatteryIsCharging]: exports.DeviceBatteryIsChargingKeypadProperty,
    },
    [DeviceType.LOCK_WIFI]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceAdvancedLockStatusProperty,
        [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
        [PropertyName.DeviceSound]: exports.DeviceSoundProperty,
        [PropertyName.DeviceNotification]: exports.DeviceNotificationProperty,
        [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedProperty,
        [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.LOCK_WIFI_NO_FINGER]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceAdvancedLockStatusProperty,
        [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
        [PropertyName.DeviceSound]: exports.DeviceSoundProperty,
        [PropertyName.DeviceNotification]: exports.DeviceNotificationProperty,
        [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedProperty,
        [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.LOCK_8503]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceAdvancedLockStatusProperty,
        [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
        [PropertyName.DeviceSound]: exports.DeviceSoundSimpleProperty,
        [PropertyName.DeviceNotification]: exports.DeviceNotificationSmartLockProperty,
        [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedSmartLockProperty,
        [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedSmartLockProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.LOCK_8506]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceAdvancedLockStatusProperty,
        [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
        [PropertyName.DeviceSound]: exports.DeviceSoundProperty,
        [PropertyName.DeviceNotification]: exports.DeviceNotificationSmartLockProperty,
        [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedSmartLockProperty,
        [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedSmartLockProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.LOCK_8502]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceAdvancedLockStatusProperty,
        [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
        [PropertyName.DeviceSound]: exports.DeviceSoundProperty,
        [PropertyName.DeviceNotification]: exports.DeviceNotificationSmartLockProperty,
        [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedSmartLockProperty,
        [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedSmartLockProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.LOCK_85A3]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
    },
    [DeviceType.LOCK_8504]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceAdvancedLockStatusProperty,
        [PropertyName.DeviceAutoLock]: exports.DeviceAutoLockProperty,
        [PropertyName.DeviceAutoLockTimer]: exports.DeviceAutoLockTimerProperty,
        [PropertyName.DeviceAutoLockSchedule]: exports.DeviceAutoLockScheduleProperty,
        [PropertyName.DeviceAutoLockScheduleStartTime]: exports.DeviceAutoLockScheduleStartTimeProperty,
        [PropertyName.DeviceAutoLockScheduleEndTime]: exports.DeviceAutoLockScheduleEndTimeProperty,
        [PropertyName.DeviceOneTouchLocking]: exports.DeviceOneTouchLockingProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeProperty,
        [PropertyName.DeviceSound]: exports.DeviceSoundSimpleProperty,
        [PropertyName.DeviceNotification]: exports.DeviceNotificationSmartLockProperty,
        [PropertyName.DeviceNotificationUnlocked]: exports.DeviceNotificationUnlockedSmartLockProperty,
        [PropertyName.DeviceNotificationLocked]: exports.DeviceNotificationLockedSmartLockProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLockEventOrigin]: exports.DeviceLockEventOriginProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
    },
    [DeviceType.LOCK_BLE]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceState]: exports.DeviceStateLockProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSILockProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceBasicLockStatusProperty,
    },
    [DeviceType.LOCK_BLE_NO_FINGER]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceState]: exports.DeviceStateLockProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryLockProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSILockProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedProperty,
        [PropertyName.DeviceLockStatus]: exports.DeviceBasicLockStatusProperty,
    },
    [DeviceType.MOTION_SENSOR]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceBatteryLow]: exports.DeviceBatteryLowMotionSensorProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DeviceMotionSensorPIREvent]: exports.DeviceMotionSensorPIREventProperty,
    },
    [DeviceType.SENSOR]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceSensorOpen]: exports.DeviceSensorOpenProperty,
        [PropertyName.DeviceBatteryLow]: exports.DeviceBatteryLowSensorProperty,
        [PropertyName.DeviceSensorChangeTime]: exports.DeviceSensorChangeTimeProperty,
        [PropertyName.DeviceChirpVolume]: exports.DeviceChirpVolumeEntrySensorProperty,
        [PropertyName.DeviceChirpTone]: exports.DeviceChirpToneEntrySensorProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIEntrySensorProperty,
    },
    [DeviceType.SMART_SAFE_7400]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSISmartSafeProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionSmartSafeProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsSmartSafeProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeSmartSafeProperty,
        [PropertyName.DeviceLeftOpenAlarm]: exports.DeviceLeftOpenAlarmProperty,
        [PropertyName.DeviceLeftOpenAlarmDuration]: exports.DeviceLeftOpenAlarmDurationProperty,
        [PropertyName.DeviceDualUnlock]: exports.DeviceDualUnlockProperty,
        [PropertyName.DevicePowerSave]: exports.DevicePowerSaveProperty,
        [PropertyName.DeviceInteriorBrightness]: exports.DeviceInteriorBrightnessProperty,
        [PropertyName.DeviceInteriorBrightnessDuration]: exports.DeviceInteriorBrightnessDurationProperty,
        [PropertyName.DeviceTamperAlarm]: exports.DeviceTamperAlarmProperty,
        [PropertyName.DeviceRemoteUnlock]: exports.DeviceRemoteUnlockProperty,
        [PropertyName.DeviceRemoteUnlockMasterPIN]: exports.DeviceRemoteUnlockMasterPINProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeSmartSafeProperty,
        [PropertyName.DeviceAlarmVolume]: exports.DeviceAlarmVolumeProperty,
        [PropertyName.DevicePromptVolume]: exports.DevicePromptVolumeProperty,
        [PropertyName.DeviceNotificationUnlockByKey]: exports.DeviceNotificationUnlockByKeyProperty,
        [PropertyName.DeviceNotificationUnlockByPIN]: exports.DeviceNotificationUnlockByPINProperty,
        [PropertyName.DeviceNotificationUnlockByFingerprint]: exports.DeviceNotificationUnlockByFingerprintProperty,
        [PropertyName.DeviceNotificationUnlockByApp]: exports.DeviceNotificationUnlockByAppProperty,
        [PropertyName.DeviceNotificationDualLock]: exports.DeviceNotificationDualLockProperty,
        [PropertyName.DeviceNotificationDualUnlock]: exports.DeviceNotificationDualUnlockProperty,
        [PropertyName.DeviceNotificationWrongTryProtect]: exports.DeviceNotificationWrongTryProtectProperty,
        [PropertyName.DeviceNotificationJammed]: exports.DeviceNotificationJammedProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedSmartSafeProperty,
        [PropertyName.DeviceJammedAlert]: exports.DeviceJammedAlertProperty,
        [PropertyName.Device911Alert]: exports.Device911AlertProperty,
        [PropertyName.Device911AlertEvent]: exports.Device911AlertEventProperty,
        [PropertyName.DeviceShakeAlert]: exports.DeviceShakeAlertProperty,
        [PropertyName.DeviceShakeAlertEvent]: exports.DeviceShakeAlertEventProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: exports.DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceWrongTryProtectAlert]: exports.DeviceWrongTryProtectAlertProperty,
    },
    [DeviceType.SMART_SAFE_7401]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSISmartSafeProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionSmartSafeProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsSmartSafeProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeSmartSafeProperty,
        [PropertyName.DeviceLeftOpenAlarm]: exports.DeviceLeftOpenAlarmProperty,
        [PropertyName.DeviceLeftOpenAlarmDuration]: exports.DeviceLeftOpenAlarmDurationProperty,
        [PropertyName.DeviceDualUnlock]: exports.DeviceDualUnlockProperty,
        [PropertyName.DevicePowerSave]: exports.DevicePowerSaveProperty,
        [PropertyName.DeviceInteriorBrightness]: exports.DeviceInteriorBrightnessProperty,
        [PropertyName.DeviceInteriorBrightnessDuration]: exports.DeviceInteriorBrightnessDurationProperty,
        [PropertyName.DeviceTamperAlarm]: exports.DeviceTamperAlarmProperty,
        [PropertyName.DeviceRemoteUnlock]: exports.DeviceRemoteUnlockProperty,
        [PropertyName.DeviceRemoteUnlockMasterPIN]: exports.DeviceRemoteUnlockMasterPINProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeSmartSafeProperty,
        [PropertyName.DeviceAlarmVolume]: exports.DeviceAlarmVolumeProperty,
        [PropertyName.DevicePromptVolume]: exports.DevicePromptVolumeProperty,
        [PropertyName.DeviceNotificationUnlockByKey]: exports.DeviceNotificationUnlockByKeyProperty,
        [PropertyName.DeviceNotificationUnlockByPIN]: exports.DeviceNotificationUnlockByPINProperty,
        [PropertyName.DeviceNotificationUnlockByFingerprint]: exports.DeviceNotificationUnlockByFingerprintProperty,
        [PropertyName.DeviceNotificationUnlockByApp]: exports.DeviceNotificationUnlockByAppProperty,
        [PropertyName.DeviceNotificationDualLock]: exports.DeviceNotificationDualLockProperty,
        [PropertyName.DeviceNotificationDualUnlock]: exports.DeviceNotificationDualUnlockProperty,
        [PropertyName.DeviceNotificationWrongTryProtect]: exports.DeviceNotificationWrongTryProtectProperty,
        [PropertyName.DeviceNotificationJammed]: exports.DeviceNotificationJammedProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedSmartSafeProperty,
        [PropertyName.DeviceJammedAlert]: exports.DeviceJammedAlertProperty,
        [PropertyName.Device911Alert]: exports.Device911AlertProperty,
        [PropertyName.Device911AlertEvent]: exports.Device911AlertEventProperty,
        [PropertyName.DeviceShakeAlert]: exports.DeviceShakeAlertProperty,
        [PropertyName.DeviceShakeAlertEvent]: exports.DeviceShakeAlertEventProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: exports.DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceWrongTryProtectAlert]: exports.DeviceWrongTryProtectAlertProperty,
    },
    [DeviceType.SMART_SAFE_7402]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSISmartSafeProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionSmartSafeProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsSmartSafeProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeSmartSafeProperty,
        [PropertyName.DeviceLeftOpenAlarm]: exports.DeviceLeftOpenAlarmProperty,
        [PropertyName.DeviceLeftOpenAlarmDuration]: exports.DeviceLeftOpenAlarmDurationProperty,
        [PropertyName.DeviceDualUnlock]: exports.DeviceDualUnlockProperty,
        [PropertyName.DevicePowerSave]: exports.DevicePowerSaveProperty,
        [PropertyName.DeviceInteriorBrightness]: exports.DeviceInteriorBrightnessProperty,
        [PropertyName.DeviceInteriorBrightnessDuration]: exports.DeviceInteriorBrightnessDurationProperty,
        [PropertyName.DeviceTamperAlarm]: exports.DeviceTamperAlarmProperty,
        [PropertyName.DeviceRemoteUnlock]: exports.DeviceRemoteUnlockProperty,
        [PropertyName.DeviceRemoteUnlockMasterPIN]: exports.DeviceRemoteUnlockMasterPINProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeSmartSafeProperty,
        [PropertyName.DeviceAlarmVolume]: exports.DeviceAlarmVolumeProperty,
        [PropertyName.DevicePromptVolume]: exports.DevicePromptVolumeProperty,
        [PropertyName.DeviceNotificationUnlockByKey]: exports.DeviceNotificationUnlockByKeyProperty,
        [PropertyName.DeviceNotificationUnlockByPIN]: exports.DeviceNotificationUnlockByPINProperty,
        [PropertyName.DeviceNotificationUnlockByFingerprint]: exports.DeviceNotificationUnlockByFingerprintProperty,
        [PropertyName.DeviceNotificationUnlockByApp]: exports.DeviceNotificationUnlockByAppProperty,
        [PropertyName.DeviceNotificationDualLock]: exports.DeviceNotificationDualLockProperty,
        [PropertyName.DeviceNotificationDualUnlock]: exports.DeviceNotificationDualUnlockProperty,
        [PropertyName.DeviceNotificationWrongTryProtect]: exports.DeviceNotificationWrongTryProtectProperty,
        [PropertyName.DeviceNotificationJammed]: exports.DeviceNotificationJammedProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedSmartSafeProperty,
        [PropertyName.DeviceJammedAlert]: exports.DeviceJammedAlertProperty,
        [PropertyName.Device911Alert]: exports.Device911AlertProperty,
        [PropertyName.Device911AlertEvent]: exports.Device911AlertEventProperty,
        [PropertyName.DeviceShakeAlert]: exports.DeviceShakeAlertProperty,
        [PropertyName.DeviceShakeAlertEvent]: exports.DeviceShakeAlertEventProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: exports.DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceWrongTryProtectAlert]: exports.DeviceWrongTryProtectAlertProperty,
    },
    [DeviceType.SMART_SAFE_7403]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSISmartSafeProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DeviceWrongTryProtection]: exports.DeviceWrongTryProtectionSmartSafeProperty,
        [PropertyName.DeviceWrongTryAttempts]: exports.DeviceWrongTryAttemptsSmartSafeProperty,
        [PropertyName.DeviceWrongTryLockdownTime]: exports.DeviceWrongTryLockdownTimeSmartSafeProperty,
        [PropertyName.DeviceLeftOpenAlarm]: exports.DeviceLeftOpenAlarmProperty,
        [PropertyName.DeviceLeftOpenAlarmDuration]: exports.DeviceLeftOpenAlarmDurationProperty,
        [PropertyName.DeviceDualUnlock]: exports.DeviceDualUnlockProperty,
        [PropertyName.DevicePowerSave]: exports.DevicePowerSaveProperty,
        [PropertyName.DeviceInteriorBrightness]: exports.DeviceInteriorBrightnessProperty,
        [PropertyName.DeviceInteriorBrightnessDuration]: exports.DeviceInteriorBrightnessDurationProperty,
        [PropertyName.DeviceTamperAlarm]: exports.DeviceTamperAlarmProperty,
        [PropertyName.DeviceRemoteUnlock]: exports.DeviceRemoteUnlockProperty,
        [PropertyName.DeviceRemoteUnlockMasterPIN]: exports.DeviceRemoteUnlockMasterPINProperty,
        [PropertyName.DeviceScramblePasscode]: exports.DeviceScramblePasscodeSmartSafeProperty,
        [PropertyName.DeviceAlarmVolume]: exports.DeviceAlarmVolumeProperty,
        [PropertyName.DevicePromptVolume]: exports.DevicePromptVolumeProperty,
        [PropertyName.DeviceNotificationUnlockByKey]: exports.DeviceNotificationUnlockByKeyProperty,
        [PropertyName.DeviceNotificationUnlockByPIN]: exports.DeviceNotificationUnlockByPINProperty,
        [PropertyName.DeviceNotificationUnlockByFingerprint]: exports.DeviceNotificationUnlockByFingerprintProperty,
        [PropertyName.DeviceNotificationUnlockByApp]: exports.DeviceNotificationUnlockByAppProperty,
        [PropertyName.DeviceNotificationDualLock]: exports.DeviceNotificationDualLockProperty,
        [PropertyName.DeviceNotificationDualUnlock]: exports.DeviceNotificationDualUnlockProperty,
        [PropertyName.DeviceNotificationWrongTryProtect]: exports.DeviceNotificationWrongTryProtectProperty,
        [PropertyName.DeviceNotificationJammed]: exports.DeviceNotificationJammedProperty,
        [PropertyName.DeviceLocked]: exports.DeviceLockedSmartSafeProperty,
        [PropertyName.DeviceJammedAlert]: exports.DeviceJammedAlertProperty,
        [PropertyName.Device911Alert]: exports.Device911AlertProperty,
        [PropertyName.Device911AlertEvent]: exports.Device911AlertEventProperty,
        [PropertyName.DeviceShakeAlert]: exports.DeviceShakeAlertProperty,
        [PropertyName.DeviceShakeAlertEvent]: exports.DeviceShakeAlertEventProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: exports.DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceWrongTryProtectAlert]: exports.DeviceWrongTryProtectAlertProperty,
    },
    [DeviceType.SMART_DROP]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityCamera2Property,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeSmartDropProperty,
        [PropertyName.DeviceOpenMethod]: exports.DeviceOpenMethodProperty,
        [PropertyName.DeviceMotionActivatedPrompt]: exports.DeviceMotionActivatedPromptProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceOpen]: exports.DeviceOpenProperty,
        [PropertyName.DeviceOpenedByName]: exports.DeviceOpenedByNameProperty,
        [PropertyName.DeviceOpenedByType]: exports.DeviceOpenedByTypeProperty,
        [PropertyName.DeviceTamperingAlert]: exports.DeviceTamperingAlertProperty,
        [PropertyName.DeviceLowTemperatureAlert]: exports.DeviceLowTemperatureAlertProperty,
        [PropertyName.DeviceHighTemperatureAlert]: exports.DeviceHighTemperatureAlertProperty,
        [PropertyName.DeviceLidStuckAlert]: exports.DeviceLidStuckAlertProperty,
        [PropertyName.DevicePinIncorrectAlert]: exports.DevicePinIncorrectAlertProperty,
        [PropertyName.DeviceBatteryFullyChargedAlert]: exports.DeviceBatteryFullyChargedAlertProperty,
        [PropertyName.DeviceLowBatteryAlert]: exports.DeviceLowBatteryAlertProperty,
        [PropertyName.DeviceLongTimeNotCloseAlert]: exports.DeviceLongTimeNotCloseAlertProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeSmartDropProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthWalllightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySmartDropProperty,
        [PropertyName.DeviceIsDeliveryDenied]: exports.DeviceIsDeliveryDeniedProperty,
        [PropertyName.DeviceHasMasterPin]: exports.DeviceHasMasterPinProperty,
        [PropertyName.DeviceDeliveries]: exports.DeviceDeliveriesProperty,
        [PropertyName.DevicePackageDelivered]: exports.DevicePackageDeliveredProperty,
    },
    [DeviceType.WALL_LIGHT_CAM]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionSoloProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceFloodlightLightSettingsBrightnessManualProperty,
        [PropertyName.DeviceLightSettingsManualLightingActiveMode]: exports.DeviceLightSettingsManualLightingActiveModeProperty,
        [PropertyName.DeviceLightSettingsManualDailyLighting]: exports.DeviceLightSettingsManualDailyLightingProperty,
        [PropertyName.DeviceLightSettingsManualColoredLighting]: exports.DeviceLightSettingsManualColoredLightingProperty,
        [PropertyName.DeviceLightSettingsManualDynamicLighting]: exports.DeviceLightSettingsManualDynamicLightingProperty,
        [PropertyName.DeviceLightSettingsScheduleLightingActiveMode]: exports.DeviceLightSettingsScheduleLightingActiveModeProperty,
        [PropertyName.DeviceLightSettingsBrightnessMotion]: exports.DeviceFloodlightLightSettingsBrightnessMotionProperty,
        [PropertyName.DeviceLightSettingsMotionLightingActiveMode]: exports.DeviceLightSettingsMotionLightingActiveModeProperty,
        [PropertyName.DeviceLightSettingsBrightnessSchedule]: exports.DeviceFloodlightLightSettingsBrightnessScheduleProperty,
        [PropertyName.DeviceLightSettingsScheduleDailyLighting]: exports.DeviceLightSettingsScheduleDailyLightingProperty,
        [PropertyName.DeviceLightSettingsScheduleColoredLighting]: exports.DeviceLightSettingsScheduleColoredLightingProperty,
        [PropertyName.DeviceLightSettingsScheduleDynamicLighting]: exports.DeviceLightSettingsScheduleDynamicLightingProperty,
        [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceLightSettingsMotionTriggeredTimer]: exports.DeviceFloodlightLightSettingsMotionTriggeredTimerProperty,
        [PropertyName.DeviceLightSettingsMotionDailyLighting]: exports.DeviceLightSettingsMotionDailyLightingProperty,
        [PropertyName.DeviceLightSettingsMotionColoredLighting]: exports.DeviceLightSettingsMotionColoredLightingProperty,
        [PropertyName.DeviceLightSettingsMotionDynamicLighting]: exports.DeviceLightSettingsMotionDynamicLightingProperty,
        [PropertyName.DeviceLightSettingsMotionActivationMode]: exports.DeviceLightSettingsMotionActivationModeProperty,
        [PropertyName.DeviceLightSettingsColoredLightingColors]: exports.DeviceLightSettingsColoredLightingColorsProperty,
        [PropertyName.DeviceLightSettingsDynamicLightingThemes]: exports.DeviceLightSettingsDynamicLightingThemesProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeWalllightProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthWalllightProperty,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityWalllightProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityWalllightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonWalllightProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionWalllightProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionDetectionTypeHumanWallLightProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionDetectionTypeAllOtherMotionsWalllightProperty,
        [PropertyName.DeviceNotification]: exports.DeviceNotificationWalllightProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeWalllightProperty,
    },
    [DeviceType.WALL_LIGHT_CAM_81A0]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionSoloProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkSoloWiredDoorbellProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceLight]: exports.DeviceFloodlightLightProperty,
        [PropertyName.DeviceLightSettingsBrightnessManual]: exports.DeviceCameraLightSettingsBrightnessManualWalllightS120Property,
        [PropertyName.DeviceLightSettingsMotionTriggered]: exports.DeviceFloodlightLightSettingsMotionTriggeredProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityBatteryDoorbellProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeWalllightProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceRecordingClipLength]: exports.DeviceRecordingClipLengthWalllightS120Property,
        [PropertyName.DeviceRecordingEndClipMotionStops]: exports.DeviceRecordingEndClipMotionStopsProperty,
        [PropertyName.DeviceRecordingRetriggerInterval]: exports.DeviceRecordingRetriggerIntervalProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualityWalllightProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityWalllightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonWalllightProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionWalllightProperty,
        [PropertyName.DeviceMotionDetectionTypeHuman]: exports.DeviceMotionDetectionTypeHumanWallLightProperty,
        [PropertyName.DeviceMotionDetectionTypeAllOtherMotions]: exports.DeviceMotionDetectionTypeAllOtherMotionsWalllightProperty,
        [PropertyName.DeviceNotification]: exports.DeviceNotificationWalllightProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeWalllightProperty,
        [PropertyName.DevicePowerWorkingMode]: exports.DevicePowerWorkingModeProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryProperty,
    },
    [DeviceType.CAMERA_GARAGE_T8453]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        //[PropertyName.DeviceBattery]: DeviceBatteryProperty,
        //[PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkGarageCameraProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityGarageCameraProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceDoorControlWarning]: exports.DeviceDoorControlWarningProperty,
        [PropertyName.DeviceDoor1Open]: exports.DeviceDoor1OpenProperty,
        [PropertyName.DeviceDoor2Open]: exports.DeviceDoor2OpenProperty,
        [PropertyName.DeviceDoorSensor1Name]: exports.DeviceDoorSensor1NameProperty,
        [PropertyName.DeviceDoorSensor1SerialNumber]: exports.DeviceDoorSensor1SerialNumberProperty,
        [PropertyName.DeviceDoorSensor1MacAddress]: exports.DeviceDoorSensor1MacAddressProperty,
        [PropertyName.DeviceDoorSensor1Version]: exports.DeviceDoorSensor1VersionProperty,
        [PropertyName.DeviceDoorSensor1Status]: exports.DeviceDoorSensor1StatusProperty,
        [PropertyName.DeviceDoorSensor1BatteryLevel]: exports.DeviceDoorSensor1BatteryLevelProperty,
        [PropertyName.DeviceDoorSensor1LowBattery]: exports.DeviceDoorSensor1LowBatteryProperty,
        [PropertyName.DeviceDoorSensor2Name]: exports.DeviceDoorSensor2NameProperty,
        [PropertyName.DeviceDoorSensor2SerialNumber]: exports.DeviceDoorSensor2SerialNumberProperty,
        [PropertyName.DeviceDoorSensor2MacAddress]: exports.DeviceDoorSensor2MacAddressProperty,
        [PropertyName.DeviceDoorSensor2Version]: exports.DeviceDoorSensor2VersionProperty,
        [PropertyName.DeviceDoorSensor2Status]: exports.DeviceDoorSensor2StatusProperty,
        [PropertyName.DeviceDoorSensor2BatteryLevel]: exports.DeviceDoorSensor2BatteryLevelProperty,
        [PropertyName.DeviceDoorSensor2LowBattery]: exports.DeviceDoorSensor2LowBatteryProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
    },
    [DeviceType.CAMERA_GARAGE_T8453_COMMON]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        //[PropertyName.DeviceBattery]: DeviceBatteryProperty,
        //[PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkGarageCameraProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityGarageCameraProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceDoorControlWarning]: exports.DeviceDoorControlWarningProperty,
        [PropertyName.DeviceDoor1Open]: exports.DeviceDoor1OpenProperty,
        [PropertyName.DeviceDoor2Open]: exports.DeviceDoor2OpenProperty,
        [PropertyName.DeviceDoorSensor1Name]: exports.DeviceDoorSensor1NameProperty,
        [PropertyName.DeviceDoorSensor1SerialNumber]: exports.DeviceDoorSensor1SerialNumberProperty,
        [PropertyName.DeviceDoorSensor1MacAddress]: exports.DeviceDoorSensor1MacAddressProperty,
        [PropertyName.DeviceDoorSensor1Version]: exports.DeviceDoorSensor1VersionProperty,
        [PropertyName.DeviceDoorSensor1Status]: exports.DeviceDoorSensor1StatusProperty,
        [PropertyName.DeviceDoorSensor1BatteryLevel]: exports.DeviceDoorSensor1BatteryLevelProperty,
        [PropertyName.DeviceDoorSensor1LowBattery]: exports.DeviceDoorSensor1LowBatteryProperty,
        [PropertyName.DeviceDoorSensor2Name]: exports.DeviceDoorSensor2NameProperty,
        [PropertyName.DeviceDoorSensor2SerialNumber]: exports.DeviceDoorSensor2SerialNumberProperty,
        [PropertyName.DeviceDoorSensor2MacAddress]: exports.DeviceDoorSensor2MacAddressProperty,
        [PropertyName.DeviceDoorSensor2Version]: exports.DeviceDoorSensor2VersionProperty,
        [PropertyName.DeviceDoorSensor2Status]: exports.DeviceDoorSensor2StatusProperty,
        [PropertyName.DeviceDoorSensor2BatteryLevel]: exports.DeviceDoorSensor2BatteryLevelProperty,
        [PropertyName.DeviceDoorSensor2LowBattery]: exports.DeviceDoorSensor2LowBatteryProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
    },
    [DeviceType.CAMERA_GARAGE_T8452]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceEnabled]: exports.DeviceEnabledSoloProperty,
        //[PropertyName.DeviceBattery]: DeviceBatteryProperty,
        //[PropertyName.DeviceBatteryTemp]: DeviceBatteryTempProperty,
        [PropertyName.DeviceAutoNightvision]: exports.DeviceAutoNightvisionProperty,
        [PropertyName.DeviceMotionDetection]: exports.DeviceMotionDetectionIndoorSoloFloodProperty,
        [PropertyName.DeviceWatermark]: exports.DeviceWatermarkGarageCameraProperty,
        [PropertyName.DeviceMotionDetected]: exports.DeviceMotionDetectedProperty,
        [PropertyName.DevicePersonDetected]: exports.DevicePersonDetectedProperty,
        [PropertyName.DeviceStatusLed]: exports.DeviceStatusLedProperty,
        [PropertyName.DevicePicture]: exports.DevicePictureProperty,
        [PropertyName.DevicePictureUrl]: exports.DevicePictureUrlProperty,
        [PropertyName.DeviceMicrophone]: exports.DeviceMicrophoneProperty,
        [PropertyName.DeviceSpeaker]: exports.DeviceSpeakerProperty,
        [PropertyName.DeviceSpeakerVolume]: exports.DeviceSpeakerVolumeIndoorFloodDoorbellProperty,
        [PropertyName.DeviceAudioRecording]: exports.DeviceAudioRecordingProperty,
        [PropertyName.DeviceMotionDetectionType]: exports.DeviceMotionDetectionTypeProperty,
        [PropertyName.DeviceVideoStreamingQuality]: exports.DeviceVideoStreamingQualitySoloProperty,
        [PropertyName.DeviceVideoRecordingQuality]: exports.DeviceVideoRecordingQualityProperty,
        [PropertyName.DeviceNotificationType]: exports.DeviceNotificationTypeIndoorFloodlightProperty,
        [PropertyName.DeviceNotificationPerson]: exports.DeviceNotificationPersonProperty,
        [PropertyName.DeviceNotificationAllOtherMotion]: exports.DeviceNotificationAllOtherMotionProperty,
        [PropertyName.DeviceWifiRSSI]: exports.DeviceWifiRSSIProperty,
        [PropertyName.DeviceWifiSignalLevel]: exports.DeviceWifiSignalLevelProperty,
        [PropertyName.DeviceMotionDetectionSensitivity]: exports.DeviceMotionDetectionSensitivityGarageCameraProperty,
        [PropertyName.DeviceState]: exports.DeviceStateProperty,
        [PropertyName.DeviceSnooze]: exports.DeviceSnoozeProperty,
        [PropertyName.DeviceSnoozeTime]: exports.DeviceSnoozeTimeProperty,
        [PropertyName.DeviceSnoozeStartTime]: exports.DeviceSnoozeStartTimeProperty,
        [PropertyName.DevicePersonName]: exports.DevicePersonNameProperty,
        [PropertyName.DeviceContinuousRecording]: exports.DeviceContinuousRecordingProperty,
        [PropertyName.DeviceContinuousRecordingType]: exports.DeviceContinuousRecordingTypeProperty,
        [PropertyName.DeviceDoorControlWarning]: exports.DeviceDoorControlWarningProperty,
        [PropertyName.DeviceDoor1Open]: exports.DeviceDoor1OpenProperty,
        [PropertyName.DeviceDoor2Open]: exports.DeviceDoor2OpenProperty,
        [PropertyName.DeviceDoorSensor1Name]: exports.DeviceDoorSensor1NameProperty,
        [PropertyName.DeviceDoorSensor1SerialNumber]: exports.DeviceDoorSensor1SerialNumberProperty,
        [PropertyName.DeviceDoorSensor1MacAddress]: exports.DeviceDoorSensor1MacAddressProperty,
        [PropertyName.DeviceDoorSensor1Version]: exports.DeviceDoorSensor1VersionProperty,
        [PropertyName.DeviceDoorSensor1Status]: exports.DeviceDoorSensor1StatusProperty,
        [PropertyName.DeviceDoorSensor1BatteryLevel]: exports.DeviceDoorSensor1BatteryLevelProperty,
        [PropertyName.DeviceDoorSensor1LowBattery]: exports.DeviceDoorSensor1LowBatteryProperty,
        [PropertyName.DeviceDoorSensor2Name]: exports.DeviceDoorSensor2NameProperty,
        [PropertyName.DeviceDoorSensor2SerialNumber]: exports.DeviceDoorSensor2SerialNumberProperty,
        [PropertyName.DeviceDoorSensor2MacAddress]: exports.DeviceDoorSensor2MacAddressProperty,
        [PropertyName.DeviceDoorSensor2Version]: exports.DeviceDoorSensor2VersionProperty,
        [PropertyName.DeviceDoorSensor2Status]: exports.DeviceDoorSensor2StatusProperty,
        [PropertyName.DeviceDoorSensor2BatteryLevel]: exports.DeviceDoorSensor2BatteryLevelProperty,
        [PropertyName.DeviceDoorSensor2LowBattery]: exports.DeviceDoorSensor2LowBatteryProperty,
        [PropertyName.DeviceRTSPStream]: exports.DeviceRTSPStreamProperty,
        [PropertyName.DeviceRTSPStreamUrl]: exports.DeviceRTSPStreamUrlProperty,
        [PropertyName.DeviceVideoTypeStoreToNAS]: exports.DeviceVideoTypeStoreToNASProperty,
    },
    [DeviceType.SMART_TRACK_CARD]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceLocationCoordinates]: exports.DeviceLocationCoordinatesProperty,
        [PropertyName.DeviceLocationAddress]: exports.DeviceLocationAddressProperty,
        [PropertyName.DeviceLocationLastUpdate]: exports.DeviceLocationLastUpdateProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryTrackerProperty,
        [PropertyName.DeviceTrackerType]: exports.DeviceTrackerTypeProperty,
        [PropertyName.DeviceLeftBehindAlarm]: exports.DeviceLeftBehindAlarmProperty,
        [PropertyName.DeviceFindPhone]: exports.DeviceFindPhoneProperty,
    },
    [DeviceType.SMART_TRACK_LINK]: {
        ...exports.GenericDeviceProperties,
        [PropertyName.DeviceLocationCoordinates]: exports.DeviceLocationCoordinatesProperty,
        [PropertyName.DeviceLocationAddress]: exports.DeviceLocationAddressProperty,
        [PropertyName.DeviceLocationLastUpdate]: exports.DeviceLocationLastUpdateProperty,
        [PropertyName.DeviceBattery]: exports.DeviceBatteryTrackerProperty,
        [PropertyName.DeviceTrackerType]: exports.DeviceTrackerTypeProperty,
        [PropertyName.DeviceLeftBehindAlarm]: exports.DeviceLeftBehindAlarmProperty,
        [PropertyName.DeviceFindPhone]: exports.DeviceFindPhoneProperty,
    },
};
exports.StationNameProperty = {
    key: "station_name",
    name: PropertyName.Name,
    label: "Name",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationModelProperty = {
    key: "station_model",
    name: PropertyName.Model,
    label: "Model",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationSerialNumberProperty = {
    key: "station_sn",
    name: PropertyName.SerialNumber,
    label: "Serial number",
    readable: true,
    writeable: false,
    type: "string",
};
exports.BaseStationProperties = {
    [exports.StationNameProperty.name]: exports.StationNameProperty,
    [exports.StationModelProperty.name]: exports.StationModelProperty,
    [exports.StationSerialNumberProperty.name]: exports.StationSerialNumberProperty,
    [exports.GenericTypeProperty.name]: exports.GenericTypeProperty,
    [exports.GenericHWVersionProperty.name]: exports.GenericHWVersionProperty,
    [exports.GenericSWVersionProperty.name]: exports.GenericSWVersionProperty,
};
exports.StationGuardModeProperty = {
    key: ParamType.GUARD_MODE,
    name: PropertyName.StationGuardMode,
    label: "Guard Mode",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "Away",
        1: "Home",
        2: "Schedule",
        3: "Custom 1",
        4: "Custom 2",
        5: "Custom 3",
        47: "Geofencing",
        63: "Disarmed",
    },
};
exports.StationGuardModeKeyPadProperty = {
    ...exports.StationGuardModeProperty,
    states: {
        0: "Away",
        1: "Home",
        2: "Schedule",
        3: "Custom 1",
        4: "Custom 2",
        5: "Custom 3",
        6: "Off",
        47: "Geofencing",
        63: "Disarmed",
    },
};
exports.StationCurrentModeProperty = {
    key: types_1.CommandType.CMD_GET_ALARM_MODE,
    name: PropertyName.StationCurrentMode,
    label: "Current Mode",
    readable: true,
    writeable: false,
    type: "number",
    states: {
        0: "Away",
        1: "Home",
        3: "Custom 1",
        4: "Custom 2",
        5: "Custom 3",
        63: "Disarmed",
    },
};
exports.StationCurrentModeKeyPadProperty = {
    ...exports.StationCurrentModeProperty,
    states: {
        0: "Away",
        1: "Home",
        3: "Custom 1",
        4: "Custom 2",
        5: "Custom 3",
        6: "Off",
        63: "Disarmed",
    },
};
exports.StationLanIpAddressProperty = {
    key: types_1.CommandType.CMD_GET_HUB_LAN_IP,
    name: PropertyName.StationLANIpAddress,
    label: "LAN IP Address",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationLanIpAddressStandaloneProperty = {
    ...exports.StationLanIpAddressProperty,
    key: "ip_addr",
};
exports.StationMacAddressProperty = {
    key: "wifi_mac",
    //key: "sub1g_mac", // are always the same
    name: PropertyName.StationMacAddress,
    label: "MAC Address",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationAlarmVolumeProperty = {
    key: types_1.CommandType.CMD_SET_HUB_SPK_VOLUME,
    name: PropertyName.StationAlarmVolume,
    label: "Alarm Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 1,
    max: 26,
    default: 26,
};
exports.StationAlarmVolumeWalllightProperty = {
    key: types_1.CommandType.CMD_WALL_LIGHT_ALERT_VOLUME,
    name: PropertyName.StationAlarmVolume,
    label: "Alarm Volume",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Low",
        2: "Medium",
        3: "High"
    },
};
exports.StationPromptVolumeProperty = {
    key: types_1.CommandType.CMD_SET_PROMPT_VOLUME,
    name: PropertyName.StationPromptVolume,
    label: "Prompt Volume",
    readable: true,
    writeable: true,
    type: "number",
    min: 0,
    max: 26,
};
exports.StationAlarmToneProperty = {
    key: types_1.CommandType.CMD_HUB_ALARM_TONE,
    name: PropertyName.StationAlarmTone,
    label: "Alarm Tone",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        1: "Alarm sound 1",
        2: "Alarm sound 2",
    }
};
exports.StationNotificationSwitchModeScheduleProperty = {
    key: types_1.CommandType.CMD_HUB_NOTIFY_MODE,
    name: PropertyName.StationNotificationSwitchModeSchedule,
    label: "Notification Switch Mode Schedule",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationNotificationSwitchModeGeofenceProperty = {
    key: types_1.CommandType.CMD_HUB_NOTIFY_MODE,
    name: PropertyName.StationNotificationSwitchModeGeofence,
    label: "Notification Switch Mode Geofence",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationNotificationSwitchModeAppProperty = {
    key: types_1.CommandType.CMD_HUB_NOTIFY_MODE,
    name: PropertyName.StationNotificationSwitchModeApp,
    label: "Notification Switch Mode App",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationNotificationSwitchModeKeypadProperty = {
    key: types_1.CommandType.CMD_HUB_NOTIFY_MODE,
    name: PropertyName.StationNotificationSwitchModeKeypad,
    label: "Notification Switch Mode Keypad",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationNotificationStartAlarmDelayProperty = {
    key: types_1.CommandType.CMD_HUB_NOTIFY_ALARM,
    name: PropertyName.StationNotificationStartAlarmDelay,
    label: "Notification Start Alarm Delay",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationTimeFormatProperty = {
    key: types_1.CommandType.CMD_SET_HUB_OSD,
    name: PropertyName.StationTimeFormat,
    label: "Time Format",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "12h",
        1: "24h",
    },
    default: 0,
};
exports.StationTimeZoneProperty = {
    key: "time_zone",
    name: PropertyName.StationTimeZone,
    label: "Time Zone",
    readable: true,
    writeable: false,
    type: "string",
};
exports.StationSwitchModeWithAccessCodeProperty = {
    key: types_1.CommandType.CMD_KEYPAD_PSW_OPEN,
    name: PropertyName.StationSwitchModeWithAccessCode,
    label: "Switch mode with access code",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationAutoEndAlarmProperty = {
    key: types_1.CommandType.CMD_SET_HUB_ALARM_AUTO_END,
    name: PropertyName.StationAutoEndAlarm,
    label: "Auto End Alarm",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationTurnOffAlarmWithButtonProperty = {
    key: types_1.CommandType.CMD_SET_HUB_ALARM_CLOSE,
    name: PropertyName.StationTurnOffAlarmWithButton,
    label: "Turn off alarm with button",
    readable: true,
    writeable: true,
    type: "boolean",
};
exports.StationAlarmProperty = {
    key: "custom_alarm",
    name: PropertyName.StationAlarm,
    label: "Alarm",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.StationAlarmTypeProperty = {
    key: "custom_alarmType",
    name: PropertyName.StationAlarmType,
    label: "Alarm Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "None",
        2: "Theft",
        3: "Motion",
        4: "Manual",
        5: "Overheating",
        6: "Door",
        7: "Camera Motion",
        8: "Motion Sensor",
        9: "Camera Theft",
        10: "Camera Manual",
        11: "Camera Linkage",
        13: "Keypad",
        /*22: "App Light",
        23: "App Light Sound",
        24: "Motion App Light",
        25: "Motion App Light Alarm",*/
    },
    default: 0,
};
exports.StationAlarmArmedProperty = {
    key: "custom_alarmArmed",
    name: PropertyName.StationAlarmArmed,
    label: "Alarm Armed",
    readable: true,
    writeable: false,
    type: "boolean",
    default: false,
};
exports.StationAlarmArmDelayProperty = {
    key: "custom_alarmArmDelay",
    name: PropertyName.StationAlarmArmDelay,
    label: "Alarm Arm Delay",
    readable: true,
    writeable: true,
    type: "number",
    default: 0,
};
exports.StationAlarmDelayProperty = {
    key: "custom_alarmDelay",
    name: PropertyName.StationAlarmDelay,
    label: "Alarm Delay",
    readable: true,
    writeable: true,
    type: "number",
    default: 0,
};
exports.StationAlarmDelayTypeProperty = {
    key: "custom_alarmDelayType",
    name: PropertyName.StationAlarmDelayType,
    label: "Alarm Delay Type",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        0: "None",
        2: "Theft",
        3: "Motion",
        4: "Manual",
        5: "Overheating",
        6: "Door",
        7: "Camera Motion",
        8: "Motion Sensor",
        9: "Camera Theft",
        10: "Camera Manual",
        11: "Camera Linkage",
        13: "Keypad",
        /*22: "App Light",
        23: "App Light Sound",
        24: "Motion App Light",
        25: "Motion App Light Alarm",*/
    },
    default: 0,
};
exports.StationSdStatusProperty = {
    key: types_1.CommandType.CMD_GET_TFCARD_STATUS,
    name: PropertyName.StationSdStatus,
    label: "SD Status",
    readable: true,
    writeable: false,
    type: "number",
    default: undefined,
};
exports.StationSdCapacityProperty = {
    key: "sd_capacity",
    name: PropertyName.StationSdCapacity,
    label: "SD Capacity",
    readable: true,
    writeable: false,
    type: "number",
    default: undefined,
};
exports.StationSdAvailableCapacityProperty = {
    key: "sd_capacity_available",
    name: PropertyName.StationSdCapacityAvailable,
    label: "SD Capacity Available",
    readable: true,
    writeable: false,
    type: "number",
    default: undefined,
};
exports.StationStorageInfoEmmcProperty = {
    key: "storage_info_emmc",
    name: PropertyName.StationStorageInfoEmmc,
    label: "Storage Info Emmc",
    readable: true,
    writeable: false,
    type: "object",
};
exports.StationStorageInfoHddProperty = {
    key: "storage_info_hdd",
    name: PropertyName.StationStorageInfoHdd,
    label: "Storage Info Hdd",
    readable: true,
    writeable: false,
    type: "object",
};
exports.StationContinuousTrackingTimeProperty = {
    key: types_1.CommandType.CMD_SET_CONTINUOUS_TRACKING_TIME,
    name: PropertyName.StationContinuousTrackingTime,
    label: "Continuous Tracking Time",
    readable: true,
    writeable: true,
    type: "number",
    states: {
        120: "2 min.",
        180: "3 min.",
        240: "4 min.",
        300: "5 min.",
        600: "10 min.",
        900: "15 min.",
        1800: "30 min.",
    },
    unit: "sec",
};
exports.StationCrossCameraTrackingProperty = {
    key: types_1.CommandType.CMD_SET_CROSS_CAMERA_TRACKING,
    name: PropertyName.StationCrossCameraTracking,
    label: "Cross Camera Tracking",
    readable: true,
    writeable: true,
    type: "boolean",
    default: false,
};
exports.StationTrackingAssistanceProperty = {
    key: types_1.CommandType.CMD_SET_TRACKING_ASSISTANCE,
    name: PropertyName.StationTrackingAssistance,
    label: "Tracking Assistance",
    readable: true,
    writeable: true,
    type: "boolean",
    default: false,
};
exports.StationCrossTrackingCameraListProperty = {
    key: types_1.CommandType.CMD_SET_CROSS_TRACKING_CAMERA_LIST,
    name: PropertyName.StationCrossTrackingCameraList,
    label: "Cross Tracking Camera List",
    readable: true,
    writeable: true,
    type: "object",
    isValidObject: (obj) => {
        if (Array.isArray(obj)) {
            return obj.length > 0 &&
                obj.every((value) => {
                    return typeof value === "string";
                });
        }
        return false;
    },
};
exports.StationCrossTrackingGroupListProperty = {
    key: types_1.CommandType.CMD_SET_CROSS_TRACKING_GROUP_LIST,
    name: PropertyName.StationCrossTrackingGroupList,
    label: "Cross Tracking Group List",
    readable: true,
    writeable: true,
    type: "object",
    isValidObject: (obj) => {
        if (Array.isArray(obj)) {
            return obj.length > 0 &&
                obj.every((element) => {
                    return typeof element === "object" &&
                        "value" in element &&
                        Array.isArray(element.value) &&
                        element.value.length > 0 &&
                        element.value.every((value) => {
                            return typeof value === "string";
                        });
                });
        }
        return false;
    },
};
exports.StationProperties = {
    [DeviceType.STATION]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationPromptVolume]: exports.StationPromptVolumeProperty,
        [PropertyName.StationAlarmVolume]: exports.StationAlarmVolumeProperty,
        [PropertyName.StationAlarmTone]: exports.StationAlarmToneProperty,
        [PropertyName.StationNotificationSwitchModeSchedule]: exports.StationNotificationSwitchModeScheduleProperty,
        [PropertyName.StationNotificationSwitchModeGeofence]: exports.StationNotificationSwitchModeGeofenceProperty,
        [PropertyName.StationNotificationSwitchModeApp]: exports.StationNotificationSwitchModeAppProperty,
        [PropertyName.StationNotificationSwitchModeKeypad]: exports.StationNotificationSwitchModeKeypadProperty,
        [PropertyName.StationNotificationStartAlarmDelay]: exports.StationNotificationStartAlarmDelayProperty,
        [PropertyName.StationHomeSecuritySettings]: exports.StationHomeSecuritySettings,
        [PropertyName.StationAwaySecuritySettings]: exports.StationAwaySecuritySettings,
        [PropertyName.StationCustom1SecuritySettings]: exports.StationCustom1SecuritySettings,
        [PropertyName.StationCustom2SecuritySettings]: exports.StationCustom2SecuritySettings,
        [PropertyName.StationCustom3SecuritySettings]: exports.StationCustom3SecuritySettings,
        [PropertyName.StationOffSecuritySettings]: exports.StationOffSecuritySettings,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationAlarmArmed]: exports.StationAlarmArmedProperty,
        [PropertyName.StationAlarmArmDelay]: exports.StationAlarmArmDelayProperty,
        [PropertyName.StationAlarmDelay]: exports.StationAlarmDelayProperty,
        [PropertyName.StationAlarmDelayType]: exports.StationAlarmDelayTypeProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.HB3]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationPromptVolume]: exports.StationPromptVolumeProperty,
        [PropertyName.StationAlarmVolume]: exports.StationAlarmVolumeProperty,
        [PropertyName.StationAlarmTone]: exports.StationAlarmToneProperty,
        [PropertyName.StationNotificationSwitchModeSchedule]: exports.StationNotificationSwitchModeScheduleProperty,
        [PropertyName.StationNotificationSwitchModeGeofence]: exports.StationNotificationSwitchModeGeofenceProperty,
        [PropertyName.StationNotificationSwitchModeApp]: exports.StationNotificationSwitchModeAppProperty,
        [PropertyName.StationNotificationSwitchModeKeypad]: exports.StationNotificationSwitchModeKeypadProperty,
        [PropertyName.StationNotificationStartAlarmDelay]: exports.StationNotificationStartAlarmDelayProperty,
        [PropertyName.StationHomeSecuritySettings]: exports.StationHomeSecuritySettings,
        [PropertyName.StationAwaySecuritySettings]: exports.StationAwaySecuritySettings,
        [PropertyName.StationCustom1SecuritySettings]: exports.StationCustom1SecuritySettings,
        [PropertyName.StationCustom2SecuritySettings]: exports.StationCustom2SecuritySettings,
        [PropertyName.StationCustom3SecuritySettings]: exports.StationCustom3SecuritySettings,
        [PropertyName.StationOffSecuritySettings]: exports.StationOffSecuritySettings,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationAlarmArmed]: exports.StationAlarmArmedProperty,
        [PropertyName.StationAlarmArmDelay]: exports.StationAlarmArmDelayProperty,
        [PropertyName.StationAlarmDelay]: exports.StationAlarmDelayProperty,
        [PropertyName.StationAlarmDelayType]: exports.StationAlarmDelayTypeProperty,
        /*[PropertyName.StationSdStatus]: StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: StationSdAvailableCapacityProperty,*/
        [PropertyName.StationStorageInfoEmmc]: exports.StationStorageInfoEmmcProperty,
        [PropertyName.StationStorageInfoHdd]: exports.StationStorageInfoHddProperty,
        [PropertyName.StationCrossCameraTracking]: exports.StationCrossCameraTrackingProperty,
        [PropertyName.StationContinuousTrackingTime]: exports.StationContinuousTrackingTimeProperty,
        [PropertyName.StationTrackingAssistance]: exports.StationTrackingAssistanceProperty,
        [PropertyName.StationCrossTrackingCameraList]: exports.StationCrossTrackingCameraListProperty,
        [PropertyName.StationCrossTrackingGroupList]: exports.StationCrossTrackingGroupListProperty,
    },
    [DeviceType.MINIBASE_CHIME]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationPromptVolume]: exports.StationPromptVolumeProperty,
        [PropertyName.StationAlarmVolume]: exports.StationAlarmVolumeProperty,
        [PropertyName.StationAlarmTone]: exports.StationAlarmToneProperty,
        [PropertyName.StationNotificationSwitchModeSchedule]: exports.StationNotificationSwitchModeScheduleProperty,
        [PropertyName.StationNotificationSwitchModeGeofence]: exports.StationNotificationSwitchModeGeofenceProperty,
        [PropertyName.StationNotificationSwitchModeApp]: exports.StationNotificationSwitchModeAppProperty,
        [PropertyName.StationNotificationSwitchModeKeypad]: exports.StationNotificationSwitchModeKeypadProperty,
        [PropertyName.StationNotificationStartAlarmDelay]: exports.StationNotificationStartAlarmDelayProperty,
        [PropertyName.StationHomeSecuritySettings]: exports.StationHomeSecuritySettings,
        [PropertyName.StationAwaySecuritySettings]: exports.StationAwaySecuritySettings,
        [PropertyName.StationCustom1SecuritySettings]: exports.StationCustom1SecuritySettings,
        [PropertyName.StationCustom2SecuritySettings]: exports.StationCustom2SecuritySettings,
        [PropertyName.StationCustom3SecuritySettings]: exports.StationCustom3SecuritySettings,
        [PropertyName.StationOffSecuritySettings]: exports.StationOffSecuritySettings,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationAlarmArmed]: exports.StationAlarmArmedProperty,
        [PropertyName.StationAlarmArmDelay]: exports.StationAlarmArmDelayProperty,
        [PropertyName.StationAlarmDelay]: exports.StationAlarmDelayProperty,
        [PropertyName.StationAlarmDelayType]: exports.StationAlarmDelayTypeProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.INDOOR_CAMERA]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.INDOOR_CAMERA_1080]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.INDOOR_COST_DOWN_CAMERA]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_1080]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_S350]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_C210]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.INDOOR_PT_CAMERA_C220]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.INDOOR_OUTDOOR_CAMERA_2K]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.OUTDOOR_PT_CAMERA]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
        [PropertyName.StationNotificationSwitchModeSchedule]: exports.StationNotificationSwitchModeScheduleProperty,
        [PropertyName.StationNotificationSwitchModeApp]: exports.StationNotificationSwitchModeAppProperty,
    },
    [DeviceType.DOORBELL]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
    },
    [DeviceType.DOORBELL_SOLO]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
    },
    [DeviceType.BATTERY_DOORBELL_C30]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
    },
    [DeviceType.BATTERY_DOORBELL_C31]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
    },
    [DeviceType.BATTERY_DOORBELL_PLUS_E340]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
    },
    [DeviceType.CAMERA_FG]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        //[PropertyName.StationNotificationSwitchModeSchedule]: StationNotificationSwitchModeScheduleProperty, //TODO: Implement correctly
        //[PropertyName.StationNotificationSwitchModeApp]: StationNotificationSwitchModeAppProperty, //TODO: Implement correctly
    },
    [DeviceType.SOLO_CAMERA]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.SOLO_CAMERA_PRO]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_1080]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_2K]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.SOLO_CAMERA_SOLAR]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.SOLO_CAMERA_C210]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationNotificationSwitchModeSchedule]: exports.StationNotificationSwitchModeScheduleProperty,
        [PropertyName.StationNotificationSwitchModeApp]: exports.StationNotificationSwitchModeAppProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.SOLO_CAMERA_E30]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationNotificationSwitchModeSchedule]: exports.StationNotificationSwitchModeScheduleProperty,
        [PropertyName.StationNotificationSwitchModeApp]: exports.StationNotificationSwitchModeAppProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.FLOODLIGHT]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8422]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8423]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8424]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8425]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.FLOODLIGHT_CAMERA_8426]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
    [DeviceType.WALL_LIGHT_CAM]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationTimeZone]: exports.StationTimeZoneProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationAlarmVolume]: exports.StationAlarmVolumeWalllightProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.WALL_LIGHT_CAM_81A0]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
        [PropertyName.StationAlarmVolume]: exports.StationAlarmVolumeWalllightProperty,
        [PropertyName.StationSdStatus]: exports.StationSdStatusProperty,
        [PropertyName.StationSdCapacity]: exports.StationSdCapacityProperty,
        [PropertyName.StationSdCapacityAvailable]: exports.StationSdAvailableCapacityProperty,
    },
    [DeviceType.CAMERA_GARAGE_T8452]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.CAMERA_GARAGE_T8453]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.CAMERA_GARAGE_T8453_COMMON]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_WIFI]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_WIFI_NO_FINGER]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_8503]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_8504]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_8506]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_8502]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_8592]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_BLE]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.LOCK_BLE_NO_FINGER]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.SMART_SAFE_7400]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.SMART_SAFE_7401]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.SMART_SAFE_7402]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.SMART_SAFE_7403]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.SMART_TRACK_CARD]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.SMART_TRACK_LINK]: {
        ...exports.BaseStationProperties,
    },
    [DeviceType.SMART_DROP]: {
        ...exports.BaseStationProperties,
        [PropertyName.StationLANIpAddress]: exports.StationLanIpAddressStandaloneProperty,
        [PropertyName.StationMacAddress]: exports.StationMacAddressProperty,
        [PropertyName.StationGuardMode]: exports.StationGuardModeProperty,
        [PropertyName.StationCurrentMode]: exports.StationCurrentModeProperty,
        [PropertyName.StationTimeFormat]: exports.StationTimeFormatProperty,
        [PropertyName.StationAlarm]: exports.StationAlarmProperty,
        [PropertyName.StationAlarmType]: exports.StationAlarmTypeProperty,
    },
};
var CommandName;
(function (CommandName) {
    CommandName["DeviceStartLivestream"] = "deviceStartLivestream";
    CommandName["DeviceStopLivestream"] = "deviceStopLivestream";
    CommandName["DeviceQuickResponse"] = "deviceQuickResponse";
    CommandName["DevicePanAndTilt"] = "devicePanAndTilt";
    CommandName["DeviceTriggerAlarmSound"] = "deviceTriggerAlarmSound";
    CommandName["DeviceStartDownload"] = "deviceStartDownload";
    CommandName["DeviceCancelDownload"] = "deviceCancelDownload";
    CommandName["DeviceLockCalibration"] = "deviceLockCalibration";
    CommandName["DeviceCalibrate"] = "deviceCalibrate";
    CommandName["DeviceAddUser"] = "deviceAddUser";
    CommandName["DeviceDeleteUser"] = "deviceDeleteUser";
    CommandName["DeviceUpdateUserPasscode"] = "deviceUpdateUserPasscode";
    CommandName["DeviceUpdateUserSchedule"] = "deviceUpdateUserSchedule";
    CommandName["DeviceUpdateUsername"] = "deviceUpdateUsername";
    CommandName["DeviceSetDefaultAngle"] = "deviceSetDefaultAngle";
    CommandName["DeviceSetPrivacyAngle"] = "deviceSetPrivacyAngle";
    CommandName["DeviceStartTalkback"] = "deviceStartTalkback";
    CommandName["DeviceStopTalkback"] = "deviceStopTalkback";
    CommandName["DeviceUnlock"] = "deviceUnlock";
    CommandName["DeviceSnooze"] = "deviceSnooze";
    CommandName["DeviceVerifyPIN"] = "deviceVerifyPIN";
    CommandName["DeviceQueryAllUserId"] = "deviceQueryAllUserId";
    CommandName["DeviceCalibrateGarageDoor"] = "deviceCalibrateGarageDoor";
    CommandName["DevicePresetPosition"] = "devicePresetPosition";
    CommandName["DeviceSavePresetPosition"] = "deviceSavePresetPosition";
    CommandName["DeviceDeletePresetPosition"] = "deviceDeletePresetPosition";
    CommandName["DeviceOpen"] = "deviceOpen";
    CommandName["StationReboot"] = "stationReboot";
    CommandName["StationTriggerAlarmSound"] = "stationTriggerAlarmSound";
    CommandName["StationChime"] = "stationChime";
    CommandName["StationDownloadImage"] = "stationDownloadImage";
    CommandName["StationDatabaseQueryLatestInfo"] = "stationDatabaseQueryLatestInfo";
    CommandName["StationDatabaseQueryLocal"] = "stationDatabaseQueryLocal";
    CommandName["StationDatabaseDelete"] = "stationDatabaseDelete";
    CommandName["StationDatabaseCountByDate"] = "stationDatabaseCoundByDate";
})(CommandName || (exports.CommandName = CommandName = {}));
exports.DeviceCommands = {
    [DeviceType.CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA2]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA2C]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA3]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA3C]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA3_PRO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.PROFESSIONAL_247]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA2C_PRO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA2_PRO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA_E]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.DOORBELL]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL_2]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL_PLUS]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL_C30]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL_C31]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.BATTERY_DOORBELL_PLUS_E340]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.DOORBELL_SOLO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_CAMERA_1080]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_2K]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_PT_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_PT_CAMERA_1080]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_COST_DOWN_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceSetDefaultAngle,
        CommandName.DeviceSetPrivacyAngle,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_PT_CAMERA_S350]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
        CommandName.DevicePresetPosition,
        CommandName.DeviceSavePresetPosition,
        CommandName.DeviceDeletePresetPosition,
    ],
    [DeviceType.INDOOR_PT_CAMERA_C210]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.INDOOR_PT_CAMERA_C220]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.OUTDOOR_PT_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
        CommandName.DevicePresetPosition,
        CommandName.DeviceSavePresetPosition,
        CommandName.DeviceDeletePresetPosition,
    ],
    [DeviceType.CAMERA_FG]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_PRO]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_1080]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_2K]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_SOLAR]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_C210]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.SOLO_CAMERA_E30]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8422]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8423]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8424]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8425]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
        CommandName.DevicePresetPosition,
        CommandName.DeviceSavePresetPosition,
        CommandName.DeviceDeletePresetPosition,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8426]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DevicePanAndTilt,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceCalibrate,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
        CommandName.DevicePresetPosition,
        CommandName.DeviceSavePresetPosition,
        CommandName.DeviceDeletePresetPosition,
    ],
    [DeviceType.WALL_LIGHT_CAM]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.WALL_LIGHT_CAM_81A0]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceTriggerAlarmSound,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
    ],
    [DeviceType.CAMERA_GARAGE_T8452]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
        CommandName.DeviceCalibrateGarageDoor,
    ],
    [DeviceType.CAMERA_GARAGE_T8453]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
        CommandName.DeviceCalibrateGarageDoor,
    ],
    [DeviceType.CAMERA_GARAGE_T8453_COMMON]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
        CommandName.DeviceCalibrateGarageDoor,
    ],
    [DeviceType.KEYPAD]: [],
    [DeviceType.LOCK_BLE]: [],
    [DeviceType.LOCK_BLE_NO_FINGER]: [],
    [DeviceType.LOCK_WIFI]: [
        CommandName.DeviceLockCalibration,
        CommandName.DeviceAddUser,
        CommandName.DeviceDeleteUser,
        CommandName.DeviceUpdateUserPasscode,
        CommandName.DeviceUpdateUserSchedule,
        CommandName.DeviceUpdateUsername,
    ],
    [DeviceType.LOCK_8503]: [
        CommandName.DeviceLockCalibration,
        CommandName.DeviceAddUser,
        CommandName.DeviceDeleteUser,
        CommandName.DeviceUpdateUserPasscode,
        CommandName.DeviceUpdateUserSchedule,
        CommandName.DeviceUpdateUsername,
    ],
    [DeviceType.LOCK_8504]: [
        CommandName.DeviceLockCalibration,
        CommandName.DeviceAddUser,
        CommandName.DeviceDeleteUser,
        CommandName.DeviceUpdateUserPasscode,
        CommandName.DeviceUpdateUserSchedule,
        CommandName.DeviceUpdateUsername,
    ],
    [DeviceType.LOCK_8506]: [
        CommandName.DeviceLockCalibration,
        CommandName.DeviceAddUser,
        CommandName.DeviceDeleteUser,
        CommandName.DeviceUpdateUserPasscode,
        CommandName.DeviceUpdateUserSchedule,
        CommandName.DeviceUpdateUsername,
    ],
    [DeviceType.LOCK_8502]: [
        CommandName.DeviceLockCalibration,
        CommandName.DeviceAddUser,
        CommandName.DeviceDeleteUser,
        CommandName.DeviceUpdateUserPasscode,
        CommandName.DeviceUpdateUserSchedule,
        CommandName.DeviceUpdateUsername,
    ],
    [DeviceType.LOCK_WIFI_NO_FINGER]: [
        CommandName.DeviceLockCalibration,
        CommandName.DeviceAddUser,
        CommandName.DeviceDeleteUser,
        CommandName.DeviceUpdateUserPasscode,
        CommandName.DeviceUpdateUserSchedule,
        CommandName.DeviceUpdateUsername,
    ],
    [DeviceType.LOCK_8530]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceQuickResponse,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceSnooze,
        CommandName.DeviceLockCalibration,
        CommandName.DeviceAddUser,
        CommandName.DeviceDeleteUser,
        CommandName.DeviceUpdateUserPasscode,
        CommandName.DeviceUpdateUserSchedule,
        CommandName.DeviceUpdateUsername,
    ],
    [DeviceType.MOTION_SENSOR]: [],
    [DeviceType.SENSOR]: [],
    [DeviceType.SMART_SAFE_7400]: [
        CommandName.DeviceUnlock,
        CommandName.DeviceVerifyPIN,
    ],
    [DeviceType.SMART_SAFE_7401]: [
        CommandName.DeviceUnlock,
        CommandName.DeviceVerifyPIN,
    ],
    [DeviceType.SMART_SAFE_7402]: [
        CommandName.DeviceUnlock,
        CommandName.DeviceVerifyPIN,
    ],
    [DeviceType.SMART_SAFE_7403]: [
        CommandName.DeviceUnlock,
        CommandName.DeviceVerifyPIN,
    ],
    [DeviceType.SMART_TRACK_CARD]: [],
    [DeviceType.SMART_TRACK_LINK]: [],
    [DeviceType.SMART_DROP]: [
        CommandName.DeviceStartLivestream,
        CommandName.DeviceStopLivestream,
        CommandName.DeviceStartDownload,
        CommandName.DeviceCancelDownload,
        CommandName.DeviceStartTalkback,
        CommandName.DeviceStopTalkback,
        CommandName.DeviceOpen,
    ],
};
exports.StationCommands = {
    [DeviceType.STATION]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationChime,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.HB3]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.MINIBASE_CHIME]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationChime,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_CAMERA_1080]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_COST_DOWN_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_1080P_NO_LIGHT]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_OUTDOOR_CAMERA_2K]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_PT_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_PT_CAMERA_1080]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_PT_CAMERA_S350]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_PT_CAMERA_C210]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.INDOOR_PT_CAMERA_C220]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.OUTDOOR_PT_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.DOORBELL]: [
        CommandName.StationReboot,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.DOORBELL_SOLO]: [
        CommandName.StationReboot,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.BATTERY_DOORBELL_C30]: [
        CommandName.StationReboot,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.BATTERY_DOORBELL_C31]: [
        CommandName.StationReboot,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.BATTERY_DOORBELL_PLUS_E340]: [
        CommandName.StationReboot,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.SOLO_CAMERA]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.SOLO_CAMERA_PRO]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_1080]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_2K]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
    ],
    [DeviceType.SOLO_CAMERA_SPOTLIGHT_SOLAR]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.SOLO_CAMERA_SOLAR]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.SOLO_CAMERA_C210]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.SOLO_CAMERA_E30]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.FLOODLIGHT]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8422]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8423]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8424]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8425]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.FLOODLIGHT_CAMERA_8426]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.CAMERA_FG]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
    ],
    [DeviceType.WALL_LIGHT_CAM]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.WALL_LIGHT_CAM_81A0]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,
    ],
    [DeviceType.CAMERA_GARAGE_T8452]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        /*CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,*/
    ],
    [DeviceType.CAMERA_GARAGE_T8453]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        /*CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,*/
    ],
    [DeviceType.CAMERA_GARAGE_T8453_COMMON]: [
        CommandName.StationReboot,
        CommandName.StationTriggerAlarmSound,
        CommandName.StationDownloadImage,
        /*CommandName.StationDatabaseQueryLatestInfo,
        CommandName.StationDatabaseQueryLocal,
        CommandName.StationDatabaseCountByDate,
        CommandName.StationDatabaseDelete,*/
    ],
    [DeviceType.KEYPAD]: [],
    [DeviceType.LOCK_BLE]: [],
    [DeviceType.LOCK_BLE_NO_FINGER]: [],
    [DeviceType.LOCK_WIFI]: [],
    [DeviceType.LOCK_WIFI_NO_FINGER]: [],
    [DeviceType.SMART_TRACK_CARD]: [],
    [DeviceType.SMART_TRACK_LINK]: [],
    [DeviceType.SMART_DROP]: [],
};
//# sourceMappingURL=types.js.map