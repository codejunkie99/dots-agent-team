// Independent black-box CLI consumer: no imports from runtime internals or private Mac configuration.
import {mkdtemp,cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=await mkdtemp(join(tmpdir(),'dots-forward-'));const packageRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');const install=join(root,'project','.agents','skills','dots-agent-team');
await cp(packageRoot,install,{recursive:true});await cp(join(install,'assets','synthetic'),join(root,'sources'),{recursive:true});await mkdir(join(root,'empty-home'));
const env={PATH:process.env.PATH,HOME:join(root,'empty-home'),TMPDIR:tmpdir()};const cli=join(install,'scripts','team.mjs');const workspace=join(root,'work');
const run=(...args)=>execFileSync(process.execPath,[cli,...args],{cwd:root,env,encoding:'utf8',stdio:['pipe','pipe','pipe']});
const manifest=JSON.parse(await readFile(join(root,'sources','manifest.json'),'utf8'));manifest.sourceRoot='sources';await writeFile(join(root,'manifest.json'),JSON.stringify(manifest));
assert.match(run('models','--bridge','fixture'),/offline-fixture/);
const missing=spawnSync(process.execPath,[cli,'models','--bridge','env'],{cwd:root,env,encoding:'utf8'});assert.equal(missing.status,1);assert.match(missing.stderr,/Missing CODEX_ROUTER_CALLER_KEY/);assert.ok(!missing.stderr.includes('/Users/'));
run('init','--manifest','manifest.json','--workspace',workspace,'--bridge','fixture');
const handoff=JSON.parse(run('handoff','--workspace',workspace));assert.equal(handoff.status,'leased');
// New CLI invocation resumes the same on-disk job, rather than rerouting/replaying the lease.
const blocked=spawnSync(process.execPath,[cli,'run','--workspace',workspace],{cwd:root,env,encoding:'utf8'});assert.equal(blocked.status,1);assert.match(blocked.stderr,/unresolved lease/);
const result=run('worker','--job',handoff.job,'--bridge','fixture');const envelope=JSON.parse(result);assert.equal(envelope.mode,'fixture');await writeFile(join(root,'result.json'),result);
run('accept','--workspace',workspace,'--task',handoff.task,'--lease',handoff.lease,'--result',join(root,'result.json'));
run('run','--workspace',workspace);
let state=JSON.parse(await readFile(join(workspace,'state.json'),'utf8'));assert.ok(state.tasks.every(t=>t.status==='completed'));assert.notEqual(state.tasks[0].workerId,state.tasks[1].workerId);assert.notEqual(state.tasks[0].route.model,state.tasks[1].route.model);
run('memory','--workspace',workspace,'--input',join(root,'sources','memory.json'));state=JSON.parse(await readFile(join(workspace,'state.json'),'utf8'));assert.equal(state.memory[0].version,1);assert.match(await readFile(join(workspace,'notes.md'),'utf8'),/FIXTURE/);
const noDriver=spawnSync(process.execPath,[cli,'computer','--input',join(root,'sources','memory.json'),'--bridge','fixture'],{cwd:root,env,encoding:'utf8'});assert.equal(noDriver.status,1);assert.match(noDriver.stderr,/Missing computer driver.*No action executed/);
const bad=spawnSync(process.execPath,[cli,'accept','--workspace',workspace,'--task',handoff.task,'--lease',handoff.lease,'--result',join(root,'result.json')],{cwd:root,env,encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/Stale/);
console.log(JSON.stringify({status:'passed',mode:'offline-forward-test',checks:11,workspace:root,scope:'Fresh project-local install, empty HOME, missing-auth messages, model discovery, handoff/resume, independent process and model verification, memory, missing driver, stale replay rejection. No live service called.'},null,2));
