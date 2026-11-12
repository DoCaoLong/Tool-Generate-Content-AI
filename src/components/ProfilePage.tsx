"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Mail, Pencil, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/http";
import type { UserProfile } from "@/lib/types";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Hãy nhập mật khẩu hiện tại.").max(128),
  newPassword: z.string().min(8, "Mật khẩu mới cần ít nhất 8 ký tự.").max(128),
  confirm: z.string(),
}).refine((value) => value.newPassword === value.confirm, { path: ["confirm"], message: "Mật khẩu nhập lại chưa khớp." });

type PasswordValues = z.infer<typeof passwordSchema>;

function DisplayNameCard({ user }: { user: UserProfile }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name);
  const trimmed = name.trim();
  const save = useMutation({
    mutationFn: () => apiRequest<{ user: UserProfile }>("/api/auth/profile", { method: "PATCH", body: JSON.stringify({ name: trimmed }) }),
    onSuccess: ({ user: updated }) => {
      setName(updated.name);
      queryClient.setQueryData<{ user: UserProfile }>(["me"], (current) => current ? { user: { ...current.user, name: updated.name } } : current);
    },
  });
  const invalid = trimmed.length < 2 || trimmed.length > 60;
  return <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Pencil className="h-4 w-4" />Đổi tên hiển thị</div>
    <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!invalid && trimmed !== user.name) { save.reset(); save.mutate(); } }}>
      <Input className="h-11 flex-1 rounded-xl" value={name} maxLength={60} aria-label="Tên hiển thị" onChange={(event) => { setName(event.target.value); save.reset(); }} />
      <Button className="h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" disabled={save.isPending || invalid || trimmed === user.name}>{save.isPending ? "Đang lưu..." : "Lưu tên"}</Button>
    </form>
    {name.length > 0 && invalid && <p className="mt-3 text-sm text-red-600">Tên hiển thị cần từ 2 đến 60 ký tự.</p>}
    {save.error && <p className="mt-3 text-sm text-red-600">{save.error.message}</p>}
    {save.isSuccess && !save.isPending && <p className="mt-3 text-sm text-emerald-700">Đã đổi tên hiển thị.</p>}
  </section>;
}

function ChangePasswordCard() {
  const [visible, setVisible] = useState(false);
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });
  const change = useMutation({
    mutationFn: (values: PasswordValues) => apiRequest<{ ok: true }>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) }),
    onSuccess: () => form.reset(),
  });
  const errors = form.formState.errors;
  const type = visible ? "text" : "password";
  const message = change.error?.message || errors.currentPassword?.message || errors.newPassword?.message || errors.confirm?.message;

  return <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><KeyRound className="h-4 w-4" />Đổi mật khẩu</div>
    <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => { change.reset(); change.mutate(values); })}>
      <label className="block text-sm font-medium">Mật khẩu hiện tại
        <div className="relative mt-2"><Input className="h-11 rounded-xl pr-12" type={type} autoComplete="current-password" {...form.register("currentPassword")} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Mật khẩu mới<Input className="mt-2 h-11 rounded-xl" type={type} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" {...form.register("newPassword")} /></label>
        <label className="block text-sm font-medium">Nhập lại mật khẩu mới<Input className="mt-2 h-11 rounded-xl" type={type} autoComplete="new-password" {...form.register("confirm")} /></label>
      </div>
      {message && <p className="text-sm text-red-600">{message}</p>}
      {change.isSuccess && !message && <p className="text-sm text-emerald-700">Đã đổi mật khẩu.</p>}
      <Button className="h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" disabled={change.isPending}>{change.isPending ? "Đang lưu..." : "Đổi mật khẩu"}</Button>
    </form>
  </section>;
}

export default function ProfilePage({ user }: { user: UserProfile }) {
  return <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><div className="flex items-center gap-5"><span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-300 text-xl font-bold text-slate-950">{user.name.slice(0, 1).toUpperCase()}</span><div><h2 className="text-xl font-semibold">{user.name}</h2><p className="mt-1 text-sm text-slate-500">Tài khoản Content Studio</p></div></div><div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><UserRound className="h-4 w-4" />Tên hiển thị</div><p className="mt-2 text-sm font-medium">{user.name}</p></div><div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Mail className="h-4 w-4" />Email</div><p className="mt-2 truncate text-sm font-medium">{user.email}</p></div></div></section><DisplayNameCard key={user.name} user={user} /><ChangePasswordCard /></div></main>;
}
