import { z } from "zod";
import { getRegisterAccessCode, verifyAccessCode } from "@/lib/access-code";
import { errorResponse } from "@/lib/server-utils";

const schema = z.object({
  accessCode: z.string().trim().min(1).max(128),
});

export async function POST(request: Request) {
  if (!getRegisterAccessCode()) return errorResponse("REGISTER_ACCESS_CODE chưa được cấu hình trên server.", 503);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Hãy nhập access code.");
  if (!verifyAccessCode(parsed.data.accessCode)) return errorResponse("Access code không đúng.", 403);

  return Response.json({ ok: true });
}
