// Worker nền: lưu snapshot campaign Nucleus trong MongoDB, so sánh mỗi lượt và báo campaign vừa ra mắt vào nhóm/kênh Telegram.
// Chạy: node scripts/nucleus-telegram-worker.mjs        (vòng lặp liên tục, dùng cho PM2)
//       node scripts/nucleus-telegram-worker.mjs --once (kiểm tra một lần rồi thoát)
//       node scripts/nucleus-telegram-worker.mjs --test (gửi tin thử rồi thoát)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const file = [".env.local", ".env"].map((name) => path.join(root, name)).find((item) => fs.existsSync(item));
  if (!file) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || line.trim().startsWith("#")) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

loadEnv();

const NUCLEUS_API = "https://api.nucleus.codes/v1";
const LIST_FIELDS = "id,slug,name,sponsored_by,status,start_time,end_time,is_private";
const PAGE_SIZE = 100;
const FAILURE_ALERT_AFTER = 3;
const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const chatId = (process.env.TELEGRAM_CHAT_ID || "").trim();
const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");
const intervalMs = Math.max(1, Number(process.env.NUCLEUS_NOTIFY_INTERVAL_MIN) || 1) * 60_000;
const args = new Set(process.argv.slice(2));

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function telegram(method, payload) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) return data;
    if (response.status === 429 && attempt < 2) {
      await sleep(((data.parameters?.retry_after) || 5) * 1000 + 500);
      continue;
    }
    throw new Error(`Telegram ${method} lỗi ${response.status}: ${data.description || "không rõ"}`);
  }
  throw new Error(`Telegram ${method} thất bại.`);
}

function sendText(text) {
  return telegram("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
}

async function fetchCampaigns() {
  const campaigns = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const params = new URLSearchParams({ skip: String(skip), limit: String(PAGE_SIZE), fields: LIST_FIELDS });
    const response = await fetch(`${NUCLEUS_API}/projects/?${params}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Nucleus lỗi ${response.status}: ${data.message || data.error || "không rõ"}`);
    const page = Array.isArray(data.projects) ? data.projects : [];
    for (const item of page) {
      if (item?.id && item?.name && !item.is_private) campaigns.push(item);
    }
    const total = typeof data.count === "number" ? data.count : 0;
    if (page.length < PAGE_SIZE || (total && skip + PAGE_SIZE >= total)) break;
  }
  return campaigns;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function formatMessage(item) {
  const lines = [`🚀 <b>Campaign mới trên Nucleus</b>`, "", `<b>${escapeHtml(item.name)}</b>`];
  if (item.sponsored_by) lines.push(`Tài trợ: ${escapeHtml(item.sponsored_by)}`);
  lines.push(`Bắt đầu: ${formatDate(item.start_time)}`, `Kết thúc: ${formatDate(item.end_time)}`);
  const key = item.slug || item.id;
  if (appUrl) lines.push("", `${appUrl}/nucleus/${encodeURIComponent(key)}`);
  return lines.join("\n");
}

function snapshot(item) {
  return {
    name: String(item.name),
    slug: item.slug ? String(item.slug) : null,
    sponsoredBy: item.sponsored_by ? String(item.sponsored_by) : "",
    status: item.status ? String(item.status) : "UNKNOWN",
    startTime: item.start_time || null,
    endTime: item.end_time || null,
  };
}

function changed(previous, next) {
  return Object.keys(next).some((key) => previous[key] !== next[key]);
}

async function check(collection) {
  const campaigns = await fetchCampaigns();
  const now = new Date();
  const ids = campaigns.map((item) => String(item.id));
  const stored = new Map((await collection.find({ _id: { $in: ids } }).toArray()).map((doc) => [doc._id, doc]));
  const seeded = await collection.findOne({ _id: "__seeded" });

  if (!seeded) {
    // Lần chạy đầu: lưu toàn bộ campaign hiện có, coi các campaign đang mở là đã báo để không bắn hàng loạt tin cũ.
    const open = campaigns.filter((item) => item.status === "OPEN").length;
    const docs = campaigns.filter((item) => !stored.has(String(item.id))).map((item) => ({ _id: String(item.id), ...snapshot(item), firstSeenAt: now, updatedAt: now, notifiedAt: item.status === "OPEN" ? now : null }));
    if (docs.length) await collection.insertMany(docs, { ordered: false }).catch(() => undefined);
    await collection.updateOne({ _id: "__seeded" }, { $set: { at: now } }, { upsert: true });
    log(`Khởi tạo: lưu ${docs.length} campaign (${open} đang mở), không gửi thông báo.`);
    await sendText(`✅ Bot Nucleus đã kết nối. Đang theo dõi ${open} campaign đang mở, campaign vừa ra mắt sẽ được báo vào đây.`).catch((error) => log(error.message));
    return;
  }

  // Campaign vừa ra mắt: đang mở và chưa từng được báo (mới xuất hiện, hoặc trước đó chưa ở trạng thái OPEN).
  const launched = campaigns.filter((item) => item.status === "OPEN" && !stored.get(String(item.id))?.notifiedAt);

  // Cập nhật snapshot cho campaign mới hoặc có trường thay đổi, không đụng notifiedAt.
  const writes = [];
  for (const item of campaigns) {
    const id = String(item.id);
    const next = snapshot(item);
    const previous = stored.get(id);
    if (!previous) writes.push({ updateOne: { filter: { _id: id }, update: { $set: { ...next, updatedAt: now }, $setOnInsert: { firstSeenAt: now, notifiedAt: null } }, upsert: true } });
    else if (changed(previous, next)) writes.push({ updateOne: { filter: { _id: id }, update: { $set: { ...next, updatedAt: now } } } });
  }
  if (writes.length) await collection.bulkWrite(writes, { ordered: false });

  if (!launched.length) {
    log(`Không có campaign vừa ra mắt (${campaigns.length} campaign, ${writes.length} thay đổi đã lưu).`);
    return;
  }
  for (const item of launched) {
    try {
      await sendText(formatMessage(item));
      await collection.updateOne({ _id: String(item.id) }, { $set: { notifiedAt: new Date() } });
      log(`Đã báo: ${item.name}`);
    } catch (error) {
      log(`Gửi thất bại cho "${item.name}", thử lại ở lượt sau: ${error.message}`);
    }
    await sleep(1200);
  }
}

async function reply(targetChat, text) {
  await telegram("sendMessage", { chat_id: targetChat, text, parse_mode: "HTML", disable_web_page_preview: true });
}

async function handleUpdate(update) {
  const message = update.message;
  const text = typeof message?.text === "string" ? message.text.trim() : "";
  if (!message?.chat || !text.startsWith("/")) return;
  const command = text.split(/[\s@]/)[0].toLowerCase();
  if (command !== "/start" && command !== "/id") return;
  const id = String(message.chat.id);
  const configured = chatId && chatId === id;
  const lines = [`Chat id của bạn: <code>${escapeHtml(id)}</code>`];
  if (configured) lines.push("", "✅ Chat này đang là nơi nhận thông báo campaign Nucleus mới.");
  else lines.push("", "Hãy gửi ID này cho admin để được cấp quyền truy cập và nhận thông báo campaign mới.");
  await reply(message.chat.id, lines.join("\n"));
  log(`Đã trả lời ${command} cho chat ${id}.`);
}

// Nhận tin đến bằng long polling để bot trả lời /start và /id.
async function pollCommands(isStopping) {
  let offset = 0;
  let warned = false;
  while (!isStopping()) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offset, timeout: 25, allowed_updates: ["message"] }),
        signal: AbortSignal.timeout(35_000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (!warned) log(`getUpdates lỗi ${response.status}: ${data.description || "không rõ"} (nếu bot đang dùng webhook thì cần xoá webhook).`);
        warned = true;
        await sleep(10_000);
        continue;
      }
      warned = false;
      for (const update of data.result || []) {
        offset = update.update_id + 1;
        await handleUpdate(update).catch((error) => log(`Lỗi trả lời lệnh: ${error.message}`));
      }
    } catch (error) {
      if (!isStopping()) log(`Lỗi nhận lệnh: ${error.message}`);
      await sleep(5_000);
    }
  }
}

async function main() {
  if (!botToken) {
    console.error("Thiếu TELEGRAM_BOT_TOKEN trong .env.");
    process.exit(1);
  }
  if (!chatId) {
    // Chưa có chat id: chỉ trả lời /start để người dùng lấy chat id, chưa theo dõi campaign.
    log("Chưa có TELEGRAM_CHAT_ID: chỉ trả lời /start và /id. Nhắn /start cho bot để lấy chat id.");
    let quit = false;
    process.on("SIGINT", () => { quit = true; });
    process.on("SIGTERM", () => { quit = true; });
    await pollCommands(() => quit);
    return;
  }
  if (args.has("--test")) {
    await sendText("🔔 Tin nhắn thử từ bot Nucleus.");
    log("Đã gửi tin thử.");
    return;
  }
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) {
    console.error("Thiếu MONGODB_URI trong .env.");
    process.exit(1);
  }
  const client = await new MongoClient(uri).connect();
  const collection = client.db(process.env.MONGODB_DB || "content_writer").collection("nucleus_campaigns");
  log(`Worker bắt đầu, kiểm tra mỗi ${intervalMs / 60_000} phút.`);

  let stopping = false;
  const stop = () => { stopping = true; };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  if (!args.has("--once")) void pollCommands(() => stopping);

  // Báo vào Telegram khi lỗi liên tiếp (một lần cho mỗi đợt lỗi) và khi hoạt động lại.
  let failures = 0;
  let failingSince = null;
  let alerted = false;

  do {
    try {
      await check(collection);
      if (alerted) {
        await sendText(`✅ Bot Nucleus đã lấy dữ liệu lại bình thường (lỗi từ ${formatDate(failingSince)}).`).catch((error) => log(error.message));
      }
      failures = 0;
      failingSince = null;
      alerted = false;
    } catch (error) {
      failures += 1;
      failingSince = failingSince || new Date();
      log(`Lỗi lượt kiểm tra (${failures} lần liên tiếp): ${error.message}`);
      if (failures >= FAILURE_ALERT_AFTER && !alerted) {
        alerted = true;
        await sendText(`⚠️ Bot Nucleus không lấy được dữ liệu ${failures} lần liên tiếp, có thể đang bỏ lỡ campaign mới.
Lỗi: ${escapeHtml(error.message)}`).catch((sendError) => log(sendError.message));
      }
    }
    if (args.has("--once")) break;
    for (let waited = 0; waited < intervalMs && !stopping; waited += 1000) await sleep(1000);
  } while (!stopping);

  await client.close();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
