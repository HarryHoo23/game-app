import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:400,height:712}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Hit the court',exact:true}).click();await page.locator('[data-score]').waitFor();
 const idle=await page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game'),h=s.hoop,b=s.ballView.image.getBounds();return {board:h.backboard.getBounds(),ball:{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom},scale:h.container.scaleX,position:{x:h.container.x,y:h.container.y},canonical:h.getRimCenter(),parent:h.backboard.parentContainer===h.container&&h.rimBack.parentContainer===h.container&&h.net.parentContainer===h.container&&h.rimFront.parentContainer===h.container}});
 assert.ok(idle.parent);assert.equal(idle.scale,.73);assert.ok(idle.board.width/400>=.40&&idle.board.width/400<=.46);assert.ok(Math.abs(idle.position.y-(285-712*.04))<.01);assert.deepEqual(idle.canonical,{x:200,y:285});assert.ok(Math.abs(idle.ball.width-144*.88)<.01);assert.ok(Math.abs((idle.ball.bottom-712)/idle.ball.height-.20)<.001);
 await page.screenshot({path:'test-results/perspective-idle.png'});
 await page.mouse.move(200,674);await page.mouse.down();await page.mouse.move(200,528,{steps:12});await page.screenshot({path:'test-results/perspective-aim.png'});await page.mouse.up();
 await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').pass.stage==='IN_NET');const net=await page.evaluate(()=>{const s=window.afterHours.scene.getScene('Game'),image=s.ballView.image;return {width:image.displayWidth*s.hoop.container.scaleX,depth:image.depth,parent:image.parentContainer===s.hoop.container,logical:s.shot.currentPlan,body:s.physicsCourt.ball.body.isStatic}});assert.ok(net.width/idle.ball.width>=.38&&net.width/idle.ball.width<=.45);assert.equal(net.depth,4);assert.ok(net.parent&&net.body);assert.equal(net.logical.durationMs,900);await page.screenshot({path:'test-results/perspective-in-net.png'});
 await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').session.score===4);await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return !s.session.inFlight&&!s.settled});await page.screenshot({path:'test-results/perspective-reset.png'});
 const reset=await page.evaluate(()=>window.afterHours.scene.getScene('Game').ballView.image.getBounds().bottom);assert.ok(Math.abs(reset-idle.ball.bottom)<.01);
 const small=await browser.newPage({viewport:{width:320,height:568}});small.on('pageerror',e=>errors.push(e.message));await small.goto('http://localhost:5173/');await small.getByRole('button',{name:'Hit the court',exact:true}).click();await small.locator('[data-score]').waitFor();await small.screenshot({path:'test-results/perspective-small.png'});
 assert.deepEqual(errors,[]);console.log('Perspective verified:',JSON.stringify(idle),'near-rim ratio',net.width/idle.ball.width);
}finally{await browser.close()}
