import { equal, privateJson } from "@/lib/server/auth";
import { database, initializeDatabase } from "@/lib/server/db";
import { isTestClick } from "@/lib/click-tracking";
export const dynamic = "force-dynamic";
/**
 * The preregistration site reports each signup here with the creator slug it arrived through (utm_content).
 * Server-to-server: `Authorization: Bearer $SIGNUP_WEBHOOK_SECRET`, body {"id": "<unique signup id>", "slug": "...", "at": "<ISO time, optional>"}.
 * Idempotent on id. No name, email or other personal data is accepted or stored.
 */
export async function POST(request: Request) {
  const key = process.env.SIGNUP_WEBHOOK_SECRET;
  if (!key) return privateJson({ error: "Attribution is not configured." }, 503);
  if (!equal(request.headers.get("authorization") ?? "", `Bearer ${key}`)) return privateJson({ error: "Unauthorized." }, 401);
  let body: { id?: unknown; slug?: unknown; at?: unknown };
  try { const text = await request.text(); if (text.length > 2000) return privateJson({ error: "Too large." }, 413); body = JSON.parse(text); } catch { return privateJson({ error: "Invalid JSON." }, 400); }
  const id = typeof body.id === "string" && /^[\w.:-]{1,100}$/.test(body.id) ? body.id : "";
  const slug = typeof body.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) && body.slug.length <= 200 ? body.slug : "";
  if (!id || !slug) return privateJson({ error: "Supply id and slug." }, 400);
  const at = typeof body.at === "string" && Number.isFinite(Date.parse(body.at)) && Date.parse(body.at) <= Date.now() + 60_000 ? new Date(body.at).toISOString() : new Date().toISOString();
  const test = isTestClick(slug, undefined, request.headers.get("user-agent") ?? "", request.headers.get("x-gg-test-click") ?? "");
  await initializeDatabase();
  // Unknown slugs are never attributed, mirroring /go.
  const rows = await database()`INSERT INTO gg_signups(id,slug,signed_up_at,is_test) SELECT ${id}, slug, ${at}::timestamptz, (${test} OR data->>'name' ~* '\\mEXAMPLE\\M') FROM gg_leads WHERE slug=${slug} ON CONFLICT (id) DO NOTHING RETURNING id`;
  return privateJson({ ok: true, recorded: rows.length > 0 });
}
