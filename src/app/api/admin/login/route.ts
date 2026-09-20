import { z } from "zod";
import { createAdminSession, getAdminCredentials, verifyAdminCredentials } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/server-utils";
import { clientIp, verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(128),
  turnstileToken: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Tài khoản hoặc mật khẩu chưa hợp lệ.");
  const credentials = getAdminCredentials();
  if (!credentials.username || !credentials.password) return errorResponse("ADMIN_USERNAME hoặc ADMIN_PASSWORD chưa được cấu hình.", 503);
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken, clientIp(request)))) {
    return errorResponse("Xác thực Turnstile chưa hợp lệ. Hãy thử lại.", 403);
  }
  if (!verifyAdminCredentials(parsed.data.username, parsed.data.password)) {
    return errorResponse("Tài khoản hoặc mật khẩu không đúng.", 401);
  }
  await createAdminSession();
  return Response.json({ ok: true });
}
