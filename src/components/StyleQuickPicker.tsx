"use client";

import { useQuery } from "@tanstack/react-query";
import { Palette } from "lucide-react";
import { useMemo, useState } from "react";
import PromptAvatar from "@/components/PromptAvatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/app-store";
import { apiRequest } from "@/lib/http";
import { kolStyles, type KOLStyle } from "@/lib/kol-styles";
import { resolveStyleCategory, type StyleCategory } from "@/lib/style-category";
import type { SavedStyle } from "@/lib/types";

const groups: Array<{ id: StyleCategory; title: string }> = [
  { id: "kol", title: "Phong cách KOL" },
  { id: "writing", title: "Phong cách bài viết" },
  { id: "project", title: "Phong cách dự án" },
];

function pickSaved(style: SavedStyle) {
  useAppStore.setState({ selectedSavedStyleId: style.id, selectedKolId: null, discoveredStyle: null, styleSource: "manual" });
}

function pickKol(id: string) {
  useAppStore.setState({ selectedKolId: id, selectedSavedStyleId: null, discoveredStyle: null, styleSource: "manual" });
}

export default function StyleQuickPicker() {
  const [open, setOpen] = useState(false);
  const selectedKolId = useAppStore((state) => state.selectedKolId);
  const selectedSavedStyleId = useAppStore((state) => state.selectedSavedStyleId);
  const discoveredStyle = useAppStore((state) => state.discoveredStyle);
  const stylesQuery = useQuery({ queryKey: ["styles"], queryFn: () => apiRequest<{ styles: SavedStyle[] }>("/api/styles") });
  const promptQuery = useQuery({ queryKey: ["prompt-styles"], queryFn: () => apiRequest<{ styles: KOLStyle[] }>("/api/prompt-styles"), enabled: open });
  const saved = useMemo(() => stylesQuery.data?.styles || [], [stylesQuery.data?.styles]);
  const builtins = promptQuery.data?.styles?.length ? promptQuery.data.styles : kolStyles;
  const hasStyle = Boolean(selectedKolId || selectedSavedStyleId || discoveredStyle);
  if (hasStyle) return null;

  return (
    <>
      <button type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-slate-400 hover:text-slate-950" onClick={() => setOpen(true)}>
        <Palette className="h-3 w-3" />Chọn phong cách
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(80vh,640px)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
          <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4 pr-12 text-left">
            <DialogTitle>Chọn phong cách</DialogTitle>
            <DialogDescription>Chọn một phong cách đã có để dùng cho bài viết này.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {groups.map((group) => {
              const items = saved.filter((style) => resolveStyleCategory(style) === group.id);
              const preset = group.id === "kol" ? builtins : [];
              if (!items.length && !preset.length) return null;
              return (
                <section key={group.id}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.title}</h3>
                  <div className="mt-2 space-y-2">
                    {items.map((style) => (
                      <button key={style.id} type="button" className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-slate-400" onClick={() => { pickSaved(style); setOpen(false); }}>
                        <PromptAvatar name={style.username || style.projectName || style.name} className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600" />
                        <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{style.name}</span>{(style.username || style.projectName) && <span className="block truncate text-xs text-slate-400">{[style.username ? `@${style.username.replace(/^@/, "")}` : "", style.projectName || ""].filter(Boolean).join(" · ")}</span>}</span>
                      </button>
                    ))}
                    {preset.map((style) => (
                      <button key={style.id} type="button" className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-slate-400" onClick={() => { pickKol(style.id); setOpen(false); }}>
                        <PromptAvatar src={style.profileImgUrl} name={style.name} className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600" />
                        <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{style.name}</span><span className="block truncate text-xs text-slate-400">KOL dựng sẵn</span></span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
            {!saved.length && !builtins.length && <p className="text-sm text-slate-500">Chưa có phong cách.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
