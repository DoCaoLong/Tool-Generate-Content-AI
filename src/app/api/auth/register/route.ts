import { hash } from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { errorResponse } from "@/lib/server-utils";
import { clientIp, verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  turnstileToken: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Thông tin đăng ký chưa hợp lệ.");
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken, clientIp(request)))) {
    return errorResponse("Xác thực Turnstile chưa hợp lệ. Hãy thử lại.", 403);
  }

  const db = await getDb();
  const existing = await db.collection("users").findOne({ email: parsed.data.email });
  if (existing) return errorResponse("Email này đã được sử dụng.", 409);

  const now = new Date();
  let result;
  try {
    result = await db.collection("users").insertOne({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hash(parsed.data.password, 12),
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      return errorResponse("Email này đã được sử dụng.", 409);
    }
    throw error;
  }

  const user = { id: result.insertedId.toHexString(), name: parsed.data.name, email: parsed.data.email };
  await createSession(user);
  return Response.json({ user }, { status: 201 });
}
