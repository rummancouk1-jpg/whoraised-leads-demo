import { createHash } from "node:crypto";

/** Counts-only monitoring (OHQ Watch contract): no addresses, tokens or long numbers survive into storage. */
export function scrub(text: string) {
  return text
    .replace(/https?:\/\/[^\s)'"]+/g, url => { try { return new URL(url).origin + new URL(url).pathname; } catch { return "[url]"; } })
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]")
    .replace(/\b(Bearer|token|key|secret|password)[=: ]+\S+/gi, "$1 [redacted]")
    .replace(/\d{6,}/g, "#")
    .replace(/\s+/g, " ").trim().slice(0, 200);
}
export function routeOf(path: string) {
  // Never store a creator slug or query string: /go/<slug> and /api/leads/<slug> collapse to a pattern.
  return path.split("?")[0].replace(/^\/(go|api\/leads)\/[^/]+/, "/$1/[slug]").slice(0, 120);
}
export function fingerprintOf(surface: string, name: string, route: string, message: string) {
  return createHash("sha256").update([surface, name, route, message.replace(/\d+/g, "#")].join("|")).digest("hex");
}

