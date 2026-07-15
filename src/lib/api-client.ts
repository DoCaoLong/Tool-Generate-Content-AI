/**
 * API client utilities for Gemini, OpenAI, and DeepSeek content generation
 */

export interface GenerateOptions {
    apiKey: string;
    model: string;
    prompt: any;
}

export interface GenerateResponse {
    success: boolean;
    content?: string;
    error?: string;
}

async function generateWithOpenAICompatibleApi(
    options: GenerateOptions & {
        providerName: string;
        endpoint: string;
    }
): Promise<GenerateResponse> {
    const { apiKey, model, prompt, providerName, endpoint } = options;

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
                temperature: 0.7,
                max_tokens: 2048,
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

async function validateOpenAICompatibleKey(
    options: {
        apiKey: string;
        model: string;
        providerName: string;
        endpoint: string;
    }
): Promise<{ valid: boolean; error?: string }> {
    const { apiKey, model, providerName, endpoint } = options;

    if (!apiKey) {
        return { valid: false, error: "API key is required" };
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "user",
                        content: "Test",
                    },
                ],
                max_tokens: 5,
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
