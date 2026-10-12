import { equal, privateJson } from "@/lib/server/auth";
import { runBounceBrake } from "@/lib/server/bounce-brake";
import { runInstantlySync } from "@/lib/server/sync";
export const maxDuration = 120;
export async function POST(request: Request) {
  const secret = process.env.GG_BOUNCE_BRAKE_SECRET;
  if (!secret || !equal(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) return privateJson({ error: "Unauthorized." }, 401);
  const source = request.headers.get("x-gg-trigger");
  const trigger = source === "schedule" ? "schedule" : source === "cron-job.org" || request.headers.get("user-agent")?.toLowerCase().includes("cron-job.org") ? "cron-job.org" : "manual";
  const id = request.headers.get("x-gg-run-id") ?? "";
  let brake: Awaited<ReturnType<typeof runBounceBrake>> | null = null;
  let brakeError = false;
  try { brake = await runBounceBrake(trigger, /^\d{1,20}$/.test(id) ? id : "", request.headers.get("x-gg-pause-proof") === "1"); }
  catch { brakeError = true; }

  // The safety check always runs first. The following sync has its own budget;
  // failures are reported without changing the already completed brake result.
  let sync;
  try { sync = await runInstantlySync(trigger === "cron-job.org" ? "cron-job.org" : "cron", 0, 70000); }
  catch { sync = { ran: true, ok: false, reason: "Instantly sync failed. The previous data is still shown." }; }
  const ok = !brakeError && !!brake?.ok && (sync.ok || sync.pending === true);
  return privateJson({ ok, brake, brakeError: brakeError ? "Bounce check failed. Inspect the scheduler and saved check history." : null, sync }, brakeError ? 503 : ok ? 200 : 502);
}
