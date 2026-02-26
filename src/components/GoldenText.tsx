import { Text3D, Center } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

const fontUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/gentilis_bold.typeface.json';

// --- UPGRADED REALISTIC GOLD MATERIAL ---
const goldMaterial = new THREE.MeshPhysicalMaterial({
  color: "#FFD700",         // Base Gold
  metalness: 1,             // Fully metallic
  roughness: 0.15,          // Slightly rough for realistic reflections
  clearcoat: 1,             // Varnish layer on top for extra shine
  clearcoatRoughness: 0.1,  // Polish the varnish
  emissive: "#ffaa00",      // Inner orange glow
  emissiveIntensity: 0.5,   // Slight glow
  reflectivity: 1,
});

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

export function GoldenText({ isActive }: { isActive: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  // Position settings
  const posX = -40; 
  const posZ = 0;   
  const startY = -40; 
  const endY = 8; 

  // FIX: Renamed 'state' to '_state' to satisfy TypeScript strict mode
  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // 1. Position Interpolation (Rise Up)
    const targetY = isActive ? endY : startY;
    groupRef.current.position.y = lerp(groupRef.current.position.y, targetY, delta * 0.8);

    // 2. Scale Interpolation (Grow Smoothly)
    const targetScale = isActive ? 1 : 0;
    const currentScale = groupRef.current.scale.x;
    const newScale = lerp(currentScale, targetScale, delta * 2.0); 
    
    groupRef.current.scale.set(newScale, newScale, newScale);
  });

  const textOptions = useMemo(() => ({
    font: fontUrl,
    size: 4, 
    height: 0.5,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.05,
    bevelOffset: 0,
    bevelSegments: 5,
  }), []);

  return (
    <group 
      ref={groupRef} 
      position={[posX, startY, posZ]}
      rotation={[0, Math.PI / 2, 0]} 
      scale={[0, 0, 0]}
      visible={isActive}
    >
      <Center top> 
        <Text3D 
          {...textOptions} 
          material={goldMaterial}
          castShadow
          receiveShadow
        >
          HAPPY BIRTHDAY ABIDA
        </Text3D>
      </Center>
      
      {/* Lights tailored to make the Gold sparkle */}
      <pointLight 
        position={[0, 5, 10]}
        intensity={5.0} 
        color="#ffaa00" 
        distance={60}
        decay={1.5}
      />
      <pointLight 
        position={[0, -5, 10]}
        intensity={2.0} 
        color="#ffffff" 
        distance={60}
        decay={1.5}
      />
    </group>
  );
}