import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:400,height:712}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Hit the court',exact:true}).click();await page.locator('[data-score]').waitFor();
 const net=await page.evaluate(()=>{const n=window.afterHours.scene.getScene('Game').hoop.net;return {x:n.x,y:n.y,sx:n.scaleX,sy:n.scaleY,r:n.rotation}});
 await page.mouse.move(200,674);await page.mouse.down();await page.mouse.move(200,528,{steps:12});await page.mouse.up();
 await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').pass.stage==='IN_NET');
 const entry=await page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game');return {score:s.session.score,remaining:s.session.remaining,flight:s.shot.elapsedMs,pass:s.pass.elapsedMs,depth:s.ballView.image.depth,ghosts:s.ballView.ghosts.filter(g=>g.visible).length}});assert.equal(entry.score,0);assert.equal(entry.depth,4);assert.equal(entry.ghosts,0);
 await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game');return {flight:s.shot.elapsedMs,pass:s.pass.elapsedMs,netY:s.hoop.net.y,netScale:s.hoop.net.scaleY,score:s.session.score}});await page.waitForTimeout(160);assert.deepEqual(await page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game');return {flight:s.shot.elapsedMs,pass:s.pass.elapsedMs,netY:s.hoop.net.y,netScale:s.hoop.net.scaleY,score:s.session.score}}),paused);await page.getByRole('button',{name:'Keep playing'}).click();
 await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').session.score===4);
 // A second release while score is committed but the presentation is settling must be ignored.
 await page.mouse.move(200,674);await page.mouse.down();await page.mouse.move(200,528,{steps:12});await page.mouse.up();assert.equal(await page.evaluate(()=>window.afterHours.scene.getScene('Game').session.remaining),9);
 await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return !s.session.inFlight&&!s.settled});
 assert.deepEqual(await page.evaluate(()=>{const n=window.afterHours.scene.getScene('Game').hoop.net;return {x:n.x,y:n.y,sx:n.scaleX,sy:n.scaleY,r:n.rotation}}),net);
 assert.equal(await page.evaluate(()=>window.afterHours.scene.getScene('Game').ballView.ghosts.filter(g=>g.visible).length),0);
 await page.mouse.move(200,674);await page.mouse.down();await page.mouse.move(246,529,{steps:12});await page.mouse.up();await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').settled);assert.equal(await page.evaluate(()=>window.afterHours.scene.getScene('Game').resultImpact),'backboard');
 assert.deepEqual(errors,[]);console.log('Checkpoint: no score before EXIT, no reentrant shot, in-net pause/resume, exact net restoration, pooled ghosts hidden in net/idle.');
}finally{await browser.close()}
