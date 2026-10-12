"use client";
import { useEffect, useRef } from "react";
import { useOutreach } from "@/contexts/OutreachContext";
import { useUIState } from "@/contexts/UIContext";
import { useToast } from "@/contexts/ToastContext";
import { contactType, fitScore, generateDraft, isExample, leadGroup } from "@/lib/outreach";
import { STAGES, type Lead } from "@/types/outreach";
import { Avatar, ScoreBar } from "@/components/ui/R3";
import { Modal } from "./Modal";
import { LeadTimeline } from "./LeadTimeline";
import { Anchor } from "@/components/ui/AccessibleLink";
import { trackedLink } from "@/lib/public-links";
import { tournamentFacts } from "@/config/tournament";

export function LeadDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { leads, update, moveStage, undoLast, weights, clicks, saveStatus, error, retrySave, publicBaseUrl } = useOutreach();
  const facts = tournamentFacts();
  const { openLead } = useUIState(); const { toast } = useToast();
  const touch = useRef<{ x: number; y: number; top: boolean } | null>(null);
  const real = leads.filter(l => !isExample(l)), index = real.findIndex(l => l.tracked_slug === lead.tracked_slug);
  const step = (delta: number) => { const next = real[index + delta]; if (next) openLead(next.tracked_slug); };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)))) return;
      if (document.querySelector(".gg-palette")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); undoLast(); return; }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "j" || key === "k") { event.preventDefault(); const next = real[index + (key === "j" ? 1 : -1)]; if (next) openLead(next.tracked_slug); }
      else if (/^[1-5]$/.test(key)) { event.preventDefault(); moveStage(lead.tracked_slug, STAGES[Number(key) - 1]); }
    };
    document.addEventListener("keydown", down); return () => document.removeEventListener("keydown", down);
  }, [real, index, openLead, moveStage, undoLast, lead.tracked_slug]);
  const score = fitScore(lead, weights), priority = lead.priority_score ?? score.score;
  const draft = generateDraft(lead, publicBaseUrl), pitchLink = trackedLink(lead.tracked_slug, publicBaseUrl);
  const copy = async (text: string, label: string) => { try { await navigator.clipboard.writeText(text); toast({ message: "Copied " + label, duration: 3000 }); } catch { toast({ message: "Copy failed. Select the text to copy manually.", tone: "error" }); } };
  const nextStep = { New: "Send a personal introduction using the draft.", Contacted: "Wait for a reply, then follow up after five days.", Replied: "Answer their questions and confirm tournament participation.", Joined: "Share the live preregistration link and confirm the next step.", Declined: "Keep the context in notes for future outreach." }[lead.stage];
  return <Modal title={lead.name} eyebrow="Pipeline / Partner detail" onClose={onClose} drawer>
    <div className="dw-body" onTouchStart={event => { const t = event.touches[0]; touch.current = { x: t.clientX, y: t.clientY, top: (event.currentTarget.closest(".gg-modal-body")?.scrollTop ?? 0) === 0 }; }} onTouchEnd={event => {
      const start = touch.current; touch.current = null; if (!start || innerWidth > 820 || (event.target instanceof Element && event.target.closest("input,textarea,select,button,a"))) return;
      const t = event.changedTouches[0], x = t.clientX - start.x, y = t.clientY - start.y;
      if (Math.abs(x) > 80 && Math.abs(x) > Math.abs(y) * 1.5) step(x < 0 ? 1 : -1);
      else if (start.top && y > 120 && y > Math.abs(x) * 1.5) onClose();
    }}>
      <section className="profile">
        <Avatar lead={lead} shared /><h2 style={{ viewTransitionName: "partner-name" }}>{lead.name}</h2><p className="hd">{lead.handle} · {lead.platform}</p>
        <div className="tags"><span className="chip">{leadGroup(lead)}</span><span className="chip">{lead.niche}</span><span className="chip">U.S. {lead.us_focus}</span></div>
        <div className="statgrid"><div><span>Audience</span><b className="num">{lead.audience_size ? lead.audience_size.toLocaleString() : "Unknown"}</b></div><div><span>Priority score</span><b><ScoreBar score={priority} /></b></div><div><span>Tracked clicks</span><b className="num">{clicks ? clicks.leads.find(c => c.slug === lead.tracked_slug)?.clicks ?? 0 : "—"}</b></div><div><span>Signups · manual</span><b className="num">{lead.signups}</b></div></div>
        <h3 className="sec-t">Fit score breakdown · {score.score}/100</h3><ul className="r3-breakdown">{score.reasons.map(r => <li key={r.label}><span>{r.label}<b className="num">{r.points} / {r.maximum}</b></span><div className="meter"><i style={{ transform: "scaleX(" + (r.maximum ? r.points / r.maximum : 0) + ")" }} /></div></li>)}</ul>
        <h3 className="sec-t">Contact routes</h3><div className="r3-routes">{lead.contact ? <Anchor className="btn" href={contactType(lead.contact) === "email" ? "mailto:" + lead.contact : lead.contact} target="_blank" rel="noreferrer">{lead.contact_type ?? contactType(lead.contact)} · {lead.contact}</Anchor> : <p className="gg-muted">No contact supplied</p>}{lead.source_url && <Anchor className="btn" href={lead.source_url} target="_blank" rel="noreferrer">Open profile ↗</Anchor>}{(lead.contact_source_url || lead.earnings_source_url) && <Anchor className="btn" href={lead.contact_source_url || lead.earnings_source_url!} target="_blank" rel="noreferrer">Source evidence ↗</Anchor>}</div>
        <details className="r3-evidence"><summary>Research evidence</summary><p>{lead.fit_evidence || "No fit evidence recorded."}</p><p>Earnings coverage: {lead.covers_earnings ?? "Unverified"} · {lead.earnings_evidence}</p><p>{lead.audience_evidence}</p>{lead.promotion_rules && <p>{lead.promotion_rules}</p>}</details>
      </section>
      <section className="r3-center"><div className="r3-partner-navigation"><button className="btn" disabled={index <= 0} onClick={() => step(-1)} aria-label="Previous partner">← Previous <kbd>K</kbd></button><span className="num">{index + 1} / {real.length}</span><button className="btn" disabled={index >= real.length - 1} onClick={() => step(1)} aria-label="Next partner">Next → <kbd>J</kbd></button></div>
        <LeadTimeline slug={lead.tracked_slug}>
        <section className="r3-draft"><div className="r3-section-head"><h3>Outreach draft</h3><button className="btn primary" onClick={() => void copy(draft, "draft")}>Copy draft</button></div><p className="gg-muted">Gap Gambler / Earnings Tournament · {facts.entry} · {facts.eligibility}</p><div className="gg-draft">{draft.slice(0, -pitchLink.length)}<Anchor href={pitchLink} target="_blank" rel="noreferrer">{pitchLink}</Anchor></div><div className="r3-tracked"><div><span className="eyebrow">Tracked link</span><Anchor href={pitchLink} target="_blank" rel="noreferrer">{pitchLink}</Anchor></div><button className="btn" onClick={() => void copy(pitchLink, "tracked link")}>Copy link</button></div></section></LeadTimeline>
      </section>
      <section className="side"><div><h3 className="sec-t">Pipeline stage</h3><div className="stagepick" role="group" aria-label="Stage">{STAGES.map((stage, i) => <button key={stage} aria-pressed={stage === lead.stage} onClick={() => moveStage(lead.tracked_slug, stage)}><span className={"gg-stage-dot gg-stage-" + stage.toLowerCase()} aria-hidden />{stage}<kbd>{i + 1}</kbd></button>)}</div><div className="next"><div className="t">Next step</div><p>{nextStep}</p></div></div>
        <div><h3 className="sec-t">Notes & follow-up</h3><label className="gg-field">Notes<textarea className="note" aria-label="Notes" value={lead.notes} onChange={e => update(lead.tracked_slug, { notes: e.target.value })} placeholder="Add your outreach notes" /></label><div className="gg-form-grid"><label className="gg-field">Signups · manual<input aria-label="Signups" type="number" inputMode="numeric" min="0" step="1" value={lead.signups} onChange={e => { const n = Number(e.target.value); if (e.target.value && Number.isSafeInteger(n) && n >= 0) update(lead.tracked_slug, { signups: n }); }} /></label><label className="gg-field">Last touch<input aria-label="Last touch" type="date" max="9999-12-31" value={lead.last_touch} onChange={e => { if (!e.target.value || (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && e.target.validity.valid)) update(lead.tracked_slug, { last_touch: e.target.value }); }} /></label></div><p className="gg-muted">Signups: awaiting prereg data. Enter confirmed counts manually.</p><p className="gg-storage-note" role="status">{saveStatus}</p>{error && <p className="gg-error" role="alert">{error} <button className="btn" onClick={() => void retrySave()}>Retry saving</button></p>}</div>
      </section>
    </div>
  </Modal>;
}
