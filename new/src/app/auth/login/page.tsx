import { redirect } from "next/navigation";
import { getLogtoAuthUrl } from "@/lib/auth";

export default async function LoginPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const authUrl = await getLogtoAuthUrl(`${appUrl}/auth/callback`);
  redirect(authUrl);
}
