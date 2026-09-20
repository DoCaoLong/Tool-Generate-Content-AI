import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId, requireUser } from "@/lib/server-utils";

type RouteContext = { params: Promise<{ styleId: string }> };

export async function DELETE(_: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = parseObjectId((await context.params).styleId);
  if (!id) return errorResponse("Phong cách không hợp lệ.", 404);
  const result = await (await getDb()).collection("styles").deleteOne({ _id: id, userId: auth.user.id });
  if (!result.deletedCount) return errorResponse("Không tìm thấy phong cách.", 404);
  return Response.json({ ok: true });
}
