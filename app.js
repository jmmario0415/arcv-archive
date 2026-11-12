'use strict';
const $ = (s) => document.querySelector(s);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
const config = window.ARCHIVE_CONFIG || {};
const connected = Boolean(safeUrl(config.supabaseUrl) && config.supabaseKey);
let records = [...window.ARCHIVE_RECORDS];
let platform = '전체';
const dateText = d => d.replaceAll('-', '.');
const hasDeck = r => Boolean(r.decklist || safeUrl(r.image) || safeUrl(r.link));
function thumbnailMarkup(r) {
  const url = safeUrl(r.thumbnail);
  return `<div class="deck-thumbnail">${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(r.deck)} 대표 이미지" loading="lazy" referrerpolicy="no-referrer">` : ''}<span class="thumbnail-fallback" ${url?'hidden':''}><b>V</b><small>썸네일 미등록</small></span></div>`;
}
// 외부 이미지 주소가 잘못되거나 삭제된 경우 빈 이미지 대신 기본 표시를 사용합니다.
document.addEventListener('error', e=>{
  if(e.target.matches?.('.deck-thumbnail img')){
    e.target.hidden=true;
    e.target.nextElementSibling.hidden=false;
  }
},true);
const uploads=window.ArchiveUploads;
['#submit-form','#media-form'].forEach(id=>uploads.bind($(id)));
function render() {
  records.sort((a,b) => b.date.localeCompare(a.date) || b.edition-a.edition);
  const q = $('#search').value.trim().toLocaleLowerCase();
  const filtered = records.filter(r => (platform === '전체' || platform === r.platform) && `${r.winner} ${r.deck} ${r.edition}회 ${r.format} ${r.platform} ${r.date}`.toLocaleLowerCase().includes(q));
  $('#record-count').textContent = String(filtered.length).padStart(2,'0');
  $('#records').innerHTML = filtered.map(r => `<article class="record"><div class="record-head"><span class="edition">${r.edition}회</span><time datetime="${r.date}">${dateText(r.date)}</time></div><div class="record-summary">${thumbnailMarkup(r)}<div class="record-info"><h3><span class="winner-label">우승</span>${escapeHtml(r.winner)}</h3><p class="deck">${escapeHtml(r.deck)}</p></div></div><p><span class="badge ${r.platform==='오메가'?'omega':''}">${escapeHtml(r.platform)}</span><span class="badge">${r.players}인 · ${escapeHtml(r.format)}</span></p><div class="record-foot"><span>${hasDeck(r)?'덱리 등록됨':'덱리 미등록'}</span><div class="record-actions"><button data-basic="${r.edition}" aria-label="제 ${r.edition}회 기본 정보 수정">기본 정보 수정</button><button data-media="${r.edition}" aria-label="제 ${r.edition}회 썸네일·덱리 등록">썸네일·덱리 등록</button><button data-detail="${r.edition}" aria-label="제 ${r.edition}회 대회 상세 보기">상세 보기 ↗</button></div></div></article>`).join('') || '<p class="empty">조건에 맞는 기록이 없습니다.</p>';

}
function showDetail(edition) {
  const r = records.find(r=>r.edition===Number(edition));
  if (!r) return;
  const image = safeUrl(r.image), link = safeUrl(r.link);
  $('#detail-content').innerHTML = `<p class="eyebrow">${r.edition}회</p><h2>제 ${r.edition}회 · ${escapeHtml(r.winner)} 우승</h2><p class="detail-meta">${dateText(r.date)} · ${escapeHtml(r.platform)}<br>${r.players}인 · ${escapeHtml(r.format)}</p>${sourceMarkup(r)}<button class="edit-media" data-basic="${r.edition}">기본 정보 수정</button> <button class="edit-media" data-media="${r.edition}">썸네일·덱리 등록</button><div class="detail-deck"><p class="eyebrow">WINNING DECK</p><div class="detail-summary">${thumbnailMarkup(r)}<h3>${escapeHtml(r.deck)}</h3></div>${hasDeck(r)?'':'<p class="muted">아직 덱리가 등록되지 않았습니다.</p>'}${image?`<a href="${escapeHtml(image)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(image)}" alt="${escapeHtml(r.winner)}의 ${escapeHtml(r.deck)} 덱리" loading="lazy" referrerpolicy="no-referrer"></a>`:''}${link?`<p><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">덱리 / 영상 링크 열기 ↗</a></p>`:''}${r.decklist?`<pre>${escapeHtml(r.decklist)}</pre>`:''}${r.notes?`<h3>대회 메모</h3><pre>${escapeHtml(r.notes)}</pre>`:''}</div>`;
  $('#detail').showModal();
}
document.addEventListener('click', e => { const b=e.target.closest('[data-detail]');if(b)showDetail(b.dataset.detail);const m=e.target.closest('[data-media]');if(m)openMedia(m.dataset.media);const basic=e.target.closest('[data-basic]');if(basic)openBasic(basic.dataset.basic); });
document.querySelectorAll('.close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.querySelectorAll('[data-platform]').forEach(b=>b.addEventListener('click',()=>{platform=b.dataset.platform;document.querySelectorAll('[data-platform]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));});render();}));
$('#search').addEventListener('input',render);
function openSubmit() {
  const f=$('#submit-form');
  if(!f.elements.edition.value)f.elements.edition.value=Math.max(0,...records.map(r=>r.edition))+1;
  $('#submit-status').textContent=connected?'':'데이터베이스 연결 전입니다. 입력 화면은 확인할 수 있지만 아직 서버에 저장할 수 없습니다.';
  $('#submit-status').className=connected?'':'error';
  $('#save-button').disabled=!connected;
  uploads.refresh(f);
  $('#submit-dialog').showModal();
}
$('#open-submit').addEventListener('click',openSubmit);

async function api(path, options={}) {
  const response = await fetch(`${config.supabaseUrl.replace(/\/$/,'')}/rest/v1/${path}`,{...options,headers:{apikey:config.supabaseKey,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`저장소 응답 오류 (${response.status})`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
$('#submit-form').addEventListener('submit', async e=>{
  e.preventDefault();if(!connected)return;
  const f=e.target, values=uploads.values(f);
  for(const k of Object.keys(values))values[k]=values[k].trim();
  values.edition=Number(values.edition);values.players=Number(values.players);
  const status=$('#submit-status');
  if(!values.source_id){delete values.source_id;delete values.source_url;delete values.source_snapshot;}
  else {
    try {values.source_snapshot=JSON.parse(values.source_snapshot);}catch{status.className='error';status.textContent='대회 정보를 다시 가져와주세요.';return;}
    if(records.some(r=>r.source_id===values.source_id)){status.className='error';status.textContent='이미 기록실에 등록된 대회입니다.';return;}
  }
  if(!values.winner||!values.deck){status.textContent='우승자와 덱 이름을 입력해주세요.';status.className='error';return;}
  if(['thumbnail','image','link'].some(k=>values[k]&&!safeUrl(values[k]))){status.textContent='이미지와 링크에는 https:// 주소를 입력해주세요.';status.className='error';return;}
  uploads.busy(f,true);status.className='';status.textContent='기록을 저장하고 있습니다…';
  try {
    await uploads.apply(f,values,status);
    status.textContent='대회 기록을 저장하고 있습니다…';
    // return=minimal: 제출자는 미승인 데이터의 조회 권한이 없습니다.
    const inserted=await api('tournaments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(values)});
    if(Array.isArray(inserted)&&inserted[0])Object.assign(values,inserted[0]);
    records=[...records.filter(r=>r.edition!==values.edition),values];render();status.className='success';status.textContent='기록이 등록되었습니다.';f.reset();uploads.refresh(f);$('#import-info').hidden=true;
  } catch(error) {status.className='error';status.textContent=(error.message||'')+' 저장 완료를 확인하지 못했습니다. 입력 내용은 유지했습니다. 연결 상태를 확인하거나 운영자에게 문의해주세요. 중복 제출 전 저장 여부를 확인해주세요.';}
  finally {uploads.busy(f,false);}
});
function openMedia(edition) {
  const record=records.find(r=>r.edition===Number(edition));if(!record)return;
  const form=$('#media-form');
  uploads.busy(form,false);form.reset();
  form.elements.edition.value=record.edition;
  for(const name of ['thumbnail','image','link','decklist'])form.elements[name].value=record[name]||'';
  $('#media-record').textContent=`제 ${record.edition}회 · ${record.winner} · ${record.deck}`;
  $('#media-status').textContent=connected?'':'저장소 연결 전입니다. 연결 완료 후 등록할 수 있습니다.';
  $('#media-status').className=connected?'':'error';$('#media-save').disabled=!connected;
  uploads.refresh(form);
  if($('#detail').open)$('#detail').close();
  $('#media-dialog').showModal();
}
$('#media-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!connected)return;
  const form=e.target,status=$('#media-status');
  const values=uploads.values(form);
  for(const k of Object.keys(values))values[k]=values[k].trim();
  values.edition=Number(values.edition);
  if(!records.some(r=>r.edition===values.edition)){status.className='error';status.textContent='대회 기록을 다시 선택해주세요.';return;}
  if(['thumbnail','image','link'].some(k=>values[k]&&!safeUrl(values[k]))){status.className='error';status.textContent='이미지와 링크에는 HTTPS 주소를 입력해주세요.';return;}
  const record=records.find(r=>r.edition===values.edition);
  if(!uploads.hasFiles(form)&&['thumbnail','image','link','decklist'].every(k=>values[k]===(record[k]||''))){status.className='error';status.textContent='변경할 썸네일 또는 덱리 내용을 입력해주세요.';return;}
  uploads.busy(form,true);status.className='';status.textContent='등록 내용을 저장하고 있습니다…';
  try{
    await uploads.apply(form,values,status);
    status.textContent='등록 내용을 저장하고 있습니다…';
    await api('tournament_media',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(values)});
    records=records.map(r=>r.edition===values.edition?{...r,...values}:r);render();status.className='success';status.textContent='사진과 덱리가 등록되었습니다.';$('#media-save').disabled=true;
    // 성공 후 중복 제출을 막습니다. 창을 닫고 다시 열면 새 요청을 작성할 수 있습니다.
  }catch(error){status.className='error';status.textContent=(error.message||'')+' 저장을 확인하지 못했습니다. 입력 내용은 유지했습니다. 중복 제출 전 운영자에게 저장 여부를 확인해주세요.';uploads.busy(form,false);}
});
const basicFields=['edition','date','platform','players','format','winner','deck','notes'];
let basicEditing=null;
function basicSnapshot(record){return Object.fromEntries(basicFields.map(k=>[k,record[k]??'']));}
function openBasic(edition){
  const record=records.find(r=>r.edition===Number(edition));if(!record)return;
  basicEditing={id:record.id,expected:basicSnapshot(record),edition:record.edition};
  const form=$('#basic-form');uploads.busy(form,false);form.reset();
  for(const key of basicFields)form.elements[key].value=record[key]??'';
  $('#basic-record').textContent=`${record.edition}회 · ${record.winner} · ${record.deck}`;
  $('#basic-status').className='';$('#basic-status').textContent='';
  $('#basic-save').disabled=!connected||!record.id;
  if(!record.id)$('#basic-status').textContent='최신 기록을 불러온 뒤 다시 열어주세요.';
  if($('#detail').open)$('#detail').close();$('#basic-dialog').showModal();
}
$('#basic-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!connected||!basicEditing?.id)return;
  const form=e.target,status=$('#basic-status'),values=uploads.values(form);
  values.edition=Number(values.edition);values.players=Number(values.players);
  if(!values.winner||!values.deck){status.className='error';status.textContent='우승자와 덱 이름을 입력해주세요.';return;}
  if(records.some(r=>r.edition===values.edition&&r.id!==basicEditing.id)){status.className='error';status.textContent='이미 사용 중인 회차입니다. 다른 회차를 입력해주세요.';return;}
  uploads.busy(form,true);status.className='';status.textContent='수정 내용을 저장하고 있습니다…';
  try{
    const saved=await api('rpc/edit_tournament',{method:'POST',body:JSON.stringify({p_id:basicEditing.id,p_expected:basicEditing.expected,p_values:values})});
    if(!saved?.id)throw new Error('Invalid response');
    records=records.map(r=>r.id===saved.id?{...r,...saved}:r);render();
    basicEditing={id:saved.id,edition:saved.edition,expected:basicSnapshot(saved)};
    status.className='success';status.textContent='기본 정보가 수정되었습니다.';
    $('#basic-record').textContent=`${saved.edition}회 · ${saved.winner} · ${saved.deck}`;
  }catch(error){status.className='error';status.textContent='저장하지 못했습니다. 회차 중복 또는 다른 사람의 수정이 있었을 수 있습니다. 창을 닫고 최신 기록을 다시 불러온 뒤 수정해주세요.';}
  finally{uploads.busy(form,false);}
});
render();
async function loadRecords() {
  if(!connected){$('#load-status').textContent='기존 대회 4건 · 회원 등록은 데이터베이스 연결 후 사용할 수 있습니다.';return;}
  try {
    const data=await api('tournaments?select=id,edition,date,platform,players,format,winner,deck,thumbnail,image,link,decklist,notes,source_id,source_url,source_snapshot&approved=eq.true&order=date.desc');
    if(!Array.isArray(data))throw new Error('Invalid records');
    // 연결 성공 시 DB가 기준입니다. 회차 변경 후 옛 기본 기록이 다시 나타나지 않도록 합니다.
    records=data;
    try {
      const media=await api('tournament_media?select=edition,thumbnail,image,link,decklist,created_at&approved=eq.true&order=created_at.asc,id.asc');
      if(!Array.isArray(media))throw new Error('Invalid media');
      const latestMedia=new Map(media.map(m=>[m.edition,m]));
      records=records.map(r=>latestMedia.has(r.edition)?{...r,...latestMedia.get(r.edition)}:r);
      $('#load-status').textContent='최신 기록을 불러왔습니다.';
    } catch(error){$('#load-status').textContent='대회 기록은 불러왔지만 최신 덱리 조회에 실패했습니다. 잠시 후 새로고침해주세요.';}
    render();
  } catch(error){$('#load-status').textContent='최신 기록을 불러오지 못해 기본 기록 4건을 표시합니다. 잠시 후 새로고침해주세요.';}
}
loadRecords().then(importFromDuel);

function importFromDuel(){
  const token=new URLSearchParams(location.search).get('duel-import');
  if(!token||!/^[a-z0-9]+$/.test(token))return;
  const existing=records.find(r=>r.source_id===token);
  if(existing){$('#load-status').textContent=`이 대회는 이미 ${existing.edition}회로 등록되어 있습니다.`;showDetail(existing.edition);return;}
  let data;try{data=JSON.parse(sessionStorage.getItem('arcv:archive:'+token));}catch{return;}
  if(!data||data.source_id!==token||!Array.isArray(data.source_snapshot?.players))return;
  const form=$('#submit-form');form.reset();
  for(const key of ['date','players','winner','platform','format','notes','source_id','source_url'])form.elements[key].value=data[key]??'';
  form.elements.source_snapshot.value=JSON.stringify(data.source_snapshot);
  $('#import-info').hidden=false;$('#import-info').textContent='대진표에서 대회 정보를 가져왔습니다. 회차·플랫폼·날짜·방식을 확인하고 사용 덱을 입력한 뒤 저장해주세요.';
  openSubmit();
}
function sourceMarkup(r){
  const url=safeUrl(r.source_url),rows=r.source_snapshot?.standings;
  return `${url?`<p><a class="source-link" href="${escapeHtml(url)}">이 대회 대진표 보기 ↗</a></p>`:''}${Array.isArray(rows)&&rows.length<=16?`<details class="source-results"><summary>등록 당시 최종 순위표</summary><table><thead><tr><th>순위</th><th>참가자</th><th>승</th><th>패</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${escapeHtml(row.rank??'-')}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.w)}</td><td>${escapeHtml(row.l)}</td></tr>`).join('')}</tbody></table></details>`:''}`;
}
