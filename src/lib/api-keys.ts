export const xProviderIds = ["sorsa", "twitterapis"] as const;
export type XProviderId = (typeof xProviderIds)[number];

export const managedApiKeyIds = xProviderIds;
export type ManagedApiKeyId = XProviderId;

export const managedApiKeyLabels: Record<ManagedApiKeyId, string> = {
  sorsa: "Sorsa",
  twitterapis: "TwitterAPIs",
};

export function isXProviderId(value: unknown): value is XProviderId {
  return value === "sorsa" || value === "twitterapis";
}

export const SETTINGS_API_KEYS_ID = "api_keys";

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`;
}
