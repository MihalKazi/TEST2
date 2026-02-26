import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";

// --- GLOW SHADER (Unchanged) ---
const glowVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragmentShader = `
  varying vec2 vUv;
  void main() {
    float dist = distance(vUv, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 3.0);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * 0.8);
  }
`;

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

export function Moon({ isActive }: { isActive: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // LIGHT REFERENCES
  const mainLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const tableSpotRef = useRef<THREE.SpotLight>(null);

  // Helper target for the spotlight (The Table Center)
  const [target] = useState(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);
    return obj;
  });

  // Position
  const startPos = new THREE.Vector3(-40, 50, 0);
  const endPos = new THREE.Vector3(-40, 12, 0);

  // FIX: Renamed 'state' to '_state' so TypeScript ignores it
  useFrame((_state, delta) => {
    if (!groupRef.current || !mainLightRef.current || !hemiLightRef.current || !tableSpotRef.current) return;

    // 1. ANIMATION
    const targetPos = isActive ? endPos : startPos;
    const speed = delta * 0.5;
    groupRef.current.position.x = lerp(groupRef.current.position.x, targetPos.x, speed);
    groupRef.current.position.y = lerp(groupRef.current.position.y, targetPos.y, speed);
    groupRef.current.position.z = lerp(groupRef.current.position.z, targetPos.z, speed);

    const fadeSpeed = delta * 0.5;

    // 2. LIGHT BALANCING
    
    // Main Moon (Rim Light): Reduced slightly to prevent harshness
    const targetMain = isActive ? 1.0 : 0;
    mainLightRef.current.intensity = lerp(mainLightRef.current.intensity, targetMain, fadeSpeed);

    // Table Spot (Highlight): Bright warm light for the food
    const targetSpot = isActive ? 4.0 : 0;
    tableSpotRef.current.intensity = lerp(tableSpotRef.current.intensity, targetSpot, fadeSpeed);

    // Atmosphere (Global Illumination feel)
    const targetHemi = isActive ? 2.5 : 0;
    hemiLightRef.current.intensity = lerp(hemiLightRef.current.intensity, targetHemi, fadeSpeed);
  });

  return (
    <group>
      <primitive object={target} />

      <group ref={groupRef} position={[startPos.x, startPos.y, startPos.z]}>
        
        {/* --- VISIBLE MOON MESH --- */}
        <mesh>
          <sphereGeometry args={[4, 32, 32]} />
          <meshBasicMaterial color="#ffffff" /> 
        </mesh>

        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <mesh scale={[14, 14, 1]}>
            <planeGeometry />
            <shaderMaterial
              transparent
              depthWrite={false}
              vertexShader={glowVertexShader}
              fragmentShader={glowFragmentShader}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>

        {/* 1. BACKLIGHT (Moon) */}
        <directionalLight
          ref={mainLightRef}
          color="#ffffff" 
          intensity={0}
        />
        
        {/* 2. ATMOSPHERE FILL (Shadow Lifter) */}
        <hemisphereLight
          ref={hemiLightRef}
          // Sky Color: White (Brightens top surfaces)
          // Ground Color: Light Grey #666666 (Brightens shadows - No more black!)
          args={["#ffffff", "#666666", 0]} 
        />

        <pointLight color="#ffffff" intensity={1} distance={30} decay={2} />
      </group>

      {/* 3. TABLE HIGHLIGHT (Warm & Cozy) */}
      <spotLight
        ref={tableSpotRef}
        position={[10, 25, 5]} 
        target={target}        
        color="#fff5e6"        // Warm Cream
        angle={0.8}            // Widened angle to cover more of the table
        penumbra={1}           // Maximum softness on the spotlight edges
        castShadow             // Shadows still exist...
        shadow-bias={-0.0001}
        shadow-mapSize={[1024, 1024]} // High res shadows
        intensity={0}
      />
    </group>
  );
}