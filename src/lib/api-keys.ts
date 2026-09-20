export const managedApiKeyIds = ["openai", "gemini", "deepseek", "anthropic", "xai", "openrouter", "sorsa"] as const;
export type ManagedApiKeyId = (typeof managedApiKeyIds)[number];

export const managedApiKeyLabels: Record<ManagedApiKeyId, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  anthropic: "Anthropic",
  xai: "xAI",
  openrouter: "OpenRouter",
  sorsa: "Sorsa",
};

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`;
}
