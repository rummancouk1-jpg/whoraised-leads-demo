import { redirect } from "next/navigation";
import { authenticated } from "@/lib/server/auth";
import { AppNav } from "@/components/navigation/AppNav";
import { OutreachProvider } from "@/contexts/OutreachContext";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (!await authenticated()) redirect("/login");
  return <OutreachProvider><AppNav />{children}</OutreachProvider>;
}
