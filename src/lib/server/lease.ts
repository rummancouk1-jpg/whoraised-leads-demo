import "server-only";
import { randomUUID } from "node:crypto";
import { database, initializeDatabase } from "./db";
export async function acquireLease(key: string, seconds = 120) {
  await initializeDatabase(); const owner = randomUUID();
  const rows = await database()`INSERT INTO gg_job_leases(key,owner,lease_until) VALUES (${key},${owner},now()+make_interval(secs=>${seconds}))
    ON CONFLICT(key) DO UPDATE SET owner=EXCLUDED.owner,lease_until=EXCLUDED.lease_until WHERE gg_job_leases.lease_until<=now() RETURNING owner`;
  return rows.length ? owner : null;
}
export async function releaseLease(key: string, owner: string) { await database()`DELETE FROM gg_job_leases WHERE key=${key} AND owner=${owner}`; }
