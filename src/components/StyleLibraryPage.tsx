"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, LoaderCircle, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ProjectStyleFaces } from "@/components/ProjectStyleFaces";
import PromptAvatar from "@/components/PromptAvatar";
import { StyleDetailDialog } from "@/components/StyleDetailDialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateWithProvider } from "@/lib/api-client";
import { useAppStore } from "@/lib/app-store";
import { ApiError, apiRequest } from "@/lib/http";
import { commitWritingStyle } from "@/lib/writing-style-client";
import { getKOLInitials, kolAvatarSrc, kolStyles, type KOLStyle } from "@/lib/kol-styles";
import { providerLabels } from "@/lib/providers";
import { projectStyleFace } from "@/lib/project-style-face";
import { resolveStyleCategory } from "@/lib/style-category";
import { buildStyleAnalysisPrompt, parseStyleAnalysis } from "@/lib/style-analysis";
import type { DiscoveredTweet, Project, SavedStyle, UserProfile } from "@/lib/types";

interface ManualStyleValues { name: string; description: string; instruction: string; sampleText: string }
interface AnalyzedAuthor { username: string; projectName: string | null; avatarUrl: string; samples: Array<{ id: string; text: string }> }
function mergeSamples(fresh: Array<{ id: string; text: string }>, current: Array<{ id: string; text: string }>) {
  const seen = new Set<string>();
  const merged: Array<{ id: string; text: string }> = [];
  for (const sample of [...fresh, ...current]) {
    if (!sample.id || seen.has(sample.id)) continue;
    seen.add(sample.id);
    merged.push({ id: sample.id.slice(0, 100), text: sample.text.slice(0, 4000) });
    if (merged.length === 20) break;
  }
  return merged;
}
interface AnalyzeTarget { username: string; projectName: string }
const colors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-rose-500", "bg-indigo-500"];
const handlePattern = /^[A-Za-z0-9_]{1,15}$/;

function compact(value: string) { return value.replace(/[#\s]+/g, " ").trim(); }
function normalizeHandle(value: string) { return value.trim().replace(/^@/, ""); }
type CreateMode = "custom" | "x";
function isCustomStyle(style: SavedStyle) { return resolveStyleCategory(style) === "writing" && !style.username && !style.projectName; }
function categoryLabel(style: SavedStyle) {
  const category = resolveStyleCategory(style);
  if (category === "kol") return "Phong cách KOL";
  if (category === "project") return "Phong cách dự án";
  return isCustomStyle(style) ? "Phong cách của bạn" : "Phong cách bài viết";
}

function SavedStyleCard({ style, projects, active, color, onChoose, onView, onEdit, onDelete }: { style: SavedStyle; projects: Project[]; active: boolean; color: string; onChoose: () => void; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const category = resolveStyleCategory(style);
  const face = category === "project" ? projectStyleFace(style, projects) : null;
  const title = face?.title || style.name;
  const badge = category === "kol" ? (style.username ? `@${style.username}` : "KOL") : category === "project" ? (face?.meta || "Dự án") : style.username && style.projectName ? `@${style.username} · @${style.projectName.replace(/^@/, "")}` : isCustomStyle(style) ? "Của bạn" : "Bài viết";
  const mark = getKOLInitials(style.username || style.projectName || style.name);
  const tone = category === "kol" ? "bg-violet-500" : category === "project" ? "bg-sky-500" : color;
  const avatar = category === "kol" ? kolAvatarSrc({ username: style.username, avatarUrl: style.avatarUrl }) : "";
  return <article className={`group relative rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? "border-slate-950 shadow-sm" : "border-slate-200"}`}>
    <button className="w-full text-left" onClick={onChoose}>
      <div className="flex items-start gap-3">
        {face ? <ProjectStyleFaces userSrc={face.userSrc} userName={face.userHandle ? `@${face.userHandle}` : title} projectSrc={face.projectSrc} projectName={face.projectHandle ? `@${face.projectHandle}` : title} distinct={face.distinct} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold text-white" userClassName="bg-violet-500" projectClassName="bg-sky-500" /> : avatar ? <PromptAvatar src={avatar} name={style.username || style.name} className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-bold text-white ${tone}`} /> : <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold text-white ${tone}`}>{mark}</span>}
        <div className="min-w-0 flex-1 pr-20">
          <div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold" title={title}>{title}</h3>{active && <Check className="h-4 w-4 text-emerald-600" />}</div>
          <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{style.description || compact(style.instruction)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-600"><Sparkles className="h-3 w-3" />{badge}</div>
    </button>
    <div className="absolute right-3 top-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
      <button type="button" aria-label={`Xem ${title}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-700" onClick={onView}><Eye className="h-4 w-4" /></button>
      <button type="button" aria-label={`Sửa ${title}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-700" onClick={onEdit}><Pencil className="h-4 w-4" /></button>
      <button type="button" aria-label={`Xoá ${title}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
    </div>
  </article>;
}

export default function StyleLibraryPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [createCategory, setCreateCategory] = useState<CreateMode>("custom");
  const [search, setSearch] = useState("");
  const [username, setUsername] = useState("");
  const [writingProject, setWritingProject] = useState("");
  const [analyzed, setAnalyzed] = useState<AnalyzedAuthor | null>(null);
  const pendingAnalyze = useRef<AnalyzeTarget | null>(null);
  const pendingRefresh = useRef<SavedStyle | null>(null);
  const [analyzePhase, setAnalyzePhase] = useState<"idle" | "fetch" | "analyze">("idle");
  const [localError, setLocalError] = useState("");
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiRequest<{ user: UserProfile }>("/api/auth/me") });
  const hasAccess = me.data?.user.sorsaAccess === true;
  const [detail, setDetail] = useState<{ type: "saved"; style: SavedStyle } | { type: "kol"; style: KOLStyle } | null>(null);
  const [editing, setEditing] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState<SavedStyle | null>(null);
  const provider = useAppStore((state) => state.provider);
  const model = useAppStore((state) => state.model);
  const apiKey = useAppStore((state) => state.apiKey);
  const selectedKolId = useAppStore((state) => state.selectedKolId);
  const selectedSavedStyleId = useAppStore((state) => state.selectedSavedStyleId);
  const stylesQuery = useQuery({ queryKey: ["styles"], queryFn: () => apiRequest<{ styles: SavedStyle[] }>("/api/styles") });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => apiRequest<{ projects: Project[] }>("/api/projects") });
  const promptQuery = useQuery({ queryKey: ["prompt-styles"], queryFn: () => apiRequest<{ styles: KOLStyle[] }>("/api/prompt-styles") });
  const styles = useMemo(() => stylesQuery.data?.styles || [], [stylesQuery.data?.styles]);
  const projects = projectsQuery.data?.projects || [];
  const kolList = promptQuery.data?.styles || kolStyles;
  const filteredStyles = useMemo(() => styles.filter((style) => `${style.name} ${style.username || ""} ${style.projectName || ""} ${style.description} ${style.instruction}`.toLowerCase().includes(search.toLowerCase())), [styles, search]);
  const groupedStyles = useMemo(() => ({
    custom: filteredStyles.filter(isCustomStyle),
    kol: filteredStyles.filter((style) => resolveStyleCategory(style) === "kol"),
    writing: filteredStyles.filter((style) => resolveStyleCategory(style) === "writing" && !isCustomStyle(style)),
    project: filteredStyles.filter((style) => resolveStyleCategory(style) === "project"),
  }), [filteredStyles]);
  const filteredKOLs = useMemo(() => kolList.filter((style) => `${style.name} ${style.content}`.toLowerCase().includes(search.toLowerCase())), [kolList, search]);
  const form = useForm<ManualStyleValues>({ defaultValues: { name: "", description: "", instruction: "", sampleText: "" } });
  const handle = normalizeHandle(username);
  const writingProjectHandle = normalizeHandle(writingProject);
  const xMatch = analyzed && analyzed.username === handle && (analyzed.projectName || "") === writingProjectHandle ? analyzed : null;

  const analyzeAuthor = useMutation({
    mutationFn: async ({ username: author, projectName }: AnalyzeTarget) => {
      if (!handlePattern.test(author) || (projectName && !handlePattern.test(projectName))) throw new Error("Username X chưa hợp lệ.");
      if (!apiKey.trim()) throw new Error("Hãy lưu API key trong Cài đặt trước khi phân tích.");
      setAnalyzePhase("fetch");
      const data = await apiRequest<{ tweets?: DiscoveredTweet[] }>("/api/discover", { method: "POST", body: JSON.stringify({ username: author, projectName: projectName ? `@${projectName}` : "" }) });
      const samples = (data.tweets || [])
        .filter((tweet) => tweet.text.trim().length >= 20 && !/^RT @/i.test(tweet.text.trim()))
        .slice(0, 20)
        .map((tweet) => ({ id: tweet.id.slice(0, 100), text: tweet.text.slice(0, 4000) }));
      if (!samples.length) throw new Error(projectName ? `Không tìm thấy bài của @${author} về @${projectName}.` : `Không tìm thấy bài viết của @${author}.`);
      const avatarUrl = (data.tweets || []).find((tweet) => tweet.avatarUrl)?.avatarUrl || "";
      setAnalyzePhase("analyze");
      const result = await generateWithProvider(provider, { apiKey, model, prompt: buildStyleAnalysisPrompt(author, samples.slice(0, 12), projectName || undefined) });
      if (!result.success || !result.content) throw new Error(result.error || "Không thể phân tích phong cách.");
      return { author, projectName: projectName || null, avatarUrl, samples, draft: parseStyleAnalysis(result.content, author, samples.length, projectName || undefined) };
    },
    onSuccess: ({ author, projectName, avatarUrl, samples, draft }) => {
      form.setValue("name", draft.name, { shouldValidate: true });
      form.setValue("description", draft.description, { shouldValidate: true });
      form.setValue("instruction", draft.instruction, { shouldValidate: true });
      form.setValue("sampleText", "");
      setAnalyzed({ username: author, projectName, avatarUrl, samples });
      setLocalError("");
      pendingAnalyze.current = null;
    },
    onError: (error) => {
      if (error instanceof ApiError && error.message === "Hãy nhập access code.") setAccessOpen(true);
    },
    onSettled: () => setAnalyzePhase("idle"),
  });

  const verifyAccess = useMutation({
    mutationFn: (code: string) => apiRequest<{ ok: true }>("/api/auth/access-code", { method: "POST", body: JSON.stringify({ accessCode: code }) }),
    onSuccess: () => {
      queryClient.setQueryData<{ user: UserProfile }>(["me"], (current) => current ? { user: { ...current.user, sorsaAccess: true } } : current);
      setAccessOpen(false);
      setAccessCode("");
      const refreshStyle = pendingRefresh.current;
      pendingRefresh.current = null;
      if (refreshStyle) {
        refreshSamples.mutate(refreshStyle);
        return;
      }
      const pending = pendingAnalyze.current;
      if (pending) analyzeAuthor.mutate(pending);
    },
  });

  const requestAnalyze = () => {
    const target: AnalyzeTarget = { username: handle, projectName: writingProjectHandle };
    if (!handlePattern.test(target.username)) {
      setLocalError("Username X chưa hợp lệ.");
      return;
    }
    if (target.projectName && !handlePattern.test(target.projectName)) {
      setLocalError("Username dự án chưa hợp lệ.");
      return;
    }
    if (!apiKey.trim()) {
      setLocalError("Hãy lưu API key trong Cài đặt trước khi phân tích.");
      return;
    }
    setLocalError("");
    pendingRefresh.current = null;
    pendingAnalyze.current = target;
    if (!hasAccess) {
      setAccessOpen(true);
      return;
    }
    analyzeAuthor.mutate(target);
  };

  const createStyle = useMutation({
    mutationFn: (values: ManualStyleValues) => {
      if (createCategory === "x" && !writingProjectHandle) {
        if (!xMatch) throw new Error("Hãy phân tích username trước khi lưu.");
        return apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "discovered", category: "kol", name: values.name, description: values.description, instruction: values.instruction, username: xMatch.username, projectName: null, avatarUrl: xMatch.avatarUrl || null, samples: xMatch.samples }) });
      }
      if (createCategory === "x") {
        if (!xMatch) throw new Error("Hãy phân tích trước khi lưu.");
        return apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "manual", category: "writing", name: values.name, description: values.description, instruction: values.instruction, username: xMatch.username, projectName: xMatch.projectName, samples: xMatch.samples }) });
      }
      return apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "manual", category: "writing", name: values.name, description: values.description, instruction: values.instruction, username: null, projectName: null, samples: values.sampleText.trim() ? [{ id: crypto.randomUUID(), text: values.sampleText.trim().slice(0, 5000) }] : [] }) });
    },
    onSuccess: async ({ style }) => {
      await queryClient.invalidateQueries({ queryKey: ["styles"] });
      commitWritingStyle(queryClient, { kolId: null, savedStyleId: style.id, discovered: null, source: "manual" });
      form.reset();
      setUsername("");
      setWritingProject("");
      setAnalyzed(null);
      setCreateCategory("custom");
      setLocalError("");
      setCreating(false);
    },
  });
  const refreshSamples = useMutation({
    mutationFn: async (style: SavedStyle) => {
      const username = (style.username || "").replace(/^@/, "");
      const projectName = (style.projectName || "").slice(0, 100);
      if (!username && !projectName) throw new Error("Phong cách này chưa có username hoặc dự án để lấy bài mới.");
      const data = await apiRequest<{ tweets?: DiscoveredTweet[] }>("/api/discover", { method: "POST", body: JSON.stringify({ username, projectName }) });
      const fresh = (data.tweets || []).filter((tweet) => tweet.text.trim().length >= 20).slice(0, 20).map((tweet) => ({ id: tweet.id.slice(0, 100), text: tweet.text.slice(0, 4000) }));
      if (!fresh.length) throw new Error("Không tìm thấy bài mới.");
      const merged = mergeSamples(fresh, style.samples);
      const unchanged = merged.length === style.samples.length && merged.every((item, index) => item.id === style.samples[index]?.id && item.text === style.samples[index]?.text);
      if (unchanged) return { style, unchanged: true };
      const saved = await apiRequest<{ style: SavedStyle }>(`/api/styles/${style.id}`, { method: "PATCH", body: JSON.stringify({ samples: merged }) });
      return { style: saved.style, unchanged: false };
    },
    onSuccess: async ({ style, unchanged }) => {
      pendingRefresh.current = null;
      if (unchanged) return;
      await queryClient.invalidateQueries({ queryKey: ["styles"] });
      setDetail({ type: "saved", style });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.message === "Hãy nhập access code.") setAccessOpen(true);
    },
  });
  const requestRefresh = (style: SavedStyle) => {
    pendingAnalyze.current = null;
    pendingRefresh.current = style;
    refreshSamples.reset();
    if (!hasAccess) {
      setAccessOpen(true);
      return;
    }
    refreshSamples.mutate(style);
  };
  const updateStyle = useMutation({
    mutationFn: (values: { name: string; description: string; instruction: string }) => {
      if (detail?.type !== "saved") throw new Error("Chỉ sửa được phong cách đã lưu.");
      return apiRequest<{ style: SavedStyle }>(`/api/styles/${detail.style.id}`, { method: "PATCH", body: JSON.stringify(values) });
    },
    onSuccess: async ({ style }) => {
      await queryClient.invalidateQueries({ queryKey: ["styles"] });
      setDetail({ type: "saved", style });
      setEditing(false);
    },
  });
  const removeStyle = useMutation({
    mutationFn: (id: string) => apiRequest<{ ok: true }>(`/api/styles/${id}`, { method: "DELETE" }),
    onSuccess: async (_, id) => { if (selectedSavedStyleId === id) commitWritingStyle(queryClient, null); setStyleToDelete(null); await queryClient.invalidateQueries({ queryKey: ["styles"] }); },
  });

  const chooseSaved = (style: SavedStyle) => { commitWritingStyle(queryClient, { kolId: null, savedStyleId: style.id, discovered: null, source: "manual" }); };
  const chooseKOL = (id: string) => { commitWritingStyle(queryClient, { kolId: id, savedStyleId: null, discovered: null, source: "manual" }); };
  const clearStyle = () => { commitWritingStyle(queryClient, null); };
  const detailFace = detail?.type === "saved" && resolveStyleCategory(detail.style) === "project" ? projectStyleFace(detail.style, projects) : null;

  return <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Thư viện phong cách</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tự tạo phong cách riêng bằng cách mô tả văn phong, không cần KOL hay dự án. Phong cách KOL lấy từ username trên X, phong cách bài viết phân tích bài của một KOL về một dự án, phong cách dự án đến từ tab Khám phá.</p></div><div className="flex gap-2"><Button variant="outline" className="gap-1 rounded-xl" onClick={clearStyle}><X className="h-4 w-4" />Dùng mặc định</Button><Button className="gap-1 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setCreating(!creating)}><Plus className="h-4 w-4" />Tạo phong cách</Button></div></div>

    {creating && <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Phong cách mới</h2><p className="mt-1 text-xs text-slate-500">Chọn cách tạo. Bạn luôn chỉnh lại được nội dung trước khi lưu.</p></div><button type="button" aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={() => setCreating(false)}><X className="h-4 w-4" /></button></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Cách tạo phong cách">
        {([
          { id: "custom" as const, title: "Tự mô tả", hint: "Viết ra văn phong bạn muốn. Không cần tài khoản X.", icon: Pencil },
          { id: "x" as const, title: "Phân tích từ X", hint: "Nhập username một người trên X, AI học văn phong từ bài của họ.", icon: Search },
        ]).map((option) => { const selected = createCategory === option.id; const Icon = option.icon; return <button key={option.id} type="button" role="tab" aria-selected={selected} className={`flex items-start gap-3 rounded-2xl p-4 text-left ring-1 transition-all ${selected ? "bg-emerald-50 ring-2 ring-emerald-300" : "bg-slate-50/70 ring-slate-200 hover:bg-white hover:ring-emerald-200"}`} onClick={() => { setCreateCategory(option.id); setLocalError(""); }}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${selected ? "bg-emerald-600 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className={`block text-sm font-semibold ${selected ? "text-emerald-900" : "text-slate-700"}`}>{option.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.hint}</span></span></button>; })}
      </div>
      <form onSubmit={form.handleSubmit((values) => createStyle.mutate(values))}>
        {createCategory === "x" && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800" htmlFor="style-username">Username trên X<div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span><Input id="style-username" className="h-11 rounded-xl bg-white pl-7" placeholder="elonmusk" value={username} autoComplete="off" onChange={(event) => { setUsername(event.target.value); setLocalError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); requestAnalyze(); } }} /></div></label>
            <label className="block text-sm font-medium text-slate-800" htmlFor="writing-project">Dự án <span className="font-normal text-slate-400">(không bắt buộc)</span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span><Input id="writing-project" className="h-11 rounded-xl bg-white pl-7" placeholder="PlayOnMint" value={writingProject} autoComplete="off" onChange={(event) => { setWritingProject(event.target.value); setLocalError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); requestAnalyze(); } }} /></div></label>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{writingProjectHandle ? "Chỉ học văn phong khi người này viết về dự án trên. Lưu vào Phong cách bài viết." : "Để trống dự án để học văn phong chung của người này. Lưu vào Phong cách KOL."}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-slate-500">{apiKey.trim() ? <>Dùng {providerLabels[provider]} · {model}. Không hiện nội dung bài.</> : <>Chưa có API key. <Link className="font-medium text-emerald-700 hover:text-emerald-900" href="/settings">Mở Cài đặt</Link> để lưu key trước khi phân tích.</>}</p>
            <Button type="button" className="h-11 gap-1 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" disabled={analyzeAuthor.isPending || !handle} onClick={requestAnalyze}>{analyzeAuthor.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{analyzeAuthor.isPending ? (analyzePhase === "analyze" ? "Đang phân tích..." : "Đang lấy bài viết...") : xMatch ? "Phân tích lại" : "Phân tích"}</Button></div>
          {(localError || analyzeAuthor.error) && <p className="mt-2 text-sm text-red-600">{localError || analyzeAuthor.error?.message}</p>}
          {analyzed && !xMatch && <p className="mt-2 text-xs font-medium text-amber-700">Thông tin đã đổi so với lần phân tích @{analyzed.username}{analyzed.projectName ? ` · @${analyzed.projectName}` : ""}. Bấm Phân tích lại trước khi lưu.</p>}
        </div>}
        {(createCategory === "custom" || xMatch) && <>
          {xMatch && <p className="mt-4 text-xs font-medium text-emerald-700">Đã điền văn phong của @{xMatch.username}{xMatch.projectName ? ` về @${xMatch.projectName}` : ""}. Sửa rồi lưu nếu cần.</p>}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium">Tên phong cách<Input className="mt-2 rounded-xl" placeholder="Founder thẳng thắn" {...form.register("name", { required: true, minLength: 2 })} /></label>
            <label className="text-sm font-medium">Mô tả ngắn <span className="font-normal text-slate-400">(không bắt buộc)</span><Input className="mt-2 rounded-xl" placeholder="Dùng cho bài xây dựng thương hiệu cá nhân" {...form.register("description", { maxLength: 300 })} /></label>
            <label className={`text-sm font-medium ${createCategory === "x" ? "md:col-span-2" : ""}`}>Hướng dẫn văn phong<Textarea className="mt-2 min-h-36 rounded-xl" placeholder="Giọng điệu, nhịp câu, cách mở bài, cấu trúc và điều cần tránh..." {...form.register("instruction", { required: true, minLength: 10, maxLength: 5000 })} /></label>
            {createCategory === "custom" && <label className="text-sm font-medium">Bài mẫu <span className="font-normal text-slate-400">(không bắt buộc)</span><Textarea className="mt-2 min-h-36 rounded-xl" placeholder="Dán bài viết thể hiện đúng phong cách..." {...form.register("sampleText", { maxLength: 5000 })} /></label>}
          </div>
          {createStyle.error && <p className="mt-4 text-sm text-red-600">{createStyle.error.message}</p>}
          <div className="mt-5 flex justify-end"><Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={createStyle.isPending || analyzeAuthor.isPending}>{createStyle.isPending ? "Đang lưu..." : "Lưu và áp dụng"}</Button></div>
        </>}
      </form>
    </section>}

    <div className="relative mt-7 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 rounded-xl bg-white pl-9" placeholder="Tìm trong thư viện..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>

    {([
      { id: "custom" as const, title: "Phong cách của bạn", hint: "Tự mô tả văn phong, không gắn với KOL hay dự án.", empty: "Chưa có phong cách riêng. Bấm Tạo phong cách để thêm." },
      { id: "kol" as const, title: "Phong cách KOL", hint: "Tạo từ username trên X.", empty: "Chưa có phong cách KOL." },
      { id: "writing" as const, title: "Phong cách bài viết", hint: "Phân tích bài của một KOL về một dự án.", empty: "Chưa có phong cách bài viết." },
      { id: "project" as const, title: "Phong cách dự án", hint: "Lưu từ tab Khám phá.", empty: "Chưa có phong cách dự án." },
    ]).map((group) => {
      const items = groupedStyles[group.id];
      return <section key={group.id} className="mt-7">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">{group.title}</h2><p className="mt-1 text-xs text-slate-500">{group.hint}</p></div><span className="text-xs text-slate-400">{items.length}</span></div>
        {items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((style, index) => <SavedStyleCard key={style.id} style={style} projects={projects} active={selectedSavedStyleId === style.id} color={colors[index % colors.length]} onChoose={() => chooseSaved(style)} onView={() => { setEditing(false); setDetail({ type: "saved", style }); }} onEdit={() => { updateStyle.reset(); setEditing(true); setDetail({ type: "saved", style }); }} onDelete={() => setStyleToDelete(style)} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-500">{search.trim() ? "Không có phong cách khớp." : group.empty}</div>}
      </section>;
    })}

    <section className="mt-10"><div className="mb-4"><h2 className="text-lg font-semibold">KOL dựng sẵn</h2><p className="mt-1 text-xs text-slate-500">Chọn nhanh một bộ đặc trưng văn phong đã được chuẩn bị.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredKOLs.map((author, index) => { const active = selectedKolId === author.id; return <article key={author.id} className={`group relative rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? "border-slate-950 shadow-sm" : "border-slate-200"}`}><button className="w-full text-left" onClick={() => chooseKOL(author.id)}><div className="flex items-start gap-3"><PromptAvatar src={kolAvatarSrc({ profileImgUrl: author.profileImgUrl, username: author.username, text: author.content })} name={author.name} className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-bold text-white ${colors[index % colors.length]}`} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{author.name}</h3>{active && <Check className="h-4 w-4 text-emerald-600" />}</div><p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{compact(author.style_vi || author.style || author.content)}</p></div></div></button><button type="button" aria-label={`Xem ${author.name}`} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-100 hover:bg-slate-100 hover:text-slate-700 md:opacity-0 md:group-hover:opacity-100" onClick={() => setDetail({ type: "kol", style: author })}><Eye className="h-4 w-4" /></button></article>; })}</div></section>
    <StyleDetailDialog
      open={Boolean(detail)}
      name={detail?.style.name || ""}
      displayName={detailFace?.title}
      kindLabel={detail?.type === "saved" ? categoryLabel(detail.style) : "KOL dựng sẵn"}
      description={detail?.type === "saved" ? detail.style.description : detail?.type === "kol" ? detail.style.style_vi || detail.style.style : ""}
      instruction={detail?.type === "saved" ? detail.style.instruction : detail?.type === "kol" ? detail.style.content : ""}
      username={detail?.type === "saved" ? (detailFace ? (detailFace.meta ? detail.style.username : null) : detail.style.username) : null}
      projectName={detail?.type === "saved" && !detailFace ? detail.style.projectName : null}
      faces={detailFace}
      avatarUrl={detail?.type === "saved" ? (resolveStyleCategory(detail.style) === "kol" ? kolAvatarSrc({ username: detail.style.username, avatarUrl: detail.style.avatarUrl }) : "") : detail?.type === "kol" ? kolAvatarSrc({ profileImgUrl: detail.style.profileImgUrl, username: detail.style.username, text: detail.style.content }) : ""}
      active={detail?.type === "saved" ? selectedSavedStyleId === detail.style.id : selectedKolId === detail?.style.id}
      canEdit={detail?.type === "saved"}
      editing={editing && detail?.type === "saved"}
      saving={updateStyle.isPending}
      saveError={updateStyle.error?.message}
      samples={detail?.type === "saved" && resolveStyleCategory(detail.style) === "project" ? detail.style.samples : undefined}
      onRefreshSamples={detail?.type === "saved" && resolveStyleCategory(detail.style) === "project" ? () => requestRefresh(detail.style) : undefined}
      refreshing={refreshSamples.isPending}
      refreshError={refreshSamples.error?.message}
      refreshNote={refreshSamples.data?.unchanged ? "Các bài mới nhất đã có trong mẫu." : undefined}
      onApply={() => { if (detail?.type === "saved") chooseSaved(detail.style); if (detail?.type === "kol") chooseKOL(detail.style.id); }}
      onEditingChange={(next) => { if (next) updateStyle.reset(); setEditing(next); }}
      onSave={(values) => updateStyle.mutate(values)}
      onOpenChange={(open) => { if (!open && !updateStyle.isPending && !refreshSamples.isPending) { refreshSamples.reset(); setDetail(null); setEditing(false); } }}
    />
    <ConfirmDialog
      open={Boolean(styleToDelete)}
      title="Xoá phong cách"
      description={`Xoá phong cách “${styleToDelete?.name}”? Hành động này không hoàn tác.`}
      confirmLabel="Xoá"
      destructive
      loading={removeStyle.isPending}
      onConfirm={() => { if (styleToDelete) removeStyle.mutate(styleToDelete.id); }}
      onOpenChange={(open) => { if (!open && !removeStyle.isPending) setStyleToDelete(null); }}
    />
    <Dialog open={accessOpen} onOpenChange={(open) => { if (!verifyAccess.isPending) { setAccessOpen(open); if (!open) { setAccessCode(""); verifyAccess.reset(); } } }}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Access code</DialogTitle>
          <DialogDescription>Nhập mã truy cập cho tài khoản này. Lần sau không cần nhập lại.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); verifyAccess.mutate(accessCode.trim()); }}>
          <label className="block text-sm font-medium">Mã truy cập
            <Input className="mt-2 h-12 rounded-xl" autoFocus type="password" placeholder="Nhập access code" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} />
          </label>
          {verifyAccess.error && <p className="text-sm text-red-600">{verifyAccess.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" disabled={verifyAccess.isPending} onClick={() => setAccessOpen(false)}>Huỷ</Button>
            <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={verifyAccess.isPending || !accessCode.trim()}>{verifyAccess.isPending ? "Đang kiểm tra..." : "Lấy bài viết"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div></main>;
}
