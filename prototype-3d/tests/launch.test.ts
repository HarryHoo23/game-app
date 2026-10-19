import { it, expect } from 'vitest';
import { config as c } from '../src/config';
import { solveBallistic } from '../src/domain/launch';
it('descending_ballistic_solution',()=>{
  const o=c.ball.origin,t=c.hoop.center,g=c.gravity,v=solveBallistic(o,t,c.launch.apex,g);
  const time=(v.y+Math.sqrt(v.y*v.y-2*g*(t.y-o.y)))/g;
  expect(o.x+v.x*time).toBeCloseTo(t.x,6);
  expect(o.y+v.y*time-g*time*time/2).toBeCloseTo(t.y,6);
  expect(o.z+v.z*time).toBeCloseTo(t.z,6);
  expect(v.y-g*time).toBeLessThan(0);
});
it('rejects invalid ballistic values',()=>{
  for(const [apex,g] of [[2,9.81],[4.1,0],[NaN,9.81],[4.1,Infinity]])expect(()=>solveBallistic(c.ball.origin,c.hoop.center,apex,g)).toThrow();
});
