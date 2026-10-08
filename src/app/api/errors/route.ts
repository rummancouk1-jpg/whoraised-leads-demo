import { authenticated, privateJson, sameOrigin } from "@/lib/server/auth";
import { recordError } from "@/lib/server/errors";
// Browser errors from the signed-in workspace. Authenticated, same-origin, tiny, and rate-limited per instance.
let windowStart = 0, used = 0;
export async function POST(request: Request) {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  if (Date.now() - windowStart > 60_000) { windowStart = Date.now(); used = 0; }
  if (++used > 20) return privateJson({ ok: false }, 429);
  try {
    const text = await request.text();
    if (text.length > 4000) return privateJson({ ok: false }, 413);
    const body = JSON.parse(text);
    await recordError({ surface: "browser", name: String(body.name ?? "Error"), message: String(body.message ?? ""), route: String(body.route ?? "/") });
    return privateJson({ ok: true });
  } catch { return privateJson({ ok: false }, 400); }
}
