import { authenticated, privateJson } from "@/lib/server/auth";
import { leadTimeline } from "@/lib/server/activity";
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) return privateJson({ error: "Invalid lead." }, 400);
  try { return privateJson(await leadTimeline(slug)); }
  catch { return privateJson({ error: "Timeline could not be loaded." }, 503); }
}
