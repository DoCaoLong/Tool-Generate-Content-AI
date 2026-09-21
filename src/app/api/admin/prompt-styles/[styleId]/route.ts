import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import { kolStyles } from "@/lib/kol-styles";
import { errorResponse, parseObjectId } from "@/lib/server-utils";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  style: z.string().trim().max(2000).optional(),
  style_vi: z.string().trim().max(2000).optional(),
  content: z.string().trim().min(10).max(20000).optional(),
  profileImgUrl: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ styleId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { styleId } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Dữ liệu cập nhật chưa hợp lệ.");
  const db = await getDb();
  const objectId = parseObjectId(styleId);
  const existing = objectId
    ? await db.collection("prompt_styles").findOne({ _id: objectId })
    : await db.collection("prompt_styles").findOne({ sourceId: styleId });
  const now = new Date();
  if (existing) {
    const result = await db.collection("prompt_styles").findOneAndUpdate(
      { _id: existing._id },
      { $set: { ...parsed.data, updatedAt: now, deleted: false } },
      { returnDocument: "after" },
    );
    if (!result) return errorResponse("Không tìm thấy style prompt.", 404);
    return Response.json({ style: { id: String(result._id), ...parsed.data, name: String(result.name) } });
  }
  const builtin = kolStyles.find((style) => style.id === styleId);
  if (!builtin) return errorResponse("Không tìm thấy style prompt.", 404);
  const document = {
    sourceId: builtin.id,
    name: parsed.data.name ?? builtin.name,
    style: parsed.data.style ?? builtin.style ?? "",
    style_vi: parsed.data.style_vi ?? builtin.style_vi ?? "",
    content: parsed.data.content ?? builtin.content,
    profileImgUrl: parsed.data.profileImgUrl ?? builtin.profileImgUrl ?? "",
    isActive: parsed.data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  const inserted = await db.collection("prompt_styles").insertOne(document);
  return Response.json({ style: { id: inserted.insertedId.toHexString(), ...document } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ styleId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { styleId } = await context.params;
  const db = await getDb();
  const objectId = parseObjectId(styleId);
  if (objectId) {
    const result = await db.collection("prompt_styles").deleteOne({ _id: objectId });
    if (result.deletedCount) return Response.json({ ok: true });
  }
  const existing = await db.collection("prompt_styles").findOne({ sourceId: styleId });
  if (existing) {
    await db.collection("prompt_styles").deleteOne({ _id: existing._id });
    return Response.json({ ok: true });
  }
  const builtin = kolStyles.find((style) => style.id === styleId);
  if (!builtin) return errorResponse("Không tìm thấy style prompt.", 404);
  await db.collection("prompt_styles").insertOne({ sourceId: styleId, deleted: true, name: builtin.name, content: builtin.content, createdAt: new Date(), updatedAt: new Date() });
  return Response.json({ ok: true });
}
