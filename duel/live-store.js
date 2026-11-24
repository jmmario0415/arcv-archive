'use strict';
// HTTPS persistence is authoritative; no public MQTT retention dependency.
window.createDuelStore = ({onState,onList,onError,champions=()=>[]}) => {
  const watchers=new Map(), fingerprints=new Map();
  let busy=false,timer=null,connected=null,stopped=false,writeEpoch=0,listSignature='';
  const store={metas:{},cache:{}};
  const state=value=>{if(connected!==value){connected=value;onState(value);}};
  async function request(path,options={}){
    const c=window.ARCHIVE_CONFIG;
    if(!c?.supabaseUrl||!c.supabaseKey)throw Error('대진표 저장소 설정이 없습니다.');
    const r=await fetch(c.supabaseUrl.replace(/\/$/,'')+'/rest/v1/'+path,{...options,headers:{apikey:c.supabaseKey,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000),cache:'no-store'});
    if(!r.ok)throw Error(r.status===404?'대진표 저장소 설정을 확인해주세요.':'대진표 서버에 저장하지 못했습니다. 연결을 확인하고 다시 시도해주세요.');
    return r.json();
  }
  function accept(row){
    if(!row?.id)return;
    if(row.deleted){delete store.metas[row.id];delete store.cache[row.id];fingerprints.delete(row.id);try{localStorage.removeItem('arcv:'+row.id);}catch{}watchers.get(row.id)?.gone();return;}
    const t={...row.meta,id:row.id,results:row.results||{}};
    store.cache[row.id]=t;
    store.metas[row.id]={...row.meta,id:row.id,champ:champions(t)};
    try{localStorage.setItem('arcv:'+row.id,JSON.stringify(t));}catch{}
    const signature=JSON.stringify(t);
    if(fingerprints.get(row.id)!==signature){fingerprints.set(row.id,signature);watchers.get(row.id)?.next(t);}
  }
  function listing(){
    const items=Object.values(store.metas).sort((a,b)=>b.createdAt-a.createdAt).slice(0,30),signature=JSON.stringify(items);
    if(signature!==listSignature){listSignature=signature;onList(items);}
  }
  async function write(id,action,payload){
    writeEpoch++;
    const row=await request('rpc/duel_live_write',{method:'POST',body:JSON.stringify({p_id:id,p_action:action,p_payload:payload})});
    writeEpoch++;
    accept(row);listing();state(true);return row;
  }
  async function readOne(id){
    const epoch=writeEpoch;
    const rows=await request('duel_live?id=eq.'+encodeURIComponent(id)+'&select=*');
    if(epoch!==writeEpoch)return;
    if(rows[0])accept(rows[0]);else{
      let copy;try{copy=JSON.parse(localStorage.getItem('arcv:'+id));}catch{}
      if(copy?.name&&Array.isArray(copy.players)&&copy.players.length>=2){
        const{results,id:ignored,...meta}=copy;
        await write(id,'recover',{meta,results:results||{}});
      }else watchers.get(id)?.gone();
    }
  }
  async function refresh(){
    if(busy||stopped)return;busy=true;
    try{
      const epoch=writeEpoch;
      const rows=await request('duel_live?deleted=eq.false&select=*&order=meta->>createdAt.desc&limit=30');
      if(epoch===writeEpoch){store.metas={};rows.forEach(accept);listing();}
      // Always check watched records separately, including deletion tombstones.
      for(const id of watchers.keys())await readOne(id);
      state(true);
    }catch(e){state(false);onError?.(e);}finally{busy=false;}
  }
  async function recover(){
    const copies=[];
    try{for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!/^arcv:[a-z0-9]{1,64}$/.test(key))continue;
      try{const t=JSON.parse(localStorage.getItem(key));if(t?.name&&Array.isArray(t.players)&&t.players.length>=2)copies.push({...t,id:key.slice(5)});}catch{}
    }}catch{}
    for(const t of copies){const{id,results,...meta}=t;try{await write(id,'recover',{meta,results:results||{}});}catch(e){onError?.(e);}}
  }
  store.connect=async()=>{
    stopped=false;
    // Recover is insert-only: server scores and deletion tombstones always win.
    try{await recover();}catch(e){onError?.(e);}
    await refresh();
    if(!stopped&&!timer)timer=setInterval(refresh,3000);
  };
  store.watch=(id,next,gone)=>{
    watchers.set(id,{next,gone});
    if(store.cache[id])queueMicrotask(()=>{if(watchers.has(id))next(store.cache[id]);});
    readOne(id).catch(e=>{state(false);onError?.(e);});
    return()=>watchers.delete(id);
  };
  store.create=(id,meta)=>write(id,'create',{meta,results:{}});
  store.setResults=(id,changes)=>write(id,'results',changes);
  store.setResult=(id,key,value)=>store.setResults(id,{[key]:value});
  store.remove=id=>write(id,'delete',{});
  store.refresh=refresh;
  store.close=()=>{stopped=true;clearInterval(timer);timer=null;};
  return store;
};
