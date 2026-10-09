"use client";

import { useState } from "react";
import { useOutreach } from "@/contexts/OutreachContext";
import { contactType, fitScore, generateDraft, isExample, leadGroup } from "@/lib/outreach";
import { STAGES, type Lead, type Stage } from "@/types/outreach";
import { RelTime } from "@/components/ui/RelTime";
import { Modal } from "./Modal";
import { LeadTimeline } from "./LeadTimeline";
import { Anchor } from "@/components/ui/AccessibleLink";

export function LeadDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { update, moveStage, weights, clicks, saveStatus, error, retrySave } = useOutreach();
  const [copyStatus, setCopyStatus] = useState("");
  const score = fitScore(lead, weights);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const draft = generateDraft(lead, origin);
  const pitchLink = `${origin}/go/${encodeURIComponent(lead.tracked_slug)}`;
  return <Modal title={lead.name} onClose={onClose} drawer>
    <p className="gg-drawer-sub">{lead.handle} · {lead.platform} · {leadGroup(lead)}</p>
    <div className="gg-drawer-summary">
      <span className={`gg-stage-badge gg-stage-${lead.stage.toLowerCase()}`}><span className="gg-stage-dot" aria-hidden="true" />{lead.stage}</span>
      <span className="gg-score"><span className="gg-sr-only">Fit score </span>{score.score}/100</span>
      <span className="gg-muted">Tracked clicks: {clicks ? clicks.leads.find(c => c.slug === lead.tracked_slug)?.clicks ?? 0 : "Loading…"}</span>
      <span className="gg-muted">Last touch: {lead.last_touch ? <RelTime value={lead.last_touch} /> : "none yet"}</span>
    </div>
    {isExample(lead) && <p className="gg-preview">EXAMPLE — excluded from conversion analytics.</p>}
    <LeadTimeline slug={lead.tracked_slug} />
    <section className="gg-drawer-section"><h3>Pipeline edits</h3><p className="gg-muted" role="status">{saveStatus}</p>{error && <p className="gg-error" role="alert">{error} <button onClick={() => void retrySave()}>Retry saving</button></p>}<div className="gg-form-grid">
      <label className="gg-field">Stage<select aria-label="Stage" value={lead.stage} onChange={e => moveStage(lead.tracked_slug, e.target.value as Stage)}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="gg-field">Signups · manual<input aria-label="Signups" type="number" inputMode="numeric" min="0" step="1" value={lead.signups} onChange={e => { const n = Number(e.target.value); if (e.target.value && Number.isSafeInteger(n) && n >= 0) update(lead.tracked_slug, { signups: n }); }} /></label>
      <p className="gg-muted gg-wide">Signups: awaiting prereg data. Enter confirmed counts manually.</p><label className="gg-field gg-wide">Last touch<input aria-label="Last touch" type="date" max="9999-12-31" value={lead.last_touch} onChange={e => { if (!e.target.value || (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && e.target.validity.valid)) update(lead.tracked_slug, { last_touch: e.target.value }); }} /></label>
      <label className="gg-field gg-wide">Notes<textarea aria-label="Notes" value={lead.notes} onChange={e => update(lead.tracked_slug, { notes: e.target.value })} placeholder="Add your outreach notes" /></label>
    </div></section>
    <section className="gg-drawer-section"><h3>Outreach draft</h3><p className="gg-muted">Gap Gambler / Earnings Tournament · Free entry · U.S. 18+</p><div className="gg-draft">{draft.slice(0, -pitchLink.length)}<Anchor href={pitchLink} target="_blank" rel="noreferrer">{pitchLink}</Anchor></div>
      <button className="gg-button" onClick={async () => { try { await navigator.clipboard.writeText(draft); setCopyStatus("Copied draft"); } catch { setCopyStatus("Copy failed. Select the draft text and copy it manually."); } }}>Copy draft</button><p role="status">{copyStatus}</p>
    </section>
    <section className="gg-drawer-section"><h3>Lead details</h3><dl className="gg-facts">
      <div><dt>Audience</dt><dd>{lead.audience_size ? lead.audience_size.toLocaleString() : "Unknown"}</dd></div><div><dt>Niche</dt><dd>{lead.niche}</dd></div><div><dt>U.S. focus</dt><dd>{lead.us_focus}</dd></div><div><dt>Tracked slug</dt><dd className="gg-mono">{lead.tracked_slug}</dd></div>
      <div className="gg-facts-wide"><dt>Contact · {lead.contact_type}</dt><dd>{lead.contact ? <Anchor href={contactType(lead.contact) === "email" ? `mailto:${lead.contact}` : lead.contact} target="_blank" rel="noreferrer">{lead.contact}</Anchor> : "No contact supplied"}</dd></div>
    </dl></section>
    <section className="gg-drawer-section"><h3>Fit score <span className="gg-score">{score.score}/100</span></h3><ul className="gg-reasons">{score.reasons.map(r => <li key={r.label}><span>{r.label}</span><strong>{r.points} / {r.maximum}</strong></li>)}</ul></section>
    <section className="gg-drawer-section"><h3>Research evidence</h3><p>{lead.fit_evidence}</p><p>Earnings coverage: {lead.covers_earnings ?? "Unverified"} · {lead.earnings_evidence}</p>{lead.contact_source_url && <Anchor href={lead.contact_source_url} target="_blank" rel="noreferrer">Published contact source ↗</Anchor>}{lead.promotion_rules && <p>{lead.promotion_rules}</p>}</section>
  </Modal>;
}
