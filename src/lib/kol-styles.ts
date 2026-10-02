import authorData from "../../data/author.json";

export interface KOLStyle {
  id: string;
  name: string;
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

const xHandlePattern = /^[A-Za-z0-9_]{1,15}$/;
const profileHandleAliases: Record<string, string> = { "wale-moca": "waleswoosh" }; // file name in author.json; the X handle is waleswoosh

export function xAvatarUrl(username: string | null | undefined) {
  const handle = (username || "").trim().replace(/^@/, "");
  return xHandlePattern.test(handle) ? `https://unavatar.io/x/${handle}` : "";
}

export function kolAvatarSrc(input: { username?: string | null; profileImgUrl?: string | null; text?: string | null }) {
  const fromUsername = xAvatarUrl(input.username);
  if (fromUsername) return fromUsername;
  const profile = (input.profileImgUrl || "").trim();
  if (/^https:\/\//i.test(profile) || profile.startsWith("/uploads/")) return profile;
  const stem = profile.match(/^\/([^/]+)\.(?:jpe?g|png|webp|gif)$/i)?.[1] || "";
  const fromFile = xAvatarUrl(profileHandleAliases[stem] || stem);
  if (fromFile) return fromFile;
  return xAvatarUrl((input.text || "").match(/\(@([A-Za-z0-9_]{1,15})\)/)?.[1]);
}

