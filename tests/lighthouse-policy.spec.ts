import { test } from "@playwright/test";
import { execFileSync } from "node:child_process";

test("auth-gated Lighthouse skips exactly crawlability and fails every other bad SEO audit", () => {
  execFileSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import config from 'lighthouse/core/config/default-config.js';
    import {lighthouseAuditPolicy,seoAuditGate} from './scripts/r2/lighthouse-policy.mjs';
    const audits=Object.fromEntries(config.categories.seo.auditRefs.map(({id,weight})=>[id,{score:weight?1:null,scoreDisplayMode:weight?'binary':'manual'}]));
    const report={audits,configSettings:{skipAudits:['is-crawlable']}};
    delete audits['is-crawlable'];
    assert.deepEqual(lighthouseAuditPolicy(true),{skipAudits:['is-crawlable']});
    assert.deepEqual(lighthouseAuditPolicy(false),{});
    assert.equal(seoAuditGate(report,true).pass,true);
    assert.equal(seoAuditGate(report,false).pass,false);
    report.configSettings.skipAudits.push('document-title');
    assert.equal(seoAuditGate(report,true).pass,false);
    report.configSettings.skipAudits.pop();
    for(const {id,weight} of config.categories.seo.auditRefs){
      if(!weight||id==='is-crawlable')continue;
      const original=audits[id];
      for(const bad of [{score:0,scoreDisplayMode:'binary'},{score:.99,scoreDisplayMode:'numeric'},{score:null,scoreDisplayMode:'error'}]){
        audits[id]=bad;assert.equal(seoAuditGate(report,true).pass,false,id);
      }
      delete audits[id];assert.equal(seoAuditGate(report,true).pass,false,id);
      audits[id]=original;
    }
    assert.equal(seoAuditGate(report,true).pass,true);
  `], { stdio: "pipe", timeout: 20000 });
});
