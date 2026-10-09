import "server-only";
import { createHash } from "node:crypto";
import { database, initializeDatabase } from "./db";
export async function takeBudget(key: string, limit: number, seconds: number): Promise<boolean> {
  await initializeDatabase();
  const rows = await database()`INSERT INTO gg_request_limits(key,used,reset_at) VALUES (${key},1,now()+make_interval(secs=>${seconds}))
    ON CONFLICT (key) DO UPDATE SET used=CASE WHEN gg_request_limits.reset_at<=now() THEN 1 ELSE gg_request_limits.used+1 END,
      reset_at=CASE WHEN gg_request_limits.reset_at<=now() THEN now()+make_interval(secs=>${seconds}) ELSE gg_request_limits.reset_at END
    WHERE gg_request_limits.reset_at<=now() OR gg_request_limits.used<${limit} RETURNING used`;
  return rows.length > 0;
}
export function requestIdentity(request: Request, surface: string) {
  return surface+":"+createHash("sha256").update(`${process.env.GG_SESSION_SECRET}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`).digest("hex");
}
export class RequestTooLarge extends Error {}
export async function readBody(request: Request, maxBytes: number): Promise<string> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new RequestTooLarge("Too large.");
  const reader = request.body?.getReader(); if (!reader) return "";
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > maxBytes) { await reader.cancel(); throw new RequestTooLarge("Too large."); } chunks.push(value); }
    return Buffer.concat(chunks).toString("utf8");
  } finally { reader.releaseLock(); }
}
