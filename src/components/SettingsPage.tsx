"use client";

import { Check, Eye, EyeOff, KeyRound, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useAppStore } from "@/lib/app-store";
import { providerLabels, providerModels, providers } from "@/lib/providers";
import type { Provider } from "@/lib/types";

interface Values { apiKey: string; provider: Provider; model: string }

export default function SettingsPage() {
  const provider = useAppStore((state) => state.provider);
  const model = useAppStore((state) => state.model);
  const apiKey = useAppStore((state) => state.apiKey);
  const setProviderConfig = useAppStore((state) => state.setProviderConfig);
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const form = useForm<Values>({ defaultValues: { provider, model, apiKey } });
  const activeProvider = useWatch({ control: form.control, name: "provider" });

  const save = (values: Values) => {
    setProviderConfig(values.provider, values.model, values.apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Tài khoản</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Cài đặt</h1><p className="mt-2 text-sm text-slate-500">Quản lý API key và cấu hình AI mặc định cho workspace.</p>
    <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(save)}>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><KeyRound className="h-5 w-5" /></span><div className="flex-1"><h2 className="font-semibold">API key</h2><p className="mt-1 text-xs leading-5 text-slate-500">Key dùng để tạo nội dung với provider bạn chọn và chỉ được lưu trong trình duyệt này.</p><div className="relative mt-5"><Input type={visible ? "text" : "password"} className="h-12 rounded-xl pr-12 font-mono" placeholder="Nhập API key của provider" autoComplete="off" {...form.register("apiKey")} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setVisible(!visible)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Key không được gửi tới MongoDB của ứng dụng.</div></div></div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Mặc định khi soạn bài</h2><p className="mt-1 text-xs text-slate-500">Bạn vẫn có thể đổi nhanh provider và model ngay cạnh nút gửi.</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">Provider<NativeSelect wrapperClassName="mt-2 block" className="studio-select" {...form.register("provider", { onChange: (event) => form.setValue("model", providerModels[event.target.value as Provider][0]) })}>{providers.map((item) => <option key={item} value={item}>{providerLabels[item]}</option>)}</NativeSelect></label><label className="text-sm font-medium">Model<NativeSelect wrapperClassName="mt-2 block" className="studio-select" {...form.register("model")}>{providerModels[activeProvider].map((item) => <option key={item} value={item}>{item}</option>)}</NativeSelect></label></div></section>
      <div className="flex justify-end"><Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">{saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}{saved ? "Đã lưu" : "Lưu cài đặt"}</Button></div>
    </form>
  </div></main>;
}
