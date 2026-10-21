import { projectXHandle } from "@/lib/radar-query";
import { resolveStyleCategory } from "@/lib/style-category";

const handlePattern = /^[A-Za-z0-9_]{1,15}$/;

export function xHandle(value: string | null | undefined) {
  const handle = (value || "").trim().replace(/^@/, "");
  return handlePattern.test(handle) ? handle : "";
}

function sameText(left: string, right: string) {
  return Boolean(left) && left.toLowerCase() === right.toLowerCase();
}

export function projectStyleLabel(style: { name: string; username: string | null; projectName: string | null }) {
  const user = xHandle(style.username);
  const projectHandle = xHandle(style.projectName);
  const projectText = (style.projectName || "").trim().replace(/^@/, "");
  const same = Boolean(user) && (sameText(user, projectHandle) || sameText(user, projectText));
  const known = new Set<string>();
  if (user) known.add(user.toLowerCase());
  if (projectHandle) known.add(projectHandle.toLowerCase());
  if (projectText) known.add(projectText.toLowerCase());

  const parts = (style.name || "").split(/\s*[·|]\s*|\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  const leftover = parts.filter((part) => {
    const bare = part.replace(/^@/, "").toLowerCase();
    const handle = xHandle(part);
    if (handle && known.has(handle.toLowerCase())) return false;
    return !known.has(bare);
  }).join(" · ").trim();
  const handlesOnly = parts.length > 0 && parts.every((part) => Boolean(xHandle(part)));

  let title = "";
  if (!same && projectText) title = projectHandle ? `@${projectHandle}` : projectText;
  else if (leftover && !handlesOnly) title = leftover;
  else if (user) title = `@${user}`;
  else title = (style.name || "").trim() || "Dự án";

  const meta = user && !sameText(user, title.replace(/^@/, "")) ? `@${user}` : "";
  return {
    title,
    meta,
    userHandle: user,
    projectHandle: same ? user : projectHandle,
    distinct: Boolean(user) && Boolean(projectText) && !same,
  };
}

export function styleDisplayName(style: {
  category?: string | null;
  kind?: string | null;
  name: string;
  username?: string | null;
  projectName?: string | null;
}) {
  if (resolveStyleCategory(style) !== "project") return style.name;
  return projectStyleLabel({
    name: style.name,
    username: style.username || null,
    projectName: style.projectName || null,
  }).title;
}

export function studioProjectImage(
  projects: Array<{ name: string; imageUrl: string | null; contentOptions?: { keywords?: string; documents?: string } | null }>,
  projectName: string | null,
) {
  const raw = (projectName || "").trim();
  const handle = xHandle(raw).toLowerCase();
  const text = raw.replace(/^@/, "").toLowerCase();
  if (!text) return "";
  const match = projects.find((project) => {
    const name = project.name.trim().toLowerCase();
    const projectHandle = projectXHandle(project.contentOptions?.keywords || "", project.contentOptions?.documents || "").toLowerCase();
    if (handle && (projectHandle === handle || name === handle)) return true;
    return name === text;
  });
  return match?.imageUrl || "";
}
