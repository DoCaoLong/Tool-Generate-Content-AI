import type { Provider } from "@/lib/types";

export const providerLabels: Record<Provider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  anthropic: "Anthropic",
  xai: "xAI",
  openrouter: "OpenRouter",
};

export const providerModels: Record<Provider, string[]> = {
  openai: ["gpt-5.6-terra", "gpt-5.6", "gpt-5-mini", "gpt-4o-mini"],
  gemini: ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat"],
  anthropic: ["claude-opus-5", "claude-sonnet-5", "claude-fable-5"],
  xai: ["grok-4.6", "grok-4.5", "grok-4.3"],
  openrouter: ["openrouter/auto", "~openai/gpt-latest", "~anthropic/claude-sonnet-latest", "~google/gemini-flash-latest", "deepseek/deepseek-chat"],
};

export const providers = Object.keys(providerLabels) as Provider[];
