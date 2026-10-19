import type { Vec3 } from './types';
import type { GameConfig } from '../config';
export type Gesture={start:{x:number;y:number};end:{x:number;y:number};width:number;height:number;durationMs:number};
export type Launch={velocity:Vec3;angularVelocity:Vec3;normalized:{dx:number;up:number}};
export function solveBallistic(origin:Vec3,target:Vec3,apex:number,gravity:number):Vec3 {
  if(![...Object.values(origin),...Object.values(target),apex,gravity].every(Number.isFinite)||gravity<=0||apex<=Math.max(origin.y,target.y))throw new RangeError('Invalid ballistic geometry');
  const y=Math.sqrt(2*gravity*(apex-origin.y));
  const t=y/gravity+Math.sqrt(2*(apex-target.y)/gravity);
  return {x:(target.x-origin.x)/t,y,z:(target.z-origin.z)/t};
}
export function mapGesture(g:Gesture,c:GameConfig):Launch|null {
  if(![g.start.x,g.start.y,g.end.x,g.end.y,g.width,g.height,g.durationMs].every(Number.isFinite)||g.width<=0||g.height<=0||g.durationMs<=0)return null;
  const up=(g.start.y-g.end.y)/g.height,dx=(g.end.x-g.start.x)/g.width;
  if(up<c.launch.minUp)return null;
  const p=c.launch,d=Math.min(1,up)-p.normalUp;
  const magnitude=Math.abs(d);
  const depth=-Math.sign(d)*Math.min(p.maxDepth,Math.min(magnitude,p.softBand)*p.softDepth/p.softBand+Math.max(0,magnitude-p.softBand)*p.outerDepth);
  const aim=Math.sign(dx)*Math.min(p.maxAim,Math.pow(Math.max(0,Math.abs(dx)-p.aimDeadzone),p.aimExponent)*p.aimSensitivity);
  return {velocity:solveBallistic(c.ball.origin,{x:c.hoop.center.x+aim,y:c.hoop.center.y,z:c.hoop.center.z+depth},p.apex,c.gravity),angularVelocity:{x:c.ball.backspin,y:0,z:0},normalized:{dx,up}};
}
