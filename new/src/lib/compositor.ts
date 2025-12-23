import sharp from "sharp";

export type CompositeOptions = {
  foreground: Buffer;
  background: Buffer;
  transform?: {
    scale?: number;
    offsetX?: number;
    offsetY?: number;
  };
  outputWidth?: number;
  outputHeight?: number;
};

export async function composeImage(options: CompositeOptions): Promise<Buffer> {
  const {
    foreground,
    background,
    transform = {},
    outputWidth = 1920,
    outputHeight = 1080,
  } = options;

  const { scale = 1, offsetX = 0, offsetY = 0 } = transform;

  const resizedBg = await sharp(background)
    .resize(outputWidth, outputHeight, { fit: "cover" })
    .toBuffer();

  const fgMeta = await sharp(foreground).metadata();
  const fgWidth = fgMeta.width || 800;
  const fgHeight = fgMeta.height || 1200;

  const scaledWidth = Math.round(fgWidth * scale);
  const scaledHeight = Math.round(fgHeight * scale);

  const resizedFg = await sharp(foreground)
    .resize(scaledWidth, scaledHeight, { fit: "inside" })
    .toBuffer();

  const left = Math.round((outputWidth - scaledWidth) / 2 + offsetX);
  const top = Math.round((outputHeight - scaledHeight) / 2 + offsetY);

  const composite = await sharp(resizedBg)
    .composite([
      {
        input: resizedFg,
        left: Math.max(0, left),
        top: Math.max(0, top),
      },
    ])
    .png()
    .toBuffer();

  return composite;
}

export async function resizeImage(buffer: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> {
  return sharp(buffer).resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true }).toBuffer();
}
