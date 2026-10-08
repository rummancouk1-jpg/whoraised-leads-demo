"use client";

import { useOutreach } from "@/contexts/OutreachContext";
import { audienceBand, DEFAULT_WEIGHTS, groupResults, isExample, leadGroup, suggestedWeights } from "@/lib/outreach";
import type { Lead } from "@/types/outreach";

export function ConversionLoop({ scopedLeads }: { scopedLeads: Lead[] }) {
  const { clicks, useSuggested, setUseSuggested } = useOutreach();
  const leads = scopedLeads;
  const suggestion = suggestedWeights(leads);
  const clicksBySlug = new Map(clicks?.leads.map(c => [c.slug, c.clicks]));
  const dimensions: { title: string; group: (l: Lead) => string }[] = [{ title: "Outreach group", group: leadGroup }, { title: "Platform", group: l => l.platform }, { title: "Niche", group: l => l.niche }, { title: "Audience band", group: l => audienceBand(l.audience_size) }];
  return <section className="gg-learning" aria-labelledby="learning-title"><div className="gg-section-heading"><div><p className="gg-eyebrow">Compound loop</p><h2 id="learning-title">What converted last time</h2></div><span className="gg-badge">Recorded outcomes</span></div>
    <p className="gg-muted">Visible tier leads. Joined rate = Joined ÷ all leads in the group. Signups are manual — awaiting prereg data.</p>
    <div className="gg-group-grid">{dimensions.map(d => { const rows = groupResults(leads, d.group); const groupClicks = new Map<string, number>(); for (const lead of leads.filter(l => !isExample(l))) { const group = d.group(lead); groupClicks.set(group, (groupClicks.get(group) ?? 0) + (clicksBySlug.get(lead.tracked_slug) ?? 0)); } return <section className="gg-group-card" key={d.title}><h3>{d.title}</h3>{!rows.length ? <p className="gg-muted">Import your real leads, then record stages and signups to see {d.title.toLowerCase()} results.</p> : <div className="gg-group-scroll"><table><thead><tr><th>Group</th><th>Clicks</th><th>Signups (manual)</th><th>Joined rate</th></tr></thead><tbody>{rows.map(r => <tr key={r.group}><td>{r.group}<small>{r.leads} leads · {r.touched} touched</small></td><td>{clicks ? groupClicks.get(r.group) ?? 0 : "—"}</td><td>{r.signups}</td><td>{Math.round(r.joined / r.leads * 100)}%<small>{r.joined}/{r.leads} Joined</small></td></tr>)}</tbody></table></div>}</section>; })}</div>
    <div className="gg-weights"><div><h3>Suggested weights</h3><p className="gg-muted">Configured: audience {DEFAULT_WEIGHTS.audience} · niche {DEFAULT_WEIGHTS.niche} · U.S. focus {DEFAULT_WEIGHTS.us_focus} · contact {DEFAULT_WEIGHTS.contact}</p>
      {suggestion ? <><p className="gg-weight-values">Audience {suggestion.weights.audience} · Niche {suggestion.weights.niche} · U.S. focus {suggestion.weights.us_focus} · Contact {suggestion.weights.contact}</p><p className="gg-muted">Based on {suggestion.touched} touched leads and {suggestion.signups} recorded signups. Smoothed with 3 prior leads at the overall signup yield; weights total 100. These are directional suggestions, not causal evidence.</p><p className="gg-muted">Suggested priorities rank by smoothed signup yield across platform, niche and audience band, then fit score. Unseen groups use the overall yield.</p></> : <p className="gg-muted">Record at least 3 real leads beyond New and at least 1 signup to compute suggestions. Until then, prioritization uses configured fit weights.</p>}
    </div><label className="gg-toggle"><input type="checkbox" checked={useSuggested && !!suggestion} disabled={!suggestion} onChange={e => setUseSuggested(e.target.checked)} />Use suggested priorities</label></div>
  </section>;
}
