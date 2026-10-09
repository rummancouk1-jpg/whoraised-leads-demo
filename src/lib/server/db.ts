import "server-only";
import { neon } from "@neondatabase/serverless";
import { AsyncLocalStorage } from "node:async_hooks";
const deadline = new AsyncLocalStorage<AbortSignal>();
export async function withDatabaseDeadline<T>(work: () => Promise<T>, ms = 2500): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Database read timed out.")), ms);
  try { return await deadline.run(controller.signal, work); } finally { clearTimeout(timer); }
}

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Workspace storage is not configured.");
  if (process.env.VERCEL_ENV === "preview" || process.env.GG_DB_ENVIRONMENT === "preview") {
    const host = new URL(url).hostname;
    if (!process.env.GG_EXPECTED_DB_HOST || !process.env.GG_PRODUCTION_DB_HOST || host !== process.env.GG_EXPECTED_DB_HOST || host.replace("-pooler", "") === process.env.GG_PRODUCTION_DB_HOST.replace("-pooler", "")) throw new Error("Preview database isolation is not configured.");
  }
  // A client can survive several provider pages. Start the timeout for each fetch,
  // rather than expiring the client while it waits for Instantly.
  return neon(url, { fetchOptions: { get signal() {
    const signal = deadline.getStore();
    return signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000);
  } } });
}
let ready: Promise<unknown> | undefined;
export function initializeDatabase() {
  if (!ready) {
    const sql = database();
    ready = sql.transaction([
      sql`CREATE TABLE IF NOT EXISTS gg_leads (slug text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS gg_imports (id text PRIMARY KEY, row_count integer NOT NULL, imported_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS gg_snapshots (day date PRIMARY KEY, captured_at timestamptz NOT NULL DEFAULT now(), metrics jsonb NOT NULL)`,
      sql`CREATE TABLE IF NOT EXISTS gg_login_attempts (identity text PRIMARY KEY, attempts integer NOT NULL, window_start timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS gg_sessions (token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL)`,
      sql`CREATE TABLE IF NOT EXISTS gg_internal_audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, recorded_at timestamptz NOT NULL DEFAULT now(), kind text NOT NULL, data jsonb NOT NULL)`,
      sql`CREATE TABLE IF NOT EXISTS gg_clicks (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, clicked_at timestamptz NOT NULL DEFAULT now(), slug text NOT NULL, lead_group text NOT NULL, referrer text NOT NULL, platform_guess text NOT NULL, is_example boolean NOT NULL DEFAULT false)`,
      sql`CREATE INDEX IF NOT EXISTS gg_clicks_slug_idx ON gg_clicks (slug)`,
      sql`CREATE INDEX IF NOT EXISTS gg_clicks_time_idx ON gg_clicks (clicked_at)`,
      sql`ALTER TABLE gg_clicks ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false`,
      sql`CREATE TABLE IF NOT EXISTS gg_lead_stats (slug text PRIMARY KEY, email text NOT NULL, sent integer NOT NULL DEFAULT 0, opened integer NOT NULL DEFAULT 0, replied integer NOT NULL DEFAULT 0, clicked integer NOT NULL DEFAULT 0, bounced boolean NOT NULL DEFAULT false, unsubscribed boolean NOT NULL DEFAULT false, interest integer, last_outbound_at timestamptz, last_inbound_at timestamptz, last_open_at timestamptz, last_click_at timestamptz, synced_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS gg_lead_events (ref text PRIMARY KEY, slug text NOT NULL, kind text NOT NULL, at timestamptz, n integer NOT NULL DEFAULT 1)`,
      sql`CREATE INDEX IF NOT EXISTS gg_lead_events_slug_idx ON gg_lead_events (slug)`,
      sql`CREATE TABLE IF NOT EXISTS gg_sync_runs (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, source text NOT NULL, trigger text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, ok boolean, error text, counts jsonb)`,
      sql`CREATE INDEX IF NOT EXISTS gg_sync_runs_time_idx ON gg_sync_runs (source, started_at DESC)`,
      sql`CREATE TABLE IF NOT EXISTS gg_signups (id text PRIMARY KEY, slug text NOT NULL, signed_up_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(), is_test boolean NOT NULL DEFAULT false)`,
      sql`CREATE INDEX IF NOT EXISTS gg_signups_slug_idx ON gg_signups (slug)`,
      sql`CREATE TABLE IF NOT EXISTS gg_errors (fingerprint text PRIMARY KEY, name text NOT NULL, surface text NOT NULL, route text NOT NULL, release_sha text NOT NULL, message text NOT NULL, count integer NOT NULL DEFAULT 1, first_seen timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now())`,
      sql`UPDATE gg_clicks SET is_test=true WHERE NOT is_test AND (is_example OR slug ~* '^(example|test)-')`,
      sql`CREATE TABLE IF NOT EXISTS gg_job_leases (key text PRIMARY KEY, owner text NOT NULL, lease_until timestamptz NOT NULL)`,
      sql`CREATE TABLE IF NOT EXISTS gg_sync_checkpoints (campaign text PRIMARY KEY, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS gg_request_limits (key text PRIMARY KEY, used integer NOT NULL, reset_at timestamptz NOT NULL)`,
      sql`CREATE TABLE IF NOT EXISTS gg_digest_deliveries (week text PRIMARY KEY, owner text NOT NULL, status text NOT NULL, claimed_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz)`,
      sql`ALTER TABLE gg_digest_deliveries ADD COLUMN IF NOT EXISTS first_claimed_at timestamptz NOT NULL DEFAULT now()`,
      sql`CREATE TABLE IF NOT EXISTS gg_error_occurrences (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, fingerprint text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE INDEX IF NOT EXISTS gg_error_occurrences_time_idx ON gg_error_occurrences (occurred_at, fingerprint)`,
      sql`ALTER TABLE gg_lead_stats ADD COLUMN IF NOT EXISTS unknown_fields jsonb NOT NULL DEFAULT '[]'::jsonb`,
      sql`ALTER TABLE gg_clicks ADD COLUMN IF NOT EXISTS click_token text`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS gg_clicks_token_idx ON gg_clicks (click_token)`,
      sql`ALTER TABLE gg_signups ADD COLUMN IF NOT EXISTS click_id bigint REFERENCES gg_clicks(id)`,
      sql`ALTER TABLE gg_signups ADD COLUMN IF NOT EXISTS webhook_nonce text`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS gg_signups_nonce_idx ON gg_signups (webhook_nonce)`,
    ]).catch(e => { ready = undefined; throw e; });
  }
  return ready;
}
