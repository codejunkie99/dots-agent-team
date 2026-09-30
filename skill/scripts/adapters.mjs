import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const probability = x => Number.isFinite(x) && x >= 0 && x <= 1;
export function choice(answer, keys, threshold = .65) {
  if (answer?.type !== 'choice' || !keys.includes(answer.choice) || !probability(answer.confidence)) throw Error('Malformed Jev choice.');
  const p = answer.probabilities;
  if (!p || Object.keys(p).length !== keys.length || keys.some(k => !Object.hasOwn(p,k) || !probability(p[k]))) throw Error('Malformed Jev probabilities.');
  if (Math.abs(Object.values(p).reduce((s,x)=>s+x,0)-1) > .010001 || p[answer.choice] < Math.max(...Object.values(p))-1e-8) throw Error('Inconsistent Jev choice.');
  return { ...answer, accepted: answer.choice !== 'abstain' && answer.confidence >= threshold };
}
export async function http(url, {body,headers={},timeout=60000,fetchImpl=fetch}={}) {
  let r;
  try { r=await fetchImpl(url,{method:body===undefined?'GET':'POST',redirect:'error',headers:{...headers,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeout)}); }
  catch { throw Error('Connection failed or timed out; no automatic retry.'); }
  if (!r.ok) { await r.body?.cancel(); throw Error(`Service HTTP ${r.status}; check existing access and credentials. No automatic retry.`); }
  let text=''; let size=0;const decoder=new TextDecoder();
  for await (const c of r.body) { size+=c.length; if(size>2*1024*1024) throw Error('Service response exceeded 2 MiB.'); text+=decoder.decode(c,{stream:true}); }
  return text+decoder.decode();
}
export function completedResponse(raw) {
  let result;
  if(raw.trim().startsWith('{')) { try { result=JSON.parse(raw); } catch { throw Error('Invalid Responses JSON.'); } }
  else for(const frame of raw.split(/\r?\n\r?\n/)) {
    const data=frame.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n');
    if(!data || data==='[DONE]') continue;
    let event; try{event=JSON.parse(data);}catch{throw Error('Invalid Responses SSE.');}
    if(['error','response.failed','response.incomplete'].includes(event.type)) throw Error('Router response failed or incomplete.');
    if(event.type==='response.completed') result=event.response;
  }
  if(result?.status!=='completed') throw Error('Router did not confirm completion.');
  if((result.output||[]).some(x=>x.type==='function_call')) throw Error('Unexpected tool call; text workers have no tools.');
  const text=(result.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
  if(!text.trim()) throw Error('Empty worker response.');
  return {text,resolvedModel:result.model||null,usage:result.usage||null};
}
export async function environmentAdapter() {
  const port=Number(process.env.CODEX_ROUTER_PORT||4202);
  if(!Number.isInteger(port)||port<1||port>65535) throw Error('Invalid CODEX_ROUTER_PORT.');
  const key=process.env.CODEX_ROUTER_CALLER_KEY?.trim();
  // Never read credential files. The owner supplies an existing credential through the process environment.
  const base=`http://127.0.0.1:${port}/v1`;
  const auth=()=>{if(!key) throw Error('Missing CODEX_ROUTER_CALLER_KEY. Supply existing Router caller access privately, or use --bridge local with installed authenticated adapters.');return {Authorization:`Bearer ${key}`};};
  return {
    mode:'live',
    async models(){const p=JSON.parse(await http(`${base}/models`,{headers:auth()}));return (p.data||[]).map(m=>({id:m.id,provider:m.owned_by||'unknown',description:'Catalog entry; task quality unknown.'}));},
    async decide(state,questions){const typesafe=process.env.TYPESAFE_API_KEY?.trim();if(!typesafe)throw Error('Missing TYPESAFE_API_KEY. Supply it privately in the process environment; the skill does not configure credentials.');const r=JSON.parse(await http('https://api.typesafe.ai/v1/systemone',{body:{model:process.env.JEV_MODEL||'jev-latest',state,questions},headers:{Authorization:`Bearer ${typesafe}`},timeout:25000}));if(!/jev/i.test(r.model||''))throw Error('Response did not identify Jev.');return r;},
    async worker(model,prompt){return completedResponse(await http(`${base}/responses`,{headers:{...auth(),'x-codex-router-exact-route':'1'},body:{model,input:[{role:'user',content:[{type:'input_text',text:prompt}]}],stream:true,store:false,max_output_tokens:3000}}));}
  };
}
export async function localAdapter() {
  // Use installed adapters as opaque authenticated capabilities, never extract their keys.
  const root=process.env.CODEX_ROUTER_CHECKOUT||join(homedir(),'.local/share/codex-router');
  const runtime=process.env.JEV_RUNTIME_ROOT||join(homedir(),'.codex/skills/jev-native-agents/scripts/runtime/src');
  let registry,jev,worker,status;
  try {
    [{MODELS:registry},{askJev:jev},{callModel:worker},{chatGptSessionStatus:status}]=await Promise.all([
      import(pathToFileURL(join(root,'src/model-registry.mjs')).href),
      import(pathToFileURL(join(runtime,'jev.mjs')).href),
      import(pathToFileURL(join(runtime,'worker.mjs')).href),
      import(pathToFileURL(join(root,'src/chatgpt-session-control.mjs')).href)
    ]);
  } catch { throw Error('Installed authenticated adapters unavailable. Install Model Router and jev-native-agents, or use the portable environment adapter.'); }
  return {mode:'live',
    async models(){
      const state=process.env.CODEX_ROUTER_STATE||join(homedir(),'.codex/codex-router');
      const [published,enabled,session]=await Promise.all([readFile(join(state,'merged-models.json'),'utf8').then(JSON.parse),readFile(join(state,'enabled-providers.json'),'utf8').then(JSON.parse),status()]);
      const map=new Map(registry.map(m=>[m.slug,m]));const active=new Set(enabled.providers||[]);
      return (published.models||[]).filter(x=>x.visibility==='list').map(x=>({id:x.slug,provider:map.get(x.slug)?.provider||'native-openai',description:String(map.get(x.slug)?.description||'Catalog entry; task quality unknown.').slice(0,500)})).filter(x=>! /openrouter|jev|latest|\/auto|:batch/.test(x.id+' '+x.provider)).filter(x=>x.provider==='native-openai'?session.sharing==='enabled'&&session.session==='usable':active.has(x.provider)||active.has(x.provider.replace(/-(responses|messages)$/,'')));
    },
    async decide(state,questions){return jev(state,questions);},
    async worker(model,prompt){const r=await worker({id:model,adapter:'codex-router'},{prompt,maxTokens:3000,timeout:90000});if(r.message.tool_calls?.length)throw Error('Unexpected worker tool call.');return {text:r.message.content,resolvedModel:r.resolvedModel||null,usage:r.usage};}
  };
}
export function fixtureAdapter() {
  return {mode:'fixture',
    async models(){return [{id:'fixture/analyst',provider:'offline-fixture',description:'Deterministic QA analysis fixture; not a live model.'},{id:'fixture/reviewer',provider:'offline-fixture',description:'Deterministic QA verification fixture; not a live model.'}];},
    async decide(state,questions){const answers={};for(const [id,q] of Object.entries(questions)){const keys=Object.keys(q.criteria);const chosen=keys.find(k=>k===state.fixtureChoice)||keys.find(k=>k.startsWith(state.task?.kind==='verify'?'m1':'m0'))||keys.find(k=>k!=='abstain');answers[id]={type:'choice',choice:chosen,confidence:.95,probabilities:Object.fromEntries(keys.map(k=>[k,k===chosen?1:0]))};}return {model:'fixture/decision',answers};},
    async worker(model,prompt){const job=JSON.parse(prompt.slice(prompt.indexOf('\nJOB_JSON\n')+10));if(job.task.kind==='verify')return {text:JSON.stringify({passed:true,summary:'Fixture reviewer checked selected evidence; no live inference.',issues:[]}),resolvedModel:model};const findings=job.sources.filter(s=>/TODO:/.test(s.text)).map(s=>{const line=s.text.split('\n').find(x=>x.startsWith('TODO:'));return {title:line.slice(5).trim(),status:'unfinished',idea:'Finish the explicitly documented task, then run its acceptance check.',evidence:[{sourceId:s.id,quote:line}]};});findings.push({title:'Notification delivery status',status:'unknown',idea:'Request a selected implementation or test record before claiming completion.',evidence:[{sourceId:job.sources[0].id,quote:job.sources[0].text.split('\n')[0]}]});return {text:JSON.stringify({summary:'Synthetic fixture findings only.',findings}),resolvedModel:model};}
  };
}
export async function adapter(name) {if(name==='fixture')return fixtureAdapter();if(name==='local')return localAdapter();if(name==='env')return environmentAdapter();throw Error('Unsupported bridge. Use env, local, or fixture.');}
