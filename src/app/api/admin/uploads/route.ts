import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/server-utils";

const allowed = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse("Hãy chọn một file ảnh.");
  if (file.size > 2_000_000) return errorResponse("Ảnh tối đa 2MB.");
  const ext = allowed.get(file.type);
  if (!ext) return errorResponse("Chỉ nhận JPG, PNG, WEBP hoặc GIF.");
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "prompts");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/uploads/prompts/${name}` });
}
