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
      sql`UPDATE gg_clicks SET is_test=true WHERE NOT is_test AND (is_example OR slug ~* '^(example|test)-')`,
    ]).catch(e => { ready = undefined; throw e; });
  }
  return ready;
}
