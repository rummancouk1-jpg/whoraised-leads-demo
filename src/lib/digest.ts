export type DigestNumber = { label: string; value: string; note: string };
export type DigestModel = {
  generatedAt: string; weekStart: string; weekEnd: string; subject: string; status: string;
  numbers: DigestNumber[];
  topCreators: { name: string; platform: string; clicks: number; signups: number | null }[];
  topNote: string;
  replies: { name: string; at: string; waiting: boolean }[];
  needs: { replies: number; bounces: number; followups: number };
  freshness: string;
};
export type DigestSendState = { enabled: boolean; ready: boolean; missing: string[]; recipients: number; nextSendAt: string; lastSentAt: string | null; lastSkipped: string | null };

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, c => ENTITIES[c]);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function nyParts(d: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map(p => [p.type, p.value]));
}
/** Next Monday 09:00 America/New_York as an ISO instant (DST-safe: tries 13:00 and 14:00 UTC). */
export function nextMondayNineET(now = new Date()): string {
  for (let offset = 0; offset < 9; offset++) for (const hour of [13, 14]) {
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, hour, 0, 0));
    const p = nyParts(candidate);
    if (candidate > now && p.weekday === "Mon" && p.hour === "09" && p.minute === "00") return candidate.toISOString();
  }
  throw new Error("No Monday found");
}
/** True when `now` falls in the Monday 09:00 hour in New York. The cron fires at 13:00 and 14:00 UTC; only one matches. */
export function isSendWindow(now = new Date()): boolean {
  const p = nyParts(now);
  return p.weekday === "Mon" && p.hour === "09";
}

export function renderDigest(m: DigestModel): { html: string; text: string } {
  const cell = (n: DigestNumber) => `<td style="padding:12px 14px;border:1px solid #e4e4e7;vertical-align:top;width:33%"><div style="font-size:12px;color:#52525b">${esc(n.label)}</div><div style="font-size:24px;font-weight:650;color:#18181b">${esc(n.value)}</div><div style="font-size:12px;color:#71717a">${esc(n.note)}</div></td>`;
  const rows: string[] = [];
  for (let i = 0; i < m.numbers.length; i += 3) rows.push(`<tr>${m.numbers.slice(i, i + 3).map(cell).join("")}</tr>`);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const creators = m.topCreators.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${m.topCreators.map(c => `<tr><td style="padding:6px 0;border-bottom:1px solid #f4f4f5">${esc(c.name)} <span style="color:#71717a">· ${esc(c.platform)}</span></td><td align="right" style="padding:6px 0;border-bottom:1px solid #f4f4f5">${plural(c.clicks, "visit", "visits")}${c.signups === null ? "" : ` · ${plural(c.signups, "signup", "signups")}`}</td></tr>`).join("")}</table>`
    : `<p style="margin:0;color:#52525b;font-size:14px">${esc(m.topNote)}</p>`;
  const replies = m.replies.length
    ? `<ul style="margin:0;padding-left:18px;font-size:14px">${m.replies.map(r => `<li style="margin:4px 0">${esc(r.name)} <span style="color:#71717a">· ${day(r.at)}${r.waiting ? " · waiting for an answer" : ""}</span></li>`).join("")}</ul>`
    : `<p style="margin:0;color:#52525b;font-size:14px">No replies this week.</p>`;
  const h = (t: string) => `<h2 style="margin:24px 0 8px;font-size:15px;color:#18181b">${t}</h2>`;
  const needs = `${plural(m.needs.replies, "reply", "replies")} to answer · ${plural(m.needs.followups, "follow-up", "follow-ups")} due · ${plural(m.needs.bounces, "bounce", "bounces")} to fix`;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#fafafa;font-family:-apple-system,Segoe UI,Roboto,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4e4e7"><tr><td style="padding:24px">
<div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#71717a">GG Outreach · week of ${day(m.weekStart)} – ${day(m.weekEnd)}</div>
<p style="margin:8px 0 0;font-size:20px;line-height:1.35;font-weight:650;color:#18181b">${esc(m.status)}</p>
${h("The numbers")}<table role="presentation" width="100%" cellpadding="0" cellspacing="6">${rows.join("")}</table>
${h("Top creators this week")}${creators}
${h("Replies")}${replies}
${h("Needs action")}<p style="margin:0;font-size:14px;color:#18181b">${needs}</p>
<p style="margin:24px 0 0;font-size:12px;color:#71717a">${esc(m.freshness)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    `GG Outreach — week of ${day(m.weekStart)} – ${day(m.weekEnd)}`, "", m.status, "", "THE NUMBERS",
    ...m.numbers.map(n => `${n.label}: ${n.value} (${n.note})`), "", "TOP CREATORS THIS WEEK",
    ...(m.topCreators.length ? m.topCreators.map(c => `- ${c.name} (${c.platform}): ${plural(c.clicks, "visit", "visits")}${c.signups === null ? "" : `, ${plural(c.signups, "signup", "signups")}`}`) : [m.topNote]),
    "", "REPLIES", ...(m.replies.length ? m.replies.map(r => `- ${r.name} · ${day(r.at)}${r.waiting ? " · waiting for an answer" : ""}`) : ["No replies this week."]),
    "", `NEEDS ACTION: ${needs}`, "", m.freshness,
  ].join("\n");
  return { html, text };
}
