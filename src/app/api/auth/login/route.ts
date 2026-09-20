import { compare } from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { errorResponse } from "@/lib/server-utils";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Email hoặc mật khẩu chưa hợp lệ.");

  const db = await getDb();
  const account = await db.collection("users").findOne({ email: parsed.data.email });
  if (!account || typeof account.passwordHash !== "string" || !(await compare(parsed.data.password, account.passwordHash))) {
    return errorResponse("Email hoặc mật khẩu không đúng.", 401);
  }

  const user = { id: account._id.toHexString(), name: String(account.name), email: String(account.email) };
  await createSession(user);
  return Response.json({ user });
}

