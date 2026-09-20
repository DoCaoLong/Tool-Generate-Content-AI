export type Provider = "openai" | "gemini" | "deepseek" | "anthropic" | "xai" | "openrouter";
export type ContentMode = "new" | "rewrite";

export interface NucleusProject {
  id: string;
  slug: string | null;
  name: string;
  sponsoredBy: string;
  status: string;
  bannerImageUrl: string | null;
  thumbnailUrl: string | null;
  startTime: string | null;
  endTime: string | null;
  additionalFields: Record<string, string>;
  isPrivate: boolean;
}

export interface NucleusProjectDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  xUsername: string | null;
  thumbnailUrl: string | null;
  bannerImageUrl: string | null;
  sponsoredBy: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  isPrivate: boolean;
  additionalFields: Record<string, string>;
  metrics: {
    usersSignedUpCount: number;
    tokensAvailable: number;
    directSpotsAvailable: number;
    raffleSpotsAvailable: number;
    totalSpotsAvailable: number;
  };
  socials: Array<{ platform: string; url: string }>;
  details: Array<{ title: string; html: string }>;
  quests: {
    followX: boolean;
    joinDiscord: boolean;
    joinTelegram: boolean;
    requiredWallets: string[];
    eligibilityQuests: Array<{
      id: string;
      type: string;
      description: string;
      buttonText: string | null;
      buttonUrl: string | null;
    }>;
  } | null;
  onchainWeight: number | null;
  offchainWeight: number | null;
  mindshare: boolean;
  reputationScore: boolean;
  referralScore: boolean;
  categories: string[];
  nftBonuses: Array<{ chain: string; collectionName: string; multiplyValue: number | null }>;
}

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
