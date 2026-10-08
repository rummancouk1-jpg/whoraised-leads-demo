import { redirect } from "next/navigation";
import { authenticated } from "@/lib/server/auth";
import { getInitialStatus } from "@/lib/server/initial-status";
import { AppNav } from "@/components/navigation/AppNav";
import { PwaRegister } from "@/components/shell/PwaRegister";
import { UIHost } from "@/components/shell/UIHost";
import { OutreachProvider } from "@/contexts/OutreachContext";
import { EmailProvider } from "@/contexts/EmailContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { UIProvider } from "@/contexts/UIContext";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (!await authenticated()) redirect("/login");
  const initial = await getInitialStatus();
  return <ToastProvider><OutreachProvider initialSummary={initial.summary}><EmailProvider initialSnapshot={initial.snapshot}><UIProvider>
    <a className="gg-skip" href="#main">Skip to content</a>
    <AppNav />
    {children}
    <UIHost />
    <PwaRegister />
  </UIProvider></EmailProvider></OutreachProvider></ToastProvider>;
}
