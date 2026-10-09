"use client";
/** Removes everything this app stored in the browser: Cache Storage, service workers and viewer storage. */
export async function clearClientState() {
  // Clear viewer storage before awaiting APIs: navigation must never interrupt it.
  try { for (const key of Object.keys(localStorage)) if (key.startsWith("gg-")) localStorage.removeItem(key); } catch { /* storage unavailable */ }
  try { sessionStorage.clear(); } catch { /* storage unavailable */ }
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(async registration => {
        const worker = registration.active;
        if (worker) await new Promise<void>(resolve => {
          const channel = new MessageChannel();
          const finish = () => { clearTimeout(timer); channel.port1.close(); resolve(); };
          const timer = setTimeout(finish, 800);
          channel.port1.onmessage = finish;
          worker.postMessage({ type: "CLEAR" }, [channel.port2]);
        });
        await registration.unregister();
      }));
    }
    if ("caches" in window) await Promise.all((await caches.keys()).map(key => caches.delete(key)));
  } catch { /* Best effort: a browser that blocks these APIs has nothing stored there. */ }
}
/** A new document clears cached private routes, providers and unsaved state at an auth boundary. */
export function navigateSession(destination: "/" | "/login") {
  const go = () => window.location.assign(new URL(destination, window.location.origin).href);
  if (destination !== "/login") return go();
  // Logging out (or an expired session) wipes local state first; never let a stuck API hold the redirect.
  void Promise.race([clearClientState(), new Promise(resolve => setTimeout(resolve, 1500))]).finally(go);
}
