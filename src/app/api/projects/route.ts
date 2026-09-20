import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, requireUser } from "@/lib/server-utils";
import { defaultProjectContentOptions, normalizeProjectContentOptions } from "@/lib/project-options";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).default(""),
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
    projects: projects.map((project) => ({
      id: project._id.toHexString(),
      name: project.name,
      description: project.description || "",
      contentOptions: normalizeProjectContentOptions(project.contentOptions),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Thông tin dự án chưa hợp lệ.");

  const now = new Date();
  const result = await (await getDb()).collection("projects").insertOne({
    userId: auth.user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    contentOptions: defaultProjectContentOptions,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json(
    {
      project: {
        id: result.insertedId.toHexString(),
        ...parsed.data,
        contentOptions: defaultProjectContentOptions,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    },
    { status: 201 },
  );
}
