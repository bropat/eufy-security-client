import { isSuccessfulResponseCode } from "../api";
import { ResponseErrorCode } from "../types";

describe("isSuccessfulResponseCode", () => {
  it("accepts the legacy success code", () => {
    expect(isSuccessfulResponseCode(ResponseErrorCode.CODE_OK)).toBe(true);
  });

  it("accepts the HTTP-style success code returned by Mega/v6", () => {
    expect(isSuccessfulResponseCode(200)).toBe(true);
  });

  it("rejects an error code", () => {
    expect(isSuccessfulResponseCode(500)).toBe(false);
  });
});
