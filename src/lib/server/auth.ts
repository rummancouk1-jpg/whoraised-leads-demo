import "server-only";
import { createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { database, initializeDatabase, withDatabaseDeadline } from "./db";
import { cache } from "react";

export const SESSION_COOKIE = "gg-session";
export const SESSION_SECONDS = 60 * 60 * 24 * 14;
function secret() {
  const password = process.env.GG_ACCESS_PASSWORD;
  const key = process.env.GG_SESSION_SECRET;
  if (!password || !key) throw new Error("Private access is not configured.");
  return `${key}:${password}`;
}
export function equal(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
/** Ignore accidental surrounding whitespace only for workspace password login. */
export function passwordMatches(input: unknown): boolean {
  const configured = process.env.GG_ACCESS_PASSWORD?.trim();
  return typeof input === "string" && !!configured && equal(input.trim(), configured);
}
export async function issueSession() {
  const payload = `${Math.floor(Date.now() / 1000) + SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  const token = `${payload}.${createHmac("sha256", secret()).update(payload).digest("hex")}`;
  await initializeDatabase();
  await database()`INSERT INTO gg_sessions(token_hash, expires_at) VALUES (${sessionHash(token)}, to_timestamp(${Number(payload.split(".")[0])}))`;
  return token;
}
export const authenticated = cache(async function authenticated() {
  return validSession((await cookies()).get(SESSION_COOKIE)?.value ?? "");
});
const sessionHash = (value: string) => createHash("sha256").update(value).digest("hex");
export async function revokeSession(value: string) {
  await initializeDatabase();
  await database()`DELETE FROM gg_sessions WHERE token_hash=${sessionHash(value)}`;
}
export async function validSession(value: string) {
  return withDatabaseDeadline(async () => {
  try {
    if (!validSessionSignature(value)) return false;
    await initializeDatabase();
    return (await database()`SELECT 1 FROM gg_sessions WHERE token_hash=${sessionHash(value)} AND expires_at>now()`).length === 1;
  } catch { return false; }
  },1500);
}
/** Proxy's fast optimistic check; the layout and every data route check session revocation in the DB. */
export function validSessionSignature(value: string) {
  try {
    const [expiry,nonce,signature,extra]=value.split(".");
    return !extra && /^\d+$/.test(expiry) && /^[a-f0-9]{32}$/.test(nonce??"") && /^[a-f0-9]{64}$/.test(signature??"") && Number(expiry)>Date.now()/1000 && equal(signature,createHmac("sha256",secret()).update(`${expiry}.${nonce}`).digest("hex"));
  } catch { return false; }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
export function privateJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}
