import https from "node:https";
import { getSorsaApiKey } from "@/lib/sorsa-key";

export function normalizeSorsaAvatar(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !/(^|\.)twimg\.com$/i.test(url.hostname)) return "";
    return url.toString().replace("_normal", "_400x400");
  } catch {
    return "";
  }
}

function getJson(path: string, apiKey: string) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = https.request({
      hostname: "api.sorsa.io",
      path,
      method: "GET",
      family: 4,
      timeout: 20_000,
      headers: { ApiKey: apiKey },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk as Buffer));
      response.on("end", () => {
        const status = response.statusCode || 500;
        if (status >= 400) {
          reject(new Error("sorsa"));
          return;
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>);
        } catch {
          reject(new Error("sorsa"));
        }
      });
    });
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("sorsa"));
    });
    request.on("error", () => reject(new Error("sorsa")));
    request.end();
  });
}

export async function fetchSorsaAvatars(usernames: string[]) {
  const unique = [...new Set(usernames.map((name) => name.replace(/^@/, "").trim()).filter((name) => /^[A-Za-z0-9_]{1,15}$/.test(name)))].slice(0, 100);
  const found = new Map<string, string>();
  if (!unique.length) return found;
  const apiKey = await getSorsaApiKey();
  if (!apiKey) return found;
  const query = unique.map((name) => `usernames=${encodeURIComponent(name)}`).join("&");
  const data = await getJson(`/v3/info-batch?${query}`, apiKey);
  const users = Array.isArray(data.users) ? data.users : [];
  for (const user of users) {
    if (!user || typeof user !== "object") continue;
    const record = user as { username?: unknown; profile_image_url?: unknown };
    const username = typeof record.username === "string" ? record.username : "";
    const image = normalizeSorsaAvatar(record.profile_image_url);
    if (username && image) found.set(username.toLowerCase(), image);
  }
  return found;
}
