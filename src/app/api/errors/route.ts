import { authenticated, privateJson, sameOrigin } from "@/lib/server/auth";
import { recordError } from "@/lib/server/errors";
import { takeBudget,requestIdentity,readBody,RequestTooLarge } from "@/lib/server/limits";
// Browser errors from the signed-in workspace. Authenticated, same-origin, tiny, and rate-limited per instance.
export async function POST(request: Request) {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  if (!await takeBudget(requestIdentity(request,"browser-errors"),20,60)) return privateJson({ok:false},429);
  try {
    const text = await readBody(request,4000);
    const body = JSON.parse(text);
    await recordError({ surface: "browser", name: String(body.name ?? "Error"), message: String(body.message ?? ""), route: String(body.route ?? "/") });
    return privateJson({ ok: true });
  } catch(e) { return privateJson({ ok: false }, e instanceof RequestTooLarge?413:400); }
}
