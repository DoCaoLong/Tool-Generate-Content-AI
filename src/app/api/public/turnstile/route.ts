import { getTurnstileSiteKey } from "@/lib/turnstile";

export async function GET() {
  return Response.json({ siteKey: getTurnstileSiteKey() });
}
