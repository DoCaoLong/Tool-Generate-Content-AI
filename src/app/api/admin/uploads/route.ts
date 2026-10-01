import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/admin-auth";
import { extensionForPromptImage, promptUploadDir } from "@/lib/prompt-image";
import { errorResponse } from "@/lib/server-utils";

export const runtime = "nodejs";

function asUploadFile(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string") return null;
  if (typeof value.arrayBuffer !== "function" || typeof value.size !== "number") return null;
  const named = value as Blob & { name?: string };
  return {
    size: named.size,
    type: named.type || "",
    name: typeof named.name === "string" ? named.name : "",
    arrayBuffer: () => named.arrayBuffer(),
  };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Không đọc được file ảnh. Hãy chọn JPG, PNG, WEBP hoặc GIF dưới 2MB.");
  }
  const file = asUploadFile(form.get("file"));
  if (!file) return errorResponse("Hãy chọn một file ảnh.");
  if (file.size <= 0) return errorResponse("File ảnh trống.");
  if (file.size > 2_000_000) return errorResponse("Ảnh tối đa 2MB.");
  const ext = extensionForPromptImage(file);
  if (!ext) return errorResponse("Chỉ nhận JPG, PNG, WEBP hoặc GIF.");
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = promptUploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/uploads/prompts/${name}` });
}
