/**
 * API client utilities for supported content-generation providers.
 */

import type { Provider } from "@/lib/types";

export interface GenerateOptions {
    apiKey: string;
    model: string;
    prompt: unknown;
}

export interface GenerateResponse {
    success: boolean;
    content?: string;
    error?: string;
}

function buildOpenAICompatibleTokenConfig(
    providerName: string,
    maxOutputTokens: number
) {
    if (providerName === "OpenAI") {
        return {
            max_completion_tokens: maxOutputTokens,
        };
    }

    return {
        max_tokens: maxOutputTokens,
    };
}

function buildOpenAICompatibleSamplingConfig(providerName: string) {
    if (providerName === "OpenAI") {
        return {};
    }

    return {
        temperature: 0.7,
    };
}

async function generateWithOpenAICompatibleApi(
    options: GenerateOptions & {
        providerName: string;
        endpoint: string;
        extraHeaders?: Record<string, string>;
    }
): Promise<GenerateResponse> {
    const { apiKey, model, prompt, providerName, endpoint, extraHeaders } = options;

    if (!apiKey) {
        return {
            success: false,
            error: `API key is required for ${providerName}`,
        };
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                ...extraHeaders,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a helpful content writer. Follow the instructions in the user message exactly.",
                    },
                    {
                        role: "user",
                        content: JSON.stringify(prompt, null, 2),
                    },
                ],
                ...buildOpenAICompatibleSamplingConfig(providerName),
                ...buildOpenAICompatibleTokenConfig(providerName, 2048),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error?.message || `API error: ${response.status}`,
            };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return {
                success: false,
                error: `No content generated from ${providerName} API`,
            };
        }

        return {
            success: true,
            content,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}

/**
 * Generate content using Google Gemini API
 */
export async function generateWithGemini(
    options: GenerateOptions
): Promise<GenerateResponse> {
    const { apiKey, model, prompt } = options;

    if (!apiKey) {
        return {
            success: false,
            error: "API key is required for Gemini",
        };
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: JSON.stringify(prompt, null, 2),
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error?.message || `API error: ${response.status}`,
            };
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            return {
                success: false,
                error: "No content generated from Gemini API",
            };
        }

        return {
            success: true,
            content,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}

/**
 * Generate content using OpenAI API
 */
export async function generateWithOpenAI(
    options: GenerateOptions
): Promise<GenerateResponse> {
    return generateWithOpenAICompatibleApi({
        ...options,
        providerName: "OpenAI",
        endpoint: "https://api.openai.com/v1/chat/completions",
    });
}

/**
 * Generate content using DeepSeek API
 */
export async function generateWithDeepSeek(
    options: GenerateOptions
): Promise<GenerateResponse> {
    return generateWithOpenAICompatibleApi({
        ...options,
        providerName: "DeepSeek",
        endpoint: "https://api.deepseek.com/chat/completions",
    });
}

/** Generate content using xAI's OpenAI-compatible API. */
export async function generateWithXAI(options: GenerateOptions): Promise<GenerateResponse> {
    return generateWithOpenAICompatibleApi({
        ...options,
        providerName: "xAI",
        endpoint: "https://api.x.ai/v1/chat/completions",
    });
}

/** Generate content through OpenRouter's unified API. */
export async function generateWithOpenRouter(options: GenerateOptions): Promise<GenerateResponse> {
    return generateWithOpenAICompatibleApi({
        ...options,
        providerName: "OpenRouter",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        extraHeaders: {
            "X-OpenRouter-Title": "Content Studio",
        },
    });
}

/** Generate content using Anthropic's Messages API. */
export async function generateWithAnthropic(options: GenerateOptions): Promise<GenerateResponse> {
    const { apiKey, model, prompt } = options;
    if (!apiKey) return { success: false, error: "API key is required for Anthropic" };

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
                model,
                max_tokens: 2048,
                system: "You are a helpful content writer. Follow the instructions in the user message exactly.",
                messages: [{ role: "user", content: JSON.stringify(prompt, null, 2) }],
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return { success: false, error: data.error?.message || `API error: ${response.status}` };
        const content = data.content?.filter((item: { type?: string }) => item.type === "text").map((item: { text?: string }) => item.text || "").join("\n").trim();
        return content ? { success: true, content } : { success: false, error: "No content generated from Anthropic API" };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
    }
}

async function validateOpenAICompatibleKey(
    options: {
        apiKey: string;
        model: string;
        providerName: string;
        endpoint: string;
        extraHeaders?: Record<string, string>;
    }
): Promise<{ valid: boolean; error?: string }> {
    const { apiKey, model, providerName, endpoint, extraHeaders } = options;

    if (!apiKey) {
        return { valid: false, error: "API key is required" };
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                ...extraHeaders,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "user",
                        content: "Test",
                    },
                ],
                ...buildOpenAICompatibleTokenConfig(providerName, 5),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || "";

            if (response.status === 401) {
                return { valid: false, error: "Invalid API key" };
            }
            if (response.status === 403) {
                return { valid: false, error: "API key expired or access denied" };
            }
            if (errorMessage.includes("quota") || errorMessage.includes("insufficient_quota")) {
                return { valid: false, error: "API quota exceeded or insufficient credits" };
            }
            if (errorMessage.includes("model") && response.status === 404) {
                return { valid: false, error: "Model not available for your account" };
            }

            return {
                valid: false,
                error: errorMessage || `${providerName} error: ${response.status}`,
            };
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : "Network error",
        };
    }
}

/**
 * Validate Gemini API key by making a simple test request
 */
export async function validateGeminiKey(
    apiKey: string,
    model: string
): Promise<{ valid: boolean; error?: string }> {
    if (!apiKey) {
        return { valid: false, error: "API key is required" };
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: "Test",
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        maxOutputTokens: 10,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || "";

            if (response.status === 400 && errorMessage.includes("API_KEY_INVALID")) {
                return { valid: false, error: "Invalid API key" };
            }
            if (response.status === 403) {
                return { valid: false, error: "API key expired or access denied" };
            }
            if (errorMessage.includes("quota")) {
                return { valid: false, error: "API quota exceeded" };
            }

            return { valid: false, error: errorMessage || `Error: ${response.status}` };
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : "Network error",
        };
    }
}

/**
 * Validate OpenAI API key by making a simple test request
 */
export async function validateOpenAIKey(
    apiKey: string,
    model: string
): Promise<{ valid: boolean; error?: string }> {
    return validateOpenAICompatibleKey({
        apiKey,
        model,
        providerName: "OpenAI",
        endpoint: "https://api.openai.com/v1/chat/completions",
    });
}

/**
 * Validate DeepSeek API key by making a simple test request
 */
export async function validateDeepSeekKey(
    apiKey: string,
    model: string
): Promise<{ valid: boolean; error?: string }> {
    return validateOpenAICompatibleKey({
        apiKey,
        model,
        providerName: "DeepSeek",
        endpoint: "https://api.deepseek.com/chat/completions",
    });
}

export async function checkProviderApi(provider: Provider, apiKey: string, model: string): Promise<{ valid: boolean; error?: string }> {
    if (!apiKey.trim()) return { valid: false, error: "Hãy nhập API key." };
    if (provider === "gemini") return validateGeminiKey(apiKey, model);
    if (provider === "openai") return validateOpenAIKey(apiKey, model);
    if (provider === "deepseek") return validateDeepSeekKey(apiKey, model);
    if (provider === "xai") {
        return validateOpenAICompatibleKey({ apiKey, model, providerName: "xAI", endpoint: "https://api.x.ai/v1/chat/completions" });
    }
    if (provider === "openrouter") {
        return validateOpenAICompatibleKey({ apiKey, model, providerName: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", extraHeaders: { "X-OpenRouter-Title": "Content Studio" } });
    }
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: "user", content: "Test" }] }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) return { valid: false, error: "API key không hợp lệ." };
        if (response.status === 403) return { valid: false, error: "API key hết hạn hoặc không có quyền." };
        if (!response.ok) return { valid: false, error: data.error?.message || `API error: ${response.status}` };
        return { valid: true };
    } catch (error) {
        return { valid: false, error: error instanceof Error ? error.message : "Không thể kết nối tới API." };
    }
}
