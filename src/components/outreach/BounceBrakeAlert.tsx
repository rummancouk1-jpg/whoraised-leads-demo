"use client";
import { useEffect, useState } from "react";
import { brakeIsStale, type BounceBrakeStatus } from "@/lib/bounce-brake";
import { useEmail } from "@/contexts/EmailContext";
export function BounceBrakeAlert() {
  const { data } = useEmail();
  const [state, setState] = useState<BounceBrakeStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let active = true;
    const read = async () => {
      if (active) setNow(Date.now());
      try {
        const response = await fetch("/api/email/bounce-brake", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error("Unavailable");
        const data: BounceBrakeStatus = await response.json();
        if (active) { setState(data); setFailed(false); }
      } catch { if (active) setFailed(true); }
    };
    void read(); const timer = setInterval(() => void read(), 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const alert = state?.alert;
  const active = ["1", "4"].includes(String(data?.live?.campaign?.status ?? state?.lastSuccess?.campaignStatus));
  const stale = brakeIsStale(state?.lastSuccess, now);
  const stopped = active && stale && (state !== null || failed);
  const checked = state?.lastSuccess?.at;
  return <div style={{ overflowWrap: "anywhere" }}>
    <p className="gg-storage-note">Bounce brake · Last checked: {checked ? <time dateTime={checked}>{new Date(checked).toLocaleString("en-US", { timeZone: "Asia/Karachi" })} PKT</time> : state || failed ? "No successful check recorded" : "Loading…"}</p>
    {stopped && <section className="gg-error" role="alert" aria-label="Bounce brake not running"><strong>Bounce brake not running</strong><p>No successful check in the last 30 minutes while the campaign is active. Pause the campaign in Instantly and check the scheduler.</p></section>}
    {alert && <section className="gg-error" role="alert" aria-label="Campaign bounce brake">
    <strong>{alert.status === "paused" ? "Bounce brake paused GG Tournament Oct" : "Bounce threshold exceeded — check campaign pause"}</strong>
    <p>{alert.bounced.toLocaleString()} bounced / {alert.sent.toLocaleString()} sent ({(alert.rate * 100).toFixed(2)}%). The brake trips above 3% after at least 50 sends.</p>
    <p>{new Date(alert.at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET. Only Rumman resumes the campaign in Instantly.</p>
    {(failed || stale || state?.lastCheck?.ok === false) && <p>The latest bounce check is unavailable or overdue. Inspect the scheduled job.</p>}
  </section>}
    {!stopped && (failed || state?.lastCheck?.ok === false || state && stale) && <p className="gg-error" role="alert">Bounce brake checks are unavailable or overdue. Keep the campaign paused and inspect the scheduled job.</p>}
  </div>;
}
