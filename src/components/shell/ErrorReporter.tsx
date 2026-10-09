"use client";

import { useEffect } from "react";

/** Reports uncaught browser errors and rejected promises to /api/errors (counts-only; the server scrubs the text). */
export function report(name: string, message: string) {
  try {
    const body = JSON.stringify({ name: name.slice(0, 80), message: message.slice(0, 300), route: location.pathname });
    void fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* monitoring must never break the page */ }
}
export function ErrorReporter() {
  useEffect(() => {
    const seen = new Set<string>();
    const once = (name: string, message: string) => { const key = name + message; if (seen.has(key) || seen.size > 10) return; seen.add(key); report(name, message); };
    const onError = (e: ErrorEvent) => { if (e.message && !/ResizeObserver loop/.test(e.message)) once(e.error?.name ?? "Error", e.message); };
    const onRejection = (e: PromiseRejectionEvent) => { const r = e.reason as { name?: string; message?: string } | undefined; if (r?.name === "AbortError") return; once(r?.name ?? "UnhandledRejection", r?.message ?? String(e.reason)); };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  return null;
}
