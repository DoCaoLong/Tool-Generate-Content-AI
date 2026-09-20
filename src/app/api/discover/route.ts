import { z } from "zod";
import { errorResponse, requireUser } from "@/lib/server-utils";

const requestSchema = z.object({
  username: z.string().trim().transform((value) => value.replace(/^@/, "")).pipe(z.string().regex(/^[A-Za-z0-9_]{1,15}$/)),
  projectName: z.string().trim().max(100).optional().default(""),
  nextCursor: z.string().max(1000).optional(),
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

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Username hoặc tên dự án chưa hợp lệ.");

  const apiKey = process.env.SORSA_API_KEY;
  if (!apiKey) return errorResponse("SORSA_API_KEY chưa được cấu hình trên server.", 503);

  const projectFilter = projectQuery(parsed.data.projectName);
  const query = [`from:${parsed.data.username}`, projectFilter, "-filter:replies", "-filter:retweets"].filter(Boolean).join(" ");
  let response: Response;
  try {
    response = await fetch("https://api.sorsa.io/v3/search-tweets", {
      method: "POST",
      headers: { ApiKey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        order: "latest",
        ...(parsed.data.nextCursor ? { next_cursor: parsed.data.nextCursor } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return errorResponse("Không thể kết nối đến Sorsa API. Hãy thử lại sau.", 502);
  }

  const data = (await response.json().catch(() => ({}))) as SorsaResponse;
  if (!response.ok) {
    const fallback = response.status === 401
      ? "Sorsa API key không hợp lệ."
      : response.status === 403
        ? "Sorsa API đã hết quota hoặc gói dịch vụ đã hết hạn."
        : response.status === 429
          ? "Đang vượt giới hạn Sorsa API. Hãy thử lại sau ít phút."
          : "Không thể lấy dữ liệu từ Sorsa API.";
    return errorResponse(data.message || data.error || fallback, response.status);
  }

  const tweets = (data.tweets || [])
    .filter((tweet) => tweet.id && (tweet.full_text || tweet.text))
    .map((tweet) => ({
      id: String(tweet.id),
      text: String(tweet.full_text || tweet.text),
      createdAt: tweet.created_at || new Date().toISOString(),
      username: tweet.user?.username || parsed.data.username,
      displayName: tweet.user?.display_name || parsed.data.username,
      likes: tweet.likes_count ?? tweet.favorite_count ?? 0,
      reposts: tweet.retweet_count ?? 0,
      replies: tweet.reply_count ?? 0,
      views: tweet.view_count ?? 0,
    }));

  return Response.json({ tweets, nextCursor: data.next_cursor || null, query });
}
