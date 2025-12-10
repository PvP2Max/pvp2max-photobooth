import { redirect } from "next/navigation";

export const metadata = {
  title: "BoothOS Login",
};

export default function BusinessRedirectPage() {
  redirect("/login");
}
