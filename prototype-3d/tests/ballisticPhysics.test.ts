import { beforeAll,it,expect } from 'vitest';
import { config as c } from '../src/config';
import { solveBallistic } from '../src/domain/launch';
import { createBasketState,advanceBasket } from '../src/domain/scoring';
import { initPhysics,createTestWorld } from './helpers/rapierWorld';
beforeAll(initPhysics);
it('baseline_sphere_physically_scores without rim or board contact',()=>{
  const h=createTestWorld(c);
  h.ball.setLinvel(solveBallistic(c.ball.origin,c.hoop.center,c.launch.apex,c.gravity),true);
  let state=createBasketState(),prev={position:{...c.ball.origin},velocity:{...h.ball.linvel()},time:0},makes=0;
  for(let i=0;i<230;i++){
    const next=h.step(),a=advanceBasket(state,prev,next,h.contacts.some(k=>k.kind==='floor'),c);
    state=a.state;makes+=Number(a.made);prev=next;
  }
  expect(makes).toBe(1);
  expect(h.contacts.filter(k=>k.kind==='rim'||k.kind==='board')).toHaveLength(0);
  h.dispose();
});
