import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { equal } from "./auth";
type ClickClaim = { id: string; slug: string; test: boolean; issued: number };
const secret = () => { const key = process.env.ATTRIBUTION_SIGNING_SECRET; if (!key) throw new Error("Creator link attribution is not configured."); return key; };
export function issueClickToken(slug: string, test: boolean) {
  const claim: ClickClaim = { id: randomUUID(), slug, test, issued: Math.floor(Date.now()/1000) };
  const body = Buffer.from(JSON.stringify(claim)).toString("base64url");
  return body+"."+createHmac("sha256",secret()).update(body).digest("hex");
}
export function verifyClickToken(token: string): ClickClaim | null {
  try {
    if (token.length > 700) return null;
    const [body,signature,extra] = token.split(".");
    if(extra || !signature || !equal(signature,createHmac("sha256",secret()).update(body).digest("hex"))) return null;
    const value: unknown = JSON.parse(Buffer.from(body,"base64url").toString());
    if(!value || typeof value !== "object") return null;
    const c = value as ClickClaim;
    if(typeof c.id!=="string" || typeof c.slug!=="string" || typeof c.test!=="boolean" || !Number.isInteger(c.issued) || c.issued>Date.now()/1000+60 || c.issued<Date.now()/1000-30*86400) return null;
    return c;
  } catch { return null; }
}
export function verifyWebhook(request: Request, text: string, key: string) {
  const timestamp = request.headers.get("x-gg-timestamp") ?? "";
  const nonce = request.headers.get("x-gg-nonce") ?? "";
  const signature = request.headers.get("x-gg-signature") ?? "";
  if(!/^\d{10}$/.test(timestamp) || Math.abs(Number(timestamp)-Date.now()/1000)>300 || !/^[\w:-]{16,100}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return equal(signature,createHmac("sha256",key).update(`${timestamp}.${nonce}.${text}`).digest("hex"));
}
