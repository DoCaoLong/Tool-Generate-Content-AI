import type { NucleusProject, NucleusProjectDetail } from "@/lib/types";

const NUCLEUS_API = "https://api.nucleus.codes/v1";
const LIST_FIELDS = "id,slug,name,sponsored_by,status,banner_image_url,thumbnail_url,start_time,end_time,additional_fields,is_private";
const ALLOWED_HTML_TAGS = new Set(["p", "br", "strong", "b", "u", "em", "i", "ul", "ol", "li", "a", "span", "h1", "h2", "h3", "h4", "blockquote", "div", "img", "table", "thead", "tbody", "tr", "th", "td", "hr"]);

interface NucleusListRaw {
  projects?: NucleusListItemRaw[];
  count?: number;
  message?: string;
  error?: string;
}

interface NucleusListItemRaw {
  id?: string;
  slug?: string | null;
  name?: string;
  sponsored_by?: string | null;
  status?: string;
  banner_image_url?: string | null;
  thumbnail_url?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  additional_fields?: Record<string, unknown> | null;
  is_private?: boolean;
}

interface NucleusDetailRaw {
  success?: boolean;
  project_detail?: NucleusDetailBodyRaw;
  message?: string;
  error?: string;
}

interface NucleusDetailBodyRaw extends NucleusListItemRaw {
  description?: string | null;
  x_username?: string | null;
  metrics?: {
    users_signed_up_count?: number;
    tokens_available?: number;
    direct_spots_available?: number;
    raffle_spots_available?: number;
    total_spots_available?: number;
  } | null;
  project_details?: Array<{ project_detail_title?: string; project_detail_description?: string }>;
  project_socials?: Array<{ platform?: string; url?: string }>;
  project_quests?: {
    follow_x?: boolean;
    join_discord?: boolean;
    join_telegram?: boolean;
    required_wallets?: string[];
    eligibility_quests?: Array<{
      id?: string;
      type?: string;
      description?: string;
      button_text?: string | null;
      button_url?: string | null;
    }>;
  } | null;
  onchain_weight?: number | null;
  offchain_weight?: number | null;
  mindshare?: boolean;
  reputation_score?: boolean;
  referral_score?: boolean;
  low_level_categories?: Array<{ name?: string }>;
  offchain_categories?: Array<{ name?: string }>;
  nft_bonuses?: Array<{ chain?: string; collection_name?: string; multiply_value?: number | null }>;
}

export class NucleusApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function attr(value: string, name: string) {
  return new RegExp(`${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(value)?.[2]?.trim() || "";
}

export function sanitizeNucleusHtml(html: string) {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(?:script|style|iframe|object|embed|link|svg|video|audio)[^>]*>/gi, "")
    .replace(/<(?:script|style|iframe|object|embed|link|svg|video|audio|source|meta|form|input|button)[\s\S]*?>/gi, "");

  return stripped.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(name)) return "";
    if (match.startsWith("</")) return name === "img" ? "" : `</${name}>`;
    if (name === "br" || name === "hr") return `<${name} />`;
    if (name === "a") {
      const href = attr(attrs, "href");
      if (/^https?:\/\//i.test(href)) {
        return `<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer nofollow">`;
      }
      return "<a>";
    }
    if (name === "img") {
      const src = attr(attrs, "src");
      const alt = attr(attrs, "alt");
      if (!/^https?:\/\//i.test(src)) return "";
      return `<img src="${src.replace(/"/g, "&quot;")}" alt="${alt.replace(/"/g, "&quot;")}" loading="lazy" referrerpolicy="no-referrer" />`;
    }
    return `<${name}>`;
  });
}

function asStringMap(value: Record<string, unknown> | null | undefined) {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && String(item).trim())
      .map(([key, item]) => [key, String(item)]),
  );
}

function mapListProject(item: NucleusListItemRaw): NucleusProject | null {
  if (!item.id || !item.name) return null;
  return {
    id: String(item.id),
    slug: item.slug ? String(item.slug) : null,
    name: String(item.name),
    sponsoredBy: item.sponsored_by ? String(item.sponsored_by) : "",
    status: item.status ? String(item.status) : "UNKNOWN",
    bannerImageUrl: item.banner_image_url || null,
    thumbnailUrl: item.thumbnail_url || null,
    startTime: item.start_time || null,
    endTime: item.end_time || null,
    additionalFields: asStringMap(item.additional_fields),
    isPrivate: Boolean(item.is_private),
  };
}

function mapDetail(item: NucleusDetailBodyRaw): NucleusProjectDetail | null {
  const base = mapListProject(item);
  if (!base) return null;
  const categories = [
    ...(item.low_level_categories || []).map((entry) => entry.name),
    ...(item.offchain_categories || []).map((entry) => entry.name),
  ].filter((name): name is string => Boolean(name));

  return {
    ...base,
    slug: base.slug || base.id,
    description: item.description ? String(item.description) : "",
    xUsername: item.x_username || null,
    metrics: {
      usersSignedUpCount: item.metrics?.users_signed_up_count ?? 0,
      tokensAvailable: item.metrics?.tokens_available ?? 0,
      directSpotsAvailable: item.metrics?.direct_spots_available ?? 0,
      raffleSpotsAvailable: item.metrics?.raffle_spots_available ?? 0,
      totalSpotsAvailable: item.metrics?.total_spots_available ?? 0,
    },
    socials: (item.project_socials || [])
      .filter((social) => social.platform && social.url)
      .map((social) => ({ platform: String(social.platform), url: String(social.url) })),
    details: (item.project_details || [])
      .filter((section) => section.project_detail_title || section.project_detail_description)
      .map((section) => ({
        title: section.project_detail_title ? String(section.project_detail_title) : "Chi tiết",
        html: sanitizeNucleusHtml(section.project_detail_description || ""),
      })),
    quests: item.project_quests
      ? {
          followX: Boolean(item.project_quests.follow_x),
          joinDiscord: Boolean(item.project_quests.join_discord),
          joinTelegram: Boolean(item.project_quests.join_telegram),
          requiredWallets: item.project_quests.required_wallets || [],
          eligibilityQuests: (item.project_quests.eligibility_quests || [])
            .filter((quest) => quest.id && quest.description)
            .map((quest) => ({
              id: String(quest.id),
              type: quest.type ? String(quest.type) : "link",
              description: String(quest.description),
              buttonText: quest.button_text || null,
              buttonUrl: quest.button_url || null,
            })),
        }
      : null,
    onchainWeight: item.onchain_weight ?? null,
    offchainWeight: item.offchain_weight ?? null,
    mindshare: Boolean(item.mindshare),
    reputationScore: Boolean(item.reputation_score),
    referralScore: Boolean(item.referral_score),
    categories: Array.from(new Set(categories)),
    nftBonuses: (item.nft_bonuses || [])
      .filter((bonus) => bonus.collection_name || bonus.chain)
      .map((bonus) => ({
        chain: bonus.chain ? String(bonus.chain) : "",
        collectionName: bonus.collection_name ? String(bonus.collection_name) : "",
        multiplyValue: bonus.multiply_value ?? null,
      })),
  };
}

async function nucleusFetch(path: string) {
  try {
    return await fetch(`${NUCLEUS_API}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new NucleusApiError("Không thể kết nối đến Nucleus API. Hãy thử lại sau.", 502);
  }
}

function fallbackMessage(status: number, data: { message?: string; error?: string }) {
  if (data.message || data.error) return data.message || data.error || "";
  if (status === 404) return "Không tìm thấy dự án Nucleus này.";
  if (status === 429) return "Nucleus API đang giới hạn truy cập. Hãy thử lại sau ít phút.";
  return "Không thể lấy dữ liệu từ Nucleus API.";
}

export async function fetchNucleusProjects(skip: number, limit: number) {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
    fields: LIST_FIELDS,
  });
  const response = await nucleusFetch(`/projects/?${params.toString()}`);
  const data = (await response.json().catch(() => ({}))) as NucleusListRaw;
  if (!response.ok) throw new NucleusApiError(fallbackMessage(response.status, data), response.status);

  const projects = (data.projects || []).map(mapListProject).filter((item): item is NucleusProject => Boolean(item));
  return { projects, count: typeof data.count === "number" ? data.count : projects.length };
}

export async function fetchNucleusProject(slug: string) {
  const response = await nucleusFetch(`/projects/${encodeURIComponent(slug)}`);
  const data = (await response.json().catch(() => ({}))) as NucleusDetailRaw;
  if (!response.ok) throw new NucleusApiError(fallbackMessage(response.status, data), response.status);
  const project = data.project_detail ? mapDetail(data.project_detail) : null;
  if (!project) throw new NucleusApiError("Không tìm thấy dự án Nucleus này.", 404);
  return project;
}
