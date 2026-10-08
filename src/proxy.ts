import { NextResponse, type NextRequest } from "next/server";
import { equal, SESSION_COOKIE, validSession } from "@/lib/server/auth";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-nonce", nonce);
  const secure = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  };
  const path = request.nextUrl.pathname;
  // Preserve legacy invitation links; redirect every other legacy path and query.
  if (request.nextUrl.hostname === "whoraised-leads-demo.vercel.app" && !path.startsWith("/go/")) {
    const url = request.nextUrl.clone();
    url.hostname = "gg-tourney-hub.vercel.app";
    return secure(NextResponse.redirect(url, 307));
  }
  // Static, data-free assets only. The service worker, offline page, icons and launch images carry nothing private.
  const publicAsset = path.startsWith("/_next/") || path.startsWith("/icons/") || path.startsWith("/splash/") || ["/favicon.ico", "/icon.svg", "/apple-touch-icon.png", "/opengraph-image.png", "/robots.txt", "/manifest.webmanifest", "/sw.js", "/offline.html"].includes(path);
  const loginAttempt = path === "/api/auth" && request.method === "POST";
  const cron = path === "/api/cron/email-snapshot" && !!process.env.CRON_SECRET && equal(request.headers.get("authorization") ?? "", `Bearer ${process.env.CRON_SECRET}`);
  if (path === "/login" || path.startsWith("/go/") || publicAsset || loginAttempt || cron || await validSession(request.cookies.get(SESSION_COOKIE)?.value ?? "")) return secure(NextResponse.next({ request: { headers: requestHeaders } }));
  if (path.startsWith("/api/")) return secure(NextResponse.json({ error: "Please log in." }, { status: 401, headers: { "Cache-Control": "private, no-store" } }));
  return secure(NextResponse.rewrite(new URL("/login", request.url), { request: { headers: requestHeaders }, status: 401, headers: { "Cache-Control": "private, no-store" } }));
}
