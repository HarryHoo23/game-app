import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.goto('http://localhost:5173');await page.getByRole('button',{name:'Hit the court'}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Back to levels',exact:true}).click();await page.waitForTimeout(300);
 assert.deepEqual(errors,[],'Leaving a running court must clean up without exceptions');await page.locator('[data-level="1"]').click();await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Restart level',exact:true}).click();await page.locator('[data-shots]').waitFor();assert.equal(await page.locator('[data-shots]').innerText(),'10');assert.deepEqual(errors,[]);
 console.log('Scene exit and restart pass');
}finally{await browser.close()}
