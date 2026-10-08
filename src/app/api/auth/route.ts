import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { database, initializeDatabase } from "@/lib/server/db";
import { equal, issueSession, revokeSession, privateJson, sameOrigin, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/server/auth";

export async function POST(request: Request) {
  if (!request.headers.get("origin")) return privateJson({ error: "Please log in." }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  if (!process.env.GG_ACCESS_PASSWORD || !process.env.GG_SESSION_SECRET) return privateJson({ error: "Private access is not configured." }, 503);
  try {
    await initializeDatabase();
    const identity = createHash("sha256").update(`${process.env.GG_SESSION_SECRET}:${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`).digest("hex");
    const sql = database();
    const blocked = await sql`SELECT 1 FROM gg_login_attempts WHERE identity=${identity} AND attempts>=5 AND window_start>now()-interval '15 minutes'`;
    if (blocked.length) return privateJson({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    const text = await request.text();
    let password: unknown;
    try { if (text.length<=4096) password=JSON.parse(text)?.password; } catch { /* Invalid submissions count as failed attempts. */ }
    if (typeof password !== "string" || !equal(password, process.env.GG_ACCESS_PASSWORD)) {
      await sql`INSERT INTO gg_login_attempts(identity,attempts) VALUES (${identity},1) ON CONFLICT(identity) DO UPDATE SET attempts=CASE WHEN gg_login_attempts.window_start<=now()-interval '15 minutes' THEN 1 ELSE gg_login_attempts.attempts+1 END, window_start=CASE WHEN gg_login_attempts.window_start<=now()-interval '15 minutes' OR gg_login_attempts.attempts=4 THEN now() ELSE gg_login_attempts.window_start END`;
      return privateJson({ error: "Incorrect password." }, 401);
    }
    (await cookies()).set(SESSION_COOKIE, await issueSession(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS, expires: new Date(Date.now()+SESSION_SECONDS*1000) });
    await sql`DELETE FROM gg_login_attempts WHERE identity=${identity}`;
    return privateJson({ ok: true });
  } catch { return privateJson({ error: "Login is temporarily unavailable. Check the shared database configuration." }, 503); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  await revokeSession((await cookies()).get(SESSION_COOKIE)?.value ?? "");
  (await cookies()).delete(SESSION_COOKIE);
  return privateJson({ ok: true });
}
