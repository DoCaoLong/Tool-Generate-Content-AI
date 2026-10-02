import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const TTL_MS = 30 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordReset(userId: ObjectId) {
  const db = await getDb();
  const resets = db.collection("password_resets");
  const latest = await resets.find({ userId }).sort({ createdAt: -1 }).limit(1).next();
  if (latest?.createdAt instanceof Date && Date.now() - latest.createdAt.getTime() < COOLDOWN_MS) {
    return null;
  }
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await resets.deleteMany({ userId });
  await resets.insertOne({
    userId,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + TTL_MS),
    createdAt: now,
  });
  return token;
}

export async function consumePasswordReset(token: string) {
  const db = await getDb();
  const resets = db.collection("password_resets");
  const doc = await resets.findOneAndDelete({
    tokenHash: hashResetToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!doc?.userId || !(doc.userId instanceof ObjectId)) return null;
  await resets.deleteMany({ userId: doc.userId });
  return doc.userId;
}
