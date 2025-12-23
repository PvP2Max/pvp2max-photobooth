import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./auth";
import db from "./db";

export type ApiContext = {
  user: SessionUser;
};

export type RouteContext<T = Record<string, string>> = {
  params: Promise<T>;
};

export type ApiHandler<T = Record<string, string>> = (
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext<T>
) => Promise<NextResponse>;

export function withAuth<T = Record<string, string>>(handler: ApiHandler<T>) {
  return async (request: NextRequest, routeContext: RouteContext<T>) => {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const context: ApiContext = { user };
    return handler(request, context, routeContext);
  };
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

export async function parseBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function validateEventAccess(
  userId: string,
  eventId: string
): Promise<{ hasAccess: boolean; role: "owner" | "collaborator" | null }> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      business: { select: { ownerId: true } },
      roles: { where: { userId } },
    },
  });

  if (!event) {
    return { hasAccess: false, role: null };
  }

  if (event.business.ownerId === userId) {
    return { hasAccess: true, role: "owner" };
  }

  const role = event.roles[0];
  if (role) {
    return { hasAccess: true, role: role.role as "collaborator" };
  }

  return { hasAccess: false, role: null };
}

export function getPaginationParams(request: NextRequest) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}
