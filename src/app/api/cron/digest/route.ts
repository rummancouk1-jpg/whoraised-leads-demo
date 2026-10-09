import { equal, privateJson } from "@/lib/server/auth";
import { sendDigest } from "@/lib/server/digest";
import { isSendWindow } from "@/lib/digest";
import { recordError } from "@/lib/server/errors";

export const maxDuration = 60;
/** Any trigger outside Monday 09:00-11:59 in New York does nothing; inside it, the sender enforces once per week. */
export async function GET(request: Request) {
  const key = process.env.CRON_SECRET;
  if (!key || !equal(request.headers.get("authorization") ?? "", `Bearer ${key}`)) return privateJson({ error: "Unauthorized." }, 401);
  if (!isSendWindow()) return privateJson({ sent: false, reason: "Not Monday morning in New York." });
  try { return privateJson(await sendDigest()); }
  catch (e) {
    await recordError({ surface: "server", name: "DigestFailed", message: (e as Error).message, route: "/api/cron/digest" });
    return privateJson({ sent: false, reason: "Digest send failed." }, 502);
  }
}
