import { SETTINGS_API_KEYS_ID } from "@/lib/api-keys";
import { getDb } from "@/lib/mongodb";

export async function getSorsaApiKey() {
  const fromEnv = (process.env.SORSA_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const doc = await (await getDb()).collection("settings").findOne({ _id: SETTINGS_API_KEYS_ID as never });
  return String(((doc?.keys || {}) as Record<string, string>).sorsa || "").trim();
}
