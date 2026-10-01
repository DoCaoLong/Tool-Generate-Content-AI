"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, LoaderCircle, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
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
import { getKOLInitials, kolStyles, type KOLStyle } from "@/lib/kol-styles";
import { providerLabels } from "@/lib/providers";
import { resolveStyleCategory, type StyleCategory } from "@/lib/style-category";
import { buildStyleAnalysisPrompt, parseStyleAnalysis } from "@/lib/style-analysis";
import { clearSorsaAccessCode, getSorsaAccessServerSnapshot, getSorsaAccessSnapshot, saveSorsaAccessCode, subscribeSorsaAccess } from "@/lib/sorsa-access";
import type { DiscoveredTweet, SavedStyle } from "@/lib/types";

interface ManualStyleValues { name: string; description: string; instruction: string; sampleText: string }
interface AnalyzedAuthor { username: string; projectName: string | null; samples: Array<{ id: string; text: string }> }
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
function categoryLabel(category: StyleCategory) {
  if (category === "kol") return "Phong cách KOL";
  if (category === "project") return "Phong cách dự án";
  return "Phong cách bài viết";
}

function SavedStyleCard({ style, active, color, onChoose, onView, onEdit, onDelete }: { style: SavedStyle; active: boolean; color: string; onChoose: () => void; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const category = resolveStyleCategory(style);
  const badge = category === "kol" ? (style.username ? `@${style.username}` : "KOL") : category === "project" ? (style.projectName || (style.username ? `@${style.username}` : "Dự án")) : style.username && style.projectName ? `@${style.username} · @${style.projectName.replace(/^@/, "")}` : "Bài viết";
  const mark = getKOLInitials(style.username || style.projectName || style.name);
  const tone = category === "kol" ? "bg-violet-500" : category === "project" ? "bg-sky-500" : color;
  return <article className={`group relative rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? "border-slate-950 shadow-sm" : "border-slate-200"}`}>
    <button className="w-full text-left" onClick={onChoose}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold text-white ${tone}`}>{mark}</span>
        <div className="min-w-0 flex-1 pr-20">
          <div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{style.name}</h3>{active && <Check className="h-4 w-4 text-emerald-600" />}</div>
          <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{style.description || compact(style.instruction)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-500"><Sparkles className="h-3 w-3" />{badge}</div>
    </button>
    <div className="absolute right-3 top-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
      <button type="button" aria-label={`Xem ${style.name}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-700" onClick={onView}><Eye className="h-4 w-4" /></button>
      <button type="button" aria-label={`Sửa ${style.name}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-700" onClick={onEdit}><Pencil className="h-4 w-4" /></button>
      <button type="button" aria-label={`Xoá ${style.name}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
    </div>
  </article>;
}

export default function StyleLibraryPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [createCategory, setCreateCategory] = useState<StyleCategory>("kol");
  const [search, setSearch] = useState("");
  const [username, setUsername] = useState("");
  const [writingKol, setWritingKol] = useState("");
  const [writingProject, setWritingProject] = useState("");
  const [analyzed, setAnalyzed] = useState<AnalyzedAuthor | null>(null);
  const pendingAnalyze = useRef<AnalyzeTarget | null>(null);
  const pendingRefresh = useRef<SavedStyle | null>(null);
  const [analyzePhase, setAnalyzePhase] = useState<"idle" | "fetch" | "analyze">("idle");
  const [localError, setLocalError] = useState("");
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const verifiedCode = useSyncExternalStore(subscribeSorsaAccess, getSorsaAccessSnapshot, getSorsaAccessServerSnapshot);
  const [detail, setDetail] = useState<{ type: "saved"; style: SavedStyle } | { type: "kol"; style: KOLStyle } | null>(null);
  const [editing, setEditing] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState<SavedStyle | null>(null);
  const provider = useAppStore((state) => state.provider);
  const model = useAppStore((state) => state.model);
  const apiKey = useAppStore((state) => state.apiKey);
  const selectedKolId = useAppStore((state) => state.selectedKolId);
  const setSelectedKolId = useAppStore((state) => state.setSelectedKolId);
  const selectedSavedStyleId = useAppStore((state) => state.selectedSavedStyleId);
  const setSelectedSavedStyleId = useAppStore((state) => state.setSelectedSavedStyleId);
  const setDiscoveredStyle = useAppStore((state) => state.setDiscoveredStyle);
  const stylesQuery = useQuery({ queryKey: ["styles"], queryFn: () => apiRequest<{ styles: SavedStyle[] }>("/api/styles") });
  const promptQuery = useQuery({ queryKey: ["prompt-styles"], queryFn: () => apiRequest<{ styles: KOLStyle[] }>("/api/prompt-styles") });
  const styles = useMemo(() => stylesQuery.data?.styles || [], [stylesQuery.data?.styles]);
  const kolList = promptQuery.data?.styles || kolStyles;
  const filteredStyles = useMemo(() => styles.filter((style) => `${style.name} ${style.description} ${style.instruction}`.toLowerCase().includes(search.toLowerCase())), [styles, search]);
  const groupedStyles = useMemo(() => ({
    kol: filteredStyles.filter((style) => resolveStyleCategory(style) === "kol"),
    writing: filteredStyles.filter((style) => resolveStyleCategory(style) === "writing"),
    project: filteredStyles.filter((style) => resolveStyleCategory(style) === "project"),
  }), [filteredStyles]);
  const filteredKOLs = useMemo(() => kolList.filter((style) => `${style.name} ${style.content}`.toLowerCase().includes(search.toLowerCase())), [kolList, search]);
  const form = useForm<ManualStyleValues>({ defaultValues: { name: "", description: "", instruction: "", sampleText: "" } });
  const handle = normalizeHandle(username);
  const writingKolHandle = normalizeHandle(writingKol);
  const writingProjectHandle = normalizeHandle(writingProject);
  const kolMatch = analyzed && !analyzed.projectName && analyzed.username === handle ? analyzed : null;
  const writingMatch = analyzed?.projectName && analyzed.username === writingKolHandle && analyzed.projectName === writingProjectHandle ? analyzed : null;
  const writingHandlesFilled = Boolean(writingKolHandle || writingProjectHandle);

  const analyzeAuthor = useMutation({
    mutationFn: async ({ code, username: author, projectName }: AnalyzeTarget & { code: string }) => {
      if (!handlePattern.test(author) || (projectName && !handlePattern.test(projectName))) throw new Error("Username X chưa hợp lệ.");
      if (!apiKey.trim()) throw new Error("Hãy lưu API key trong Cài đặt trước khi phân tích.");
      setAnalyzePhase("fetch");
      const data = await apiRequest<{ tweets?: DiscoveredTweet[] }>("/api/discover", { method: "POST", body: JSON.stringify({ username: author, projectName: projectName ? `@${projectName}` : "", accessCode: code }) });
      const samples = (data.tweets || [])
        .filter((tweet) => tweet.text.trim().length >= 20 && !/^RT @/i.test(tweet.text.trim()))
        .slice(0, 20)
        .map((tweet) => ({ id: tweet.id.slice(0, 100), text: tweet.text.slice(0, 4000) }));
      if (!samples.length) throw new Error(projectName ? `Không tìm thấy bài của @${author} về @${projectName}.` : `Không tìm thấy bài viết của @${author}.`);
      setAnalyzePhase("analyze");
      const result = await generateWithProvider(provider, { apiKey, model, prompt: buildStyleAnalysisPrompt(author, samples.slice(0, 12), projectName || undefined) });
      if (!result.success || !result.content) throw new Error(result.error || "Không thể phân tích phong cách.");
      return { author, projectName: projectName || null, samples, draft: parseStyleAnalysis(result.content, author, samples.length, projectName || undefined) };
    },
    onSuccess: ({ author, projectName, samples, draft }) => {
      form.setValue("name", draft.name, { shouldValidate: true });
      form.setValue("description", draft.description, { shouldValidate: true });
      form.setValue("instruction", draft.instruction, { shouldValidate: true });
      form.setValue("sampleText", "");
      setAnalyzed({ username: author, projectName, samples });
      setLocalError("");
      pendingAnalyze.current = null;
    },
    onError: (error) => {
      if (error instanceof ApiError && error.message === "Access code không đúng.") {
        clearSorsaAccessCode();
        setAccessOpen(true);
      }
    },
    onSettled: () => setAnalyzePhase("idle"),
  });

  const verifyAccess = useMutation({
    mutationFn: (code: string) => apiRequest<{ ok: true }>("/api/auth/access-code", { method: "POST", body: JSON.stringify({ accessCode: code }) }),
    onSuccess: (_, code) => {
      saveSorsaAccessCode(code);
      setAccessOpen(false);
      setAccessCode("");
      const refreshStyle = pendingRefresh.current;
      pendingRefresh.current = null;
      if (refreshStyle) {
        refreshSamples.mutate({ style: refreshStyle, code });
        return;
      }
      const pending = pendingAnalyze.current;
      if (pending) analyzeAuthor.mutate({ code, ...pending });
    },
  });

  const requestAnalyze = () => {
    const target: AnalyzeTarget = createCategory === "writing"
      ? { username: writingKolHandle, projectName: writingProjectHandle }
      : { username: handle, projectName: "" };
    if (!handlePattern.test(target.username) || (createCategory === "writing" && !handlePattern.test(target.projectName))) {
      setLocalError(createCategory === "writing" ? "Hãy nhập đủ username KOL và username dự án." : "Username X chưa hợp lệ.");
      return;
    }
    if (!apiKey.trim()) {
      setLocalError("Hãy lưu API key trong Cài đặt trước khi phân tích.");
      return;
    }
    setLocalError("");
    pendingRefresh.current = null;
    pendingAnalyze.current = target;
    if (!verifiedCode) {
      setAccessOpen(true);
      return;
    }
    analyzeAuthor.mutate({ code: verifiedCode, ...target });
  };

  const createStyle = useMutation({
    mutationFn: (values: ManualStyleValues) => {
      if (createCategory === "kol") {
        if (!kolMatch) throw new Error("Hãy phân tích username trước khi lưu phong cách KOL.");
        return apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "discovered", category: "kol", name: values.name, description: values.description, instruction: values.instruction, username: kolMatch.username, projectName: null, samples: kolMatch.samples }) });
      }
      if (writingKolHandle || writingProjectHandle) {
        if (!writingMatch) throw new Error("Hãy phân tích hai username trước khi lưu.");
        return apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "manual", category: "writing", name: values.name, description: values.description, instruction: values.instruction, username: writingMatch.username, projectName: writingMatch.projectName, samples: writingMatch.samples }) });
      }
      return apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "manual", category: "writing", name: values.name, description: values.description, instruction: values.instruction, username: null, projectName: null, samples: values.sampleText.trim() ? [{ id: crypto.randomUUID(), text: values.sampleText.trim().slice(0, 5000) }] : [] }) });
    },
    onSuccess: async ({ style }) => {
      await queryClient.invalidateQueries({ queryKey: ["styles"] });
      setSelectedSavedStyleId(style.id);
      setSelectedKolId(null);
      setDiscoveredStyle(null);
      form.reset();
      setUsername("");
      setWritingKol("");
      setWritingProject("");
      setAnalyzed(null);
      setCreateCategory("kol");
      setLocalError("");
      setCreating(false);
    },
  });
  const refreshSamples = useMutation({
    mutationFn: async ({ style, code }: { style: SavedStyle; code: string }) => {
      const username = (style.username || "").replace(/^@/, "");
      const projectName = (style.projectName || "").slice(0, 100);
      if (!username && !projectName) throw new Error("Phong cách này chưa có username hoặc dự án để lấy bài mới.");
      const data = await apiRequest<{ tweets?: DiscoveredTweet[] }>("/api/discover", { method: "POST", body: JSON.stringify({ username, projectName, accessCode: code }) });
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
      if (error instanceof ApiError && error.message === "Access code không đúng.") {
        clearSorsaAccessCode();
        setAccessOpen(true);
      }
    },
  });
  const requestRefresh = (style: SavedStyle) => {
    pendingAnalyze.current = null;
    pendingRefresh.current = style;
    refreshSamples.reset();
    if (!verifiedCode) {
      setAccessOpen(true);
      return;
    }
    refreshSamples.mutate({ style, code: verifiedCode });
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
    onSuccess: async (_, id) => { if (selectedSavedStyleId === id) setSelectedSavedStyleId(null); setStyleToDelete(null); await queryClient.invalidateQueries({ queryKey: ["styles"] }); },
  });

  const chooseSaved = (style: SavedStyle) => { setSelectedSavedStyleId(style.id); setSelectedKolId(null); setDiscoveredStyle(null); };
  const chooseKOL = (id: string) => { setSelectedKolId(id); setSelectedSavedStyleId(null); setDiscoveredStyle(null); };
  const clearStyle = () => { setSelectedKolId(null); setSelectedSavedStyleId(null); setDiscoveredStyle(null); };

  return <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Cá nhân hoá</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Thư viện phong cách</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Phong cách KOL lấy từ username trên X. Phong cách bài viết có thể tự mô tả, hoặc phân tích bài của một KOL về một dự án. Phong cách dự án đến từ tab Khám phá.</p></div><div className="flex gap-2"><Button variant="outline" className="gap-1 rounded-xl" onClick={clearStyle}><X className="h-4 w-4" />Dùng mặc định</Button><Button className="gap-1 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setCreating(!creating)}><Plus className="h-4 w-4" />Tạo phong cách</Button></div></div>

    {creating && <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Phong cách mới</h2><p className="mt-1 text-xs text-slate-500">{createCategory === "kol" ? "Phân tích username trên X. Kết quả được xếp vào Phong cách KOL." : "Tự mô tả, hoặc lấy bài của một KOL về một dự án. Kết quả được xếp vào Phong cách bài viết."}</p></div><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={() => setCreating(false)}><X className="h-4 w-4" /></button></div>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button type="button" className={`h-10 rounded-xl text-sm font-medium ${createCategory === "kol" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`} onClick={() => { setCreateCategory("kol"); setLocalError(""); }}>Phong cách KOL</button>
        <button type="button" className={`h-10 rounded-xl text-sm font-medium ${createCategory === "writing" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`} onClick={() => { setCreateCategory("writing"); setLocalError(""); }}>Phong cách bài viết</button>
      </div>
      <form onSubmit={form.handleSubmit((values) => createStyle.mutate(values))}>
        {createCategory === "kol" && <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <label className="text-sm font-medium text-slate-800" htmlFor="style-username">Username trên X</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span><Input id="style-username" className="h-11 rounded-xl bg-white pl-7" placeholder="elonmusk" value={username} autoComplete="off" onChange={(event) => { setUsername(event.target.value); setLocalError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); requestAnalyze(); } }} /></div>
            <Button type="button" className="h-11 gap-1 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" disabled={analyzeAuthor.isPending} onClick={requestAnalyze}>{analyzeAuthor.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{analyzeAuthor.isPending ? (analyzePhase === "analyze" ? "Đang phân tích..." : "Đang lấy bài viết...") : "Phân tích"}</Button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{apiKey.trim() ? <>Dùng {providerLabels[provider]} · {model}. Kết quả chỉ là văn phong, không hiện bài viết.</> : <>Chưa có API key. <Link className="font-medium text-violet-700 hover:text-violet-900" href="/settings">Mở Cài đặt</Link> để lưu key trước khi phân tích.</>}</p>
          {(localError || analyzeAuthor.error) && <p className="mt-2 text-sm text-red-600">{localError || analyzeAuthor.error?.message}</p>}
          {kolMatch && <p className="mt-2 text-xs font-medium text-violet-700">Đã điền văn phong của @{kolMatch.username}. Sửa rồi lưu nếu cần.</p>}
          {analyzed && handle && !kolMatch && <p className="mt-2 text-xs font-medium text-amber-700">Username đã đổi so với lần phân tích @{analyzed.username}. Bấm Phân tích lại trước khi lưu.</p>}
        </div>}
        {createCategory === "writing" && <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800" htmlFor="writing-kol">Username KOL<div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span><Input id="writing-kol" className="h-11 rounded-xl bg-white pl-7" placeholder="elonmusk" value={writingKol} autoComplete="off" onChange={(event) => { setWritingKol(event.target.value); setLocalError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); requestAnalyze(); } }} /></div></label>
            <label className="block text-sm font-medium text-slate-800" htmlFor="writing-project">Username dự án<div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span><Input id="writing-project" className="h-11 rounded-xl bg-white pl-7" placeholder="PlayOnMint" value={writingProject} autoComplete="off" onChange={(event) => { setWritingProject(event.target.value); setLocalError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); requestAnalyze(); } }} /></div></label>
          </div>
          <div className="mt-3 flex justify-end"><Button type="button" className="h-11 gap-1 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" disabled={analyzeAuthor.isPending} onClick={requestAnalyze}>{analyzeAuthor.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{analyzeAuthor.isPending ? (analyzePhase === "analyze" ? "Đang phân tích..." : "Đang lấy bài viết...") : "Phân tích"}</Button></div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{apiKey.trim() ? <>Lấy bài của KOL nói về dự án qua Sorsa, rồi phân tích bằng {providerLabels[provider]} · {model}. Không hiện nội dung bài.</> : <>Chưa có API key. <Link className="font-medium text-violet-700 hover:text-violet-900" href="/settings">Mở Cài đặt</Link> để lưu key trước khi phân tích.</>}</p>
          {(localError || analyzeAuthor.error) && <p className="mt-2 text-sm text-red-600">{localError || analyzeAuthor.error?.message}</p>}
          {writingMatch && <p className="mt-2 text-xs font-medium text-violet-700">Đã điền văn phong của @{writingMatch.username} về @{writingMatch.projectName}. Sửa rồi lưu nếu cần.</p>}
          {writingHandlesFilled && !writingMatch && <p className="mt-2 text-xs font-medium text-amber-700">{analyzed?.projectName ? `Username đã đổi so với lần phân tích @${analyzed.username} · @${analyzed.projectName}. Bấm Phân tích lại trước khi lưu.` : "Phân tích hai username trước khi lưu."}</p>}
        </div>}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium">Tên phong cách<Input className="mt-2 rounded-xl" placeholder="Founder thẳng thắn" {...form.register("name", { required: true, minLength: 2 })} /></label>
          <label className="text-sm font-medium">Mô tả ngắn<Input className="mt-2 rounded-xl" placeholder="Dùng cho bài xây dựng thương hiệu cá nhân" {...form.register("description", { maxLength: 300 })} /></label>
          <label className={`text-sm font-medium ${createCategory === "kol" || writingMatch ? "md:col-span-2" : ""}`}>Hướng dẫn văn phong<Textarea className="mt-2 min-h-36 rounded-xl" placeholder="Giọng điệu, nhịp câu, cách mở bài, cấu trúc và điều cần tránh..." {...form.register("instruction", { required: true, minLength: 10, maxLength: 5000 })} /></label>
          {createCategory === "writing" && !writingMatch && <label className="text-sm font-medium">Bài mẫu <span className="font-normal text-slate-400">(không bắt buộc)</span><Textarea className="mt-2 min-h-36 rounded-xl" placeholder="Dán bài viết thể hiện đúng phong cách..." {...form.register("sampleText", { maxLength: 5000 })} /></label>}
        </div>
        {createCategory === "kol" && !kolMatch && <p className="mt-4 text-xs text-slate-500">Phân tích username trước khi lưu vào Phong cách KOL.</p>}
        {createStyle.error && <p className="mt-4 text-sm text-red-600">{createStyle.error.message}</p>}
        <div className="mt-5 flex justify-end"><Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={createStyle.isPending || analyzeAuthor.isPending || (createCategory === "kol" && !kolMatch) || (createCategory === "writing" && writingHandlesFilled && !writingMatch)}>{createStyle.isPending ? "Đang lưu..." : "Lưu và áp dụng"}</Button></div>
      </form>
    </section>}

    <div className="relative mt-7 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 rounded-xl bg-white pl-9" placeholder="Tìm trong thư viện..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>

    {([
      { id: "kol" as const, title: "Phong cách KOL", hint: "Tạo từ username trên X.", empty: "Chưa có phong cách KOL." },
      { id: "writing" as const, title: "Phong cách bài viết", hint: "Tự mô tả, hoặc phân tích bài của một KOL về một dự án.", empty: "Chưa có phong cách bài viết." },
      { id: "project" as const, title: "Phong cách dự án", hint: "Lưu từ tab Khám phá.", empty: "Chưa có phong cách dự án." },
    ]).map((group) => {
      const items = groupedStyles[group.id];
      return <section key={group.id} className="mt-7">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">{group.title}</h2><p className="mt-1 text-xs text-slate-500">{group.hint}</p></div><span className="text-xs text-slate-400">{items.length}</span></div>
        {items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((style, index) => <SavedStyleCard key={style.id} style={style} active={selectedSavedStyleId === style.id} color={colors[index % colors.length]} onChoose={() => chooseSaved(style)} onView={() => { setEditing(false); setDetail({ type: "saved", style }); }} onEdit={() => { updateStyle.reset(); setEditing(true); setDetail({ type: "saved", style }); }} onDelete={() => setStyleToDelete(style)} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-500">{search.trim() ? "Không có phong cách khớp." : group.empty}</div>}
      </section>;
    })}

    <section className="mt-10"><div className="mb-4"><h2 className="text-lg font-semibold">KOL dựng sẵn</h2><p className="mt-1 text-xs text-slate-500">Chọn nhanh một bộ đặc trưng văn phong đã được chuẩn bị.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredKOLs.map((author, index) => { const active = selectedKolId === author.id; return <article key={author.id} className={`group relative rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? "border-slate-950 shadow-sm" : "border-slate-200"}`}><button className="w-full text-left" onClick={() => chooseKOL(author.id)}><div className="flex items-start gap-3"><PromptAvatar src={author.profileImgUrl} name={author.name} className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-bold text-white ${colors[index % colors.length]}`} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{author.name}</h3>{active && <Check className="h-4 w-4 text-emerald-600" />}</div><p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{compact(author.style_vi || author.style || author.content)}</p></div></div></button><button type="button" aria-label={`Xem ${author.name}`} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-100 hover:bg-slate-100 hover:text-slate-700 md:opacity-0 md:group-hover:opacity-100" onClick={() => setDetail({ type: "kol", style: author })}><Eye className="h-4 w-4" /></button></article>; })}</div></section>
    <StyleDetailDialog
      open={Boolean(detail)}
      name={detail?.style.name || ""}
      kindLabel={detail?.type === "saved" ? categoryLabel(resolveStyleCategory(detail.style)) : "KOL dựng sẵn"}
      description={detail?.type === "saved" ? detail.style.description : detail?.type === "kol" ? detail.style.style_vi || detail.style.style : ""}
      instruction={detail?.type === "saved" ? detail.style.instruction : detail?.type === "kol" ? detail.style.content : ""}
      username={detail?.type === "saved" ? detail.style.username : null}
      projectName={detail?.type === "saved" ? detail.style.projectName : null}
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
          <DialogDescription>Nhập mã truy cập để lấy bài viết trên X.</DialogDescription>
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
