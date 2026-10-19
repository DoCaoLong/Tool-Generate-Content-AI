import { normalizeProjectContentOptions } from "@/lib/project-options";
import type { Project } from "@/lib/types";
import { normalizeWritingStyle } from "@/lib/writing-style";

export function serializeProject(project: { _id: { toHexString(): string }; [key: string]: unknown }): Project {
  const raw = project as {
    name?: unknown;
    description?: unknown;
    imageUrl?: unknown;
    contentOptions?: unknown;
    writingStyle?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  const createdAt = raw.createdAt instanceof Date ? raw.createdAt : new Date();
  const updatedAt = raw.updatedAt instanceof Date ? raw.updatedAt : createdAt;
  return {
    id: project._id.toHexString(),
    name: typeof raw.name === "string" ? raw.name : "",
    description: typeof raw.description === "string" ? raw.description : "",
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : null,
    contentOptions: normalizeProjectContentOptions(raw.contentOptions as Partial<Project["contentOptions"]> | null),
    writingStyle: normalizeWritingStyle(raw.writingStyle),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
