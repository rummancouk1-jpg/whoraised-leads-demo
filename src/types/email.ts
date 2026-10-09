export type Inbox = { email: string; warmup: string; health: number | null; sentToday: number | null; dailyLimit: number | null };
export type CampaignMetrics = { id: string; name: string; status?: number | string; startsOn?: string; sent: number | null; contacted: number | null; opened: number | null; replied: number | null; bounced: number | null; unsubscribed: number | null };
export type SendDay = { date: string; sent: number | null; contacted: number | null; opened: number | null; replied: number | null };
export type EmailMetrics = { fetchedAt: string; day: string; inboxes: Inbox[]; campaign: CampaignMetrics | null; campaignMessage: string; batches: SendDay[] };
export type EmailSnapshot = { day: string; captured_at: string; metrics: EmailMetrics };
export type EmailResponse = { live: EmailMetrics | null; history: EmailSnapshot[]; error: string; historyError: string };
