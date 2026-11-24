/* Validate pairwise screen geometry across both team libraries and both orientations. */
const path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const geom=require('../shared/screen-geometry.js');
const errors=[];
const check=(v,msg)=>{if(!v)errors.push(msg)};
let total=0,sourceTotal=0;
for(const team of ['ssit','more']){
 const sandbox={window:{}};
 const file=path.join(__dirname,'..',team,'plays.js');
 vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file,timeout:6000});
 for(const play of sandbox.window.PLAYBOOK_PLAYS){
  for(let i=0;i<play.steps.length;i++){
   const stage=play.steps[i],count=stage.screen?.length||0;
   for(const l of stage.sourceScreenLines||[]){sourceTotal++;check([l.from,l.to].every(pt=>pt?.length===2&&pt.every(Number.isFinite)),team+'/'+play.id+' invalid original screen coordinates');}
   for(const n of stage.screen||[])check(stage.screenApproach?.[n]?.length===2,team+'/'+play.id+' missing approach direction');
   for(const flip of [false,true]){
    const marks=geom.layoutScreens(stage,{flip});
    check(marks.length===count,team+'/'+play.id+' step '+i+' screen count');
    for(const m of marks){
     total++;
     const key=team+'/'+play.id+' step '+(i+1)+' screener '+m.screener+(flip?' flipped':'');
     check(m.target>=1&&m.target<=5&&m.target!==m.screener,key+' must link to receiver');
     if(!m.targetPos)continue;
     const v=[m.targetPos[0]-m.source[0],m.targetPos[1]-m.source[1]];
     const b=[m.to[0]-m.from[0],m.to[1]-m.from[1]];
     const len=Math.hypot(...v),bLen=Math.hypot(...b);
     check(len>2&&Math.abs((v[0]*b[0]+v[1]*b[1])/(len*bLen))<.00001,key+' bar not perpendicular to players');
     check(bLen>35&&bLen<46,key+' bar length');
     const bar=[(m.from[0]+m.to[0])/2,(m.from[1]+m.to[1])/2];
     const t=((bar[0]-m.source[0])*v[0]+(bar[1]-m.source[1])*v[1])/(len*len);
     check(t>=-.001&&t<=.501,key+' bar not between players');
     check(m.linkDistance<70,key+' label too far from midpoint');
     const l=m.label;
     check(l.x-l.width/2>=-1&&l.x+l.width/2<=501&&l.y-l.height/2>=-1&&l.y+l.height/2<=511,key+' label clipped');
     const all=stage.pos.map(pos=>flip?[500-pos[0],pos[1]]:pos);
     const collisions=[];
     for(let n=0;n<all.length;n++){
       const dx=Math.max(0,Math.abs(all[n][0]-l.x)-l.width/2);
       const dy=Math.max(0,Math.abs(all[n][1]-l.y)-l.height/2);
       if(Math.hypot(dx,dy)<19)collisions.push(n+1);
     }
     check(!collisions.length,key+' label covers player '+collisions.join(','));
    }
   }
  }
 }
}
console.log('SCREEN LAYOUT AUDIT',JSON.stringify({teams:['ssit','more'],markersPerOrientation:total/2,sourceAndExampleBars:sourceTotal,checkedOrientations:2,errors}));
if(errors.length)process.exit(1);
