"use client";
/** Removes everything this app stored in the browser: Cache Storage, service workers and viewer storage. */
export async function clearClientState() {
  try {
    if ("caches" in window) await Promise.all((await caches.keys()).map(key => caches.delete(key)));
    if ("serviceWorker" in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map(r => r.unregister()));
  } catch { /* Best effort: a browser that blocks these APIs has nothing stored there. */ }
  try { for (const key of Object.keys(localStorage)) if (key.startsWith("gg-")) localStorage.removeItem(key); } catch { /* storage unavailable */ }
  try { sessionStorage.clear(); } catch { /* storage unavailable */ }
}
/** A new document clears cached private routes, providers and unsaved state at an auth boundary. */
export function navigateSession(destination: "/" | "/login") {
  const go = () => window.location.assign(new URL(destination, window.location.origin).href);
  if (destination !== "/login") return go();
  // Logging out (or an expired session) wipes local state first; never let a stuck API hold the redirect.
  void Promise.race([clearClientState(), new Promise(resolve => setTimeout(resolve, 1500))]).finally(go);
}
