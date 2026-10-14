import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:400,height:712}});
 await page.goto('http://localhost:5173/?debug');await page.getByRole('button',{name:'Hit the court'}).click();
 await page.locator('[data-score]').waitFor();
 const body=await page.evaluate(()=>{const b=window.afterHours.scene.getScene('Game').physicsCourt.ball.body;return {label:b.label,frictionAir:b.frictionAir,restitution:b._original?.restitution??b.restitution,radius:b.circleRadius}});
 assert.equal(body.label,'ball','Circular collision body must retain its scoring label');assert.equal(body.frictionAir,0,'Preview and real flight require the same air resistance');assert.equal(body.restitution,.72);assert.equal(body.radius,14);
 console.log('Physics body contract passes');
} finally { await browser.close(); }
