"use client";

import { Check, Eye, EyeOff, KeyRound, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { checkProviderApi } from "@/lib/api-client";
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
  const [checkState, setCheckState] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [checkMessage, setCheckMessage] = useState("");
  const form = useForm<Values>({ defaultValues: { provider, model, apiKey } });
  const activeProvider = useWatch({ control: form.control, name: "provider" });

  const save = (values: Values) => {
    setProviderConfig(values.provider, values.model, values.apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const checkApi = async () => {
    const values = form.getValues();
    setCheckState("checking");
    setCheckMessage("");
    const result = await checkProviderApi(values.provider, values.apiKey.trim(), values.model);
    setCheckState(result.valid ? "ok" : "error");
    setCheckMessage(result.valid ? `${providerLabels[values.provider]} hoạt động bình thường.` : result.error || "API không hoạt động.");
  };

  return <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><h1 className="text-3xl font-semibold tracking-tight">Cài đặt</h1>
    <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(save)}>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><KeyRound className="h-5 w-5" /></span><h2 className="font-semibold">API key</h2></div>
        <div className="relative mt-5"><Input type={visible ? "text" : "password"} className="h-12 rounded-xl pr-12 font-mono" placeholder="Nhập API key của provider" autoComplete="off" {...form.register("apiKey")} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setVisible(!visible)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
        {checkMessage && <p className={`mt-3 text-sm ${checkState === "ok" ? "text-emerald-600" : "text-red-600"}`}>{checkMessage}</p>}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Mặc định khi soạn bài</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">Provider<NativeSelect wrapperClassName="mt-2 block" className="studio-select" {...form.register("provider", { onChange: (event) => form.setValue("model", providerModels[event.target.value as Provider][0]) })}>{providers.map((item) => <option key={item} value={item}>{providerLabels[item]}</option>)}</NativeSelect></label><label className="text-sm font-medium">Model<NativeSelect wrapperClassName="mt-2 block" className="studio-select" {...form.register("model")}>{providerModels[activeProvider].map((item) => <option key={item} value={item}>{item}</option>)}</NativeSelect></label></div></section>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="rounded-xl" disabled={checkState === "checking"} onClick={() => void checkApi()}>{checkState === "checking" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{checkState === "checking" ? "Đang kiểm tra..." : "Kiểm tra API"}</Button>
        <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">{saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}{saved ? "Đã lưu" : "Lưu cài đặt"}</Button>
      </div>
    </form>
  </div></main>;
}
