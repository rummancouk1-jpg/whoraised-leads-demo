import { authenticated, privateJson } from "@/lib/server/auth";
import { fetchEmailMetrics } from "@/lib/server/instantly";
import { snapshotHistory } from "@/lib/server/snapshots";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";

// This app has Cache Components disabled. Share successful provider reads for
// one polling interval, scoped to the workspace and campaign; failures still
// surface normally and are never cached as metrics.
const workspace = createHash("sha256").update([process.env.DATABASE_URL, process.env.INSTANTLY_API_KEY, process.env.INSTANTLY_CAMPAIGN_ID].join("\n")).digest("hex");
const liveMetrics = unstable_cache(fetchEmailMetrics, ["gg-email-live", workspace], { revalidate: 60 });
export async function GET() {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  const [live, history] = await Promise.allSettled([liveMetrics(), snapshotHistory()]);
  return privateJson({ live: live.status === "fulfilled" ? live.value : null, error: live.status === "rejected" ? (live.reason instanceof Error && live.reason.message.startsWith("Instantly") || live.reason?.message?.startsWith("Configured") ? live.reason.message : "Instantly connection interrupted. Retry shortly.") : "", history: history.status === "fulfilled" ? history.value : [], historyError: history.status === "rejected" ? "Snapshot history could not be loaded." : "" });
}
