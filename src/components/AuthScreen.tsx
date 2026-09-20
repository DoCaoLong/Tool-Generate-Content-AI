"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { z } from "zod";
import TurnstileWidget from "@/components/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/http";
import type { UserProfile } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().max(60),
  email: z.string().trim().email("Email chưa đúng định dạng."),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự."),
});

type AuthValues = z.infer<typeof schema>;

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const queryClient = useQueryClient();
  const form = useForm<AuthValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: AuthValues) =>
      apiRequest<{ user: UserProfile }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(mode === "register" ? { ...values, accessCode: verifiedCode, turnstileToken } : { ...values, turnstileToken }),
      }),
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
  const verifyAccess = useMutation({
    mutationFn: (code: string) => apiRequest<{ ok: true }>("/api/auth/access-code", { method: "POST", body: JSON.stringify({ accessCode: code }) }),
    onSuccess: (_, code) => {
      setVerifiedCode(code);
      setAccessOpen(false);
      setAccessCode("");
      setMode("register");
      mutation.reset();
      form.clearErrors();
    },
  });

  const backToLogin = () => {
    setMode("login");
    setVerifiedCode("");
    setAccessCode("");
    setTurnstileToken("");
    setTurnstileReset((value) => value + 1);
    mutation.reset();
    verifyAccess.reset();
    form.clearErrors();
  };

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-slate-950 lg:grid lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden bg-[#171717] px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3 text-lg font-semibold">
          <Image src="/icon.png" alt="Content Studio" width={40} height={40} priority className="h-10 w-10 rounded-xl object-cover" />
          Content Studio
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Không gian sáng tạo của bạn</p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Mỗi dự án là một mạch nội dung liền lạc.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Tổ chức brief, tuỳ chọn và mọi phiên bản đã tạo trong cùng một nơi. Quay lại bất kỳ lúc nào mà không mất ngữ cảnh.</p>
        </div>
        <div className="relative grid gap-3 text-sm text-slate-300">
          {['Lịch sử riêng cho từng dự án', 'Hỗ trợ 6 provider AI phổ biến', 'Dữ liệu tài khoản được bảo vệ ở backend'].map((item) => (
            <div key={item} className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-300" />{item}</div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image src="/icon.png" alt="Content Studio" width={40} height={40} priority className="h-10 w-10 rounded-xl object-cover" />
            <span className="font-semibold">Content Studio</span>
          </div>
          <p className="text-sm font-semibold text-emerald-700">{mode === "login" ? "Chào mừng trở lại" : "Bắt đầu workspace mới"}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{mode === "login" ? "Đăng nhập vào tài khoản" : "Tạo tài khoản của bạn"}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">{mode === "login" ? "Tiếp tục quản lý dự án và lịch sử nội dung." : "Mọi dự án và lịch sử sẽ được đồng bộ an toàn."}</p>

          <form className="mt-8 space-y-4" onSubmit={form.handleSubmit((values) => { if (mode === "register" && !verifiedCode) { setAccessOpen(true); return; } mutation.mutate(values, { onSettled: () => { setTurnstileToken(""); setTurnstileReset((value) => value + 1); } }); })}>
            {mode === "register" && (
              <label className="block text-sm font-medium">Tên hiển thị
                <Input className="mt-2 h-12 rounded-xl bg-white" placeholder="Nguyễn An" {...form.register("name", { required: mode === "register" })} />
              </label>
            )}
            <label className="block text-sm font-medium">Email
              <Input className="mt-2 h-12 rounded-xl bg-white" type="email" placeholder="ban@example.com" {...form.register("email")} />
            </label>
            <label className="block text-sm font-medium">Mật khẩu
              <Input className="mt-2 h-12 rounded-xl bg-white" type="password" placeholder="Tối thiểu 8 ký tự" {...form.register("password")} />
            </label>
            <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileReset} />
            {(form.formState.errors.email || form.formState.errors.password || mutation.error) && (
              <p className="text-sm text-red-600">{mutation.error?.message || form.formState.errors.email?.message || form.formState.errors.password?.message}</p>
            )}
            <Button className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={mutation.isPending}>
              {mutation.isPending ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
              {!mutation.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <button type="button" className="mt-6 block w-full text-center text-sm text-slate-500 hover:text-slate-950" onClick={() => { if (mode === "login") { verifyAccess.reset(); setAccessCode(""); setAccessOpen(true); } else backToLogin(); }}>
            {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
          </button>
        </div>
      </section>
      <Dialog open={accessOpen} onOpenChange={(open) => { if (!verifyAccess.isPending) { setAccessOpen(open); if (!open) { setAccessCode(""); verifyAccess.reset(); } } }}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Access code</DialogTitle>
            <DialogDescription>Nhập mã truy cập để tiếp tục tạo tài khoản.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); verifyAccess.mutate(accessCode.trim()); }}>
            <label className="block text-sm font-medium">Mã truy cập
              <Input className="mt-2 h-12 rounded-xl" autoFocus type="password" placeholder="Nhập access code" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} />
            </label>
            {verifyAccess.error && <p className="text-sm text-red-600">{verifyAccess.error.message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" disabled={verifyAccess.isPending} onClick={() => setAccessOpen(false)}>Huỷ</Button>
              <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={verifyAccess.isPending || !accessCode.trim()}>{verifyAccess.isPending ? "Đang kiểm tra..." : "Tiếp tục"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
