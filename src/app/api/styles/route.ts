import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, requireUser } from "@/lib/server-utils";

const sampleSchema = z.object({ id: z.string().max(100), text: z.string().trim().min(1).max(5000) });
const createSchema = z.object({
  kind: z.enum(["manual", "discovered"]),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).default(""),
  instruction: z.string().trim().min(10).max(5000),
  username: z.string().trim().max(30).nullable().default(null),
  projectName: z.string().trim().max(120).nullable().default(null),
  samples: z.array(sampleSchema).max(8).default([]),
});

function serialize(style: Record<string, unknown> & { _id: { toHexString(): string }; createdAt: Date; updatedAt: Date }) {
  return {
    id: style._id.toHexString(),
    kind: style.kind,
    name: style.name,
    description: style.description || "",
    instruction: style.instruction,
    username: style.username || null,
    projectName: style.projectName || null,
    samples: style.samples || [],
    createdAt: style.createdAt.toISOString(),
    updatedAt: style.updatedAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const styles = await (await getDb()).collection("styles").find({ userId: auth.user.id }).sort({ updatedAt: -1 }).toArray();
  return Response.json({ styles: styles.map((style) => serialize(style as never)) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Thông tin phong cách chưa hợp lệ.");
  if (parsed.data.kind === "discovered" && (!parsed.data.username || !parsed.data.samples.length)) {
    return errorResponse("Phong cách khám phá cần username và ít nhất một bài mẫu.");
  }

  const now = new Date();
  const document = { userId: auth.user.id, ...parsed.data, createdAt: now, updatedAt: now };
  const result = await (await getDb()).collection("styles").insertOne(document);
  return Response.json({ style: serialize({ _id: result.insertedId, ...document }) }, { status: 201 });
}
