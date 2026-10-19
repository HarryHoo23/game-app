import { useLayoutEffect,useRef,type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { useAfterPhysicsStep,useRapier,type RapierRigidBody } from '@react-three/rapier';
import { Vector3 } from 'three';
import { config as c } from '../config';
import { Ball } from './Ball';
import type { ShotBridge } from '../input/useShotInput';
import { advanceBasket,createBasketState } from '../domain/scoring';
import type { Sample } from '../domain/types';
export function PracticeScene({bridge,onResult}:{bridge:RefObject<ShotBridge>;onResult:(text:string)=>void}){
  const body=useRef<RapierRigidBody>(null),shot=useRef<{prev:Sample;state:ReturnType<typeof createBasketState>}|null>(null);
  const {rapier}=useRapier(),{camera,size}=useThree();
  useLayoutEffect(()=>{
    const o=c.ball.origin,p=new Vector3(o.x,o.y,o.z).project(camera),edge=new Vector3(o.x+c.ball.radius,o.y,o.z).project(camera);
    bridge.current.screen={x:(p.x+1)/2*size.width,y:(1-p.y)/2*size.height,radius:Math.abs(edge.x-p.x)/2*size.width};
    bridge.current.ready=true;
    bridge.current.launch=(launch)=>{
      const b=body.current;if(!b||shot.current)return false;
      bridge.current.ready=false;b.setBodyType(rapier.RigidBodyType.Dynamic,true);b.setLinvel(launch.velocity,true);b.setAngvel(launch.angularVelocity,true);
      shot.current={prev:{position:{...b.translation()},velocity:launch.velocity,time:0},state:createBasketState()};onResult('IN FLIGHT');return true;
    };
    return ()=>{bridge.current.launch=null;bridge.current.ready=false;};
  },[bridge,camera,size,rapier,onResult]);
  useAfterPhysicsStep(()=>{
    const s=shot.current,b=body.current;if(!s||!b)return;
    const next={position:{...b.translation()},velocity:{...b.linvel()},time:s.prev.time+c.timeStep};
    const a=advanceBasket(s.state,s.prev,next,next.position.y<c.ball.radius+0.01,c);s.prev=next;s.state=a.state;
    if(a.made)onResult('BASKET');
  });
  return <Ball bodyRef={body}/>;
}
