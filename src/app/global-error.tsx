"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { try { void fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: error.name, message: error.message.slice(0, 300), route: location.pathname }), keepalive: true }).catch(() => {}); } catch { /* ignore */ } }, [error]);
  return <html lang="en"><body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}><main><h1>Something went wrong</h1><p>We&apos;ve been notified. Your data is safe.</p><button onClick={reset}>Try again</button></main></body></html>;
}
