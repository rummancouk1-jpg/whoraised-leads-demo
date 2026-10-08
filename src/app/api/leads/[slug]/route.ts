import { authenticated, privateJson, sameOrigin } from "@/lib/server/auth";
import { patchLead } from "@/lib/server/leads";

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  try {
    const text = await request.text();
    if (text.length > 50_000) return privateJson({ error: "Edit is too large." }, 413);
    return privateJson({ lead: await patchLead((await context.params).slug, JSON.parse(text)) });
  } catch { return privateJson({ error: "Edit could not be saved. Check the values and retry." }, 400); }
}
