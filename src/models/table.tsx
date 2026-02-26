import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useMemo, useLayoutEffect } from "react";
import * as THREE from "three";
import type { Group } from "three";

// Configuration for Draco
const DRACO_URL = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

type TableProps = ThreeElements["group"];

export function Table({ children, ...groupProps }: TableProps) {
  // 1. Load the Draco compressed table model
  const { scene } = useGLTF("/table.glb", DRACO_URL);

  // 2. Clone the scene for performance and isolation
  const tableScene = useMemo<Group>(() => scene.clone(true), [scene]);

  // --- NEW: COLOR CHANGE LOGIC ---
  useLayoutEffect(() => {
    tableScene.traverse((child) => {
      // Check if the child is a Mesh (geometry)
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // DEBUG: Check your browser console to see the real names!
        // It might be named "Object_4", "TableCloth", "Fabric", etc.
        console.log("Found Table Part:", mesh.name); 

        // CHECK: If the name contains "cloth" or "fabric" (adjust this if your log says something else)
        if (
             mesh.name.toLowerCase().includes("cloth") || 
             mesh.name.toLowerCase().includes("fabric") ||
             mesh.name.toLowerCase().includes("top") 
           ) {
             
             // 1. Clone material to prevent coloring the legs too
             mesh.material = (mesh.material as THREE.Material).clone();
             
             // 2. Set the color (CHANGE THIS HEX CODE TO WHATEVER YOU WANT)
             // #800020 = Burgundy/Red, #ffffff = White, #0000ff = Blue
             (mesh.material as any).color.set("#800020"); 
        }
      }
    });
  }, [tableScene]);
  // -------------------------------

  return (
    <group {...groupProps} dispose={null}>
      <primitive 
        object={tableScene} 
        receiveShadow // This allows the cake/frames to cast shadows onto the table
        castShadow    // This allows the table to cast a shadow on the floor
      />
      {children}
    </group>
  );
}

// Preload for a seamless experience
useGLTF.preload("/table.glb", DRACO_URL);