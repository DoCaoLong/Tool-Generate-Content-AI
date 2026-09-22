"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, LoaderCircle, Plus, Search, Sparkles, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { apiRequest } from "@/lib/http";
import { getKOLInitials, kolStyles, type KOLStyle } from "@/lib/kol-styles";
import { providerLabels } from "@/lib/providers";
import { buildStyleAnalysisPrompt, parseStyleAnalysis } from "@/lib/style-analysis";
import type { DiscoveredTweet, SavedStyle } from "@/lib/types";

interface ManualStyleValues { name: string; description: string; instruction: string; sampleText: string }
interface AnalyzedAuthor { username: string; samples: Array<{ id: string; text: string }> }
const colors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-rose-500", "bg-indigo-500"];
const handlePattern = /^[A-Za-z0-9_]{1,15}$/;

function compact(value: string) { return value.replace(/[#\s]+/g, " ").trim(); }
function normalizeHandle(value: string) { return value.trim().replace(/^@/, ""); }

export default function StyleLibraryPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [username, setUsername] = useState("");
  const [analyzed, setAnalyzed] = useState<AnalyzedAuthor | null>(null);
  const [analyzePhase, setAnalyzePhase] = useState<"idle" | "fetch" | "analyze">("idle");
  const [localError, setLocalError] = useState("");
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [detail, setDetail] = useState<{ type: "saved"; style: SavedStyle } | { type: "kol"; style: KOLStyle } | null>(null);
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
  const filteredKOLs = useMemo(() => kolList.filter((style) => `${style.name} ${style.content}`.toLowerCase().includes(search.toLowerCase())), [kolList, search]);
  const form = useForm<ManualStyleValues>({ defaultValues: { name: "", description: "", instruction: "", sampleText: "" } });
  const handle = normalizeHandle(username);
  const analyzedMatch = analyzed && analyzed.username === handle ? analyzed : null;

  const analyzeAuthor = useMutation({
    mutationFn: async (code: string) => {
      const author = normalizeHandle(username);
      if (!handlePattern.test(author)) throw new Error("Username X chưa hợp lệ.");
      if (!apiKey.trim()) throw new Error("Hãy lưu API key trong Cài đặt trước khi phân tích.");
      setAnalyzePhase("fetch");
      const data = await apiRequest<{ tweets?: DiscoveredTweet[] }>("/api/discover", { method: "POST", body: JSON.stringify({ username: author, projectName: "", accessCode: code }) });
      const samples = (data.tweets || [])
        .filter((tweet) => tweet.text.trim().length >= 20 && !/^RT @/i.test(tweet.text.trim()))
        .slice(0, 20)
        .map((tweet) => ({ id: tweet.id.slice(0, 100), text: tweet.text.slice(0, 4000) }));
      if (!samples.length) throw new Error(`Không tìm thấy bài viết của @${author}.`);
      setAnalyzePhase("analyze");
      const result = await generateWithProvider(provider, { apiKey, model, prompt: buildStyleAnalysisPrompt(author, samples.slice(0, 12)) });
      if (!result.success || !result.content) throw new Error(result.error || "Không thể phân tích phong cách.");
      return { author, samples, draft: parseStyleAnalysis(result.content, author, samples.length) };
    },
    onSuccess: ({ author, samples, draft }) => {
      form.setValue("name", draft.name, { shouldValidate: true });
      form.setValue("description", draft.description, { shouldValidate: true });
      form.setValue("instruction", draft.instruction, { shouldValidate: true });
      form.setValue("sampleText", "");
      setAnalyzed({ username: author, samples });
      setLocalError("");
    },
    onSettled: () => setAnalyzePhase("idle"),
  });

  const verifyAccess = useMutation({
    mutationFn: (code: string) => apiRequest<{ ok: true }>("/api/auth/access-code", { method: "POST", body: JSON.stringify({ accessCode: code }) }),
    onSuccess: (_, code) => {
      setVerifiedCode(code);
      setAccessOpen(false);
      setAccessCode("");
      analyzeAuthor.mutate(code);
    },
  });

  const requestAnalyze = () => {
    if (!handlePattern.test(handle)) {
      setLocalError("Username X chưa hợp lệ.");
      return;
    }
    if (!apiKey.trim()) {
      setLocalError("Hãy lưu API key trong Cài đặt trước khi phân tích.");
      return;
    }
    setLocalError("");
    if (!verifiedCode) {
      setAccessOpen(true);
      return;
    }
    analyzeAuthor.mutate(verifiedCode);
  };

  const createStyle = useMutation({
    mutationFn: (values: ManualStyleValues) => {
      const author = analyzed && analyzed.username === normalizeHandle(username) ? analyzed : null;
      if (author) {
        return apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "discovered", name: values.name, description: values.description, instruction: values.instruction, username: author.username, projectName: null, samples: author.samples }) });
      }
      return apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "manual", name: values.name, description: values.description, instruction: values.instruction, samples: values.sampleText.trim() ? [{ id: crypto.randomUUID(), text: values.sampleText.trim().slice(0, 5000) }] : [] }) });
    },
    onSuccess: async ({ style }) => {
      await queryClient.invalidateQueries({ queryKey: ["styles"] });
      setSelectedSavedStyleId(style.id);
      setSelectedKolId(null);
      setDiscoveredStyle(null);
      form.reset();
      setUsername("");
      setAnalyzed(null);
      setLocalError("");
      setCreating(false);
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
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Cá nhân hoá</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Thư viện phong cách</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Quản lý phong cách đã lưu, tự viết, lấy giọng từ username trên X, hoặc dùng bộ KOL dựng sẵn.</p></div><div className="flex gap-2"><Button variant="outline" className="rounded-xl" onClick={clearStyle}><X className="mr-2 h-4 w-4" />Dùng mặc định</Button><Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setCreating(!creating)}><Plus className="mr-2 h-4 w-4" />Tạo phong cách</Button></div></div>

    {creating && <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Phong cách mới</h2><p className="mt-1 text-xs text-slate-500">Tự mô tả giọng viết, hoặc nhập username để Sorsa lấy bài và AI phân tích.</p></div><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={() => setCreating(false)}><X className="h-4 w-4" /></button></div>
      <form onSubmit={form.handleSubmit((values) => createStyle.mutate(values))}>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <label className="text-sm font-medium text-slate-800" htmlFor="style-username">Lấy từ username <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span><Input id="style-username" className="h-11 rounded-xl bg-white pl-7" placeholder="elonmusk" value={username} autoComplete="off" onChange={(event) => { setUsername(event.target.value); setLocalError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); requestAnalyze(); } }} /></div>
            <Button type="button" className="h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" disabled={analyzeAuthor.isPending} onClick={requestAnalyze}>{analyzeAuthor.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{analyzeAuthor.isPending ? (analyzePhase === "analyze" ? "Đang phân tích..." : "Đang lấy bài viết...") : "Phân tích"}</Button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{apiKey.trim() ? <>Dùng {providerLabels[provider]} · {model}. Bài mẫu được coi là dữ liệu, không sao chép nguyên văn.</> : <>Chưa có API key. <Link className="font-medium text-violet-700 hover:text-violet-900" href="/settings">Mở Cài đặt</Link> để lưu key trước khi phân tích.</>}</p>
          {(localError || analyzeAuthor.error) && <p className="mt-2 text-sm text-red-600">{localError || analyzeAuthor.error?.message}</p>}
          {analyzedMatch && <p className="mt-2 text-xs font-medium text-violet-700">Đã phân tích {analyzedMatch.samples.length} bài của @{analyzedMatch.username}. Sửa nội dung bên dưới rồi lưu.</p>}
          {analyzed && handle && !analyzedMatch && <p className="mt-2 text-xs font-medium text-amber-700">Username đã đổi so với lần phân tích @{analyzed.username}. Bấm Phân tích lại để lưu đúng bài mẫu.</p>}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium">Tên phong cách<Input className="mt-2 rounded-xl" placeholder="Founder thẳng thắn" {...form.register("name", { required: true, minLength: 2 })} /></label>
          <label className="text-sm font-medium">Mô tả ngắn<Input className="mt-2 rounded-xl" placeholder="Dùng cho bài xây dựng thương hiệu cá nhân" {...form.register("description", { maxLength: 300 })} /></label>
          <label className="text-sm font-medium">Hướng dẫn văn phong<Textarea className="mt-2 min-h-36 rounded-xl" placeholder="Giọng điệu, nhịp câu, cách mở bài, cấu trúc và điều cần tránh..." {...form.register("instruction", { required: true, minLength: 10, maxLength: 5000 })} /></label>
          {analyzedMatch ? <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4 text-sm text-slate-600"><p className="font-medium text-slate-800">Bài mẫu từ Sorsa</p><p className="mt-2 leading-6">{analyzedMatch.samples.length} bài của @{analyzedMatch.username} sẽ được lưu kèm hướng dẫn. Đổi username thì phân tích lại trước khi lưu.</p></div> : <label className="text-sm font-medium">Bài mẫu <span className="font-normal text-slate-400">(không bắt buộc)</span><Textarea className="mt-2 min-h-36 rounded-xl" placeholder="Dán bài viết thể hiện đúng phong cách..." {...form.register("sampleText", { maxLength: 5000 })} /></label>}
        </div>
        {createStyle.error && <p className="mt-4 text-sm text-red-600">{createStyle.error.message}</p>}
        <div className="mt-5 flex justify-end"><Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={createStyle.isPending || analyzeAuthor.isPending || Boolean(analyzed && handle && !analyzedMatch)}>{createStyle.isPending ? "Đang lưu..." : "Lưu và áp dụng"}</Button></div>
      </form>
    </section>}

    <div className="relative mt-7 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 rounded-xl bg-white pl-9" placeholder="Tìm trong thư viện..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>

    <section className="mt-7"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Phong cách của bạn</h2><p className="mt-1 text-xs text-slate-500">Được đồng bộ với tài khoản và có thể dùng lại ở mọi dự án.</p></div><span className="text-xs text-slate-400">{styles.length} phong cách</span></div>{filteredStyles.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredStyles.map((style, index) => { const active = selectedSavedStyleId === style.id; return <article key={style.id} className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><button className="w-full text-left" onClick={() => chooseSaved(style)}><div className="flex items-start gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold text-white ${style.kind === "discovered" ? "bg-violet-500" : colors[index % colors.length]}`}>{style.kind === "discovered" ? "@" : getKOLInitials(style.name)}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{style.name}</h3>{active && <Check className="h-4 w-4 text-emerald-600" />}</div><p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{style.description || compact(style.instruction)}</p></div></div><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-500"><Sparkles className="h-3 w-3" />{style.kind === "discovered" ? `${style.samples.length} bài Sorsa` : "Tự tạo"}</div></button><div className="absolute right-3 top-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100"><button type="button" aria-label={`Xem ${style.name}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-700" onClick={() => setDetail({ type: "saved", style })}><Eye className="h-4 w-4" /></button><button type="button" aria-label={`Xoá ${style.name}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500" onClick={() => setStyleToDelete(style)}><Trash2 className="h-4 w-4" /></button></div></article>; })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center"><UserRound className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Chưa có phong cách riêng.</p></div>}</section>

    <section className="mt-10"><div className="mb-4"><h2 className="text-lg font-semibold">KOL dựng sẵn</h2><p className="mt-1 text-xs text-slate-500">Chọn nhanh một bộ đặc trưng văn phong đã được chuẩn bị.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredKOLs.map((author, index) => { const active = selectedKolId === author.id; return <article key={author.id} className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><button className="w-full text-left" onClick={() => chooseKOL(author.id)}><div className="flex items-start gap-3"><PromptAvatar src={author.profileImgUrl} name={author.name} className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-bold text-white ${colors[index % colors.length]}`} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{author.name}</h3>{active && <Check className="h-4 w-4 text-emerald-600" />}</div><p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{compact(author.style_vi || author.style || author.content)}</p></div></div></button><button type="button" aria-label={`Xem ${author.name}`} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-100 hover:bg-slate-100 hover:text-slate-700 md:opacity-0 md:group-hover:opacity-100" onClick={() => setDetail({ type: "kol", style: author })}><Eye className="h-4 w-4" /></button></article>; })}</div></section>
    <StyleDetailDialog
      open={Boolean(detail)}
      name={detail?.style.name || ""}
      kindLabel={detail?.type === "saved" ? (detail.style.kind === "discovered" ? "Khám phá Sorsa" : "Tự tạo") : "KOL dựng sẵn"}
      description={detail?.type === "saved" ? detail.style.description : detail?.type === "kol" ? detail.style.style_vi || detail.style.style : ""}
      instruction={detail?.type === "saved" ? detail.style.instruction : detail?.type === "kol" ? detail.style.content : ""}
      username={detail?.type === "saved" ? detail.style.username : null}
      projectName={detail?.type === "saved" ? detail.style.projectName : null}
      samples={detail?.type === "saved" ? detail.style.samples : []}
      active={detail?.type === "saved" ? selectedSavedStyleId === detail.style.id : selectedKolId === detail?.style.id}
      onApply={() => { if (detail?.type === "saved") chooseSaved(detail.style); if (detail?.type === "kol") chooseKOL(detail.style.id); }}
      onOpenChange={(open) => { if (!open) setDetail(null); }}
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
