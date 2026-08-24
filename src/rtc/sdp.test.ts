import { compactRTCSessionDescription, expandRTCSessionDescription } from "./sdp";

describe("RTC compact SDP", () => {
  const compact = {
    ice: {
      ufrag: "user-fragment",
      pwd: "ice-password",
      fingerprint_type: "sha-256",
      fingerprint: "001122AABBCC",
    },
    setup: "active",
    candidate: ["1 1 UDP 1 192.0.2.1 5000 typ host"],
  };

  it("expands the compact signaling payload into a data-channel offer", () => {
    const sdp = expandRTCSessionDescription(compact, 1234);

    expect(sdp).toContain("o=- 1234 1 IN IP4 127.0.0.1\r\n");
    expect(sdp).toContain("m=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n");
    expect(sdp).toContain("a=mid:2\r\n");
    expect(sdp).toContain("a=fingerprint:sha-256 00:11:22:AA:BB:CC\r\n");
    expect(sdp).toContain("a=candidate:1 1 UDP 1 192.0.2.1 5000 typ host\r\n");
  });

  it("compacts an answer without carrying browser-generated SDP boilerplate", () => {
    const result = compactRTCSessionDescription(expandRTCSessionDescription(compact, 1234));

    expect(result).toEqual(compact);
  });

  it("omits actpass from an answer so the receiver can apply its default", () => {
    const result = compactRTCSessionDescription(
      "v=0\r\na=ice-ufrag:u\r\na=ice-pwd:p\r\na=setup:actpass\r\na=sctp-port:5000\r\n"
    );

    expect(result.setup).toBeUndefined();
  });
});
