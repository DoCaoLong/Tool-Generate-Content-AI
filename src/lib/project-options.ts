import type { ProjectContentOptions } from "@/lib/types";

export const defaultProjectContentOptions: ProjectContentOptions = {
  keywords: "",
  rules: "",
  documents: "",
  language: "vi",
  tone: "natural",
  length: "medium",
  customInstructions: "",
};

export function normalizeProjectContentOptions(value?: Partial<ProjectContentOptions> | null): ProjectContentOptions {
  return { ...defaultProjectContentOptions, ...value };
}
