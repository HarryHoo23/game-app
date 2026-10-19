import { useMemo,useCallback,useEffect,memo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { RigidBody, BallCollider,type RapierRigidBody } from '@react-three/rapier';
import { config as c, BALL_GROUPS } from '../config';
export function BallMesh() {
  const seams=useMemo(()=>{
    const p:number[]=[],r=c.ball.radius+0.0008;
    for(let plane=0;plane<3;plane++)for(let i=0;i<96;i++)for(const t of [i/96*Math.PI*2,(i+1)/96*Math.PI*2]){
      const a=Math.cos(t)*r,b=Math.sin(t)*r;
      p.push(...(plane===0?[a,b,0]:plane===1?[a,0,b]:[0,a,b]));
    }
    return new BufferGeometry().setAttribute('position',new Float32BufferAttribute(p,3));
  },[]);
  useEffect(()=>()=>seams.dispose(),[seams]);
  return <group><mesh castShadow><sphereGeometry args={[c.ball.radius,32,24]}/><meshStandardMaterial color="#cf702e" roughness={0.85}/></mesh><lineSegments geometry={seams}><lineBasicMaterial color="#3c251c"/></lineSegments></group>;
}
export const Ball=memo(function Ball({id,register}:{id:number;register:(id:number,body:RapierRigidBody|null)=>void}) {
  const o=c.ball.origin;
  const ref=useCallback((body:RapierRigidBody|null)=>register(id,body),[id,register]);
  // Rapier's callback ref registers creation but does not call null on removal.
  useEffect(()=>()=>register(id,null),[id,register]);
  const position=useMemo<[number,number,number]>(()=>[o.x,o.y,o.z],[o.x,o.y,o.z]);
  return <RigidBody ref={ref} type="fixed" colliders={false} ccd position={position}><BallCollider args={[c.ball.radius]} mass={c.ball.mass} restitution={c.ball.restitution} friction={c.ball.friction} collisionGroups={BALL_GROUPS}/><BallMesh/></RigidBody>;
});
