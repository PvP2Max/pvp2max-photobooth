import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function randomString(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getPlanLimits(plan: "FREE" | "PRO" | "CORPORATE") {
  const limits = {
    FREE: { photoCap: 25, aiCredits: 0, backgroundRemoval: false, photographerMode: false },
    PRO: { photoCap: 300, aiCredits: 5, backgroundRemoval: true, photographerMode: false },
    CORPORATE: { photoCap: 1000, aiCredits: 10, backgroundRemoval: true, photographerMode: true },
  };
  return limits[plan];
}
