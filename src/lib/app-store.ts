"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContentMode, DiscoveredStyle, Provider } from "@/lib/types";

interface AppState {
  selectedProjectId: string | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  optionsOpen: boolean;
  provider: Provider;
  model: string;
  apiKey: string;
  composerMode: ContentMode;
  selectedKolId: string | null;
  discoveredStyle: DiscoveredStyle | null;
  selectedSavedStyleId: string | null;
  styleSource: "manual" | "auto" | null;
  setSelectedProjectId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setOptionsOpen: (open: boolean) => void;
  setProviderConfig: (provider: Provider, model: string, apiKey: string) => void;
  setComposerMode: (mode: ContentMode) => void;
  setSelectedKolId: (id: string | null) => void;
  setDiscoveredStyle: (style: DiscoveredStyle | null) => void;
  setSelectedSavedStyleId: (id: string | null) => void;
  setStyleSource: (source: "manual" | "auto" | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      sidebarOpen: false,
      sidebarCollapsed: false,
      optionsOpen: true,
      provider: "openai",
      model: "gpt-5.6-terra",
      apiKey: "",
      composerMode: "new",
      selectedKolId: null,
      discoveredStyle: null,
      selectedSavedStyleId: null,
      styleSource: null,
      setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId, sidebarOpen: false }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setOptionsOpen: (optionsOpen) => set({ optionsOpen }),
      setProviderConfig: (provider, model, apiKey) => set({ provider, model, apiKey }),
      setComposerMode: (composerMode) => set({ composerMode }),
      setSelectedKolId: (selectedKolId) => set({ selectedKolId }),
      setDiscoveredStyle: (discoveredStyle) => set({ discoveredStyle }),
      setSelectedSavedStyleId: (selectedSavedStyleId) => set({ selectedSavedStyleId }),
      setStyleSource: (styleSource) => set({ styleSource }),
    }),
    {
      name: "content-studio-preferences",
      partialize: (state) => ({ provider: state.provider, model: state.model, apiKey: state.apiKey, selectedKolId: state.selectedKolId, discoveredStyle: state.discoveredStyle, selectedSavedStyleId: state.selectedSavedStyleId, styleSource: state.styleSource, sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
