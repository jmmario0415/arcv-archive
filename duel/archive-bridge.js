'use strict';
// 기존 대진 계산/실시간 저장 코드는 변경하지 않고 등록할 정보만 구성합니다.
window.DuelArchiveBridge = {
  build(t, champions, ranks) {
    if (!t || !/^[a-z0-9]+$/.test(t.id) || !champions.length) return null;
    const date=new Date(t.createdAt);
    if(Number.isNaN(date.getTime()))return null;
    const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const name=String(t.name||'');
    const winner=champions.map(i=>t.players[i]).filter(Boolean).join(' · ');
    const source=new URL('./',location.href);source.hash='t-'+t.id;
    return {
      date:day,players:t.players.length,winner:winner.length<=50?winner:'',
      platform:/오메가|omega/i.test(name)?'오메가':/오프라인/i.test(name)?'오프라인':'마듀',
      format:(/매치/.test(name)?'매치':'단판')+(t.mode==='ko'?' 토너먼트':' 리그'),
      notes:`대회명: ${name}${t.mode==='custom'?'\n직접 입력한 대진':''}${winner.length>50?'\n공동 우승: '+winner:''}`.slice(0,2000),
      source_id:t.id,source_url:source.href,
      source_snapshot:{name,mode:t.mode,createdAt:t.createdAt,players:[...t.players],results:{...(t.results||{})},schedule:t.schedule||[],standings:ranks.map(r=>({name:t.players[r.i],rank:r.rank,w:r.w,l:r.l}))}
    };
  },
  open(t, champions, ranks) {
    const data=this.build(t,champions,ranks);if(!data)return false;
    try {sessionStorage.setItem('arcv:archive:'+t.id,JSON.stringify(data));}
    catch {return false;}
    const target=new URL('../',location.href);target.searchParams.set('duel-import',t.id);
    location.href=target.href;return true;
  }
};
