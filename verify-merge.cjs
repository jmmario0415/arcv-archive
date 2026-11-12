const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/duel/index.html','utf8');
const context=vm.createContext({window:{},URL,Date,location:{href:'https://example.com/arcv-archive/duel/#t-test123'},sessionStorage:{setItem(k,v){this.key=k;this.value=v;}}});
vm.runInContext(html.slice(html.indexOf('function leagueRounds'),html.indexOf('function render()')),context);
vm.runInContext(html.slice(html.indexOf('function champsOf'),html.indexOf('function syncChamp')),context);
vm.runInContext(fs.readFileSync(__dirname+'/duel/archive-bridge.js','utf8'),context);
const rounds=vm.runInContext('leagueRounds(6)',context);
assert.equal(rounds.length,5);
assert.equal(new Set(rounds.flat().map(([a,b])=>[a,b].sort().join('-'))).size,15);
context.t={id:'test123',name:'오메가 8인 매치 토너먼트',mode:'ko',players:['A','B','C','D','E','F','G','H'],createdAt:Date.UTC(2026,10,13),results:{}};
assert.equal(vm.runInContext('champsOf(t).length',context),0);
for(let round=0;round<3;round++){
  const view=vm.runInContext('compute(t).view',context);
  view.rounds[round].forEach(m=>{if(!m.auto)context.t.results[m.key]=m.a;});
}
const champs=vm.runInContext('champsOf(t)',context);assert.equal(champs.length,1);
context.champs=champs;
const payload=vm.runInContext('window.DuelArchiveBridge.build(t,champs,compute(t).ranks)',context);
assert.equal(payload.winner,context.t.players[champs[0]]);assert.equal(payload.players,8);
assert.equal(payload.platform,'오메가');assert.equal(payload.format,'매치 토너먼트');
assert.equal(payload.source_url,'https://example.com/arcv-archive/duel/#t-test123');
assert.equal(payload.source_snapshot.standings.length,8);
assert.equal(Object.keys(payload.source_snapshot.results).length,7);
assert.equal(vm.runInContext('window.DuelArchiveBridge.build(t,[],[])',context),null);
assert.ok(vm.runInContext('window.DuelArchiveBridge.open(t,champs,compute(t).ranks)',context));
assert.equal(context.sessionStorage.key,'arcv:archive:test123');
assert.equal(context.location.href,'https://example.com/arcv-archive/?duel-import=test123');
assert.equal(JSON.parse(context.sessionStorage.value).source_id,'test123');
console.log('PASS: six-player round robin, original knockout/champion logic, incomplete export blocked, winner/platform/format transfer, result snapshot, relative navigation.');
