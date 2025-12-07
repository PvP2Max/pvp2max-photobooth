import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TenantScope, scopedStorageRoot } from "./tenants";

type Notification = {
  email: string;
  count: number;
  createdAt: string;
};

function notifyPaths(scope: TenantScope) {
  const root = scopedStorageRoot(scope);
  const dir = path.join(root, "notifications");
  const file = path.join(dir, "notifications.json");
  return { dir, file };
}

async function ensureStorage(scope: TenantScope) {
  const { dir, file } = notifyPaths(scope);
  await mkdir(dir, { recursive: true });
  try {
    await readFile(file, "utf8");
  } catch {
    await writeFile(file, JSON.stringify({ items: [] }), "utf8");
  }
}

export async function addNotification(scope: TenantScope, email: string, count: number) {
  await ensureStorage(scope);
  const { file } = notifyPaths(scope);
  const raw = await readFile(file, "utf8").catch(() => '{"items":[]}');
  const data = JSON.parse(raw) as { items: Notification[] };
  data.items.push({
    email,
    count,
    createdAt: new Date().toISOString(),
  });
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export async function popNotifications(scope: TenantScope) {
  await ensureStorage(scope);
  const { file } = notifyPaths(scope);
  const raw = await readFile(file, "utf8").catch(() => '{"items":[]}');
  const data = JSON.parse(raw) as { items: Notification[] };
  await writeFile(file, JSON.stringify({ items: [] }, null, 2), "utf8");
  return data.items;
}
