import { defaultProjectContentOptions } from "@/lib/project-options";
import type { NucleusProjectDetail, Project, ProjectContentOptions } from "@/lib/types";

export const nucleusFieldLabels: Record<string, string> = {
  campaign_type: "Loại chiến dịch",
  contribution_reward: "Thưởng đóng góp",
  reputation_reward: "Thưởng uy tín",
  contribution_eligibility: "Hạng đóng góp",
  reputation_eligibility: "Hạng uy tín",
  reward_type: "Loại thưởng",
  reward_amount: "Giá trị thưởng",
  eligibility: "Điều kiện",
  eligibility_criteria: "Tiêu chí",
  reward_type_1: "Thưởng 1",
  reward_type_2: "Thưởng 2",
};

const DOCUMENTS_LIMIT = 50_000;
const RULES_LIMIT = 5_000;
const KEYWORDS_LIMIT = 1_000;

export function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h1|h2|h3|h4|li|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fieldLabel(key: string) {
  return nucleusFieldLabels[key] || key.replace(/_/g, " ");
}

export function buildNucleusBrief(project: NucleusProjectDetail) {
  const lines = [
    `Chiến dịch Nucleus: ${project.name}`,
    `Slug: ${project.slug}`,
    `Trạng thái: ${project.status}`,
  ];
  if (project.description) lines.push(`Mô tả: ${project.description}`);
  if (project.xUsername) lines.push(`X: ${project.xUsername}`);
  if (project.startTime || project.endTime) lines.push(`Thời gian: ${project.startTime || "?"} → ${project.endTime || "?"}`);

  const fields = Object.entries(project.additionalFields);
  if (fields.length) {
    lines.push("", "Thưởng và điều kiện:");
    for (const [key, value] of fields) lines.push(`- ${fieldLabel(key)}: ${value}`);
  }

  if (project.quests) {
    const quests: string[] = [];
    if (project.quests.followX) quests.push("Follow X");
    if (project.quests.joinDiscord) quests.push("Join Discord");
    if (project.quests.joinTelegram) quests.push("Join Telegram");
    for (const wallet of project.quests.requiredWallets) quests.push(`Ví ${wallet.toUpperCase()}`);
    for (const quest of project.quests.eligibilityQuests) {
      quests.push(quest.buttonUrl ? `${quest.description} (${quest.buttonUrl})` : quest.description);
    }
    if (quests.length) {
      lines.push("", "Quest tham gia:");
      for (const quest of quests) lines.push(`- ${quest}`);
    }
  }

  if (project.socials.length) {
    lines.push("", "Liên kết:");
    for (const social of project.socials) lines.push(`- ${social.platform}: ${social.url}`);
  }

  const scoring: string[] = [];
  if (project.mindshare) scoring.push("Mindshare");
  if (project.reputationScore) scoring.push("Reputation");
  if (project.referralScore) scoring.push("Referral");
  if (project.onchainWeight !== null) scoring.push(`On-chain ${project.onchainWeight}%`);
  if (project.offchainWeight !== null) scoring.push(`Off-chain ${project.offchainWeight}%`);
  if (scoring.length) lines.push("", `Cách tính điểm: ${scoring.join(", ")}`);

  for (const section of project.details) {
    const text = htmlToPlainText(section.html);
    if (!text) continue;
    lines.push("", `${section.title}:`, text);
  }

  return lines.join("\n").trim();
}

export function nucleusXUsername(project: NucleusProjectDetail) {
  const candidates = [
    project.xUsername,
    project.socials.find((social) => social.platform === "x" || social.platform === "twitter")?.url,
  ].filter((value): value is string => Boolean(value));
  for (const value of candidates) {
    const fromUrl = value.match(/(?:x\.com|twitter\.com)\/@?([A-Za-z0-9_]{1,15})/i);
    if (fromUrl) return fromUrl[1];
    const fromHandle = value.trim().match(/^@?([A-Za-z0-9_]{1,15})$/);
    if (fromHandle) return fromHandle[1];
  }
  return null;
}

export function buildNucleusRules(project: NucleusProjectDetail) {
  const first = project.details[0];
  if (!first) return "";
  const text = htmlToPlainText(first.html);
  const body = [first.title, text].filter(Boolean).join("\n");
  return body.slice(0, RULES_LIMIT);
}

export function attachNucleusKeyword(existing: string, username: string | null) {
  if (!username) return existing.slice(0, KEYWORDS_LIMIT);
  const handle = `@${username.replace(/^@/, "")}`;
  const parts = existing.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  const already = parts.some((item) => item.replace(/^@/, "").toLowerCase() === username.replace(/^@/, "").toLowerCase());
  const next = already ? existing.trim() : parts.length ? `${existing.trim().replace(/[,\s]+$/, "")}, ${handle}` : handle;
  return next.slice(0, KEYWORDS_LIMIT);
}

export function findExistingStudioProject(projects: Project[], nucleus: { name: string; slug: string }) {
  const name = nucleus.name.trim().toLowerCase();
  const marker = `--- Nucleus: ${nucleus.slug} ---`;
  return projects.find((item) => item.name.trim().toLowerCase() === name || item.contentOptions.documents.includes(marker)) || null;
}

export function applyNucleusOptions(project: NucleusProjectDetail, current?: Partial<ProjectContentOptions> | null): ProjectContentOptions {
  const base = { ...defaultProjectContentOptions, ...current };
  return {
    ...base,
    documents: mergeNucleusDocuments(base.documents, project.slug, buildNucleusBrief(project)),
    rules: buildNucleusRules(project) || base.rules,
    keywords: attachNucleusKeyword(base.keywords, nucleusXUsername(project)),
  };
}

export function mergeNucleusDocuments(existing: string, slug: string, brief: string) {
  const start = `--- Nucleus: ${slug} ---`;
  const end = `--- Hết Nucleus: ${slug} ---`;
  const block = `${start}\n${brief}\n${end}`;
  const current = existing.trim();
  let merged = block;
  if (current) {
    const startIdx = current.indexOf(start);
    const endIdx = current.indexOf(end);
    merged = startIdx >= 0 && endIdx > startIdx
      ? `${current.slice(0, startIdx).trim()}\n\n${block}\n\n${current.slice(endIdx + end.length).trim()}`.trim()
      : `${current}\n\n${block}`;
  }
  if (merged.length <= DOCUMENTS_LIMIT) return merged;
  return `${merged.slice(0, DOCUMENTS_LIMIT - 20).trim()}\n...`;
}
