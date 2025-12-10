import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard | BoothOS",
};

export default function BusinessPage() {
  redirect("/dashboard");
}
