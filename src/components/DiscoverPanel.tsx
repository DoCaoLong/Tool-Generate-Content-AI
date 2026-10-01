"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Heart, LoaderCircle, MessageCircle, Search, Sparkles, UserRoundSearch } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/app-store";
import { getKOLInitials } from "@/lib/kol-styles";
import { ApiError, apiRequest } from "@/lib/http";
import { getRadarCacheReadyServerSnapshot, getRadarCacheReadySnapshot, getRadarCacheServerSnapshot, getRadarCacheSnapshot, listRadarEntries, radarCacheFresh, readRadarEntry, saveRadarEntry, shareRadarRequest, subscribeRadarCache } from "@/lib/radar-cache";
import { buildRadarQuery, projectXHandle } from "@/lib/radar-query";
import { clearSorsaAccessCode, getSorsaAccessServerSnapshot, getSorsaAccessSnapshot, saveSorsaAccessCode, subscribeSorsaAccess } from "@/lib/sorsa-access";
import type { DiscoveredTweet, Project, SavedStyle } from "@/lib/types";

const schema = z.object({
  username: z.string().trim().transform((value) => value.replace(/^@/, "")).refine((value) => !value || /^[A-Za-z0-9_]{1,15}$/.test(value), "Username X chưa hợp lệ."),
  projectName: z.string().trim().max(100, "Tên dự án tối đa 100 ký tự."),
}).superRefine((data, context) => {
  if (!data.username && !data.projectName) {
    context.addIssue({ code: "custom", path: ["username"], message: "Hãy nhập username hoặc tên dự án." });
  }
});

type DiscoverValues = z.infer<typeof schema>;
type DiscoverResponse = { tweets: DiscoveredTweet[]; nextCursor: string | null; query: string; source: "author" | "mentions" | "topic" | "radar"; handle: string };
const MAX_SAMPLES = 20;

function shortNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function RadarAvatar({ tweet }: { tweet: DiscoveredTweet }) {
  const [failed, setFailed] = useState(false);
  if (!tweet.avatarUrl || failed) {
    return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{getKOLInitials(tweet.displayName || tweet.username)}</span>;
  }
  return <img src={tweet.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-full object-cover" onError={() => setFailed(true)} />; // eslint-disable-line @next/next/no-img-element
}

function RadarPhoto({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt="" referrerPolicy="no-referrer" className="w-full rounded-xl" onError={() => setFailed(true)} />; // eslint-disable-line @next/next/no-img-element
}

function RadarTweetCard({ tweet }: { tweet: DiscoveredTweet }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3"><RadarAvatar tweet={tweet} /><p className="min-w-0 text-sm font-semibold text-slate-900">{tweet.displayName} <span className="font-normal text-slate-400">@{tweet.username}</span></p></div>
      <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-slate-700">{tweet.text}</p>
      {tweet.images.length > 0 && <div className={`mt-3 grid gap-2 ${tweet.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>{tweet.images.map((src) => <RadarPhoto key={src} src={src} />)}</div>}
      <TweetStats tweet={tweet} />
    </article>
  );
}

function TweetStats({ tweet }: { tweet: DiscoveredTweet }) {
  const created = Number.isNaN(new Date(tweet.createdAt).getTime()) ? "" : new Date(tweet.createdAt).toLocaleDateString("vi-VN");
  return (
    <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
      {created ? <span>{created}</span> : null}
      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{shortNumber(tweet.likes)}</span>
      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{shortNumber(tweet.replies)}</span>
      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{shortNumber(tweet.views)}</span>
    </div>
  );
}

export default function DiscoverPanel() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setDiscoveredStyle = useAppStore((state) => state.setDiscoveredStyle);
  const setSelectedKolId = useAppStore((state) => state.setSelectedKolId);
  const setSelectedSavedStyleId = useAppStore((state) => state.setSelectedSavedStyleId);
  const [tweets, setTweets] = useState<DiscoveredTweet[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<(DiscoverValues & { source?: DiscoverResponse["source"]; handle?: string }) | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [pendingSearch, setPendingSearch] = useState<{ values: DiscoverValues; cursor?: string } | null>(null);
  const verifiedCode = useSyncExternalStore(subscribeSorsaAccess, getSorsaAccessSnapshot, getSorsaAccessServerSnapshot);
  const radarRaw = useSyncExternalStore(subscribeRadarCache, getRadarCacheSnapshot, getRadarCacheServerSnapshot);
  const radarCacheReady = useSyncExternalStore(subscribeRadarCache, getRadarCacheReadySnapshot, getRadarCacheReadyServerSnapshot) === "ready";
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => apiRequest<{ projects: Project[] }>("/api/projects") });
  const radarTargets = useMemo(() => (projectsQuery.data?.projects || []).flatMap((project) => {
    const handle = projectXHandle(project.contentOptions.keywords, project.contentOptions.documents);
    const query = buildRadarQuery(project.name, handle);
    return query ? [{ id: project.id, name: project.name, handle, query }] : [];
  }), [projectsQuery.data]);
  const storedRadar = useMemo(() => listRadarEntries(radarRaw), [radarRaw]);
  const radarKey = radarTargets.map((target) => `${target.id}:${target.query}`).join("\n");
  const radarPlan = useMemo(() => {
    if (!radarTargets.length) {
      return storedRadar.map((entry) => ({ id: entry.id, name: entry.name || "Dự án", handle: "", query: entry.query, entry, fresh: radarCacheFresh(entry) }));
    }
    return radarTargets.map((target) => {
      const entry = readRadarEntry(radarRaw, target.id);
      return { ...target, entry, fresh: radarCacheFresh(entry) && entry?.query === target.query };
    });
  }, [radarRaw, radarTargets, storedRadar]);
  const form = useForm<DiscoverValues>({ resolver: zodResolver(schema), defaultValues: { username: "", projectName: "" } });

  const radar = useQuery({
    queryKey: ["discover-radar", radarKey],
    enabled: radarCacheReady && radarTargets.length > 0 && radarPlan.some((item) => !item.fresh),
    staleTime: 0,
    retry: false,
    queryFn: () => shareRadarRequest(radarKey, async () => {
      const pending = radarTargets.filter((target) => {
        const entry = readRadarEntry(getRadarCacheSnapshot(), target.id);
        return !radarCacheFresh(entry) || entry?.query !== target.query;
      });
      let failure = "";
      for (const target of pending) {
        try {
          const data = await apiRequest<DiscoverResponse>("/api/discover", {
            method: "POST",
            body: JSON.stringify({ radar: true, projectName: target.name, username: target.handle }),
          });
          saveRadarEntry(target.id, { name: target.name, query: target.query, fetchedAt: Date.now(), tweets: data.tweets });
        } catch (error) {
          failure = error instanceof Error ? error.message : "Không tải được radar.";
        }
      }
      if (failure) throw new Error(failure);
      return [];
    }),
  });

  const search = useMutation({
    mutationFn: ({ values, cursor, accessCode: code }: { values: DiscoverValues; cursor?: string; accessCode: string }) => apiRequest<DiscoverResponse>("/api/discover", { method: "POST", body: JSON.stringify({ ...values, nextCursor: cursor, accessCode: code }) }),
    onSuccess: (data, variables) => {
      setTweets((current) => variables.cursor ? [...current, ...data.tweets.filter((tweet) => !current.some((item) => item.id === tweet.id))] : data.tweets);
      setNextCursor(data.nextCursor);
      if (!variables.cursor) setSelectedIds([]);
      setLastSearch({ ...variables.values, source: data.source, handle: data.handle });
      setPendingSearch(null);
    },
    onError: (error, variables) => {
      if (error instanceof ApiError && error.message === "Access code không đúng.") {
        clearSorsaAccessCode();
        setPendingSearch({ values: variables.values, cursor: variables.cursor });
        setAccessOpen(true);
      }
    },
  });

  const saveStyle = useMutation({
    mutationFn: (payload: { name: string; description: string; instruction: string; username: string; projectName: string | null; samples: Array<{ id: string; text: string }> }) => apiRequest<{ style: SavedStyle }>("/api/styles", { method: "POST", body: JSON.stringify({ kind: "discovered", category: "project", ...payload }) }),
    onSuccess: async ({ style }) => {
      await queryClient.invalidateQueries({ queryKey: ["styles"] });
      setSelectedKolId(null);
      setDiscoveredStyle(null);
      setSelectedSavedStyleId(style.id);
      router.push("/projects");
    },
  });

  const applySamples = () => {
    if (!lastSearch) return;
    const samples = tweets.filter((tweet) => selectedIds.includes(tweet.id)).slice(0, MAX_SAMPLES).map((tweet) => ({ id: tweet.id, text: tweet.text.slice(0, 4000) }));
    if (!samples.length) return;
    const handle = lastSearch.username || lastSearch.handle || samples[0]?.text.match(/@([A-Za-z0-9_]{1,15})/)?.[1] || tweets.find((tweet) => selectedIds.includes(tweet.id))?.username;
    if (!handle) return;
    const scopeName = lastSearch.projectName || (lastSearch.source === "mentions" ? "Mentions nhiều bình luận" : "Bài viết gần đây");
    const scopeInstruction = lastSearch.projectName
      ? `trong các bài nói về ${lastSearch.projectName}`
      : lastSearch.source === "mentions"
        ? "trong các bài mention có nhiều bình luận nhất"
        : "trong các bài gần đây";
    saveStyle.mutate({
      name: `@${handle} · ${scopeName}`,
      description: `${samples.length} bài mẫu công khai được tìm qua Sorsa.`,
      instruction: `Học cách viết của @${handle} ${scopeInstruction}: giọng điệu, nhịp câu, cách mở bài, cấu trúc, từ vựng và cách kết thúc. Không sao chép nguyên văn và không giả danh tác giả.`,
      username: handle,
      projectName: lastSearch.projectName || null,
      samples,
    });
  };

  const runSearch = (payload: { values: DiscoverValues; cursor?: string }) => {
    if (!verifiedCode) {
      setPendingSearch(payload);
      setAccessOpen(true);
      return;
    }
    search.mutate({ ...payload, accessCode: verifiedCode });
  };

  const verifyAccess = useMutation({
    mutationFn: (code: string) => apiRequest<{ ok: true }>("/api/auth/access-code", { method: "POST", body: JSON.stringify({ accessCode: code }) }),
    onSuccess: (_, code) => {
      saveSorsaAccessCode(code);
      setAccessOpen(false);
      setAccessCode("");
      const pending = pendingSearch;
      setPendingSearch(null);
      if (pending) search.mutate({ ...pending, accessCode: code });
    },
  });

  const radarUpdatedLabel = radarPlan.length && radarPlan.every((item) => item.fresh)
    ? new Date(Math.max(...radarPlan.flatMap((item) => item.entry ? [item.entry.fetchedAt] : [0]))).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "";
  const radarHint = projectsQuery.isPending
    ? "Đang tải danh sách dự án."
    : !projectsQuery.data?.projects.length
      ? "Chưa có dự án trong Dự án của bạn."
      : radarTargets.length === 0
        ? "Các dự án chưa có tên để tìm radar."
        : radarUpdatedLabel
        ? `Bài mới từ ${radarTargets.length} dự án. Đã cập nhật lúc ${radarUpdatedLabel}.`
        : `Bài mới từ ${radarTargets.length} dự án. Làm mới sau 30 phút khi mở lại tab.`;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><UserRoundSearch className="h-6 w-6" /></span>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Sorsa · X discovery</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Tìm bài mẫu theo tác giả hoặc dự án</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Nhập username tác giả và/hoặc @mention của dự án. Tìm theo dự án ưu tiên bài mention có nhiều bình luận nhất.</p></div>
          </div>

          <form className="mt-7 grid gap-4 sm:grid-cols-[0.8fr_1.2fr_auto]" onSubmit={form.handleSubmit((values) => runSearch({ values }))}>
            <label className="text-sm font-medium text-slate-700">Username tác giả<div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span><Input className="h-11 rounded-xl pl-7" placeholder="elonmusk" {...form.register("username")} /></div></label>
            <label className="text-sm font-medium text-slate-700">@mention dự án<Input className="mt-2 h-11 rounded-xl" placeholder="@PlayOnMint" {...form.register("projectName")} /></label>
            <Button className="mt-auto h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" disabled={search.isPending}><Search className="mr-2 h-4 w-4" />{search.isPending && !nextCursor ? "Đang tìm..." : "Tìm bài viết"}</Button>
          </form>
          {(form.formState.errors.username || form.formState.errors.projectName || search.error) && <p className="mt-3 text-sm text-red-600">{search.error?.message || form.formState.errors.username?.message || form.formState.errors.projectName?.message}</p>}
        </section>

        <section className="mt-7">
          <div className="mb-4">
            <h3 className="font-semibold">Radar</h3>
            <p className="mt-1 text-xs text-slate-500">{radarHint}</p>
          </div>
          {radar.error && <p className="text-sm text-red-600">{radar.error.message}</p>}
          {radarPlan.map((item) => <div key={item.id} className="mt-6"><h4 className="text-sm font-semibold text-slate-900">{item.name}</h4>{item.entry && item.entry.tweets.length > 0 ? <div className="mt-3 grid gap-3 md:grid-cols-2">{item.entry.tweets.map((tweet) => <RadarTweetCard key={`${item.id}-${tweet.id}`} tweet={tweet} />)}</div> : item.fresh ? <p className="mt-2 text-sm text-slate-500">Chưa có bài mới.</p> : radar.isFetching ? <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải...</p> : null}</div>)}
        </section>

        {lastSearch && !search.isPending && tweets.length === 0 && <div className="py-20 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-4 font-semibold">Chưa tìm thấy bài phù hợp</h3><p className="mt-1 text-sm text-slate-500">Thử username tác giả hoặc @mention dự án.</p></div>}

        {tweets.length > 0 && <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{lastSearch?.source === "mentions" ? `Mentions nhiều bình luận nhất về @${lastSearch.handle || lastSearch.projectName}` : lastSearch?.username ? `Bài viết từ @${lastSearch.username}` : `Bài viết về ${lastSearch?.projectName}`}</h3><p className="mt-1 text-xs text-slate-500">Đã tìm thấy {tweets.length} bài · Chọn tối đa {MAX_SAMPLES} bài mẫu</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="rounded-xl" onClick={() => { const visibleIds = tweets.map((tweet) => tweet.id); const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id)); setSelectedIds(allSelected ? [] : visibleIds.slice(0, MAX_SAMPLES)); }}>{tweets.length > 0 && tweets.every((tweet) => selectedIds.includes(tweet.id)) ? "Bỏ chọn tất cả" : "Chọn tất cả bài hiện có"}</Button><Button className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" disabled={!selectedIds.length || saveStyle.isPending} onClick={applySamples}><Sparkles className="mr-2 h-4 w-4" />{saveStyle.isPending ? "Đang lưu..." : `Lưu & dùng ${Math.min(selectedIds.length, MAX_SAMPLES)} bài`}</Button></div></div>
          {saveStyle.error && <p className="mb-4 text-sm text-red-600">{saveStyle.error.message}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {tweets.map((tweet) => {
              const selected = selectedIds.includes(tweet.id);
              return <button key={tweet.id} className={`relative rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-emerald-400 bg-emerald-50/70 ring-1 ring-emerald-200" : "border-slate-200 bg-white"}`} onClick={() => setSelectedIds((ids) => selected ? ids.filter((id) => id !== tweet.id) : ids.length < MAX_SAMPLES ? [...ids, tweet.id] : ids)}>
                <span className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
                <div className="pr-8"><p className="text-sm font-semibold text-slate-900">{tweet.displayName} <span className="font-normal text-slate-400">@{tweet.username}</span></p><p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-slate-700">{tweet.text}</p></div>
                <TweetStats tweet={tweet} />
              </button>;
            })}
          </div>
          {nextCursor && <div className="mt-6 text-center"><Button variant="outline" className="rounded-xl" disabled={search.isPending} onClick={() => lastSearch && runSearch({ values: lastSearch, cursor: nextCursor })}>{search.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Tải thêm bài viết</Button></div>}
        </section>}
      </div>
      <Dialog open={accessOpen} onOpenChange={(open) => { if (!verifyAccess.isPending) { setAccessOpen(open); if (!open) { setAccessCode(""); verifyAccess.reset(); } } }}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Access code</DialogTitle>
            <DialogDescription>Nhập mã truy cập để tìm bài mẫu trên X.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); verifyAccess.mutate(accessCode.trim()); }}>
            <label className="block text-sm font-medium">Mã truy cập
              <Input className="mt-2 h-12 rounded-xl" autoFocus type="password" placeholder="Nhập access code" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} />
            </label>
            {verifyAccess.error && <p className="text-sm text-red-600">{verifyAccess.error.message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" disabled={verifyAccess.isPending} onClick={() => setAccessOpen(false)}>Huỷ</Button>
              <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={verifyAccess.isPending || !accessCode.trim()}>{verifyAccess.isPending ? "Đang kiểm tra..." : pendingSearch ? "Tìm bài viết" : "Xác nhận"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
