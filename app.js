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
const thumbnailInput = document.querySelector('[name="thumbnail"]');
thumbnailInput.addEventListener('input',()=>{
  const preview=$('#thumbnail-preview'),url=safeUrl(thumbnailInput.value.trim());
  preview.hidden=!url;preview.innerHTML=url?thumbnailMarkup({thumbnail:url,deck:'덱 썸네일 미리보기'}):'';
});
function render() {
  records.sort((a,b) => b.date.localeCompare(a.date) || b.edition-a.edition);
  const q = $('#search').value.trim().toLocaleLowerCase();
  const filtered = records.filter(r => (platform === '전체' || platform === r.platform) && `${r.winner} ${r.deck} ${r.edition}회 ${r.format} ${r.platform} ${r.date}`.toLocaleLowerCase().includes(q));
  $('#record-count').textContent = String(filtered.length).padStart(2,'0');
  $('#records').innerHTML = filtered.map(r => `<article class="record"><div class="record-head"><span class="edition">TOURNAMENT ${String(r.edition).padStart(2,'0')}</span><time datetime="${r.date}">${dateText(r.date)}</time></div><div class="record-summary">${thumbnailMarkup(r)}<div class="record-info"><h3><span class="winner-label">우승</span>${escapeHtml(r.winner)}</h3><p class="deck">${escapeHtml(r.deck)}</p></div></div><p><span class="badge ${r.platform==='오메가'?'omega':''}">${escapeHtml(r.platform)}</span><span class="badge">${r.players}인 · ${escapeHtml(r.format)}</span></p><div class="record-foot"><span>${hasDeck(r)?'덱리 등록됨':'덱리 미등록'}</span><button data-detail="${r.edition}" aria-label="제 ${r.edition}회 대회 상세 보기">상세 보기 ↗</button></div></article>`).join('') || '<p class="empty">조건에 맞는 기록이 없습니다.</p>';

}
function showDetail(edition) {
  const r = records.find(r=>r.edition===Number(edition));
  if (!r) return;
  const image = safeUrl(r.image), link = safeUrl(r.link);
  $('#detail-content').innerHTML = `<p class="eyebrow">TOURNAMENT ${String(r.edition).padStart(2,'0')}</p><h2>제 ${r.edition}회 · ${escapeHtml(r.winner)} 우승</h2><p class="detail-meta">${dateText(r.date)} · ${escapeHtml(r.platform)}<br>${r.players}인 · ${escapeHtml(r.format)}</p><div class="detail-deck"><p class="eyebrow">WINNING DECK</p><div class="detail-summary">${thumbnailMarkup(r)}<h3>${escapeHtml(r.deck)}</h3></div>${hasDeck(r)?'':'<p class="muted">아직 덱리가 등록되지 않았습니다.</p>'}${image?`<a href="${escapeHtml(image)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(image)}" alt="${escapeHtml(r.winner)}의 ${escapeHtml(r.deck)} 덱리" loading="lazy" referrerpolicy="no-referrer"></a>`:''}${link?`<p><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">덱리 / 영상 링크 열기 ↗</a></p>`:''}${r.decklist?`<pre>${escapeHtml(r.decklist)}</pre>`:''}${r.notes?`<h3>대회 메모</h3><pre>${escapeHtml(r.notes)}</pre>`:''}</div>`;
  $('#detail').showModal();
}
document.addEventListener('click', e => { const b=e.target.closest('[data-detail]');if(b)showDetail(b.dataset.detail); });
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
  const f=e.target, values=Object.fromEntries(new FormData(f));
  for(const k of Object.keys(values))values[k]=values[k].trim();
  values.edition=Number(values.edition);values.players=Number(values.players);
  const status=$('#submit-status');
  if(!values.winner||!values.deck){status.textContent='우승자와 덱 이름을 입력해주세요.';status.className='error';return;}
  if(['thumbnail','image','link'].some(k=>values[k]&&!safeUrl(values[k]))){status.textContent='이미지와 링크에는 https:// 주소를 입력해주세요.';status.className='error';return;}
  $('#save-button').disabled=true;status.className='';status.textContent='기록을 저장하고 있습니다…';
  try {
    // return=minimal: 제출자는 미승인 데이터의 조회 권한이 없습니다.
    await api('tournaments',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(values)});
    status.className='success';status.textContent='기록이 저장되었습니다. 운영자 승인 후 기록실에 공개됩니다.';f.reset();$('#thumbnail-preview').hidden=true;
  } catch(error) {status.className='error';status.textContent='저장 완료를 확인하지 못했습니다. 입력 내용은 유지했습니다. 연결 상태를 확인하거나 운영자에게 문의해주세요. 중복 제출 전 저장 여부를 확인해주세요.';}
  finally {$('#save-button').disabled=false;}
});
render();
async function loadRecords() {
  if(!connected){$('#load-status').textContent='기존 대회 4건 · 회원 등록은 데이터베이스 연결 후 사용할 수 있습니다.';return;}
  try {
    const data=await api('tournaments?select=edition,date,platform,players,format,winner,deck,thumbnail,image,link,decklist,notes&approved=eq.true&order=date.desc');
    if(!Array.isArray(data))throw new Error('Invalid records');
    // DB의 초기 데이터가 누락되어도 제공받은 기록은 보존합니다. 동일 회차는 DB가 우선합니다.
    records=[...new Map([...window.ARCHIVE_RECORDS,...data].map(r=>[r.edition,r])).values()];
    $('#load-status').textContent='승인된 최신 기록을 불러왔습니다.';render();
  } catch(error){$('#load-status').textContent='최신 기록을 불러오지 못해 기본 기록 4건을 표시합니다. 잠시 후 새로고침해주세요.';}
}
loadRecords();
