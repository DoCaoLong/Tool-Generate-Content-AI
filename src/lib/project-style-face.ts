import { kolAvatarSrc } from "@/lib/kol-styles";
import { projectStyleLabel, studioProjectImage } from "@/lib/project-style-label";
import type { Project, SavedStyle } from "@/lib/types";

export function projectStyleFace(style: SavedStyle, projects: Project[]) {
  const label = projectStyleLabel(style);
  const userSrc = kolAvatarSrc({ username: style.username, avatarUrl: style.avatarUrl });
  const storedProject = kolAvatarSrc({ username: label.projectHandle || style.projectName, avatarUrl: style.projectAvatarUrl });
  const studio = storedProject ? "" : studioProjectImage(projects, style.projectName);
  const projectSrc = storedProject || (studio ? kolAvatarSrc({ avatarUrl: studio }) : "");
  return { ...label, userSrc, projectSrc };
}
