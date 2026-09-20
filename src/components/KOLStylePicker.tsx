"use client";

import { ChevronRight, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { getKOLStyle } from "@/lib/kol-styles";
import type { DiscoveredStyle, SavedStyle } from "@/lib/types";

export default function KOLStylePicker({ selectedId, customStyle, selectedSavedStyle }: { selectedId: string | null; customStyle: DiscoveredStyle | null; selectedSavedStyle: SavedStyle | null }) {
  const router = useRouter();
  const selectedKOL = getKOLStyle(selectedId);
  const activeName = selectedSavedStyle?.name || selectedKOL?.name || (customStyle ? `@${customStyle.username}` : null);

  return <div className="px-3 pb-4">
    <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Phong cách</p>
    <button className={`flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors ${activeName ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`} onClick={() => router.push("/styles")}>
      <Palette className={`h-4 w-4 shrink-0 ${activeName ? "text-violet-400" : "text-slate-400"}`} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{activeName || "Phong cách mặc định"}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
    </button>
  </div>;
}
