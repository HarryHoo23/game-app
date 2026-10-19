import type { Vec3 } from './types';
export function solveBallistic(origin:Vec3,target:Vec3,apex:number,gravity:number):Vec3 {
  if(![...Object.values(origin),...Object.values(target),apex,gravity].every(Number.isFinite)||gravity<=0||apex<=Math.max(origin.y,target.y))throw new RangeError('Invalid ballistic geometry');
  const y=Math.sqrt(2*gravity*(apex-origin.y));
  const t=y/gravity+Math.sqrt(2*(apex-target.y)/gravity);
  return {x:(target.x-origin.x)/t,y,z:(target.z-origin.z)/t};
}
