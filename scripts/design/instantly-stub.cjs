/* Test harness only (loaded with NODE_OPTIONS=--require by serve.mjs when INSTANTLY_STUB=1).
 * The local environment has no usable Instantly key, so answer api.instantly.ai/api/v2 from the raw capture saved by the
 * previous audit round. App code is untouched: it still maps provider fields exactly as in production. */
const fs = require("node:fs");
const source = JSON.parse(fs.readFileSync(process.env.INSTANTLY_STUB_FILE, "utf8"));
const realFetch = globalThis.fetch;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
globalThis.fetch = async function (input, init) {
  const url = new URL(typeof input === "string" ? input : input.url ?? String(input));
  if (url.origin !== "https://api.instantly.ai") return realFetch(input, init);
  const path = url.pathname.replace("/api/v2/", "");
  if (path === "accounts") return json({ items: source.accounts });
  if (path === "accounts/analytics/daily") return json(source.daily);
  if (path === "campaigns") return json({ items: [] });
  // R2: the per-lead sync reads these; the workspace has no tournament campaign yet, so both are empty lists.
  if (path === "leads/list" || path === "emails") return json({ items: [] });
  return json({ error: "not stubbed" }, 404);
};
