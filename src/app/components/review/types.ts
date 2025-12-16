import type { BackgroundOption } from "@/lib/backgrounds";

export type Photo = {
  id: string;
  email: string;
  originalName: string;
  createdAt: string;
  originalUrl: string;
  cutoutUrl: string;
  previewUrl?: string;
};

export type Transform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type Slot = {
  id: string;
  backgroundId?: string;
  preview?: string;
  transform?: Transform;
  matchBackground?: boolean;
};

export type BackgroundState = BackgroundOption & { isCustom?: boolean };
