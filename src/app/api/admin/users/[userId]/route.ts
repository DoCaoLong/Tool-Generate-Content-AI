import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId } from "@/lib/server-utils";

const patchSchema = z.object({
  disabled: z.boolean().optional(),
  name: z.string().trim().min(2).max(60).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { userId } = await context.params;
  const id = parseObjectId(userId);
  if (!id) return errorResponse("User không hợp lệ.");
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Dữ liệu cập nhật chưa hợp lệ.");
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof parsed.data.disabled === "boolean") update.disabled = parsed.data.disabled;
  if (parsed.data.name) update.name = parsed.data.name;
  const db = await getDb();
  const result = await db.collection("users").findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: "after", projection: { passwordHash: 0 } });
  if (!result) return errorResponse("Không tìm thấy user.", 404);
  return Response.json({
    user: {
      id: result._id.toHexString(),
      name: String(result.name || ""),
      email: String(result.email || ""),
      disabled: Boolean(result.disabled),
      createdAt: result.createdAt instanceof Date ? result.createdAt.toISOString() : null,
    },
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { userId } = await context.params;
  const id = parseObjectId(userId);
  if (!id) return errorResponse("User không hợp lệ.");
  const db = await getDb();
  const account = await db.collection("users").findOne({ _id: id });
  if (!account) return errorResponse("Không tìm thấy user.", 404);
  const uid = id.toHexString();
  await Promise.all([
    db.collection("projects").deleteMany({ userId: uid }),
    db.collection("generations").deleteMany({ userId: uid }),
    db.collection("styles").deleteMany({ userId: uid }),
    db.collection("users").deleteOne({ _id: id }),
  ]);
  return Response.json({ ok: true });
}
