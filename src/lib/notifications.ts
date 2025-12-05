import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Notification = {
  email: string;
  count: number;
  createdAt: string;
};

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const NOTIFY_DIR = path.join(STORAGE_ROOT, "notifications");
const NOTIFY_FILE = path.join(NOTIFY_DIR, "notifications.json");

async function ensureStorage() {
  await mkdir(NOTIFY_DIR, { recursive: true });
  try {
    await readFile(NOTIFY_FILE, "utf8");
  } catch {
    await writeFile(NOTIFY_FILE, JSON.stringify({ items: [] }), "utf8");
  }
}

export async function addNotification(email: string, count: number) {
  await ensureStorage();
  const raw = await readFile(NOTIFY_FILE, "utf8").catch(() => '{"items":[]}');
  const data = JSON.parse(raw) as { items: Notification[] };
  data.items.push({
    email,
    count,
    createdAt: new Date().toISOString(),
  });
  await writeFile(NOTIFY_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function popNotifications() {
  await ensureStorage();
  const raw = await readFile(NOTIFY_FILE, "utf8").catch(() => '{"items":[]}');
  const data = JSON.parse(raw) as { items: Notification[] };
  await writeFile(NOTIFY_FILE, JSON.stringify({ items: [] }, null, 2), "utf8");
  return data.items;
}
