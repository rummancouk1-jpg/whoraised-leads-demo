"use client";
import { useOutreach } from "@/contexts/OutreachContext";
import { leadGroup } from "@/lib/outreach";
import type { Lead } from "@/types/outreach";

export function ClickAnalytics({ scopedLeads: leads }: { scopedLeads: Lead[] }) {
  const { clicks } = useOutreach();
  const slugs = new Set(leads.map(l => l.tracked_slug));
  const daily = clicks?.daily.map(d => ({ day: d.day, clicks: (clicks.dailyBySlug ?? []).filter(row => row.day === d.day && slugs.has(row.slug)).reduce((n, row) => n + row.clicks, 0) }));
  const grouped = new Map<string, number>();
  for (const row of clicks?.leads ?? []) {
    const lead = leads.find(l => l.tracked_slug === row.slug);
    if (!lead) continue;
    const group = leadGroup(lead);
    grouped.set(group, (grouped.get(group) ?? 0) + row.clicks);
  }
  const groupRows = [...grouped].map(([group, clicks]) => ({ group, clicks }));
  const maximum = Math.max(1, ...daily?.map(d => d.clicks) ?? []);
  const total = groupRows.reduce((n, g) => n + g.clicks, 0) ?? 0;
  return <section className="gg-learning" aria-labelledby="click-title">
    <div className="gg-section-heading"><div><p className="gg-eyebrow">Creator links</p><h2 id="click-title">Click activity</h2></div><span className="gg-badge">{clicks ? `${total} clicks` : "Loading clicks…"}</span></div>
    <p className="gg-muted">Visits through creator links. Repeat visits count. Signups: manual · awaiting prereg data.</p>
    <div className="gg-click-grid"><section className="gg-group-card"><h3>Clicks per outreach group</h3>{!clicks ? <p>Loading click data…</p> : !groupRows.length ? <p className="gg-muted">No clicks from real leads yet.</p> : <table><thead><tr><th>Group</th><th>Clicks</th></tr></thead><tbody>{groupRows.map(g => <tr key={g.group}><td>{g.group}</td><td>{g.clicks}</td></tr>)}</tbody></table>}</section>
    <section className="gg-group-card"><h3>Daily clicks · last 30 UTC days</h3><p className="gg-muted">{daily?.reduce((n, d) => n + d.clicks, 0) ?? "—"} clicks in this period</p>
      {clicks && <><div className="gg-click-trend" role="img" aria-label={`Daily clicks: ${daily?.map(d => `${d.day}: ${d.clicks}`).join(", ")}`}>{daily?.map(d => <div key={d.day} title={`${d.day}: ${d.clicks} clicks`}><span style={{ height: `${d.clicks / maximum * 100}%` }} /></div>)}</div><div className="gg-trend-labels"><span>{daily?.[0]?.day}</span><span>{daily?.at(-1)?.day}</span></div><details><summary>Daily counts</summary><div className="gg-group-scroll"><table><thead><tr><th>UTC date</th><th>Clicks</th></tr></thead><tbody>{daily?.map(d => <tr key={d.day}><td>{d.day}</td><td>{d.clicks}</td></tr>)}</tbody></table></div></details></>}
    </section></div>
  </section>;
}

