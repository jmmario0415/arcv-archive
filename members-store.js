'use strict';
window.ArcVDirectory = (()=>{
  const base=new URL('./',document.currentScript.src);
  const initial=[['영진','yeongjin'],['성훈','seonghun'],['준민','junmin'],['현서','hyunseo'],['규현','gyuhyun'],['인우','inwoo'],['석진','seokjin'],['연우','yeonwoo']].map(([name,file])=>({name,thumbnail:new URL(`duel/img/${file}.jpg`,base).href}));
  const normalize=s=>String(s??'').toLowerCase().replace(/\s+/g,'');
  const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'||u.origin===location.origin?u.href:'';}catch{return '';}};
  let entries=[...initial],ready=false;
  async function request(path,options={}){
    const c=window.ARCHIVE_CONFIG;
    if(!c?.supabaseUrl||!c.supabaseKey)throw new Error('멤버 저장소가 연결되지 않았습니다.');
    const r=await fetch(c.supabaseUrl.replace(/\/$/,'')+'/rest/v1/'+path,{...options,headers:{apikey:c.supabaseKey,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});
    if(!r.ok){const e=new Error(r.status===409?'이미 등록된 이름입니다. 해당 멤버의 사진 수정을 이용해주세요.':'저장소에 연결하지 못했습니다. 새로고침 후 다시 시도해주세요.');e.status=r.status;throw e;}
    const body=await r.text();return body?JSON.parse(body):null;
  }
  async function load(){
    try{const rows=await request('club_members?select=id,name,thumbnail,updated_at&order=name.asc');
      if(!Array.isArray(rows))throw new Error('Invalid members');
      entries=rows.filter(m=>typeof m.name==='string').map(m=>({...m,thumbnail:safeUrl(m.thumbnail)}));ready=true;
    }catch(error){ready=false;throw error;}
    return entries;
  }
  const list=()=>[...entries];
  const find=name=>entries.find(m=>normalize(m.name)===normalize(name));
  function suggestions(query){const key=normalize(query);return entries.filter(m=>normalize(m.name).includes(key));}
  function datalist(){
    let dl=document.getElementById('arcv-member-options');
    if(!dl){dl=document.createElement('datalist');dl.id='arcv-member-options';document.body.append(dl);}
    dl.replaceChildren();entries.forEach(m=>{const option=document.createElement('option');option.value=m.name;dl.append(option);});
  }
  function attach(scope){
    datalist();
    scope.querySelectorAll('.names input,#member-insert').forEach(input=>{
      input.setAttribute('list','arcv-member-options');input.setAttribute('autocomplete','off');
      const preview=()=>{
        const member=find(input.value),row=input.closest('.nm');if(!row)return;
        let img=row.querySelector('.member-input-photo');
        if(!img){img=document.createElement('img');img.className='member-input-photo';img.alt='';img.addEventListener('error',()=>{img.hidden=true;row.classList.remove('has-member-photo');});row.insertBefore(img,input);}
        img.hidden=!member?.thumbnail;row.classList.toggle('has-member-photo',Boolean(member?.thumbnail));if(member?.thumbnail)img.src=member.thumbnail;
      };
      if(!input.dataset.directoryBound){input.addEventListener('input',preview);input.dataset.directoryBound='true';}
      preview();
    });
    const button=scope.querySelector('#insert-member-name');
    if(button)button.onclick=()=>{
      const input=scope.querySelector('#member-insert'),area=scope.querySelector('#ctext');
      const member=find(input.value);if(!member||!area)return;
      area.setRangeText(member.name,area.selectionStart,area.selectionEnd,'end');area.dispatchEvent(new Event('input',{bubbles:true}));area.focus();
    };
  }
  async function save(name,thumbnail){
    name=name.trim();if(!name||name.length>12)throw new Error('이름은 1~12자로 입력해주세요.');
    if(find(name))throw new Error('이미 등록된 이름입니다. 해당 멤버의 사진 수정을 이용해주세요.');
    const rows=await request('club_members',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name,thumbnail})});
    if(!rows?.[0]?.id)throw new Error('등록 결과를 확인하지 못했습니다. 새로고침해주세요.');
    entries.push(rows[0]);return rows[0];
  }
  async function photo(member,thumbnail){
    const saved=await request('rpc/update_member_photo',{method:'POST',body:JSON.stringify({p_id:member.id,p_thumbnail:thumbnail,p_expected:member.thumbnail})});
    if(!saved?.id)throw new Error('수정 결과를 확인하지 못했습니다. 새로고침해주세요.');
    entries=entries.map(m=>m.id===saved.id?saved:m);return saved;
  }
  return {normalize,safeUrl,list,find,suggestions,load,attach,save,photo,get ready(){return ready;}};
})();
