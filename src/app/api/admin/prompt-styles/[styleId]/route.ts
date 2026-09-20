import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId } from "@/lib/server-utils";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  style: z.string().trim().max(2000).optional(),
  style_vi: z.string().trim().max(2000).optional(),
  content: z.string().trim().min(10).max(20000).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ styleId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { styleId } = await context.params;
  const id = parseObjectId(styleId);
  if (!id) return errorResponse("Style không hợp lệ.");
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Dữ liệu cập nhật chưa hợp lệ.");
  const result = await (await getDb()).collection("prompt_styles").findOneAndUpdate(
    { _id: id },
    { $set: { ...parsed.data, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) return errorResponse("Không tìm thấy style prompt.", 404);
  return Response.json({
    style: {
      id: result._id.toHexString(),
      name: String(result.name || ""),
      style: String(result.style || ""),
      style_vi: String(result.style_vi || ""),
      content: String(result.content || ""),
      isActive: result.isActive !== false,
    },
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ styleId: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { styleId } = await context.params;
  const id = parseObjectId(styleId);
  if (!id) return errorResponse("Style không hợp lệ.");
  const result = await (await getDb()).collection("prompt_styles").deleteOne({ _id: id });
  if (!result.deletedCount) return errorResponse("Không tìm thấy style prompt.", 404);
  return Response.json({ ok: true });
}
