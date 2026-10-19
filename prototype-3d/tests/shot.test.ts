import { expect,it } from 'vitest';
import { config as c } from '../src/config';
import { resolveShot,shouldRetire } from '../src/domain/shot';
import type { Sample,Contact } from '../src/domain/types';
const point=(x:number,y:number,z:number):Sample=>({position:{x,y,z},velocity:{x:0,y:-2,z:0},time:1});
it('observed_short_long_left_right from descending crossing',()=>{
  for(const [x,z,result] of [[0,0.8,'short'],[0,-0.8,'long'],[-0.8,0,'left'],[0.8,0,'right']] as const){
    expect(resolveShot([point(x,3.5,z),point(x,2.8,z)],[],false,c)).toBe(result);
  }
  expect(resolveShot([],[],true,c)).toBe('swish');
  expect(resolveShot([],[],false,c)).toBe('miss');
  const board:Contact={kind:'board',time:1,position:{x:0,y:3.6,z:-0.28}};
  expect(resolveShot([point(0,3.5,1),point(0,2.8,1)],[board],false,c)).toBe('board-miss');
  expect(resolveShot([], [board],true,c)).toBe('board-make');
});
it('rim_rebound_is_not_prematurely_retired',()=>{
  expect(shouldRetire(point(0,2.95,0.26),[{kind:'rim',time:1,position:{x:0,y:3,z:0.26}}],1.3,c)).toBe(false);
});
it('bounded_retirement',()=>{
  expect(shouldRetire(point(0,1,3),[],1.8,c)).toBe(true);
  expect(shouldRetire(point(10,3,0),[],1,c)).toBe(true);
  expect(shouldRetire(point(0,3,0),[],5,c)).toBe(true);
  expect(shouldRetire(point(0,3,0),[{kind:'floor',time:1,position:{x:0,y:0.12,z:0}}],1,c)).toBe(true);
});
