// Phase 0 evidence only: wrappers delegate unchanged; no source/gameplay/config edits.
import { chromium } from '@playwright/test';
import { mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const out=process.argv[2]??'docs/baselines/2026-10-16';
const baseUrl=process.env.BASELINE_URL??'http://localhost:5173/';
try { await access(`${out}/summary.json`); throw new Error(`Baseline already exists at ${out}; supply a new output directory to preserve BEFORE evidence.`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(`${out}/recordings`,{recursive:true});await mkdir(`${out}/traces`,{recursive:true});await mkdir(`${out}/screenshots`,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const metadata={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),baseUrl,viewport:{width:400,height:712},browser:browser.version(),audio:'Enabled through UI; Playwright WebM captures video only. JSON logs audio adapter invocations, not audible onset.',instrumentation:'Instance method wrappers delegate original calls; postupdate reads state. No game timers/configuration changed.'};
const summary=[];
try{
 for(const scenario of [
  {name:'01-ideal-perfect',shots:[[0,-146]]},
  {name:'02-clean-swish',shots:[[0,-140]]},
  {name:'03-front-rim-miss',shots:[[0,-125]]},
  {name:'04-back-rim-miss',shots:[[0,-230]]},
  {name:'05-backboard-miss',shots:[[80,-146]]},
  {name:'06-three-consecutive',shots:[[0,-146],[0,-140],[0,-146]]},
 ]){
  const context=await browser.newContext({viewport:metadata.viewport,recordVideo:{dir:`${out}/recordings/raw`,size:metadata.viewport},reducedMotion:'no-preference'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${baseUrl}?debug`);await page.getByRole('button',{name:'Toggle sound',exact:true}).click();await page.getByRole('button',{name:'Hit the court',exact:true}).click();await page.locator('[data-score]').waitFor();
  const math=await page.evaluate(async()=>{
   const s=window.afterHours.scene.getScene('Game');
   const {createShot,sampleShot,assessShot}=await import('/src/domain/shooting/ShotTrajectory.ts');
   const {projectShot,ballDisplaySize,PERSPECTIVE_CONFIG}=await import('/src/game/presentation/perspective.ts');
   const plan=createShot(0,-146,s.session.config,s.stats),rim=s.hoop.getRimCenter();let logical={t:0,y:Infinity},screen={t:0,y:Infinity};
   for(let i=0;i<=10000;i++){const p=sampleShot(plan,i/10000),v=projectShot(p,rim);if(p.y<logical.y)logical={t:p.t,y:p.y};if(v.y<screen.y)screen={t:p.t,y:v.y};}
   const candidates=[];for(const [dx,dy] of [[0,-146],[0,-140],[0,-125],[0,-230],[80,-146]]){const p=createShot(dx,dy,s.session.config,s.stats);candidates.push({dx,dy,plan:p,result:assessShot(p,s.session.config,s.stats)});}
   return {plan,logicalApex:logical,renderedApex:screen,scaleSamples:[0,.1,.15,.4,.5,.8,1].map(t=>({t,size:ballDisplaySize(sampleShot(plan,t).scale)})),perspective:PERSPECTIVE_CONFIG,candidates,stats:s.stats,renderer:s.game.renderer.type};
  });
  await page.evaluate(()=>{
   const s=window.afterHours.scene.getScene('Game');const baseline={net:s.hoop.net.scaleY};const state={zero:performance.now(),shot:0,events:[],frames:[],baseline};window.shotBaseline=state;
   const log=(kind,details={})=>state.events.push({kind,shot:state.shot,wallMs:performance.now()-state.zero,flightMs:s.shot.elapsedMs,passMs:s.pass.elapsedMs,...details});
   const wrap=(object,key,callback)=>{const original=object[key];object[key]=function(...args){callback(...args);return original.apply(this,args)}};
   wrap(s,'launch',plan=>{state.shot++;log('release',{plan})});wrap(s.pass,'start',(_plan,result)=>log('arrival',{result}));wrap(s,'impact',kind=>log('impact',{impact:kind}));wrap(s.hoop,'playNetSwish',strong=>log('net-trigger',{strong}));wrap(s.feedback,'basket',(_x,_y,score)=>log('basket-feedback',{score}));wrap(s.app.audio,'play',kind=>log('audio-call',{sound:kind,enabled:s.app.audio.enabled}));wrap(s,'resolve',score=>log('resolve',{score}));wrap(s.physicsCourt,'reset',()=>log('ball-reset'));
   let previousStage='APPROACHING',previousReady=true;
   s.events.on('postupdate',()=>{
    const ready=!s.session.inFlight&&!s.settled&&!s.session.finished&&!s.paused;
    if(ready&&!previousReady)log('ready');previousReady=ready;
    if(s.pass.stage!==previousStage){log('depth-stage',{stage:s.pass.stage});previousStage=s.pass.stage;}
    const image=s.ballView.image,pos=image.getWorldTransformMatrix().transformPoint(0,0);
    state.frames.push({wallMs:performance.now()-state.zero,shot:state.shot,flightMs:s.shot.elapsedMs,passMs:s.pass.elapsedMs,stage:s.pass.stage,ready,settled:s.settled,score:s.session.score,x:pos.x,y:pos.y,diameter:image.displayWidth*s.hoop.container.scaleX,rotation:image.rotation,depth:image.depth,bodyY:s.physicsCourt.ball.y,velocity:{...s.physicsCourt.ball.body.velocity},netRatio:s.hoop.net.scaleY/baseline.net,netAngle:s.hoop.net.angle,zoom:s.cameras.main.zoom});
   });
  });
  await page.screenshot({path:`${out}/screenshots/${scenario.name}-idle.png`});
  for(let i=0;i<scenario.shots.length;i++){
   const [dx,dy]=scenario.shots[i];await page.mouse.move(200,674);await page.mouse.down();await page.mouse.move(200+dx,674+dy,{steps:12});await page.mouse.up();
   if(i===0&&scenario.name==='01-ideal-perfect'){
    await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').pass.stage==='AT_RIM');await page.screenshot({path:`${out}/screenshots/at-rim.png`});
    await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return s.pass.stage==='IN_NET'&&s.pass.elapsedMs>180});await page.screenshot({path:`${out}/screenshots/in-net.png`});
   }
   await page.waitForFunction(()=>window.afterHours.scene.getScene('Game').settled);if(i===0)await page.screenshot({path:`${out}/screenshots/${scenario.name}-result.png`});
   await page.waitForFunction(()=>{const s=window.afterHours.scene.getScene('Game');return !s.session.inFlight&&!s.settled});
  }
  await page.waitForTimeout(180);
  const trace=await page.evaluate(()=>window.shotBaseline);
  const shots=scenario.shots.map((drag,index)=>{
   const events=trace.events.filter(e=>e.shot===index+1),first=kind=>events.find(e=>e.kind===kind),release=first('release'),arrival=first('arrival'),net=first('net-trigger'),resolve=first('resolve'),ready=first('ready');
   return {drag,result:arrival?.result,flightMs:arrival?.flightMs,releaseToResolveMs:resolve?.wallMs-release?.wallMs,resolveToReadyMs:ready?.wallMs-resolve?.wallMs,releaseToReadyMs:ready?.wallMs-release?.wallMs,netTriggerToResolveMs:resolve&&net?resolve.wallMs-net.wallMs:null,impacts:events.filter(e=>e.kind==='impact').map(e=>({impact:e.impact,afterReleaseMs:e.wallMs-release.wallMs})),audio:events.filter(e=>e.kind==='audio-call').map(e=>({sound:e.sound,afterReleaseMs:e.wallMs-release.wallMs})),events};
  });
  await writeFile(`${out}/traces/${scenario.name}.json`,JSON.stringify({scenario,math,shots,trace,errors},null,2));
  const video=page.video();await context.close();await video.saveAs(`${out}/recordings/${scenario.name}.webm`);await unlink(await video.path());
  summary.push({name:scenario.name,shots,errors});console.log(JSON.stringify({name:scenario.name,shots:shots.map(({events,...s})=>s)}));
 }
}finally{await browser.close();await writeFile(`${out}/summary.json`,JSON.stringify({metadata,scenarios:summary},null,2));}
