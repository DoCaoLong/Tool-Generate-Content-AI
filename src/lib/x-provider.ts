import { SETTINGS_API_KEYS_ID, isXProviderId, type XProviderId } from "@/lib/api-keys";
import { getDb } from "@/lib/mongodb";

export interface XApiConfig {
  provider: XProviderId;
  apiKey: string;
}

function readKeys(value: unknown) {
  if (!value || typeof value !== "object") return { sorsa: "", twitterapis: "" };
  const record = value as Record<string, unknown>;
  return {
    sorsa: typeof record.sorsa === "string" ? record.sorsa.trim() : "",
    twitterapis: typeof record.twitterapis === "string" ? record.twitterapis.trim() : "",
  };
}

export async function readXApiSettings() {
  const doc = await (await getDb()).collection("settings").findOne({ _id: SETTINGS_API_KEYS_ID as never });
  const keys = readKeys(doc?.keys);
  const provider: XProviderId = isXProviderId(doc?.xProvider) ? doc.xProvider : "sorsa";
  return { provider, keys };
}

export function resolveXApiKey(provider: XProviderId, keys: { sorsa: string; twitterapis: string }) {
  if (provider === "twitterapis") return (process.env.TWITTERAPIS_API_KEY || keys.twitterapis || "").trim();
  return (process.env.SORSA_API_KEY || keys.sorsa || "").trim();
}

export async function getXApiConfig(): Promise<XApiConfig> {
  const settings = await readXApiSettings();
  return { provider: settings.provider, apiKey: resolveXApiKey(settings.provider, settings.keys) };
}
