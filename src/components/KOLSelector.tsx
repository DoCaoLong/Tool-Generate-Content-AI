"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, User, X, ChevronDown, ChevronUp } from "lucide-react";

export interface KOLAuthor {
  id: string;
  name: string;
  content: string;
  style?: string;
  style_vi?: string;
  profileImgUrl: string;
  isPreTrained: boolean;
  isAITrained: boolean;
  isActive: boolean;
}

interface KOLSelectorProps {
  authors: KOLAuthor[];
  selectedId: string | null;
  onSelect: (author: KOLAuthor | null) => void;
}

// Generate a deterministic gradient color from a string
function getGradient(str: string): string {
  const palettes = [
    "from-violet-500 to-purple-700",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-rose-600",
    "from-pink-500 to-fuchsia-600",
    "from-amber-400 to-orange-600",
    "from-sky-500 to-indigo-600",
    "from-green-400 to-emerald-600",
    "from-red-500 to-pink-600",
    "from-teal-400 to-cyan-600",
    "from-indigo-500 to-violet-600",
    "from-rose-400 to-red-600",
    "from-yellow-400 to-amber-600",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return palettes[Math.abs(hash) % palettes.length];
}

// Extract initials from name
function getInitials(name: string): string {
  const clean = name.replace(/[^\w\s]/g, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.substring(0, 2).toUpperCase();
}

// Extract a short style summary from the full content
function getStyleSummary(content: string): string {
  // Try to get the first meaningful line after a heading
  const lines = content.split(/##|#/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const stripped = line.replace(/\*\*/g, "").trim();
    if (stripped.length > 20 && stripped.length < 120) return stripped;
  }
  return content.replace(/[#*\n]/g, " ").substring(0, 100).trim();
}

// Extract tone tags from content
function getToneTags(content: string): string[] {
  const tagMap: Record<string, string> = {
    analytical: "Analytical",
    sarcastic: "Sarcastic",
    minimalist: "Minimalist",
    educational: "Educational",
    philosophical: "Philosophical",
    "data-driven": "Data-Driven",
    concise: "Concise",
    humorous: "Humorous",
    contrarian: "Contrarian",
    builder: "Builder",
    storytell: "Storytelling",
    witty: "Witty",
    casual: "Casual",
    direct: "Direct",
    authoritative: "Authoritative",
  };
  const lower = content.toLowerCase();
  return Object.entries(tagMap)
    .filter(([key]) => lower.includes(key))
    .slice(0, 3)
    .map(([, label]) => label);
}

export default function KOLSelector({ authors, selectedId, onSelect }: KOLSelectorProps) {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === "vi";
  const [previewAuthor, setPreviewAuthor] = useState<KOLAuthor | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Default all to true so gradient shows immediately (no broken image flash)
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>(
    () => Object.fromEntries(authors.map((a) => [a.id, true]))
  );

  // Helper: get localised style text
  const getStyle = (author: KOLAuthor) =>
    isVi ? (author.style_vi ?? author.style ?? "") : (author.style ?? "");

  const selectedAuthor = authors.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300/90 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700/90 dark:bg-slate-950 dark:shadow-black/35">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{t('kolWritingStyle')}</span>
          {selectedAuthor && (
            <Badge variant="secondary" className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              {selectedAuthor.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedAuthor && (
            <Button
              variant="outline"
              className="h-7 rounded-lg border border-slate-200 bg-white px-2 py-0 text-xs text-muted-foreground shadow-none hover:bg-slate-100 hover:text-destructive dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              onClick={() => onSelect(null)}
            >
              <X className="h-3 w-3 mr-1" />
              {t('kolClear')}
            </Button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Grid */}
      {!collapsed && (
        <div className="p-3">
          {/* Selected banner */}
          {selectedAuthor && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-[11px] text-primary">
                {t('kolStyleInjected')} <strong>{selectedAuthor.name}</strong> {t('kolStyleInjectedSuffix')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {authors.map((author) => {
              const isSelected = author.id === selectedId;
              const gradient = getGradient(author.id);
              const initials = getInitials(author.name);
              const hasImgError = imgErrors[author.id];
              const localizedStyle = getStyle(author);
              const summary = localizedStyle ? getStyleSummary(localizedStyle) : "";

              return (
                <div
                  key={author.id}
                  className={`
                    relative group flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5
                    transition-all duration-200 select-none
                    hover:border-primary/45 hover:shadow-md hover:shadow-slate-900/10
                    ${isSelected
                      ? "border-primary/60 bg-primary/[0.08] ring-1 ring-primary/30"
                      : "border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-900"
                    }
                  `}
                  onClick={() => onSelect(isSelected ? null : author)}
                >
                  {/* Selected check */}
                  {isSelected && (
                    <span className="absolute right-2 top-2 text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  )}

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`h-11 w-11 overflow-hidden rounded-xl ring-1 ${
                        isSelected ? "ring-primary/70" : "ring-slate-300 dark:ring-slate-700"
                      }`}
                    >
                      {!hasImgError ? (
                        <img
                          src={author.profileImgUrl}
                          alt={author.name}
                          className="h-full w-full object-cover"
                          onError={() =>
                            setImgErrors((prev) => ({
                              ...prev,
                              [author.id]: true,
                            }))
                          }
                        />
                      ) : (
                        <div
                          className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
                        >
                          <span className="text-white text-lg font-bold tracking-tight">
                            {initials}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-semibold leading-tight">
                      {author.name}
                    </p>

                    {summary && (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {summary}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewAuthor(author);
                        }}
                        className="shrink-0 text-[10px] text-muted-foreground transition-colors hover:text-primary"
                      >
                        {t('kolViewStyle')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Style Preview Dialog */}
      <Dialog open={!!previewAuthor} onOpenChange={() => setPreviewAuthor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            {previewAuthor && (
              <div className="flex items-center gap-3">
                {/* Avatar in dialog */}
                <div
                  className={`h-12 w-12 rounded-xl overflow-hidden ring-2 ring-border shrink-0`}
                >
                  {!imgErrors[previewAuthor.id] ? (
                    <img
                      src={previewAuthor.profileImgUrl}
                      alt={previewAuthor.name}
                      className="h-full w-full object-cover"
                      onError={() =>
                        setImgErrors((prev) => ({
                          ...prev,
                          [previewAuthor.id]: true,
                        }))
                      }
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-br ${getGradient(previewAuthor.id)} flex items-center justify-center`}
                    >
                      <span className="text-white text-base font-bold">
                        {getInitials(previewAuthor.name)}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <DialogTitle className="text-base">{previewAuthor.name}</DialogTitle>
                  <DialogDescription className="sr-only">
                    {t('kolDialogDesc', { name: previewAuthor.name })}
                  </DialogDescription>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {getToneTags(previewAuthor.content).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>

          {previewAuthor && (
            <>
              <div className="overflow-y-auto flex-1 mt-2 pr-1 space-y-3">
                {getStyle(previewAuthor) ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getStyle(previewAuthor)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    {t('kolNoStyle')}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex gap-2 justify-end pt-3 border-t mt-2">
                <Button
                  variant="outline"
                  className="rounded-2xl border-0 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setPreviewAuthor(null)}
                >
                  {t('kolClose')}
                </Button>
                <Button
                  className="rounded-2xl"
                  onClick={() => {
                    onSelect(
                      selectedId === previewAuthor.id ? null : previewAuthor
                    );
                    setPreviewAuthor(null);
                  }}
                >
                  {selectedId === previewAuthor.id
                    ? t('kolDeselect')
                    : t('kolUseStyle', { name: previewAuthor.name })}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
