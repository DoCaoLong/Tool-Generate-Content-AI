"use client";

import { Check, Eye, Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { getKOLInitials } from "@/lib/kol-styles";
import type { DiscoveredTweet } from "@/lib/types";

function shortNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function TweetAvatar({ tweet }: { tweet: DiscoveredTweet }) {
  const [failed, setFailed] = useState(false);
  if (!tweet.avatarUrl || failed) {
    return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{getKOLInitials(tweet.displayName || tweet.username)}</span>;
  }
  return <img src={tweet.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-full object-cover" onError={() => setFailed(true)} />; // eslint-disable-line @next/next/no-img-element
}

function TweetPhoto({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt="" referrerPolicy="no-referrer" className="w-full rounded-xl" onError={() => setFailed(true)} />; // eslint-disable-line @next/next/no-img-element
}

function xProfileUrl(username: string) {
  const handle = username.replace(/^@/, "").trim();
  return handle ? `https://x.com/${encodeURIComponent(handle)}` : "https://x.com";
}

function xStatusUrl(username: string, id: string) {
  const handle = username.replace(/^@/, "").trim();
  return handle ? `https://x.com/${encodeURIComponent(handle)}/status/${encodeURIComponent(id)}` : `https://x.com/i/status/${encodeURIComponent(id)}`;
}

function openX(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function TweetStats({ tweet }: { tweet: DiscoveredTweet }) {
  const created = Number.isNaN(new Date(tweet.createdAt).getTime()) ? "" : new Date(tweet.createdAt).toLocaleDateString("vi-VN");
  return (
    <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
      {created ? <span>{created}</span> : null}
      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{shortNumber(tweet.likes)}</span>
      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{shortNumber(tweet.replies)}</span>
      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{shortNumber(tweet.views)}</span>
    </div>
  );
}

export default function TweetCard({ tweet, projectName, selected = false, onSelect, className = "" }: { tweet: DiscoveredTweet; projectName?: string; selected?: boolean; onSelect?: () => void; className?: string }) {
  const profileUrl = xProfileUrl(tweet.username);
  const openPost = () => openX(xStatusUrl(tweet.username, tweet.id));
  return (
    <article
      className={`relative min-w-0 max-w-full overflow-hidden rounded-2xl border bg-white p-4 transition-colors ${onSelect ? "cursor-pointer" : "cursor-pointer hover:border-slate-300"} ${selected ? "border-emerald-400 bg-emerald-50/70 ring-1 ring-emerald-200" : "border-slate-200"} ${className}`}
      tabIndex={0}
      onClick={() => { if (onSelect) onSelect(); else openPost(); }}
      onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); if (onSelect) onSelect(); else openPost(); }}
    >
      {onSelect ? <span className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}><Check className="h-3.5 w-3.5" /></span> : null}
      <a href={profileUrl} target="_blank" rel="noopener noreferrer" className={`flex min-w-0 items-center gap-3 ${onSelect ? "pr-8" : ""}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <TweetAvatar tweet={tweet} />
        <span className="min-w-0 truncate text-sm font-semibold text-slate-900 hover:underline">{tweet.displayName} <span className="font-normal text-slate-400">@{tweet.username}</span></span>
      </a>
      {projectName ? <p className="mt-1 truncate pl-[3.25rem] text-xs text-slate-400">{projectName}</p> : null}
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{tweet.text}</p>
      {tweet.images.length > 0 && <div className="mt-3 space-y-2">{tweet.images.map((src) => <TweetPhoto key={src} src={src} />)}</div>}
      <TweetStats tweet={tweet} />
    </article>
  );
}
