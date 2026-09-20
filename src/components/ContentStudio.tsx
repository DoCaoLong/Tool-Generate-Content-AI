"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Compass, Copy, FileText, Folder, Menu, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pencil, Plus, Send, Sparkles, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import { z } from "zod";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import AuthScreen from "@/components/AuthScreen";
import DiscoverPanel from "@/components/DiscoverPanel";
import NucleusPanel from "@/components/NucleusPanel";
import HelpPage from "@/components/HelpPage";
import KOLStylePicker from "@/components/KOLStylePicker";
import ProfileMenu from "@/components/ProfileMenu";
import ProfilePage from "@/components/ProfilePage";
import SettingsPage from "@/components/SettingsPage";
import StyleLibraryPage from "@/components/StyleLibraryPage";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { generateWithAnthropic, generateWithDeepSeek, generateWithGemini, generateWithOpenAI, generateWithOpenRouter, generateWithXAI } from "@/lib/api-client";
import { useAppStore } from "@/lib/app-store";
import { apiRequest, ApiError } from "@/lib/http";
import { buildContentPrompt } from "@/lib/prompt-builder";
import { getKOLStyle } from "@/lib/kol-styles";
import { providerLabels, providerModels, providers } from "@/lib/providers";
import { prefetchNucleusList } from "@/lib/nucleus-query";
import type { Generation, Project, ProjectContentOptions, Provider, SavedStyle, UserProfile } from "@/lib/types";

const formSchema = z.object({
  mode: z.enum(["new", "rewrite"]),
  kolStyle: z.object({ id: z.string(), name: z.string(), instruction: z.string() }).nullable(),
  discoveredStyle: z.object({ username: z.string(), projectName: z.string(), samples: z.array(z.object({ id: z.string(), text: z.string() })) }).nullable(),
  libraryStyle: z.object({ id: z.string(), name: z.string(), instruction: z.string(), samples: z.array(z.object({ id: z.string(), text: z.string() })) }).nullable(),
  topic: z.string().trim().min(1, "Hãy nhập chủ đề hoặc brief."),
  sourceText: z.string(),
  rules: z.string(),
  documents: z.string(),
  keywords: z.string(),
  language: z.string(),
  tone: z.string(),
  length: z.string(),
  customInstructions: z.string(),
  provider: z.enum(["openai", "gemini", "deepseek", "anthropic", "xai", "openrouter"]),
  model: z.string().min(1),
  apiKey: z.string().min(1, "Bạn cần nhập API key."),
}).superRefine((values, context) => {
  if (values.mode === "rewrite" && !values.sourceText.trim()) {
    context.addIssue({ code: "custom", path: ["sourceText"], message: "Chế độ viết lại cần có nội dung nguồn." });
  }
});

type ComposerValues = z.infer<typeof formSchema>;

const projectOptionFieldNames: Array<keyof ProjectContentOptions> = ["keywords", "rules", "documents", "language", "tone", "length", "customInstructions"];
const quickSelectClass = "h-9 rounded-xl border border-slate-200 bg-slate-50 pl-2 text-xs text-slate-700 outline-none focus:border-emerald-400";
const toneOptions = [
  ["natural", "Tự nhiên"],
  ["professional", "Chuyên nghiệp"],
  ["casual", "Gần gũi"],
  ["educational", "Giáo dục"],
  ["storytelling", "Kể chuyện"],
  ["persuasive", "Thuyết phục"],
  ["inspirational", "Truyền cảm hứng"],
  ["witty", "Hóm hỉnh"],
  ["authoritative", "Uy tín chuyên gia"],
  ["empathetic", "Đồng cảm"],
  ["bold", "Táo bạo"],
  ["analytical", "Phân tích"],
  ["concise", "Ngắn gọn"],
  ["luxurious", "Sang trọng"],
  ["provocative", "Gợi tranh luận"],
] as const;

function projectOptionsFromForm(values: ComposerValues): ProjectContentOptions {
  return {
    keywords: values.keywords,
    rules: values.rules,
    documents: values.documents,
    language: values.language,
    tone: values.tone,
    length: values.length,
    customInstructions: values.customInstructions,
  };
}

export default function ContentStudio() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiRequest<{ user: UserProfile }>("/api/auth/me") });

  if (me.isLoading) return <div className="grid min-h-screen place-items-center bg-[#f7f7f4]"><Sparkles className="h-7 w-7 animate-pulse text-emerald-600" /></div>;
  if (me.error instanceof ApiError && me.error.status === 401) return <AuthScreen />;
  if (!me.data) return <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-red-600">{me.error?.message || "Không thể kết nối tới backend."}</div>;

  return <Workspace user={me.data.user} />;
}

function Workspace({ user }: { user: UserProfile }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const storedProjectId = useAppStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useAppStore((state) => state.setSelectedProjectId);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);
  const optionsOpen = useAppStore((state) => state.optionsOpen);
  const setOptionsOpen = useAppStore((state) => state.setOptionsOpen);
  const composerMode = useAppStore((state) => state.composerMode);
  const setComposerMode = useAppStore((state) => state.setComposerMode);
  const selectedKolId = useAppStore((state) => state.selectedKolId);
  const discoveredStyle = useAppStore((state) => state.discoveredStyle);
  const selectedSavedStyleId = useAppStore((state) => state.selectedSavedStyleId);
  const setSelectedSavedStyleId = useAppStore((state) => state.setSelectedSavedStyleId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => apiRequest<{ projects: Project[] }>("/api/projects") });
  const stylesQuery = useQuery({ queryKey: ["styles"], queryFn: () => apiRequest<{ styles: SavedStyle[] }>("/api/styles") });
  const projects = useMemo(() => projectsQuery.data?.projects || [], [projectsQuery.data?.projects]);
  const savedStyles = useMemo(() => stylesQuery.data?.styles || [], [stylesQuery.data?.styles]);
  const projectRoute = pathname.match(/^\/projects\/([^/]+)(?:\/(new|rewrite))?$/);
  const routeProjectId = projectRoute?.[1] || null;
  const routeMode = projectRoute?.[2] as "new" | "rewrite" | undefined;
  const selectedProjectId = routeProjectId || storedProjectId;
  const activeProject = projects.find((project) => project.id === selectedProjectId) || null;
  const selectedSavedStyle = savedStyles.find((style) => style.id === selectedSavedStyleId) || null;
  const isProjectRoute = pathname.startsWith("/projects");
  const isDiscoverRoute = pathname === "/discover";
  const isNucleusRoute = pathname === "/nucleus" || pathname.startsWith("/nucleus/");
  const isStylesRoute = pathname === "/styles";
  const isSettingsRoute = pathname === "/settings";
  const isProfileRoute = pathname === "/profile";
  const isHelpRoute = pathname === "/help";

  useEffect(() => {
    if (!isProjectRoute) return;
    if (projects.length && !activeProject) {
      setSelectedProjectId(projects[0].id);
      router.replace(`/projects/${projects[0].id}/${composerMode}`);
    }
    if (!projects.length && selectedProjectId) setSelectedProjectId(null);
  }, [activeProject, composerMode, isProjectRoute, projects, router, selectedProjectId, setSelectedProjectId]);

  useEffect(() => {
    if (!isProjectRoute || !activeProject) return;
    if (routeMode && routeMode !== composerMode) setComposerMode(routeMode);
    if (!routeMode) router.replace(`/projects/${activeProject.id}/${composerMode}`);
  }, [activeProject, composerMode, isProjectRoute, routeMode, router, setComposerMode]);

  useEffect(() => {
    if (selectedSavedStyleId && stylesQuery.data && !selectedSavedStyle) setSelectedSavedStyleId(null);
  }, [selectedSavedStyle, selectedSavedStyleId, setSelectedSavedStyleId, stylesQuery.data]);

  const logout = useMutation({
    mutationFn: () => apiRequest<{ ok: true }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => { queryClient.clear(); window.location.reload(); },
  });

  const removeProject = useMutation({
    mutationFn: (id: string) => apiRequest<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => { if (selectedProjectId === id) { setSelectedProjectId(null); router.push("/projects"); } setProjectToDelete(null); queryClient.invalidateQueries({ queryKey: ["projects"] }); },
  });

  return (
    <div className="h-screen overflow-hidden bg-[#f7f7f4] text-slate-900">
      {sidebarOpen && <button aria-label="Đóng danh sách dự án" className="fixed inset-0 z-30 bg-black/35 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-visible bg-[#171717] text-white transition-[width,transform] duration-200 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "w-[280px] md:w-[72px]" : "w-[280px]"}`}>
        <div className={`flex h-16 items-center ${sidebarCollapsed ? "justify-center px-2 md:px-0" : "justify-between px-4"}`}>
          <div className="flex items-center gap-2.5 font-semibold"><Image src="/icon.png" alt="Content Studio" width={32} height={32} priority className="h-8 w-8 rounded-lg object-cover" /><span className={sidebarCollapsed ? "md:hidden" : undefined}>Content Studio</span></div>
          <button className={`rounded-lg p-2 text-slate-400 hover:bg-white/10 md:hidden ${sidebarCollapsed ? "hidden" : ""}`} onClick={() => setSidebarOpen(false)}><ChevronLeft className="h-5 w-5" /></button>
        </div>
        <div className={`pb-4 ${sidebarCollapsed ? "px-3 md:px-2" : "px-3"}`}>
          <div className="space-y-1">
            <button type="button" aria-label="Dự án mới" title={sidebarCollapsed ? "Dự án mới" : undefined} className={`flex h-11 w-full items-center rounded-xl text-sm transition-colors ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3 text-left"} text-slate-300 hover:bg-white/5 hover:text-white`} onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 shrink-0" /><span className={`flex-1 ${sidebarCollapsed ? "md:hidden" : ""}`}>Dự án mới</span></button>
            <KOLStylePicker selectedId={selectedKolId} customStyle={discoveredStyle} selectedSavedStyle={selectedSavedStyle} collapsed={sidebarCollapsed} />
            <button title={sidebarCollapsed ? "Khám phá" : undefined} className={`flex h-11 w-full items-center rounded-xl text-sm transition-colors ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3 text-left"} ${isDiscoverRoute ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`} onClick={() => { router.push("/discover"); setSidebarOpen(false); }}><Compass className="h-4 w-4 shrink-0 text-violet-400" /><span className={`flex-1 ${sidebarCollapsed ? "md:hidden" : ""}`}>Khám phá</span>{!sidebarCollapsed && <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">Sorsa</span>}</button>
            <button title={sidebarCollapsed ? "Nucleus" : undefined} className={`flex h-11 w-full items-center rounded-xl text-sm transition-colors ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3 text-left"} ${isNucleusRoute ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`} onMouseEnter={() => prefetchNucleusList(queryClient)} onFocus={() => prefetchNucleusList(queryClient)} onClick={() => { router.push("/nucleus"); setSidebarOpen(false); }}><Image src="/nucleus-logo.png" alt="Nucleus" width={18} height={18} className="h-4 w-4 shrink-0 rounded-sm object-contain" /><span className={`flex-1 ${sidebarCollapsed ? "md:hidden" : ""}`}>Nucleus</span>{!sidebarCollapsed && <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">InfoFi</span>}</button>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto ${sidebarCollapsed ? "px-3 md:px-2" : "px-3"}`}>
          <p className={`px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ${sidebarCollapsed ? "md:hidden" : ""}`}>Dự án của bạn</p>
          <div className="space-y-1">
            {projects.map((project) => (
              <div key={project.id} className={`group flex h-11 items-center rounded-xl ${selectedProjectId === project.id ? "bg-white/10" : "hover:bg-white/5"}`}>
                <button title={sidebarCollapsed ? project.name : undefined} className={`flex h-full min-w-0 flex-1 items-center text-left ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"}`} onClick={() => { setSelectedProjectId(project.id); router.push(`/projects/${project.id}/${composerMode}`); setSidebarOpen(false); }}>
                  <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className={`block truncate text-sm ${sidebarCollapsed ? "md:hidden" : ""}`}>{project.name}</span>
                </button>
                <div className={`mr-2 flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100 ${sidebarCollapsed ? "md:hidden" : ""}`}>
                  <button aria-label={`Đổi tên ${project.name}`} className="rounded-md p-1.5 text-slate-500 hover:bg-white/10 hover:text-white" onClick={() => setEditingProject(project)}><Pencil className="h-3.5 w-3.5" /></button>
                  <button aria-label={`Xoá ${project.name}`} className="rounded-md p-1.5 text-slate-500 hover:bg-white/10 hover:text-red-300" onClick={() => setProjectToDelete(project)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ProfileMenu user={user} onLogout={() => logout.mutate()} collapsed={sidebarCollapsed} />
      </aside>

      <div className={`flex h-full flex-col transition-[margin] duration-200 ${sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[280px]"} ${isProjectRoute && optionsOpen ? "xl:mr-[340px]" : ""}`}>
        <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-[#f7f7f4]/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3"><button className="rounded-lg p-2 hover:bg-slate-200 md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button><button className="hidden rounded-lg p-2 hover:bg-slate-200 md:grid" aria-label={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"} title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>{sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button><div className="hidden min-w-0 sm:block"><h1 className="max-w-52 truncate text-sm font-semibold">{isProjectRoute ? activeProject?.name || "Dự án" : isDiscoverRoute ? "Khám phá phong cách" : isNucleusRoute ? "Nucleus" : isStylesRoute ? "Thư viện phong cách" : isSettingsRoute ? "Cài đặt" : isProfileRoute ? "Hồ sơ" : "Trợ giúp"}</h1>{isProjectRoute && activeProject?.description && <p className="hidden max-w-44 truncate text-xs text-slate-500 lg:block">{activeProject.description}</p>}</div></div>
          {isProjectRoute && <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/80 bg-slate-200/60 p-1 shadow-xs" role="tablist" aria-label="Chế độ tạo nội dung">
            <button type="button" role="tab" aria-selected={composerMode === "new"} className={`min-w-[94px] rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${composerMode === "new" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`} onClick={() => { setComposerMode("new"); if (activeProject) router.push(`/projects/${activeProject.id}/new`); }}>Viết mới</button>
            <button type="button" role="tab" aria-selected={composerMode === "rewrite"} className={`min-w-[94px] rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${composerMode === "rewrite" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`} onClick={() => { setComposerMode("rewrite"); if (activeProject) router.push(`/projects/${activeProject.id}/rewrite`); }}>Viết lại</button>
          </div>}
          {isProjectRoute ? <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900" aria-label="Bật tắt bảng tuỳ chọn" onClick={() => setOptionsOpen(!optionsOpen)}>{optionsOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}</button> : <span />}
        </header>
        {isDiscoverRoute ? <DiscoverPanel /> : isNucleusRoute ? <NucleusPanel /> : isStylesRoute ? <StyleLibraryPage /> : isSettingsRoute ? <SettingsPage /> : isProfileRoute ? <ProfilePage user={user} /> : isHelpRoute ? <HelpPage /> : activeProject ? <ComposerWorkspace key={activeProject.id} project={activeProject} optionsOpen={optionsOpen} savedStyle={selectedSavedStyle} /> : <EmptyProjects onCreate={() => setCreateOpen(true)} />}
      </div>
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RenameProjectDialog project={editingProject} onClose={() => setEditingProject(null)} />
      <ConfirmDialog
        open={Boolean(projectToDelete)}
        title="Xoá dự án"
        description={`Xoá dự án “${projectToDelete?.name}” và toàn bộ lịch sử? Hành động này không hoàn tác.`}
        confirmLabel="Xoá"
        destructive
        loading={removeProject.isPending}
        onConfirm={() => { if (projectToDelete) removeProject.mutate(projectToDelete.id); }}
        onOpenChange={(open) => { if (!open && !removeProject.isPending) setProjectToDelete(null); }}
      />
    </div>
  );
}

function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return <div className="grid flex-1 place-items-center px-6"><div className="max-w-md text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><FileText className="h-6 w-6" /></div><h2 className="mt-5 text-2xl font-semibold tracking-tight">Tạo dự án đầu tiên</h2><p className="mt-2 text-sm leading-6 text-slate-500">Mỗi dự án giữ riêng brief, các tuỳ chọn và toàn bộ nội dung bạn đã tạo.</p><Button className="mt-6 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Tạo dự án</Button></div></div>;
}

function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setSelectedProjectId = useAppStore((state) => state.setSelectedProjectId);
  const form = useForm<{ name: string; description: string }>({ defaultValues: { name: "", description: "" } });
  const mutation = useMutation({
    mutationFn: (values: { name: string; description: string }) => apiRequest<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async ({ project }) => { await queryClient.invalidateQueries({ queryKey: ["projects"] }); setSelectedProjectId(project.id); router.push(`/projects/${project.id}/new`); form.reset(); onOpenChange(false); },
  });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Tạo dự án mới</DialogTitle><DialogDescription>Dự án giúp bạn gom nội dung và lịch sử theo từng chủ đề.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}><label className="block text-sm font-medium">Tên dự án<Input autoFocus className="mt-2 rounded-xl" placeholder="Ví dụ: Chuỗi bài ra mắt sản phẩm" {...form.register("name", { required: true, maxLength: 80 })} /></label><label className="block text-sm font-medium">Mô tả <span className="font-normal text-slate-400">(không bắt buộc)</span><Textarea className="mt-2 min-h-24 rounded-xl" placeholder="Mục tiêu hoặc bối cảnh ngắn..." {...form.register("description", { maxLength: 240 })} /></label>{mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button><Button className="bg-slate-950 text-white hover:bg-slate-800" disabled={mutation.isPending}>{mutation.isPending ? "Đang tạo..." : "Tạo dự án"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function RenameProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<{ name: string }>({ defaultValues: { name: "" } });
  useEffect(() => {
    if (project) form.reset({ name: project.name });
  }, [form, project]);
  const mutation = useMutation({
    mutationFn: ({ id, name, description }: { id: string; name: string; description: string }) => apiRequest<{ project: Project }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name, description }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["projects"] }); onClose(); },
  });
  const close = () => { if (!mutation.isPending) { mutation.reset(); onClose(); } };
  return <Dialog open={Boolean(project)} onOpenChange={(open) => { if (!open) close(); }}><DialogContent className="rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Đổi tên dự án</DialogTitle><DialogDescription>Tên mới sẽ được cập nhật trong danh sách dự án và thanh tiêu đề.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit(({ name }) => project && mutation.mutate({ id: project.id, name: name.trim(), description: project.description }))}><label className="block text-sm font-medium">Tên dự án<Input autoFocus className="mt-2 rounded-xl" {...form.register("name", { required: "Hãy nhập tên dự án.", maxLength: { value: 80, message: "Tên dự án tối đa 80 ký tự." }, validate: (value) => Boolean(value.trim()) || "Hãy nhập tên dự án." })} /></label>{(form.formState.errors.name || mutation.error) && <p className="text-sm text-red-600">{mutation.error?.message || form.formState.errors.name?.message}</p>}<DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Huỷ</Button><Button className="bg-slate-950 text-white hover:bg-slate-800" disabled={mutation.isPending}>{mutation.isPending ? "Đang lưu..." : "Lưu tên mới"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ComposerWorkspace({ project, optionsOpen, savedStyle }: { project: Project; optionsOpen: boolean; savedStyle: SavedStyle | null }) {
  const queryClient = useQueryClient();
  const savedProvider = useAppStore((state) => state.provider);
  const savedModel = useAppStore((state) => state.model);
  const savedApiKey = useAppStore((state) => state.apiKey);
  const composerMode = useAppStore((state) => state.composerMode);
  const selectedKolId = useAppStore((state) => state.selectedKolId);
  const discoveredStyle = useAppStore((state) => state.discoveredStyle);
  const setProviderConfig = useAppStore((state) => state.setProviderConfig);
  const selectedKOL = getKOLStyle(selectedKolId);
  const [optionsSaveState, setOptionsSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const form = useForm<ComposerValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { mode: composerMode, kolStyle: selectedKOL ? { id: selectedKOL.id, name: selectedKOL.name, instruction: selectedKOL.style || selectedKOL.content } : null, discoveredStyle, libraryStyle: savedStyle ? { id: savedStyle.id, name: savedStyle.name, instruction: savedStyle.instruction, samples: savedStyle.samples } : null, topic: "", sourceText: "", ...project.contentOptions, provider: savedProvider, model: savedModel, apiKey: savedApiKey },
  });
  useEffect(() => {
    form.setValue("mode", composerMode, { shouldValidate: true });
    if (composerMode === "new") form.setValue("sourceText", "");
  }, [composerMode, form]);
  useEffect(() => {
    form.setValue("kolStyle", selectedKOL ? { id: selectedKOL.id, name: selectedKOL.name, instruction: selectedKOL.style || selectedKOL.content } : null);
  }, [form, selectedKOL]);
  useEffect(() => {
    form.setValue("discoveredStyle", discoveredStyle);
  }, [discoveredStyle, form]);
  useEffect(() => {
    form.setValue("libraryStyle", savedStyle ? { id: savedStyle.id, name: savedStyle.name, instruction: savedStyle.instruction, samples: savedStyle.samples } : null);
  }, [form, savedStyle]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let hasPendingChanges = false;
    let active = true;

    const persistOptions = async (showStatus: boolean) => {
      const contentOptions = projectOptionsFromForm(form.getValues());
      if (showStatus && active) setOptionsSaveState("saving");
      try {
        await apiRequest<{ contentOptions: ProjectContentOptions }>(`/api/projects/${project.id}/options`, { method: "PATCH", body: JSON.stringify(contentOptions) });
        queryClient.setQueryData<{ projects: Project[] }>(["projects"], (current) => current ? { projects: current.projects.map((item) => item.id === project.id ? { ...item, contentOptions } : item) } : current);
        if (showStatus && active) setOptionsSaveState("saved");
      } catch {
        if (showStatus && active) setOptionsSaveState("error");
      }
    };

    const unsubscribe = form.subscribe({
      name: projectOptionFieldNames,
      formState: { values: true },
      callback: () => {
      hasPendingChanges = true;
      setOptionsSaveState("saving");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        hasPendingChanges = false;
        void persistOptions(true);
      }, 600);
      },
    });

    return () => {
      active = false;
      unsubscribe();
      if (timer) clearTimeout(timer);
      if (hasPendingChanges) void persistOptions(false);
    };
  }, [form, project.id, queryClient]);
  const history = useQuery({
    queryKey: ["generations", project.id],
    queryFn: () => apiRequest<{ generations: Generation[] }>(`/api/projects/${project.id}/generations`),
  });
  const items = history.data?.generations || [];
  const activeProvider = useWatch({ control: form.control, name: "provider" });
  const activeKeywords = useWatch({ control: form.control, name: "keywords" });
  const keywordChips = useMemo(() => Array.from(new Set(activeKeywords.split(/[\n,]/).map((keyword) => keyword.trim()).filter(Boolean))), [activeKeywords]);

  const generate = useMutation({
    mutationFn: async (values: ComposerValues) => {
      const { apiKey, ...input } = values;
      setProviderConfig(values.provider, values.model, apiKey);
      const prompt = buildContentPrompt(input);
      const generateOptions = { apiKey, model: values.model, prompt };
      const result = values.provider === "gemini"
        ? await generateWithGemini(generateOptions)
        : values.provider === "deepseek"
          ? await generateWithDeepSeek(generateOptions)
          : values.provider === "anthropic"
            ? await generateWithAnthropic(generateOptions)
            : values.provider === "xai"
              ? await generateWithXAI(generateOptions)
              : values.provider === "openrouter"
                ? await generateWithOpenRouter(generateOptions)
                : await generateWithOpenAI(generateOptions);
      if (!result.success || !result.content) throw new Error(result.error || "Không thể tạo nội dung.");
      return apiRequest<{ generation: Generation }>(`/api/projects/${project.id}/generations`, { method: "POST", body: JSON.stringify({ input, output: result.content }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations", project.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      form.reset({ ...form.getValues(), topic: "", sourceText: "" });
    },
  });

  return <FormProvider {...form}><form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit((values) => generate.mutate(values))}>
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl space-y-8">
      {!history.isLoading && items.length === 0 && <div className="py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><Sparkles className="h-6 w-6 text-emerald-600" /></div><h2 className="mt-5 text-2xl font-semibold tracking-tight">Bạn muốn viết gì hôm nay?</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Nhập brief bên dưới. Nội dung tạo ra sẽ tự động được lưu vào lịch sử của dự án này.</p></div>}
      {items.map((item) => <HistoryTurn key={item.id} item={item} />)}
      {generate.isPending && <div className="flex items-center gap-3 text-sm text-slate-500"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Đang tạo nội dung...</div>}
    </div></div>
    <div className="shrink-0 px-4 pb-5 sm:px-8"><div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        {(selectedKOL || discoveredStyle || savedStyle || keywordChips.length > 0) && <div className="mx-2 mb-1 flex flex-wrap items-center gap-1.5">
          {(selectedKOL || discoveredStyle || savedStyle) && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"><UserRound className="h-3 w-3" />Style: {savedStyle?.name || selectedKOL?.name || `@${discoveredStyle?.username}`}</span>}
          {keywordChips.slice(0, 6).map((keyword) => <span key={keyword} className="inline-flex max-w-48 items-center truncate rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700" title={keyword}>Từ khóa: {keyword}</span>)}
          {keywordChips.length > 6 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">+{keywordChips.length - 6}</span>}
        </div>}
        <Textarea className="min-h-[76px] resize-none border-0 bg-transparent p-2 text-[15px] shadow-none focus-visible:ring-0" placeholder={composerMode === "rewrite" ? "Mô tả cách bạn muốn viết lại nội dung..." : "Nhập chủ đề, ý tưởng hoặc brief bạn muốn viết..."} {...form.register("topic")} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-2">
          <NativeSelect aria-label="Provider" className={`${quickSelectClass} font-medium`} {...form.register("provider", { onChange: (event) => { const provider = event.target.value as Provider; const model = providerModels[provider][0]; form.setValue("model", model); setProviderConfig(provider, model, form.getValues("apiKey")); } })}>{providers.map((item) => <option key={item} value={item}>{providerLabels[item]}</option>)}</NativeSelect>
          <NativeSelect aria-label="Model" className={`${quickSelectClass} max-w-52`} {...form.register("model", { onChange: (event) => setProviderConfig(form.getValues("provider"), event.target.value, form.getValues("apiKey")) })}>{providerModels[activeProvider].map((item) => <option key={item} value={item}>{item}</option>)}</NativeSelect>
          <NativeSelect aria-label="Ngôn ngữ" className={quickSelectClass} {...form.register("language")}><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ko">한국어</option></NativeSelect>
          <NativeSelect aria-label="Giọng điệu" className={quickSelectClass} {...form.register("tone")}>{toneOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
          <NativeSelect aria-label="Độ dài" className={quickSelectClass} {...form.register("length")}><option value="short">Ngắn</option><option value="medium">Vừa</option><option value="long">Dài</option></NativeSelect>
        </div><Button className="h-9 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800" disabled={generate.isPending}><Send className="mr-2 h-4 w-4" />{composerMode === "rewrite" ? "Viết lại" : "Tạo nội dung"}</Button></div>
      </div>
      {(form.formState.errors.topic || form.formState.errors.sourceText || form.formState.errors.apiKey || generate.error) && <p className="mt-2 text-sm text-red-600">{generate.error?.message || form.formState.errors.topic?.message || form.formState.errors.sourceText?.message || form.formState.errors.apiKey?.message}</p>}
      <p className="mt-2 text-center text-[11px] text-slate-400">Thiếu API key? Mở Cài đặt từ menu tài khoản.</p>
    </div></div>
  </form>{optionsOpen && <OptionsPanel saveState={optionsSaveState} />}</FormProvider>;
}

function HistoryTurn({ item }: { item: Generation }) {
  const [copied, setCopied] = useState(false);
  const styleLabel = item.input.libraryStyle?.name || item.input.kolStyle?.name || (item.input.discoveredStyle ? `@${item.input.discoveredStyle.username}` : null);
  return <article className="space-y-5"><div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-slate-200/80 px-4 py-3"><div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>{item.input.mode === "rewrite" ? "Viết lại" : "Viết mới"}</span>{styleLabel && <><span>·</span><span className="text-emerald-700">Style {styleLabel}</span></>}</div><p className="whitespace-pre-wrap text-sm leading-6">{item.input.topic}</p><p className="mt-2 text-[11px] text-slate-500">{item.input.language.toUpperCase()} · {item.input.tone} · {item.input.model}</p></div><div className="group relative"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-400 text-slate-950"><Sparkles className="h-3.5 w-3.5" /></span>Content Studio <span className="font-normal text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</span></div><div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{item.output}</div><button className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700" type="button" onClick={async () => { await navigator.clipboard.writeText(item.output); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy className="h-3.5 w-3.5" />{copied ? "Đã sao chép" : "Sao chép"}</button></div></article>;
}

function OptionsPanel({ saveState }: { saveState: "idle" | "saving" | "saved" | "error" }) {
  const { register, control } = useFormContext<ComposerValues>();
  const setOptionsOpen = useAppStore((state) => state.setOptionsOpen);
  const mode = useWatch({ control, name: "mode" });
  return <aside className="fixed inset-y-0 right-0 z-50 w-[min(340px,100vw)] overflow-y-auto border-l border-slate-200 bg-white px-5 py-5 shadow-2xl xl:z-20 xl:shadow-none"><div className="mb-6 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="font-semibold">Tuỳ chọn nội dung</h2>{saveState !== "idle" && <span className={`text-[10px] font-medium ${saveState === "error" ? "text-red-500" : saveState === "saved" ? "text-emerald-600" : "text-slate-400"}`}>{saveState === "saving" ? "Đang lưu..." : saveState === "saved" ? "Đã lưu" : "Lưu thất bại"}</span>}</div><p className="mt-1 text-xs leading-5 text-slate-500">Tự động lưu riêng cho dự án này.</p></div><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 xl:hidden" onClick={() => setOptionsOpen(false)}><X className="h-4 w-4" /></button></div><div className="space-y-5">
    <Field label="Từ khoá bắt buộc"><Input className="rounded-xl" placeholder="SEO, sản phẩm, thương hiệu" {...register("keywords")} /></Field>
    <Field label="Rule bắt buộc"><Textarea className="min-h-24 rounded-xl" placeholder="Ví dụ: không dùng emoji, không nhắc đối thủ, luôn có CTA ở cuối..." {...register("rules")} /></Field>
    <Field label="Tài liệu tham khảo"><Textarea className="min-h-32 rounded-xl" placeholder="Dán thông tin sản phẩm, báo cáo, dữ liệu hoặc tài liệu nền..." {...register("documents")} /></Field>
    {mode === "rewrite" && <Field label="Nội dung cần viết lại *"><Textarea className="min-h-28 rounded-xl" placeholder="Dán nội dung gốc cần viết lại..." {...register("sourceText")} /></Field>}
    <Field label="Hướng dẫn thêm"><Textarea className="min-h-24 rounded-xl" placeholder="Ví dụ: mở đầu bằng một câu hỏi..." {...register("customInstructions")} /></Field>
  </div></aside>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700"><span className="mb-2 block">{label}</span>{children}</label>;
}
