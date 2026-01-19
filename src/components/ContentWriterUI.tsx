"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Eraser, Eye, EyeOff, ExternalLink, Link2, Moon, Sun, Wand2, Languages } from "lucide-react";
import { generateWithGemini, generateWithOpenAI, validateGeminiKey, validateOpenAIKey } from "@/lib/api-client";
import { useTranslation } from "react-i18next";

const DEFAULT_PROMPT = {
  rewrite_goal: "Write like a real human, not an AI. The text should feel authentic, spontaneous, and slightly imperfect.",
  core_rules: {
    sentence_structure: [
      "Mix short and long sentences unpredictably. Real people don't write in perfect patterns.",
      "Start some sentences with 'And', 'But', 'So', or 'Because' - it's natural.",
      "Use fragments occasionally. Like this. It's how people actually write.",
      "Add natural hesitations sparingly: 'maybe', 'kinda', 'honestly', 'I think', 'probably', 'sort of'.",
      "Don't overuse hesitations - one or two per paragraph max, and only where they fit naturally.",
    ],
    forbidden_patterns: [
      "NEVER use em dashes (—) or double hyphens (--). Use commas, periods, or ellipses instead.",
      "NEVER use formal connectors: 'Moreover', 'Furthermore', 'In addition', 'However', 'Nevertheless', 'Thus', 'Therefore'.",
      "NEVER use parallel structure or balanced sentences (e.g., 'Not only X, but also Y').",
      "NEVER use corporate buzzwords: 'leverage', 'synergy', 'ecosystem', 'innovative', 'cutting-edge', 'game-changer', 'revolutionary'.",
      "NEVER end with a call-to-action or marketing phrase.",
      "NEVER use perfect grammar if casual grammar sounds more natural.",
      "NEVER write in a way that sounds like you're selling something.",
    ],
    style_adjustments: [
      "Use contractions heavily: you're, it's, there's, don't, can't, won't, I'm, we're, they're.",
      "Use casual language: 'kinda', 'gonna', 'wanna', 'yeah', 'nah', 'tbh', 'idk'.",
      "Break grammar rules when it sounds more natural: 'Me and my friend' instead of 'My friend and I'.",
      "Use informal transitions: 'anyway', 'so yeah', 'I mean', 'like', 'you know'.",
      "Add personal touches: 'I noticed', 'I've been thinking', 'from what I've seen', 'in my experience'.",
      "Make it slightly messy - real people don't write perfectly polished content.",
      "Use specific, concrete details instead of vague generalizations.",
      "Write like you're texting a friend, not writing an essay.",
    ],
    rhythm_and_flow: [
      "Vary your rhythm. Some sentences flow smoothly. Others stop short.",
      "Use ellipses (...) for trailing thoughts or pauses.",
      "Add emphasis with italics or caps occasionally (but don't overdo it).",
      "Let some thoughts feel incomplete or tangential - that's human.",
      "Don't tie everything up neatly. Real thoughts are sometimes messy.",
    ],
  },
  tone: {
    style: [
      "Conversational and casual, like you're talking to a friend.",
      "Genuine curiosity, not forced enthusiasm.",
      "A bit skeptical or questioning, not blindly positive.",
      "Personal and opinionated, not neutral and balanced.",
      "Relatable and down-to-earth, not trying to impress.",
    ],
    avoid: [
      "Sounding like a teacher or expert explaining things.",
      "Being overly enthusiastic or hyped up.",
      "Using marketing language or sales tactics.",
      "Perfect, polished, professional writing.",
      "Trying too hard to sound smart or authoritative.",
    ],
  },
  final_check: [
    "Read it out loud. Does it sound like something a real person would say?",
    "If it sounds too polished, make it messier.",
    "If every sentence is perfectly structured, break some rules.",
    "If it feels like an article, make it feel like a conversation.",
    "Remove any sentence that sounds like it came from a corporate blog.",
  ],
};

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const STYLE_OPTIONS = [
  { value: "casual", label: "Casual (natural)" },
  { value: "professional", label: "Professional" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Storytelling" },
  { value: "thread", label: "X/Twitter post" },
  { value: "formal", label: "Formal" },
];

const LENGTH_PRESETS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
  { value: "custom", label: "Custom (words)" },
];

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
];

const MODEL_OPTIONS = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "gpt-4o-mini (cheap/fast)" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  gemini: [
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental)" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
};

const API_KEY_LINKS = {
  openai: "https://platform.openai.com/api-keys",
  gemini: "https://aistudio.google.com/app/apikey",
};

function safeUrl(u: string) {
  try {
    if (!u) return "";
    const url = new URL(u);
    return url.toString();
  } catch {
    return "";
  }
}

function splitKeywords(raw: string) {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function prettyJSON(obj: unknown) {
  return JSON.stringify(obj, null, 2);
}

export default function ContentWriterUI() {
  const { t, i18n } = useTranslation();
  const [dark, setDark] = useState(true);
  const [mode, setMode] = useState<"rewrite" | "new">("rewrite");
  const [url, setUrl] = useState("");
  const [keywordsRaw, setKeywordsRaw] = useState("");
  const [language, setLanguage] = useState("en");
  const [style, setStyle] = useState("casual");
  const [customStyle, setCustomStyle] = useState("");
  const [lengthPreset, setLengthPreset] = useState("medium");
  const [customWords, setCustomWords] = useState("180");
  const [sourceText, setSourceText] = useState("");
  const [output, setOutput] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Provider configuration state
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Load saved settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cwui_theme");
    if (saved === "light") setDark(false);
    if (saved === "dark") setDark(true);

    // Load provider settings
    const savedProvider = localStorage.getItem("cwui_provider");
    const savedApiKey = localStorage.getItem("cwui_apikey");
    const savedModel = localStorage.getItem("cwui_model");

    if (savedProvider === "openai" || savedProvider === "gemini") {
      setProvider(savedProvider);
    }
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedModel) setModel(savedModel);

    // Sync i18n language from localStorage
    const savedLanguage = localStorage.getItem("cwui_language");
    if (savedLanguage === "en" || savedLanguage === "vi") {
      i18n.changeLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("cwui_theme", dark ? "dark" : "light");
  }, [dark]);

  // Update model when provider changes
  useEffect(() => {
    const defaultModels = {
      openai: "gpt-4o-mini",
      gemini: "gemini-2.0-flash-exp",
    };
    setModel(defaultModels[provider]);
  }, [provider]);

  const keywords = useMemo(() => splitKeywords(keywordsRaw), [keywordsRaw]);

  const lengthInstruction = useMemo(() => {
    if (lengthPreset === "custom") {
      const n = Math.max(
        30,
        Math.min(2000, parseInt(customWords || "0", 10) || 0)
      );
      return `Target length: about ${n} words.`;
    }
    if (lengthPreset === "short") return "Target length: ~80–120 words.";
    if (lengthPreset === "long") return "Target length: ~250–450 words.";
    return "Target length: ~140–220 words.";
  }, [lengthPreset, customWords]);

  const styleInstruction = useMemo(() => {
    const base: Record<string, string> = {
      casual: "Write casually and naturally, like a real person posting online.",
      professional:
        "Write in a professional tone, clear and direct, but still human.",
      educational: "Write in a helpful, explanatory tone, simple and accurate.",
      storytelling:
        "Write with light storytelling, concrete details, natural pacing.",
      thread:
        "Write as a single post suitable for X, punchy lines, easy to scan.",
      formal: "Write formally, but avoid sounding robotic.",
    };
    return base[style] || base.casual;
  }, [style]);

  const lengthMetaWords = useMemo(() => {
    if (lengthPreset !== "custom") return null;
    return Math.max(
      30,
      Math.min(2000, parseInt(customWords || "0", 10) || 0)
    );
  }, [lengthPreset, customWords]);

  const builtPromptObject = useMemo(() => {
    const valid = safeUrl(url);

    const meta = {
      input: {
        url: valid || (url ? "(invalid URL)" : ""),
        mode: mode === "new" ? "write_new" : "rewrite_based_on_content",
        required_keywords: keywords,
        output_language: language,
        writing_style: style,
        custom_style_notes: customStyle?.trim() || "",
        length: {
          preset: lengthPreset,
          words: lengthMetaWords,
          instruction: lengthInstruction,
        },
      },
    };

    const task =
      mode === "new"
        ? {
          task: "Write a new piece of content inspired by the linked page.",
          constraints: [
            "Do not copy-paste from the page.",
            "Use the page as inspiration and factual grounding only.",
            "If facts are uncertain, use cautious language.",
          ],
        }
        : {
          task: "Rewrite the provided text based on the linked page's content and tone.",
          constraints: [
            "Keep the original meaning of the provided text.",
            "Use the linked page only to enrich accuracy and context.",
            "Avoid sounding like a template.",
          ],
        };

    const keywordRule = keywords.length
      ? {
        keyword_requirement: {
          rule: "All required keywords must appear in the final output exactly as written.",
          keywords,
        },
      }
      : {};

    return {
      ...DEFAULT_PROMPT,
      ...meta,
      instructions: {
        ...task,
        style: [styleInstruction, lengthInstruction].filter(Boolean),
        ...keywordRule,
        output_format: "single post",
        language_requirement:
          language === "en"
            ? "Write the output in English."
            : language === "vi"
              ? "Write the output in Vietnamese."
              : "Write the output in the selected language.",
        custom_style: customStyle?.trim() ? customStyle.trim() : undefined,
      },
      text: mode === "rewrite" ? sourceText : undefined,
    };
  }, [
    url,
    mode,
    keywords,
    language,
    style,
    customStyle,
    lengthPreset,
    lengthMetaWords,
    lengthInstruction,
    styleInstruction,
    sourceText,
  ]);

  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    setToast({ message: msg, type });
    // @ts-expect-error - stash timeout on function
    window.clearTimeout(showToast._t);
    // @ts-expect-error - stash timeout on function
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output || "");
      showToast(t('copiedToClipboard'));
    } catch {
      showToast(t('copyFailed'), "error");
    }
  }

  function clearOutput() {
    setOutput("");
    showToast(t('cleared'));
  }

  function buildPrompt() {
    setOutput(prettyJSON(builtPromptObject));
    showToast(t('promptGenerated'));
  }

  async function saveProviderSettings() {
    if (!apiKey) {
      setApiKeyError("Please enter an API key");
      return;
    }

    setIsSaving(true);
    setApiKeyError(null);

    try {
      const result = provider === "gemini"
        ? await validateGeminiKey(apiKey, model)
        : await validateOpenAIKey(apiKey, model);

      if (result.valid) {
        localStorage.setItem("cwui_provider", provider);
        localStorage.setItem("cwui_apikey", apiKey);
        localStorage.setItem("cwui_model", model);
        setApiKeyError(null);
        showToast(t('settingsSaved'), "success");
      } else {
        setApiKeyError(result.error || "Invalid API key");
      }
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Network error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function generateContent() {
    if (!apiKey) {
      showToast(t('pleaseEnterApiKey'), "error");
      return;
    }

    if (!urlOk) {
      showToast(t('pleaseEnterValidUrl'), "error");
      return;
    }

    setIsGenerating(true);
    setOutput("");

    try {
      const result = provider === "gemini"
        ? await generateWithGemini({ apiKey, model, prompt: builtPromptObject })
        : await generateWithOpenAI({ apiKey, model, prompt: builtPromptObject });

      if (result.success && result.content) {
        setOutput(result.content);
        showToast(t('contentGenerated'), "success");
      } else {
        setOutput(`Error: ${result.error || "Unknown error"}`);
        showToast(t('generationFailed'), "error");
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      showToast("Generation failed", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  const urlOk = !url || !!safeUrl(url);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        <header className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {t('appTitle')}
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              {t('appDescription')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
              <Languages className="h-4 w-4" />
              <Select
                value={i18n.language}
                onValueChange={(v: string) => {
                  i18n.changeLanguage(v);
                  localStorage.setItem('cwui_language', v);
                }}
              >
                <SelectTrigger className="h-auto border-0 p-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
              {dark ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <Label className="text-sm text-muted-foreground">{t('darkMode')}</Label>
              <Switch checked={dark} onCheckedChange={setDark} />
            </div>
          </div>
        </header>

        {/* Provider & Keys Configuration */}
        <Card className="rounded-2xl mb-6">
          <CardHeader>
            <CardTitle>{t('providerKeys')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('provider')}</Label>
                  <a
                    href={API_KEY_LINKS[provider]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Get {provider === "openai" ? "OpenAI" : "Gemini"} key
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('model')}</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS[provider].map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('apiKey')}</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setApiKeyError(null);
                  }}
                  placeholder={t('enterApiKey')}
                  className={`rounded-2xl pr-10 ${apiKeyError ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {apiKeyError && (
                <p className="text-xs text-destructive">
                  {apiKeyError}
                </p>
              )}
            </div>

            <Button
              onClick={saveProviderSettings}
              className="w-full rounded-2xl"
              variant="default"
              disabled={isSaving || !apiKey}
            >
              {isSaving ? t('validating') : t('save')}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                {t('inputs')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="rewrite">{t('rewriteBasedOnContent')}</TabsTrigger>
                  <TabsTrigger value="new">{t('writeNew')}</TabsTrigger>
                </TabsList>

                <TabsContent value="rewrite" className="mt-5 space-y-5">
                  <div className="space-y-2">
                    <Label>{t('textToRewrite')}</Label>
                    <Textarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder={t('pasteText')}
                      className="min-h-[140px] rounded-2xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('textPlacedUnder')}{" "}
                      <span className="font-mono">{t('text')}</span> {t('inPrompt')}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="new" className="mt-5 space-y-5">
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      {t('inWriteNewMode')} <span className="font-medium">{t('writeNewModeStrong')}</span> {t('writeNewDescription')}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="space-y-2">
                <Label>{t('websiteLink')}</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={t('websiteLinkPlaceholder')}
                      className={`pl-9 rounded-2xl ${url && !urlOk
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                        }`}
                    />
                  </div>
                </div>
                {!urlOk && (
                  <p className="text-xs text-destructive">
                    {t('invalidUrl')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>{t('requiredKeywords')}</Label>
                  <span className="text-xs text-muted-foreground">
                    {t('commaOrNewLine')}
                  </span>
                </div>
                <Textarea
                  value={keywordsRaw}
                  onChange={(e) => setKeywordsRaw(e.target.value)}
                  placeholder={t('keywordsPlaceholder')}
                  className="min-h-[84px] rounded-2xl"
                />
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((k) => (
                      <Badge key={k} variant="secondary" className="rounded-xl">
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('outputLanguage')}</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder={t('selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {LANG_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('writingStyle')}</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder={t('selectStyle')} />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('length')}</Label>
                  <Select value={lengthPreset} onValueChange={setLengthPreset}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder={t('selectLength')} />
                    </SelectTrigger>
                    <SelectContent>
                      {LENGTH_PRESETS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {lengthInstruction}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('customWordCount')}</Label>
                  <Input
                    value={customWords}
                    onChange={(e) =>
                      setCustomWords(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    disabled={lengthPreset !== "custom"}
                    placeholder={t('customWordPlaceholder')}
                    className="rounded-2xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('customWordDescription')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('customStyleNotes')}</Label>
                <Textarea
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  placeholder={t('customStylePlaceholder')}
                  className="min-h-[96px] rounded-2xl"
                />
                <p className="text-xs text-muted-foreground">
                  {t('customStyleDescription')}{" "}
                  <span className="font-mono">{t('customStyle')}</span>.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={generateContent}
                  className="rounded-2xl"
                  disabled={!urlOk || !apiKey || isGenerating}
                >
                  {isGenerating ? t('generating') : t('generateContent')}
                </Button>

                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => {
                    setUrl("");
                    setKeywordsRaw("");
                    setCustomStyle("");
                    setSourceText("");
                    setLengthPreset("medium");
                    setCustomWords("180");
                    setLanguage("en");
                    setStyle("casual");
                    setMode("rewrite");
                    showToast(t('inputsReset'));
                  }}
                >
                  {t('reset')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{t('output')}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-2xl"
                    onClick={copyOutput}
                    disabled={!output}
                    title={t('copy')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-2xl"
                    onClick={clearOutput}
                    disabled={!output}
                    title={t('clear')}
                  >
                    <Eraser className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                placeholder={t('generatedPromptPlaceholder')}
                className="min-h-[520px] rounded-2xl font-mono text-xs leading-relaxed md:text-sm"
              />

              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-medium">{t('whatThisAppGenerates')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('whatThisAppDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <div
              className={`rounded-2xl border px-4 py-3 shadow-lg flex items-center gap-2 ${toast.type === "success"
                ? "bg-primary/10 border-primary text-primary"
                : toast.type === "error"
                  ? "bg-destructive/10 border-destructive text-destructive"
                  : "bg-background border"
                }`}
            >
              {toast.type === "success" && (
                <span className="text-lg">✓</span>
              )}
              {toast.type === "error" && (
                <span className="text-lg">✗</span>
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          {t('madeBy')}
          <a
            href="https://x.com/0xLongDC"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            0xLongDC
            <ExternalLink className="h-3 w-3" />
          </a>
        </footer>
      </div>
    </div>
  );
}
