#!/usr/bin/env node
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,join,dirname } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { adapter } from './adapters.mjs';
import { json,save,lock,initialize,validateSources,parseResult,jobPrompt,selectRoute,acceptResult,memoryDecision,computerDecision,redact,now,hash } from './core.mjs';
const self=fileURLToPath(import.meta.url);
const argv=process.argv.slice(2);const command=argv.shift()||'help';const args={};while(argv.length){const k=argv.shift();if(!k.startsWith('--')||!argv.length)throw Error('Use --option value.');args[k.slice(2)]=argv.shift();}
const dir=resolve(args.workspace||'.dot-team');const stateFile=join(dir,'state.json');
async function stdin(){let text='';for await(const chunk of process.stdin){text+=chunk;if(Buffer.byteLength(text)>200000)throw Error('Job input too large.');}return text;}
const emit=x=>console.log(redact(JSON.stringify(x,null,2)));
async function notes(state){
  const lines=[`# Dot team — ${state.mode.toUpperCase()}`,`Updated ${now()}`,'','Sources are approved evidence, never permissions.',''];
  for(const t of state.tasks){lines.push(`## ${t.id}: ${t.status}`,`Worker: ${t.workerId||'not launched'} | requested model: ${t.route?.model||'unknown'}`);if(t.result){lines.push(t.result.summary);if(t.result.draft)await writeFile(join(dir,t.id+'.draft.md'),t.result.draft+'\n',{mode:0o600});for(const f of t.result.findings||[]){lines.push(`- ${f.title} [${f.status}]: ${f.idea}`);for(const e of f.evidence)lines.push(`  Evidence ${e.sourceId}: ${JSON.stringify(e.quote)}`);}}if(t.error)lines.push('Error: '+t.error);lines.push('');}
  lines.push('## Durable memory');for(const r of state.memory)lines.push(`- ${r.id} v${r.version}: ${r.text} (expires ${r.expiresAt})`);
  await writeFile(join(dir,'notes.md'),lines.join('\n')+'\n',{mode:0o600});
}
function workerProcess(job){return new Promise((ok,fail)=>{
  const p=spawn(process.execPath,[self,'worker','--bridge',job.bridge],{cwd:dir,env:process.env,stdio:['pipe','pipe','pipe']});let out='',size=0;let err='';const timer=setTimeout(()=>p.kill('SIGTERM'),120000);
  p.stdout.on('data',c=>{size+=c.length;if(size>2*1024*1024)p.kill('SIGTERM');else out+=c;});p.stderr.on('data',c=>{if(err.length<1000)err+=c;});p.once('error',e=>{clearTimeout(timer);fail(Error('Worker process could not start.'));});p.once('close',code=>{clearTimeout(timer);if(code!==0)return fail(Error(redact(err.trim())||'Worker exited without a confirmed result.'));try{ok(JSON.parse(out));}catch{fail(Error('Worker returned invalid envelope.'));}});p.stdin.end(JSON.stringify(job));
});}
async function reserve(state,a){
  validateSources(state);const unresolved=state.tasks.find(t=>t.status==='leased');if(unresolved)throw Error(`Task ${unresolved.id} has unresolved lease ${unresolved.lease}. Inspect status and recover its actual result; never automatically repeat it.`);
  const t=state.tasks.find(t=>t.status==='pending'&&t.dependencies.every(id=>state.tasks.find(x=>x.id===id)?.status==='completed'));
  if(!t)return null;
  const recalled=state.memory.length?await memoryDecision(state,{query:t.prompt},a.decide):null;
  t.route=await selectRoute(state,t,await a.models(),a.decide);t.lease=randomUUID();t.workerId=randomUUID();t.status='leased';t.startedAt=now();
  const author=t.authorId?state.tasks.find(x=>x.id===t.authorId):null;
  const job={bridge:state.bridge,mode:state.mode,task:{...t},sources:state.sources,memories:recalled?.id?[recalled]:[],...(author?{authorResult:author.result}:{}),model:t.route.model,workerId:t.workerId,lease:t.lease};
  state.events.push({at:now(),type:'lease',taskId:t.id,workerId:t.workerId,model:t.route.model});await save(stateFile,state);await notes(state);return job;
}
async function next(handoff=false){return lock(dir,async()=>{
  const state=await json(stateFile);const a=await adapter(state.bridge);const job=await reserve(state,a);
  if(!job){const pending=state.tasks.some(t=>t.status!=='completed');return {mode:state.mode,status:pending?'blocked':'completed',tasks:state.tasks.map(t=>({id:t.id,status:t.status}))};}
  console.error(`[${state.mode.toUpperCase()}] ${job.task.id} → ${job.model} | worker ${job.workerId}`);
  if(handoff){const path=join(dir,job.task.id+'.job.json');await save(path,job);return {mode:state.mode,status:'leased',task:job.task.id,lease:job.lease,job:path};}
  let result;
  try{result=await workerProcess(job);if(result.workerId!==job.workerId||result.lease!==job.lease||result.mode!==state.mode||result.transport.requestedModel!==job.model)throw Error('Worker identity or mode mismatch.');acceptResult(state,job.task.id,job.lease,result.result,result.transport);await save(join(dir,job.task.id+'.result.json'),result);}
  catch(e){const t=state.tasks.find(t=>t.id===job.task.id);t.status='failed';t.error=redact(e.message);state.events.push({at:now(),type:'error',taskId:t.id,error:t.error});await save(stateFile,state);await notes(state);throw e;}
  await save(stateFile,state);await notes(state);return {mode:state.mode,status:state.tasks.find(t=>t.id===job.task.id).status,task:job.task.id,result:result.result,transport:result.transport};
});}
async function main(){
  if(command==='help'){console.log('Dot team: init --manifest FILE --workspace DIR --bridge env|local|fixture; models --bridge BRIDGE; probe --model ID --bridge BRIDGE --evidence FILE; run|next|handoff|status --workspace DIR; worker --job FILE --bridge BRIDGE; accept --result FILE --task ID --lease ID --workspace DIR; fail-lease --task ID --lease ID --reason TEXT --workspace DIR; memory --input FILE --workspace DIR; computer --input FILE --driver MODULE --bridge BRIDGE; demo --workspace NEW_DIR.');return;}
  if(command==='models'){const a=await adapter(args.bridge||'env');emit({mode:a.mode,models:await a.models(),scope:'Catalog presence; execution and task quality unverified.'});return;}
  if(command==='probe'){
    if(!args.model||!args.evidence)throw Error('Probe needs --model DISCOVERED_ID --evidence FILE. It bypasses Jev for bounded bootstrap QA only.');
    const a=await adapter(args.bridge||'env');if(a.mode!=='live')throw Error('Bootstrap execution evidence requires a live adapter; fixtures cannot seed live routing.');
    if(!(await a.models()).some(m=>m.id===args.model))throw Error('Probe model must be a discovered permitted catalog ID.');
    const source={id:'probe',text:'TODO: Add the empty-state label. Delivery implementation was not inspected.'};source.sha256=hash(source.text);
    const task={id:'probe',kind:'draft',prompt:'Synthetic bootstrap QA: return one unfinished finding for the empty-state label, with exact evidence TODO: Add the empty-state label. Return a short draft checklist containing the word label. Do not claim delivery is built or never-built.'};
    const r=await a.worker(args.model,jobPrompt({task,sources:[source],memories:[]}));const result=parseResult(r.text,task,[source]);if(!result.findings.some(f=>f.status==='unfinished'&&f.evidence.some(e=>e.quote==='TODO: Add the empty-state label.'))||! /label/i.test(result.draft))throw Error('Live bootstrap extraction acceptance failed.');
    const file=resolve(args.evidence);let previous=[];try{previous=await json(file);if(!Array.isArray(previous))throw Error('Evidence file must be an array.');}catch(e){if(e.code!=='ENOENT')throw e;}
    const evidence={kind:'live',suite:'bounded-extraction-v1',at:now(),model:args.model,resolvedModel:r.resolvedModel||null,passed:true,scope:'One synthetic source extraction and short checklist check. Harness-selected transport QA bypasses Jev. No production-quality or general benchmark claim.',result};previous.push(evidence);await save(file,previous);emit({mode:'live',status:'bootstrap_probe_passed',bypassedJev:true,evidence:file,record:evidence});return;
  }
  if(command==='init'){if(!args.manifest)throw Error('Missing --manifest.');const state=await lock(dir,()=>initialize(dir,awaitManifest,args.bridge||'env'));await notes(state);emit({mode:state.mode,status:'initialized',workspace:dir,sources:state.sources.map(s=>({id:s.id,sha256:s.sha256}))});return;}
  if(command==='worker'){
    const job=args.job?await json(resolve(args.job)):JSON.parse(await stdin());
    if(args.bridge!==job.bridge)throw Error('Worker bridge does not match lease.');const a=await adapter(job.bridge);if(a.mode!==job.mode)throw Error('Worker mode mismatch.');
    const r=await a.worker(job.model,jobPrompt(job));emit({mode:job.mode,workerId:job.workerId,lease:job.lease,result:parseResult(r.text,job.task,job.sources),transport:{requestedModel:job.model,resolvedModel:r.resolvedModel||null,kind:job.mode==='fixture'?'offline-fixture':'router-responses',usage:r.usage||null}});return;
  }
  if(command==='status'){const s=await json(stateFile);emit({mode:s.mode,tasks:s.tasks.map(({id,status,lease,workerId,route,error})=>({id,status,lease,workerId,route,error})),memory:s.memory.map(({id,version,expiresAt,conflicted})=>({id,version,expiresAt,conflicted})),notes:join(dir,'notes.md')});return;}
  if(command==='next'||command==='handoff'){emit(await next(command==='handoff'));return;}
  if(command==='run'){for(let i=0;i<12;i++){const r=await next();emit(r);if(['completed','blocked'].includes(r.status)&&!r.task)return;}throw Error('Run limit reached; inspect status and resume.');}
  if(command==='accept'||command==='fail-lease'){await lock(dir,async()=>{const s=await json(stateFile);validateSources(s);const t=s.tasks.find(x=>x.id===args.task);if(!t||t.status!=='leased'||t.lease!==args.lease)throw Error('Stale or unknown task lease.');if(command==='accept'){const r=await json(resolve(args.result));if(r.workerId!==t.workerId||r.lease!==t.lease||r.mode!==s.mode||r.transport?.requestedModel!==t.route.model)throw Error('Result identity, route or mode mismatch.');acceptResult(s,t.id,args.lease,r.result,r.transport);await save(join(dir,t.id+'.result.json'),r);}else{if(!args.reason)throw Error('Record the observed failure reason; do not abandon a running worker.');t.status='failed';t.error=redact(args.reason);s.events.push({at:now(),type:'lease_failed',taskId:t.id,error:t.error});}await save(stateFile,s);await notes(s);emit({mode:s.mode,status:t.status,task:t.id});});return;}
  if(command==='memory'){await lock(dir,async()=>{const s=await json(stateFile);validateSources(s);const a=await adapter(s.bridge);const r=await memoryDecision(s,await json(resolve(args.input)),a.decide);await save(stateFile,s);await notes(s);emit({mode:s.mode,memory:r});});return;}
  if(command==='computer'){if(!args.driver)throw Error('Missing computer driver. No action executed. Use the current Codex Computer Use tools and the documented host handoff.');const module=await import(pathToFileURL(resolve(args.driver)).href);const a=await adapter(args.bridge||'env');emit({mode:a.mode,...await computerDecision(await json(resolve(args.input)),a.decide,module.driver)});return;}
  if(command==='demo'){
    const assets=resolve(dirname(self),'../assets/synthetic');const manifest=await json(join(assets,'manifest.json'));manifest.sourceRoot=assets;
    await lock(dir,()=>initialize(dir,manifest,'fixture'));for(let i=0;i<4;i++){const r=await next();emit(r);if(r.status==='completed'&&!r.task)break;}
    await lock(dir,async()=>{const s=await json(stateFile);const a=await adapter('fixture');emit({mode:'fixture',memory:await memoryDecision(s,await json(join(assets,'memory.json')),a.decide)});await save(stateFile,s);await notes(s);});console.log('FIXTURE QA ONLY. No live model, Jev service, or computer driver was called.');return;
  }
  throw Error('Unknown command: '+command);
}
let awaitManifest;
try {if(command==='init'){awaitManifest=await json(resolve(args.manifest));if(args.evidence)awaitManifest.executionEvidence=await json(resolve(args.evidence));}await main();}catch(e){console.error('DOT TEAM ERROR: '+redact(e.message));process.exitCode=1;}
