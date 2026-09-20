"use client";

import { Palette } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/app-store";
import { apiRequest } from "@/lib/http";
import { getKOLStyle } from "@/lib/kol-styles";
import type { DiscoveredStyle, SavedStyle } from "@/lib/types";

export default function KOLStylePicker({ selectedId, customStyle, selectedSavedStyle, collapsed }: { selectedId: string | null; customStyle: DiscoveredStyle | null; selectedSavedStyle: SavedStyle | null; collapsed?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const promptQuery = useQuery({ queryKey: ["prompt-styles"], queryFn: () => apiRequest<{ styles: Array<{ id: string; name: string }> }>("/api/prompt-styles") });
  const selectedKOL = promptQuery.data?.styles.find((style) => style.id === selectedId) || getKOLStyle(selectedId);
  const activeName = selectedSavedStyle?.name || selectedKOL?.name || (customStyle ? `@${customStyle.username}` : null);
  const isStylesRoute = pathname === "/styles";
  const label = activeName || "Phong cách";

  return <button title={collapsed ? label : undefined} aria-label={label} className={`flex h-11 w-full items-center rounded-xl text-sm transition-colors ${collapsed ? "gap-3 px-3 text-left md:justify-center md:gap-0 md:px-0" : "gap-3 px-3 text-left"} ${isStylesRoute ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`} onClick={() => { router.push("/styles"); setSidebarOpen(false); }}>
    <Palette className="h-4 w-4 shrink-0 text-violet-400" />
    <span className={`min-w-0 flex-1 truncate ${collapsed ? "md:hidden" : ""}`}>{label}</span>
  </button>;
}
