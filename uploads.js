'use strict';
window.ArchiveUploads = (() => {
  const maxSize = 5 * 1024 * 1024;
  const formats = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
  const uploaded = new WeakMap();
  const previews = new WeakMap();
  const inputs = form => [...form.querySelectorAll('input[data-upload]')];
  function checkFile(file) {
    if (!formats[file.type]) throw new Error('사진은 JPG, PNG, WebP, GIF 형식으로 선택해주세요.');
    if (!file.size || file.size > maxSize) throw new Error('사진 한 장의 크기는 5MB 이하여야 합니다.');
  }
  async function validateFile(file) {
    checkFile(file);
    const b = new Uint8Array(await file.slice(0,12).arrayBuffer());
    const signature = file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)
      : file.type === 'image/jpeg' ? b[0]===255 && b[1]===216 && b[2]===255
      : file.type === 'image/gif' ? String.fromCharCode(...b.slice(0,6)).match(/^GIF8[79]a$/)
      : String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP';
    if (!signature) throw new Error('사진 파일을 읽을 수 없습니다. 다른 이미지 파일을 선택해주세요.');
  }
  function preview(input) {
    const area = document.getElementById(input.dataset.preview);
    const old = previews.get(input); if(old) URL.revokeObjectURL(old);
    previews.delete(input);area.replaceChildren();area.hidden=true;
    const file=input.files?.[0];
    const current=input.form.elements[input.dataset.upload].value;
    let src=current;
    if(file){
      try {checkFile(file);} catch(error){area.textContent=error.message;area.className='upload-preview error';area.hidden=false;return;}
      src=URL.createObjectURL(file);previews.set(input,src);
    }
    if(!src)return;
    const img=document.createElement('img');img.alt=input.dataset.upload==='thumbnail'?'썸네일 미리보기':'덱리 미리보기';img.src=src;
    img.addEventListener('error',()=>{area.textContent='이미지를 표시할 수 없습니다. 다른 사진을 선택해주세요.';});
    area.className='upload-preview';area.append(img);area.hidden=false;
  }
  function bind(form) {inputs(form).forEach(input=>input.addEventListener('change',()=>preview(input)));}
  function refresh(form) {inputs(form).forEach(preview);}
  function busy(form, disabled) {form.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=disabled);}
  function values(form) {return Object.fromEntries([...new FormData(form)].filter(([,v])=>typeof v==='string').map(([k,v])=>[k,v.trim()]));}
  function hasFiles(form) {return inputs(form).some(input=>input.files?.length);}
  async function upload(file) {
    if(uploaded.has(file))return uploaded.get(file);
    const config=window.ARCHIVE_CONFIG;
    const path=`submissions/${crypto.randomUUID()}.${formats[file.type]}`;
    const base=config.supabaseUrl.replace(/\/$/,'');
    const response=await fetch(`${base}/storage/v1/object/duel-images/${path}`,{
      method:'POST',headers:{apikey:config.supabaseKey,'Content-Type':file.type,'x-upsert':'false'},
      body:file,signal:AbortSignal.timeout(60000)
    });
    if(!response.ok)throw new Error('사진 업로드에 실패했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.');
    const url=`${base}/storage/v1/object/public/duel-images/${path}`;
    uploaded.set(file,url);return url;
  }
  async function apply(form, data, status) {
    const selected=inputs(form).filter(input=>input.files?.length).map(input=>({input,file:input.files[0]}));
    // 모든 파일을 먼저 검사하여 잘못된 파일 선택 시 일부만 업로드되지 않게 합니다.
    for(const {file} of selected)await validateFile(file);
    for(let i=0;i<selected.length;i++){
      const {input,file}=selected[i];status.textContent=`사진 업로드 중 (${i+1}/${selected.length})…`;
      data[input.dataset.upload]=await upload(file);
    }
  }
  return {bind,refresh,busy,values,hasFiles,apply,validateFile};
})();
