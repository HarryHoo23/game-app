import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:400,height:712},recordVideo:{dir:'test-results/hoop-video',size:{width:400,height:712}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game');return {stage:s.pass.stage,score:s.session.score,ball:{y:s.physicsCourt.ball.y,depth:s.ballView.image.depth},net:{y:s.hoop.net.y,scaleX:s.hoop.net.scaleX,scaleY:s.hoop.net.scaleY,rotation:s.hoop.net.rotation,originY:s.hoop.net.originY},rim:[s.hoop.rimBack.x,s.hoop.rimFront.x],depths:[s.hoop.backboard.depth,s.hoop.rimBack.depth,s.hoop.net.depth,s.hoop.rimFront.depth]}});
const shoot=async(dx=0,dy=-146)=>{await page.mouse.move(200,674);await page.mouse.down();await page.mouse.move(200+dx,674+dy,{steps:12});await page.mouse.up()};
const ready=()=>page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return !s.session.inFlight&&!s.settled});
try{
 await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Hit the court',exact:true}).click();await page.locator('[data-score]').waitFor();const baseline=await state();assert.equal(baseline.net.originY,0);assert.deepEqual(baseline.depths,[2,3,5,6]);
 // Record each frame: screenshot latency must not skip the ~100ms pass.
 await page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game');window.hoopFrames=[];s.events.on('postupdate',()=>{window.hoopFrames.push({stage:s.pass.stage,score:s.session.score,y:s.physicsCourt.ball.y,depth:s.ballView.image.depth,netScale:s.hoop.net.scaleY});if(window.hoopFrames.length>1500)window.hoopFrames.shift()})});
 await shoot();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').session.score===4);const frames=await page.evaluate(()=>window.hoopFrames);
 assert.ok(frames.some(f=>f.stage==='AT_RIM'&&f.score===0&&f.depth===4));assert.ok(frames.some(f=>f.stage==='IN_NET'&&f.score===0&&f.depth===4));assert.ok(frames.some(f=>f.netScale>baseline.net.scaleY*1.1));assert.ok(frames.some(f=>f.stage==='BELOW_HOOP'&&f.score===4&&f.y>=413));
 await ready();let s=await state();assert.deepEqual(s.net,baseline.net);assert.deepEqual(s.rim,baseline.rim);
 // Normal-make arrival within the calibrated visible-ball clearance.
 await shoot(19);await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').session.score===6);await ready();
 await shoot(0,-140);await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').pass.stage==='IN_NET');await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await state();await page.waitForTimeout(150);assert.deepEqual(await state(),paused);await page.getByRole('button',{name:'Keep playing'}).click();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').session.score===9);
 assert.deepEqual(errors,[]);console.log('Layered hoop passes: front/net occlusion, deferred EXIT, top-origin stretch, exact reset, PERFECT +4 / rim MAKE +2 / SWISH +3, in-net pause.');
}finally{const video=page.video();await context.close();await video.saveAs('test-results/layered-hoop.webm');await browser.close()}
