import {bypass} from './infra.mjs';
process.env.VERCEL_AUTOMATION_BYPASS_SECRET=bypass();
await import('./fix-matrix.mjs');
