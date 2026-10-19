import type { GameConfig } from '../config';
import type { Contact,Sample } from './types';
import { crossing } from './scoring';
export type ShotResult='swish'|'rim-make'|'board-make'|'short'|'long'|'left'|'right'|'rim-miss'|'board-miss'|'miss';
export const isMake=(r:ShotResult)=>r==='swish'||r==='rim-make'||r==='board-make';
export function resolveShot(trace:readonly Sample[],contacts:readonly Contact[],made:boolean,c:GameConfig):ShotResult {
  const board=contacts.some(k=>k.kind==='board'),rim=contacts.some(k=>k.kind==='rim');
  if(made)return board?'board-make':rim?'rim-make':'swish';
  if(board)return 'board-miss';
  if(rim)return 'rim-miss';
  for(let i=1;i<trace.length;i++){
    const at=crossing(trace[i-1],trace[i],c.hoop.center.y);
    if(!at)continue;
    const x=at.x-c.hoop.center.x,z=at.z-c.hoop.center.z;
    if(Math.max(Math.abs(x),Math.abs(z))<c.hoop.innerRadius-c.ball.radius)return 'miss';
    return Math.abs(x)>Math.abs(z)?(x<0?'left':'right'):(z>0?'short':'long');
  }
  return 'miss';
}
export function shouldRetire(s:Sample,contacts:readonly Contact[],age:number,c:GameConfig):boolean {
  if(age>=c.recovery.maxAge||contacts.some(k=>k.kind==='floor'))return true;
  const p=s.position;
  if(Math.abs(p.x)>c.recovery.bounds||Math.abs(p.z)>c.recovery.bounds||p.y<0)return true;
  return s.velocity.y<0&&p.y<c.recovery.retireLow&&Math.hypot(p.x-c.hoop.center.x,p.z-c.hoop.center.z)>c.recovery.retireDistance;
}
