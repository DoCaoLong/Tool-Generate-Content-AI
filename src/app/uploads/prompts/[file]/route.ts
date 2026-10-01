import { readFile } from "node:fs/promises";
import path from "node:path";
import { isSafePromptImageName, legacyPromptUploadDir, promptImageContentType, promptUploadDir } from "@/lib/prompt-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readFirst(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      // Try the next location. Production does not serve files added to public/ after boot.
    }
  }
  return null;
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const name = path.basename(file);
  const contentType = promptImageContentType(name);
  if (name !== file || !contentType || !isSafePromptImageName(name)) {
    return new Response("Not found", { status: 404 });
  }
  const bytes = await readFirst([
    path.join(promptUploadDir(), name),
    path.join(legacyPromptUploadDir(), name),
  ]);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
