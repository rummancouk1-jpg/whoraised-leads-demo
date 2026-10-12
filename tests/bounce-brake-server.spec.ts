import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as rules from '../src/lib/bounce-brake';

function harness() {
  const state = { now: Date.parse('2026-10-12T10:00:00Z'), status: 2, sent: 0, bounced: 0, calls: [] as string[], runs: [] as {at:string;data:Record<string,unknown>}[], alerts: [] as Record<string,unknown>[], locked: false, confirmationFails: false };
  const sql = async (parts: TemplateStringsArray, ...p: unknown[]) => {
    const q = parts.join('?');
    if (q.startsWith('SELECT')) {
      if (q.includes('kind=') && p[0] === 'gg-bounce-brake-alert') return state.alerts.slice(-1).map(data=>({data}));
      let rows = state.runs.slice().reverse();
      if (q.includes("data->>'ok'='true'")) rows=rows.filter(r=>r.data.ok===true);
      if (q.includes("data->>'runId'=")) rows=rows.filter(r=>r.data.trigger===p[2]&&r.data.runId===p[3]);
      if (q.includes("interval '60 seconds'")) rows=rows.filter(r=>Date.parse(r.at)>state.now-60000);
      return rows.slice(0,1);
    }
    if(q.startsWith('INSERT')) {
      const data=JSON.parse(String(p[1]));
      if(p[0]==='gg-bounce-brake-run')state.runs.push({at:new Date(state.now).toISOString(),data});
      else state.alerts.push(data);
      return [{id:state.alerts.length}];
    }
    if(q.startsWith('UPDATE')) {state.alerts[Number(p[0])-1].status=q.includes('pause-unconfirmed')?'pause-unconfirmed':'paused';return [];}
    throw Error('Unexpected SQL');
  };
  const api = async (endpoint: string) => {
    state.calls.push(endpoint);
    if(endpoint.endsWith('/pause')){state.status=2;return {};}
    if(endpoint.includes('campaigns/analytics'))return [{campaign_id:rules.GG_CAMPAIGN_ID,emails_sent_count:state.sent,bounced_count:state.bounced}];
    if(state.confirmationFails&&state.calls.some(c=>c.endsWith('/pause'))){state.confirmationFails=false;throw Error('Fixture read failed');}
    return {status:state.status};
  };
  const file=path.resolve('src/lib/server/bounce-brake.ts');
  const compiled={exports:{} as {runBounceBrake:(trigger:string,id:string)=>Promise<Record<string,unknown>>;bounceBrakeStatus:()=>Promise<rules.BounceBrakeStatus>}};
  class Clock extends Date {static now(){return state.now;}}
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const dependencies:Record<string,unknown>={'server-only':{},'@/lib/bounce-brake':rules,'./db':{database:()=>sql,initializeDatabase:async()=>{}},'./instantly':{api,records:(value:unknown)=>value,withInstantlyDeadline:(work:()=>unknown)=>work()},'./lease':{acquireLease:async()=>{if(state.locked)return null;state.locked=true;return 'owner';},releaseLease:async()=>{state.locked=false;}}};
  vm.runInNewContext('(function(require,module,exports){'+source+'})',{Date:Clock,process:{env:{VERCEL_ENV:'production',INSTANTLY_CAMPAIGN_ID:rules.GG_CAMPAIGN_ID}},console:{info:()=>{}},URLSearchParams})((id:string)=>{if(!(id in dependencies))throw Error(id);return dependencies[id];},compiled,compiled.exports);
  return {state,...compiled.exports};
}

test('frequent calls and successful run replays skip provider calls, audit writes, and freshness updates',async()=>{
 const h=harness();await h.runBounceBrake('schedule','123');const at=h.state.runs[0].at;
 h.state.calls=[];h.state.now+=1000;
 expect(await h.runBounceBrake('cron-job.org','')).toMatchObject({ok:true,ran:false});
 expect(h.state.calls).toEqual([]);expect(h.state.runs).toHaveLength(1);expect(h.state.runs[0].at).toBe(at);
 h.state.now+=900000;
 expect(await h.runBounceBrake('schedule','123')).toMatchObject({ok:true,ran:false,reason:'Run already checked.'});
 expect(h.state.calls).toEqual([]);
 expect(await h.runBounceBrake('cron-job.org','')).toMatchObject({ok:true,ran:true,campaignStatus:2});expect(h.state.runs).toHaveLength(2);
});
test('overlap returns immediately with no upstream calls',async()=>{
 const h=harness();h.state.locked=true;
 expect(await h.runBounceBrake('manual','')).toMatchObject({ok:true,ran:false});expect(h.state.calls).toEqual([]);expect(h.state.runs).toHaveLength(0);
});
test('already paused breach never repeats pause even when counters change',async()=>{
 const h=harness();h.state.sent=100;h.state.bounced=4;
 expect(await h.runBounceBrake('manual','')).toMatchObject({paused:true});
 h.state.now+=900000;h.state.bounced=5;await h.runBounceBrake('manual','');
 expect(h.state.calls.filter(c=>c.endsWith('/pause'))).toHaveLength(0);expect(h.state.alerts.at(-1)).toMatchObject({status:'paused',bounced:5});
});
test('active breach is paused once; failed confirmation retries reconcile without another pause',async()=>{
 const h=harness();h.state.status=1;h.state.sent=100;h.state.bounced=4;h.state.confirmationFails=true;
 const failure=await h.runBounceBrake('schedule','123').then(()=>null,e=>String(e));expect(failure).toContain('Fixture read failed');expect(h.state.runs[0].data.ok).toBe(false);
 expect(h.state.alerts[0].status).toBe('pause-unconfirmed');
 expect(await h.runBounceBrake('schedule','123')).toMatchObject({ok:true,paused:true,campaignStatus:2});
 expect(h.state.calls.filter(c=>c.endsWith('/pause'))).toHaveLength(1);
});
test('last successful check survives a more recent failure',async()=>{
 const h=harness();await h.runBounceBrake('manual','');const at=h.state.runs[0].at;
 h.state.now+=1900000;h.state.runs.push({at:new Date(h.state.now).toISOString(),data:{ok:false,campaign:rules.GG_CAMPAIGN_ID}});
 const status=await h.bounceBrakeStatus();expect(status.lastCheck?.ok).toBe(false);expect(status.lastSuccess?.at).toBe(at);
 expect(rules.brakeIsStale(status.lastSuccess,h.state.now)).toBe(true);
});
