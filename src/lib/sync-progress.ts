/** Saved pagination is progress, never a successful complete-data observation. */
export class SyncPending extends Error {
  constructor() { super("Instantly pagination is incomplete. Previous complete data is retained; the next sync continues it."); }
}
