import defaultConfig from 'lighthouse/core/config/default-config.js';

export const AUTH_GATED_EXCEPTION = {audit:'is-crawlable',reason:'User-approved exception for verified auth-gated apps; private pages remain noindex.'};
export function lighthouseAuditPolicy(authGateVerified) {
 return authGateVerified ? {skipAudits:[AUTH_GATED_EXCEPTION.audit]} : {};
}
/** Check every remaining automated SEO audit on every run, not just its category median. */
export function seoAuditGate(lhr,authGateVerified) {
 const configuredSkips=lhr.configSettings?.skipAudits??[];
 const allowed=authGateVerified?[AUTH_GATED_EXCEPTION.audit]:[];
 const policyMatches=configuredSkips.length===allowed.length&&configuredSkips.every(id=>allowed.includes(id));
 const expected=defaultConfig.categories.seo.auditRefs.filter(ref=>!allowed.includes(ref.id));
 const checks=expected.filter(ref=>ref.weight>0).map(({id})=>{
  const audit=lhr.audits[id];
  return {id,score:audit?.score??null,mode:audit?.scoreDisplayMode??'missing',pass:!!audit&&(audit.score===1||audit.scoreDisplayMode==='notApplicable')};
 });
 return {pass:policyMatches&&checks.length>0&&checks.every(check=>check.pass),policyMatches,authGateVerified,exception:authGateVerified?AUTH_GATED_EXCEPTION:null,checks,manualAudits:expected.filter(ref=>ref.weight===0).map(ref=>ref.id)};
}
