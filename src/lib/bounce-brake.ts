export const GG_CAMPAIGN_ID = "e5b1841c-f9aa-44e4-a9bd-ccfc82bf25ef";
export function shouldPauseCampaign(sent: number, bounceRate: number): boolean {
  if (!Number.isInteger(sent) || sent < 0 || !Number.isFinite(bounceRate) || bounceRate < 0 || bounceRate > 1) throw new Error("Invalid bounce metrics.");
  return sent >= 50 && bounceRate > 0.03;
}
export function bounceCounts(sent: unknown, bounced: unknown) {
  if (typeof sent !== "number" || typeof bounced !== "number" || !Number.isInteger(sent) || !Number.isInteger(bounced) || sent < 0 || bounced < 0 || bounced > sent) throw new Error("Instantly bounce counts are unavailable or invalid.");
  const rate = sent ? bounced / sent : 0;
  return { sent, bounced, rate, breach: shouldPauseCampaign(sent, rate) };
}
export type BounceAlert = { at: string; sent: number; bounced: number; rate: number; status: "paused" | "pause-requested" | "pause-unconfirmed" };
export type BounceBrakeStatus = { alert: BounceAlert | null; lastCheck: { at: string; ok: boolean; sent?: number; bounced?: number } | null };
