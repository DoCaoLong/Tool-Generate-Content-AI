import { fetchSorsaAvatars } from "@/lib/sorsa-avatar";
import { fetchTwitterApisAvatars } from "@/lib/twitterapis";
import { getXApiConfig } from "@/lib/x-provider";

export async function fetchKolAvatars(usernames: string[]) {
  const config = await getXApiConfig();
  if (!config.apiKey) return new Map<string, string>();
  if (config.provider === "twitterapis") return fetchTwitterApisAvatars(usernames, config.apiKey);
  return fetchSorsaAvatars(usernames);
}
