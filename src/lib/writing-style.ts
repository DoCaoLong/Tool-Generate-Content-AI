import { findStyleForProject, projectHasNucleusBrief } from "@/lib/style-match";
import { resolveStyleCategory } from "@/lib/style-category";
import type { Project, ProjectWritingStyle, SavedStyle } from "@/lib/types";

export function emptyWritingStyle(): ProjectWritingStyle {
  return { kolId: null, savedStyleId: null, discovered: null, source: "manual" };
}

export function writingStyleChosen(style: ProjectWritingStyle | null | undefined): style is ProjectWritingStyle {
  return Boolean(style && (style.kolId || style.savedStyleId || style.discovered));
}

function cleanId(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : null;
}

function cleanDiscovered(value: unknown): ProjectWritingStyle["discovered"] {
  if (!value || typeof value !== "object") return null;
  const raw = value as { username?: unknown; projectName?: unknown; samples?: unknown };
  const username = typeof raw.username === "string" ? raw.username.trim().replace(/^@/, "").slice(0, 15) : "";
  const projectName = typeof raw.projectName === "string" ? raw.projectName.trim().slice(0, 120) : "";
  const samples = Array.isArray(raw.samples) ? raw.samples.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const sample = item as { id?: unknown; text?: unknown };
    const id = typeof sample.id === "string" ? sample.id.slice(0, 100) : "";
    const text = typeof sample.text === "string" ? sample.text.slice(0, 5000) : "";
    return id && text ? [{ id, text }] : [];
  }).slice(0, 20) : [];
  if (!username && !projectName && !samples.length) return null;
  return { username, projectName, samples };
}

export function normalizeWritingStyle(value: unknown): ProjectWritingStyle | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { kolId?: unknown; savedStyleId?: unknown; discovered?: unknown; source?: unknown };
  if (raw.source !== "manual" && raw.source !== "auto") return null;
  return {
    kolId: cleanId(raw.kolId),
    savedStyleId: cleanId(raw.savedStyleId),
    discovered: cleanDiscovered(raw.discovered),
    source: raw.source,
  };
}

export function writingStyleEqual(left: ProjectWritingStyle | null | undefined, right: ProjectWritingStyle | null | undefined) {
  const a = writingStyleChosen(left) ? left : null;
  const b = writingStyleChosen(right) ? right : null;
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.source !== b.source || a.kolId !== b.kolId || a.savedStyleId !== b.savedStyleId) return false;
  if (!a.discovered && !b.discovered) return true;
  if (!a.discovered || !b.discovered) return false;
  if (a.discovered.username !== b.discovered.username || a.discovered.projectName !== b.discovered.projectName) return false;
  if (a.discovered.samples.length !== b.discovered.samples.length) return false;
  return a.discovered.samples.every((sample, index) => sample.id === b.discovered?.samples[index]?.id && sample.text === b.discovered?.samples[index]?.text);
}

function usableMigrate(style: ProjectWritingStyle | null, styles: SavedStyle[], stylesReady: boolean) {
  if (!writingStyleChosen(style)) return null;
  if (!stylesReady || !style.savedStyleId || styles.some((item) => item.id === style.savedStyleId)) return style;
  if (style.kolId || style.discovered) return { ...style, savedStyleId: null };
  return null;
}

export function displayWritingStyle(project: Project, styles: SavedStyle[], migrate: ProjectWritingStyle | null, stylesReady: boolean) {
  const stored = project.writingStyle ?? null;
  if (stored && !writingStyleChosen(stored)) return null;
  if (writingStyleChosen(stored)) {
    const usable = usableMigrate(stored, styles, stylesReady);
    if (usable) return usable;
    if (stored.source === "manual") return null;
  } else {
    const migrated = usableMigrate(migrate, styles, stylesReady);
    if (migrated) return migrated;
    if (!stylesReady) return null;
  }
  if (!stylesReady) return null;
  const match = findStyleForProject(styles, project);
  if (!match || (projectHasNucleusBrief(project) && resolveStyleCategory(match) === "kol")) return null;
  return { kolId: null, savedStyleId: match.id, discovered: null, source: "auto" } satisfies ProjectWritingStyle;
}
