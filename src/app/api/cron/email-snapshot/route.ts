import { equal, privateJson } from "@/lib/server/auth";
import { captureSnapshot } from "@/lib/server/snapshots";
export const maxDuration = 60;
export async function GET(request: Request) {
  const key = process.env.CRON_SECRET;
  if (!key || !equal(request.headers.get("authorization") ?? "", `Bearer ${key}`)) return privateJson({ error: "Unauthorized." }, 401);
  try { return privateJson(await captureSnapshot()); }
  catch { return privateJson({ error: "Snapshot failed. Existing history was retained." }, 503); }
}
