'use strict';
window.DuelScores = (()=>{
  function valid(format,a,b){
    const target=format==='match'?2:1;
    return ['single','match'].includes(format)&&Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<=target&&b<=target&&!(a===target&&b===target);
  }
  function scores(value,a,b){
    if(!value||typeof value!=='object'||!valid(value.format,value.sa,value.sb))return null;
    if(value.a===a&&value.b===b)return {a:value.sa,b:value.sb,format:value.format};
    if(value.a===b&&value.b===a)return {a:value.sb,b:value.sa,format:value.format};
    return null;
  }
  function winner(value,a,b){
    if(Number.isInteger(value))return value===a||value===b?value:null;
    const s=scores(value,a,b);if(!s)return null;
    const target=s.format==='match'?2:1;
    return s.a===target?a:s.b===target?b:null;
  }
  function plan(t,key,value,compute){
    const game=compute(t).games.find(g=>g.key===key);
    if(!game)throw new Error('대진을 다시 확인해주세요.');
    if(value!==null&&typeof value==='object'&&!scores(value,game.a,game.b))throw new Error('스코어 또는 참가자가 올바르지 않습니다.');
    if(value!==null&&typeof value!=='object'&&value!==game.a&&value!==game.b)throw new Error('참가자가 올바르지 않습니다.');
    const results={...(t.results||{}),[key]:value},changes={[key]:value};
    if(t.mode==='ko'&&game.w!==winner(value,game.a,game.b)){
      const match=key.match(/^b(\d+)-(\d+)$/);if(!match)throw new Error('대진 키가 올바르지 않습니다.');
      const rounds=compute(t).view.R;let index=Number(match[2]);
      for(let round=Number(match[1])+1;round<rounds;round++){
        index=Math.floor(index/2);const nextKey=`b${round}-${index}`;
        if(results[nextKey]!=null){results[nextKey]=null;changes[nextKey]=null;}
      }
    }
    return {next:{...t,results},changes};
  }
  return {valid,scores,winner,plan};
})();
