const { chromium, devices } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://bjpark-lab.github.io/basketball/';
const ART = path.join(process.cwd(), 'basketball-smoke-artifacts');
fs.mkdirSync(ART, { recursive: true });
const errors = [];
const record = (name, ok, detail = '') => {
  const line = (ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : '');
  console.log(line);
  if (!ok) errors.push(line);
};
const assert = (v, label) => { if (!v) throw new Error(label); };
const sites = [
  { team: 'SSIT', route: 'ssit/', count: 15, first: '베이스 패턴', firstId: 'basic', deep: 'post-split' },
  { team: 'MORE', route: 'more/', count: 22, first: '핀다운', firstId: 'pin-down', deep: 'spain' }
];
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const mode of ['desktop','mobile']) {
      const context = await browser.newContext(mode === 'mobile'
        ? { viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true }
        : { viewport:{width:1440,height:900},deviceScaleFactor:1 });
      for (const item of sites) {
        const page = await context.newPage();
        const pageErrors = [];
        const responseErrors = [];
        page.on('pageerror', err => pageErrors.push(err.message));
        page.on('response', r => {
          if (r.status() >= 400 && new URL(r.url()).hostname === 'bjpark-lab.github.io') responseErrors.push(r.status() + ' ' + r.url());
        });
        try {
          const response = await page.goto(BASE+item.route, {waitUntil:'load',timeout:45000});
          assert(response && response.status()===200, 'HTTP '+(response?.status()||'no response'));
          await page.waitForFunction(expected => {
            const count = document.querySelector('#countPlays');
            const title = document.querySelector('#playTitle');
            return count && Number(count.textContent) === expected && title && title.textContent.trim().length > 0;
          }, item.count, {timeout:15000});
          const observed = await page.locator('#countPlays').textContent();
          const firstTitle = await page.locator('#playTitle').textContent();
          assert(Number(observed)===item.count,'count mismatch '+observed);
          assert(firstTitle.trim()===item.first,'first title mismatch '+firstTitle);
          assert(await page.locator('#players .player').count()===5,'initial player count');
          const h = await page.locator('h1').textContent();
          const teamBrand = await page.locator('.brand-name strong').textContent();
          assert(teamBrand.trim()===item.team, 'wrong team brand: '+teamBrand);
          assert(h.includes(item.team==='MORE'?'모어':'SSIT'), 'wrong team heading: '+h);
          // Confirm local assets were actually served: CSS styles and loaded data.
          const hasStyled = await page.locator('.panel').first().evaluate(el =>
            getComputedStyle(el).borderRadius !== '0px' &&
            getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)');
          assert(hasStyled,'stylesheet missing');
          await page.screenshot({path:path.join(ART,mode+'-'+item.team.toLowerCase()+'.png'),fullPage:true});
          const entries = page.locator('#playlist .play-main');
          assert(await entries.count()===item.count,'play list count');
          // Visit every tactic, including source-only diagrams, in the public browser.
          for(let i=0;i<item.count;i++){
            await entries.nth(i).click();
            const active=await page.locator('#playTitle').textContent();
            assert(active && active.trim().length>0,'empty title for play '+i);
            if(mode==='desktop'&&item.team==='SSIT')await page.locator('.court-wrap').screenshot({path:path.join(ART,'ssit-play-'+String(i+1).padStart(2,'0')+'-start.png'),animations:'disabled'});
            const refOnly=await page.locator('#referenceOverlay').isVisible();
            const playerCount=await page.locator('#players .player').count();
            assert(refOnly?playerCount===0:playerCount===5,'player count for '+active+': '+playerCount);
            if(!refOnly){
              const stageButtons=await page.locator('#timeline button').count();
              assert(stageButtons>0,'missing timeline for '+active);
              await page.locator('#timeline button').last().click();
              assert(await page.locator('#players .player').count()===5,'last stage player count for '+active);
              if(mode==='desktop'&&item.team==='SSIT'){
                await page.locator('.court-wrap').screenshot({path:path.join(ART,'ssit-play-'+String(i+1).padStart(2,'0')+'-last.png'),animations:'disabled'});
              }
              if(mode==='desktop'&&item.team==='MORE'){
                const label=String(i+1).padStart(2,'0');
                await page.locator('.court-wrap').screenshot({
                  path:path.join(ART,'more-play-'+label+'-final.png'),
                  animations:'disabled'
                });
              }
            }
          }
          await entries.first().click();
          assert((await page.locator('#playTitle').textContent()).trim()===item.first,'cannot restore first play');
          await page.locator('#next').click();
          const moved = await page.locator('#stepTitle').textContent();
          assert(moved && moved.length>0,'next step missing');
          await page.locator('#flip').click();
          assert(await page.locator('#flip').getAttribute('aria-pressed')==='true','mirror failed');
          await page.locator('#first').click();
          assert((await page.locator('#progressText').textContent()).startsWith('1 / '),'reset failed');
          await page.locator('#autoplay').click();
          await page.waitForTimeout(3000);
          const progressed = await page.locator('#progressText').textContent();
          assert(!progressed.startsWith('1 / '),'autoplay did not advance');
          // Stop autoplay safely by selecting first stage
          await page.locator('#first').click();
          await page.locator('#star').click();
          assert(await page.locator('#star').getAttribute('aria-pressed')==='true','favorite not selected');
          if (mode==='mobile') {
            const dims = await page.evaluate(()=>({
              innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
              courtWidth:document.querySelector('#court').getBoundingClientRect().width,
              players:document.querySelectorAll('#players .player').length
            }));
            assert(dims.scrollWidth<=dims.innerWidth+3, 'horizontal overflow '+JSON.stringify(dims));
            assert(dims.courtWidth>250 && dims.courtWidth<=dims.innerWidth,'court width bad '+JSON.stringify(dims));
          }
          assert(pageErrors.length===0, 'JS errors: '+pageErrors.join(' | '));
          assert(responseErrors.length===0, 'HTTP asset errors: '+responseErrors.join(' | '));
          record(mode+' '+item.team, true,'HTTP 200; '+item.count+' plays individually checked; first='+firstTitle+'; next, mirror, reset, autoplay, favorite');
        } catch (e) {
          record(mode+' '+item.team, false,e.stack || e.message);
          try{await page.screenshot({path:path.join(ART,mode+'-'+item.team.toLowerCase()+'-failure.png'),fullPage:true});}catch(_) {}
        } finally { await page.close(); }
      }
      await context.close();
    }

    // Check legacy links and direct navigation into specific plays.
    const context = await browser.newContext({viewport:{width:1280,height:900}});
    const page = await context.newPage();
    for (const item of sites) {
      try {
        const response = await page.goto(BASE+item.route+'?play='+item.deep+'&step=2', {waitUntil:'load',timeout:45000});
        assert(response?.status()===200, 'direct link HTTP error');
        await page.waitForSelector('#players .player');
        const heading=await page.locator('#playTitle').textContent();
        const progress=await page.locator('#progressText').textContent();
        assert(progress.startsWith('2 / '),'step query not restored '+progress);
        record('direct '+item.team,true,heading+' '+progress);
      }catch(e){record('direct '+item.team,false,e.message);}
    }

    // Explicit public DOM and screenshot checks for the previously missing screen marks.
    const screenChecks=[
      {play:'horn-zoom',step:1,labels:['4→2 핀다운'],count:1},
      {play:'horn-zoom',step:2,labels:['3→2 DHO'],count:1},
      {play:'elevator',step:1,labels:['4번 스크린','5번 스크린'],count:2},
      {play:'horn-down',step:1,labels:['4번 다운스크린','5번 다운스크린'],count:2},
      {play:'spain-pnr',step:2,labels:['5→1 온볼'],count:1},
      {play:'spain-pnr',step:3,labels:['2→5 백스크린'],count:1}
    ];
    for(const check of screenChecks){
      try{
        const r=await page.goto(BASE+'ssit/?play='+check.play+'&step='+check.step,{waitUntil:'load',timeout:45000});
        assert(r?.status()===200,'status '+r?.status());
        await page.waitForSelector('#players .player');
        const labels=await page.locator('#screens .screen-label text').allTextContents();
        const markers=await page.locator('#screens path.screen-line').count();
        assert(markers>=check.count,'screen bars missing '+JSON.stringify({check,markers}));
        for(const required of check.labels)assert(labels.includes(required),'label missing '+required+' in '+labels);
        await page.locator('.court-wrap').screenshot({
          path:path.join(ART,'ssit-screen-'+check.play+'-'+check.step+'.png'),
          animations:'disabled'
        });
        record('screen '+check.play+' step '+check.step,true,labels.join(' / '));
      }catch(e){record('screen '+check.play+' step '+check.step,false,e.message);}
    }


    // Inspect every screen annotation on the actual public SVG. Positions are
    // measured from rendered paths/labels rather than relying on the layout helper.
    const allScreens = [];
    let allScreensExpected=0;
    for (const team of ['ssit','more']) {
      await page.goto(BASE+team+'/',{waitUntil:'load',timeout:45000});
      const targets=await page.evaluate(()=>window.PLAYBOOK_PLAYS.flatMap(play=>
        play.steps.flatMap((st,i)=>st.screen?.length?[{id:play.id,index:i,screenCount:st.screen.length}]:[])));
      allScreensExpected+=targets.length;
      for (const target of targets) {
        const url=BASE+team+'/?play='+encodeURIComponent(target.id)+'&step='+(target.index+1);
        try {
          const response=await page.goto(url,{waitUntil:'load',timeout:45000});
          assert(response?.status()===200,'HTTP '+response?.status());
          await page.waitForSelector('#players g.player');
          const result=await page.evaluate(()=>{
            const p=window.PLAYBOOK_PLAYS.find(p=>p.id===new URL(location.href).searchParams.get('play'));
            const stage=p.steps[Number(new URL(location.href).searchParams.get('step')||'1')-1];
            const lines=[...document.querySelectorAll('#screens path.screen-line')];
            const labels=[...document.querySelectorAll('#screens g.screen-label')];
            const issue=[];
            if(lines.length!==(stage.screen?.length||0))issue.push('wrong number of purple bars '+lines.length+'/'+stage.screen?.length);
            if(labels.length!==(stage.screen?.length||0))issue.push('wrong number of label boxes '+labels.length+'/'+stage.screen?.length);
            for(const no of stage.screen||[]){
              const target=Number(stage.screenTargets?.[no]);
              const line=lines.find(el=>Number(el.dataset.screener)===no);
              const label=labels.find(el=>Number(el.dataset.screener)===no);
              const s=stage.screenAt?.[no]||stage.pos[no-1];
              const t=stage.screenTargetAt?.[no]||stage.pos[target-1];
              if(!line||!label||!t){issue.push('missing line / target / label '+no);continue;}
              if(Number(line.dataset.target)!==target||Number(label.dataset.target)!==target)issue.push('wrong linked receiver '+no);
              const total=line.getTotalLength(),a=line.getPointAtLength(0),b=line.getPointAtLength(total);
              const vx=t[0]-s[0],vy=t[1]-s[1],lx=b.x-a.x,ly=b.y-a.y;
              const d=Math.hypot(vx,vy),l=Math.hypot(lx,ly);
              if(d<2||l<35||l>46||Math.abs((vx*lx+vy*ly)/(d*l))>.025)issue.push('bar not perpendicular '+no);
              const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
              const proj=((mx-s[0])*vx+(my-s[1])*vy)/(d*d);
              if(proj<-.03||proj>.53)issue.push('bar not in front of screener '+no);
              const rect=label.querySelector('rect'),txt=label.querySelector('text');
              if(!rect||!txt){issue.push('label contents missing '+no);continue;}
              const x=Number(rect.getAttribute('x')),y=Number(rect.getAttribute('y'));
              const w=Number(rect.getAttribute('width')),h=Number(rect.getAttribute('height'));
              const cx=x+w/2,cy=y+h/2,mid=[(s[0]+t[0])/2,(s[1]+t[1])/2];
              if(Math.hypot(cx-mid[0],cy-mid[1])>70)issue.push('label far from pair midpoint '+no);
              if(x<-1||y<-1||x+w>501||y+h>511)issue.push('label clipped '+no);
              if(txt.textContent.trim().length===0)issue.push('empty label '+no);
              const style=getComputedStyle(line);
              if(style.stroke==='none'||parseFloat(style.strokeWidth)<5||style.display==='none')issue.push('invisible purple bar '+no);
              for(let n=0;n<stage.pos.length;n++){
                const c=stage.pos[n];
                const dx=Math.max(0,Math.abs(c[0]-cx)-w/2);
                const dy=Math.max(0,Math.abs(c[1]-cy)-h/2);
                if(Math.hypot(dx,dy)<18.5)issue.push('label covers player '+(n+1)+' for screen '+no);
              }
            }
            return {errors:issue,barCount:lines.length};
          });
          assert(result.errors.length===0,JSON.stringify({team,target,errors:result.errors}));
          const dir=path.join(ART,'screen-audit',team);
          fs.mkdirSync(dir,{recursive:true});
          await page.locator('.court-wrap').screenshot({
            path:path.join(dir,target.id+'-'+String(target.index+1).padStart(2,'0')+'.png'),animations:'disabled'
          });
          allScreens.push({team,id:target.id,step:target.index+1,bars:result.barCount});
        } catch(e) {
          record('screen layout '+team+' '+target.id+' '+(target.index+1),false,e.message);
        }
      }
    }
    record('all screen layouts',allScreens.length===allScreensExpected,
      allScreens.length+' checked diagrams, '+allScreens.reduce((n,s)=>n+s.bars,0)+' screen bars');

    try {
      await page.goto(BASE+'ssit/plays/horns-up/',{waitUntil:'load',timeout:45000});
      await page.waitForURL('**/basketball/ssit/?play=horn-up**',{timeout:20000});
      record('SSIT legacy redirect',true,page.url());
    }catch(e){record('SSIT legacy redirect',false,e.message);}
    await context.close();
  } finally { await browser.close(); }
  console.log('BROWSER_SMOKE_REPORT '+JSON.stringify({passed:errors.length===0,failures:errors.length,screenshots:ART}));
  if(errors.length) process.exitCode=1;
})().catch(err=>{console.error('FATAL_BROWSER_SMOKE',err);process.exitCode=1;});