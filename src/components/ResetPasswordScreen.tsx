"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import TurnstileWidget from "@/components/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/http";
import type { UserProfile } from "@/lib/types";

const schema = z.object({
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(128),
  confirm: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(128),
}).refine((value) => value.password === value.confirm, { path: ["confirm"], message: "Mật khẩu nhập lại chưa khớp." });

type ResetValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const form = useForm<ResetValues>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });
  const resetPassword = useMutation({
    mutationFn: (values: ResetValues) => apiRequest<{ user: UserProfile }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: values.password, turnstileToken }),
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      router.replace("/projects");
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-6 py-12 text-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3">
          <Image src="/icon.png" alt="Content Studio" width={40} height={40} priority className="h-10 w-10 rounded-xl object-cover" />
          <span className="font-semibold">Content Studio</span>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight">Đặt mật khẩu mới</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">Chọn mật khẩu mới cho tài khoản. Liên kết chỉ dùng được một lần.</p>
        {!token ? <p className="mt-8 text-sm text-red-600">Liên kết không hợp lệ. Hãy yêu cầu email đặt lại mật khẩu mới.</p> : (
          <form className="mt-8 space-y-4" onSubmit={form.handleSubmit((values) => resetPassword.mutate(values, { onSettled: () => { setTurnstileToken(""); setTurnstileReset((value) => value + 1); } }))}>
            <div className="block text-sm font-medium">
              <label htmlFor="reset-password">Mật khẩu mới</label>
              <span className="relative mt-2 block">
                <Input id="reset-password" className="h-12 rounded-xl bg-white pr-12" type={showPassword ? "text" : "password"} placeholder="Tối thiểu 8 ký tự" {...form.register("password")} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </span>
            </div>
            <label className="block text-sm font-medium">Nhập lại mật khẩu
              <Input className="mt-2 h-12 rounded-xl bg-white" type={showPassword ? "text" : "password"} placeholder="Nhập lại mật khẩu" {...form.register("confirm")} />
            </label>
            <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileReset} />
            {(form.formState.errors.password || form.formState.errors.confirm || resetPassword.error) && <p className="text-sm text-red-600">{resetPassword.error?.message || form.formState.errors.password?.message || form.formState.errors.confirm?.message}</p>}
            <Button className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800" disabled={resetPassword.isPending}>{resetPassword.isPending ? "Đang lưu..." : "Lưu mật khẩu"}</Button>
          </form>
        )}
        <Link href="/projects" className="mt-6 block w-full text-center text-sm text-slate-500 hover:text-slate-950">Quay lại đăng nhập</Link>
      </div>
    </main>
  );
}
