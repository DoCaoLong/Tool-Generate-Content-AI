"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { getKOLInitials } from "@/lib/kol-styles";

export default function PromptAvatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  return <PromptAvatarInner key={src || name} src={src} name={name} className={className} />;
}

function PromptAvatarInner({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <span className={className}>
      {showImage ? <img src={src || ""} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} /> : getKOLInitials(name)}
    </span>
  );
}
