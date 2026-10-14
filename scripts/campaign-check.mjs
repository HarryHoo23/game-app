import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
try {
 await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Choose a level'}).click();await page.locator('[data-level="1"]').waitFor();assert.equal(await page.locator('[data-level]:disabled').count(),9);
 await page.locator('[data-level="1"]').click();await page.locator('[data-score]').waitFor();
 const box=await page.locator('canvas').boundingBox();const x=n=>box.x+n*box.width/400,y=n=>box.y+n*box.height/712;
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Keep playing'}).click();
 await page.mouse.move(x(200),y(620));await page.mouse.down();await page.mouse.up();assert.equal(await page.locator('[data-shots]').innerText(),'10');
 // Repeated real pointer shots, with state inspected only to await the next ball.
 for(let shot=0;shot<10;shot++){
  await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return s.scene.isActive()&&!s.session.inFlight&&!s.settled});
  await page.mouse.move(x(200),y(620));await page.mouse.down();await page.mouse.move(x(200),y(474),{steps:12});await page.mouse.up();
  console.log('Launched',shot+1,await page.locator('[data-shots]').innerText());
  if(shot===9){assert.equal(await page.locator('[data-shots]').innerText(),'0');assert.equal(await page.locator('.result-content').count(),0)}
  if(shot===0){await page.waitForTimeout(500);await page.getByRole('button',{name:'Pause',exact:true}).click();const position=await page.evaluate(()=>window.afterHours.scene.getScene('Game').physicsCourt.ball.y);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.afterHours.scene.getScene('Game').physicsCourt.ball.y),position);await page.getByRole('button',{name:'Keep playing'}).click()}
 }
 await page.locator('.result-content').waitFor();await page.screenshot({path:'test-results/result-mobile.png'});console.log('Result',await page.locator('.result-content').innerText());
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('afterhours.progress.v1')));assert.equal(saved.highestUnlockedLevel,2);assert.equal(saved.stars[1],3);assert.equal(saved.coins,96);
 await page.reload();await page.getByRole('button',{name:'Choose a level'}).click();await page.locator('[data-level="2"]').waitFor();assert.equal(await page.locator('[data-level]:disabled').count(),8);await page.screenshot({path:'test-results/levels-mobile.png'});
 await page.getByRole('button',{name:'Visit the locker room'}).click();await page.locator('.gear-card').first().waitFor();await page.screenshot({path:'test-results/gear-mobile.png'});assert.equal(await page.locator('[data-upgrade]:disabled').count(),4);
 assert.deepEqual(errors,[]);console.log('Campaign: real shots, last airborne shot, pause, three stars, reward, unlock, reload and gear passed.');
} catch(e) {console.log('FAILURE STATE',await page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game');return {ui:document.querySelector('#ui').innerText,session:s.session,settled:s.settled,settling:s.settling,paused:s.paused,active:window.afterHours.scene.getScenes(true).map(s=>s.scene.key)}}));await page.screenshot({path:'test-results/failure.png'});throw e} finally {await browser.close()}
