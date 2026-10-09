import { authenticated, privateJson, sameOrigin } from "@/lib/server/auth";
import { patchLead, EditConflict } from "@/lib/server/leads";
import { readBody, takeBudget, requestIdentity, RequestTooLarge } from "@/lib/server/limits";

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  try {
    if (!await takeBudget(requestIdentity(request, "edit"), 120, 60)) return privateJson({ error: "Please wait a moment before saving again." }, 429);
    const text = await readBody(request, 50_000);
    return privateJson({ lead: await patchLead((await context.params).slug, JSON.parse(text)) });
  } catch (e) { return privateJson({ error: e instanceof EditConflict ? e.message : "Edit could not be saved. Check the values and retry." }, e instanceof EditConflict ? 409 : e instanceof RequestTooLarge ? 413 : 400); }
}
