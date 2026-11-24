/* Shared tactical screen layout, used by SSIT, MORE, and the Node geometry tests. */
(function(root,factory){
  const api=factory();
  root.PlaybookScreenGeometry=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:(typeof globalThis==='object'?globalThis:{}),function(){
  'use strict';
  const WIDTH=500,HEIGHT=510,PLAYER_RADIUS=20.5,BAR_HALF=21,LABEL_HEIGHT=21;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  const mirror=(p,flip)=>[flip?WIDTH-p[0]:p[0],p[1]];
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  function rectCircleGap(center,width,height,p){
    const dx=Math.max(0,Math.abs(p[0]-center[0])-width/2);
    const dy=Math.max(0,Math.abs(p[1]-center[1])-height/2);
    return Math.hypot(dx,dy);
  }
  function wordWidth(word){
    return clamp(20+Array.from(word).reduce((n,c)=>n+(/[가-힣]/.test(c)?11.7:/\s/.test(c)?4.5:7.1),0),48,146);
  }
  function placeLabel(mid,unit,normal,bar,word,allPlayers,existing){
    const width=wordWidth(word),height=LABEL_HEIGHT;
    const candidates=[];
    for(const away of [18,-18,30,-30,43,-43,56,-56,0]){
      for(const along of [0,-17,17,-32,32]){
        let x=mid[0]+normal[0]*away+unit[0]*along;
        let y=mid[1]+normal[1]*away+unit[1]*along;
        const raw=[x,y];
        x=clamp(x,width/2+8,WIDTH-width/2-8);
        y=clamp(y,height/2+9,HEIGHT-height/2-9);
        const at=[x,y];
        let score=Math.abs(away)*.13+Math.abs(along)*.46+distance(raw,at)*6.5;
        for(const player of allPlayers){
          const gap=rectCircleGap(at,width,height,player);
          if(gap<PLAYER_RADIUS+3)score+=230+20*(PLAYER_RADIUS+3-gap);
        }
        for(const placed of existing){
          const overlapX=(width+placed.width)/2+7-Math.abs(x-placed.x);
          const overlapY=(height+placed.height)/2+5-Math.abs(y-placed.y);
          if(overlapX>0&&overlapY>0)score+=350+overlapX*overlapY;
        }
        const toBar=distance(at,bar);
        if(toBar<20)score+=105+8*(20-toBar);
        candidates.push({x,y,width,height,score});
      }
    }
    candidates.sort((a,b)=>a.score-b.score);
    return candidates[0];
  }
  function layoutScreens(stage,opts={}){
    const flip=!!opts.flip,results=[],placed=[];
    const positions=stage.pos.map(p=>mirror(p,flip));
    for(const no of stage.screen||[]){
      const source=mirror(stage.screenAt?.[no]||stage.pos[no-1],flip);
      const targetNo=Number(stage.screenTargets?.[no]);
      const hasTarget=Number.isInteger(targetNo)&&targetNo>=1&&targetNo<=5&&targetNo!==no;
      const target=hasTarget?mirror(stage.screenApproach?.[no]||stage.screenTargetAt?.[no]||stage.pos[targetNo-1],flip):null;
      if(!finitePoint(source))continue;
      let unit,normal,mid,bar;
      if(target&&finitePoint(target)&&distance(source,target)>2){
        const len=distance(source,target);
        unit=[(target[0]-source[0])/len,(target[1]-source[1])/len];
        normal=[-unit[1],unit[0]];
        mid=[(source[0]+target[0])/2,(source[1]+target[1])/2];
        const ahead=Math.min(len/2,28);
        bar=[source[0]+unit[0]*ahead,source[1]+unit[1]*ahead];
      }else{
        // Only for older play data that lack a receiver; the standard data specifies one.
        const deg=Number(stage.screenAngles?.[no]||0)*(flip?-1:1);
        const rad=deg*Math.PI/180;
        unit=[Math.sin(rad),Math.cos(rad)];
        normal=[-unit[1],unit[0]];
        bar=[source[0]+unit[0]*26,source[1]+unit[1]*26];
        mid=[source[0]+unit[0]*62,source[1]+unit[1]*62];
      }
      const p1=[bar[0]-normal[0]*BAR_HALF,bar[1]-normal[1]*BAR_HALF];
      const p2=[bar[0]+normal[0]*BAR_HALF,bar[1]+normal[1]*BAR_HALF];
      const word=stage.screenLabels?.[no]||String(no)+(hasTarget?'→'+targetNo:'번 스크린');
      const label=placeLabel(mid,unit,normal,bar,word,positions,placed);
      placed.push(label);
      results.push({screener:no,target:hasTarget?targetNo:null,source,targetPos:target,
        midpoint:mid,barCenter:bar,from:p1,to:p2,label:{...label,text:word},
        labelAnchor:mid,linkDistance:distance([label.x,label.y],mid)});
    }
    return results;
  }
  return {layoutScreens,wordWidth};
});