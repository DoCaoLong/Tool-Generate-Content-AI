"use client";

/* eslint-disable @next/next/no-img-element -- Admin prompt avatars can be local uploads or public paths. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ImagePlus, KeyRound, LogOut, Pencil, Plus, Sparkles, Trash2, Unlock, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, ApiError } from "@/lib/http";

type Tab = "users" | "keys" | "prompts";
interface AdminUser { id: string; name: string; email: string; disabled: boolean; createdAt: string | null }
interface PromptStyle {
  id: string;
  sourceId?: string | null;
  name: string;
  style: string;
  style_vi: string;
  content: string;
  profileImgUrl: string;
  isActive: boolean;
  origin?: "file" | "db";
}

export default function AdminApp() {
  const me = useQuery({ queryKey: ["admin-me"], queryFn: () => apiRequest<{ ok: true }>("/api/admin/me"), retry: false });
  if (me.isLoading) return <div className="grid min-h-screen place-items-center bg-[#f7f7f4]"><Sparkles className="h-7 w-7 animate-pulse text-emerald-600" /></div>;
  if (me.error instanceof ApiError && me.error.status === 401) return <AdminLogin />;
  if (me.error) return <div className="grid min-h-screen place-items-center px-6 text-sm text-red-600">{me.error.message}</div>;
  return <AdminDashboard />;
}

function AdminLogin() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const login = useMutation({
    mutationFn: () => apiRequest<{ ok: true }>("/api/admin/login", { method: "POST", body: JSON.stringify({ username, password, turnstileToken }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-me"] }),
    onSettled: () => { setTurnstileToken(""); setTurnstileReset((value) => value + 1); },
  });

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f4] px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Image src="/icon.png" alt="Content Studio" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Admin</p>
            <h1 className="text-xl font-semibold">Đăng nhập quản trị</h1>
          </div>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); login.mutate(); }}>
          <label className="block text-sm font-medium">Tài khoản<Input className="mt-2 h-12 rounded-xl" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
          <label className="block text-sm font-medium">Mật khẩu<Input className="mt-2 h-12 rounded-xl" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileReset} />
          {login.error && <p className="text-sm text-red-600">{login.error.message}</p>}
          <Button className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={login.isPending}>{login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}</Button>
        </form>
      </div>
    </main>
  );
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("users");
  const logout = useMutation({
    mutationFn: () => apiRequest<{ ok: true }>("/api/admin/logout", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-me"] }),
  });
  const titles: Record<Tab, string> = { users: "Người dùng", keys: "API key", prompts: "Prompt dựng sẵn" };

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col bg-[#171717] text-white">
        <div className="flex h-16 items-center gap-2.5 px-4 font-semibold">
          <Image src="/icon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
          Admin
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          <SideItem active={tab === "users"} icon={Users} label="Người dùng" onClick={() => setTab("users")} />
          <SideItem active={tab === "prompts"} icon={Sparkles} label="Prompt dựng sẵn" onClick={() => setTab("prompts")} />
          <SideItem active={tab === "keys"} icon={KeyRound} label="API key" onClick={() => setTab("keys")} />
        </nav>
        <div className="border-t border-white/10 p-3">
          <button type="button" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => logout.mutate()}>
            <LogOut className="h-4 w-4" />Đăng xuất
          </button>
        </div>
      </aside>
      <div className="ml-[240px]">
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-6">
          <h1 className="text-sm font-semibold">{titles[tab]}</h1>
        </header>
        <div className="p-6">
          {tab === "users" && <UsersTab />}
          {tab === "keys" && <KeysTab />}
          {tab === "prompts" && <PromptsTab />}
        </div>
      </div>
    </div>
  );
}

function SideItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Users; label: string; onClick: () => void }) {
  return <button type="button" className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`} onClick={onClick}><Icon className="h-4 w-4 shrink-0" />{label}</button>;
}

function UsersTab() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<AdminUser | null>(null);
  const query = useQuery({ queryKey: ["admin-users"], queryFn: () => apiRequest<{ users: AdminUser[] }>("/api/admin/users") });
  const toggle = useMutation({
    mutationFn: (user: AdminUser) => apiRequest(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ disabled: !user.disabled }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => { setPending(null); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Người dùng</h2><p className="mt-1 text-xs text-slate-500">{query.data?.users.length || 0} tài khoản</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Tên</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Ngày tạo</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
          <tbody>
            {(query.data?.users || []).map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium">{user.name}</td>
                <td className="px-5 py-3 text-slate-500">{user.email}</td>
                <td className="px-5 py-3">{user.disabled ? <span className="text-red-600">Khoá</span> : <span className="text-emerald-600">Hoạt động</span>}</td>
                <td className="px-5 py-3 text-slate-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" title={user.disabled ? "Mở khoá" : "Khoá"} aria-label={user.disabled ? "Mở khoá" : "Khoá"} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => toggle.mutate(user)}>
                      {user.disabled ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </button>
                    <button type="button" title="Xoá" aria-label="Xoá" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => setPending(user)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={Boolean(pending)} title="Xoá người dùng" description={`Xoá “${pending?.name}” và toàn bộ dự án, lịch sử, phong cách?`} confirmLabel="Xoá" destructive loading={remove.isPending} onConfirm={() => pending && remove.mutate(pending.id)} onOpenChange={(open) => { if (!open && !remove.isPending) setPending(null); }} />
    </section>
  );
}

function KeysTab() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin-keys"], queryFn: () => apiRequest<{ sorsa: { set: boolean; hint: string } }>("/api/admin/api-keys") });
  const [sorsa, setSorsa] = useState("");
  const save = useMutation({
    mutationFn: () => apiRequest("/api/admin/api-keys", { method: "PUT", body: JSON.stringify({ sorsa }) }),
    onSuccess: () => { setSorsa(""); queryClient.invalidateQueries({ queryKey: ["admin-keys"] }); },
  });

  return (
    <section className="max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold">Sorsa API key</h2>
      <p className="mt-1 text-xs text-slate-500">Key dùng cho tab Khám phá. Key AI của user vẫn nhập ở Cài đặt trên trình duyệt.</p>
      <label className="mt-5 block text-sm font-medium">
        Sorsa
        <Input className="mt-2 h-11 rounded-xl font-mono" type="password" placeholder={query.data?.sorsa.set ? query.data.sorsa.hint : "Nhập Sorsa API key"} value={sorsa} onChange={(event) => setSorsa(event.target.value)} autoComplete="off" />
      </label>
      {save.error && <p className="mt-4 text-sm text-red-600">{save.error.message}</p>}
      {save.isSuccess && <p className="mt-4 text-sm text-emerald-600">Đã lưu Sorsa API key.</p>}
      <div className="mt-5 flex justify-end"><Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={save.isPending || !sorsa.trim()} onClick={() => save.mutate()}>{save.isPending ? "Đang lưu..." : "Lưu key"}</Button></div>
    </section>
  );
}

function PromptsTab() {
  const queryClient = useQueryClient();
  const empty: Partial<PromptStyle> = { name: "", style: "", style_vi: "", content: "", profileImgUrl: "", isActive: true };
  const [editing, setEditing] = useState<Partial<PromptStyle> | null>(null);
  const [pending, setPending] = useState<PromptStyle | null>(null);
  const query = useQuery({ queryKey: ["admin-prompts"], queryFn: () => apiRequest<{ styles: PromptStyle[] }>("/api/admin/prompt-styles") });
  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const payload = { name: editing.name || "", style: editing.style || "", style_vi: editing.style_vi || "", content: editing.content || "", profileImgUrl: editing.profileImgUrl || "", isActive: editing.isActive !== false, sourceId: editing.sourceId || undefined };
      if (editing.id) return apiRequest(`/api/admin/prompt-styles/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      return apiRequest("/api/admin/prompt-styles", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin-prompts"] }); queryClient.invalidateQueries({ queryKey: ["prompt-styles"] }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/prompt-styles/${id}`, { method: "DELETE" }),
    onSuccess: () => { setPending(null); queryClient.invalidateQueries({ queryKey: ["admin-prompts"] }); queryClient.invalidateQueries({ queryKey: ["prompt-styles"] }); },
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/uploads", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể tải ảnh.");
      return data as { url: string };
    },
    onSuccess: (data) => setEditing((current) => current ? { ...current, profileImgUrl: data.url } : current),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setEditing(empty)}><Plus className="mr-2 h-4 w-4" />Thêm prompt</Button></div>
      {editing && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">{editing.id ? "Sửa prompt" : "Prompt mới"}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[8rem_1fr]">
            <div>
              <p className="text-sm font-medium">Ảnh</p>
              <div className="mt-2 grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {editing.profileImgUrl ? <img src={editing.profileImgUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-slate-300" />}
              </div>
              <input className="mt-2 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); }} />
              {upload.error && <p className="mt-1 text-xs text-red-600">{upload.error.message}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">Tên<Input className="mt-2 rounded-xl" value={editing.name || ""} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
              <label className="text-sm font-medium">Mô tả (VI)<Input className="mt-2 rounded-xl" value={editing.style_vi || ""} onChange={(event) => setEditing({ ...editing, style_vi: event.target.value })} /></label>
              <label className="text-sm font-medium md:col-span-2">Mô tả (EN)<Input className="mt-2 rounded-xl" value={editing.style || ""} onChange={(event) => setEditing({ ...editing, style: event.target.value })} /></label>
              <label className="text-sm font-medium md:col-span-2">Prompt / content<Textarea className="mt-2 min-h-40 rounded-xl" value={editing.content || ""} onChange={(event) => setEditing({ ...editing, content: event.target.value })} /></label>
            </div>
          </div>
          {save.error && <p className="mt-3 text-sm text-red-600">{save.error.message}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>Huỷ</Button>
            <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Đang lưu..." : "Lưu"}</Button>
          </div>
        </section>
      )}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Danh sách prompt</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(query.data?.styles || []).map((style) => (
            <article key={style.id} className="flex gap-3 rounded-2xl border border-slate-200 p-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {style.profileImgUrl ? <img src={style.profileImgUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] font-bold text-slate-400">{style.name.slice(0, 2).toUpperCase()}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="truncate text-sm font-semibold">{style.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{style.style_vi || style.style || "Không có mô tả"}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" title="Sửa" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEditing(style)}><Pencil className="h-4 w-4" /></button>
                    <button type="button" title="Xoá" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setPending(style)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!query.data?.styles.length && <p className="text-sm text-slate-500">Chưa có prompt.</p>}
        </div>
      </section>
      <ConfirmDialog open={Boolean(pending)} title="Xoá prompt" description={`Xoá “${pending?.name}”?`} confirmLabel="Xoá" destructive loading={remove.isPending} onConfirm={() => pending && remove.mutate(pending.id)} onOpenChange={(open) => { if (!open && !remove.isPending) setPending(null); }} />
    </div>
  );
}
