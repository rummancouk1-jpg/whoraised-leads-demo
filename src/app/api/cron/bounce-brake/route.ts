import { equal, privateJson } from "@/lib/server/auth";
import { runBounceBrake } from "@/lib/server/bounce-brake";
export const maxDuration = 120;
export async function POST(request: Request) {
  const secret = process.env.GG_BOUNCE_BRAKE_SECRET;
  if (!secret || !equal(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) return privateJson({ error: "Unauthorized." }, 401);
  const trigger = request.headers.get("x-gg-trigger") === "schedule" ? "schedule" : "manual";
  const id = request.headers.get("x-gg-run-id") ?? "";
  try { return privateJson(await runBounceBrake(trigger, /^\d{1,20}$/.test(id) ? id : "", request.headers.get("x-gg-pause-proof") === "1")); }
  catch { return privateJson({ ok: false, error: "Bounce check failed. Inspect the scheduler and saved check history; no campaign is resumed." }, 503); }
}
