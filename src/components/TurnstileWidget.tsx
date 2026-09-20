"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/http";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export default function TurnstileWidget({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const siteKey = useQuery({ queryKey: ["turnstile-site-key"], queryFn: () => apiRequest<{ siteKey: string | null }>("/api/public/turnstile") });

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const key = siteKey.data?.siteKey;
    const host = hostRef.current;
    if (!key || !host) return;
    let cancelled = false;
    const emit = (token: string) => onTokenRef.current(token);

    const render = () => {
      if (cancelled || !window.turnstile || !hostRef.current) return;
      if (widgetId.current) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
      hostRef.current.innerHTML = "";
      widgetId.current = window.turnstile.render(hostRef.current, {
        sitekey: key,
        callback: emit,
        "expired-callback": () => emit(""),
        "error-callback": () => emit(""),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (window.turnstile) {
      render();
    } else if (existing) {
      existing.addEventListener("load", render);
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.turnstile = "true";
      script.addEventListener("load", render);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [resetKey, siteKey.data?.siteKey]);

  if (!siteKey.data?.siteKey) return null;
  return <div ref={hostRef} className="flex justify-center" />;
}
