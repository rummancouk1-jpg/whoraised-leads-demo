import { isPreviewBot, isTestClick, preregDestination } from "@/lib/click-tracking";
import { recordClick } from "@/lib/server/clicks";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) return new Response("Invalid link", { status: 404, headers });
  const location = preregDestination(slug, process.env.PREREG_URL || undefined, request.url);
  const agent = request.headers.get("user-agent") || "";
  const marker = request.headers.get("x-gg-test-click") || "";
  if ((isTestClick(slug, request.url, agent, marker) || !isPreviewBot(agent)) && !request.headers.get("purpose")?.includes("prefetch") && !request.headers.get("sec-purpose")?.includes("prefetch")) {
    try { await recordClick(slug, agent, request.headers.get("referer") || "", request.url, marker); }
    catch { console.error("Click storage unavailable"); return new Response("Please retry this link shortly.", { status: 503, headers }); }
  }
  return new Response(null, { status: 302, headers: { ...headers, Location: location } });
}

// HEAD checks never create clicks.
export async function HEAD(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) return new Response(null, { status: 404, headers });
  return new Response(null, { status: 302, headers: { ...headers, Location: preregDestination(slug, process.env.PREREG_URL || undefined, request.url) } });
}
