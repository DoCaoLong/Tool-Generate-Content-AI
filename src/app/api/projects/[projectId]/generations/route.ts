import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { errorResponse, parseObjectId, requireUser } from "@/lib/server-utils";

type RouteContext = { params: Promise<{ projectId: string }> };

const inputSchema = z.object({
  mode: z.enum(["new", "rewrite"]).default("new"),
  kolStyle: z.object({
    id: z.string().max(100),
    name: z.string().max(100),
    instruction: z.string().max(5000),
  }).nullable().default(null),
  discoveredStyle: z.object({
    username: z.string().max(30),
    projectName: z.string().max(120),
    samples: z.array(z.object({ id: z.string().max(100), text: z.string().max(5000) })).min(1).max(12),
  }).nullable().default(null),
  libraryStyle: z.object({
    id: z.string().max(100),
    name: z.string().max(100),
    instruction: z.string().max(5000),
    samples: z.array(z.object({ id: z.string().max(100), text: z.string().max(5000) })).max(8),
  }).nullable().default(null),
  topic: z.string().trim().min(1).max(500),
  sourceText: z.string().max(30000).default(""),
  rules: z.string().max(5000).default(""),
  documents: z.string().max(50000).default(""),
  keywords: z.string().max(1000).default(""),
  language: z.string().max(40),
  tone: z.string().max(60),
  length: z.string().max(40),
  customInstructions: z.string().max(4000).default(""),
  provider: z.enum(["openai", "gemini", "deepseek", "anthropic", "xai", "openrouter"]),
  model: z.string().max(100),
});

const createSchema = z.object({
  input: inputSchema,
  output: z.string().min(1).max(100000),
});

async function ownedProject(projectId: string, userId: string) {
  const id = parseObjectId(projectId);
  if (!id) return null;
  const db = await getDb();
  const project = await db.collection("projects").findOne({ _id: id, userId });
  return project ? { db, id } : null;
}

export async function GET(_: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const project = await ownedProject((await context.params).projectId, auth.user.id);
  if (!project) return errorResponse("Không tìm thấy dự án.", 404);

  const generations = await project.db
    .collection("generations")
    .find({ userId: auth.user.id, projectId: project.id })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  generations.reverse();

  return Response.json({
    generations: generations.map((item) => ({
      id: item._id.toHexString(),
      projectId: project.id.toHexString(),
      input: item.input,
      output: item.output,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const project = await ownedProject((await context.params).projectId, auth.user.id);
  if (!project) return errorResponse("Không tìm thấy dự án.", 404);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Nội dung lưu lịch sử chưa hợp lệ.");

  const createdAt = new Date();
  const result = await project.db.collection("generations").insertOne({
    userId: auth.user.id,
    projectId: project.id,
    ...parsed.data,
    createdAt,
  });
  await project.db.collection("projects").updateOne(
    { _id: project.id, userId: auth.user.id },
    { $set: { updatedAt: createdAt } },
  );

  return Response.json(
    {
      generation: {
        id: result.insertedId.toHexString(),
        projectId: project.id.toHexString(),
        ...parsed.data,
        createdAt: createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
