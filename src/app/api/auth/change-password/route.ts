import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId, requireUser } from "@/lib/server-utils";
import { assertAppRequest } from "@/lib/x-api-guard";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const blocked = assertAppRequest(request);
  if (blocked) return blocked;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Mật khẩu mới cần ít nhất 8 ký tự.");
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return errorResponse("Mật khẩu mới cần khác mật khẩu hiện tại.");
  }

  const id = parseObjectId(auth.user.id);
  if (!id) return errorResponse("Tài khoản không hợp lệ.", 401);
  const db = await getDb();
  const account = await db.collection("users").findOne({ _id: id });
  if (!account || account.disabled) return errorResponse("Tài khoản không hợp lệ.", 401);
  if (typeof account.passwordHash !== "string" || !(await compare(parsed.data.currentPassword, account.passwordHash))) {
    return errorResponse("Mật khẩu hiện tại không đúng.", 403);
  }

  await db.collection("users").updateOne(
    { _id: id },
    { $set: { passwordHash: await hash(parsed.data.newPassword, 12), updatedAt: new Date() } },
  );
  return Response.json({ ok: true });
}
