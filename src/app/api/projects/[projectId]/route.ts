import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId, requireUser } from "@/lib/server-utils";
import { normalizeProjectContentOptions } from "@/lib/project-options";

type RouteContext = { params: Promise<{ projectId: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(240).optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = parseObjectId((await context.params).projectId);
  if (!id) return errorResponse("Dự án không hợp lệ.", 404);

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Thông tin dự án chưa hợp lệ.");
  if (!parsed.data.name && parsed.data.description === undefined && parsed.data.imageUrl === undefined) {
    return errorResponse("Thông tin dự án chưa hợp lệ.");
  }

  const updatedAt = new Date();
  const result = await (await getDb()).collection("projects").findOneAndUpdate(
    { _id: id, userId: auth.user.id },
    { $set: { ...parsed.data, updatedAt } },
    { returnDocument: "after" },
  );
  if (!result) return errorResponse("Không tìm thấy dự án.", 404);

  return Response.json({
    project: {
      id: result._id.toHexString(),
      name: result.name,
      description: result.description || "",
      imageUrl: result.imageUrl || null,
      contentOptions: normalizeProjectContentOptions(result.contentOptions),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = parseObjectId((await context.params).projectId);
  if (!id) return errorResponse("Dự án không hợp lệ.", 404);

  const db = await getDb();
  const result = await db.collection("projects").deleteOne({ _id: id, userId: auth.user.id });
  if (!result.deletedCount) return errorResponse("Không tìm thấy dự án.", 404);

  await db.collection("generations").deleteMany({ projectId: id, userId: auth.user.id });
  return Response.json({ ok: true });
}
