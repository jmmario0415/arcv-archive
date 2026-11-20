'use strict';
const directory=window.ArcVDirectory,up=window.ArchiveUploads;
const el=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const memberForm=el('#member-form');let editing=null;
up.bind(memberForm);
function renderMembers(){
  const list=directory.suggestions(el('#member-search').value).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  el('#member-count').textContent=directory.list().length+'명';
  el('#member-list').innerHTML=list.map(m=>`<article class="member-row"><div class="member-avatar">${m.thumbnail?`<img src="${escape(m.thumbnail)}" alt="${escape(m.name)} 썸네일" loading="lazy">`:`<span>${escape(m.name.slice(0,1))}</span>`}</div><strong>${escape(m.name)}</strong><button type="button" data-member="${escape(m.id||'')}" ${!directory.ready||!m.id?'disabled':''}>사진 수정</button></article>`).join('')||'<p class="muted">일치하는 멤버가 없습니다.</p>';
}
function resetMember(){
  editing=null;memberForm.reset();up.busy(memberForm,false);memberForm.elements.name.readOnly=false;
  el('#member-save').disabled=!directory.ready;el('#member-save').textContent='멤버 등록';el('#member-form-title').textContent='멤버 추가';el('#member-cancel').hidden=true;up.refresh(memberForm);
}
el('#member-search').addEventListener('input',renderMembers);
el('#member-cancel').addEventListener('click',()=>{resetMember();el('#member-status').textContent='';});
el('#member-list').addEventListener('click',e=>{
  const b=e.target.closest('[data-member]');if(!b)return;
  const member=directory.list().find(m=>m.id===b.dataset.member);if(!member)return;
  resetMember();editing=member;memberForm.elements.name.value=member.name;memberForm.elements.name.readOnly=true;memberForm.elements.thumbnail.value=member.thumbnail||'';
  up.refresh(memberForm);el('#member-form-title').textContent=member.name+' · 사진 수정';el('#member-save').textContent='사진 저장';el('#member-cancel').hidden=false;el('#member-status').textContent='새 사진을 선택해주세요.';el('#member-status').className='';memberForm.scrollIntoView({behavior:'smooth',block:'start'});
});
memberForm.addEventListener('submit',async e=>{
  e.preventDefault();if(!directory.ready)return;
  const values=up.values(memberForm),status=el('#member-status');
  if(!editing&&directory.find(values.name)){status.className='error';status.textContent='이미 등록된 이름입니다. 목록에서 사진 수정을 선택해주세요.';return;}
  if(editing&&!up.hasFiles(memberForm)){status.className='error';status.textContent='새 사진을 선택해주세요.';return;}
  up.busy(memberForm,true);status.className='';status.textContent='저장 중…';
  try{
    await up.apply(memberForm,values,status);
    if(editing)await directory.photo(editing,values.thumbnail);else await directory.save(values.name,values.thumbnail||'');
    const message=editing?'멤버 사진이 수정되었습니다.':'멤버가 등록되었습니다.';
    resetMember();renderMembers();status.className='success';status.textContent=message;
  }catch(error){up.busy(memberForm,false);status.className='error';status.textContent=error.message+' 입력 내용은 유지했습니다.';}
});
renderMembers();
directory.load().then(()=>{resetMember();renderMembers();el('#member-load-status').textContent='최신 멤버 목록입니다.';}).catch(()=>{el('#member-load-status').textContent='저장소에 연결하지 못해 기본 8명을 표시합니다. 새로고침 후 다시 시도해주세요.';});
