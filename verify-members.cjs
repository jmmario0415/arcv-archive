const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let mode='load',calls=0,failLoad=false;
const sample=[{id:'member-a',name:'성훈',thumbnail:'https://example.com/a.png'},{id:'member-b',name:'연우',thumbnail:'https://example.com/b.png'}];
const context=vm.createContext({window:{ARCHIVE_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseKey:'public-key'}},document:{currentScript:{src:'https://example.com/arcv-archive/members-store.js'}},URL,AbortSignal,location:{origin:'https://example.com'},fetch:async(url,options)=>{
 calls++;
 if(failLoad)throw new Error('offline');
 if(mode==='conflict')return {ok:false,status:409};
 if(url.includes('rpc/update_member_photo')){
  const body=JSON.parse(options.body);assert.equal(body.p_id,'member-a');assert.equal(body.p_expected,'https://example.com/a.png');
  return {ok:true,text:async()=>JSON.stringify({...sample[0],thumbnail:body.p_thumbnail})};
 }
 if(options.method==='POST'){const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body).sort(),['name','thumbnail']);return {ok:true,text:async()=>JSON.stringify([{id:'new-member',...body}])};}
 return {ok:true,text:async()=>JSON.stringify(sample)};
}});
vm.runInContext(fs.readFileSync(__dirname+'/members-store.js','utf8'),context);
(async()=>{
 const directory=context.window.ArcVDirectory;
 assert.equal(directory.list().length,8);assert.equal(directory.ready,false);
 assert.equal(directory.normalize('  Seong Hun '),'seonghun');
 assert.equal(directory.safeUrl('javascript:alert(1)'),'');
 await directory.load();assert.equal(directory.ready,true);assert.equal(directory.list().length,2);
 assert.equal(directory.find(' 성 훈 ').id,'member-a');assert.equal(directory.suggestions('성').length,1);
 const before=calls;await assert.rejects(directory.save('성 훈',''),/이미 등록/);assert.equal(calls,before);
 await directory.save('새 멤버','https://example.com/new.png');assert.equal(directory.find('새멤버').id,'new-member');
 await directory.photo(sample[0],'https://example.com/changed.png');assert.equal(directory.find('성훈').thumbnail,'https://example.com/changed.png');
 mode='conflict';await assert.rejects(directory.save('다른 이름',''),/이미 등록/);
 failLoad=true;await assert.rejects(directory.load());assert.equal(directory.ready,false);assert.ok(directory.find('성훈'));
 const html=fs.readFileSync(__dirname+'/duel/index.html','utf8');
 new vm.Script(html.slice(html.indexOf('const COLORS='),html.lastIndexOf('</script>')));
 assert.match(html,/ArcVDirectory\.attach\(v\)/);assert.match(html,/avMemo\[key\]/);
 console.log('PASS: initial avatars, DB load, normalization, suggestions, duplicate prevention, add member, change photo, failed-load state, original maker script syntax.');
})().catch(e=>{console.error(e);process.exitCode=1;});
