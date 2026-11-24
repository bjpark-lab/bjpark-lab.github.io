// Fail the Pages build when MORE positions cannot be rendered on the standard half court.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = path.resolve(__dirname,'../more/plays.js');
const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(source,'utf8'),sandbox,{filename:source,timeout:3000});
const plays = sandbox.window.PLAYBOOK_PLAYS;
const errors = [],checks=[];
if(!Array.isArray(plays)||plays.length!==22)errors.push('Expected 22 MORE plays');
const ids = new Set(),reconstructed=[];
for(const play of plays||[]){
 if(ids.has(play.id))errors.push('Duplicate play '+play.id);ids.add(play.id);
 if(!play.sourceId)errors.push('Missing source slide '+play.id);
 if(play.referenceOnly){if(play.steps.length)errors.push('Reference-only play has fictional stages '+play.id);continue;}
 reconstructed.push(play);
 if(play.steps.length<2)errors.push('Insufficient steps '+play.id);
 for(let index=0;index<play.steps.length;index++){
  const step=play.steps[index],loc=play.id+' #'+(index+1);
  if(!Array.isArray(step.pos)||step.pos.length!==5){errors.push('Wrong lineup '+loc);continue;}
  if(!Number.isInteger(step.ball)||step.ball<1||step.ball>5)errors.push('Invalid ball handler '+loc);
  for(let i=0;i<5;i++){
   const pt=step.pos[i];
   if(!Array.isArray(pt)||pt.length!==2||pt.some(n=>typeof n!=='number'||!Number.isFinite(n))){errors.push('Invalid coords '+loc+' p'+(i+1));continue;}
   if(pt[0]<-35||pt[0]>500||pt[1]<0||pt[1]>510)errors.push('Off court '+loc+' p'+(i+1));
   for(let j=i+1;j<5;j++){
    const other=step.pos[j];if(!other||!other.every(Number.isFinite))continue;
    const spacing=Math.hypot(pt[0]-other[0],pt[1]-other[1]);
    if(spacing<34)errors.push('Overlapping players '+loc+' '+(i+1)+'/'+(j+1)+' distance '+spacing.toFixed(1));
   }
  }
  for(const n of step.screen||[])if(!Number.isInteger(n)||n<1||n>5)errors.push('Invalid screener '+loc);
  if(step.branch){
   if(!Number.isInteger(step.branchFrom)||step.branchFrom>=index||step.branchFrom<0)errors.push('Invalid branch '+loc);
  }
  if(step.continueFrom!==undefined&&(step.continueFrom!==index-1||!Number.isInteger(step.continueFrom)))errors.push('Bad continuation '+loc);
 }
}
const corners={ 'pin-down':[2],'hammer':[2],'stagger':[2],'zoom':[2],'iverson-2':[3],'iverson-4':[3],'iverson-5':[3],'double-stagger':[2,3],'77':[2,3] };
for(const [id,nums] of Object.entries(corners)){
 const play=plays.find(x=>x.id===id);if(!play){errors.push('Missing '+id);continue;}
 for(const no of nums){
  const [x,y]=play.steps[0].pos[no-1];
  if(!(x<=30||x>=470)||y<50||y>130)errors.push('Shooter not outside corner 3PT '+id+' p'+no+' at '+x+','+y);
 }
}
const sa=plays.find(x=>x.id==='sa'),iv=plays.find(x=>x.id==='iverson-5'),drag=plays.find(x=>x.id==='77');
if(sa?.steps.filter(s=>s.branch).length!==3)errors.push('SA should have three independent inbound reads');
if(iv?.steps.filter(s=>s.branch).length!==2)errors.push('Iverson-5 needs two separate reads');
if(drag?.steps.filter(s=>s.branch).length!==2)errors.push('77 must show POP and ROLL');
console.log('MORE GEOMETRY AUDIT',JSON.stringify({plays:plays.length,reconstructed:reconstructed.length,sourceOnly:plays.length-reconstructed.length,stages:plays.reduce((n,p)=>n+p.steps.length,0),cornerRules:Object.keys(corners).length,errors}));
if(errors.length)process.exit(1);