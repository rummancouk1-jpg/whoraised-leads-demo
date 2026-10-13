"use client";
import { useEffect, useState } from "react";
import { brakeIsStale } from "@/lib/bounce-brake";
import { useEmail } from "@/contexts/EmailContext";
export function BounceBrakeAlert() {
  const { data, brake: state } = useEmail();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const alert = state?.alert;
  const active = ["1", "4"].includes(String(data?.live?.campaign?.status ?? state?.lastSuccess?.campaignStatus));
  const stale = brakeIsStale(state?.lastSuccess, now);
  const stopped = active && stale && state !== null;
  const checked = state?.lastSuccess?.at;
  return <div id="bounce-brake" style={{ overflowWrap: "anywhere" }}>
    <p className="gg-storage-note">Bounce brake · Last checked: {checked ? <time dateTime={checked}>{new Date(checked).toLocaleString("en-US", { timeZone: "Asia/Karachi" })} PKT</time> : state ? "No successful check recorded" : "Loading…"}</p>
    {stopped && <section className="gg-error" role="alert" aria-label="Bounce brake not running"><strong>Bounce brake not running</strong><p>No successful check in the last 30 minutes while the campaign is active. Pause the campaign in Instantly and check the scheduler.</p></section>}
    {alert && <section className="gg-error" role="alert" aria-label="Campaign bounce brake">
    <strong>{alert.status === "paused" ? "Bounce brake paused GG Tournament Oct" : "Bounce threshold exceeded — check campaign pause"}</strong>
    {alert.bounceBasis !== "hard" && <p>This historical pause used the previous combined bounce count, including soft bounces. New checks use the current hard-bounce rule.</p>}
    <p>{alert.bounced.toLocaleString()} {alert.bounceBasis === "hard" ? "hard bounced" : "bounced"} / {alert.sent.toLocaleString()} sent ({(alert.rate * 100).toFixed(2)}%). The brake now counts hard bounces only: above 3% after at least 100 sends, or 6 hard bounces at any sample size.</p>
    <p>{new Date(alert.at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET. Only Rumman resumes the campaign in Instantly.</p>
    {(stale || state?.lastCheck?.ok === false) && <p>The latest bounce check is unavailable or overdue. Inspect the scheduled job.</p>}
  </section>}
    {!stopped && (state?.lastCheck?.ok === false || state && stale) && <p className="gg-error" role="alert">Bounce brake checks are unavailable or overdue. Keep the campaign paused and inspect the scheduled job.</p>}
  </div>;
}
