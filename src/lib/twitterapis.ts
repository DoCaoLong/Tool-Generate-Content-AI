import https from "node:https";
import { normalizeSorsaAvatar } from "@/lib/sorsa-avatar";

export class TwitterApisHttpError extends Error {
  status: number;
  constructor(status: number) {
    super("twitterapis");
    this.status = status;
  }
}

interface ProviderTweet {
  id?: string;
  full_text?: string;
  created_at?: string;
  likes_count?: number;
  retweet_count?: number;
  reply_count?: number;
  view_count?: number;
  retweeted_status?: { id?: string } | null;
  entities?: Array<{ type?: string; link?: string; preview?: string }>;
  user?: { username?: string; display_name?: string; profile_image_url?: string };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toIso(value: unknown) {
  const raw = asString(value).trim();
  if (!raw) return new Date().toISOString();
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? raw : new Date(time).toISOString();
}

function mediaItems(tweet: Record<string, unknown>) {
  const lists: unknown[] = [];
  if (Array.isArray(tweet.media)) lists.push(...tweet.media);
  const entities = asRecord(tweet.entities);
  if (entities && Array.isArray(entities.media)) lists.push(...entities.media);
  const extended = asRecord(tweet.extended_entities);
  if (extended && Array.isArray(extended.media)) lists.push(...extended.media);
  return lists;
}

function photoEntities(tweet: Record<string, unknown>) {
  const photos: Array<{ type: string; link: string; preview: string }> = [];
  const seen = new Set<string>();
  for (const item of mediaItems(tweet)) {
    const media = asRecord(item);
    if (!media) continue;
    const type = asString(media.type).toLowerCase();
    if (type && type !== "photo" && type !== "image") continue;
    const link = asString(media.media_url_https || media.url || media.media_url).trim();
    if (!link || seen.has(link)) continue;
    seen.add(link);
    photos.push({ type: "photo", link, preview: link });
    if (photos.length >= 4) break;
  }
  return photos;
}

function normalizeTweet(value: unknown): ProviderTweet {
  const tweet = asRecord(value);
  if (!tweet) return {};
  const author = asRecord(tweet.author) || asRecord(tweet.user) || {};
  const retweet = tweet.is_retweet === true || Boolean(asRecord(tweet.retweeted_status) || asRecord(tweet.retweeted_tweet));
  return {
    id: asString(tweet.id),
    full_text: asString(tweet.full_text || tweet.text),
    created_at: toIso(tweet.created_at),
    likes_count: asCount(tweet.favorite_count ?? tweet.likes_count),
    retweet_count: asCount(tweet.retweet_count),
    reply_count: asCount(tweet.reply_count),
    view_count: asCount(tweet.view_count ?? tweet.views_count),
    retweeted_status: retweet ? { id: "retweet" } : null,
    entities: photoEntities(tweet),
    user: {
      username: asString(author.username || author.screen_name),
      display_name: asString(author.name || author.display_name),
      profile_image_url: asString(author.profile_image_url || author.profile_image_url_https),
    },
  };
}

function parseBody(raw: string) {
  if (!raw.trim()) return {};
  try {
    const data = JSON.parse(raw) as unknown;
    return data && typeof data === "object" ? data as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function twitterGet(path: string, apiKey: string) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = https.request({
      hostname: "api.twitterapis.com",
      path,
      method: "GET",
      family: 4,
      timeout: 45_000,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk as Buffer));
      response.on("end", () => {
        const status = response.statusCode || 500;
        if (status >= 400) {
          reject(new TwitterApisHttpError(status));
          return;
        }
        resolve(parseBody(Buffer.concat(chunks).toString("utf8")));
      });
    });
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("connect-twitterapis"));
    });
    request.on("error", () => reject(new Error("connect-twitterapis")));
    request.end();
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown) {
  if (error instanceof TwitterApisHttpError) return error.status === 429 || error.status >= 500;
  return error instanceof Error && error.message === "connect-twitterapis";
}

export async function searchTwitterApis(query: string, order: string, cursor: string | undefined, apiKey: string) {
  const params = new URLSearchParams({
    query,
    product: order === "popular" ? "Top" : "Latest",
    compact: "1",
    fields: "author.profile_image_url,media.type,media.media_url_https,media.url,extended_entities.media.type,extended_entities.media.media_url_https",
  });
  if (cursor) params.set("cursor", cursor);
  const data = await twitterGet(`/twitter/tweet/advanced_search?${params.toString()}`, apiKey);
  const tweets = Array.isArray(data.tweets) ? data.tweets.map(normalizeTweet) : [];
  const next = typeof data.next_cursor === "string" ? data.next_cursor.trim() : "";
  return { tweets, next_cursor: next || null };
}

export async function searchTwitterApisWithRetry(query: string, order: string, cursor: string | undefined, apiKey: string) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await searchTwitterApis(query, order, cursor, apiKey);
    } catch (error) {
      last = error;
      if (!isRetryable(error) || attempt === 2) throw error;
      await sleep(Math.min(2 ** attempt, 4) * 1000);
    }
  }
  throw last;
}

export async function fetchTwitterApisAvatars(usernames: string[], apiKey: string) {
  const unique = [...new Set(usernames.map((name) => name.replace(/^@/, "").trim()).filter((name) => /^[A-Za-z0-9_]{1,15}$/.test(name)))].slice(0, 100);
  const found = new Map<string, string>();
  if (!unique.length || !apiKey) return found;
  let index = 0;
  async function worker() {
    while (index < unique.length) {
      const name = unique[index];
      index += 1;
      try {
        const data = await twitterGet(`/twitter/user/info?${new URLSearchParams({ username: name, fields: "username,profile_image_url" }).toString()}`, apiKey);
        const user = asRecord(data.user);
        const username = asString(user?.username) || name;
        const image = normalizeSorsaAvatar(user?.profile_image_url);
        if (username && image) found.set(username.toLowerCase(), image);
      } catch {
        continue;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, unique.length) }, () => worker()));
  return found;
}
