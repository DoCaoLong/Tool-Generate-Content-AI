"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/app-store";
import { apiRequest } from "@/lib/http";
import type { Project, ProjectWritingStyle } from "@/lib/types";
import { emptyWritingStyle, writingStyleChosen } from "@/lib/writing-style";

let boundProjectId: string | null = null;
const writeVersion = new Map<string, number>();
const writeTail = new Map<string, Promise<void>>();

export function bindWritingProject(projectId: string | null) {
  boundProjectId = projectId;
}

function cacheStyle(queryClient: QueryClient, projectId: string, writingStyle: ProjectWritingStyle | null) {
  queryClient.setQueryData<{ projects: Project[] }>(["projects"], (current) => current ? {
    projects: current.projects.map((item) => item.id === projectId ? { ...item, writingStyle } : item),
  } : current);
}

export function applyWritingStyle(style: ProjectWritingStyle | null) {
  const chosen = writingStyleChosen(style) ? style : null;
  useAppStore.setState({
    selectedKolId: chosen?.kolId ?? null,
    selectedSavedStyleId: chosen?.savedStyleId ?? null,
    discoveredStyle: chosen?.discovered ?? null,
    styleSource: chosen?.source ?? null,
  });
}

export function saveProjectWritingStyle(queryClient: QueryClient, projectId: string, writingStyle: ProjectWritingStyle | null) {
  const version = (writeVersion.get(projectId) || 0) + 1;
  writeVersion.set(projectId, version);
  cacheStyle(queryClient, projectId, writingStyle);
  const previous = writeTail.get(projectId) ?? Promise.resolve();
  const run = previous.then(() => {
    if (writeVersion.get(projectId) !== version) return;
    return apiRequest<{ writingStyle: ProjectWritingStyle | null }>(`/api/projects/${projectId}/style`, {
      method: "PATCH",
      body: JSON.stringify({ writingStyle }),
    }).then((data) => {
      if (writeVersion.get(projectId) !== version) return;
      cacheStyle(queryClient, projectId, data.writingStyle);
    });
  }).catch(() => undefined);
  writeTail.set(projectId, run);
  return run;
}

export function commitWritingStyle(queryClient: QueryClient, style: ProjectWritingStyle | null, projectId?: string | null) {
  const id = projectId === undefined ? (boundProjectId || useAppStore.getState().selectedProjectId) : projectId;
  const stored = writingStyleChosen(style) ? style : emptyWritingStyle();
  applyWritingStyle(stored);
  if (!id) return;
  void saveProjectWritingStyle(queryClient, id, stored);
}
