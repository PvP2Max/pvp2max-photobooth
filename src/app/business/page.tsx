import { redirect } from "next/navigation";

export const metadata = {
  title: "BoothOS Dashboard",
};

export default function BusinessRedirectPage() {
  redirect("/dashboard");
}
