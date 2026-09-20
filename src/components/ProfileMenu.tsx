"use client";

import { ChevronRight, CircleHelp, LogOut, Settings, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/types";

export default function ProfileMenu({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const go = (href: string) => { setOpen(false); router.push(href); };

  return <div className="relative border-t border-white/10 p-3">
    {open && <><button aria-label="Đóng menu tài khoản" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} /><div className="absolute bottom-[72px] left-3 right-3 z-50 overflow-hidden rounded-3xl border border-white/10 bg-[#343434] p-2 text-white shadow-2xl">
      <div className="flex items-center gap-3 px-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-300 font-bold text-slate-950">{user.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.name}</p><p className="text-xs text-slate-400">Plus</p></div></div>
      <div className="mx-2 border-t border-white/15" />
      <MenuItem icon={Sparkles} label="Nâng cấp gói" onClick={() => go("/settings#billing")} />
      <MenuItem icon={SlidersHorizontal} label="Cá nhân hoá" onClick={() => go("/styles")} />
      <MenuItem icon={UserRound} label="Hồ sơ" onClick={() => go("/profile")} />
      <MenuItem icon={Settings} label="Cài đặt" onClick={() => go("/settings")} />
      <div className="mx-2 my-1 border-t border-white/15" />
      <MenuItem icon={CircleHelp} label="Trợ giúp" trailing onClick={() => go("/help")} />
      <MenuItem icon={LogOut} label="Đăng xuất" onClick={() => { setOpen(false); onLogout(); }} />
    </div></>}
    <button className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${open ? "bg-white/10" : "hover:bg-white/5"}`} onClick={() => setOpen(!open)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-300 font-semibold text-slate-950">{user.name.slice(0, 1).toUpperCase()}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-slate-500">Plus</span></span>
      <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${open ? "-rotate-90" : ""}`} />
    </button>
  </div>;
}

function MenuItem({ icon: Icon, label, trailing, onClick }: { icon: typeof Settings; label: string; trailing?: boolean; onClick: () => void }) {
  return <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-100 hover:bg-white/10" onClick={onClick}><Icon className="h-4 w-4 text-slate-300" /><span className="flex-1">{label}</span>{trailing && <ChevronRight className="h-4 w-4 text-slate-400" />}</button>;
}
