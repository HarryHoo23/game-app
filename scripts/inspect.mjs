import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true,channel:"chrome"});
const page=await browser.newPage({viewport:{width:430,height:820},deviceScaleFactor:1});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
await page.goto('http://localhost:5173/?debug');await page.waitForTimeout(1200);await page.screenshot({path:'test-results/home.png'});console.log(await page.locator('#ui').innerText());
await page.getByRole('button',{name:'Hit the court'}).click();await page.waitForTimeout(600);await page.screenshot({path:'test-results/game.png'});
const box=await page.locator('canvas').boundingBox();console.log('canvas',box);
const x=n=>box.x+n*box.width/400,y=n=>box.y+n*box.height/712;
await page.mouse.move(x(110),y(610));await page.mouse.down();await page.mouse.move(x(134),y(469),{steps:15});await page.screenshot({path:'test-results/aim.png'});await page.mouse.up();
console.log('PHYSICS',await page.evaluate(async()=>{const game=window.afterHours;const s=game.scene.getScene('Game');const b=s.physicsCourt.ball.body;return {pos:b.position,v:b.velocity,gravity:s.matter.world.engine.gravity,scale:b.timeScale,dt:b.deltaTime,radius:b.circleRadius}}));
for(let i=0;i<5;i++){await page.waitForTimeout(500);console.log(i,await page.evaluate(async()=>{const game=window.afterHours;const s=game.scene.getScene('Game');const b=s.physicsCourt.ball.body;return {pos:b.position,v:b.velocity,remaining:s.session.remaining,score:s.session.score,contact:s.contact}}));await page.screenshot({path:`test-results/shot-${i}.png`})}
await browser.close();
