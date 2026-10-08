import "server-only";
import domains from "@/config/email-inbox-domains.json";
export function isWorkspaceInbox(email: string) {
  return domains.includes(email.trim().toLowerCase().split("@")[1]);
}
