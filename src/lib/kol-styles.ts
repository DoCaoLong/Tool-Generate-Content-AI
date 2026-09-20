import authorData from "../../data/author.json";

export interface KOLStyle {
  id: string;
  name: string;
  style?: string;
  style_vi?: string;
  content: string;
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

