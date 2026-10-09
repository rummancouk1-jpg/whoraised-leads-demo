// Retire only obsolete, non-production deployments predating verified isolation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { api, project } from './infra.mjs';
const isolation=JSON.parse(fs.readFileSync('evidence/r2-fix/isolation.json','utf8'));
assert.equal(isolation.applied,true);
const cutoff=Date.parse(isolation.at),production=api(`/v9/projects/${project.projectId}`).targets.production.id;
const list=api(`/v6/deployments?projectId=${project.projectId}&limit=100`);
assert.equal(list.pagination.next,null,'Inspect all pages before retirement');
const obsolete=list.deployments.filter(d=>d.target!=='production'&&d.created<cutoff);
const rows=[];
for(const entry of obsolete){
 const d=api('/v13/deployments/'+entry.uid);
 assert.notEqual(d.target,'production');assert.notEqual(d.id,production);assert.equal(d.projectId,project.projectId);assert(d.createdAt<cutoff);
 const archived={id:d.id,url:d.url,target:d.target,created:d.createdAt,sha:d.meta?.githubCommitSha??d.meta?.gitCommitSha??null};
 api('/v13/deployments/'+d.id,'DELETE',{});
 rows.push({...archived,retired:true});
 fs.writeFileSync('evidence/r2-fix/retired-previews.json',JSON.stringify({at:new Date().toISOString(),cutoff:isolation.at,production,rows},null,2));
}
assert.equal(api(`/v9/projects/${project.projectId}`).targets.production.id,production);
console.log(rows.length+' obsolete shared-database previews retired; production deployment unchanged.');
