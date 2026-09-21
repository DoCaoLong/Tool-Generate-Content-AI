import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "cw_session";
const ADMIN_COOKIE = "cw_admin";

const publicApiExact = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/access-code",
  "/api/public/turnstile",
  "/api/admin/login",
]);

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) return null;
  return new TextEncoder().encode(value);
}

async function hasValidToken(token: string | undefined, kind: "user" | "admin") {
  if (!token) return false;
  const key = secret();
  if (!key) return false;
  try {
    const { payload } = await jwtVerify(token, key);
    if (kind === "admin") return payload.sub === "admin" && payload.role === "admin";
    return Boolean(payload.sub && typeof payload.email === "string");
  } catch {
    return false;
  }
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (publicApiExact.has(pathname)) return NextResponse.next();

  if (pathname.startsWith("/api/admin/")) {
    const ok = await hasValidToken(request.cookies.get(ADMIN_COOKIE)?.value, "admin");
    if (!ok) return unauthorized("Bạn cần đăng nhập admin.");
    return NextResponse.next();
  }

  const ok = await hasValidToken(request.cookies.get(SESSION_COOKIE)?.value, "user");
  if (!ok) return unauthorized("Bạn cần đăng nhập để tiếp tục.");
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
