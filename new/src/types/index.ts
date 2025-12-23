export interface User {
  id: string;
  logtoId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  stripeCustomerId: string | null;
}

export type EventPlan = "FREE" | "PRO" | "CORPORATE";
export type EventMode = "SELF_SERVICE" | "PHOTOGRAPHER";
export type EventStatus = "DRAFT" | "LIVE" | "CLOSED";

export interface Event {
  id: string;
  name: string;
  slug: string;
  businessId: string;
  plan: EventPlan;
  mode: EventMode;
  status: EventStatus;
  photoCap: number;
  photoUsed: number;
  aiCredits: number;
  aiUsed: number;
  backgroundRemovalEnabled: boolean;
  eventDate: Date | null;
}

export interface GuestSession {
  id: string;
  eventId: string;
  email: string;
  name: string | null;
}

export interface Photo {
  id: string;
  eventId: string;
  sessionId: string;
  originalName: string;
  originalKey: string;
  cutoutKey: string | null;
}

export interface Background {
  id: string;
  eventId: string | null;
  name: string;
  description: string | null;
  category: "BACKGROUND" | "FRAME";
  r2Key: string;
  previewKey: string | null;
  isAiGenerated: boolean;
  isDefault: boolean;
  isEnabled: boolean;
}

export interface Production {
  id: string;
  eventId: string;
  email: string;
  downloadToken: string;
  tokenExpiresAt: Date;
  downloadCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
