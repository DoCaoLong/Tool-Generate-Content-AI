import type { Project, SavedStyle } from "@/lib/types";

function normalizeMention(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function collectHandles(text: string) {
  const tokens = new Set<string>();
  for (const match of text.matchAll(/@([A-Za-z0-9_]{1,15})/g)) tokens.add(match[1].toLowerCase());
  const slug = text.match(/--- Nucleus:\s*([a-z0-9-]{1,80})\s*---/i);
  if (slug) tokens.add(slug[1].toLowerCase());
  const xLine = text.match(/(?:^|\n)X:\s*@?([A-Za-z0-9_]{1,15})/i);
  if (xLine) tokens.add(xLine[1].toLowerCase());
  const slugLine = text.match(/(?:^|\n)Slug:\s*([a-z0-9-]{1,80})/i);
  if (slugLine) tokens.add(slugLine[1].toLowerCase());
  return tokens;
}

export function styleMentionTokens(style: SavedStyle) {
  const tokens = new Set<string>();
  if (style.projectName) tokens.add(normalizeMention(style.projectName));
  if (style.username) tokens.add(normalizeMention(style.username));
  for (const token of collectHandles(`${style.name} ${style.projectName || ""} ${style.instruction}`)) tokens.add(token);
  tokens.delete("");
  return tokens;
}

export function projectMentionTokens(project: Project) {
  const tokens = new Set<string>(collectHandles(`${project.contentOptions.keywords}\n${project.contentOptions.documents}`));
  const name = normalizeMention(project.name);
  if (name) tokens.add(name);
  for (const part of project.contentOptions.keywords.split(/[\n,]/)) {
    const token = normalizeMention(part);
    if (token) tokens.add(token);
  }
  tokens.delete("");
  return tokens;
}

export function findStyleForProject(styles: SavedStyle[], project: Project) {
  const projectTokens = projectMentionTokens(project);
  if (!projectTokens.size) return null;
  return styles.find((style) => {
    const styleTokens = styleMentionTokens(style);
    if (!styleTokens.size) return false;
    for (const token of styleTokens) {
      if (projectTokens.has(token)) return true;
    }
    return false;
  }) || null;
}
