import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- THE AURORA SHADER ---
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    // 1. Create moving waves
    float time = uTime * 0.5;
    float w1 = sin(vUv.x * 5.0 + time);
    float w2 = sin(vUv.x * 15.0 - time * 1.5);
    float w3 = sin(vUv.y * 5.0 + vUv.x * 10.0 + time);
    float intensity = (w1 + w2 + w3) / 3.0;
    intensity = smoothstep(0.0, 0.8, intensity);

    // --- 2. REALISTIC COLORS (UPDATED) ---
    // Dominant bright green for the main body
    vec3 brightGreen = vec3(0.1, 1.0, 0.4); 
    // Soft magenta/pink for the upper edges
    vec3 softPink = vec3(1.0, 0.2, 0.8);

    // Mix logic: The bottom 60% is mostly green. The top fades to pink.
    // smoothstep(0.5, 1.0, vUv.y) creates a gradient starting halfway up.
    vec3 color = mix(brightGreen, softPink, smoothstep(0.5, 1.0, vUv.y));

    // --- 3. MASKING (Keeps it off the ground) ---
    // Fades out the bottom 40% completely so it floats high.
    float verticalMask = smoothstep(0.0, 0.4, vUv.y) * (1.0 - smoothstep(0.8, 1.0, vUv.y));
    float horizontalMask = smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));

    // Final Alpha calculation
    // Increased overall brightness slightly to 0.7
    float alpha = intensity * verticalMask * horizontalMask * uOpacity * 0.7;

    gl_FragColor = vec4(color, alpha);
  }
`;

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

export function Aurora({ isActive }: { isActive: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    const targetOpacity = isActive ? 1.0 : 0.0;
    matRef.current.uniforms.uOpacity.value = lerp(
      matRef.current.uniforms.uOpacity.value,
      targetOpacity,
      delta * 0.5
    );
  });

  return (
    // Positioned high in the sky behind the moon
    <mesh position={[-100, 50, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[200, 80, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}