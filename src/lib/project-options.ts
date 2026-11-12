import type { ProjectContentOptions } from "@/lib/types";

export const defaultProjectContentOptions: ProjectContentOptions = {
  keywords: "",
  rules: "",
  documents: "",
  language: "vi",
  tone: "natural",
  length: "medium",
  customInstructions: "",
  writeFromLatest: false,
};

export function normalizeProjectContentOptions(value?: Partial<ProjectContentOptions> | null): ProjectContentOptions {
  return { ...defaultProjectContentOptions, ...value };
}
