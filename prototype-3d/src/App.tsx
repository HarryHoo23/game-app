import { Component, Suspense, useRef,useState,useCallback,type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { config } from './config';
import { CameraRig } from './scene/CameraRig';
import { Court } from './scene/Court';
import { Hoop } from './scene/Hoop';
import { PracticeScene } from './scene/PracticeScene';
import { useShotInput,type ShotBridge } from './input/useShotInput';
export class GameBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div role="alert" className="error"><p>The court could not load. Please try again.</p><button onClick={()=>window.location.reload()}>Reload court</button></div>:this.props.children;}
}
export function App(){
  const el=useRef<HTMLElement>(null),bridge=useRef<ShotBridge>({ready:false,screen:null,launch:null});
  const [text,setText]=useState('SWIPE UP TO SHOOT');const onResult=useCallback((s:string)=>setText(s),[]);
  useShotInput(el,bridge);
  return <main className="game" ref={el}><header><span>AFTER HOURS</span><small>UNLIMITED PRACTICE</small></header><GameBoundary><Canvas shadows dpr={[1,config.camera.dpr]} fallback={<p role="alert">This browser needs WebGL to open the court.</p>}><CameraRig/><Suspense fallback={null}><Physics gravity={[0,-config.gravity,0]} timeStep={config.timeStep}><Court/><Hoop/><PracticeScene bridge={bridge} onResult={onResult}/></Physics></Suspense></Canvas></GameBoundary><p className="shot-prompt">{text}</p></main>;
}
