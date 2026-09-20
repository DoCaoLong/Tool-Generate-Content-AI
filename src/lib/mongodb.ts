import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "content_writer";

declare global {
  var __contentWriterMongo: Promise<MongoClient> | undefined;
  var __contentWriterIndexes: Promise<void> | undefined;
}

function getClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI chưa được cấu hình.");
  }

  if (!global.__contentWriterMongo) {
    global.__contentWriterMongo = new MongoClient(uri).connect();
  }

  return global.__contentWriterMongo;
}

async function ensureIndexes(db: Db) {
  if (!global.__contentWriterIndexes) {
    global.__contentWriterIndexes = Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("projects").createIndex({ userId: 1, updatedAt: -1 }),
      db.collection("generations").createIndex({ userId: 1, projectId: 1, createdAt: -1 }),
      db.collection("styles").createIndex({ userId: 1, updatedAt: -1 }),
    ]).then(() => undefined);
  }

  await global.__contentWriterIndexes;
}

export async function getDb() {
  const client = await getClient();
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}
