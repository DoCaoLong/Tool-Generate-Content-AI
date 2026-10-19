import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId, requireUser } from "@/lib/server-utils";
import { normalizeWritingStyle } from "@/lib/writing-style";

type RouteContext = { params: Promise<{ projectId: string }> };

const writingStyleSchema = z.object({
  writingStyle: z.union([
    z.null(),
    z.object({
      kolId: z.string().trim().max(80).nullable(),
      savedStyleId: z.string().trim().max(40).nullable(),
      discovered: z.object({
        username: z.string().trim().max(15),
        projectName: z.string().trim().max(120),
        samples: z.array(z.object({ id: z.string().max(100), text: z.string().max(5000) })).max(20),
      }).nullable(),
      source: z.enum(["manual", "auto"]),
    }),
  ]),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = parseObjectId((await context.params).projectId);
  if (!id) return errorResponse("Dự án không hợp lệ.", 404);

  const parsed = writingStyleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Phong cách của dự án chưa hợp lệ.");

  const writingStyle = normalizeWritingStyle(parsed.data.writingStyle);
  if (writingStyle?.savedStyleId) {
    const styleId = parseObjectId(writingStyle.savedStyleId);
    if (!styleId) return errorResponse("Phong cách không còn trong thư viện.");
    const owned = await (await getDb()).collection("styles").findOne({ _id: styleId, userId: auth.user.id }, { projection: { _id: 1 } });
    if (!owned) return errorResponse("Phong cách không còn trong thư viện.");
  }

  const result = await (await getDb()).collection("projects").updateOne(
    { _id: id, userId: auth.user.id },
    { $set: { writingStyle } },
  );
  if (!result.matchedCount) return errorResponse("Không tìm thấy dự án.", 404);
  return Response.json({ writingStyle });
}
