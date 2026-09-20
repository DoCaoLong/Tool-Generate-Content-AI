import { getSessionUser } from "@/lib/auth";
import { errorResponse } from "@/lib/server-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return errorResponse("Chưa đăng nhập.", 401);
  return Response.json({ user });
}
