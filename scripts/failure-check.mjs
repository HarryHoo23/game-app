import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:400,height:712}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Hit the court'}).click();await page.locator('[data-shots]').waitFor();
 for(let i=0;i<10;i++){await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return s.scene.isActive()&&!s.session.inFlight&&!s.settled});await page.mouse.move(110,610);await page.mouse.down();await page.mouse.move(4,580,{steps:5});await page.mouse.up()}
 await page.locator('.result-content').waitFor();assert.match(await page.locator('.result-content').innerText(),/SO CLOSE/);assert.match(await page.locator('.result-score').innerText(),/^0/);assert.equal(await page.evaluate(()=>localStorage.getItem('afterhours.progress.v1')),null);await page.screenshot({path:'test-results/failed.png'});await page.getByRole('button',{name:'Run it back'}).click();await page.locator('[data-shots]').waitFor();assert.equal(await page.locator('[data-shots]').innerText(),'10');assert.equal(await page.locator('[data-score]').innerText(),'0');assert.deepEqual(errors,[]);console.log('Full failed run, no rewards and retry reset passed');
}finally{await browser.close()}
