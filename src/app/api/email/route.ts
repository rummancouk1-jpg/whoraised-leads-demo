import { authenticated, privateJson } from "@/lib/server/auth";
import { fetchEmailMetrics } from "@/lib/server/instantly";
import { snapshotHistory } from "@/lib/server/snapshots";
export async function GET() {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  const [live, history] = await Promise.allSettled([fetchEmailMetrics(), snapshotHistory()]);
  return privateJson({ live: live.status === "fulfilled" ? live.value : null, error: live.status === "rejected" ? (live.reason instanceof Error && live.reason.message.startsWith("Instantly") || live.reason?.message?.startsWith("Configured") ? live.reason.message : "Instantly connection interrupted. Retry shortly.") : "", history: history.status === "fulfilled" ? history.value : [], historyError: history.status === "rejected" ? "Snapshot history could not be loaded." : "" });
}
