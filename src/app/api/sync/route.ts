import { authenticated, privateJson, sameOrigin } from "@/lib/server/auth";
import { runInstantlySync } from "@/lib/server/sync";
export const maxDuration = 60;
/** The workspace asks for a sync when it is open and the last good one is older than the interval (auto), or on "Sync now" (manual). */
export async function POST(request: Request) {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  const manual = new URL(request.url).searchParams.get("manual") === "1";
  const outcome = await runInstantlySync(manual ? "manual" : "auto", manual ? 1 : 14);
  return privateJson(outcome);
}
