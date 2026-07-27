import { DeviceProperties, DeviceType, PropertyName } from "../types";

describe("E340 device properties", () => {
  it("exposes the writable speaker toggle supported by the official app", () => {
    const speaker = DeviceProperties[DeviceType.BATTERY_DOORBELL_PLUS_E340][PropertyName.DeviceSpeaker];

    expect(speaker).toEqual(
      expect.objectContaining({
        name: PropertyName.DeviceSpeaker,
        type: "boolean",
        readable: true,
        writeable: true,
      })
    );
  });
});
