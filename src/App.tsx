import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useProgress, useGLTF, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing"; 
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

// --- COMPONENTS ---
import { Candle } from "./models/candle";
import { Cake } from "./models/cake";
import { Table } from "./models/table";
import { PictureFrame } from "./models/pictureFrame";
import { Fireworks } from "./components/Fireworks";
import { Fireflies } from "./components/Glitter";
import { Moon } from "./components/Moon";
import { Aurora } from "./components/Aurora";
import { BirthdayCard } from "./components/BirthdayCard";
import { GoldenText } from "./components/GoldenText"; 
import { EarthIntro } from "./components/EarthIntro"; 

import "./App.css";

// --- 1. DRACO & ASSET PRELOADING ---
const DRACO_URL = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

const preloadAssets = () => {
  useGLTF.preload("/candle.glb", DRACO_URL);
  useGLTF.preload("/cake.glb", DRACO_URL);
  useGLTF.preload("/table.glb", DRACO_URL);
  useGLTF.preload("/picture_frame.glb", DRACO_URL);
  useTexture.preload("/frame1.jpg");
  useTexture.preload("/frame2.jpg");
  useTexture.preload("/frame3.jpg");
  useTexture.preload("/frame4.jpg");
  useTexture.preload("/card.png");
};

// --- HOLODECK DATA ---
const PHOTO_MEMORIES: Record<string, string> = {
  "/frame1.jpg": "Bro was the Forest Queen that day, Lost in Her Own World of Greens and Dreams.",
  "/frame2.jpg": "An eye can show many things. It can show light in the darkest times.",
  "/frame3.jpg": "Bro was the Local Mafia. Bro should have been Feared by All.",
  "/frame4.jpg": "Bro Lost this Snap but it still remained. Cause a stalker saved it. 😂"
};

// --- UTILS ---
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// --- CONSTANTS ---
const CURRENT_LAT = 23.8103;
const CURRENT_LON = 90.4125;
const TARGET_LAT = -29.6823;
const TARGET_LON = 17.9492; 

const CAKE_START_Y = 10;
const CAKE_END_Y = 0;
const CAKE_DESCENT_DURATION = 3;
const TABLE_START_Z = 30;
const TABLE_END_Z = 0;
const TABLE_SLIDE_DURATION = 0.7;
const TABLE_SLIDE_START = CAKE_DESCENT_DURATION - TABLE_SLIDE_DURATION - 0.1;
const CANDLE_START_Y = 5;
const CANDLE_END_Y = 0;
const CANDLE_DROP_DURATION = 1.2;
const CANDLE_DROP_START = Math.max(CAKE_DESCENT_DURATION, TABLE_SLIDE_START + TABLE_SLIDE_DURATION) + 1.0;
const totalAnimationTime = CANDLE_DROP_START + CANDLE_DROP_DURATION;
const BACKGROUND_FADE_DURATION = 1.5; 
const BACKGROUND_FADE_START = Math.max((Math.max(CANDLE_DROP_START, BACKGROUND_FADE_DURATION) - BACKGROUND_FADE_DURATION), 0);

const TYPED_LINES = [
  "> ARRIVAL CONFIRMED.",
  "> Location: Northern Cape, SOUTH AFRICA",
  "> Hello, Abida Sultana Ety.",
  "> Current Date: 28 FEB 2026",
  "> Status: THE ALGORITHM HAS FOUND THIS AS A SPACIAL DAY.",
  "> Happy Birthday!",       
  "> Initiating Surprise Protocol..."
];

const TERMINAL_SCRIPT = [
  { text: "> SYSTEM BOOT...", delay: 500 },
  { text: "> CONNECTING TO SATELLITE...", delay: 800 },
  { text: "> TRIANGULATING SIGNAL...", delay: 1000 },
  { text: "> DETECTED: KHULNA, BANGLADESH", delay: 1500, color: "#ffff00" },
  { text: "Analysis: THIS PLACE SHOULD BE CHANGED", delay: 2000, color: "#ff3333" },
  { text: "REROUTING TO: NORTHERN CAPE, SOUTH AFRICA", delay: 2000, color: "#00ff00", bold: true },
  { text: "> INITIATING WARP DRIVE ✈️...", delay: 2500 }
];

const TYPED_CHAR_DELAY = 40;        
const POST_TYPING_SCENE_DELAY = 3000; 

// --- OVERLAYS ---
function HackerTerminal({ onComplete }: { onComplete: () => void }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { progress } = useProgress();

  useEffect(() => {
    if (lineIndex >= TERMINAL_SCRIPT.length) {
      const readTimeout = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onComplete, 1000);
      }, 1500);
      return () => clearTimeout(readTimeout);
    }
    const currentLine = TERMINAL_SCRIPT[lineIndex];
    const timeout = setTimeout(() => setLineIndex((prev) => prev + 1), currentLine.delay);
    return () => clearTimeout(timeout);
  }, [lineIndex, onComplete]);

  return (
    <div className="fullscreen-overlay" style={{ opacity: isExiting ? 0 : 1, transition: 'opacity 1s ease-in-out', zIndex: 100 }}>
      <div className="terminal-box">
        {TERMINAL_SCRIPT.slice(0, lineIndex + 1).map((line, i) => (
          <div key={i} style={{ color: line.color || '#0f0', fontWeight: line.bold ? 'bold' : 'normal' }}>
            {line.text}
          </div>
        ))}
        {!isExiting && <div><span className="cursor"></span></div>}
        <div style={{ marginTop: '20px', fontSize: '10px', color: '#113311' }}>
          Background Sync: {progress.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function PrepOverlay({ progress, isVisible }: { progress: number, isVisible: boolean }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150, background: 'black',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none',
      transition: 'opacity 0.8s ease'
    }}>
      <div style={{ color: '#0f0', fontFamily: 'monospace', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>HOLDUP MAXNET++ <p>ON THE WORK</p></div>
        <div style={{ width: '200px', height: '4px', background: '#113311' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#0f0', transition: 'width 0.3s' }} />
        </div>
        <div style={{ marginTop: '10px' }}>{progress.toFixed(0)}%</div>
      </div>
    </div>
  );
}

// --- 3D COMPONENTS ---
function FireworkFlash({ active, envProgress }: { active: boolean, envProgress: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (active && lightRef.current) {
      lightRef.current.intensity = (Math.sin(clock.elapsedTime * 15) > 0 ? 3 : 0.2) * envProgress;
    }
  });
  return active ? <pointLight ref={lightRef} position={[0, 8, 0]} color="#FFD700" distance={20} /> : null;
}

function EnvironmentBackgroundController({ intensity }: { intensity: number }) {
  const scene = useThree((state) => state.scene);
  useEffect(() => { if ("backgroundIntensity" in scene) (scene as any).backgroundIntensity = intensity; }, [scene, intensity]);
  return null;
}

function AnimatedScene({ isPlaying, onBackgroundFadeChange, onEnvironmentProgressChange, candleLit, onAnimationComplete, cards, activeCardId, onToggleCard, fireworksActive, onPhotoClick }: any) {
    const cakeGroup = useRef<Group>(null);
    const tableGroup = useRef<Group>(null);
    const candleGroup = useRef<Group>(null);
    const smokeRef = useRef<THREE.Points>(null);
    const animationStartRef = useRef<number | null>(null);
    const hasPrimedRef = useRef(false);
    const hasCompletedRef = useRef(false);
    const completionNotifiedRef = useRef(false);
    const backgroundOpacityRef = useRef(1);
    const environmentProgressRef = useRef(0);

    useEffect(() => {
        onBackgroundFadeChange?.(backgroundOpacityRef.current);
        onEnvironmentProgressChange?.(environmentProgressRef.current);
    }, [onBackgroundFadeChange, onEnvironmentProgressChange]);

    const emitBackgroundOpacity = (value: number) => {
        const clamped = clamp(value, 0, 1);
        if (Math.abs(clamped - backgroundOpacityRef.current) > 0.005) {
            backgroundOpacityRef.current = clamped;
            onBackgroundFadeChange?.(clamped);
        }
    };
    const emitEnvironmentProgress = (value: number) => {
        const clamped = clamp(value, 0, 1);
        if (Math.abs(clamped - environmentProgressRef.current) > 0.005) {
            environmentProgressRef.current = clamped;
            onEnvironmentProgressChange?.(clamped);
        }
    };

    useFrame(({ clock }) => {
        const cake = cakeGroup.current; const table = tableGroup.current; const candle = candleGroup.current;
        if (!cake || !table || !candle) return;
        if (!hasPrimedRef.current) {
            cake.position.set(0, CAKE_START_Y, 0); table.position.set(0, 0, TABLE_START_Z); candle.position.set(0, CANDLE_START_Y, 0);
            candle.visible = false; hasPrimedRef.current = true;
        }
        if (!isPlaying) {
            emitBackgroundOpacity(1); emitEnvironmentProgress(0); animationStartRef.current = null;
            hasCompletedRef.current = false; return;
        }
        if (hasCompletedRef.current) {
            emitBackgroundOpacity(0); emitEnvironmentProgress(1);
            if (!completionNotifiedRef.current) { completionNotifiedRef.current = true; onAnimationComplete?.(); }
            if (smokeRef.current && !candleLit) {
                smokeRef.current.position.y += 0.005;
                (smokeRef.current.material as THREE.PointsMaterial).opacity *= 0.97;
            }
            return;
        }
        if (animationStartRef.current === null) animationStartRef.current = clock.elapsedTime;
        const elapsed = clock.elapsedTime - animationStartRef.current;
        const clampedElapsed = clamp(elapsed, 0, totalAnimationTime);
        cake.position.y = lerp(CAKE_START_Y, CAKE_END_Y, easeOutCubic(clamp(clampedElapsed / CAKE_DESCENT_DURATION, 0, 1)));
        cake.rotation.y = easeOutCubic(clamp(clampedElapsed / CAKE_DESCENT_DURATION, 0, 1)) * Math.PI * 2;
        if (clampedElapsed >= TABLE_SLIDE_START) table.position.z = lerp(TABLE_START_Z, TABLE_END_Z, easeOutCubic(clamp((clampedElapsed - TABLE_SLIDE_START) / TABLE_SLIDE_DURATION, 0, 1)));
        if (clampedElapsed >= CANDLE_DROP_START) {
            if (!candle.visible) candle.visible = true;
            candle.position.y = lerp(CANDLE_START_Y, CANDLE_END_Y, easeOutCubic(clamp((clampedElapsed - CANDLE_DROP_START) / CANDLE_DROP_DURATION, 0, 1)));
        }
        if (clampedElapsed < BACKGROUND_FADE_START) { emitBackgroundOpacity(1); emitEnvironmentProgress(0); }
        else {
            const fadeProgress = clamp((clampedElapsed - BACKGROUND_FADE_START) / BACKGROUND_FADE_DURATION, 0, 1);
            const bgOpacity = 1 - easeOutCubic(fadeProgress);
            emitBackgroundOpacity(bgOpacity); emitEnvironmentProgress(1 - bgOpacity);
        }
        if (clampedElapsed >= totalAnimationTime) hasCompletedRef.current = true;
    });

    return (
        <>
            <group ref={tableGroup}>
                <Table />
                <PictureFrame image="/frame2.jpg" position={[0, 0.735, 3]} rotation={[0, 5.6, 0]} scale={0.75} onClick={(e: any) => { e.stopPropagation(); onPhotoClick(new Vector3(0, 1, 3), "/frame2.jpg"); }} />
                <PictureFrame image="/frame3.jpg" position={[0, 0.735, -3]} rotation={[0, 4.0, 0]} scale={0.75} onClick={(e: any) => { e.stopPropagation(); onPhotoClick(new Vector3(0, 1, -3), "/frame3.jpg"); }} />
                <PictureFrame image="/frame4.jpg" position={[-1.5, 0.735, 2.5]} rotation={[0, 5.4, 0]} scale={0.75} onClick={(e: any) => { e.stopPropagation(); onPhotoClick(new Vector3(-1.5, 1, 2.5), "/frame4.jpg"); }} />
                <PictureFrame image="/frame1.jpg" position={[-1.5, 0.735, -2.5]} rotation={[0, 4.2, 0]} scale={0.75} onClick={(e: any) => { e.stopPropagation(); onPhotoClick(new Vector3(-1.5, 1, -2.5), "/frame1.jpg"); }} />
                {cards.map((card: any) => (
                    <BirthdayCard key={card.id} id={card.id} image={card.image} tablePosition={card.position} tableRotation={card.rotation} isActive={activeCardId === card.id} onToggle={() => onToggleCard(card.id)} />
                ))}
            </group>
            <group ref={cakeGroup}><Cake /></group>
            <group ref={candleGroup} onClick={(e) => { e.stopPropagation(); if(candleLit) (e as any).onBlow?.(); }}>
                <Candle isLit={candleLit} scale={0.5} position={[0.5, 0.5, 0.5]} rotation={[0.2, 0, -0.2]} />
            </group>
            {!candleLit && !fireworksActive && (
                <points ref={smokeRef} position={[0, 0.8, 0]}><sphereGeometry args={[0.05, 6, 6]} /><pointsMaterial color="#ffffff" transparent opacity={0.4} size={0.03} /></points>
            )}
            <Fireworks isActive={fireworksActive} /><Fireflies isActive={fireworksActive} /><Moon isActive={fireworksActive} /><Aurora isActive={fireworksActive} /><GoldenText isActive={fireworksActive} />
        </>
    );
}

const ORBIT_TARGET = new Vector3(0, 1, 0);
const FINAL_CAM_POS_BASE = new Vector3(3, 1, 0).add(ORBIT_TARGET); 
const START_CAM_TARGET = new Vector3(-40, 12, 0); 
const START_CAM_POS = new Vector3(-10, 15, 30);   
const CAMERA_SWOOP_DURATION = 6.0;

function CinematiceCameraControls({ sceneStarted, focusTarget }: { sceneStarted: boolean, focusTarget: Vector3 | null }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const [isSweeping, setIsSweeping] = useState(false);
  const sweepStartTime = useRef<number | null>(null);
  const isPortrait = size.height > size.width;

  useEffect(() => {
    if (sceneStarted) { setIsSweeping(true); camera.position.copy(START_CAM_POS); }
  }, [sceneStarted, camera]);

  useFrame(({ clock }) => {
    if (isSweeping) {
      if (sweepStartTime.current === null) sweepStartTime.current = clock.elapsedTime;
      const progress = Math.min((clock.elapsedTime - sweepStartTime.current) / CAMERA_SWOOP_DURATION, 1);
      const ease = easeInOutCubic(progress);
      
      const finalPos = FINAL_CAM_POS_BASE.clone();
      if (isPortrait) finalPos.add(new Vector3(2.5, 4.5, 11)); 
      
      camera.position.lerpVectors(START_CAM_POS, finalPos, ease);
      camera.lookAt(new Vector3().lerpVectors(START_CAM_TARGET, ORBIT_TARGET, ease));
      if (progress >= 1) setIsSweeping(false);
    } else if (focusTarget && controlsRef.current) {
      const direction = new Vector3().subVectors(camera.position, focusTarget).normalize();
      const zoomPos = focusTarget.clone().add(direction.multiplyScalar(2.0)); 
      camera.position.lerp(zoomPos, 0.07);
      controlsRef.current.target.lerp(focusTarget, 0.07);
      controlsRef.current.update();
    } else if (controlsRef.current) {
      controlsRef.current.target.lerp(ORBIT_TARGET, 0.05);
      controlsRef.current.update();
    }
  });
  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} minDistance={2} maxDistance={30} />;
}

// --- MAIN APP ---
export default function App() {
  const [appStage, setAppStage] = useState<'intro' | 'terminal' | 'flight' | 'typing' | 'preparing' | 'party'>('intro');
  const [typingFadingOut, setTypingFadingOut] = useState(false); 
  const [focusTarget, setFocusTarget] = useState<Vector3 | null>(null);
  const [activeMemory, setActiveMemory] = useState<string | null>(null);
  const [typedMemory, setTypedMemory] = useState("");
  
  const [environmentProgress, setEnvironmentProgress] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [hasAnimationCompleted, setHasAnimationCompleted] = useState(false);
  const [isCandleLit, setIsCandleLit] = useState(true);
  const [fireworksActive, setFireworksActive] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const { progress } = useProgress();
  
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, []);

  useEffect(() => {
    preloadAssets();
    ambientAudioRef.current = new Audio("/ambient_night.mp3");
    backgroundAudioRef.current = new Audio("/music.mp3");
    
    if (ambientAudioRef.current) { 
        ambientAudioRef.current.loop = true; 
        ambientAudioRef.current.volume = 0.5; 
    }

    if (backgroundAudioRef.current) {
        backgroundAudioRef.current.loop = true;
        backgroundAudioRef.current.volume = 0.8;
    }
  }, []);

  useEffect(() => {
    if (activeMemory) {
      setTypedMemory("");
      let i = 0;
      const interval = setInterval(() => {
        setTypedMemory(activeMemory.slice(0, i));
        i++;
        if (i > activeMemory.length) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    } else {
      setTypedMemory("");
    }
  }, [activeMemory]);

  const handleStart = () => {
    setAppStage('terminal');
    ambientAudioRef.current?.play().catch(e => console.error("Audio failed", e));
    backgroundAudioRef.current?.load();
  };

  useEffect(() => {
    if (appStage === 'typing') {
      if (currentLineIndex >= TYPED_LINES.length) {
        setTimeout(() => {
          setTypingFadingOut(true);
          setTimeout(() => setAppStage('preparing'), 1000);
        }, POST_TYPING_SCENE_DELAY);
      } else {
        const timeout = setTimeout(() => {
          if (currentCharIndex < (TYPED_LINES[currentLineIndex]?.length || 0)) setCurrentCharIndex(p => p + 1);
          else { setCurrentLineIndex(p => p + 1); setCurrentCharIndex(0); }
        }, TYPED_CHAR_DELAY);
        return () => clearTimeout(timeout);
      }
    }
  }, [appStage, currentLineIndex, currentCharIndex]);

  useEffect(() => {
    if (appStage === 'preparing' && progress === 100) {
      const timer = setTimeout(() => {
        setAppStage('party');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [appStage, progress]);

  const typedLines = useMemo(() => {
    if (appStage !== 'typing') return [];
    return TYPED_LINES.map((line, idx) => idx < currentLineIndex ? line : idx === currentLineIndex ? line.slice(0, currentCharIndex) : "");
  }, [currentCharIndex, currentLineIndex, appStage]);

  const blowCandle = useCallback(() => {
    if (hasAnimationCompleted && isCandleLit) {
      setIsCandleLit(false);
      ambientAudioRef.current?.pause();
      const bgMusic = backgroundAudioRef.current;
      if (bgMusic) { bgMusic.play().catch(err => console.warn(err)); }
      setTimeout(() => setFireworksActive(true), 800);
    }
  }, [hasAnimationCompleted, isCandleLit]);

  const handlePhotoSelect = (pos: Vector3, img: string) => {
    setFocusTarget(pos);
    setActiveMemory(PHOTO_MEMORIES[img] || "Memory retrieval failed. Unknown beautiful moment.");
  };

  return (
    <div className="App" style={{ 
        position: 'fixed', inset: '0', width: '100%', height: '100%', 
        overflow: 'hidden', background: '#000', touchAction: 'none' 
    }}>
      
      {appStage === 'intro' && (
        <div className="fullscreen-overlay" style={{ zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="terminal-box" style={{ textAlign: 'center', border: '1px solid #0f0' }}>
                <div style={{ color: '#0f0', marginBottom: '20px', fontFamily: 'monospace' }}></div>
                <button onClick={handleStart} className="wish-button" style={{ background: 'transparent', border: '1px solid #0f0', color: '#0f0', cursor: 'pointer' }}>
                    RUN SurprizeProtocol.exe
                </button>
            </div>
        </div>
      )}

      {activeMemory && (
        <div className="memory-overlay" style={{
          position: 'fixed', bottom: '20%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, color: '#0f0', fontFamily: 'monospace', textAlign: 'center',
          background: 'rgba(0,10,0,0.85)', padding: '20px', borderRadius: '4px',
          border: '1px solid #0f0', width: '85%', maxWidth: '450px', pointerEvents: 'none',
          boxShadow: '0 0 20px rgba(0,255,0,0.2)'
        }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '8px', letterSpacing: '2px' }}>[ DATA RETRIEVAL SUCCESSFUL ]</div>
          <div style={{ fontSize: '1rem', lineHeight: '1.4' }}>{typedMemory}<span className="cursor"></span></div>
          <div style={{ fontSize: '0.6rem', marginTop: '12px', color: '#666' }}>TAP BACKGROUND TO RETURN</div>
        </div>
      )}

      <PrepOverlay progress={progress} isVisible={appStage === 'preparing'} />

      {appStage === 'terminal' && <HackerTerminal onComplete={() => setAppStage('flight')} />}
      
      {appStage === 'flight' && (
        <Suspense fallback={<div style={{color:'#0f0', padding: '20px'}}>Syncing Warp Drive...</div>}>
            <EarthIntro startLat={CURRENT_LAT} startLon={CURRENT_LON} targetLat={TARGET_LAT} targetLon={TARGET_LON} onComplete={() => setAppStage('typing')} />
        </Suspense>
      )}

      {appStage === 'typing' && (
        <div className="fullscreen-overlay" style={{ opacity: typingFadingOut ? 0 : 1, zIndex: 40 }}>
          <div className="terminal-box">
            {typedLines.map((line, idx) => <div key={idx}>{line}{idx === currentLineIndex && <span className="cursor"></span>}</div>)}
          </div>
        </div>
      )}

      <div className="ui-layer" style={{ 
        opacity: hasAnimationCompleted && isCandleLit && appStage === 'party' ? 1 : 0, 
        pointerEvents: isCandleLit ? 'auto' : 'none',
        zIndex: 60, transition: 'opacity 1s ease',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
          <div style={{ color: 'white', marginBottom: '10px', textShadow: '0 0 10px #00ff00', textAlign: 'center' }}>
            🕯️ Make a Wish <br/>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Tap to Extinguish</span>
          </div>
          <button className="wish-button" onClick={blowCandle}>Make a Wish</button>
      </div>
      
      {(appStage === 'preparing' || appStage === 'party') && (
        <Canvas 
          shadows dpr={[1, 1.5]}
          gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false, depth: true }}
          style={{ opacity: appStage === 'party' ? 1 : 0, transition: 'opacity 2s ease' }}
          onPointerMissed={() => { setFocusTarget(null); setActiveCardId(null); setActiveMemory(null); }}
        >
          <Suspense fallback={null}>
            <AnimatedScene 
                isPlaying={appStage === 'party'} 
                candleLit={isCandleLit} 
                onBackgroundFadeChange={() => {}} 
                onEnvironmentProgressChange={setEnvironmentProgress} 
                onAnimationComplete={() => setHasAnimationCompleted(true)} 
                cards={[{ id: "confetti", image: "/card.png", position: [1, 0.085, -2], rotation: [-Math.PI / 2, 0, Math.PI / 3] }]} 
                activeCardId={activeCardId}
                onToggleCard={(id: string) => setActiveCardId(prev => (prev === id ? null : id))}
                fireworksActive={fireworksActive} 
                onPhotoClick={handlePhotoSelect}
            />
            <FireworkFlash active={fireworksActive} envProgress={environmentProgress} />
            
            {/* --- EMERGENCY MOBILE FIX #1: Replaced custom .hdr with built-in lightweight preset --- */}
            <Environment preset="night" background environmentIntensity={0.2 * environmentProgress} backgroundIntensity={0.1 * environmentProgress} />
            
            <EnvironmentBackgroundController intensity={0.1 * environmentProgress} />
            <CinematiceCameraControls sceneStarted={appStage === 'party'} focusTarget={focusTarget} />
            <EffectComposer enableNormalPass={false} multisampling={0}>
                <Bloom luminanceThreshold={1} mipmapBlur intensity={1.2} radius={0.3} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}