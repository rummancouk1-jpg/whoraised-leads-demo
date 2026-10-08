"use client";
/** A new document clears cached private routes, providers and unsaved state at an auth boundary. */
export function navigateSession(destination: "/" | "/login") {
  window.location.assign(new URL(destination, window.location.origin).href);
}
