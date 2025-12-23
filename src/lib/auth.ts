import { cookies } from "next/headers";
import db from "./db";

const LOGTO_ENDPOINT = process.env.LOGTO_ENDPOINT;
const LOGTO_APP_ID = process.env.LOGTO_APP_ID;
const LOGTO_APP_SECRET = process.env.LOGTO_APP_SECRET;

export type SessionUser = {
  id: string;
  logtoId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("boothos_session");

    if (!sessionCookie?.value) {
      return null;
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.userId) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
    });

    return user;
  } catch {
    return null;
  }
}

export async function getLogtoAuthUrl(redirectUri: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: LOGTO_APP_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
  });

  return `${LOGTO_ENDPOINT}/oidc/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const response = await fetch(`${LOGTO_ENDPOINT}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${LOGTO_APP_ID}:${LOGTO_APP_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Token exchange failed");
  }

  return response.json();
}

export async function getLogtoUserInfo(accessToken: string) {
  const response = await fetch(`${LOGTO_ENDPOINT}/oidc/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  return response.json();
}

export async function findOrCreateUser(logtoUser: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<SessionUser> {
  let user = await db.user.findUnique({
    where: { logtoId: logtoUser.sub },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        logtoId: logtoUser.sub,
        email: logtoUser.email,
        name: logtoUser.name || null,
        avatarUrl: logtoUser.picture || null,
      },
    });
  }

  return user;
}

export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set("boothos_session", JSON.stringify({ userId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("boothos_session");
}
