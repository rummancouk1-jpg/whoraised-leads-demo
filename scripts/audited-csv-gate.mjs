import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { contract } from './outreach-contract.mjs';
import { checkAllContacts } from './contact-evidence-gate.mjs';
export async function validateAuditedCsv(filename){
 const csv=await fs.readFile(filename,'utf8');const imported=contract.parseLeadsCsv(csv);
 if(imported.every(contract.isExample))return {csv,checks:[]};
 // Required even for the base/legacy CSV schema: removing research columns cannot bypass rule 4.
 assert(/\.csv$/i.test(filename),'Use a CSV file with a matching JSON sidecar.');
 const sidecar=filename.replace(/\.csv$/i,'.json');
 const audit=JSON.parse(await fs.readFile(sidecar,'utf8').catch(()=>{throw new Error('Real lead imports require a JSON sidecar with accepted rows and contact_manifest.');}));
 const bySlug=new Map(audit.accepted.map(l=>[l.tracked_slug,l]));
 assert.equal(imported.length,bySlug.size,'CSV must contain exactly the sidecar rows.');
 for(const lead of imported)for(const [key,value] of Object.entries(lead))assert.deepEqual(value,bySlug.get(lead.tracked_slug)?.[key],`${lead.tracked_slug}: CSV/sidecar mismatch in ${key}`);
 return {csv,checks:await checkAllContacts(audit.accepted.filter(l=>!contract.isExample(l)),audit.contact_manifest)};
}
