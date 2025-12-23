import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getLogtoUserInfo, findOrCreateUser, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ success: false, error: "Code required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const tokenResponse = await exchangeCodeForToken(code, `${appUrl}/auth/callback`);
    const userInfo = await getLogtoUserInfo(tokenResponse.access_token);
    const user = await findOrCreateUser({
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    });

    await setSessionCookie(user.id);
    return NextResponse.json({ success: true, data: { userId: user.id } });
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 });
  }
}
