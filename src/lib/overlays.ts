import { access, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WATERMARK_DEFAULT = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="220">
  <defs>
    <linearGradient id="wmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.6)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.85)" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1600" height="220" fill="url(#wmGradient)" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="42" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.9)" letter-spacing="4">
    Powered by BoothOS
  </text>
</svg>`;

const themeColors: Record<
  string,
  { accent: string; glow: string; text: string; badge: string }
> = {
  default: {
    accent: "#9b5cff",
    glow: "rgba(155,92,255,0.35)",
    text: "#ffffff",
    badge: "rgba(255,255,255,0.14)",
  },
  wedding: {
    accent: "#f6c1d5",
    glow: "rgba(246,193,213,0.4)",
    text: "#ffffff",
    badge: "rgba(255,255,255,0.18)",
  },
  birthday: {
    accent: "#67e8f9",
    glow: "rgba(103,232,249,0.4)",
    text: "#0b1022",
    badge: "rgba(11,16,34,0.14)",
  },
  military: {
    accent: "#7dd3fc",
    glow: "rgba(12,148,196,0.35)",
    text: "#e2e8f0",
    badge: "rgba(255,255,255,0.12)",
  },
  christmas: {
    accent: "#f87171",
    glow: "rgba(248,113,113,0.36)",
    text: "#ffffff",
    badge: "rgba(255,255,255,0.12)",
  },
  valentines: {
    accent: "#fb7185",
    glow: "rgba(251,113,133,0.36)",
    text: "#ffffff",
    badge: "rgba(255,255,255,0.12)",
  },
};

export async function loadWatermark() {
  const filePath = path.join(process.cwd(), "public", "assets", "watermark.png");
  try {
    await access(filePath);
    const buffer = await readFile(filePath);
    return buffer;
  } catch {
    // Fallback to inline SVG watermark
    return Buffer.from(WATERMARK_DEFAULT);
  }
}

export async function renderOverlay(width: number, height: number, theme: string) {
  const colors = themeColors[theme] ?? themeColors.default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="ovGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0.05)" />
        <stop offset="60%" stop-color="rgba(0,0,0,0.18)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.28)" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#ovGradient)"/>
    <rect x="36" y="36" width="${width - 72}" height="${height - 72}" rx="38" ry="38" fill="none" stroke="${colors.accent}" stroke-width="16" opacity="0.55"/>
    <rect x="54" y="54" width="${width - 108}" height="${height - 108}" rx="30" ry="30" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="10" opacity="0.75"/>
    <g transform="translate(${width / 2 - 220}, ${height - 120})">
      <rect x="0" y="0" width="440" height="90" rx="18" ry="18" fill="${colors.badge}" stroke="${colors.accent}" stroke-width="3" opacity="0.9"/>
      <text x="220" y="54" text-anchor="middle" font-size="30" font-family="Arial, Helvetica, sans-serif" fill="${colors.text}" font-weight="700" letter-spacing="2">
        BoothOS Live
      </text>
    </g>
    <circle cx="${width - 120}" cy="120" r="64" fill="${colors.accent}" opacity="0.22"/>
    <circle cx="${width - 120}" cy="120" r="32" fill="${colors.accent}" opacity="0.35"/>
  </svg>`;
  const buffer = Buffer.from(svg);
  return sharp(buffer).png().toBuffer();
}

export function allowedOverlayTheme(overlaysAll: boolean, theme?: string) {
  // Overlays are now a custom-only upsell handled off-platform; skip built-in frames.
  if (!overlaysAll) return null;
  if (!theme || theme === "none" || theme === "custom-request") return null;
  // When a bespoke overlay is provided later, map it here; for now disable built-ins.
  return null;
}
