import type { DiscoveredTweet } from "@/lib/types";

export const RADAR_TTL_MS = 30 * 60 * 1000;

const CACHE_KEY = "content-studio-radar-v2";

export interface RadarCacheEntry {
  name: string;
  query: string;
  fetchedAt: number;
  tweets: DiscoveredTweet[];
}

const radarListeners = new Set<() => void>();
let radarRaw = "";
let radarReady = false;
const radarInflight = new Map<string, Promise<DiscoveredTweet[]>>();

function emit(listeners: Set<() => void>) {
  listeners.forEach((listener) => listener());
}

export function subscribeRadarCache(listener: () => void) {
  radarListeners.add(listener);
  return () => radarListeners.delete(listener);
}

export function getRadarCacheSnapshot() {
  if (!radarReady && typeof window !== "undefined") {
    try {
      localStorage.removeItem("content-studio-radar");
      radarRaw = localStorage.getItem(CACHE_KEY) || "";
    } catch {
      radarRaw = "";
    }
    radarReady = true;
  }
  return radarRaw;
}

export function getRadarCacheServerSnapshot() {
  return "";
}

export function getRadarCacheReadySnapshot() {
  getRadarCacheSnapshot();
  return radarReady ? "ready" : "pending";
}

export function getRadarCacheReadyServerSnapshot() {
  return "pending";
}

function httpsUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanTweets(tweets: DiscoveredTweet[]) {
  return tweets.slice(0, 20).flatMap((tweet) => {
    if (!tweet || typeof tweet.id !== "string" || typeof tweet.text !== "string") return [];
    const images = Array.isArray(tweet.images) ? tweet.images.flatMap((item) => {
      const url = httpsUrl(item);
      return url ? [url] : [];
    }).slice(0, 4) : [];
    return [{
      id: tweet.id,
      text: tweet.text.slice(0, 4000),
      createdAt: typeof tweet.createdAt === "string" ? tweet.createdAt : "",
      username: typeof tweet.username === "string" ? tweet.username : "",
      displayName: typeof tweet.displayName === "string" ? tweet.displayName : "",
      avatarUrl: httpsUrl(tweet.avatarUrl),
      images,
      likes: Number(tweet.likes) || 0,
      reposts: Number(tweet.reposts) || 0,
      replies: Number(tweet.replies) || 0,
      views: Number(tweet.views) || 0,
    }];
  });
}

function normalizeEntry(entry: Partial<RadarCacheEntry> | null) {
  if (!entry || typeof entry.fetchedAt !== "number" || !Array.isArray(entry.tweets)) return null;
  return {
    name: typeof entry.name === "string" ? entry.name : "",
    query: typeof entry.query === "string" ? entry.query : "",
    fetchedAt: entry.fetchedAt,
    tweets: cleanTweets(entry.tweets),
  };
}

export function readRadarEntry(raw: string, projectId: string) {
  if (!raw || !projectId) return null;
  try {
    const all = JSON.parse(raw) as Record<string, RadarCacheEntry>;
    return normalizeEntry(all[projectId]);
  } catch {
    return null;
  }
}

export function listRadarEntries(raw: string) {
  return Object.entries(readRadarMap(raw)).flatMap(([id, entry]) => {
    const normalized = normalizeEntry(entry);
    return normalized ? [{ id, ...normalized }] : [];
  });
}

export function radarCacheFresh(entry: RadarCacheEntry | null, now = Date.now()) {
  return Boolean(entry && now - entry.fetchedAt < RADAR_TTL_MS);
}

export function saveRadarEntry(projectId: string, entry: RadarCacheEntry) {
  const all = readRadarMap(getRadarCacheSnapshot());
  all[projectId] = { name: entry.name, query: entry.query, fetchedAt: entry.fetchedAt, tweets: cleanTweets(entry.tweets) };
  const compact = JSON.stringify(all);
  const withoutImages = JSON.stringify(Object.fromEntries(Object.entries(all).map(([id, item]) => [id, { ...item, tweets: item.tweets.map((tweet) => ({ ...tweet, images: [] })) }])));
  radarReady = true;
  try {
    localStorage.setItem(CACHE_KEY, compact);
    radarRaw = compact;
  } catch {
    try {
      localStorage.setItem(CACHE_KEY, withoutImages);
      radarRaw = withoutImages;
    } catch {
      radarRaw = compact;
    }
  }
  emit(radarListeners);
}

function readRadarMap(raw: string) {
  if (!raw) return {} as Record<string, RadarCacheEntry>;
  try {
    const data = JSON.parse(raw) as Record<string, RadarCacheEntry>;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function shareRadarRequest(key: string, run: () => Promise<DiscoveredTweet[]>) {
  const existing = radarInflight.get(key);
  if (existing) return existing;
  const promise = run().finally(() => {
    if (radarInflight.get(key) === promise) radarInflight.delete(key);
  });
  radarInflight.set(key, promise);
  return promise;
}
