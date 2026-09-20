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
  isActive: z.boolean().default(true),
});

function serialize(doc: Record<string, unknown> & { _id: { toHexString(): string } }) {
  return {
    id: doc._id.toHexString(),
    name: String(doc.name || ""),
    style: String(doc.style || ""),
    style_vi: String(doc.style_vi || ""),
    content: String(doc.content || ""),
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const styles = await (await getDb()).collection("prompt_styles").find({}).sort({ updatedAt: -1 }).toArray();
  return Response.json({
    styles: styles.map((style) => serialize(style as never)),
    builtins: kolStyles.map((style) => ({ id: style.id, name: style.name, style: style.style || "", style_vi: style.style_vi || "", content: style.content })),
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
