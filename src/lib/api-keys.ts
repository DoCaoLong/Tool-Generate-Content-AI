export const managedApiKeyIds = ["sorsa"] as const;
export type ManagedApiKeyId = (typeof managedApiKeyIds)[number];

export const managedApiKeyLabels: Record<ManagedApiKeyId, string> = {
  sorsa: "Sorsa",
};

export const SETTINGS_API_KEYS_ID = "api_keys";

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`;
}
