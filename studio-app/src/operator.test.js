import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorClient} from './operator-client.js';
import {createOperatorController} from './operator-controller.js';
import {allowed,profileSelection} from './operator-model.js';
import {recipeFor,effectiveControlSchema,effectiveLimits} from './quick-chat-model.js';

const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function fakeClient(overrides={}){let account;return {setAccount(value){account=value;},reset(){},state:async()=>({observed_at:Date.now()/1000,operator:{account,permissions:{view:true,start:true}},nodes:[]}),catalog:async()=>({profiles:[]}),...overrides};}
test('uncertain start is retained across reload and retried only explicitly with original key and preview',async()=>{
  const storage=memory(),calls=[];let fail=true;
  const client=fakeClient({start:async(body,key)=>{calls.push({body,key});if(fail)throw Error('connection lost');return {operation:{id:'original',state:'accepted'}};}});
  const first=createOperatorController({client,storage});await first.setAccount('owner');await assert.rejects(first.start({preview_id:'p1'}));
  const saved=structuredClone(first.getState().pending);assert.ok(saved.key);await first.poll();assert.equal(calls.length,1);
  await assert.rejects(first.start({preview_id:'p2'}));assert.equal(calls.length,1);first.destroy();
  const next=createOperatorController({client,storage});await next.setAccount('owner');assert.deepEqual(next.getState().pending,saved);assert.equal(calls.length,1);
  fail=false;await next.recover();assert.deepEqual(calls[0],calls[1]);assert.equal(next.getState().pending,null);
});
test('old-account start response cannot erase its record or appear under another owner',async()=>{
  const held=deferred(),storage=memory(),client=fakeClient({start:()=>held.promise}),controller=createOperatorController({client,storage});
  await controller.setAccount('a');const call=controller.start({preview_id:'p'});await controller.setAccount('b');held.resolve({operation:{id:'a-op'}});
  await assert.rejects(call);assert.equal(controller.getState().account,'b');assert.equal(controller.getState().pending,null);assert.ok(storage.getItem('sixnine:operator:pending:a'));assert.equal(storage.getItem('sixnine:operator:pending:b'),null);
});
test('late old-account read never unlocks a newer account read or displays its nodes',async()=>{
  const a=deferred(),b=deferred();let account,reads=0;
  const client=fakeClient({setAccount(value){account=value;},state(){reads++;return account==='a'?a.promise:b.promise;}}),controller=createOperatorController({client,storage:memory()});
  const old=controller.setAccount('a'),current=controller.setAccount('b');a.resolve({operator:{account:'a'},nodes:[{id:'private-a'}]});await old;
  assert.equal(controller.getState().loading,true);await controller.refresh();assert.equal(reads,2);assert.equal(controller.getState().snapshot,null);
  b.resolve({operator:{account:'b'},nodes:[]});await current;assert.equal(controller.getState().loading,false);assert.equal(controller.getState().snapshot.operator.account,'b');
});
test('403 clears privileged stale data and cannot masquerade as empty healthy inventory',async()=>{
  let denied=false;const client=fakeClient({state:async()=>{if(denied)throw Object.assign(Error('forbidden'),{status:403});return {operator:{account:'a',permissions:{view:true}},nodes:[{id:'n'}]};}}),controller=createOperatorController({client,storage:memory()});
  await controller.setAccount('a');denied=true;await assert.rejects(controller.refresh());assert.equal(controller.getState().denied,true);assert.equal(controller.getState().snapshot,null);assert.equal(controller.getState().catalog,null);
});
test('storage failure prevents a start request and an explicit rejection releases its old intent',async()=>{
  let calls=0;const client=fakeClient({start:async()=>{calls++;throw Object.assign(Error('conflict'),{status:409});}});
  const blocked=createOperatorController({client,storage:{getItem:()=>null,setItem(){throw Error('blocked storage');}}});await blocked.setAccount('a');await assert.rejects(blocked.start({preview_id:'p'}));assert.equal(calls,0);
  const controller=createOperatorController({client,storage:memory()});await controller.setAccount('a');await assert.rejects(controller.start({preview_id:'p'}));assert.equal(calls,1);assert.equal(controller.getState().pending,null);
});
test('drain/stop bind observed node version; client uses only same-origin cookie endpoint and supplied idempotency',async()=>{
  const requests=[],client=createOperatorClient({fetcher:async(path,options)=>{requests.push({path,options});return new Response(JSON.stringify({operation:{id:'op'}}),{status:202,headers:{'Content-Type':'application/json','X-Authenticated-Account':'owner'}});}});
  client.setAccount('owner');await client.stop('node/one',{expected_version:'original-version'},'original-key');
  assert.equal(requests[0].path,'/v1/operator/capacity/nodes/node%2Fone/stop');assert.equal(requests[0].options.credentials,'same-origin');assert.equal(requests[0].options.headers['Idempotency-Key'],'original-key');assert.deepEqual(JSON.parse(requests[0].options.body),{expected_version:'original-version'});
});
test('stale, absent and unauthorized observations never enable an operator action',()=>{
  const now=Date.now(),snapshot={observed_at:now/1000,operator:{permissions:{start:true,stop:false}}};assert.equal(allowed(snapshot,'start',now),true);assert.equal(allowed(snapshot,'stop',now),false);assert.equal(allowed(snapshot,'start',now+31000),false);assert.equal(allowed(null,'start',now),false);
});
test('inventory and preview preserve explicit FL/REF mode without initiating rental',async()=>{
  const requests=[],client=createOperatorClient({fetcher:async(path,options)=>{requests.push({path,options});return new Response('{}',{headers:{'Content-Type':'application/json','X-Authenticated-Account':'owner'}});}});
  client.setAccount('owner');const selection={runtime_profile_id:'p',mode:'ref',gpu_type:'GPU exact',gpu_count:2,node_count:1,ttl_seconds:3600};await client.offers(selection);await client.preview(selection);
  const query=new URL(requests[0].path,'https://local.invalid').searchParams;assert.equal(query.get('mode'),'ref');assert.equal(query.get('gpu_count'),'2');assert.deepEqual(JSON.parse(requests[1].options.body),selection);assert.equal(requests.some(r=>r.path.endsWith('/starts')),false);
});
test('deployment profile selects only reported GPU topology, preserving price/TTL and authored node count',()=>{
  const selection={node_count:2,ttl_seconds:1800,filters:{max_price_per_gpu_hour_microusd:1500000}};
  const next=profileSelection({id:'pro-bf16',gpu_models:['PRO exact'],gpu_count_options:[2],minimum_ram_bytes:256*1024**3,minimum_disk_bytes:350*1024**3},selection);
  assert.equal(next.gpu_count,2);assert.equal(next.gpu_type,'PRO exact');assert.equal(next.filters.min_ram_gib,256);assert.equal(next.node_count,2);assert.equal(next.ttl_seconds,1800);assert.equal(next.filters.max_price_per_gpu_hour_microusd,1500000);
});
test('explicit deployment receives own control schema without legacy pool limits, old requests remain unchanged',()=>{
  const base={id:'fl',mode:'fl',controls:{steps:{type:'integer',maximum:100}},limits:{max_images:9},execution_support:{constraints:{max_steps:20,input_limits:{max_images:1}}},deployment_preset:{controls:{video_decode:'tiled'}}};
  const capabilities={recipes:[base],deployment_profiles:[{id:'bf16',model_id:'base-bf16',generation_support:{fl:{configured:false,enabled:false,controls:{steps:{type:'integer',maximum:50}},constraints:{input_limits:{max_images:2}}}}}]};
  const settings={recipe_id:'fl',deployment_profile_id:'bf16',controls:{steps:50}},selected=recipeFor(capabilities,settings);
  assert.equal(effectiveControlSchema(selected).steps.maximum,50);assert.equal(effectiveLimits(selected).max_images,2);assert.equal(selected.deployment_preset,null);assert.equal(selected.model_id,'base-bf16');assert.equal(settings.controls.steps,50);assert.equal(recipeFor(capabilities,{recipe_id:'fl'}),base);assert.equal(effectiveControlSchema(base).steps.maximum,20);
});
