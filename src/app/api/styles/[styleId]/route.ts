import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId, requireUser } from "@/lib/server-utils";

type RouteContext = { params: Promise<{ styleId: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).default(""),
  instruction: z.string().trim().min(10).max(5000),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = parseObjectId((await context.params).styleId);
  if (!id) return errorResponse("Phong cách không hợp lệ.", 404);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Thông tin phong cách chưa hợp lệ.");

  const updatedAt = new Date();
  const result = await (await getDb()).collection("styles").findOneAndUpdate(
    { _id: id, userId: auth.user.id },
    { $set: { ...parsed.data, updatedAt } },
    { returnDocument: "after" },
  );
  if (!result) return errorResponse("Không tìm thấy phong cách.", 404);
  return Response.json({
    style: {
      id: result._id.toHexString(),
      kind: result.kind,
      name: result.name,
      description: result.description || "",
      instruction: result.instruction,
      username: result.username || null,
      projectName: result.projectName || null,
      samples: result.samples || [],
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = parseObjectId((await context.params).styleId);
  if (!id) return errorResponse("Phong cách không hợp lệ.", 404);
  const result = await (await getDb()).collection("styles").deleteOne({ _id: id, userId: auth.user.id });
  if (!result.deletedCount) return errorResponse("Không tìm thấy phong cách.", 404);
  return Response.json({ ok: true });
}
