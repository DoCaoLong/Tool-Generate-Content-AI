import { compare } from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { errorResponse } from "@/lib/server-utils";
import { clientIp, verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
  turnstileToken: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Email hoặc mật khẩu chưa hợp lệ.");
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken, clientIp(request)))) {
    return errorResponse("Xác thực Turnstile chưa hợp lệ. Hãy thử lại.", 403);
  }

  const db = await getDb();
  const account = await db.collection("users").findOne({ email: parsed.data.email });
  if (!account || typeof account.passwordHash !== "string" || !(await compare(parsed.data.password, account.passwordHash))) {
    return errorResponse("Email hoặc mật khẩu không đúng.", 401);
  }
  if (account.disabled) return errorResponse("Tài khoản đã bị vô hiệu hoá.", 403);

  const user = { id: account._id.toHexString(), name: String(account.name), email: String(account.email) };
  await createSession(user);
  return Response.json({ user });
}

