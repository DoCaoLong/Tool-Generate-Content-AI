export type StyleCategory = "kol" | "writing" | "project";

export function resolveStyleCategory(style: {
  category?: string | null;
  kind?: string | null;
  username?: string | null;
  projectName?: string | null;
}): StyleCategory {
  if (style.category === "kol" || style.category === "writing" || style.category === "project") return style.category;
  if (style.projectName) return "project";
  if (style.kind === "discovered" && style.username) return "kol";
  return "writing";
}
