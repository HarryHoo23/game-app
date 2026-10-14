import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:400,height:712},recordVideo:{dir:'test-results/shot-video',size:{width:400,height:712}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game');return {active:s.shot.active,elapsed:s.shot.elapsedMs,pose:s.shot.pose,plan:s.shot.currentPlan,score:s.session.score,remaining:s.session.remaining,settled:s.settled,paused:s.paused,bodyStatic:s.physicsCourt.ball.body.isStatic,image:{x:s.ballView.image.x,y:s.ballView.image.y,width:s.ballView.image.displayWidth,height:s.ballView.image.displayHeight,rotation:s.ballView.image.rotation}}});
async function ready(){await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return !s.session.inFlight&&!s.settled})}
async function drag(dx,dy){await page.mouse.move(200,620);await page.mouse.down();await page.mouse.move(200+dx,620+dy,{steps:12})}
try {
 await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Hit the court'}).click();await page.locator('[data-score]').waitFor();
 await drag(0,-146);await page.waitForTimeout(60);await page.screenshot({path:'test-results/feel-aim.png'});let s=await state();assert.ok(s.image.height<144);assert.ok(s.image.width>144);await page.mouse.up();
 await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').shot.elapsedMs>=30);s=await state();assert.equal(s.score,0);assert.equal(s.bodyStatic,true);assert.equal(s.plan.durationMs,880);assert.ok(s.image.height>s.image.width);await page.screenshot({path:'test-results/feel-release.png'});
 await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').shot.elapsedMs>=400);s=await state();assert.equal(s.active,true);assert.equal(s.score,0);assert.ok(s.image.width<144&&s.image.width>64);assert.ok(s.pose.rotation<0);assert.ok(Math.abs(Math.sin(s.image.rotation)-Math.sin(s.pose.rotation))<.01);await page.screenshot({path:'test-results/feel-flight.png'});
 await page.waitForFunction(()=>Number(document.querySelector('[data-score]').textContent)===4);s=await state();assert.equal(s.elapsed,880);assert.equal(s.active,false);assert.equal(s.bodyStatic,false);assert.ok(Math.abs(s.image.width-64.8)<1);await page.screenshot({path:'test-results/feel-arrival.png'});
 await ready();await drag(45,-146);await page.mouse.up();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').settled);assert.equal((await state()).score,4);
 await ready();await drag(0,-70);await page.mouse.up();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').settled);assert.equal((await state()).score,4);
 await ready();await drag(0,-230);await page.mouse.up();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').settled);assert.equal((await state()).score,4);
 await ready();await drag(0,-146);await page.mouse.up();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').shot.elapsedMs>=200);await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await state();await page.waitForTimeout(200);assert.equal((await state()).elapsed,paused.elapsed);await page.getByRole('button',{name:'Keep playing'}).click();await page.waitForFunction(()=>Number(document.querySelector('[data-score]').textContent)===8);assert.deepEqual(errors,[]);
 console.log('2.5D flight check passes: 880ms arrival, exact preview, shrinking/backspin, squash/stretch, three miss inputs and paused progress.');
}finally{const video=page.video();await context.close();await video.saveAs('test-results/shot-feel.webm');await browser.close()}
