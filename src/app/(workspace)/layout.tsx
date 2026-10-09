import { redirect } from "next/navigation";
import { authenticated } from "@/lib/server/auth";
import { getInitialStatus } from "@/lib/server/initial-status";
import { AppNav } from "@/components/navigation/AppNav";
import { PwaRegister } from "@/components/shell/PwaRegister";
import { UIHost } from "@/components/shell/UIHost";
import { OutreachProvider } from "@/contexts/OutreachContext";
import { EmailProvider } from "@/contexts/EmailContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { ErrorReporter } from "@/components/shell/ErrorReporter";
import { ToastProvider } from "@/contexts/ToastContext";
import { UIProvider } from "@/contexts/UIContext";
import { TimeProvider } from "@/components/ui/RelTime";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (!await authenticated()) redirect("/login");
  const initial = await getInitialStatus();
  return <TimeProvider initialNow={initial.now}><ToastProvider><OutreachProvider initialSummary={initial.summary} initialLeads={initial.leads}><EmailProvider initialSnapshot={initial.snapshot}><ActivityProvider initial={initial.activity}><UIProvider>
    <a className="gg-skip" href="#main">Skip to content</a>
    <AppNav />
    {children}
    <UIHost />
    <PwaRegister />
    <ErrorReporter />
  </UIProvider></ActivityProvider></EmailProvider></OutreachProvider></ToastProvider></TimeProvider>;
}
