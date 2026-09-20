import { getAdminSession } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/server-utils";

export async function GET() {
  if (!(await getAdminSession())) return errorResponse("Chưa đăng nhập admin.", 401);
  return Response.json({ ok: true });
}
