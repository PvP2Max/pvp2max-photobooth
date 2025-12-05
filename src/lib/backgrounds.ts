import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type BackgroundOption = {
  id: string;
  name: string;
  description: string;
  asset: string;
  isCustom?: boolean;
  createdAt?: string;
};

type BackgroundRecord = {
  id: string;
  name: string;
  description: string;
  filename: string;
  contentType: string;
  createdAt: string;
};

type BackgroundIndex = {
  backgrounds: BackgroundRecord[];
};

const BUILT_IN_BACKGROUNDS: BackgroundOption[] = [
  { id: "winter-lights", name: "Winter Lights", description: "Cool teal glow with snowy speckles and soft aurora bands.", asset: "/backgrounds/winter-lights.svg" },
  { id: "candy-stripes", name: "Candy Cane Stripes", description: "Diagonal red and cream striping with a soft vignette.", asset: "/backgrounds/candy-stripes.svg" },
  { id: "snow-globe", name: "Snow Globe", description: "Icy blue swirl, snow dust, and circular framing highlight.", asset: "/backgrounds/snow-globe.svg" },
  { id: "pine-lanterns", name: "Pine Lanterns", description: "Evergreen gradient with hanging lights and gentle grain.", asset: "/backgrounds/pine-lanterns.svg" },
  { id: "gingerbread-hall", name: "Gingerbread Hall", description: "Warm cookie browns with icing curves and star sprinkles.", asset: "/backgrounds/gingerbread-hall.svg" },
  { id: "crimson-ornaments", name: "Crimson Ornaments", description: "Deep red velvet with golden ornament glows.", asset: "/backgrounds/crimson-ornaments.svg" },
  { id: "midnight-snowfall", name: "Midnight Snowfall", description: "Indigo night sky, falling snow, and a moonlit fade.", asset: "/backgrounds/midnight-snowfall.svg" },
  { id: "holly-bokeh", name: "Holly Bokeh", description: "Evergreen base with soft red-gold bokeh and leaf hints.", asset: "/backgrounds/holly-bokeh.svg" },
  { id: "cozy-fireplace", name: "Cozy Fireplace", description: "Ember glow, brick texture hints, and warm vignette.", asset: "/backgrounds/cozy-fireplace.svg" },
  { id: "north-star", name: "North Star", description: "Radiant starburst over a calm navy gradient and sparkles.", asset: "/backgrounds/north-star.svg" },
  { id: "frosted-mint", name: "Frosted Mint", description: "Mint and ice gradients with frosted edges and confetti.", asset: "/backgrounds/frosted-mint.svg" },
  { id: "gold-ribbon", name: "Gold Ribbon", description: "Champagne gold sweep with ribbon arcs and light grain.", asset: "/backgrounds/gold-ribbon.svg" },
  { id: "aurora-ridge", name: "Aurora Ridge (AK)", description: "Alaska aurora hues with silhouetted ridge lines.", asset: "/backgrounds/aurora-ridge.svg" },
  { id: "glacier-bay", name: "Glacier Bay (AK)", description: "Glacial blues, ice floes, and distant mountains.", asset: "/backgrounds/glacier-bay.svg" },
  { id: "spruce-sunset", name: "Spruce Sunset (AK)", description: "Copper sunset over spruce silhouettes and soft mist.", asset: "/backgrounds/spruce-sunset.svg" },
  { id: "icefield-dawn", name: "Icefield Dawn (AK)", description: "Pink dawn over icy plains with sharp glacier facets.", asset: "/backgrounds/icefield-dawn.svg" },
];

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const BACKGROUND_DIR = path.join(STORAGE_ROOT, "backgrounds");
const FILE_DIR = path.join(BACKGROUND_DIR, "files");
const INDEX_FILE = path.join(BACKGROUND_DIR, "backgrounds.json");

function extensionFor(contentType: string, fallback = ".png") {
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return fallback;
}

async function ensureBackgroundStorage() {
  await mkdir(FILE_DIR, { recursive: true });
  try {
    await readFile(INDEX_FILE, "utf8");
  } catch {
    const seed: BackgroundIndex = { backgrounds: [] };
    await writeFile(INDEX_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readIndex(): Promise<BackgroundIndex> {
  await ensureBackgroundStorage();
  try {
    const raw = await readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw) as BackgroundIndex;
  } catch (error) {
    console.error("Failed to read background index", error);
    return { backgrounds: [] };
  }
}

async function writeIndex(index: BackgroundIndex) {
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

export async function listBackgrounds(): Promise<BackgroundOption[]> {
  const index = await readIndex();
  const custom: BackgroundOption[] = index.backgrounds.map((bg) => ({
    id: bg.id,
    name: bg.name,
    description: bg.description,
    asset: `/api/backgrounds/files/${bg.id}`,
    isCustom: true,
    createdAt: bg.createdAt,
  }));

  return [...BUILT_IN_BACKGROUNDS, ...custom];
}

export async function addBackground({
  name,
  description,
  file,
}: {
  name: string;
  description: string;
  file: File;
}): Promise<BackgroundOption> {
  const index = await readIndex();
  const id = randomUUID();
  const contentType = (file as Blob).type || "application/octet-stream";
  const ext = extensionFor(contentType);
  const filename = `${id}${ext}`;
  const target = path.join(FILE_DIR, filename);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(target, Buffer.from(arrayBuffer));

  const record: BackgroundRecord = {
    id,
    name,
    description,
    filename,
    contentType,
    createdAt: new Date().toISOString(),
  };

  index.backgrounds.push(record);
  await writeIndex(index);

  return {
    id,
    name,
    description,
    asset: `/api/backgrounds/files/${id}`,
    isCustom: true,
    createdAt: record.createdAt,
  };
}

export async function removeBackground(id: string) {
  const index = await readIndex();
  const record = index.backgrounds.find((bg) => bg.id === id);
  if (!record) {
    throw new Error("Background not found or not removable");
  }

  const filePath = path.join(FILE_DIR, record.filename);
  await rm(filePath, { force: true });
  const remaining = index.backgrounds.filter((bg) => bg.id !== id);
  await writeIndex({ backgrounds: remaining });
}

export async function findBackgroundAsset(id: string) {
  const index = await readIndex();
  const record = index.backgrounds.find((bg) => bg.id === id);
  if (!record) return null;
  return {
    path: path.join(FILE_DIR, record.filename),
    contentType: record.contentType,
  };
}

export function builtInBackgrounds() {
  return BUILT_IN_BACKGROUNDS;
}

export async function getBackgroundName(id: string) {
  const all = await listBackgrounds();
  return all.find((bg) => bg.id === id)?.name ?? id;
}
