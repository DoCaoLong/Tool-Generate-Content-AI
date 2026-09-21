"use client";

/* eslint-disable @next/next/no-img-element -- KOL avatars come from public paths or admin uploads. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Plus, Search, Sparkles, Trash2, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { StyleDetailDialog } from "@/components/StyleDetailDialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/app-store";
import { apiRequest } from "@/lib/http";
import { getKOLInitials, kolStyles, type KOLStyle } from "@/lib/kol-styles";
import type { SavedStyle } from "@/lib/types";

interface ManualStyleValues { name: string; description: string; instruction: string; sampleText: string }
const colors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-rose-500", "bg-indigo-500"];

function compact(value: string) { return value.replace(/[#\s]+/g, " ").trim(); }

export default function StyleLibraryPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<{ type: "saved"; style: SavedStyle } | { type: "kol"; style: KOLStyle } | null>(null);
  const [styleToDelete, setStyleToDelete] = useState<SavedStyle | null>(null);
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

  const createStyle = useMutation({
    mutationFn: (values: ManualStyleValues) => apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "manual", name: values.name, description: values.description, instruction: values.instruction, samples: values.sampleText.trim() ? [{ id: crypto.randomUUID(), text: values.sampleText.trim().slice(0, 5000) }] : [] }) }),
    onSuccess: async ({ style }) => { await queryClient.invalidateQueries({ queryKey: ["styles"] }); setSelectedSavedStyleId(style.id); setSelectedKolId(null); setDiscoveredStyle(null); form.reset(); setCreating(false); },
  });
  const removeStyle = useMutation({
    mutationFn: (id: string) => apiRequest<{ ok: true }>(`/api/styles/${id}`, { method: "DELETE" }),
    onSuccess: async (_, id) => { if (selectedSavedStyleId === id) setSelectedSavedStyleId(null); setStyleToDelete(null); await queryClient.invalidateQueries({ queryKey: ["styles"] }); },
  });

  const chooseSaved = (style: SavedStyle) => { setSelectedSavedStyleId(style.id); setSelectedKolId(null); setDiscoveredStyle(null); };
  const chooseKOL = (id: string) => { setSelectedKolId(id); setSelectedSavedStyleId(null); setDiscoveredStyle(null); };
  const clearStyle = () => { setSelectedKolId(null); setSelectedSavedStyleId(null); setDiscoveredStyle(null); };

  return <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Cá nhân hoá</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Thư viện phong cách</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Quản lý phong cách đã lưu từ Khám phá, tự tạo giọng viết riêng hoặc dùng bộ KOL dựng sẵn.</p></div><div className="flex gap-2"><Button variant="outline" className="rounded-xl" onClick={clearStyle}><X className="mr-2 h-4 w-4" />Dùng mặc định</Button><Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setCreating(!creating)}><Plus className="mr-2 h-4 w-4" />Tạo phong cách</Button></div></div>

    {creating && <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Phong cách mới</h2><p className="mt-1 text-xs text-slate-500">Mô tả càng cụ thể, kết quả càng ổn định.</p></div><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={() => setCreating(false)}><X className="h-4 w-4" /></button></div><form onSubmit={form.handleSubmit((values) => createStyle.mutate(values))}><div className="grid gap-5 md:grid-cols-2"><label className="text-sm font-medium">Tên phong cách<Input className="mt-2 rounded-xl" placeholder="Founder thẳng thắn" {...form.register("name", { required: true, minLength: 2 })} /></label><label className="text-sm font-medium">Mô tả ngắn<Input className="mt-2 rounded-xl" placeholder="Dùng cho bài xây dựng thương hiệu cá nhân" {...form.register("description", { maxLength: 300 })} /></label><label className="text-sm font-medium">Hướng dẫn văn phong<Textarea className="mt-2 min-h-36 rounded-xl" placeholder="Giọng điệu, nhịp câu, cách mở bài, cấu trúc và điều cần tránh..." {...form.register("instruction", { required: true, minLength: 10, maxLength: 5000 })} /></label><label className="text-sm font-medium">Bài mẫu <span className="font-normal text-slate-400">(không bắt buộc)</span><Textarea className="mt-2 min-h-36 rounded-xl" placeholder="Dán bài viết thể hiện đúng phong cách..." {...form.register("sampleText", { maxLength: 5000 })} /></label></div>{createStyle.error && <p className="mt-4 text-sm text-red-600">{createStyle.error.message}</p>}<div className="mt-5 flex justify-end"><Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={createStyle.isPending}>{createStyle.isPending ? "Đang lưu..." : "Lưu và áp dụng"}</Button></div></form></section>}

    <div className="relative mt-7 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 rounded-xl bg-white pl-9" placeholder="Tìm trong thư viện..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>

    <section className="mt-7"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Phong cách của bạn</h2><p className="mt-1 text-xs text-slate-500">Được đồng bộ với tài khoản và có thể dùng lại ở mọi dự án.</p></div><span className="text-xs text-slate-400">{styles.length} phong cách</span></div>{filteredStyles.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredStyles.map((style, index) => { const active = selectedSavedStyleId === style.id; return <article key={style.id} className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><button className="w-full text-left" onClick={() => chooseSaved(style)}><div className="flex items-start gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold text-white ${style.kind === "discovered" ? "bg-violet-500" : colors[index % colors.length]}`}>{style.kind === "discovered" ? "@" : getKOLInitials(style.name)}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{style.name}</h3>{active && <Check className="h-4 w-4 text-emerald-600" />}</div><p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{style.description || compact(style.instruction)}</p></div></div><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-500"><Sparkles className="h-3 w-3" />{style.kind === "discovered" ? `${style.samples.length} bài Sorsa` : "Tự tạo"}</div></button><div className="absolute right-3 top-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100"><button type="button" aria-label={`Xem ${style.name}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-700" onClick={() => setDetail({ type: "saved", style })}><Eye className="h-4 w-4" /></button><button type="button" aria-label={`Xoá ${style.name}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500" onClick={() => setStyleToDelete(style)}><Trash2 className="h-4 w-4" /></button></div></article>; })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center"><UserRound className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Chưa có phong cách riêng.</p></div>}</section>

    <section className="mt-10"><div className="mb-4"><h2 className="text-lg font-semibold">KOL dựng sẵn</h2><p className="mt-1 text-xs text-slate-500">Chọn nhanh một bộ đặc trưng văn phong đã được chuẩn bị.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredKOLs.map((author, index) => { const active = selectedKolId === author.id; return <article key={author.id} className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><button className="w-full text-left" onClick={() => chooseKOL(author.id)}><div className="flex items-start gap-3"><span className={`grid h-11 w-11 shrink-0 overflow-hidden rounded-xl text-xs font-bold text-white ${colors[index % colors.length]}`}>{author.profileImgUrl ? <img src={author.profileImgUrl} alt="" className="h-full w-full object-cover" /> : getKOLInitials(author.name)}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{author.name}</h3>{active && <Check className="h-4 w-4 text-emerald-600" />}</div><p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-500">{compact(author.style_vi || author.style || author.content)}</p></div></div></button><button type="button" aria-label={`Xem ${author.name}`} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-100 hover:bg-slate-100 hover:text-slate-700 md:opacity-0 md:group-hover:opacity-100" onClick={() => setDetail({ type: "kol", style: author })}><Eye className="h-4 w-4" /></button></article>; })}</div></section>
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
  </div></main>;
}
