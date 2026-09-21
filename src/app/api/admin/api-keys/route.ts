import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { SETTINGS_API_KEYS_ID, maskSecret } from "@/lib/api-keys";
import { getDb } from "@/lib/mongodb";
import { errorResponse } from "@/lib/server-utils";

const patchSchema = z.object({
  sorsa: z.string().max(4000).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const doc = await (await getDb()).collection("settings").findOne({ _id: SETTINGS_API_KEYS_ID as never });
  const value = String(((doc?.keys || {}) as Record<string, string>).sorsa || "");
  return Response.json({ sorsa: { set: Boolean(value), hint: maskSecret(value) } });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Dữ liệu API key chưa hợp lệ.");
  const value = parsed.data.sorsa?.trim();
  if (!value) return errorResponse("Hãy nhập Sorsa API key.");
  const db = await getDb();
  const doc = await db.collection("settings").findOne({ _id: SETTINGS_API_KEYS_ID as never });
  const next = { ...((doc?.keys || {}) as Record<string, string>), sorsa: value };
  await db.collection("settings").updateOne(
    { _id: SETTINGS_API_KEYS_ID as never },
    { $set: { keys: next, updatedAt: new Date() } },
    { upsert: true },
  );
  return Response.json({ ok: true });
}
