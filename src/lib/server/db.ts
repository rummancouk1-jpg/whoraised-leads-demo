import "server-only";
import { neon } from "@neondatabase/serverless";

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Shared database is not configured.");
  return neon(url);
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
    ]).catch(e => { ready = undefined; throw e; });
  }
  return ready;
}
