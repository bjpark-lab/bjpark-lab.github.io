const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),target=path.join(root,'ssit/plays.js');
const environment={window:{}};
vm.runInNewContext(fs.readFileSync(target,'utf8'),environment,{filename:target,timeout:3000});
const plays=environment.window.PLAYBOOK_PLAYS||[];
const errors=[],ids=new Set();
let nFrames=0,nPpt=0,nRich=0;
const assert=(ok,msg)=>{if(!ok)errors.push(msg)};
assert(plays.length===15,'SSIT expected 15 tactics');
for(const p of plays){
 assert(!ids.has(p.id),'Duplicate ID '+p.id);ids.add(p.id);
 const snapshot=!!p.steps[0]?.legacy;snapshot?nPpt++:nRich++;
 if(snapshot)assert(p.steps.every(s=>s.legacy&&s.snapshot),'PPT frames must stay snapshots '+p.id);
 const url=p.sourceUrl||'';
 if(url.startsWith('/basketball/')){
  const rel=url.slice('/basketball/'.length);
  const disk=path.join(root,rel.endsWith('/')?rel+'index.html':rel);
  assert(fs.existsSync(disk),'Broken source link '+p.id+' '+rel);
 }
 for(let i=0;i<p.steps.length;i++){
  const st=p.steps[i],label=p.id+' #'+(i+1);nFrames++;
  assert(Array.isArray(st.pos)&&st.pos.length===5,'Five players '+label);
  assert(st.ball>=1&&st.ball<=5,'Holder index '+label);
  if(!Array.isArray(st.pos)||st.pos.length!==5)continue;
  if(snapshot){
   assert(st.ballPosition?.length===2,'Exact PPT ball marker '+label);
   assert(Array.isArray(st.arrows),'Original PPT arrows '+label);
  }
  for(let no=0;no<5;no++){
   const pos=st.pos[no];
   if(!Array.isArray(pos)||pos.length!==2||pos.some(x=>!Number.isFinite(x))){errors.push('Invalid position '+label+' p'+(no+1));continue;}
   const outside=pos[0]<0||pos[0]>500||pos[1]<0||pos[1]>510;
   assert(!outside||st.outside?.includes(no+1),'Out of court without inbound exception '+label+' p'+(no+1));
   assert(pos[0]>=-34&&pos[0]<=500&&pos[1]>=-34&&pos[1]<=510,'SVG clipping risk '+label+' p'+(no+1));
   for(let no2=no+1;no2<5;no2++){
    const b=st.pos[no2];if(!Array.isArray(b)||!b.every(Number.isFinite))continue;
    const d=Math.hypot(pos[0]-b[0],pos[1]-b[1]);
    assert(d>=34,'Player overlap '+label+' p'+(no+1)+'/'+(no2+1)+' d='+d.toFixed(1));
   }
  }
  if(st.ballPosition)assert(st.ballPosition.every(Number.isFinite),'Ball position invalid '+label);
  for(const n of st.screen||[]){
   assert(n>=1&&n<=5,'Invalid screener '+label);
   if(st.screenAt?.[n])assert(st.screenAt[n].every(Number.isFinite),'Invalid screenAt '+label);
  }
  if(st.branch)assert(Number.isInteger(st.branchFrom)&&st.branchFrom<i&&st.branchFrom>=0,'Bad option '+label);
 }
}
for(const p of plays.filter(p=>p.steps[0].legacy)){
 if(['basic','elevator'].includes(p.id))assert(p.steps.every(s=>s.outside?.includes(1)&&s.pos[0][1]<0),'Inbounder outside baseline '+p.id);
 if(p.id==='side-line')assert(p.steps.every(s=>s.outside?.includes(1)&&s.pos[0][0]<0),'Inbounder outside sideline');
}
const corners=[['horn-up',2,'left'],['horn-up',3,'right'],['horns-flare',2,'left'],['horns-flare',3,'right'],['horns-pin-down',2,'right'],['horns-pin-down',3,'left'],['post-flare',3,'left'],['horn-down',2,'right'],['horn-down',3,'left'],['fiveout-one',4,'left'],['fiveout-one',5,'right'],['fiveout-two',4,'left'],['fiveout-two',5,'right']];
for(const [id,num,side] of corners){
 const play=plays.find(x=>x.id===id);
 const [x,y]=play.steps[0].pos[num-1];
 assert((side==='left'?x<=30:x>=470)&&y>=25&&y<=130,'Corner must be beyond 3 point line '+id+' '+num+' '+x+','+y);
}
const source=fs.readFileSync(path.join(root,'shared/playbook.js'),'utf8');
assert(source.includes('!st.legacy&&!prior.legacy'),'PPT frames should not animate a movement between diagrams');
assert(source.includes('st.ballPosition'),'Independent original PPT ball marks lost');

// Screens that are explicitly specified by the SSIT play definitions must be visible.
// Generic movement diagrams without verified screener roles must NOT gain invented screens.
const requiredScreens=[
 ['horn-zoom',0,4,'4→2 핀다운'],
 ['horn-zoom',1,3,'3→2 DHO'],
 ['elevator',0,4,'4번 스크린'],
 ['elevator',0,5,'5번 스크린'],
 ['elevator',1,4,'4번 스크린'],
 ['elevator',1,5,'5번 스크린'],
 ['horn-down',0,4,'4번 다운스크린'],
 ['horn-down',0,5,'5번 다운스크린'],
 ['horn-down',1,4,'4번 스크린'],
 ['horn-down',1,5,'5번 스크린'],
 ['spain-pnr',1,5,'5→1 온볼'],
 ['spain-pnr',2,2,'2→5 백스크린']
];
for(const [id,index,no,text] of requiredScreens){
 const step=plays.find(p=>p.id===id)?.steps[index];
 assert(!!step,'Missing documented screen stage '+id+'/'+index);
 if(step){
   assert(step.screen?.includes(no),'Missing screener '+id+'/'+index+'/'+no);
   assert(step.screenLabels?.[no]===text,'Missing screen label '+id+'/'+index+'/'+no);
   assert(Number.isFinite(step.screenAngles?.[no]),'Missing screen angle '+id+'/'+index+'/'+no);
 }
}
const unconfirmed=['basic','horn-swing','side-line','fiveout-one','fiveout-two'];
for(const id of unconfirmed){
 const p=plays.find(x=>x.id===id);
 assert(!!p&&p.steps.every(s=>(s.screen||[]).length===0),'Unconfirmed screen was invented for '+id);
}
assert(source.includes('st.screenLabels?.[n]'),'Visual renderer must draw screen labels');

console.log('SSIT GEOMETRY AUDIT',JSON.stringify({plays:plays.length,originalPpt:nPpt,detailed:nRich,stages:nFrames,issues:errors}));
if(errors.length)process.exit(1);
