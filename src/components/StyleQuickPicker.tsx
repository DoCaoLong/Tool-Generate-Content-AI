"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ProjectStyleFaces } from "@/components/ProjectStyleFaces";
import PromptAvatar from "@/components/PromptAvatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/http";
import { commitWritingStyle } from "@/lib/writing-style-client";
import { kolAvatarSrc, kolStyles, type KOLStyle } from "@/lib/kol-styles";
import { projectStyleFace } from "@/lib/project-style-face";
import { resolveStyleCategory, type StyleCategory } from "@/lib/style-category";
import type { Project, SavedStyle } from "@/lib/types";

const groups: Array<{ id: StyleCategory; title: string }> = [
  { id: "kol", title: "Phong cách KOL" },
  { id: "writing", title: "Phong cách bài viết" },
  { id: "project", title: "Phong cách dự án" },
];

function pickSaved(queryClient: ReturnType<typeof useQueryClient>, style: SavedStyle) {
  commitWritingStyle(queryClient, { kolId: null, savedStyleId: style.id, discovered: null, source: "manual" });
}

function pickKol(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  commitWritingStyle(queryClient, { kolId: id, savedStyleId: null, discovered: null, source: "manual" });
}

function StyleChoice({ name, meta, avatar, onPick }: { name: string; meta: string; avatar: ReactNode; onPick: () => void }) {
  return (
    <button type="button" title={name} className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-slate-400 hover:bg-slate-50" onClick={onPick}>
      {avatar}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900">{name}</span>
        <span className="mt-0.5 block h-4 truncate text-xs text-slate-400">{meta || "\u00a0"}</span>
      </span>
    </button>
  );
}

export default function StyleQuickPicker({ hidden = false }: { hidden?: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const stylesQuery = useQuery({ queryKey: ["styles"], queryFn: () => apiRequest<{ styles: SavedStyle[] }>("/api/styles") });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => apiRequest<{ projects: Project[] }>("/api/projects") });
  const promptQuery = useQuery({ queryKey: ["prompt-styles"], queryFn: () => apiRequest<{ styles: KOLStyle[] }>("/api/prompt-styles"), enabled: open });
  const saved = useMemo(() => stylesQuery.data?.styles || [], [stylesQuery.data?.styles]);
  const projects = projectsQuery.data?.projects || [];
  const builtins = promptQuery.data?.styles?.length ? promptQuery.data.styles : kolStyles;
  if (hidden && open) setOpen(false);
  if (hidden) return null;

  return (
    <>
      <button type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-slate-400 hover:text-slate-950" onClick={() => setOpen(true)}>
        <Palette className="h-3 w-3" />Chọn phong cách
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(85vh,760px)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
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
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {items.map((style) => {
                      if (group.id === "project") {
                        const face = projectStyleFace(style, projects);
                        return <StyleChoice key={style.id} name={face.title} meta={face.meta} avatar={<ProjectStyleFaces userSrc={face.userSrc} userName={face.userHandle ? `@${face.userHandle}` : face.title} projectSrc={face.projectSrc} projectName={face.projectHandle ? `@${face.projectHandle}` : face.title} distinct={face.distinct} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-bold text-white" userClassName="bg-violet-500" projectClassName="bg-sky-500" />} onPick={() => { pickSaved(queryClient, style); setOpen(false); }} />;
                      }
                      return <StyleChoice key={style.id} name={style.name} meta={[style.username ? `@${style.username.replace(/^@/, "")}` : "", style.projectName || ""].filter(Boolean).join(" · ")} avatar={<PromptAvatar src={resolveStyleCategory(style) === "kol" ? kolAvatarSrc({ username: style.username, avatarUrl: style.avatarUrl }) : undefined} name={style.username || style.projectName || style.name} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600" />} onPick={() => { pickSaved(queryClient, style); setOpen(false); }} />;
                    })}
                    {preset.map((style) => (
                      <StyleChoice key={style.id} name={style.name} meta="KOL dựng sẵn" avatar={<PromptAvatar src={kolAvatarSrc({ profileImgUrl: style.profileImgUrl, username: style.username, text: style.content })} name={style.name} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600" />} onPick={() => { pickKol(queryClient, style.id); setOpen(false); }} />
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
