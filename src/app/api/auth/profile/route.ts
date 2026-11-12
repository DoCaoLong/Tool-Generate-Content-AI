import { z } from "zod";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId, requireUser } from "@/lib/server-utils";
import { assertAppRequest } from "@/lib/x-api-guard";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
});

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const blocked = assertAppRequest(request);
  if (blocked) return blocked;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Tên hiển thị cần từ 2 đến 60 ký tự.");

  const id = parseObjectId(auth.user.id);
  if (!id) return errorResponse("Tài khoản không hợp lệ.", 401);
  const result = await (await getDb()).collection("users").updateOne(
    { _id: id, disabled: { $ne: true } },
    { $set: { name: parsed.data.name, updatedAt: new Date() } },
  );
  if (!result.matchedCount) return errorResponse("Tài khoản không hợp lệ.", 401);

  // Tên nằm trong JWT phiên, nên cấp lại phiên để /api/auth/me trả tên mới.
  const user = { id: auth.user.id, email: auth.user.email, name: parsed.data.name };
  await createSession(user);
  return Response.json({ user });
}
