import { useEffect, useRef, useState, useMemo } from "react";
import Globe from "react-globe.gl"; 

// FIX: Removed { GlobeMethods } from import to prevent the crash.
// We will use 'any' for the ref to keep it simple and working.

interface EarthIntroProps {
  startLat: number;
  startLon: number;
  targetLat: number;
  targetLon: number;
  onComplete: () => void;
}

export function EarthIntro({ startLat, startLon, targetLat, targetLon, onComplete }: EarthIntroProps) {
  // Use 'any' here to bypass the missing type export issue
  const globeEl = useRef<any>(undefined);
  const [showLabel, setShowLabel] = useState(false);

  // Flight Data: A single arc from Start to Target
  const arcData = useMemo(() => [
    {
      startLat: startLat,
      startLng: startLon,
      endLat: targetLat,
      endLng: targetLon,
      color: ['#ff0000', '#00ff00'] // Red to Green gradient
    }
  ], [startLat, startLon, targetLat, targetLon]);

  useEffect(() => {
    // 1. Initial Camera Position (High above start point)
    if (globeEl.current) {
        // "pointOfView" is the camera controller in react-globe.gl
        globeEl.current.pointOfView({ lat: startLat, lng: startLon, altitude: 2.5 }, 0);
        
        // 2. Start Animation Sequence
        const timeout1 = setTimeout(() => {
            // Move to Target over 2.5 seconds
            globeEl.current?.pointOfView({ lat: targetLat, lng: targetLon, altitude: 1.5 }, 2500);
        }, 1000);

        // 3. Zoom In closer to target
        const timeout2 = setTimeout(() => {
            globeEl.current?.pointOfView({ lat: targetLat, lng: targetLon, altitude: 0.4 }, 2000);
            setShowLabel(true);
        }, 3500);

        // 4. End Scene
        const timeout3 = setTimeout(() => {
            onComplete();
        }, 5500);

        return () => {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            clearTimeout(timeout3);
        };
    }
  }, [startLat, startLon, targetLat, targetLon, onComplete]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="#000000"
        arcsData={arcData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={1}
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.2}
      />
      
      {/* HUD OVERLAY */}
      <div style={{
        position: 'absolute',
        bottom: '50px',
        left: '50px',
        color: '#0f0',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: 20
      }}>
        <h2 style={{ fontSize: '24px', margin: 0 }}>FLIGHT PROTOCOL INITIATED</h2>
        <p>Trajectory: KHULNA, BD {'->'} NORHTERN CAPE, SA</p>
        <p>Speed: 1 LightSpeed Year</p>
        {showLabel && <h1 style={{ color: 'white', fontSize: '40px', textShadow: '0 0 10px #fff' }}>ARRIVED</h1>}
      </div>
    </div>
  );
}