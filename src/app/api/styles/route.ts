import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { fetchSorsaAvatars, normalizeSorsaAvatar } from "@/lib/sorsa-avatar";
import { resolveStyleCategory, type StyleCategory } from "@/lib/style-category";
import { errorResponse, requireUser } from "@/lib/server-utils";

const sampleSchema = z.object({ id: z.string().max(100), text: z.string().trim().min(1).max(5000) });
const createSchema = z.object({
  kind: z.enum(["manual", "discovered"]),
  category: z.enum(["kol", "writing", "project"]).optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).default(""),
  instruction: z.string().trim().min(10).max(5000),
  username: z.string().trim().max(30).nullable().default(null),
  projectName: z.string().trim().max(120).nullable().default(null),
  avatarUrl: z.string().trim().max(500).nullable().optional().default(null),
  samples: z.array(sampleSchema).max(20).default([]),
});

function serialize(style: Record<string, unknown> & { _id: { toHexString(): string }; createdAt: Date; updatedAt: Date }) {
  const category = resolveStyleCategory({
    category: typeof style.category === "string" ? style.category : null,
    kind: typeof style.kind === "string" ? style.kind : null,
    username: typeof style.username === "string" ? style.username : null,
    projectName: typeof style.projectName === "string" ? style.projectName : null,
  });
  return {
    id: style._id.toHexString(),
    kind: category === "writing" ? "manual" : style.kind,
    category,
    name: style.name,
    description: style.description || "",
    instruction: style.instruction,
    username: style.username || null,
    projectName: style.projectName || null,
    avatarUrl: normalizeSorsaAvatar(style.avatarUrl) || null,
    samples: style.samples || [],
    createdAt: style.createdAt.toISOString(),
    updatedAt: style.updatedAt.toISOString(),
  };
}

async function fillKolAvatars(styles: Array<Record<string, unknown> & { _id: ObjectId }>) {
  const missing = styles.filter((style) => {
    const category = resolveStyleCategory({
      category: typeof style.category === "string" ? style.category : null,
      kind: typeof style.kind === "string" ? style.kind : null,
      username: typeof style.username === "string" ? style.username : null,
      projectName: typeof style.projectName === "string" ? style.projectName : null,
    });
    const username = typeof style.username === "string" ? style.username.replace(/^@/, "") : "";
    return category === "kol" && /^[A-Za-z0-9_]{1,15}$/.test(username) && !normalizeSorsaAvatar(style.avatarUrl);
  });
  if (!missing.length) return;
  const found = await fetchSorsaAvatars(missing.map((style) => String(style.username)));
  const db = await getDb();
  await Promise.all(missing.map(async (style) => {
    const image = found.get(String(style.username).replace(/^@/, "").toLowerCase());
    if (!image) return;
    style.avatarUrl = image;
    await db.collection("styles").updateOne({ _id: style._id }, { $set: { avatarUrl: image } });
  }));
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const db = await getDb();
  const styles = await db.collection("styles").find({ userId: auth.user.id }).sort({ updatedAt: -1 }).toArray();
  try {
    await fillKolAvatars(styles);
  } catch {
    // Giữ danh sách phong cách khi Sorsa không trả ảnh.
  }
  return Response.json({ styles: styles.map((style) => serialize(style as never)) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Thông tin phong cách chưa hợp lệ.");
  const category: StyleCategory = parsed.data.category ?? resolveStyleCategory(parsed.data);
  if (category === "kol" && (!parsed.data.username || !parsed.data.samples.length)) {
    return errorResponse("Phong cách KOL cần username và ít nhất một bài mẫu.");
  }
  if (category === "project" && !parsed.data.samples.length) {
    return errorResponse("Phong cách dự án cần ít nhất một bài mẫu.");
  }
  if (category === "project" && !parsed.data.username && !parsed.data.projectName) {
    return errorResponse("Phong cách dự án cần username hoặc tên dự án.");
  }
  if (category === "writing" && (parsed.data.username || parsed.data.projectName) && (!parsed.data.username || !parsed.data.projectName || !parsed.data.samples.length)) {
    return errorResponse("Phong cách bài viết từ KOL và dự án cần cả hai username và ít nhất một bài mẫu.");
  }

  const now = new Date();
  const document = {
    userId: auth.user.id,
    ...parsed.data,
    category,
    kind: category === "writing" ? "manual" : "discovered",
    username: parsed.data.username,
    projectName: parsed.data.projectName,
    avatarUrl: normalizeSorsaAvatar(parsed.data.avatarUrl) || null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await (await getDb()).collection("styles").insertOne(document);
  return Response.json({ style: serialize({ _id: result.insertedId, ...document }) }, { status: 201 });
}
