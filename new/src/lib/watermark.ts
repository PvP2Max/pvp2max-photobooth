import sharp from "sharp";

const WATERMARK_TEXT = "Powered by BoothOS";
const WATERMARK_FONT_SIZE = 24;
const WATERMARK_PADDING = 20;

export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width || 1920;
  const height = metadata.height || 1080;

  const textWidth = WATERMARK_TEXT.length * WATERMARK_FONT_SIZE * 0.6;
  const badgeWidth = textWidth + WATERMARK_PADDING * 2;
  const badgeHeight = WATERMARK_FONT_SIZE + WATERMARK_PADDING * 1.5;

  const svgWatermark = Buffer.from(`
    <svg width="${badgeWidth}" height="${badgeHeight}">
      <rect x="0" y="0" width="${badgeWidth}" height="${badgeHeight}" rx="6" ry="6" fill="rgba(0, 0, 0, 0.8)" />
      <text x="${WATERMARK_PADDING}" y="${badgeHeight / 2 + WATERMARK_FONT_SIZE / 3}" font-family="Arial, sans-serif" font-size="${WATERMARK_FONT_SIZE}" fill="white">${WATERMARK_TEXT}</text>
    </svg>
  `);

  const left = width - badgeWidth - 20;
  const top = height - badgeHeight - 20;

  return image
    .composite([{ input: svgWatermark, left: Math.max(0, Math.round(left)), top: Math.max(0, Math.round(top)) }])
    .toBuffer();
}
