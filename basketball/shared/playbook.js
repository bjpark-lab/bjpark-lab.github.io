(function(){
'use strict';
const meta=window.PLAYBOOK_META||{};
const ALL=Array.isArray(window.PLAYBOOK_PLAYS)?window.PLAYBOOK_PLAYS:[];
const CATS=[['전체','전체'],...(meta.categories||[])];
const NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
const q=(v)=>String(v??'').trim().toLocaleLowerCase();
const favKey=(meta.team||'team').toLowerCase()+'-playbook-favorites';
const state={id:ALL[0]?.id||'',step:0,category:'전체',search:'',onlyFav:false,flip:false,timer:null,fromStep:null,raf:null,serial:0,favorites:new Set()};
try{const legacyKey=meta.team==='MORE'?'moer-playbook-favorites':null;state.favorites=new Set(JSON.parse(localStorage.getItem(favKey)||localStorage.getItem(legacyKey)||'[]'));}catch(e){}
function svg(tag,attrs={},content){
 const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(content!==undefined)e.textContent=content;return e;
}
function clear(e){if(e)e.replaceChildren();}
function selectPlay(){return ALL.find(p=>p.id===state.id)||ALL[0]}
function visible(p){if(state.category!=='전체'&&p.cat!==state.category)return false;if(state.onlyFav&&!state.favorites.has(p.id))return false;const text=q(state.search);return !text||[p.title,p.call,p.summary,p.tip,p.cat].some(v=>q(v).includes(text));}
function source(p){return p.sourceUrl||(meta.deck&&p.sourceId?meta.deck+p.sourceId:meta.defaultSource||'#');}
function labelSource(p){return p.sourceLabel||meta.sourceLabel||'원본 전술 자료';}
function mirror(p){return [state.flip?500-p[0]:p[0],p[1]];}
function catName(cat){return CATS.find(x=>x[0]===cat)?.[1]||cat}
function cancelMotion(){state.serial++;if(state.raf!==null){cancelAnimationFrame(state.raf);state.raf=null;}}
function pause(){if(state.timer!==null){clearInterval(state.timer);state.timer=null;}const a=$('autoplay');if(a)a.textContent='▶ 자동 재생';}
function sourceIndex(p,step){const st=p.steps[step];if(st?.branchFrom!==undefined)return st.branchFrom;return Math.max(0,step-1);}
function branchNext(p,step){const st=p.steps[step];const next=step+1;if(next>=p.steps.length)return null;if(p.steps[next]?.continueFrom===step)return next;if(st?.branch||p.steps[next]?.branch)return null;return next;}
function prevStep(p,step){const st=p.steps[step];return st?.branchFrom!==undefined?st.branchFrom:Math.max(0,step-1);}
function layoutCategories(){
 const el=$('categories');clear(el);
 for(const [id,name] of CATS){
  const count=id==='전체'?ALL.length:ALL.filter(p=>p.cat===id).length;
  const btn=document.createElement('button');btn.type='button';btn.className='category-button'+(state.category===id?' active':'');btn.setAttribute('aria-pressed',String(state.category===id));
  const c=document.createElement('span');c.className='count';c.textContent=String(count);btn.append(document.createTextNode(name),c);
  btn.addEventListener('click',()=>{pause();state.category=id;const found=ALL.filter(visible);if(found.length&&!found.some(p=>p.id===state.id)){state.id=found[0].id;state.step=0;state.fromStep=null;}render();});
  el.append(btn);
 }
}
function favoriteControl(btn,id,full=false){
 const active=state.favorites.has(id);btn.textContent=active?'★':'☆';btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));if(full)btn.setAttribute('aria-label',active?'즐겨찾기 해제':'즐겨찾기 추가');
}
function toggleFavorite(id){if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);try{localStorage.setItem(favKey,JSON.stringify([...state.favorites]));}catch(e){}render();}
function listPlays(){
 const list=$('playlist');clear(list);
 const data=ALL.filter(visible);
 $('visibleCount').textContent=data.length+'개';
 for(const p of data){
  const row=document.createElement('div');row.className='play-row'+(p.id===state.id?' active':'');
  const btn=document.createElement('button');btn.className='play-main';btn.type='button';btn.setAttribute('aria-current',String(p.id===state.id));
  const name=document.createElement('strong');name.textContent=p.title;
  const desc=document.createElement('span');desc.textContent=p.call+' · '+(p.referenceOnly?'원본 확인':p.steps.length+'단계');
  btn.append(name,desc);
  btn.addEventListener('click',()=>{pause();cancelMotion();state.id=p.id;state.step=0;state.fromStep=null;render();if(window.matchMedia('(max-width:750px)').matches)$('boardHeading').scrollIntoView({block:'start',behavior:'smooth'});});
  const star=document.createElement('button');star.className='fave-mini';star.type='button';star.setAttribute('aria-label',p.title+' 즐겨찾기');favoriteControl(star,p.id);
  star.addEventListener('click',()=>toggleFavorite(p.id));
  row.append(btn,star);list.append(row);
 }
 if(!data.length){const div=document.createElement('p');div.className='no-results';div.textContent='검색 결과가 없습니다.';list.append(div);}
 $('favOnly').classList.toggle('active',state.onlyFav);$('favOnly').setAttribute('aria-pressed',String(state.onlyFav));
}
function paintCourt(){
 const e=$('courtLines');clear(e);
 const floor=svg('rect',{x:0,y:0,width:500,height:510,fill:'#f2ddbb'});
 e.append(floor);
 for(let i=1;i<=12;i++)e.append(svg('path',{d:'M 0 '+(i*39)+' H 500',stroke:i%2?'#e5cda9':'#ead2ae','stroke-width':1,opacity:.6}));
 const line=(d,width=2.5,more={})=>e.append(svg('path',{d,stroke:'#9a7952','stroke-width':width,fill:'none',...more}));
 e.append(svg('rect',{x:0,y:0,width:500,height:510,stroke:'#977754','stroke-width':3,fill:'none'}));
 // FIBA half court proportions: 15 m width, 4.9 m key, 5.8 m free throw line.
 e.append(svg('rect',{x:168.35,y:0,width:163.3,height:193.33,fill:'#d0a676','fill-opacity':.19}));
 line('M 168.35 0 V 193.33 H 331.65 V 0');
 line('M 190 193.33 A 60 60 0 0 0 310 193.33');
 line('M 190 193.33 A 60 60 0 0 1 310 193.33',1.8,{'stroke-dasharray':'8 6'});
 // Three point arc: 6.75 m from hoop with 0.9 m sideline offset.
 const hoopY=52.5, radius=225,cornerX=30,dy=Math.sqrt(radius*radius-Math.pow(250-cornerX,2)), joinY=hoopY+dy;
 line('M 30 0 V '+joinY.toFixed(2)+' A 225 225 0 0 0 470 '+joinY.toFixed(2)+' V 0',3);
 line('M 206.67 52.5 A 43.33 43.33 0 0 0 293.33 52.5',2.2);
 e.append(svg('line',{x1:225,y1:40,x2:275,y2:40,stroke:'#5a4737','stroke-width':5,'stroke-linecap':'round'}));
 e.append(svg('circle',{cx:250,cy:52.5,r:7.5,fill:'none',stroke:'#be6832','stroke-width':3}));
 // Back side of the half-court centre circle.
 line('M 190 510 A 60 60 0 0 1 310 510',2.1);
 e.append(svg('text',{x:250,y:486,'text-anchor':'middle','font-size':14,'font-weight':800,'letter-spacing':5,fill:'#bea078'},meta.team||'BALL'));
}
function dash(kind){return kind==='pass'?'passing':kind==='shot'?'shooting':'movement'}
function drawArrow(from,to,kind='move'){
 const [ax,ay]=mirror(from),[bx,by]=mirror(to);
 const dist=Math.hypot(bx-ax,by-ay);
 if(dist<5)return null;
 const padA=kind==='pass'?20:16,padB=kind==='pass'?25:21;
 const dx=(bx-ax)/dist,dy=(by-ay)/dist;
 const d='M '+(ax+dx*Math.min(dist*.20,padA)).toFixed(2)+' '+(ay+dy*Math.min(dist*.20,padA)).toFixed(2)+' L '+(bx-dx*Math.min(dist*.20,padB)).toFixed(2)+' '+(by-dy*Math.min(dist*.20,padB)).toFixed(2);
 return svg('path',{d,class:dash(kind)});
}
function draw(p){
 cancelMotion();
 const lines=$('playPaths'),screens=$('screens'),players=$('players');clear(lines);clear(screens);clear(players);
 if(p.referenceOnly)return;
 const st=p.steps[state.step];
 const from=sourceIndex(p,state.step);
 const prior=p.steps[from]||st;
 let showImplicit=state.step>0&&!st.legacy&&!st.arrows;
 if(st.arrows?.length){
  for(const arrow of st.arrows){const a=drawArrow(arrow.from,arrow.to,arrow.kind);if(a)lines.append(a);}
 }else if(showImplicit){
  // This stage is a snapshot after the action, so render the action taken from the previous state.
  st.pos.forEach((pt,i)=>{const before=prior.pos[i];if(Math.hypot(before[0]-pt[0],before[1]-pt[1])>21){const a=drawArrow(before,pt,'move');if(a)lines.append(a);}});
  if(prior.ball!==st.ball){const a=drawArrow(prior.pos[prior.ball-1],st.pos[st.ball-1],'pass');if(a)lines.append(a);}
 }
 if(st.shot){
  const a=drawArrow(st.pos[st.shot-1],[250,52.5],'shot');if(a)lines.append(a);
 }
 if(st.screenLine){
  const [x1,y1]=mirror(st.screenLine.from),[x2,y2]=mirror(st.screenLine.to);
  screens.append(svg('path',{d:'M '+x1+' '+y1+' L '+x2+' '+y2,class:'screen-line'}));
 }
 for(const n of st.screen||[]){
  const [x,y]=mirror(st.screenAt?.[n]??st.pos[n-1]);
  // Show the screener's facing angle with a short perpendicular bar beside the jersey.
  // The angle is mirrored alongside the offensive alignment.
  const degrees=Number(st.screenAngles?.[n]??0)*(state.flip?-1:1);
  const radians=degrees*Math.PI/180;
  const cx=x+Math.sin(radians)*25,cy=y+Math.cos(radians)*25;
  const dx=Math.cos(radians)*21,dy=Math.sin(radians)*21;
  const d='M '+(cx-dx).toFixed(2)+' '+(cy-dy).toFixed(2)+' L '+(cx+dx).toFixed(2)+' '+(cy+dy).toFixed(2);
  screens.append(svg('path',{d,class:'screen-line'}));
 }
 // Animated player transforms use one scale, one timing and one jersey design in both teams.
 const shouldAnimate=!st.legacy&&!prior.legacy&&state.fromStep!==null&&state.fromStep===from&&window.matchMedia('(prefers-reduced-motion:reduce)').matches===false;
 const fromPositions=shouldAnimate?prior.pos:st.pos;
 const serial=state.serial;
 for(let i=0;i<5;i++){
  const [x,y]=mirror(st.pos[i]),[sx,sy]=mirror(fromPositions[i]);
  const g=svg('g',{class:'player',transform:'translate('+sx+' '+sy+')'});
  g.append(svg('circle',{class:'base',cx:0,cy:0,r:20.5}));
  g.append(svg('text',{x:0,y:1},String(i+1)));
  if(!st.ballPosition&&st.ball===i+1){
   g.append(svg('circle',{class:'ball-circle',cx:17,cy:-17,r:8}));
   g.append(svg('path',{d:'M 11 -17 H 23 M 17 -23 V -11',stroke:'#8d4c19','stroke-width':1.15}));
  }
  players.append(g);
  if(shouldAnimate&&(Math.abs(sx-x)+Math.abs(sy-y)>1)){
   state.raf=requestAnimationFrame(()=>{if(serial!==state.serial)return;requestAnimationFrame(()=>{if(serial===state.serial)g.setAttribute('transform','translate('+x+' '+y+')');});});
  }
 }
 if(st.ballPosition){
  const [bx,by]=mirror(st.ballPosition);
  const ball=svg('g',{class:'ball-marker',transform:'translate('+bx+' '+by+')'});
  ball.append(svg('circle',{cx:0,cy:0,r:9,fill:'#ee9d33',stroke:'#75471a','stroke-width':2}));
  ball.append(svg('path',{d:'M -7 0 H 7 M 0 -7 V 7 M -5 -5 Q 0 0 -5 5 M 5 -5 Q 0 0 5 5',fill:'none',stroke:'#75471a','stroke-width':1.15}));
  players.append(ball);
 }
 state.fromStep=null;
}
function timeline(p){
 const e=$('timeline');clear(e);if(p.referenceOnly)return;
 p.steps.forEach((st,i)=>{
  const b=document.createElement('button');b.type='button';b.className=i===state.step?'selected':'';b.setAttribute('aria-pressed',String(i===state.step));
  if(st.branch)b.dataset.branch=st.branch;
  const n=document.createElement('span');n.className='timeline-index';n.textContent=String(i+1).padStart(2,'0');
  b.append(n,document.createTextNode(st.label));
  b.addEventListener('click',()=>{pause();changeStep(i);});e.append(b);
 });
}
function showNotes(p){
 $('boardHeading').textContent=p.title+' · '+p.call;
 $('playCategory').textContent=catName(p.cat);
 $('playCall').textContent=p.call;
 $('playTitle').textContent=p.title;
 $('playSummary').textContent=p.summary;
 $('playTip').textContent=p.tip;
 favoriteControl($('star'),p.id,true);
 $('slideLink').href=source(p);$('slideLink').querySelector('span').textContent=labelSource(p);
 $('videoLink').hidden=!p.video;if(p.video)$('videoLink').href=p.video;
 const ref=!!p.referenceOnly;
 $('referenceOverlay').hidden=!ref;
 $('branchNote').hidden=true;
 $('overlaySource').href=source(p);
 $('transport').hidden=ref;$('timeline').hidden=ref;$('stepBox').hidden=ref;
 if(ref){pause();return;}
 const st=p.steps[state.step];const count=p.steps.length;
 $('currentNumber').textContent=String(state.step+1).padStart(2,'0')+' / '+String(count).padStart(2,'0');
 $('stepTitle').textContent=st.label;$('stepDescription').textContent=st.detail||'';
 $('progressText').textContent=(state.step+1)+' / '+count;
 $('prev').disabled=state.step===0;
 $('first').disabled=state.step===0;
 $('next').disabled=branchNext(p,state.step)===null;
 const hasBranch=p.steps.some(s=>s.branch);
 $('branchNote').hidden=!hasBranch;
 if(hasBranch)$('branchNote').textContent='마지막 찬스는 선택지입니다. 옵션 A/B는 이어지는 동작이 아니므로 원하는 옵션을 직접 선택하세요.';
 timeline(p);
}
function setURL(){
 try{
  const u=new URL(location.href);u.searchParams.set('play',state.id);
  if(state.step)u.searchParams.set('step',String(state.step+1));else u.searchParams.delete('step');
  if(state.flip)u.searchParams.set('flip','1');else u.searchParams.delete('flip');
  history.replaceState(null,'',u);
 }catch(e){}
}
function render(){
 if(!ALL.length)return;
 const p=selectPlay();
 layoutCategories();listPlays();showNotes(p);paintCourt();draw(p);
 $('countPlays').textContent=String(ALL.length);
 $('countMotion').textContent=String(ALL.filter(x=>!x.referenceOnly).length);
 $('flip').setAttribute('aria-pressed',String(state.flip));
 $('saveSvg').disabled=!!p.referenceOnly;
 setURL();
}
function changeStep(step){
 const p=selectPlay();if(p.referenceOnly||step<0||step>=p.steps.length)return;
 const old=state.step;state.fromStep=(step===old+1||p.steps[step]?.branchFrom===old)?old:null;
 state.step=step;render();
}
function auto(){
 const p=selectPlay();if(p.referenceOnly)return;
 if(state.timer!==null){pause();return;}
 if(branchNext(p,state.step)===null)changeStep(0);
 $('autoplay').textContent='Ⅱ 일시정지';
 state.timer=setInterval(()=>{
  const next=branchNext(selectPlay(),state.step);
  if(next===null){pause();return;}
  changeStep(next);
  if(branchNext(selectPlay(),state.step)===null)pause();
 },2600);
}
function saveSvg(){
 const p=selectPlay();if(p.referenceOnly)return;
 const copy=$('court').cloneNode(true),st=p.steps[state.step];
 copy.setAttribute('xmlns',NS);copy.setAttribute('width','1000');copy.setAttribute('height','1018');
 const style=svg('style',{},'.movement{fill:none;stroke:#286baf;stroke-width:3.7;marker-end:url(#cutHead)} .passing{fill:none;stroke:#d4554c;stroke-width:3.4;stroke-dasharray:8 6;marker-end:url(#passHead)} .shooting{fill:none;stroke:#c89429;stroke-width:3.6;stroke-dasharray:3 6;marker-end:url(#shotHead)} .screen-line{fill:none;stroke:#7045a2;stroke-width:6;stroke-linecap:round} .player .base{fill:#285f94;stroke:#fff7e6;stroke-width:3.3}.player text{font-size:20px;font-weight:850;fill:white;text-anchor:middle;dominant-baseline:middle}.ball-circle{fill:#ee9d33;stroke:#75471a;stroke-width:2}');
 copy.insertBefore(style,copy.firstChild);
 copy.querySelectorAll('g.player').forEach((g,i)=>{const [x,y]=mirror(st.pos[i]);g.setAttribute('transform','translate('+x+' '+y+')');});
 const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'});
 const uri=URL.createObjectURL(blob),a=document.createElement('a');a.href=uri;a.download=meta.team+'_'+p.id+'_step'+(state.step+1)+'.svg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1200);
}
function copyLink(){
 const txt=$('copyLink').querySelector('span'),old=txt.textContent;
 const done=s=>{txt.textContent=s;setTimeout(()=>txt.textContent=old,1700);};
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(location.href).then(()=>done('링크 복사 완료')).catch(()=>done('주소창에서 복사하세요'));
 else done('주소창에서 복사하세요');
}
$('search').addEventListener('input',e=>{state.search=e.target.value;listPlays();});
$('favOnly').addEventListener('click',()=>{state.onlyFav=!state.onlyFav;listPlays();});
$('star').addEventListener('click',()=>toggleFavorite(state.id));
$('prev').addEventListener('click',()=>{pause();changeStep(prevStep(selectPlay(),state.step));});
$('next').addEventListener('click',()=>{pause();const n=branchNext(selectPlay(),state.step);if(n!==null)changeStep(n);});
$('first').addEventListener('click',()=>{pause();changeStep(0)});
$('autoplay').addEventListener('click',auto);
$('flip').addEventListener('click',()=>{cancelMotion();state.flip=!state.flip;state.fromStep=null;render();});
$('saveSvg').addEventListener('click',saveSvg);
$('copyLink').addEventListener('click',copyLink);
document.addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName))return;
 if(e.key==='ArrowLeft'){pause();changeStep(prevStep(selectPlay(),state.step));e.preventDefault();}
 if(e.key==='ArrowRight'){pause();const n=branchNext(selectPlay(),state.step);if(n!==null)changeStep(n);e.preventDefault();}
 if(e.key===' '){auto();e.preventDefault();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
try{
 const params=new URL(location.href).searchParams;
 const p=ALL.find(x=>x.id===params.get('play'));if(p){state.id=p.id;const num=Number(params.get('step'));if(Number.isInteger(num)&&num>0)state.step=Math.min(num-1,p.steps.length-1);}
 state.flip=params.get('flip')==='1';
}catch(e){}
render();
})();