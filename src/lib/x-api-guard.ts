import { createHash } from "node:crypto";
import { getDb } from "@/lib/mongodb";
import { normalizeProjectContentOptions } from "@/lib/project-options";
import { buildRadarQuery, projectXHandle } from "@/lib/radar-query";
import { errorResponse } from "@/lib/server-utils";

const SEARCH_BURST = 20;
const SEARCH_BURST_MS = 10 * 60_000;
const SEARCH_DAY = 80;
const SEARCH_DAY_MS = 24 * 60 * 60_000;
const RADAR_BURST = 60;
const RADAR_DAY = 240;
const RADAR_COOLDOWN_MS = 30 * 60_000;
const AVATAR_DAY = 6;
const NUCLEUS_BURST = 80;
const NUCLEUS_BURST_MS = 10 * 60_000;

let indexReady: Promise<void> | null = null;

function isDuplicate(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000);
}

async function guards() {
  const collection = (await getDb()).collection("x_api_guards");
  if (!indexReady) {
    indexReady = collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).then(() => undefined).catch(() => undefined);
  }
  await indexReady;
  return collection;
}

function allowedHosts(request: Request) {
  const hosts = new Set<string>();
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = host.split(",")[0]?.trim().split(":")[0]?.toLowerCase();
  if (hostname) hosts.add(hostname);
  const appUrl = (process.env.APP_URL || "").trim();
  if (appUrl) {
    try { hosts.add(new URL(appUrl).hostname.toLowerCase()); } catch { return hosts; }
  }
  return hosts;
}

export function assertAppRequest(request: Request) {
  const site = (request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (site !== "same-origin" && site !== "same-site") {
    return errorResponse("Yêu cầu không đến từ ứng dụng.", 403);
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    if (!allowedHosts(request).has(originHost)) return errorResponse("Yêu cầu không đến từ ứng dụng.", 403);
  } catch {
    return errorResponse("Yêu cầu không đến từ ứng dụng.", 403);
  }
  return null;
}

async function consumeQuota(userId: string, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const id = `${scope}:${userId}:${bucket}`;
  const expiresAt = new Date((bucket + 2) * windowMs);
  const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * windowMs - now) / 1000));
  const collection = await guards();
  try {
    await collection.insertOne({ _id: id as never, count: 1, expiresAt, userId, scope });
    return null;
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
  const updated = await collection.findOneAndUpdate(
    { _id: id as never, count: { $lt: limit } },
    { $inc: { count: 1 } },
  );
  if (updated) return null;
  const response = errorResponse("Bạn đã dùng hết lượt gọi API trong khoảng này. Hãy thử lại sau.", 429);
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}

export function consumeRadarQuota(userId: string) {
  return consumeQuota(userId, "radar-burst", RADAR_BURST, SEARCH_BURST_MS).then(async (burst) => {
    if (burst) return burst;
    return consumeQuota(userId, "radar-day", RADAR_DAY, SEARCH_DAY_MS);
  });
}

export function consumeDiscoverQuota(userId: string) {
  return consumeQuota(userId, "discover-burst", SEARCH_BURST, SEARCH_BURST_MS).then(async (burst) => {
    if (burst) return burst;
    return consumeQuota(userId, "discover-day", SEARCH_DAY, SEARCH_DAY_MS);
  });
}

export function consumeAvatarQuota(userId: string) {
  return consumeQuota(userId, "avatar-day", AVATAR_DAY, SEARCH_DAY_MS);
}

export function consumeNucleusQuota(userId: string) {
  return consumeQuota(userId, "nucleus-burst", NUCLEUS_BURST, NUCLEUS_BURST_MS);
}

function radarId(userId: string, query: string) {
  const hash = createHash("sha256").update(query).digest("hex").slice(0, 24);
  return `radar:${userId}:${hash}`;
}

export async function userOwnsRadarQuery(userId: string, projectName: string, username: string) {
  const expected = buildRadarQuery(projectName, username);
  if (!expected) return false;
  const projects = await (await getDb()).collection("projects").find({ userId }).project({ name: 1, contentOptions: 1 }).toArray();
  return projects.some((project) => {
    const options = normalizeProjectContentOptions(project.contentOptions as never);
    const handle = projectXHandle(options.keywords, options.documents);
    return buildRadarQuery(String(project.name || ""), handle) === expected;
  });
}

export async function reserveRadar(userId: string, query: string) {
  const now = new Date();
  const id = radarId(userId, query);
  const collection = await guards();
  const existing = await collection.findOne({ _id: id as never });
  if (existing?.at instanceof Date && now.getTime() - existing.at.getTime() < RADAR_COOLDOWN_MS) return false;
  await collection.updateOne(
    { _id: id as never },
    { $set: { at: now, userId, expiresAt: new Date(now.getTime() + RADAR_COOLDOWN_MS + 5 * 60_000) } },
    { upsert: true },
  );
  return true;
}

export async function releaseRadar(userId: string, query: string) {
  await (await guards()).deleteOne({ _id: radarId(userId, query) as never });
}
