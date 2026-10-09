import { parseTriggerDelivery } from '@neon/functions/triggers';

// Deployed only on the isolated preview branch. Neon strips spoofed trigger headers.
export default {
 async fetch(request) {
  if(request.method!=='POST')return new Response('Method not allowed',{status:405});
  const parsed=await parseTriggerDelivery(request);
  if(!parsed.ok)return new Response('Unauthorized trigger',{status:401});
  const invocation=parsed.invocation,path=new URL(request.url).pathname;
  if(invocation.type!=='schedule'||!['r2-preview-15-min','r2-preview-digest'].includes(invocation.trigger.name)||!['/sync','/digest'].includes(path))return new Response('Invalid schedule',{status:400});
  const origin=process.env.GG_PREVIEW_URL;
  if(!origin||!/^https:\/\/whoraised-leads-demo-[a-z0-9]+-.*\.vercel\.app$/.test(origin))return new Response('Preview target not configured',{status:503});
  const response=await fetch(origin+(path==='/digest'?'/api/cron/digest':'/api/cron/instantly-sync'),{
   headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`,'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET},signal:AbortSignal.timeout(100000),
  });
  const body=await response.text();
  return new Response(body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }
};
