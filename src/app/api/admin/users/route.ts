import { requireAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const db = await getDb();
  const users = await db.collection("users").find({}).project({ passwordHash: 0 }).sort({ createdAt: -1 }).toArray();
  return Response.json({
    users: users.map((user) => ({
      id: user._id.toHexString(),
      name: String(user.name || ""),
      email: String(user.email || ""),
      disabled: Boolean(user.disabled),
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : null,
    })),
  });
}
