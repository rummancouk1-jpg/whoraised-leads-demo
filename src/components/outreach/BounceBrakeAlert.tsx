"use client";
import { useEffect, useState } from "react";
import type { BounceBrakeStatus } from "@/lib/bounce-brake";
export function BounceBrakeAlert() {
  const [state, setState] = useState<BounceBrakeStatus | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const response = await fetch("/api/email/bounce-brake", { cache: "no-store" });
        if (!response.ok) throw new Error("Unavailable");
        const data: BounceBrakeStatus = await response.json();
        if (active) { setState(data); setFailed(false); }
      } catch { if (active) setFailed(true); }
    };
    void read(); const timer = setInterval(() => void read(), 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const alert = state?.alert;
  const stale = state?.lastCheck && Date.now() - Date.parse(state.lastCheck.at) > 45 * 60000;
  if (alert) return <section className="gg-error" role="alert" aria-label="Campaign bounce brake" style={{ overflowWrap: "anywhere" }}>
    <strong>{alert.status === "paused" ? "Bounce brake paused GG Tournament Oct" : "Bounce threshold exceeded — check campaign pause"}</strong>
    <p>{alert.bounced.toLocaleString()} bounced / {alert.sent.toLocaleString()} sent ({(alert.rate * 100).toFixed(2)}%). The brake trips above 3% after at least 50 sends.</p>
    <p>{new Date(alert.at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET. Only Rumman resumes the campaign in Instantly.</p>
    {(failed || stale || state?.lastCheck?.ok === false) && <p>The latest bounce check is unavailable or overdue. Inspect the scheduled job.</p>}
  </section>;
  if (failed || stale || state?.lastCheck?.ok === false) return <p className="gg-error" role="alert">Bounce brake checks are unavailable or overdue. Keep the campaign paused and inspect the scheduled job.</p>;
  return null;
}
