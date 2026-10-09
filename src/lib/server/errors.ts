import "server-only";
import { database, initializeDatabase } from "./db";
import { fingerprintOf, routeOf, scrub } from "@/lib/error-scrub";

export type ErrorSurface = "browser" | "server";
export const RELEASE_SHA = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

/** Never throws: monitoring must not turn one failure into two. */
export async function recordError(input: { surface: ErrorSurface; name?: string; message?: string; route: string }) {
  // Only deployed builds write to the shared monitor; a developer machine would otherwise raise alerts for the live app.
  if (!process.env.VERCEL && process.env.GG_MONITOR_LOCAL !== "1") return;
  try {
    const name = scrub(input.name || "Error").slice(0, 80) || "Error";
    const message = scrub(input.message || "");
    const route = routeOf(input.route || "/");
    const fingerprint = fingerprintOf(input.surface, name, route, message);
    await initializeDatabase();
    const sql = database();
    await sql.transaction([sql`INSERT INTO gg_errors(fingerprint,name,surface,route,release_sha,message)
      VALUES (${fingerprint},${name},${input.surface},${route},${RELEASE_SHA},${message})
      ON CONFLICT (fingerprint) DO UPDATE SET count=gg_errors.count+1, last_seen=now(), release_sha=EXCLUDED.release_sha`,
      sql`INSERT INTO gg_error_occurrences(fingerprint) VALUES (${fingerprint})`]);
  } catch { console.error("Error monitor could not store an error"); }
}

export type ErrorRow = { fingerprint: string; name: string; surface: ErrorSurface; route: string; release_sha: string; count: number; first_seen: string; last_seen: string };
export async function recentErrors(hours = 24): Promise<ErrorRow[]> {
  await initializeDatabase();
  const rows = await database()`SELECT e.fingerprint,e.name,e.surface,e.route,e.release_sha,count(o.id)::int AS count,e.first_seen,max(o.occurred_at) AS last_seen
    FROM gg_errors e JOIN gg_error_occurrences o ON o.fingerprint=e.fingerprint
    WHERE o.occurred_at > now() - make_interval(hours => ${hours})
    GROUP BY e.fingerprint ORDER BY last_seen DESC LIMIT 50`;
  return rows as ErrorRow[];
}
