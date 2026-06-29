import { buildLockPayload, decodeEvent, EslOpcode } from "./esl";

// Golden vectors captured live from a FamiLock C32 (T85L1) the lock acknowledged with `00`.
const OWNER = "99ec80cbf1daa7199af932aa4dd246a867aceb89";
const SN = "T85L1P10260602AA";

describe("ESL codec", () => {
    test("buildLockPayload reproduces a verified unlock command byte-for-byte", () => {
        const hex = buildLockPayload({
            accountId: OWNER,
            deviceSn: SN,
            ts: 1782727921,
            opcode: EslOpcode.Unlock,
            includeUser: true,
            userName: "Autohome",
            shortUserId: 1,
        });
        expect(hex).toBe(
            "ff096a000300024023409d33d5cffe39e97fca140df45face8265ab25290c26b052f61ac16092a367e66f6831" +
                "8412a7602203097ac5e2618840d588381ef78b36115146d3abdc34f68f8abb43915407d407c40e88f68002af90" +
                "7f08b2314e4574d0f381e76d280c04fff"
        );
    });

    test("decodeEvent reads lock status from plaintext event frames", () => {
        // a2 = 03 -> Unlocked, 04 -> Locked
        expect(decodeEvent("FF091400030102004A00A10163A20103A3010168")?.status).toBe(3);
        expect(decodeEvent("FF091400030102004A00A10163A20104A301016F")?.status).toBe(4);
    });

    test("decodeEvent ignores command-response frames (byte[5] !== 0x01)", () => {
        expect(decodeEvent("FF091A000300024823CFF4E70AD1C651D2A6A982A57D8F014A55")).toBeNull();
    });
});
