"use client";
import { useEffect } from "react";

/** Registers the static-assets-only service worker. It is skipped in development so stale chunks never linger. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => { navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => { /* installability is a bonus, never a requirement */ }); };
    if (document.readyState === "complete") register(); else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
