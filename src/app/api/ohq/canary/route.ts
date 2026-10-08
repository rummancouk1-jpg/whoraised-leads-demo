import { ohqAuthorized } from "@/lib/server/ohq";

export const dynamic = "force-dynamic";
/** Monitoring canary: throws on purpose (bearer-only) so the capture path can be proven end to end on a deployment. */
export async function GET(request: Request) {
  if (!ohqAuthorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const error = new Error("Monitoring canary: deliberate test error");
  error.name = "MonitoringCanary";
  throw error;
}
