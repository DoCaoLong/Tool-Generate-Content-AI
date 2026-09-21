"use client";

/* eslint-disable @next/next/no-img-element -- Nucleus S3 URLs load more reliably as native img than via the Next optimizer. */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarRange, ChevronDown, ExternalLink, FileText, Globe, LoaderCircle, Lock, MessageCircle, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useAppStore } from "@/lib/app-store";
import { apiRequest } from "@/lib/http";
import { applyNucleusOptions, findExistingStudioProject, nucleusFieldLabels, nucleusXUsername } from "@/lib/nucleus-brief";
import { fetchNucleusDetail, fetchNucleusList, nucleusCacheOptions, nucleusDetailParam, nucleusKeys, nucleusListNextPageParam, prefetchNucleusDetail } from "@/lib/nucleus-query";
import type { Project } from "@/lib/types";

const NUCLEUS_FALLBACK_SRC = "/nucleus-fallback.svg";
const platformLabels: Record<string, string> = {
  x: "X",
  twitter: "X",
  discord: "Discord",
  telegram: "Telegram",
  official_website: "Website",
  website: "Website",
};

function formatDate(value: string | null) {
  if (!value) return null;
  const iso = /Z|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRange(start: string | null, end: string | null) {
  const from = formatDate(start);
  const to = formatDate(end);
  if (from && to) return `${from} → ${to}`;
  if (from) return `Từ ${from}`;
  if (to) return `Đến ${to}`;
  return "Chưa có lịch";
}

function statusLabel(status: string) {
  if (status === "OPEN") return "Đang mở";
  if (status === "CLOSED") return "Đã đóng";
  return status;
}

function statusClass(status: string) {
  if (status === "OPEN") return "border-emerald-200/80 bg-emerald-50 text-emerald-700";
  if (status === "CLOSED") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200/80 bg-amber-50 text-amber-700";
}

function fieldLabel(key: string) {
  return nucleusFieldLabels[key] || key.replace(/_/g, " ");
}

function rewardPreview(fields: Record<string, string>) {
  return fields.contribution_reward || fields.reputation_reward || fields.reward_amount || fields.reward_type || fields.reward_type_1 || null;
}

function NucleusImg({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  return <NucleusImgInner key={src || "fallback"} src={src} alt={alt} className={className} />;
}

function NucleusImgInner({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <img src={!src || failed ? NUCLEUS_FALLBACK_SRC : src} alt={alt} referrerPolicy="no-referrer" className={className} onError={() => setFailed(true)} />;
}

function NucleusHtml({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const images = Array.from(root.querySelectorAll("img"));
    const onError = (event: Event) => {
      const image = event.currentTarget as HTMLImageElement;
      if (image.dataset.fallbackApplied) return;
      image.dataset.fallbackApplied = "true";
      image.src = NUCLEUS_FALLBACK_SRC;
    };
    for (const image of images) image.addEventListener("error", onError);
    return () => {
      for (const image of images) image.removeEventListener("error", onError);
    };
  }, [html]);
  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function NucleusPanel() {
  const pathname = usePathname();
  const slug = pathname.match(/^\/nucleus\/([^/]+)$/)?.[1] || null;
  return slug ? <NucleusDetail key={slug} slug={slug} /> : <NucleusList />;
}

function NucleusList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: nucleusKeys.list(),
    queryFn: ({ pageParam }) => fetchNucleusList(pageParam),
    initialPageParam: 0,
    getNextPageParam: nucleusListNextPageParam,
    ...nucleusCacheOptions,
  });
  const projects = query.data?.pages.flatMap((page) => page.projects) || [];
  const total = query.data?.pages[0]?.count ?? 0;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {query.isPending && <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải dự án Nucleus...</div>}
        {query.error && !projects.length && <p className="mt-6 text-sm text-red-600">{query.error.message}</p>}
        {query.isFetching && !query.isPending && <p className="mb-4 text-center text-xs text-slate-400">Đang cập nhật danh sách...</p>}
        {!query.isPending && !query.error && projects.length === 0 && <div className="py-20 text-center"><img src="/nucleus-logo.png" alt="" className="mx-auto h-10 w-10 rounded-xl opacity-30 grayscale" /><h3 className="mt-4 font-semibold">Chưa có dự án nào</h3><p className="mt-1 text-sm text-slate-500">Nucleus hiện không trả về chiến dịch công khai.</p></div>}

        {projects.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Chiến dịch InfoFi</h2>
              <span className="text-xs font-medium text-slate-500">{projects.length}/{total} dự án</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => {
                const reward = rewardPreview(project.additionalFields);
                const campaign = project.additionalFields.campaign_type;
                const detailParam = nucleusDetailParam(project);
                return (
                  <button key={project.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-md" onMouseEnter={() => prefetchNucleusDetail(queryClient, detailParam)} onFocus={() => prefetchNucleusDetail(queryClient, detailParam)} onClick={() => router.push(`/nucleus/${detailParam}`)}>
                    <div className="relative h-36 overflow-hidden bg-slate-100">
                      <NucleusImg src={project.bannerImageUrl} alt="" className="h-full w-full object-cover" />
                      <NucleusImg src={project.thumbnailUrl} alt="" className="absolute bottom-3 left-3 z-10 h-12 w-12 rounded-xl border-2 border-white object-cover shadow-sm" />
                      <span className={`absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(project.status)}`}>{statusLabel(project.status)}</span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">{project.name}</h4>
                        {project.isPrivate && <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><CalendarRange className="h-3.5 w-3.5 shrink-0" />{formatRange(project.startTime, project.endTime)}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {campaign && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-700">{campaign}</span>}
                        {reward && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{reward}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {query.hasNextPage && <div className="mt-6 text-center"><Button variant="outline" className="rounded-xl" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Tải thêm dự án</Button></div>}
          </section>
        )}
      </div>
    </main>
  );
}

function NucleusDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSelectedProjectId = useAppStore((state) => state.setSelectedProjectId);
  const setOptionsOpen = useAppStore((state) => state.setOptionsOpen);
  const query = useQuery({
    queryKey: nucleusKeys.detail(slug),
    queryFn: () => fetchNucleusDetail(slug),
    ...nucleusCacheOptions,
  });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiRequest<{ projects: Project[] }>("/api/projects"),
  });
  const project = query.data?.project;
  const [openDetails, setOpenDetails] = useState<number[]>([]);
  const [targetId, setTargetId] = useState("new");
  const studioProjects = projectsQuery.data?.projects;
  const existingProject = useMemo(() => (project && studioProjects ? findExistingStudioProject(studioProjects, project) : null), [project, studioProjects]);
  const selectedTarget = existingProject && targetId === "new" ? existingProject.id : targetId;
  const xUsername = project ? nucleusXUsername(project) : null;
  const firstDetailTitle = project?.details[0]?.title || "mục chi tiết đầu tiên";

  const applyBrief = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("Chưa tải được chi tiết chiến dịch.");
      const duplicate = studioProjects ? findExistingStudioProject(studioProjects, project) : null;
      if (selectedTarget === "new" && duplicate) {
        throw new Error(`Dự án “${duplicate.name}” đã tồn tại. Không thể tạo mới.`);
      }
      let projectId = selectedTarget;
      let currentOptions = studioProjects?.find((item) => item.id === selectedTarget)?.contentOptions;
      if (selectedTarget === "new") {
        const created = await apiRequest<{ project: Project }>("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            name: project.name.slice(0, 80),
            description: (project.description || `Chiến dịch Nucleus ${project.slug}`).slice(0, 240),
          }),
        });
        projectId = created.project.id;
        currentOptions = created.project.contentOptions;
      } else if (!currentOptions) {
        throw new Error("Không tìm thấy dự án đã chọn.");
      }
      const contentOptions = applyNucleusOptions(project, currentOptions);
      await apiRequest<{ contentOptions: Project["contentOptions"] }>(`/api/projects/${projectId}/options`, { method: "PATCH", body: JSON.stringify(contentOptions) });
      return { projectId, contentOptions };
    },
    onSuccess: async ({ projectId }) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(projectId);
      setOptionsOpen(true);
      router.push(`/projects/${projectId}/new`);
    },
  });

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <button className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900" onClick={() => router.push("/nucleus")}><ArrowLeft className="h-4 w-4" />Tất cả dự án Nucleus</button>
        {query.isPending && <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải chi tiết dự án...</div>}
        {query.isFetching && !query.isPending && <p className="mb-4 text-xs text-slate-400">Đang cập nhật chi tiết...</p>}
        {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}
        {project && (
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative h-48 bg-slate-100 sm:h-60">
              <NucleusImg src={project.bannerImageUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="px-5 pb-8 sm:px-8">
              <div className="flex flex-col gap-4 pt-3 sm:flex-row sm:items-start sm:gap-6 sm:pt-4">
                <div className="relative z-10 -mt-10 shrink-0 sm:-mt-14">
                  <NucleusImg
                    src={project.thumbnailUrl}
                    alt={project.name}
                    className="h-20 w-20 rounded-2xl border-4 border-white bg-white object-cover shadow-md ring-1 ring-slate-900/5 sm:h-24 sm:w-24 sm:rounded-3xl"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{project.name}</h2>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(project.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${project.status === "OPEN" ? "bg-emerald-500 animate-pulse" : project.status === "CLOSED" ? "bg-slate-400" : "bg-amber-500"}`} />
                      {statusLabel(project.status)}
                    </span>
                    {project.isPrivate && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        <Lock className="h-3 w-3" />
                        Riêng tư
                      </span>
                    )}
                  </div>
                  {project.description && <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">{project.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"><CalendarRange className="h-3 w-3" />{formatRange(project.startTime, project.endTime)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"><Users className="h-3 w-3" />{project.metrics.usersSignedUpCount.toLocaleString("vi-VN")} tham gia</span>
                    {Object.entries(project.additionalFields).map(([key, value]) => (
                      <span key={key} title={fieldLabel(key)} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">{value}</span>
                    ))}
                    {project.mindshare && <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-700">Mindshare</span>}
                    {project.reputationScore && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">Reputation</span>}
                    {project.referralScore && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">Referral</span>}
                    {project.onchainWeight !== null && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">On-chain {project.onchainWeight}%</span>}
                    {project.offchainWeight !== null && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">Off-chain {project.offchainWeight}%</span>}
                    {project.quests?.followX && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">Follow X</span>}
                    {project.quests?.joinDiscord && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">Join Discord</span>}
                    {project.quests?.joinTelegram && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">Join Telegram</span>}
                    {project.quests?.requiredWallets.map((wallet) => <span key={wallet} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">Ví {wallet.toUpperCase()}</span>)}
                    {project.categories.map((category) => <span key={category} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] capitalize text-slate-600">{category}</span>)}
                    {project.nftBonuses.map((bonus) => (
                      <span key={`${bonus.chain}-${bonus.collectionName}`} className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-800">
                        {bonus.collectionName || "NFT"}{bonus.chain ? ` · ${bonus.chain}` : ""}{bonus.multiplyValue ? ` · x${bonus.multiplyValue}` : ""}
                      </span>
                    ))}
                    {project.socials.map((social) => (
                      <a key={`${social.platform}-${social.url}`} href={social.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-cyan-300 hover:text-cyan-800">
                        {social.platform === "discord" || social.platform === "telegram" ? <MessageCircle className="h-3 w-3" /> : social.platform === "official_website" || social.platform === "website" ? <Globe className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                        {platformLabels[social.platform] || social.platform}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">Dự án viết bài
                    <NativeSelect wrapperClassName="mt-2 block w-full" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-400" value={selectedTarget} onChange={(event) => setTargetId(event.target.value)}>
                      {!existingProject && <option value="new">Tạo dự án mới</option>}
                      {(studioProjects || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </NativeSelect>
                  </label>
                  <Button className="h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800" disabled={applyBrief.isPending} onClick={() => applyBrief.mutate()}>
                    {applyBrief.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : selectedTarget === "new" ? <Plus className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                    {selectedTarget === "new" ? "Tạo dự án và dùng brief" : "Đưa brief vào dự án"}
                  </Button>
                </div>
                {existingProject && <p className="mt-3 text-sm text-amber-700">Dự án “{existingProject.name}” đã tồn tại. Không thể tạo mới, hãy dùng dự án hiện có.</p>}
                <p className="mt-3 text-xs leading-5 text-slate-500">Rule bắt buộc lấy “{firstDetailTitle}”. Từ khóa bắt buộc gắn {xUsername ? `@${xUsername}` : "username X"}.</p>
                {applyBrief.error && <p className="mt-2 text-sm text-red-600">{applyBrief.error.message}</p>}
              </div>

              {project.quests && project.quests.eligibilityQuests.length > 0 && (
                <section className="mt-6">
                  <h3 className="text-sm font-semibold">Quest tham gia</h3>
                  <div className="mt-3 space-y-2">
                    {project.quests.eligibilityQuests.map((quest) => (
                      <div key={quest.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <p className="text-sm leading-6 text-slate-700">{quest.description}</p>
                        {quest.buttonUrl && <a href={quest.buttonUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline">{quest.buttonText || "Mở liên kết"}<ExternalLink className="h-3 w-3" /></a>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {project.details.length > 0 && (
                <section className="mt-7">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Chi tiết chiến dịch</h3>
                    <button type="button" className="text-xs font-medium text-cyan-700 hover:underline" onClick={() => setOpenDetails(openDetails.length === project.details.length ? [] : project.details.map((_, index) => index))}>
                      {openDetails.length === project.details.length ? "Thu gọn tất cả" : "Mở tất cả"}
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    {project.details.map((section, index) => {
                      const open = openDetails.includes(index);
                      return (
                        <div key={`${section.title}-${index}`} className={index > 0 ? "border-t border-slate-200" : undefined}>
                          <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50" aria-expanded={open} onClick={() => setOpenDetails((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                            <span className="flex-1 text-sm font-medium text-slate-800">{section.title}</span>
                          </button>
                          {open && (
                            <NucleusHtml html={section.html} className="border-t border-slate-100 px-4 py-4 text-sm leading-6 text-slate-700 [&_a]:text-cyan-700 [&_a]:underline [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-xl [&_li]:my-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:font-semibold [&_table]:mb-3 [&_table]:w-full [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}

