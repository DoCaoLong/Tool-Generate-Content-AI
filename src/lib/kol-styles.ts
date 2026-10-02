import authorData from "../../data/author.json";

export interface KOLStyle {
  id: string;
  name: string;
  username?: string;
  style?: string;
  style_vi?: string;
  content: string;
  profileImgUrl?: string;
}

export const kolStyles = authorData as KOLStyle[];

export function getKOLStyle(id: string | null) {
  if (!id) return null;
  return kolStyles.find((author) => author.id === id) || null;
}

export function getKOLInitials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 2) || "K").toUpperCase();
}

const handleAliases: Record<string, string> = {
  "wale-moca": "waleswoosh",
  beast_ico: "icobeast",
  defi0xjeff: "0xjeff",
  "0xfastlife": "fastlife",
};

function usableAvatar(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/uploads/")) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname === "unavatar.io") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function canonicalHandle(value?: string | null) {
  const handle = (value || "").trim().replace(/^@/, "");
  if (!handle) return "";
  return handleAliases[handle.toLowerCase()] || handle;
}

function legacyHandle(value?: string | null) {
  const raw = (value || "").trim();
  return raw.match(/unavatar\.io\/(?:x|twitter)\/([A-Za-z0-9_]{1,15})/i)?.[1]
    || raw.match(/^\/([A-Za-z0-9_-]{1,30})\.(?:jpe?g|png|webp|gif)$/i)?.[1]
    || "";
}

export function kolAvatarSrc(input: { username?: string | null; avatarUrl?: string | null; profileImgUrl?: string | null; text?: string | null }) {
  const direct = usableAvatar(input.avatarUrl) || usableAvatar(input.profileImgUrl);
  if (direct) return direct;
  const handle = canonicalHandle(input.username || legacyHandle(input.profileImgUrl) || (input.text || "").match(/\(@([A-Za-z0-9_]{1,15})\)/)?.[1]);
  if (!handle) return "";
  const match = kolStyles.find((style) => style.username?.toLowerCase() === handle.toLowerCase());
  return usableAvatar(match?.profileImgUrl);
}

