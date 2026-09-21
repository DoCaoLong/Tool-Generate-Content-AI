import { z } from "zod";
import { requireAccessCode } from "@/lib/access-code";
import { errorResponse } from "@/lib/server-utils";

const schema = z.object({
  accessCode: z.string().trim().min(1).max(128),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Hãy nhập access code.");
  const access = requireAccessCode(parsed.data.accessCode);
  if (!access.ok) return errorResponse(access.message, access.status);
  return Response.json({ ok: true });
}
