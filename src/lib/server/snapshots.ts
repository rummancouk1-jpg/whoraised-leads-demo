import "server-only";
import { database, initializeDatabase } from "./db";
import { fetchEmailMetrics } from "./instantly";
import type { EmailMetrics, EmailSnapshot } from "@/types/email";
import { isWorkspaceInbox } from "./email-scope";
export async function snapshotHistory(): Promise<EmailSnapshot[]> {
  await initializeDatabase();
  const rows = await database()`SELECT to_char(day,'YYYY-MM-DD') AS day, captured_at, metrics FROM gg_snapshots ORDER BY day DESC LIMIT 90`;
  return (rows as EmailSnapshot[]).map(row => ({ ...row, metrics: { ...row.metrics, inboxes: row.metrics.inboxes.filter(i => isWorkspaceInbox(i.email)) } }));
}
/** The newest saved daily snapshot only (the full 90-day history is read by /api/email). */
export async function latestSnapshot(): Promise<EmailMetrics | null> {
  await initializeDatabase();
  const rows = await database()`SELECT metrics FROM gg_snapshots ORDER BY day DESC LIMIT 1`;
  const metrics = rows[0]?.metrics as EmailMetrics | undefined;
  return metrics ? { ...metrics, inboxes: metrics.inboxes.filter(i => isWorkspaceInbox(i.email)) } : null;
}
export async function captureSnapshot() {
  const metrics = await fetchEmailMetrics();
  await initializeDatabase();
  const rows = await database()`INSERT INTO gg_snapshots(day,metrics) VALUES (${metrics.day},${JSON.stringify(metrics)}::jsonb) ON CONFLICT(day) DO NOTHING RETURNING day`;
  return { day: metrics.day, inserted: rows.length > 0 };
}
