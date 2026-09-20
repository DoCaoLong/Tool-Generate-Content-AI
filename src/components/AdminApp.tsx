"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, Pencil, Plus, Shield, Sparkles, Trash2, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, ApiError } from "@/lib/http";
import { managedApiKeyIds, managedApiKeyLabels } from "@/lib/api-keys";

type Tab = "users" | "keys" | "prompts";
interface AdminUser { id: string; name: string; email: string; disabled: boolean; createdAt: string | null }
interface PromptStyle { id: string; name: string; style: string; style_vi: string; content: string; isActive: boolean }
interface BuiltinStyle { id: string; name: string; style: string; style_vi: string; content: string }

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

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <Image src="/icon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Content Studio</p>
            <h1 className="text-sm font-semibold">Quản trị</h1>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => logout.mutate()}><LogOut className="mr-2 h-4 w-4" />Đăng xuất</Button>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-2">
          <TabButton active={tab === "users"} icon={Users} label="Người dùng" onClick={() => setTab("users")} />
          <TabButton active={tab === "keys"} icon={KeyRound} label="API key" onClick={() => setTab("keys")} />
          <TabButton active={tab === "prompts"} icon={Shield} label="Style prompt" onClick={() => setTab("prompts")} />
        </div>
        {tab === "users" && <UsersTab />}
        {tab === "keys" && <KeysTab />}
        {tab === "prompts" && <PromptsTab />}
      </div>
    </div>
  );
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Users; label: string; onClick: () => void }) {
  return <button type="button" className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${active ? "bg-slate-950 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`} onClick={onClick}><Icon className="h-4 w-4" />{label}</button>;
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
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Tên</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Ngày tạo</th><th className="px-5 py-3" /></tr></thead>
          <tbody>
            {(query.data?.users || []).map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium">{user.name}</td>
                <td className="px-5 py-3 text-slate-500">{user.email}</td>
                <td className="px-5 py-3">{user.disabled ? <span className="text-red-600">Khoá</span> : <span className="text-emerald-600">Hoạt động</span>}</td>
                <td className="px-5 py-3 text-slate-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
                <td className="px-5 py-3 text-right">
                  <Button variant="outline" className="mr-2 h-8 rounded-lg px-3 text-xs" onClick={() => toggle.mutate(user)}>{user.disabled ? "Mở khoá" : "Khoá"}</Button>
                  <Button variant="outline" className="h-8 rounded-lg px-3 text-xs text-red-600" onClick={() => setPending(user)}>Xoá</Button>
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
  const query = useQuery({ queryKey: ["admin-keys"], queryFn: () => apiRequest<{ keys: Record<string, { set: boolean; hint: string }> }>("/api/admin/api-keys") });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => apiRequest("/api/admin/api-keys", { method: "PUT", body: JSON.stringify(drafts) }),
    onSuccess: () => { setDrafts({}); queryClient.invalidateQueries({ queryKey: ["admin-keys"] }); },
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold">API key hệ thống</h2>
      <p className="mt-1 text-xs text-slate-500">Lưu key dùng chung. Để trống nếu không đổi giá trị hiện tại.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {managedApiKeyIds.map((id) => {
          const meta = query.data?.keys[id];
          return (
            <label key={id} className="text-sm font-medium">
              {managedApiKeyLabels[id]}
              <Input className="mt-2 h-11 rounded-xl font-mono" type="password" placeholder={meta?.set ? meta.hint : "Chưa có key"} value={drafts[id] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [id]: event.target.value }))} autoComplete="off" />
            </label>
          );
        })}
      </div>
      {save.error && <p className="mt-4 text-sm text-red-600">{save.error.message}</p>}
      {save.isSuccess && <p className="mt-4 text-sm text-emerald-600">Đã lưu API key.</p>}
      <div className="mt-5 flex justify-end"><Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={save.isPending || !Object.values(drafts).some(Boolean)} onClick={() => save.mutate()}>{save.isPending ? "Đang lưu..." : "Lưu key"}</Button></div>
    </section>
  );
}

function PromptsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<PromptStyle> | null>(null);
  const [pending, setPending] = useState<PromptStyle | null>(null);
  const query = useQuery({ queryKey: ["admin-prompts"], queryFn: () => apiRequest<{ styles: PromptStyle[]; builtins: BuiltinStyle[] }>("/api/admin/prompt-styles") });
  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const payload = { name: editing.name || "", style: editing.style || "", style_vi: editing.style_vi || "", content: editing.content || "", isActive: editing.isActive !== false };
      if (editing.id) return apiRequest(`/api/admin/prompt-styles/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      return apiRequest("/api/admin/prompt-styles", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin-prompts"] }); queryClient.invalidateQueries({ queryKey: ["prompt-styles"] }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/prompt-styles/${id}`, { method: "DELETE" }),
    onSuccess: () => { setPending(null); queryClient.invalidateQueries({ queryKey: ["admin-prompts"] }); queryClient.invalidateQueries({ queryKey: ["prompt-styles"] }); },
  });
  const importBuiltin = (style: BuiltinStyle) => setEditing({ name: style.name, style: style.style, style_vi: style.style_vi, content: style.content, isActive: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setEditing({ name: "", style: "", style_vi: "", content: "", isActive: true })}><Plus className="mr-2 h-4 w-4" />Thêm style prompt</Button></div>
      {editing && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">{editing.id ? "Sửa style prompt" : "Style prompt mới"}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Tên<Input className="mt-2 rounded-xl" value={editing.name || ""} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
            <label className="text-sm font-medium">Mô tả (VI)<Input className="mt-2 rounded-xl" value={editing.style_vi || ""} onChange={(event) => setEditing({ ...editing, style_vi: event.target.value })} /></label>
            <label className="text-sm font-medium md:col-span-2">Mô tả (EN)<Input className="mt-2 rounded-xl" value={editing.style || ""} onChange={(event) => setEditing({ ...editing, style: event.target.value })} /></label>
            <label className="text-sm font-medium md:col-span-2">Prompt / content<Textarea className="mt-2 min-h-40 rounded-xl" value={editing.content || ""} onChange={(event) => setEditing({ ...editing, content: event.target.value })} /></label>
          </div>
          {save.error && <p className="mt-3 text-sm text-red-600">{save.error.message}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>Huỷ</Button>
            <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Đang lưu..." : "Lưu"}</Button>
          </div>
        </section>
      )}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Style đã lưu</h2>
        <div className="mt-4 space-y-3">
          {(query.data?.styles || []).map((style) => (
            <article key={style.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{style.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{style.style_vi || style.style || "Không có mô tả"}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEditing(style)}><Pencil className="h-4 w-4" /></button>
                  <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setPending(style)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          ))}
          {!query.data?.styles.length && <p className="text-sm text-slate-500">Chưa có style prompt trong database.</p>}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">KOL dựng sẵn</h2>
        <p className="mt-1 text-xs text-slate-500">Nhân bản vào database để chỉnh sửa.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(query.data?.builtins || []).map((style) => (
            <button key={style.id} type="button" className="rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50" onClick={() => importBuiltin(style)}>
              <h3 className="text-sm font-semibold">{style.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{style.style_vi || style.style}</p>
            </button>
          ))}
        </div>
      </section>
      <ConfirmDialog open={Boolean(pending)} title="Xoá style prompt" description={`Xoá “${pending?.name}”?`} confirmLabel="Xoá" destructive loading={remove.isPending} onConfirm={() => pending && remove.mutate(pending.id)} onOpenChange={(open) => { if (!open && !remove.isPending) setPending(null); }} />
    </div>
  );
}
