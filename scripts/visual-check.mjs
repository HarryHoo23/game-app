import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:430,height:820}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Hit the court'}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);await page.screenshot({path:'test-results/premium-home.png'});
 await page.getByRole('button',{name:'Hit the court'}).click();await page.locator('[data-score]').waitFor();await page.waitForTimeout(350);await page.screenshot({path:'test-results/premium-game.png'});
 const box=await page.locator('canvas').boundingBox();const x=n=>box.x+n*box.width/400,y=n=>box.y+n*box.height/712;
 await page.mouse.move(x(200),y(620));await page.mouse.down();await page.mouse.move(x(200),y(474),{steps:12});await page.screenshot({path:'test-results/premium-aim.png'});await page.mouse.up();
 await page.waitForFunction(()=>Number(document.querySelector('[data-score]').textContent)>0);await page.screenshot({path:'test-results/premium-score.png'});assert.equal(await page.locator('[data-score]').innerText(),'4');assert.deepEqual(errors,[]);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Back to levels',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Toggle sound'}).click();assert.match(await page.locator('[data-sound-label]').innerText(),/ON/);assert.equal(await page.locator('[data-sound] svg').count(),1);
 const small=await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true});await small.goto('http://localhost:5173');await small.getByRole('button',{name:'Hit the court'}).waitFor();await small.waitForTimeout(600);await small.screenshot({path:'test-results/premium-small.png'});await small.getByRole('button',{name:'Hit the court'}).click();await small.locator('[data-score]').waitFor();await small.screenshot({path:'test-results/premium-small-game.png'});
 console.log('Visual check: real basket, home sound icon, screenshots at 430 and 320 widths; no page errors.');
} finally {await browser.close()}
