import { redirect } from "next/navigation";

export default function HomePage() {
  // Authenticated users landing on "/" get redirected to dashboard.
  // Unauthenticated users: the (app)/layout guard will redirect to /login.
  redirect("/dashboard");
}
