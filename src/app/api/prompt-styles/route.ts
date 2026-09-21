import { getDb } from "@/lib/mongodb";
import { kolStyles } from "@/lib/kol-styles";
import { requireUser } from "@/lib/server-utils";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const dbStyles = await (await getDb()).collection("prompt_styles").find({}).sort({ updatedAt: -1 }).toArray();
  const deleted = new Set(dbStyles.filter((style) => style.deleted).map((style) => String(style.sourceId || "")));
  const overridden = new Set(dbStyles.filter((style) => !style.deleted && style.sourceId).map((style) => String(style.sourceId)));
  const fromFile = kolStyles
    .filter((style) => !deleted.has(style.id) && !overridden.has(style.id))
    .map((style) => ({
      id: style.id,
      name: style.name,
      style: style.style || "",
      style_vi: style.style_vi || "",
      content: style.content,
      profileImgUrl: style.profileImgUrl || "",
    }));
  const fromDb = dbStyles
    .filter((style) => !style.deleted && style.isActive !== false)
    .map((style) => ({
      id: String(style._id),
      name: String(style.name || ""),
      style: String(style.style || ""),
      style_vi: String(style.style_vi || ""),
      content: String(style.content || ""),
      profileImgUrl: String(style.profileImgUrl || ""),
    }));
  return Response.json({ styles: [...fromDb, ...fromFile] });
}
