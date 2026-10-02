import { z } from "zod";
import { grantSorsaAccess } from "@/lib/account-access";
import { requireAccessCode } from "@/lib/access-code";
import { errorResponse, requireUser } from "@/lib/server-utils";

const schema = z.object({
  accessCode: z.string().trim().min(1).max(128),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Hãy nhập access code.");
  const access = requireAccessCode(parsed.data.accessCode);
  if (!access.ok) return errorResponse(access.message, access.status);
  await grantSorsaAccess(auth.user.id);
  return Response.json({ ok: true });
}
