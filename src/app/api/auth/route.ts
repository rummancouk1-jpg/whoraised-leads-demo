import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { database, initializeDatabase } from "@/lib/server/db";
import { passwordMatches, issueSession, revokeSession, privateJson, sameOrigin, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/server/auth";
import { authenticated } from "@/lib/server/auth";
import { readBody, RequestTooLarge, takeBudget } from "@/lib/server/limits";

export async function POST(request: Request) {
  if (!request.headers.get("origin")) return privateJson({ error: "Please log in." }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  if (!process.env.GG_ACCESS_PASSWORD?.trim() || !process.env.GG_SESSION_SECRET) return privateJson({ error: "Private access is not configured." }, 503);
  try {
    await initializeDatabase();
    const identity = createHash("sha256").update(`${process.env.GG_SESSION_SECRET}:${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`).digest("hex");
    const sql = database();
    if (!await takeBudget("login:"+identity,5,900)) return privateJson({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    const text = await readBody(request,4096);
    let password: unknown;
    try { if (text.length<=4096) password=JSON.parse(text)?.password; } catch { /* Invalid submissions count as failed attempts. */ }
    if (!passwordMatches(password)) {
      return privateJson({ error: "Incorrect password." }, 401);
    }
    (await cookies()).set(SESSION_COOKIE, await issueSession(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS, expires: new Date(Date.now()+SESSION_SECONDS*1000) });
    await sql`DELETE FROM gg_login_attempts WHERE identity=${identity}`;
    await sql`DELETE FROM gg_request_limits WHERE key=${"login:"+identity}`;
    return privateJson({ ok: true });
  } catch(e) { return privateJson({ error: e instanceof RequestTooLarge ? "Login request is too large." : "Login is temporarily unavailable. Please retry shortly." }, e instanceof RequestTooLarge ? 413 : 503); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  if (!await authenticated()) return privateJson({error:"Please log in."},401);
  await revokeSession((await cookies()).get(SESSION_COOKIE)?.value ?? "");
  (await cookies()).delete(SESSION_COOKIE);
  return privateJson({ ok: true });
}
