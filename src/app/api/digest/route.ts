import { authenticated, privateJson } from "@/lib/server/auth";
import { buildDigest, digestState } from "@/lib/server/digest";
import { renderDigest } from "@/lib/digest";

/** Preview only: nothing here sends mail. ?format=html returns the exact email body. */
export async function GET(request: Request) {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  try {
    const [model, state] = await Promise.all([buildDigest(), digestState()]);
    const rendered = renderDigest(model);
    if (new URL(request.url).searchParams.get("format") === "html") {
      return new Response(rendered.html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'", "X-Frame-Options": "DENY" } });
    }
    return privateJson({ model, state, text: rendered.text });
  } catch { return privateJson({ error: "The digest preview could not be built. Retry shortly." }, 503); }
}
