import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId, requireUser } from "@/lib/server-utils";

type RouteContext = { params: Promise<{ projectId: string }> };

const optionsSchema = z.object({
  keywords: z.string().max(1000).default(""),
  rules: z.string().max(5000).default(""),
  documents: z.string().max(50000).default(""),
  language: z.string().max(40).default("vi"),
  tone: z.string().max(60).default("natural"),
  length: z.string().max(40).default("medium"),
  customInstructions: z.string().max(4000).default(""),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = parseObjectId((await context.params).projectId);
  if (!id) return errorResponse("Dự án không hợp lệ.", 404);

  const parsed = optionsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Tuỳ chọn nội dung chưa hợp lệ.");

  const result = await (await getDb()).collection("projects").updateOne(
    { _id: id, userId: auth.user.id },
    { $set: { contentOptions: parsed.data } },
  );
  if (!result.matchedCount) return errorResponse("Không tìm thấy dự án.", 404);

  return Response.json({ contentOptions: parsed.data });
}
