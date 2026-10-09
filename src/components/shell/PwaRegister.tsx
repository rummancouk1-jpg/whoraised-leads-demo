"use client";
import { useEffect } from "react";
import { registerStaticWorker } from "@/lib/session-navigation";

/** Registers the static-assets-only service worker. It is skipped in development so stale chunks never linger. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => { registerStaticWorker(); };
    if (document.readyState === "complete") register(); else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
