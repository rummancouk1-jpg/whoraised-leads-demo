import { equal, privateJson } from "@/lib/server/auth";
import { database, initializeDatabase } from "@/lib/server/db";
import { isTestClick } from "@/lib/click-tracking";
import { verifyClickToken, verifyWebhook } from "@/lib/server/attribution-token";
import { readBody, RequestTooLarge, takeBudget } from "@/lib/server/limits";
export const dynamic = "force-dynamic";
/** Signed server-to-server envelope; click token joins the actual creator-link visit. */
export async function POST(request: Request) {
  const key = process.env.SIGNUP_WEBHOOK_SECRET;
  if (!key) return privateJson({ error: "Attribution is not configured." },503);
  if (!equal(request.headers.get("authorization")??"",`Bearer ${key}`)) return privateJson({error:"Unauthorized."},401);
  try {
    const text = await readBody(request,2000);
    if (!verifyWebhook(request,text,key)) return privateJson({error:"Invalid signature or expired delivery."},401);
    if (!await takeBudget("signup-webhook",120,60)) return privateJson({error:"Retry shortly."},429);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed!=="object" || Array.isArray(parsed)) return privateJson({error:"Invalid JSON object."},400);
    const body = parsed as Record<string,unknown>;
    const id = typeof body.id==="string" && /^[\w.:-]{1,100}$/.test(body.id) ? body.id : "";
    const token = typeof body.click_token==="string" ? body.click_token : "";
    const claim = verifyClickToken(token);
    const at = typeof body.at==="string" && /^\d{4}-\d{2}-\d{2}T/.test(body.at) ? Date.parse(body.at) : NaN;
    if (!id || !claim || body.slug!==claim.slug || !Number.isFinite(at) || at>Date.now()+60000 || at<claim.issued*1000) return privateJson({error:"Supply a valid signup identity, creator click and signup time."},400);
    const test = claim.test || isTestClick(claim.slug,undefined,request.headers.get("user-agent")??"",request.headers.get("x-gg-test-click")??"");
    const nonce = request.headers.get("x-gg-nonce")!;
    await initializeDatabase();
    const rows = await database()`INSERT INTO gg_signups(id,slug,signed_up_at,is_test,click_id,webhook_nonce)
      SELECT ${id}, l.slug, ${new Date(at).toISOString()}::timestamptz, (${test} OR c.is_test OR c.is_example), c.id, ${nonce}
      FROM gg_leads l JOIN gg_clicks c ON c.slug=l.slug WHERE l.slug=${claim.slug} AND c.click_token=${token} AND c.clicked_at<=${new Date(at).toISOString()}::timestamptz
      ON CONFLICT DO NOTHING RETURNING id`;
    return privateJson({ok:true,recorded:rows.length>0});
  } catch(e) { return privateJson({error:e instanceof RequestTooLarge?"Too large.":"Signup could not be recorded."},e instanceof RequestTooLarge?413:400); }
}
