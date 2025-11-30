import {
  PropertyMetadataBoolean,
  PropertyMetadataNumeric,
} from "../../interfaces";
import { CommandType } from "../../../p2p";
import {
  DeviceVideoRecordingQualityWalllightProperty,
  PropertyName,
} from "../../types";

// HomeBase Types

export enum HB3DetectionTypes {
  HUMAN_DETECTION = 2,
  VEHICLE_DETECTION = 4,
  PET_DETECTION = 8,
  ALL_OTHER_MOTION = 32768,
  HUMAN_RECOGNITION = 131072,
}

// HomeBase 3 Properties

export const DeviceVideoRecordingQualitySoloCamerasHB3Property: PropertyMetadataNumeric =
  {
    ...DeviceVideoRecordingQualityWalllightProperty,
    states: {
      1: "2K HD",
      2: "Full HD (1080P)",
    },
  };

export const DeviceMotionHB3DetectionTypeHumanProperty: PropertyMetadataBoolean =
  {
    key: CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypeHuman,
    label: "Motion Detection Type Human",
    readable: true,
    writeable: true,
    type: "boolean",
  };

export const DeviceMotionHB3DetectionTypeHumanRecognitionProperty: PropertyMetadataBoolean =
  {
    key: CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypeHumanRecognition,
    label: "Motion Detection Type Human Recognition",
    readable: true,
    writeable: true,
    type: "boolean",
  };

export const DeviceMotionHB3DetectionTypePetProperty: PropertyMetadataBoolean =
  {
    key: CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypePet,
    label: "Motion Detection Type Pet",
    readable: true,
    writeable: true,
    type: "boolean",
  };

export const DeviceMotionHB3DetectionTypeVehicleProperty: PropertyMetadataBoolean =
  {
    key: CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypeVehicle,
    label: "Motion Detection Type Vehicle",
    readable: true,
    writeable: true,
    type: "boolean",
  };

export const DeviceMotionHB3DetectionTypeAllOtherMotionsProperty: PropertyMetadataBoolean =
  {
    key: CommandType.CMD_SET_MOTION_DETECTION_TYPE_HB3,
    name: PropertyName.DeviceMotionDetectionTypeAllOtherMotions,
    label: "Motion Detection Type All Other Motions",
    readable: true,
    writeable: true,
    type: "boolean",
  };

// HomeBase3 Methods

export const isHB3DetectionModeEnabled = function (
  value: number,
  type: HB3DetectionTypes,
): boolean {
  if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
    return (type & value) == type && (value & 65536) == 65536;
  } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
    return (type & value) == type && (value & 1) == 1;
  }
  return (type & value) == type;
};

export const getHB3DetectionMode = function (
  value: number,
  type: HB3DetectionTypes,
  enable: boolean,
): number {
  let result = 0;
  if (!enable) {
    if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
      const tmp = (type & value) == type ? type ^ value : value;
      result = (value & 65536) == 65536 ? tmp ^ 65536 : tmp;
    } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
      const tmp = (type & value) == type ? type ^ value : value;
      result = (value & 1) == 1 ? tmp ^ 1 : tmp;
    } else {
      result = type ^ value;
    }
  } else {
    if (type === HB3DetectionTypes.HUMAN_RECOGNITION) {
      result = type | value | 65536;
    } else if (type === HB3DetectionTypes.HUMAN_DETECTION) {
      result = type | value | 1;
    } else {
      result = type | value;
    }
  }
  return result;
};
