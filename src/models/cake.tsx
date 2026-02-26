import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { Group } from "three";

type CakeProps = ThreeElements["group"];

export function Cake({ children, ...groupProps }: CakeProps) {
  // 1. Path to your compressed model
  // 2. Path to the Draco Decoder (Google's CDN)
  const { scene } = useGLTF(
    "/cake.glb", 
    "https://www.gstatic.com/draco/versioned/decoders/1.5.5/"
  );
  
  // Clone the scene so we can use it safely without affecting other instances
  const cakeScene = useMemo<Group>(() => scene.clone(true), [scene]);

  return (
    <group {...groupProps} dispose={null}>
      <primitive 
        object={cakeScene} 
        scale={2.5} 
        position={[0, 0.8, 0]} 
        rotation={[0, 0, 0]} 
        castShadow
        receiveShadow
      />
      {children}
    </group>
  );
}

// Pre-fetching for smoother performance
useGLTF.preload("/cake.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.5/");