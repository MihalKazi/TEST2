import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- HELPER: Create a soft glow texture (Firefly look) ---
function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // Draw a radial gradient (soft center, transparent edges)
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)"); // Bright center
  gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.2)"); // Soft halo
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)"); // Transparent edge

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function Fireflies({ isActive }: { isActive: boolean }) {
  const meshRef = useRef<THREE.Points>(null);

  // 1. Create the glow texture
  const glowTexture = useMemo(() => createGlowTexture(), []);

  // Fireflies are sparse, so we use fewer particles than stars (e.g., 60 instead of 600)
  const count = 60; 
  const area = 20;

  // 2. Create Particles with random starting positions and "drift" offsets
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const randoms = new Float32Array(count); // Used for independent movement timing

    const color1 = new THREE.Color("#ccff00"); // Yellow-Green
    const color2 = new THREE.Color("#ffaa00"); // Orange-Gold

    for (let i = 0; i < count; i++) {
      // Position
      positions[i * 3] = (Math.random() - 0.5) * area;     // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10 + 5; // y (keep them slightly elevated)
      positions[i * 3 + 2] = (Math.random() - 0.5) * area; // z

      // Color
      const mixedColor = Math.random() > 0.5 ? color1 : color2;
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      // Random phase for animation
      randoms[i] = Math.random() * Math.PI * 2;
    }
    return { positions, colors, randoms };
  }, [count, area]);

  // 3. Animate the fireflies drifting
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Get the current time
    const t = state.clock.elapsedTime;
    
    // Access the geometry positions to update them
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
        // We use the stored initial random values to make them move differently
        // "i * 3 + 1" is the Y position (Up/Down)
        
        // Gentle Bobbing (Up/Down) based on time and their unique random offset
        positions[i * 3 + 1] += Math.sin(t * 2 + particles.randoms[i]) * 0.02;
        
        // Gentle Wiggle (X/Z)
        positions[i * 3] += Math.cos(t + particles.randoms[i]) * 0.01;
    }

    // IMPORTANT: Tell Three.js the positions have changed
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Slowly rotate the whole group for extra dynamism
    meshRef.current.rotation.y = t * 0.05;
  });

  if (!isActive) return null;

  return (
    <group>
        <points ref={meshRef}>
        <bufferGeometry>
            <bufferAttribute
                attach="attributes-position"
                count={count}
                array={particles.positions}
                itemSize={3}
                args={[particles.positions, 3]} 
            />
            <bufferAttribute
                attach="attributes-color"
                count={count}
                array={particles.colors}
                itemSize={3}
                args={[particles.colors, 3]} 
            />
        </bufferGeometry>
        <pointsMaterial
            map={glowTexture}
            size={0.5} // Larger size because the texture is soft
            vertexColors
            transparent
            opacity={0.8}
            sizeAttenuation={true}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
        />
        </points>
    </group>
  );
}