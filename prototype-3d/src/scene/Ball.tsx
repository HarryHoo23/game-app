import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { RigidBody, BallCollider } from '@react-three/rapier';
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
  return <group><mesh castShadow><sphereGeometry args={[c.ball.radius,32,24]}/><meshStandardMaterial color="#cf702e" roughness={0.85}/></mesh><lineSegments geometry={seams}><lineBasicMaterial color="#3c251c"/></lineSegments></group>;
}
export function Ball() {
  const o=c.ball.origin;
  return <RigidBody type="fixed" colliders={false} position={[o.x,o.y,o.z]}><BallCollider args={[c.ball.radius]} mass={c.ball.mass} restitution={c.ball.restitution} friction={c.ball.friction} collisionGroups={BALL_GROUPS}/><BallMesh/></RigidBody>;
}
