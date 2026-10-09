// Marked audit requests are stored internally and must leave real metrics unchanged.
process.env.AUDIT_ORIGIN ||= 'https://gg-tourney-hub.vercel.app';
await import('./client-readiness-clicks.mjs');
