import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { SETTINGS_API_KEYS_ID, maskSecret, type XProviderId } from "@/lib/api-keys";
import { getDb } from "@/lib/mongodb";
import { errorResponse } from "@/lib/server-utils";
import { readXApiSettings, resolveXApiKey } from "@/lib/x-provider";

const patchSchema = z.object({
  provider: z.enum(["sorsa", "twitterapis"]),
  sorsa: z.string().max(4000).optional(),
  twitterapis: z.string().max(4000).optional(),
});

function envKey(provider: XProviderId) {
  const raw = provider === "twitterapis" ? process.env.TWITTERAPIS_API_KEY : process.env.SORSA_API_KEY;
  return (raw || "").trim();
}

function publicKey(provider: XProviderId, stored: string) {
  const fromEnv = Boolean(envKey(provider));
  const value = stored.trim();
  return { set: fromEnv || Boolean(value), fromEnv, hint: maskSecret(value) };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const settings = await readXApiSettings();
  return Response.json({
    provider: settings.provider,
    sorsa: publicKey("sorsa", settings.keys.sorsa),
    twitterapis: publicKey("twitterapis", settings.keys.twitterapis),
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Dữ liệu API key chưa hợp lệ.");

  const current = await readXApiSettings();
  const nextKeys = { ...current.keys };
  const sorsa = parsed.data.sorsa?.trim();
  const twitterapis = parsed.data.twitterapis?.trim();
  if (sorsa) nextKeys.sorsa = sorsa;
  if (twitterapis) nextKeys.twitterapis = twitterapis;

  const provider = parsed.data.provider;
  if (!resolveXApiKey(provider, nextKeys)) {
    return errorResponse(provider === "twitterapis" ? "Hãy nhập TwitterAPIs API key." : "Hãy nhập Sorsa API key.");
  }

  await (await getDb()).collection("settings").updateOne(
    { _id: SETTINGS_API_KEYS_ID as never },
    { $set: { keys: nextKeys, xProvider: provider, updatedAt: new Date() } },
    { upsert: true },
  );
  return Response.json({ ok: true });
}
