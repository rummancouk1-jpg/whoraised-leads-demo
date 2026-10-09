import { bypass } from './infra.mjs';
process.env.VERCEL_AUTOMATION_BYPASS_SECRET = bypass();
process.env.EVIDENCE_ROOT ||= 'evidence/r2-fix/pwa';
await import('../design/pwa.mjs');
