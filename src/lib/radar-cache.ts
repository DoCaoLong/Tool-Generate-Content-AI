import type { DiscoveredTweet } from "@/lib/types";

export const RADAR_TTL_MS = 30 * 60 * 1000;

const CACHE_KEY = "content-studio-radar";

export interface RadarCacheEntry {
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

function cleanTweets(tweets: DiscoveredTweet[]) {
  return tweets.slice(0, 20).flatMap((tweet) => {
    if (!tweet || typeof tweet.id !== "string" || typeof tweet.text !== "string") return [];
    return [{
      id: tweet.id,
      text: tweet.text.slice(0, 4000),
      createdAt: typeof tweet.createdAt === "string" ? tweet.createdAt : "",
      username: typeof tweet.username === "string" ? tweet.username : "",
      displayName: typeof tweet.displayName === "string" ? tweet.displayName : "",
      likes: Number(tweet.likes) || 0,
      reposts: Number(tweet.reposts) || 0,
      replies: Number(tweet.replies) || 0,
      views: Number(tweet.views) || 0,
    }];
  });
}

export function readRadarEntry(raw: string, projectId: string, query: string) {
  if (!raw || !projectId || !query) return null;
  try {
    const all = JSON.parse(raw) as Record<string, RadarCacheEntry>;
    const entry = all[projectId];
    if (!entry || entry.query !== query || typeof entry.fetchedAt !== "number" || !Array.isArray(entry.tweets)) return null;
    return { query: entry.query, fetchedAt: entry.fetchedAt, tweets: cleanTweets(entry.tweets) };
  } catch {
    return null;
  }
}

export function radarCacheFresh(entry: RadarCacheEntry | null, now = Date.now()) {
  return Boolean(entry && now - entry.fetchedAt < RADAR_TTL_MS);
}

export function saveRadarEntry(projectId: string, entry: RadarCacheEntry) {
  const all = readRadarMap(getRadarCacheSnapshot());
  all[projectId] = { query: entry.query, fetchedAt: entry.fetchedAt, tweets: cleanTweets(entry.tweets) };
  radarRaw = JSON.stringify(all);
  radarReady = true;
  try {
    localStorage.setItem(CACHE_KEY, radarRaw);
  } catch {
    radarRaw = JSON.stringify(all);
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
