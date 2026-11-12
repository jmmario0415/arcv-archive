// 실행: node verify.cjs — DOM 모형과 모의 API로 확인. 실제 DB 검증은 별도입니다.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id,{value:'',innerHTML:'',textContent:'',className:'',disabled:false,events:{},addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;}});
  return elements.get(id);
}
const calls=[];
const context = vm.createContext({window:{ARCHIVE_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseKey:'sb_publishable_test'}},document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},URL,AbortSignal,FormData:class {constructor(form){return Object.entries(form.values);}},fetch:async(url,options)=>{calls.push({url,options});return {ok:true,status:options.method==='POST'?201:200,text:async()=>options.method==='POST'?'':'[]'};}});
vm.runInContext(fs.readFileSync(__dirname+'/data.js','utf8'),context);
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),context);
(async()=>{
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal((element('#records').innerHTML.match(/<article/g)||[]).length,4);
  assert.match(element('#records').innerHTML,/준민/);
  assert.equal(vm.runInContext("thumbnailMarkup({thumbnail:'javascript:alert(1)',deck:'test'}).includes('<img')",context),false);
  assert.match(vm.runInContext("thumbnailMarkup({thumbnail:'https://example.com/card.png',deck:'test'})",context),/card.png/);
  element('#search').value='성훈';vm.runInContext('render()',context);
  assert.equal((element('#records').innerHTML.match(/<article/g)||[]).length,1);
  assert.match(element('#records').innerHTML,/아르토메기아/);
  vm.runInContext("platform='오메가';render()",context);
  assert.match(element('#records').innerHTML,/조건에 맞는 기록이 없습니다/);
  assert.equal(vm.runInContext("safeUrl('javascript:alert(1)')",context),'');
  assert.equal(vm.runInContext("escapeHtml('<script>')",context),'&lt;script&gt;');
  const form=element('#submit-form');
  form.values={edition:'5',date:'2026-11-12',platform:'마듀',players:'6',format:'단판 리그',winner:'테스트',deck:'테스트 덱',image:'',link:'',decklist:'카드 × 3',notes:'',thumbnail:'https://example.com/card.png'};
  form.reset=()=>{form.wasReset=true;};
  await form.events.submit({preventDefault(){},target:form});
  assert.match(element('#submit-status').textContent,/기록이 저장되었습니다/);
  const sent=JSON.parse(calls.find(c=>c.options.method==='POST').options.body);
  assert.equal(sent.edition,5);assert.equal(sent.players,6);assert.equal('approved' in sent,false);assert.equal(sent.thumbnail,'https://example.com/card.png');
  assert.ok(form.wasReset);
  context.fetch=async()=>{throw new Error('network unavailable');};
  form.wasReset=false;
  await form.events.submit({preventDefault(){},target:form});
  assert.equal(form.wasReset,false);assert.match(element('#submit-status').textContent,/저장 완료를 확인하지 못했습니다/);
  console.log('PASS: 4 records, deck thumbnails, search, combined filters, URL/HTML safety, empty 201 save response, pending submission, failed-save preservation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
