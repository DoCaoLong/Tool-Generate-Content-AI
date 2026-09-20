import dns from "node:dns";
import https from "node:https";
import { z } from "zod";
import { errorResponse, requireUser } from "@/lib/server-utils";

dns.setDefaultResultOrder("ipv4first");

const handleSchema = z.string().regex(/^[A-Za-z0-9_]{1,15}$/);

const requestSchema = z.object({
  username: z.string().trim().transform((value) => value.replace(/^@/, "")).optional().default(""),
  projectName: z.string().trim().max(100).optional().default(""),
  nextCursor: z.string().max(1000).optional(),
}).superRefine((data, context) => {
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
  text?: string;
  created_at?: string;
  likes_count?: number;
  favorite_count?: number;
  retweet_count?: number;
  reply_count?: number;
  view_count?: number;
  user?: {
    username?: string;
    display_name?: string;
  };
}

interface SorsaResponse {
  tweets?: SorsaTweet[];
  next_cursor?: string | null;
  message?: string;
  error?: string;
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
    .filter((tweet) => tweet.id && (tweet.full_text || tweet.text))
    .map((tweet) => ({
      id: String(tweet.id),
      text: String(tweet.full_text || tweet.text),
      createdAt: tweet.created_at || new Date().toISOString(),
      username: tweet.user?.username || fallbackUsername,
      displayName: tweet.user?.display_name || tweet.user?.username || fallbackUsername,
      likes: tweet.likes_count ?? tweet.favorite_count ?? 0,
      reposts: tweet.retweet_count ?? 0,
      replies: tweet.reply_count ?? 0,
      views: tweet.view_count ?? 0,
    }));
}

function sorsaError(status: number, data: SorsaResponse) {
  const fallback = status === 401
    ? "Sorsa API key không hợp lệ."
    : status === 403
      ? "Sorsa API đã hết quota hoặc gói dịch vụ đã hết hạn."
      : status === 429
        ? "Đang vượt giới hạn Sorsa API. Hãy thử lại sau ít phút."
        : "Không thể lấy dữ liệu từ Sorsa API.";
  return errorResponse(data.message || data.error || fallback, status);
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
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as SorsaResponse;
        if ((response.statusCode || 500) >= 400) {
          reject(Object.assign(new Error("sorsa"), { status: response.statusCode, data }));
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

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Username hoặc tên dự án chưa hợp lệ.";
    return errorResponse(message);
  }

  const apiKey = process.env.SORSA_API_KEY;
  if (!apiKey) return errorResponse("SORSA_API_KEY chưa được cấu hình trên server.", 503);

  const username = parsed.data.username;
  const projectName = parsed.data.projectName;
  const projectHandle = projectName ? asHandle(projectName) : null;
  const useMentions = Boolean(projectName) && !username && Boolean(projectHandle);
  const source = useMentions ? "mentions" : username ? "author" : "topic";
  const fallbackUsername = username || projectHandle || "unknown";
  const cursor = parsed.data.nextCursor ? { next_cursor: parsed.data.nextCursor } : {};

  let endpoint = "search-tweets";
  let body: Record<string, unknown>;
  let queryLabel = "";

  if (useMentions && projectHandle) {
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
    data = await sorsaPost(endpoint, body, apiKey);
  } catch (error) {
    if (endpoint === "mentions" && projectHandle) {
      try {
        data = await sorsaPost("search-tweets", { query: `@${projectHandle} -filter:retweets`, order: "popular", ...cursor }, apiKey);
      } catch (fallbackError) {
        if (fallbackError instanceof Error && fallbackError.message === "connect") {
          return errorResponse("Không thể kết nối đến Sorsa API. Hãy thử lại sau.", 502);
        }
        const failed = fallbackError as { status?: number; data?: SorsaResponse };
        return sorsaError(failed.status || 502, failed.data || {});
      }
    } else if (error instanceof Error && error.message === "connect") {
      return errorResponse("Không thể kết nối đến Sorsa API. Hãy thử lại sau.", 502);
    } else {
      const failed = error as { status?: number; data?: SorsaResponse };
      return sorsaError(failed.status || 502, failed.data || {});
    }
  }

  let tweets = mapTweets(data.tweets || [], fallbackUsername);
  if (source !== "author") {
    tweets = [...tweets].sort((left, right) => right.replies - left.replies || right.likes - left.likes);
  }

  return Response.json({
    tweets,
    nextCursor: data.next_cursor || null,
    query: queryLabel,
    source,
    handle: username || projectHandle || projectName,
  });
}
