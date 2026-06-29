/**
 * Standalone demo of the eufy "mega" cloud API (app-name: eufy_mega).
 * Logs in, then fetches the house list. Requires env vars:
 *   EUFY_EMAIL, EUFY_PW, optional EUFY_REGION (eu|us, default eu)
 *
 *   EUFY_EMAIL=you@example.com EUFY_PW=secret node examples/mega-login.ts
 */
import { MegaApi } from "../src/http/mega.ts";

const email = process.env.EUFY_EMAIL;
const password = process.env.EUFY_PW;
if (!email || !password) {
    console.error("Set EUFY_EMAIL and EUFY_PW environment variables.");
    process.exit(2);
}
const region = (process.env.EUFY_REGION as "eu" | "us") ?? "eu";

const api = new MegaApi({ region, log: (m, ...a) => console.log("[mega]", m, ...a) });
await api.keyExchange();
const profile = await api.login(email, password);
console.log("logged in:", { user_id: profile.user_id, email: (profile as Record<string, unknown>).email });

// --- provision the legacy eufy_security MQTT client cert (lock command channel) ---
try {
    const iot = await api.registerIotMqtt();
    console.log("registerIotMqtt keys:", Object.keys(iot));
    console.log("registerIotMqtt:", JSON.stringify(iot).slice(0, 1500));
} catch (e) {
    console.error("registerIotMqtt error:", (e as Error).message);
}
