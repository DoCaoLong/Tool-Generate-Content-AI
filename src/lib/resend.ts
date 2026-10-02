export function getResendConfig() {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const from = (process.env.RESEND_FROM || "").trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function appOrigin(request: Request) {
  const configured = (process.env.APP_URL || "").trim().replace(/\/$/, "");
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

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const config = getResendConfig();
  if (!config) throw new Error("RESEND_API_KEY hoặc RESEND_FROM chưa được cấu hình.");
  const safeUrl = escapeHtml(resetUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      subject: "Đặt lại mật khẩu Content Studio",
      html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu Content Studio.</p><p><a href="${safeUrl}">Đặt mật khẩu mới</a></p><p>Liên kết có hiệu lực trong 30 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
      text: `Đặt lại mật khẩu Content Studio:\n${resetUrl}\n\nLiên kết có hiệu lực trong 30 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Resend không gửi được email.");
}
