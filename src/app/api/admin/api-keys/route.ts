import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { managedApiKeyIds, maskSecret } from "@/lib/api-keys";
import { getDb } from "@/lib/mongodb";
import { errorResponse } from "@/lib/server-utils";

const SETTINGS_ID = "api_keys";
const patchSchema = z.record(z.string().max(4000));

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const doc = await (await getDb()).collection("settings").findOne({ _id: SETTINGS_ID as never });
  const stored = (doc?.keys || {}) as Record<string, string>;
  const keys = Object.fromEntries(managedApiKeyIds.map((id) => {
    const value = stored[id] || "";
    return [id, { set: Boolean(value), hint: maskSecret(value) }];
  }));
  return Response.json({ keys });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Dữ liệu API key chưa hợp lệ.");
  const db = await getDb();
  const doc = await db.collection("settings").findOne({ _id: SETTINGS_ID as never });
  const next = { ...((doc?.keys || {}) as Record<string, string>) };
  for (const id of managedApiKeyIds) {
    if (!Object.prototype.hasOwnProperty.call(parsed.data, id)) continue;
    const value = parsed.data[id].trim();
    if (value) next[id] = value;
  }
  await db.collection("settings").updateOne(
    { _id: SETTINGS_ID as never },
    { $set: { keys: next, updatedAt: new Date() } },
    { upsert: true },
  );
  return Response.json({ ok: true });
}
