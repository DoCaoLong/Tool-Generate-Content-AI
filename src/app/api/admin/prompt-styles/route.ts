import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import { errorResponse } from "@/lib/server-utils";
import { kolStyles } from "@/lib/kol-styles";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  style: z.string().trim().max(2000).default(""),
  style_vi: z.string().trim().max(2000).default(""),
  content: z.string().trim().min(10).max(20000),
  profileImgUrl: z.string().trim().max(500).optional().default(""),
  isActive: z.boolean().default(true),
  sourceId: z.string().trim().max(80).optional(),
});

function serialize(doc: Record<string, unknown> & { _id: { toString(): string } }) {
  return {
    id: String(doc._id),
    sourceId: doc.sourceId ? String(doc.sourceId) : null,
    name: String(doc.name || ""),
    style: String(doc.style || ""),
    style_vi: String(doc.style_vi || ""),
    content: String(doc.content || ""),
    profileImgUrl: String(doc.profileImgUrl || ""),
    isActive: doc.isActive !== false,
    origin: doc.origin === "file" ? "file" : "db",
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const dbStyles = await (await getDb()).collection("prompt_styles").find({ deleted: { $ne: true } }).sort({ updatedAt: -1 }).toArray();
  const bySource = new Set(dbStyles.map((style) => String(style.sourceId || style._id)));
  const builtins = kolStyles
    .filter((style) => !bySource.has(style.id))
    .map((style) => ({
      id: style.id,
      sourceId: style.id,
      name: style.name,
      style: style.style || "",
      style_vi: style.style_vi || "",
      content: style.content,
      profileImgUrl: style.profileImgUrl || "",
      isActive: true,
      origin: "file" as const,
    }));
  return Response.json({
    styles: [...dbStyles.map((style) => serialize(style as never)), ...builtins],
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Thông tin style prompt chưa hợp lệ.");
  const now = new Date();
  const document = { ...parsed.data, createdAt: now, updatedAt: now };
  const result = await (await getDb()).collection("prompt_styles").insertOne(document);
  return Response.json({ style: serialize({ _id: result.insertedId, ...document }) }, { status: 201 });
}
