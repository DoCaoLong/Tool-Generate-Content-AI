import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { issuePasswordReset } from "@/lib/password-reset";
import { appOrigin, getResendConfig, sendPasswordResetEmail } from "@/lib/resend";
import { errorResponse } from "@/lib/server-utils";
import { clientIp, verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  turnstileToken: z.string().optional().default(""),
});

const sent = { ok: true, message: "Nếu email đã có tài khoản, hãy kiểm tra hộp thư. Liên kết có hiệu lực 30 phút." };

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Email chưa đúng định dạng.");
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken, clientIp(request)))) {
    return errorResponse("Xác thực Turnstile chưa hợp lệ. Hãy thử lại.", 403);
  }
  if (!getResendConfig()) return errorResponse("Email đặt lại mật khẩu chưa được cấu hình.", 503);

  const db = await getDb();
  const account = await db.collection("users").findOne({ email: parsed.data.email });
  if (!account || account.disabled) return Response.json(sent);

  const token = await issuePasswordReset(account._id);
  if (!token) return Response.json(sent);
  try {
    const origin = appOrigin(request);
    await sendPasswordResetEmail(parsed.data.email, String(account.name || ""), `${origin}/reset-password?token=${encodeURIComponent(token)}`, origin);
  } catch (error) {
    await db.collection("password_resets").deleteMany({ userId: account._id });
    const message = error instanceof Error && error.message ? error.message : "Không gửi được email. Hãy thử lại.";
    return errorResponse(message, 502);
  }
  return Response.json(sent);
}
