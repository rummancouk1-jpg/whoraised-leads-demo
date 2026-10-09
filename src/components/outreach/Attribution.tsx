"use client";

import { useActivity } from "@/contexts/ActivityContext";
import { useOutreach } from "@/contexts/OutreachContext";
import { RelTime } from "@/components/ui/RelTime";

const rate = (signups: number, clicks: number) => clicks ? `${(100 * signups / clicks).toFixed(clicks >= 20 ? 0 : 1)}%` : "—";

/** Clicks → signups per creator. Before the signup link is live it says so; it never prints a table of zeros. */
export function Attribution() {
  const { data, fetchedAt } = useActivity();
  const { clicks } = useOutreach();
  const a = data?.attribution;
  const total = clicks ? clicks.groups.reduce((n, g) => n + g.clicks, 0) : null;
  return <section className="gg-learning" aria-labelledby="attr-title">
    <div className="gg-section-heading"><div><p className="gg-eyebrow">Creator links</p><h2 id="attr-title">Clicks to signups</h2></div>
      <span className="gg-fresh">{data ? <RelTime value={fetchedAt ?? data.generatedAt} prefix="Updated " /> : null}</span></div>
    {!a ? <p className="gg-muted">Loading attribution…</p>
      : !a.live ? <div className="gg-attr-wait"><strong>Attribution starts when the signup link is live.</strong><p className="gg-muted">{total ? `${total.toLocaleString()} creator-link visit${total === 1 ? " is" : "s are"} being recorded now. ` : "Creator-link visits are recorded now. "}Signups per creator will appear here as soon as the preregistration page reports them.</p></div>
      : !a.rows.length ? <p className="gg-muted">The signup link is live. No creator-link visits or signups yet.</p>
      : <div className="gg-group-card"><p className="gg-muted">{a.signups.toLocaleString()} signup{a.signups === 1 ? "" : "s"} from {a.clicks.toLocaleString()} visit{a.clicks === 1 ? "" : "s"}{a.since ? <> since <RelTime value={a.since} /></> : null}{a.lastSignupAt ? <> · latest signup <RelTime value={a.lastSignupAt} /></> : null}.</p>
        <div className="gg-table-scroll" role="region" aria-label="Signups per creator" tabIndex={0}><table><thead><tr><th scope="col">Creator</th><th scope="col">Visits</th><th scope="col">Signups</th><th scope="col">Rate</th></tr></thead><tbody>
          {a.rows.map(r => <tr key={r.slug}><td>{r.name}</td><td>{r.clicks.toLocaleString()}</td><td>{r.signups.toLocaleString()}</td><td>{rate(r.signups, r.clicks)}</td></tr>)}
        </tbody></table></div></div>}
  </section>;
}
