export interface RTCCompactIce {
  ufrag?: string;
  pwd?: string;
  fingerprint?: string;
  fingerprint_type?: string;
}

export interface RTCCompactSessionDescription {
  ice?: RTCCompactIce;
  setup?: string;
  candidate?: Array<string>;
}

const SDP_LINE_BREAK = "\r\n";

export const expandRTCSessionDescription = (
  description: RTCCompactSessionDescription,
  sessionId = Date.now()
): string => {
  const lines = [
    "v=0",
    `o=- ${Math.floor(sessionId)} 1 IN IP4 127.0.0.1`,
    "s=Anker Webrtc Stream",
    "t=0 0",
    "a=group:BUNDLE 2",
    "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
    "c=IN IP4 127.0.0.1",
    "a=mid:2",
    "a=ice-options:trickle",
  ];

  if (description.ice?.ufrag) lines.push(`a=ice-ufrag:${description.ice.ufrag}`);
  if (description.ice?.pwd) lines.push(`a=ice-pwd:${description.ice.pwd}`);
  if (description.ice?.fingerprint) {
    const fingerprint = description.ice.fingerprint.replace(/(.{2})(?=.)/g, "$1:");
    lines.push(`a=fingerprint:${description.ice.fingerprint_type ?? "sha-256"} ${fingerprint}`);
  }

  lines.push(`a=setup:${description.setup ?? "actpass"}`);
  lines.push("a=sctp-port:5000");
  lines.push("a=max-message-size:262144");
  for (const candidate of description.candidate ?? []) lines.push(`a=candidate:${candidate}`);

  return `${lines.join(SDP_LINE_BREAK)}${SDP_LINE_BREAK}`;
};

export const compactRTCSessionDescription = (sdp: string): RTCCompactSessionDescription => {
  const description: RTCCompactSessionDescription = {
    ice: {},
  };

  const setup = sdp.match(/a=setup:([^\r\n]+)/)?.[1];
  if (setup && setup !== "actpass") description.setup = setup;

  const ufrag = sdp.match(/a=ice-ufrag:([^\r\n]+)/)?.[1];
  if (ufrag) description.ice!.ufrag = ufrag;

  const pwd = sdp.match(/a=ice-pwd:([^\r\n]+)/)?.[1];
  if (pwd) description.ice!.pwd = pwd;

  const fingerprint = sdp.match(/a=fingerprint:([^\s]+)\s+([^\r\n]+)/);
  if (fingerprint?.[2]) {
    description.ice!.fingerprint_type = fingerprint[1];
    description.ice!.fingerprint = fingerprint[2].replace(/:/g, "");
  }

  const candidates: Array<string> = [];
  for (const line of sdp.split(/\r\n|\r|\n/)) {
    const candidate = line.match(/^a=candidate:(.+)/)?.[1];
    if (candidate) candidates.push(candidate);
  }
  if (candidates.length > 0) description.candidate = candidates;

  return description;
};
