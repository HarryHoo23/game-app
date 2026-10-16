import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:400,height:712},recordVideo:{dir:'test-results/hoop-video',size:{width:400,height:712}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game');return {stage:s.pass.stage,score:s.session.score,ball:{y:s.physicsCourt.ball.y,depth:s.ballView.image.depth},net:{y:s.hoop.net.y,scaleX:s.hoop.net.scaleX,scaleY:s.hoop.net.scaleY,rotation:s.hoop.net.rotation,originY:s.hoop.net.originY},rim:[s.hoop.rimBack.x,s.hoop.rimFront.x],depths:[s.hoop.backboard.depth,s.hoop.rimBack.depth,s.hoop.net.depth,s.hoop.rimFront.depth]}});
const shoot=async(dx=0,dy=-146)=>{await page.mouse.move(200,620);await page.mouse.down();await page.mouse.move(200+dx,620+dy,{steps:12});await page.mouse.up()};
try{
 await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Hit the court',exact:true}).click();await page.locator('[data-score]').waitFor();const baseline=await state();assert.equal(baseline.net.originY,0);assert.deepEqual(baseline.depths,[2,3,5,6]);
 await shoot();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').pass.stage==='AT_RIM');let s=await state();assert.equal(s.score,0);assert.equal(s.ball.depth,4);await page.screenshot({path:'test-results/hoop-at-rim.png'});
 await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return s.pass.stage==='IN_NET'&&s.physicsCourt.ball.y>305&&s.physicsCourt.ball.y<365});s=await state();assert.equal(s.score,0);assert.equal(s.ball.depth,4);await page.screenshot({path:'test-results/hoop-in-net.png'});
 await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').hoop.net.scaleY>0.095);s=await state();assert.ok(s.net.scaleY>baseline.net.scaleY*1.1);
 await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').session.score===4);s=await state();assert.equal(s.stage,'BELOW_HOOP');assert.equal(s.ball.depth,7);assert.ok(s.ball.y>=413);await page.screenshot({path:'test-results/hoop-below.png'});
 await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return !s.session.inFlight&&!s.settled});s=await state();assert.deepEqual(s.net,baseline.net);assert.deepEqual(s.rim,baseline.rim);
 await shoot(10);await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').session.score===6);await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return !s.session.inFlight&&!s.settled});
 await shoot(0,-140);await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').pass.stage==='IN_NET');await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await state();await page.waitForTimeout(150);assert.deepEqual(await state(),paused);await page.getByRole('button',{name:'Keep playing'}).click();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').session.score===9);
 assert.deepEqual(errors,[]);console.log('Layered hoop passes: front/net occlusion, deferred exit scoring, top-origin stretch, exact reset, PERFECT +4 and rim MAKE +2.');
}finally{const video=page.video();await context.close();await video.saveAs('test-results/layered-hoop.webm');await browser.close()}
