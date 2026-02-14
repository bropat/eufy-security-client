import { createECDH } from "crypto";

import { decryptP2PKeyECDH, getLockV12Key } from "../utils";

describe('P2P Utils', () => {
  const device = createECDH("prime256v1");
  device.generateKeys();
  const eccPrivateKey = device.getPrivateKey("hex");

  test("Test decryptP2PKeyECDH with compressed pubkey only" , () => {
    const peer = createECDH("prime256v1");
    peer.generateKeys();

    const result = decryptP2PKeyECDH(Buffer.from(peer.getPublicKey("hex", "compressed"), "hex"), eccPrivateKey);
    expect(result).toEqual(device.computeSecret(peer.getPublicKey()).subarray(0, 16));
  });

  test("Test decryptP2PKeyECDH with uncompressed pubkey only" , () => {
    const peer = createECDH("prime256v1");
    peer.generateKeys();

    const result = decryptP2PKeyECDH(peer.getPublicKey(), eccPrivateKey);
    expect(result).toEqual(device.computeSecret(peer.getPublicKey()).subarray(0, 16));
  });

  test("Test decryptP2PKeyECDH with ECIES envelope" , () => {
    const sessionKey = "0123456789abcdef0123456789abcdef";
    const envelope = Buffer.from(getLockV12Key(sessionKey, device.getPublicKey("hex").substring(2)), "hex");

    expect(decryptP2PKeyECDH(envelope, eccPrivateKey)).toEqual(Buffer.from(sessionKey, "hex"));
  });

  test("Test decryptP2PKeyECDH with 48-byte ECIES payload" , () => {
    const plaintext = Buffer.alloc(48, 0xab).toString("hex");
    const envelope = Buffer.from(getLockV12Key(plaintext, device.getPublicKey("hex").substring(2)), "hex");

    expect(decryptP2PKeyECDH(envelope, eccPrivateKey)).toEqual(Buffer.from(plaintext, "hex").subarray(0, 16));
  });

  test("Test decryptP2PKeyECDH result is always 16 bytes" , () => {
    const peer = createECDH("prime256v1");
    peer.generateKeys();

    const result = decryptP2PKeyECDH(Buffer.from(peer.getPublicKey("hex", "compressed"), "hex"), eccPrivateKey);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(16);
  });

  test("Test decryptP2PKeyECDH deterministic output" , () => {
    const peer = createECDH("prime256v1");
    peer.generateKeys();
    const pub = Buffer.from(peer.getPublicKey("hex", "compressed"), "hex");

    expect(decryptP2PKeyECDH(pub, eccPrivateKey)).toEqual(decryptP2PKeyECDH(pub, eccPrivateKey));
  });

});
