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
          assert(h.includes(item.team), 'wrong team heading: '+h);
          // Confirm local assets were actually served: CSS styles and loaded data.
          const hasStyled = await page.locator('.panel').first().evaluate(el =>
            getComputedStyle(el).borderRadius !== '0px' &&
            getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)');
          assert(hasStyled,'stylesheet missing');
          await page.screenshot({path:path.join(ART,mode+'-'+item.team.toLowerCase()+'.png'),fullPage:true});
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
          record(mode+' '+item.team, true,'HTTP 200; '+item.count+' plays; first='+firstTitle+'; next, mirror, reset, autoplay, favorite');
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