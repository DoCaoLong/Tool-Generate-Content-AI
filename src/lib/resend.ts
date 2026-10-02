import https from "node:https";

const DEFAULT_FROM = "noreply@longdc.click";

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

export function getResendConfig() {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const from = stripQuotes(process.env.EMAIL_FROM || process.env.RESEND_FROM || DEFAULT_FROM);
  if (!apiKey || !from.includes("@")) return null;
  return { apiKey, from };
}

export function appOrigin(request: Request) {
  const configured = stripQuotes(process.env.APP_URL || "").replace(/\/$/, "");
  if (configured) return configured;
  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

function resendMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
  } catch {
    return "";
  }
  return "";
}

function postResend(apiKey: string, payload: { from: string; to: string[]; subject: string; html: string }) {
  const body = JSON.stringify(payload);
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = https.request({
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      family: 4,
      timeout: 15_000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk as Buffer));
      response.on("end", () => resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.on("timeout", () => request.destroy(new Error("Resend quá thời gian chờ.")));
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const config = getResendConfig();
  if (!config) throw new Error("RESEND_API_KEY hoặc EMAIL_FROM chưa được cấu hình.");
  const safeUrl = escapeHtml(resetUrl);
  const result = await postResend(config.apiKey, {
    from: config.from,
    to: [to],
    subject: "Đặt lại mật khẩu Content Studio",
    html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu Content Studio.</p><p><a href="${safeUrl}">Đặt mật khẩu mới</a></p><p>Liên kết có hiệu lực trong 30 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
  });
  if (result.status >= 400) {
    const message = resendMessage(result.body) || "Resend không gửi được email.";
    console.error("[mailer] Resend error:", result.status, message);
    throw new Error(message);
  }
}
