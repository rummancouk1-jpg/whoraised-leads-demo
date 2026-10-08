import "server-only";
import { createHash } from "node:crypto";
import { exportCsv, parseLeadsCsv, isExample } from "@/lib/outreach";
import { database, initializeDatabase } from "./db";
import type { Lead } from "@/types/outreach";

export async function getLeads(): Promise<Lead[]> {
  await initializeDatabase();
  const rows = await database()`SELECT data FROM gg_leads ORDER BY slug`;
  return rows.map(row => {
    const lead = { ...row.data } as Lead;
    delete lead.source_url_live;
    return lead;
  }).filter(lead => !isExample(lead));
}
export async function importCsv(csv: string, replace: boolean, oneTime: boolean) {
  if (csv.length > 1_000_000) throw new Error("CSV exceeds the 1 MB limit.");
  const leads = parseLeadsCsv(csv);
  if (!leads.length || leads.length > 5000) throw new Error("Import between 1 and 5,000 leads.");
  await initializeDatabase();
  const sql = database();
  const id = createHash("sha256").update(exportCsv(leads)).digest("hex");
  const queries = [];
  if (oneTime) queries.push(sql`INSERT INTO gg_imports(id,row_count) VALUES (${id},${leads.length})`);
  if (replace) queries.push(sql`DELETE FROM gg_leads`);
  for (const lead of leads) {
    if (lead.source_url_live) {
      queries.push(sql`INSERT INTO gg_internal_audit(kind,data) VALUES ('imported-source-health',${JSON.stringify({ slug: lead.tracked_slug, source_url_live: lead.source_url_live })}::jsonb)`);
      delete lead.source_url_live;
    }
    if (isExample(lead)) queries.push(sql`INSERT INTO gg_internal_audit(kind,data) VALUES ('test-lead-import',${JSON.stringify(lead)}::jsonb)`);
    else queries.push(sql`INSERT INTO gg_leads(slug,data) VALUES (${lead.tracked_slug},${JSON.stringify(lead)}::jsonb) ON CONFLICT (slug) DO NOTHING`);
  }
  try { await sql.transaction(queries); }
  catch (e) {
    if (oneTime && (e as { code?: string }).code === "23505") throw new Error("This CSV backup has already been imported. No changes were made.");
    throw new Error("Import could not be saved. No changes were made.");
  }
  return getLeads();
}
export async function patchLead(slug: string, patch: unknown) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("Invalid edit.");
  const keys = Object.keys(patch);
  if (!keys.length || keys.some(k => !["stage", "notes", "signups", "last_touch"].includes(k))) throw new Error("Invalid edit fields.");
  const fields = patch as Record<string, unknown>;
  for (const key of keys) {
    if (key === "signups" ? typeof fields[key] !== "number" : typeof fields[key] !== "string") throw new Error("Invalid edit types.");
  }
  await initializeDatabase();
  const sql = database();
  const rows = await sql`SELECT data FROM gg_leads WHERE slug=${slug}`;
  if (!rows.length) throw new Error("Lead no longer exists. Refresh the workspace.");
  // Reuse the strict CSV schema, then atomically merge only the submitted fields.
  parseLeadsCsv(exportCsv([{ ...rows[0].data, ...patch }]));
  const result = await sql`UPDATE gg_leads SET data=data || ${JSON.stringify(patch)}::jsonb, updated_at=now() WHERE slug=${slug} RETURNING data`;
  return result[0]?.data;
}
