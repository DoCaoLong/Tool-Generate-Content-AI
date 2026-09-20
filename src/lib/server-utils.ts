import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return { error: errorResponse("Bạn cần đăng nhập để tiếp tục.", 401) } as const;
  return { user } as const;
}

export function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

