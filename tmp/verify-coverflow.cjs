const { chromium } = require('C:/Users/moroz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'chrome', headless:true});
 try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:1000});
   await page.goto('http://127.0.0.1:8765/index.html?preview=coverflow');
   await page.evaluate(() => document.fonts.ready);
   const reject = page.getByRole('button',{name:'Rifiuta',exact:true});
   if (await reject.isVisible()) await reject.click();
   await page.mouse.move(0,0);
   await page.locator('.hero-project-next').click();
   await page.waitForTimeout(650);
   assert.equal(await page.locator('.hero-project-card.is-active').getAttribute('data-project'),'1');
   assert.equal(await page.locator('.hero-project-details:visible').count(),1);
   const layout = await page.evaluate(() => {
    const card=document.querySelector('.hero-project-card.is-active').getBoundingClientRect();
    const deck=document.querySelector('.hero-project-deck').getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth>innerWidth, contained:card.top>=deck.top && card.bottom<=deck.bottom, values:[...document.querySelectorAll('.hero-project-card.is-active .hero-project-metrics strong')].every(el=>el.scrollWidth<=el.parentElement.clientWidth), card:card.toJSON(), deck:deck.toJSON()};
   });
   assert.equal(layout.overflow,false,'overflow '+width);
   assert(layout.contained,JSON.stringify(layout));
   assert(layout.values,'values overflow '+width);
   await page.locator('.hero-projects').evaluate(el=>el.scrollIntoView({block:'center'}));
   await page.locator('.hero-projects').screenshot({path:'tmp/coverflow-'+width+'.png'});
   console.log('Layout OK '+width);
  }
  await page.locator('.hero-project-next').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.hero-project-card.is-active').getAttribute('data-project'),'2');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.hero-project-details:visible').count(),0);
  await page.waitForTimeout(650);
  await page.locator('.hero-project-card.is-active button').hover();
  await page.waitForTimeout(950);
  assert.equal(await page.locator('.hero-project-details:visible').count(),1,'hover should expand');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.hero-project-next').click();
  assert.equal(await page.locator('.hero-project-card.is-active').getAttribute('data-project'),'3');
  assert.deepEqual(errors,[]);
  assert.equal(await page.locator('#perche').count(),1);
  console.log('Keyboard, hover, reduced motion and sections OK');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const touch=await mobile.newPage();
  await touch.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await touch.goto('http://127.0.0.1:8765/index.html');
  await touch.getByRole('button',{name:'Rifiuta',exact:true}).click();
  await touch.locator('.hero-project-card.is-active button').tap();
  assert.equal(await touch.locator('.hero-project-details:visible').count(),1);
  await touch.locator('.hero-project-next').tap();
  assert.equal(await touch.locator('.hero-project-card.is-active').getAttribute('data-project'),'1');
  console.log('Touch OK');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.mouse.move(0,0);
  await page.waitForTimeout(7400);
  assert.equal(await page.locator('.hero-project-card.is-active').getAttribute('data-project'),'1','autoplay');
  await page.locator('.hero-project-card.is-active button').hover();
  await page.waitForTimeout(8000);
  assert.equal(await page.locator('.hero-project-card.is-active').getAttribute('data-project'),'1','pause on hover');
  console.log('Autoplay and hover pause OK');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
