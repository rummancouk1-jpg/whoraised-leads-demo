import { isPreviewBot, isTestClick, preregDestination } from "@/lib/click-tracking";
import { recordClick } from "@/lib/server/clicks";
import { issueClickToken } from "@/lib/server/attribution-token";
import { takeBudget, requestIdentity } from "@/lib/server/limits";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) return new Response("Invalid link", { status: 404, headers });
  let token: string | undefined;
  const agent = request.headers.get("user-agent") || "";
  const marker = request.headers.get("x-gg-test-click") || "";
  // Preview links carry their environment into the external signup site as well.
  const test = process.env.VERCEL_ENV === "preview" || process.env.GG_DB_ENVIRONMENT === "preview" || isTestClick(slug,request.url,agent,marker);
  if ((isTestClick(slug, request.url, agent, marker) || !isPreviewBot(agent)) && !request.headers.get("purpose")?.includes("prefetch") && !request.headers.get("sec-purpose")?.includes("prefetch")) {
    try {
      if (!await takeBudget(requestIdentity(request,"creator-link"),60,60)) return new Response("Please retry this link shortly.",{status:429,headers:{...headers,"Retry-After":"60"}});
      token = issueClickToken(slug,test);
      if (!await recordClick(slug, agent, request.headers.get("referer") || "", request.url, test ? "1" : marker,token)) return new Response("Link not found.",{status:404,headers});
    }
    catch { console.error("Click storage unavailable"); return new Response("Please retry this link shortly.", { status: 503, headers }); }
  }
  const location = preregDestination(slug,process.env.PREREG_URL||undefined,request.url,token);
  if (test) { const url = new URL(location); url.searchParams.set("test","1"); return new Response(null,{status:302,headers:{...headers,Location:url.toString()}}); }
  return new Response(null, { status: 302, headers: { ...headers, Location: location } });
}

// HEAD checks never create clicks.
export async function HEAD(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) return new Response(null, { status: 404, headers });
  const location = new URL(preregDestination(slug, process.env.PREREG_URL || undefined, request.url));
  if (process.env.VERCEL_ENV === "preview" || process.env.GG_DB_ENVIRONMENT === "preview") location.searchParams.set("test","1");
  return new Response(null, { status: 302, headers: { ...headers, Location: location.toString() } });
}
