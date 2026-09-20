import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { errorResponse } from "@/lib/server-utils";

const ADMIN_COOKIE = "cw_admin";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET phải có ít nhất 32 ký tự.");
  return new TextEncoder().encode(value);
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getAdminCredentials() {
  return {
    username: (process.env.ADMIN_USERNAME || "").trim(),
    password: process.env.ADMIN_PASSWORD || "",
  };
}

export function verifyAdminCredentials(username: string, password: string) {
  const expected = getAdminCredentials();
  if (!expected.username || !expected.password) return false;
  return safeEqual(username.trim(), expected.username) && safeEqual(password, expected.password);
}

export async function createAdminSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub === "admin" && payload.role === "admin";
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await getAdminSession())) return { error: errorResponse("Bạn cần đăng nhập admin.", 401) } as const;
  return { ok: true } as const;
}
