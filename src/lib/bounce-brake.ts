export const GG_CAMPAIGN_ID = "e5b1841c-f9aa-44e4-a9bd-ccfc82bf25ef";
export function shouldPauseCampaign(sent: number, bounceRate: number, bounced = sent * bounceRate): boolean {
  if (!Number.isInteger(sent) || sent < 0 || !Number.isFinite(bounceRate) || bounceRate < 0 || bounceRate > 1) throw new Error("Invalid bounce metrics.");
  if (!Number.isFinite(bounced) || bounced < 0 || bounced > sent) throw new Error("Invalid hard bounce count.");
  return (sent >= 100 && bounceRate > 0.03) || bounced >= 6;
}
export function bounceCounts(sent: unknown, bounced: unknown) {
  if (typeof sent !== "number" || typeof bounced !== "number" || !Number.isInteger(sent) || !Number.isInteger(bounced) || sent < 0 || bounced < 0 || bounced > sent) throw new Error("Instantly bounce counts are unavailable or invalid.");
  const rate = sent ? bounced / sent : 0;
  return { sent, bounced, rate, breach: shouldPauseCampaign(sent, rate, bounced) };
}
/** Never substitute the combined analytics count for provider-classified hard bounces. */
export function hardBounceCounts(sent: unknown, summary: unknown) {
  if (!summary || typeof summary !== "object") throw new Error("Classified bounce summary is unavailable.");
  const { total, hard, soft, unknown } = summary as Record<string, unknown>;
  for (const value of [total, hard, soft, unknown]) bounceCounts(sent, value);
  if ((hard as number) + (soft as number) + (unknown as number) !== total) throw new Error("Classified bounce summary is inconsistent.");
  return { ...bounceCounts(sent, hard), bounceBasis: "hard" as const, totalBounced: total as number, softBounced: soft as number, unknownBounced: unknown as number };
}
export type BounceAlert = { at: string; sent: number; bounced: number; rate: number; bounceBasis?: "hard"; softBounced?: number; unknownBounced?: number; status: "paused" | "pause-requested" | "pause-unconfirmed" };
export type BrakeCheck = { at: string; ok: boolean; sent?: number; bounced?: number; campaignStatus?: number };
export type BounceBrakeStatus = { alert: BounceAlert | null; lastCheck: BrakeCheck | null; lastSuccess: BrakeCheck | null };
export function pausedBrakeAlert(brake: BounceBrakeStatus | null | undefined, campaignStatus: unknown) {
  return String(campaignStatus ?? brake?.lastSuccess?.campaignStatus) === "2" && brake?.alert?.status === "paused" ? brake.alert : null;
}
export function brakePauseCopy(alert: BounceAlert) {
  return `Campaign paused by bounce brake — ${alert.bounced.toLocaleString()} of ${alert.sent.toLocaleString()} ${alert.bounceBasis === "hard" ? "hard bounced" : "bounced"}`;
}
export function brakeIsStale(lastSuccess: BrakeCheck | null | undefined, now = Date.now()) {
  const at = Date.parse(lastSuccess?.at ?? "");
  return !Number.isFinite(at) || now - at > 30 * 60000;
}
