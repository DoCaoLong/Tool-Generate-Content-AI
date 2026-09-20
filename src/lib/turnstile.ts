export function getTurnstileSiteKey() {
  return (process.env.TURNSTILE_SITE_KEY || "").trim() || null;
}

export function getTurnstileSecretKey() {
  return (process.env.TURNSTILE_SECRET_KEY || "").trim() || null;
}

export async function verifyTurnstileToken(token: string, ip?: string | null) {
  const secret = getTurnstileSecretKey();
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  if (!token.trim()) return false;
  try {
    const body = new URLSearchParams({ secret, response: token.trim() });
    if (ip) body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await response.json().catch(() => ({}))) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
