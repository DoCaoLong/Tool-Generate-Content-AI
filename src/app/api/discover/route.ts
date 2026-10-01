import dns from "node:dns";
import https from "node:https";
import { z } from "zod";
import { requireAccessCode } from "@/lib/access-code";
import { buildRadarQuery } from "@/lib/radar-query";
import { errorResponse, requireUser } from "@/lib/server-utils";
import { getSorsaApiKey } from "@/lib/sorsa-key";

dns.setDefaultResultOrder("ipv4first");

const handleSchema = z.string().regex(/^[A-Za-z0-9_]{1,15}$/);

const requestSchema = z.object({
  username: z.string().trim().transform((value) => value.replace(/^@/, "")).optional().default(""),
  projectName: z.string().trim().max(100).optional().default(""),
  nextCursor: z.string().max(1000).optional(),
  accessCode: z.string().trim().max(128).optional().default(""),
  radar: z.boolean().optional().default(false),
}).superRefine((data, context) => {
  if (!data.radar && !data.accessCode) {
    context.addIssue({ code: "custom", message: "Hãy nhập access code." });
  }
  if (!data.username && !data.projectName) {
    context.addIssue({ code: "custom", message: "Hãy nhập username hoặc tên dự án." });
  }
  if (data.username && !handleSchema.safeParse(data.username).success) {
    context.addIssue({ code: "custom", path: ["username"], message: "Username X chưa hợp lệ." });
  }
});

interface SorsaTweet {
  id?: string;
  full_text?: string;
  created_at?: string;
  likes_count?: number;
  retweet_count?: number;
  reply_count?: number;
  view_count?: number;
  retweeted_status?: SorsaTweet | null;
  user?: {
    username?: string;
    display_name?: string;
  };
}

interface SorsaResponse {
  tweets?: SorsaTweet[];
  next_cursor?: string | null;
  message?: string;
}

class SorsaHttpError extends Error {
  status: number;
  data: SorsaResponse;
  constructor(status: number, data: SorsaResponse) {
    super("sorsa");
    this.status = status;
    this.data = data;
  }
}

function projectQuery(value: string) {
  const clean = value.replace(/["\r\n]/g, " ").replace(/\s+/g, " ").trim();
  if (/^[@#$]/.test(clean)) return clean;
  return clean.includes(" ") ? `"${clean}"` : clean;
}

function asHandle(value: string) {
  const direct = value.replace(/^@/, "").trim();
  if (handleSchema.safeParse(direct).success) return direct;
  return value.match(/@([A-Za-z0-9_]{1,15})/)?.[1] || null;
}

function mapTweets(tweets: SorsaTweet[], fallbackUsername: string) {
  return tweets
    .filter((tweet) => tweet.id && tweet.full_text?.trim() && !tweet.retweeted_status)
    .map((tweet) => ({
      id: String(tweet.id),
      text: String(tweet.full_text),
      createdAt: tweet.created_at || new Date().toISOString(),
      username: tweet.user?.username || fallbackUsername,
      displayName: tweet.user?.display_name || tweet.user?.username || fallbackUsername,
      likes: tweet.likes_count ?? 0,
      reposts: tweet.retweet_count ?? 0,
      replies: tweet.reply_count ?? 0,
      views: tweet.view_count ?? 0,
    }));
}

function sorsaError(status: number, data: SorsaResponse) {
  const fallback = status === 400
    ? "Tham số gửi tới Sorsa không hợp lệ."
    : status === 401
      ? "Sorsa API key không hợp lệ."
      : status === 403
        ? "Sorsa API đã hết quota hoặc gói dịch vụ đã hết hạn."
        : status === 404
          ? "Không tìm thấy tài khoản hoặc bài viết công khai trên X."
          : status === 429
            ? "Đang vượt giới hạn Sorsa API. Hãy thử lại sau ít phút."
            : status >= 500
              ? "Sorsa đang lỗi. Hãy thử lại sau."
              : "Không thể lấy dữ liệu từ Sorsa API.";
  return errorResponse(data.message || fallback, status >= 400 && status < 600 ? status : 502);
}

function parseSorsaBody(raw: string): SorsaResponse {
  if (!raw.trim()) return {};
  try {
    const data = JSON.parse(raw) as SorsaResponse;
    return data && typeof data === "object" ? data : {};
  } catch {
    return { message: "Sorsa trả về dữ liệu không đọc được." };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sorsaPost(path: string, body: Record<string, unknown>, apiKey: string) {
  const payload = JSON.stringify(body);
  return new Promise<SorsaResponse>((resolve, reject) => {
    const request = https.request({
      hostname: "api.sorsa.io",
      path: `/v3/${path}`,
      method: "POST",
      family: 4,
      timeout: 45_000,
      headers: {
        ApiKey: apiKey,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk as Buffer));
      response.on("end", () => {
        const data = parseSorsaBody(Buffer.concat(chunks).toString("utf8"));
        const status = response.statusCode || 500;
        if (status >= 400) {
          reject(new SorsaHttpError(status, data));
          return;
        }
        resolve(data);
      });
    });
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("connect"));
    });
    request.on("error", () => reject(new Error("connect")));
    request.write(payload);
    request.end();
  });
}

function isRetryable(error: unknown) {
  if (error instanceof SorsaHttpError) return error.status === 429 || error.status >= 500;
  return error instanceof Error && error.message === "connect";
}

async function sorsaPostWithRetry(path: string, body: Record<string, unknown>, apiKey: string) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await sorsaPost(path, body, apiKey);
    } catch (error) {
      last = error;
      if (!isRetryable(error) || attempt === 2) throw error;
      await sleep(Math.min(2 ** attempt, 4) * 1000);
    }
  }
  throw last;
}

function discoverError(error: unknown) {
  if (error instanceof SorsaHttpError) return sorsaError(error.status, error.data);
  if (error instanceof Error && error.message === "connect") return errorResponse("Không thể kết nối đến Sorsa API. Hãy thử lại sau.", 502);
  return errorResponse("Không thể lấy dữ liệu từ Sorsa API.", 502);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Username hoặc tên dự án chưa hợp lệ.";
    return errorResponse(message);
  }
  if (!parsed.data.radar) {
    const access = requireAccessCode(parsed.data.accessCode);
    if (!access.ok) return errorResponse(access.message, access.status);
  }

  const apiKey = await getSorsaApiKey();
  if (!apiKey) return errorResponse("Sorsa API key chưa được cấu hình (env hoặc Admin).", 503);

  const username = parsed.data.username;
  const projectName = parsed.data.projectName;
  const projectHandle = projectName ? asHandle(projectName) : null;
  const radar = parsed.data.radar;
  const radarQuery = radar ? buildRadarQuery(projectName, username) : "";
  if (radar && !radarQuery) return errorResponse("Dự án đang viết chưa có tên để tìm radar.");
  const useMentions = !radar && Boolean(projectName) && !username && Boolean(projectHandle);
  const source = radar ? "radar" : useMentions ? "mentions" : username ? "author" : "topic";
  const fallbackUsername = username || projectHandle || "unknown";
  const cursor = parsed.data.nextCursor ? { next_cursor: parsed.data.nextCursor } : {};

  let endpoint = "search-tweets";
  let body: Record<string, unknown>;
  let queryLabel = radarQuery;

  if (radar) {
    body = { query: radarQuery, order: "latest", ...cursor };
  } else if (useMentions && projectHandle) {
    endpoint = "mentions";
    body = { query: projectHandle, order: "popular", ...cursor };
    queryLabel = `@${projectHandle}`;
  } else if (!username && projectName) {
    body = { query: `${projectQuery(projectName)} -filter:retweets`, order: "popular", ...cursor };
    queryLabel = String(body.query);
  } else {
    const projectFilter = projectName ? projectQuery(projectName) : "";
    const query = [`from:${username}`, projectFilter, "-filter:replies", "-filter:retweets"].filter(Boolean).join(" ");
    body = { query, order: "latest", ...cursor };
    queryLabel = query;
  }

  let data: SorsaResponse;
  try {
    data = await sorsaPostWithRetry(endpoint, body, apiKey);
  } catch (error) {
    const mentionsDown = error instanceof Error && error.message === "connect" || error instanceof SorsaHttpError && (error.status === 404 || error.status >= 500);
    const fallback = endpoint === "mentions" && projectHandle && mentionsDown;
    if (!fallback) return discoverError(error);
    try {
      data = await sorsaPostWithRetry("search-tweets", { query: `@${projectHandle} -filter:retweets`, order: "popular", ...cursor }, apiKey);
    } catch (fallbackError) {
      return discoverError(fallbackError);
    }
  }

  let tweets = mapTweets(data.tweets || [], fallbackUsername);
  if (source !== "author" && source !== "radar") {
    tweets = [...tweets].sort((left, right) => right.replies - left.replies || right.likes - left.likes);
  }

  return Response.json({
    tweets,
    nextCursor: typeof data.next_cursor === "string" && data.next_cursor.trim() ? data.next_cursor : null,
    query: queryLabel,
    source,
    handle: username || projectHandle || projectName,
  });
}
