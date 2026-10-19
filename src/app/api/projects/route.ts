import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, requireUser } from "@/lib/server-utils";
import { serializeProject } from "@/lib/project-json";
import { defaultProjectContentOptions } from "@/lib/project-options";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).default(""),
  imageUrl: z.string().trim().max(500).nullable().optional(),
});

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const projects = await (await getDb())
    .collection("projects")
    .find({ userId: auth.user.id })
    .sort({ updatedAt: -1 })
    .toArray();

  return Response.json({
    projects: projects.map((project) => serializeProject(project)),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Thông tin dự án chưa hợp lệ.");

  const db = await getDb();
  const escaped = parsed.data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = await db.collection("projects").findOne({ userId: auth.user.id, name: { $regex: `^${escaped}$`, $options: "i" } });
  if (existing) return errorResponse(`Dự án “${existing.name}” đã tồn tại.`, 409);

  const now = new Date();
  const result = await db.collection("projects").insertOne({
    userId: auth.user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    imageUrl: parsed.data.imageUrl || null,
    contentOptions: defaultProjectContentOptions,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json(
    {
      project: serializeProject({
        _id: result.insertedId,
        name: parsed.data.name,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl || null,
        contentOptions: defaultProjectContentOptions,
        writingStyle: null,
        createdAt: now,
        updatedAt: now,
      }),
    },
    { status: 201 },
  );
}
