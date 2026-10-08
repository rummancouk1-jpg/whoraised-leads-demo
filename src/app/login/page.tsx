import { redirect } from "next/navigation";
import { authenticated } from "@/lib/server/auth";
import { Login } from "@/components/Login";
export default async function LoginPage() {
  if (await authenticated()) redirect("/");
  return <Login />;
}
