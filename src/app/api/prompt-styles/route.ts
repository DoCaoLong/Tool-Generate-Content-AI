import { getDb } from "@/lib/mongodb";
import { kolStyles } from "@/lib/kol-styles";
import { requireUser } from "@/lib/server-utils";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const dbStyles = await (await getDb()).collection("prompt_styles").find({ isActive: { $ne: false } }).sort({ updatedAt: -1 }).toArray();
  const fromFile = kolStyles.map((style) => ({
    id: style.id,
    name: style.name,
    style: style.style || "",
    style_vi: style.style_vi || "",
    content: style.content,
  }));
  if (!dbStyles.length) return Response.json({ styles: fromFile });
  const merged = new Map(fromFile.map((style) => [style.id, style]));
  for (const style of dbStyles) {
    merged.set(style._id.toHexString(), {
      id: style._id.toHexString(),
      name: String(style.name || ""),
      style: String(style.style || ""),
      style_vi: String(style.style_vi || ""),
      content: String(style.content || ""),
    });
  }
  return Response.json({ styles: Array.from(merged.values()) });
}
