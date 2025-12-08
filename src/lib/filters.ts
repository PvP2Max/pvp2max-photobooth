import sharp from "sharp";

export type FilterId =
  | "none"
  | "bw"
  | "warm"
  | "cool"
  | "matte"
  | "soft"
  | "vintage"
  | "glam"
  | "neon"
  | "dramatic"
  | "cinematic"
  | "noir";

export async function applyFilterToBuffer(buffer: Buffer, filterId?: string) {
  const id = (filterId as FilterId) || "none";
  const image = sharp(buffer);
  switch (id) {
    case "bw":
      return image.grayscale().toBuffer();
    case "warm":
      return image.modulate({ saturation: 1.1, brightness: 1.03 }).tint("#f8e1c1").toBuffer();
    case "cool":
      return image.modulate({ saturation: 0.95 }).recomb([
        [0.95, 0.05, 0],
        [0, 0.98, 0.02],
        [0.02, 0.05, 0.93],
      ]).toBuffer();
    case "matte":
      return image.modulate({ saturation: 0.9, brightness: 0.97 }).toBuffer();
    case "soft":
      return image.modulate({ brightness: 1.04, saturation: 1.02 }).toBuffer();
    case "vintage":
      return image
        .modulate({ saturation: 0.9, brightness: 1.02 })
        .tint("#f0dfc2")
        .gamma(1.03)
        .toBuffer();
    case "glam":
      return image.modulate({ saturation: 1.12, brightness: 1.05, contrast: 1.1 }).toBuffer();
    case "neon":
      return image.modulate({ saturation: 1.35, brightness: 1.02, contrast: 1.08 }).toBuffer();
    case "dramatic":
      return image.modulate({ saturation: 1.15, contrast: 1.15 }).toBuffer();
    case "cinematic":
      return image.modulate({ saturation: 1.1, contrast: 1.12, brightness: 0.98 }).toBuffer();
    case "noir":
      return image.grayscale().modulate({ contrast: 1.25, brightness: 0.92 }).toBuffer();
    case "none":
    default:
      return buffer;
  }
}
