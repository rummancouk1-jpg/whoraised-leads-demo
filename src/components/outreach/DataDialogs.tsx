"use client";

import { useState } from "react";
import { useOutreach } from "@/contexts/OutreachContext";
import { downloadCsv, exportCsv, parseLeadsCsv } from "@/lib/outreach";
import type { Lead } from "@/types/outreach";
import { Modal } from "./Modal";

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const { leads, importLeads } = useOutreach();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Lead[] | null>(null);
  const [error, setError] = useState("");
  const [replace, setReplace] = useState(false);
  const [oneTime, setOneTime] = useState(false);
  const [busy, setBusy] = useState(false);
  const duplicates = preview?.filter(l => leads.some(old => old.tracked_slug === l.tracked_slug)).length ?? 0;
  function validate() { try { setPreview(parseLeadsCsv(text)); setError(""); } catch (e) { setError((e as Error).message); setPreview(null); } }
  return <Modal title="Import leads" onClose={onClose}>
    <p>Import finance creators, trading communities or newsletters. Use the columns in the template. Legacy 13-column files are also supported. Files are validated before anything is saved.</p>
    <div className="gg-actions"><a className="gg-button gg-secondary" href="/gg-outreach-template.csv" download>Blank template CSV</a></div>
    <label className="gg-field">CSV file<input type="file" accept=".csv,text/csv" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { setText(await file.text()); setPreview(null); setError(""); } catch { setError("Could not read this file. Choose it again or paste the CSV below."); } }} /></label>
    <label className="gg-field">Or paste CSV<textarea className="gg-csv-input" value={text} onChange={e => { setText(e.target.value); setPreview(null); setError(""); }} placeholder="Paste the header and your lead rows here" /></label>
    <button className="gg-button" onClick={validate} disabled={!text.trim()}>Validate CSV</button>
    {error && <p role="alert" className="gg-error">{error}</p>}
    {preview && <section className="gg-preview" aria-label="Import preview"><h3>{preview.length} valid lead{preview.length === 1 ? "" : "s"}</h3>
      
      <ul>{preview.slice(0, 5).map(l => <li key={l.tracked_slug}>{l.name} · {l.platform} · {l.stage}</li>)}</ul>
      <label className="gg-field">Import mode<select value={replace ? "replace" : "merge"} onChange={e => setReplace(e.target.value === "replace")}><option value="merge">Add new slugs; keep existing leads and edits</option><option value="replace">Replace entire workspace with this CSV</option></select></label>
      <p>{replace ? `This will replace all ${leads.length} current leads and their edits with ${preview.length} imported rows.` : `${preview.length - duplicates} new leads will be added; ${duplicates} existing slugs will be skipped.`}</p>
      <label className="gg-toggle"><input type="checkbox" checked={oneTime} onChange={e => setOneTime(e.target.checked)} />One-time migration of a previous CSV export (same backup cannot be imported twice)</label>
      <button className="gg-button" disabled={!preview.length || busy} onClick={async () => { setBusy(true); try { await importLeads(preview, replace, oneTime); onClose(); } catch(e) { setError((e as Error).message); setBusy(false); } }}>{busy ? "Saving import…" : `Import ${replace ? preview.length : preview.length - duplicates} leads`}</button>
    </section>}
  </Modal>;
}
export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { leads } = useOutreach();
  const csv = exportCsv(leads);
  const [downloaded, setDownloaded] = useState(false);
  return <Modal title="Export current state" onClose={onClose}>
    <p>Export all {leads.length} current leads, including stages, notes, signups and last-touch dates. Filters do not restrict this backup.</p>
    {!leads.length && <p>Your workspace is empty. Import a CSV of creators and communities first, or download a header-only CSV below.</p>}
    <label className="gg-field">CSV preview<textarea className="gg-csv-input" readOnly value={csv} /></label>
    <button className="gg-button" onClick={() => { downloadCsv(csv, "gg-outreach-export.csv"); setDownloaded(true); }}>Download CSV</button>
    {downloaded && <p role="status">CSV download requested.</p>}
  </Modal>;
}
