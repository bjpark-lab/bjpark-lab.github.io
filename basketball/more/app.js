(function(){
'use strict';
const ALL=Array.isArray(window.MORE_PLAYS)?window.MORE_PLAYS:[];
const DECK='https://docs.google.com/presentation/d/1rdQghY_RAlO8hHioJV0gkotcctBrjcF-uSgwOM-Pn2k/edit#slide=id.';
const CATS=[['전체','전체'],['기초','기초 움직임'],['사이드','사이드 패턴'],['엔드','엔드 패턴'],['팀공격','팀 공격']];
const NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
const state={id:ALL[0]?ALL[0].id:'',step:0,cat:'전체',search:'',onlyFav:false,flip:false,timer:null,favorites:new Set()};
try{state.favorites=new Set(JSON.parse(localStorage.getItem('more-playbook-favorites')||localStorage.getItem('moer-playbook-favorites')||'[]'));}catch(e){}
function el(t,a,txt){
  const x=document.createElementNS(NS,t);
  Object.entries(a||{}).forEach(([k,v])=>x.setAttribute(k,String(v)));
  if(txt!==undefined)x.textContent=txt;
  return x;
}
function empty(x){while(x&&x.firstChild)x.removeChild(x.firstChild)}
function current(){return ALL.find(p=>p.id===state.id)||ALL[0]}
function source(p){return DECK+p.sourceId}
function xcoord(x){return state.flip?500-x:x}
function xy(pair){return [xcoord(pair[0]),pair[1]]}
function getCount(c){return c==='전체'?ALL.length:ALL.filter(p=>p.cat===c).length}
function matches(p){
  if(state.cat!=='전체'&&p.cat!==state.cat)return false;
  if(state.onlyFav&&!state.favorites.has(p.id))return false;
  const q=state.search.trim().toLocaleLowerCase();
  if(!q)return true;
  return [p.title,p.call,p.summary,p.tip,p.cat].some(v=>String(v||'').toLocaleLowerCase().includes(q));
}
function filters(){
  const container=$('categories');empty(container);
  CATS.forEach(([id,label])=>{
    const btn=document.createElement('button');btn.type='button';btn.className='category-button'+(state.cat===id?' active':'');btn.setAttribute('aria-pressed',String(state.cat===id));
    const l=document.createElement('span');l.textContent=label;const count=document.createElement('span');count.className='count';count.textContent=String(getCount(id));btn.append(l,count);
    btn.addEventListener('click',()=>{
      pause();state.cat=id;
      const shown=ALL.filter(matches);if(shown.length&&!shown.some(p=>p.id===state.id)){state.id=shown[0].id;state.step=0;}
      render();
    });container.append(btn);
  });
}
function starButton(btn,id,isLarge){
  const yes=state.favorites.has(id);btn.textContent=yes?'★':'☆';btn.classList.toggle('active',yes);btn.setAttribute('aria-pressed',String(yes));
  if(isLarge)btn.setAttribute('aria-label',yes?'즐겨찾기 해제':'즐겨찾기 추가');
}
function toggleFav(id){
  if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);
  try{localStorage.setItem('more-playbook-favorites',JSON.stringify([...state.favorites]));}catch(e){}
  render();
}
function library(){
  const list=$('playlist');empty(list);
  const shown=ALL.filter(matches);
  $('visibleCount').textContent=shown.length+'개';
  shown.forEach(p=>{
    const row=document.createElement('div');row.className='play-row'+(p.id===state.id?' active':'');
    const main=document.createElement('button');main.type='button';main.className='play-main';main.setAttribute('aria-current',p.id===state.id?'true':'false');
    const name=document.createElement('strong');name.textContent=p.title;
    const sub=document.createElement('span');sub.textContent=p.call+' · '+(p.referenceOnly?'원본 확인':p.steps.length+'단계');
    main.append(name,sub);
    main.addEventListener('click',()=>{pause();state.id=p.id;state.step=0;render();if(window.matchMedia('(max-width:750px)').matches)$('boardHeading').scrollIntoView({behavior:'smooth',block:'start'});});
    const star=document.createElement('button');star.type='button';star.className='fave-mini';star.setAttribute('aria-label',p.title+' 즐겨찾기');starButton(star,p.id,false);star.addEventListener('click',()=>toggleFav(p.id));row.append(main,star);list.append(row);
  });
  if(!shown.length){const msg=document.createElement('div');msg.className='no-results';msg.textContent='조건에 맞는 전술이 없습니다.';list.append(msg);}
  const fav=$('favOnly');fav.classList.toggle('active',state.onlyFav);fav.setAttribute('aria-pressed',String(state.onlyFav));
}
function courtLines(){
  const e=$('courtLines');empty(e);
  e.append(el('rect',{x:0,y:0,width:500,height:510,fill:'#f0d8b2'}));
  for(let i=1;i<13;i++){e.append(el('line',{x1:0,y1:i*40,y2:i*40,x2:500,stroke:i%2?'#e2c69e':'#e7cba5','stroke-width':1.1,opacity:.70}));}
  e.append(el('rect',{x:0,y:0,width:500,height:510,fill:'none',stroke:'#947650','stroke-width':3}));
  e.append(el('rect',{x:168,y:0,width:164,height:194,fill:'#d1a575','fill-opacity':.15,stroke:'#9f7c52','stroke-width':2.6}));
  const line=(d,dash)=>e.append(el('path',{d,fill:'none',stroke:'#9b7c56','stroke-width':2.6,...(dash?{'stroke-dasharray':dash}:{})}));
  line('M 190 194 A 60 60 0 0 0 310 194');
  line('M 190 194 A 60 60 0 0 1 310 194','8 6');
  line('M 26 0 V 73 A 225 225 0 0 0 474 73 V 0');
  line('M 206 52 A 44 44 0 0 0 294 52');
  line('M 206 52 V 42 M 294 52 V 42');
  e.append(el('line',{x1:226,y1:40,x2:274,y2:40,stroke:'#5f4c38','stroke-width':5,'stroke-linecap':'round'}));
  e.append(el('circle',{cx:250,cy:52,r:8,fill:'none',stroke:'#a95b2e','stroke-width':3}));
  e.append(el('path',{d:'M 190 510 A 60 60 0 0 1 310 510',fill:'none',stroke:'#987953','stroke-width':2.5}));
  e.append(el('text',{x:252,y:487,fill:'#c2a178','font-size':14,'font-weight':900,'text-anchor':'middle','letter-spacing':4},'MORE'));
  e.append(el('text',{x:250,y:17,fill:'#986a46','font-size':10,'font-weight':700,'text-anchor':'middle'},'↑'));
}
function trimmedLine(a,b,begin=23,end=25){
  const [x1,y1]=xy(a),[x2,y2]=xy(b),d=Math.hypot(x2-x1,y2-y1);
  if(d<1)return '';
  const ux=(x2-x1)/d,uy=(y2-y1)/d,st=Math.min(begin,d*.22),en=Math.min(end,d*.22);
  return 'M '+(x1+ux*st).toFixed(2)+' '+(y1+uy*st).toFixed(2)+' L '+(x2-ux*en).toFixed(2)+' '+(y2-uy*en).toFixed(2);
}
function sourceIndex(p,step){
  if(step===0)return 0;
  if(p.id==='iverson-5'&&step===3)return 1;
  if(p.id==='sa'&&step===3)return 1;
  return step-1;
}
function drawPlay(p){
  const lines=$('playPaths'),screens=$('screens'),people=$('players');
  empty(lines);empty(screens);empty(people);
  const st=p.steps[state.step];if(!st)return;
  const prior=p.steps[sourceIndex(p,state.step)]||st;
  const g=el('g',{class:'pathgroup'});
  if(state.step>0){
    st.pos.forEach((point,i)=>{
      const a=prior.pos[i];if(Math.hypot(a[0]-point[0],a[1]-point[1])<18)return;
      const d=trimmedLine(a,point);if(d)g.append(el('path',{d,class:'movement'}));
    });
    if(prior.ball!==st.ball){
      const d=trimmedLine(prior.pos[prior.ball-1],st.pos[st.ball-1],24,25);
      if(d)g.append(el('path',{d,class:'passing'}));
    }
  }
  lines.append(g);
  for(const num of st.screen||[]){
    const [x,y]=xy(st.pos[num-1]);
    // Short perpendicular screen bar next to the stationary screener.
    screens.append(el('path',{d:'M '+(x-22)+' '+(y+22)+' L '+(x+22)+' '+(y+22),class:'screen-bar'}));
  }
  st.pos.forEach((to,i)=>{
    const from=prior.pos[i]||to;
    const [a,b]=xy(from),[x,y]=xy(to);
    const g=el('g',{class:'player',transform:'translate('+a+' '+b+')'});
    g.append(el('circle',{class:'base',cx:0,cy:0,r:21}));
    g.append(el('text',{x:0,y:1},String(i+1)));
    if(st.ball===i+1){
      g.append(el('circle',{class:'ball-circle',cx:16,cy:-16,r:8}));
      g.append(el('path',{d:'M 11 -16 H 21 M 16 -21 V -11',stroke:'#8d4c19','stroke-width':1.2}));
    }
    people.append(g);
    if(Math.abs(a-x)+Math.abs(b-y)>2)requestAnimationFrame(()=>{g.setAttribute('transform','translate('+x+' '+y+')')});
  });
}
function stepButtons(p){
  const line=$('timeline');empty(line);
  p.steps.forEach((st,i)=>{
    const b=document.createElement('button');b.type='button';b.className=i===state.step?'selected':'';
    b.setAttribute('aria-pressed',String(i===state.step));
    const n=document.createElement('span');n.className='timeline-index';n.textContent=String(i+1).padStart(2,'0');
    const txt=document.createElement('span');txt.textContent=st.label;
    b.append(n,txt);b.addEventListener('click',()=>{pause();state.step=i;render();});line.append(b);
  });
}
function notes(p){
  $('boardHeading').textContent=p.title+' · '+p.call;
  $('playCategory').textContent=CATS.find(c=>c[0]===p.cat)?.[1]||p.cat;
  $('playCall').textContent=p.call;
  $('playTitle').textContent=p.title;
  $('playSummary').textContent=p.summary;
  $('playTip').textContent=p.tip;
  starButton($('star'),p.id,true);
  $('slideLink').href=source(p);
  $('videoLink').hidden=!p.video;
  if(p.video)$('videoLink').href=p.video;
  $('referenceOverlay').hidden=!p.referenceOnly;
  $('overlaySource').href=source(p);
  $('transport').hidden=!!p.referenceOnly;
  $('timeline').hidden=!!p.referenceOnly;
  $('stepBox').hidden=!!p.referenceOnly;
  $('branchNote').hidden=p.id!=='iverson-5';
  if(!p.referenceOnly){
    const st=p.steps[state.step];
    $('currentNumber').textContent=String(state.step+1).padStart(2,'0')+' / '+String(p.steps.length).padStart(2,'0');
    $('stepTitle').textContent=st.label;
    $('stepDescription').textContent=st.detail;
    $('progressText').textContent=(state.step+1)+' / '+p.steps.length;
    $('prev').disabled=state.step===0;
    $('next').disabled=state.step===p.steps.length-1;
    $('first').disabled=state.step===0;
    stepButtons(p);
  }
}
function updateURL(){
  try{
    const u=new URL(location.href);u.searchParams.set('play',state.id);
    if(state.step)u.searchParams.set('step',String(state.step+1));else u.searchParams.delete('step');
    if(state.flip)u.searchParams.set('flip','1');else u.searchParams.delete('flip');
    history.replaceState(null,'',u);
  }catch(e){}
}
function render(){
  if(!ALL.length)return;
  const p=current();
  filters();library();notes(p);courtLines();
  if(p.referenceOnly){
    empty($('playPaths'));empty($('screens'));empty($('players'));pause();
  }else drawPlay(p);
  $('countPlays').textContent=String(ALL.length);
  $('countMotion').textContent=String(ALL.filter(p=>!p.referenceOnly).length);
  $('flip').setAttribute('aria-pressed',String(state.flip));
  updateURL();
}
function pause(){
  if(state.timer){clearInterval(state.timer);state.timer=null;}
  $('autoplay').textContent='▶ 자동 재생';
}
function jump(n){
  const p=current();if(p.referenceOnly)return;
  state.step=Math.max(0,Math.min(p.steps.length-1,n));render();
}
function autoplay(){
  const p=current();
  if(p.referenceOnly)return;
  if(state.timer){pause();return;}
  if(state.step>=p.steps.length-1)jump(0);
  $('autoplay').textContent='Ⅱ 일시정지';
  state.timer=setInterval(()=>{
    const x=current();if(x.referenceOnly){pause();return;}
    state.step=(state.step+1)%x.steps.length;render();
  },2800);
}
function saveSVG(){
  const p=current();if(p.referenceOnly)return;
  const svg=$('court').cloneNode(true);
  svg.setAttribute('xmlns',NS);svg.setAttribute('width','1000');svg.setAttribute('height','1018');
  const style=el('style',{},'.movement{fill:none;stroke:#2361b2;stroke-width:3.6;stroke-linecap:round;marker-end:url(#cutHead)} .passing{fill:none;stroke:#ce523f;stroke-width:3.4;stroke-dasharray:8 6;marker-end:url(#passHead)} .screen-bar{fill:none;stroke:#7d3dad;stroke-width:7;stroke-linecap:round} .player .base{fill:#285f94;stroke:#fff7e6;stroke-width:3.3} .player text{font-size:20px;font-weight:850;fill:white;text-anchor:middle;dominant-baseline:middle} .ball-circle{fill:#ee9d33;stroke:#75471a;stroke-width:2}');
  svg.insertBefore(style,svg.firstChild);
  // Freeze transforms at current positions, even if a player transition is ongoing.
  const groups=svg.querySelectorAll('g.player'),st=p.steps[state.step];
  groups.forEach((g,i)=>{const [x,y]=xy(st.pos[i]);g.setAttribute('transform','translate('+x+' '+y+')')});
  const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MORE_'+p.id+'_'+(state.step+1)+'.svg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function copyLink(){
  const b=$('copyLink'),label=b.querySelector('span');const old='이 전술 링크 복사';
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(location.href).then(()=>{label.textContent='링크 복사 완료';setTimeout(()=>label.textContent=old,1600)}).catch(()=>{label.textContent='주소창에서 링크 복사';setTimeout(()=>label.textContent=old,1900)});
  else{label.textContent='주소창에서 링크 복사';setTimeout(()=>label.textContent=old,1900);}
}
$('search').addEventListener('input',e=>{state.search=e.target.value;library();});
$('favOnly').addEventListener('click',()=>{state.onlyFav=!state.onlyFav;library();});
$('star').addEventListener('click',()=>toggleFav(state.id));
$('prev').addEventListener('click',()=>{pause();jump(state.step-1)});
$('next').addEventListener('click',()=>{pause();jump(state.step+1)});
$('first').addEventListener('click',()=>{pause();jump(0)});
$('autoplay').addEventListener('click',autoplay);
$('flip').addEventListener('click',()=>{state.flip=!state.flip;render();});
$('saveSvg').addEventListener('click',saveSVG);
$('copyLink').addEventListener('click',copyLink);
window.addEventListener('keydown',e=>{
  if(e.altKey||e.metaKey||e.ctrlKey||e.target.tagName==='INPUT')return;
  if(e.key==='ArrowRight'){pause();jump(state.step+1);e.preventDefault();}
  else if(e.key==='ArrowLeft'){pause();jump(state.step-1);e.preventDefault();}
  else if(e.key===' '&&!(e.target instanceof HTMLButtonElement)){autoplay();e.preventDefault();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
try{const q=new URL(location.href).searchParams;const id=q.get('play');const hit=ALL.find(p=>p.id===id);if(hit){state.id=hit.id;state.cat='전체';const step=Number(q.get('step'));if(Number.isInteger(step))state.step=Math.max(0,Math.min(hit.steps.length-1,step-1));}state.flip=q.get('flip')==='1';}catch(e){}
render();
})();
