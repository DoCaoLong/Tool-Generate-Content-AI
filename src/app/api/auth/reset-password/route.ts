import { hash } from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { consumePasswordReset } from "@/lib/password-reset";
import { errorResponse } from "@/lib/server-utils";
import { clientIp, verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(128),
  turnstileToken: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Mật khẩu mới chưa hợp lệ.");
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken, clientIp(request)))) {
    return errorResponse("Xác thực Turnstile chưa hợp lệ. Hãy thử lại.", 403);
  }

  const userId = await consumePasswordReset(parsed.data.token);
  if (!userId) return errorResponse("Liên kết đặt lại mật khẩu không còn hiệu lực.", 400);

  const db = await getDb();
  const account = await db.collection("users").findOne({ _id: userId });
  if (!account || account.disabled) return errorResponse("Liên kết đặt lại mật khẩu không còn hiệu lực.", 400);

  await db.collection("users").updateOne(
    { _id: userId },
    { $set: { passwordHash: await hash(parsed.data.password, 12), updatedAt: new Date() } },
  );
  const user = { id: userId.toHexString(), name: String(account.name), email: String(account.email) };
  await createSession(user);
  return Response.json({ user });
}
