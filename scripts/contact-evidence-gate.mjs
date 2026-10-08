import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root=process.cwd();
const decode=s=>s.replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&commat;/gi,'@').replace(/&amp;/g,'&');
/** Permanent rule 4: validate saved source HTML before any audited import mutation. */
export async function checkContactEvidence(lead, manifest) {
 const type=lead.contact_type;
 assert(['email','form','substack','modmail','discord-mod'].includes(type),`${lead.name}: contact_type required`);
 const source=new URL(lead.contact_source_url);
 assert(/^https?:$/.test(source.protocol)&&!source.username&&!source.password,'Invalid contact source');
 const native=!['email','form'].includes(type);
 const provenance=manifest.find(r=>(r.url===lead.contact_source_url || native && r.url===lead.source_url)&&r.file===lead.contact_evidence_file&&r.status>=200&&r.status<300);
 assert(provenance,`${lead.name}: successful saved contact source missing`);
 const file=path.resolve(root,lead.contact_evidence_file);
 assert(file.startsWith(path.join(root,'evidence')+path.sep),'Evidence must be inside the evidence directory');
 const html=await fs.readFile(file,'utf8');
 assert(!/You've been blocked|Just a moment\.\.\.|Attention Required!/.test(html),'Blocked page is not contact evidence');
 if(type==='email'||type==='form') {
   assert(source.pathname!=='/'&&!/\/videos\/?$/.test(source.pathname),`${lead.name}: homepage/video contact source fails rule 4`);
   const finalUrl=new URL(provenance.final_url||source.href);
   assert(finalUrl.pathname!=='/'&&!/\/videos\/?$/.test(finalUrl.pathname),`${lead.name}: redirected homepage/video contact source fails rule 4`);
   if(type==='email') assert(decode(html).toLowerCase().includes(lead.contact.toLowerCase()),`${lead.name}: email absent from saved source HTML`);
   else {
     assert(new URL(lead.contact).href.split('#')[0]===source.href.split('#')[0],`${lead.name}: form must use its actual source URL`);
     const forms=html.match(/<form\b[\s\S]*?<\/form>/gi)||[];
     const nativeForm=forms.some(f=>/<textarea\b/i.test(f)&&/email/i.test(f)&&!/^<form[^>]*(?:role=["']search|class=["'][^"']*search|action=["'][^"']*search)/i.test(f));
     // Showit's contact form uses validated textareas rather than a native <form> element.
     const showitForm=/data-validate=["'][^"']*Email\|Email Address/.test(html)&&/data-validate=["'][^"']*Tell us more/.test(html)&&/sie-contact[^"']*submit|>Submit</i.test(html);
     assert(nativeForm||showitForm,`${lead.name}: saved HTML has no contact/message form`);
   }
 } else {
   assert(new URL(lead.contact).href===source.href,`${lead.name}: store the native platform URL`);
   if(type==='substack') assert(/(^|\.)substack\.com$/.test(source.hostname)&&/\bMessage\b/.test(html),`${lead.name}: published Substack Message control missing`);
   if(type==='modmail') assert(/(^|\.)reddit\.com$/.test(source.hostname)&&/\/message\/compose/.test(source.pathname)&&/^\/?r\//.test(source.searchParams.get('to')||'')&&lead.promotion_rules,'Invalid modmail URL or missing promotion rules');
   if(type==='discord-mod') assert(/(^|\.)discord\.(com|gg)$/.test(source.hostname)&&/moderator|contact.*mod|modmail/i.test(html),'Published Discord moderator route required');
 }
 return {slug:lead.tracked_slug,type,source:source.href,file:lead.contact_evidence_file,sha256:crypto.createHash('sha256').update(html).digest('hex'),status:'PASS'};
}
export async function checkAllContacts(leads,manifest) {
 const checks=[];for(const lead of leads) checks.push(await checkContactEvidence(lead,manifest));return checks;
}
