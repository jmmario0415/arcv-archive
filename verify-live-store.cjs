const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync('duel/live-store.js','utf8');
const rows=new Map();let fail=false;
const clone=x=>JSON.parse(JSON.stringify(x));
async function api(url,options={}){
  if(fail)return{ok:false,status:503};
  const u=new URL(url);let body;
  if(options.method==='POST'){
    const{p_id:id,p_action:action,p_payload:p}=JSON.parse(options.body);let r=rows.get(id);
    if(action==='create'||action==='recover'){if(!r){r={id,meta:p.meta,results:p.results,deleted:false};rows.set(id,r);}}
    else if(!r||r.deleted)return{ok:false,status:400};
    else if(action==='results'){for(const[k,v]of Object.entries(p)){if(v===null)delete r.results[k];else r.results[k]=v;}}
    else if(action==='delete')r.deleted=true;
    body=r;
  }else if(u.searchParams.has('id'))body=rows.has(u.searchParams.get('id').slice(3))?[rows.get(u.searchParams.get('id').slice(3))]:[];
  else body=[...rows.values()].filter(r=>!r.deleted);
  const captured=clone(body);return{ok:true,json:async()=>captured};
}
function client(initial={}){
  const copies=new Map(Object.entries(initial)),events={lists:0,docs:[],gone:0,state:[]};
  const storage={get length(){return copies.size},key:i=>[...copies.keys()][i],getItem:k=>copies.get(k)||null,setItem:(k,v)=>copies.set(k,v),removeItem:k=>copies.delete(k)};
  const context={window:{ARCHIVE_CONFIG:{supabaseUrl:'https://example.test',supabaseKey:'public'}},fetch:api,localStorage:storage,AbortSignal,queueMicrotask,setInterval:()=>1,clearInterval,console};
  vm.createContext(context);vm.runInContext(code,context);
  const store=context.window.createDuelStore({onState:x=>events.state.push(x),onList:()=>events.lists++,onError:()=>{}});
  return{store,events,copies};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
  const a=client(),b=client();await a.store.connect();await b.store.connect();
  await a.store.create('qa1',{name:'test',mode:'league',players:['A','B','C'],createdAt:1});
  b.store.watch('qa1',t=>b.events.docs.push(t),()=>b.events.gone++);await tick();assert.equal(b.events.docs.at(-1).name,'test');
  await Promise.all([a.store.setResult('qa1','0-1',{a:0,b:1,sa:2,sb:1,format:'match'}),b.store.setResult('qa1','1-2',2)]);
  await b.store.refresh();assert.equal(b.events.docs.at(-1).results['0-1'].sa,2);assert.equal(b.events.docs.at(-1).results['1-2'],2);
  const count=b.events.docs.length,lists=b.events.lists;await b.store.refresh();assert.equal(b.events.docs.length,count);assert.equal(b.events.lists,lists,'polling must not repeatedly rebuild the entry form');
  await a.store.setResults('qa1',{'0-1':null,'b1-0':null});await b.store.refresh();assert(!('0-1' in b.events.docs.at(-1).results));
  const stale={...b.events.docs.at(-1),results:{'1-2':1}};
  const c=client({'arcv:qa1':JSON.stringify(stale)});await c.store.connect();assert.equal(rows.get('qa1').results['1-2'],2,'local copy cannot overwrite current server results');
  await a.store.remove('qa1');await b.store.refresh();assert.equal(b.events.gone,1);
  const d=client({'arcv:qa1':JSON.stringify(stale)});await d.store.connect();assert(rows.get('qa1').deleted);assert(!d.store.metas.qa1,'tombstones must prevent resurrection');
  const old={id:'old1',name:'legacy',mode:'ko',players:['A','B'],createdAt:1,results:{'b0-0':0}};
  const e=client({'arcv:old1':JSON.stringify(old)});e.store.watch('old1',t=>e.events.docs.push(t),()=>e.events.gone++);await tick();assert.equal(e.events.gone,0);assert.equal(rows.get('old1').results['b0-0'],0);
  fail=true;await assert.rejects(()=>a.store.create('bad1',old));assert(!rows.has('bad1'));await b.store.refresh();assert.equal(b.events.state.at(-1),false);fail=false;await b.store.refresh();assert.equal(b.events.state.at(-1),true);
  console.log('PASS: independent clients, durable reads, concurrent different-match writes, atomic score patches, unchanged polling, insert-only legacy recovery, deletion tombstones, failed-save handling and reconnect.');
})().catch(e=>{console.error(e);process.exit(1)});
