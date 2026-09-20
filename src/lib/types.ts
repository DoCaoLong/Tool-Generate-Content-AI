export type Provider = "openai" | "gemini" | "deepseek" | "anthropic" | "xai" | "openrouter";
export type ContentMode = "new" | "rewrite";

export interface DiscoveredTweet {
  id: string;
  text: string;
  createdAt: string;
  username: string;
  displayName: string;
  likes: number;
  reposts: number;
  replies: number;
  views: number;
}

export interface DiscoveredStyle {
  username: string;
  projectName: string;
  samples: Array<{ id: string; text: string }>;
}

export interface SavedStyle {
  id: string;
  kind: "manual" | "discovered";
  name: string;
  description: string;
  instruction: string;
  username: string | null;
  projectName: string | null;
  samples: Array<{ id: string; text: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface ProjectContentOptions {
  keywords: string;
  rules: string;
  documents: string;
  language: string;
  tone: string;
  length: string;
  customInstructions: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  contentOptions: ProjectContentOptions;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationInput {
  mode: ContentMode;
  kolStyle: {
    id: string;
    name: string;
    instruction: string;
  } | null;
  discoveredStyle: DiscoveredStyle | null;
  libraryStyle: {
    id: string;
    name: string;
    instruction: string;
    samples: Array<{ id: string; text: string }>;
  } | null;
  topic: string;
  sourceText: string;
  rules: string;
  documents: string;
  keywords: string;
  language: string;
  tone: string;
  length: string;
  customInstructions: string;
  provider: Provider;
  model: string;
}

export interface Generation {
  id: string;
  projectId: string;
  input: GenerationInput;
  output: string;
  createdAt: string;
}
