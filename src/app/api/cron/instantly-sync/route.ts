import { equal, privateJson } from "@/lib/server/auth";
import { runInstantlySync } from "@/lib/server/sync";
export const maxDuration = 60;
export async function GET(request: Request) {
  const key = process.env.CRON_SECRET;
  if (!key || !equal(request.headers.get("authorization") ?? "", `Bearer ${key}`)) return privateJson({ error: "Unauthorized." }, 401);
  const outcome = await runInstantlySync("cron");
  return privateJson(outcome, outcome.ok ? 200 : 502);
}
