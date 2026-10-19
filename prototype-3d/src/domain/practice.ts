import type { GameConfig } from '../config';
import { isMake,type ShotResult } from './shot';
export function createPracticeLifecycle(c:GameConfig){
  let nextId=2,due:number|null=null;
  const r={
    time:0,paused:false,readyId:1 as number|null,
    balls:[{id:1,status:'ready' as 'ready'|'flying'|'resolved',born:0}],
    launch(){const id=r.readyId;if(id===null||r.paused)return null;const ball=r.balls.find(b=>b.id===id)!;ball.status='flying';ball.born=r.time;r.readyId=null;return id;},
    resolve(id:number,result:ShotResult){const ball=r.balls.find(b=>b.id===id);if(!ball||ball.status!=='flying')return false;ball.status='resolved';due=r.time+(isMake(result)?c.recovery.make:c.recovery.miss);return true;},
    step(dt:number){
      if(r.paused||!Number.isFinite(dt)||dt<0)return false;
      r.time+=dt;let changed=false;
      if(due!==null&&r.time+1e-9>=due){r.readyId=nextId++;r.balls.push({id:r.readyId,status:'ready',born:r.time});due=null;changed=true;}
      const count=r.balls.length;
      r.balls=r.balls.filter(b=>b.status!=='resolved'||r.time-b.born<c.recovery.maxAge);
      while(r.balls.length>c.recovery.maxBodies){const index=r.balls.findIndex(b=>b.status==='resolved');if(index<0)break;r.balls.splice(index,1);}
      return changed||r.balls.length!==count;
    },
  };
  return r;
}
