export const isPreviewBot = (agent: string) => /bot|crawler|spider|facebookexternalhit|facebot|slack|discord|linkedin|whatsapp|telegram|skypeuripreview|pinterest|embedly|iframely|preview|headless/i.test(agent);

export const isTestClick = (slug: string, url?: string, agent = "", marker = "") => /^(example|test)-/i.test(slug) || /gg-outreach-(audit|test)|playwright|headless/i.test(agent) || /^(1|true|audit|test)$/i.test(marker) || !!url && new URL(url).searchParams.getAll("test").includes("1");

export function platformGuess(agent: string, referrer: string) {
  const host = safeReferrer(referrer);
  if (/(^|\.)(twitter\.com|x\.com)$/.test(host)) return "X";
  if (/(^|\.)facebook\.com$/.test(host)) return "Facebook";
  if (/(^|\.)instagram\.com$/.test(host)) return "Instagram";
  if (/(^|\.)linkedin\.com$/.test(host)) return "LinkedIn";
  if (/(^|\.)youtube\.com$/.test(host) || host === "youtu.be") return "YouTube";
  if (/android|iphone|ipod|mobile/i.test(agent)) return "phone";
  if (/ipad|tablet/i.test(agent)) return "tablet";
  return agent ? "desktop" : "unknown";
}

// Store only a hostname: referrer paths/queries can contain personal information.
export function safeReferrer(value: string) {
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.hostname.slice(0, 253) : ""; }
  catch { return ""; }
}

export function preregDestination(slug: string, configured = "https://earningstournament.com", incoming?: string, token?: string) {
  const url = new URL(configured);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Invalid PREREG_URL");
  url.searchParams.set("utm_source", "creator");
  url.searchParams.set("utm_campaign", "gg-q3");
  url.searchParams.set("utm_content", slug);
  if (incoming) {
    if (isTestClick(slug,incoming)) url.searchParams.set("test","1");
    for (const [key, value] of new URL(incoming).searchParams) {
      // Preserve campaign UTMs; the stored creator slug remains authoritative.
      if (/^utm_[a-z_]+$/.test(key) && key !== "utm_content") url.searchParams.set(key, value);
    }
  }
  if (token) url.searchParams.set("gg_click",token);
  return url.toString();
}
