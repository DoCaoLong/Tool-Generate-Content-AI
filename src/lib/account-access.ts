import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function readSorsaAccess(userId: string) {
  if (!ObjectId.isValid(userId)) return false;
  const account = await (await getDb()).collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { sorsaAccess: 1 } });
  return account?.sorsaAccess === true;
}

export async function grantSorsaAccess(userId: string) {
  if (!ObjectId.isValid(userId)) return;
  await (await getDb()).collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { sorsaAccess: true, updatedAt: new Date() } },
  );
}
