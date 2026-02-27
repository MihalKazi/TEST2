import { useCursor, useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DoubleSide,
  Euler,
  Group,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";

type BirthdayCardProps = {
  id: string;
  image: string;
  tablePosition: [number, number, number];
  tableRotation: [number, number, number];
  isActive: boolean;
  onToggle: (id: string) => void;
  children?: ReactNode;
};

// --- CONSTANTS ---
const BASE_SCALE = 0.25;
const CARD_WIDTH = 4;  // Base units
const CARD_HEIGHT = 3; // Base units
const CAMERA_Y_FLOOR = 0.8;
const HOVER_LIFT = 0.04;

export function BirthdayCard({
  id,
  image,
  tablePosition,
  tableRotation,
  isActive,
  onToggle,
  children,
}: BirthdayCardProps) {
  const groupRef = useRef<Group>(null);
  const meshScalerRef = useRef<Group>(null);
  const { camera, size } = useThree();
  const [isHovered, setIsHovered] = useState(false);

  // --- RESPONSIVE LOGIC ---
  const isSmallScreen = size.width < 1100;
  const dynamicDistance = isSmallScreen ? 0.85 : 1.2;
  const activeScaleFactor = isSmallScreen ? 1.35 : 1.1;

  useCursor(isHovered || isActive, "pointer");

  const texture = useTexture(image);
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    
    // --- EMERGENCY MOBILE FIX #2: Lowered anisotropy from 8 to 2 ---
    // This stops the mobile GPU from doing extreme texture filtering
    texture.anisotropy = 2; 
    
  }, [texture]);

  const defaultPosition = useMemo(() => new Vector3(...tablePosition), [tablePosition]);
  const defaultQuaternion = useMemo(() => {
    const euler = new Euler(...tableRotation);
    return new Quaternion().setFromEuler(euler);
  }, [tableRotation]);

  const tmpPosition = useMemo(() => new Vector3(), []);
  const tmpQuaternion = useMemo(() => new Quaternion(), []);
  const tmpDirection = useMemo(() => new Vector3(), []);
  const cameraOffset = useMemo(() => new Vector3(0, -0.05, 0), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const meshScaler = meshScalerRef.current;
    if (!group || !meshScaler) return;

    const positionTarget = tmpPosition;
    const rotationTarget = tmpQuaternion;

    // --- SMOOTH SCALING ---
    const targetScale = isActive 
        ? BASE_SCALE * activeScaleFactor 
        : BASE_SCALE;
    
    meshScaler.scale.lerp(new Vector3(targetScale, targetScale, targetScale), 0.15);

    // --- MOVEMENT LOGIC ---
    if (isActive) {
      positionTarget.copy(camera.position);
      positionTarget.add(
        tmpDirection
          .copy(camera.getWorldDirection(tmpDirection))
          .multiplyScalar(dynamicDistance)
      );
      positionTarget.add(cameraOffset);

      if (positionTarget.y < CAMERA_Y_FLOOR) {
        positionTarget.y = CAMERA_Y_FLOOR;
      }
      rotationTarget.copy(camera.quaternion);
    } else {
      positionTarget.copy(defaultPosition);
      if (isHovered) positionTarget.y += HOVER_LIFT;
      rotationTarget.copy(defaultQuaternion);
    }

    const lerpAlpha = 1 - Math.exp(-delta * 12);
    const slerpAlpha = 1 - Math.exp(-delta * 10);

    group.position.lerp(positionTarget, lerpAlpha);
    group.quaternion.slerp(rotationTarget, slerpAlpha);
  });

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!isActive) setIsHovered(true);
  }, [isActive]);

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(false);
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onToggle(id);
  }, [id, onToggle]);

  return (
    <group ref={groupRef}>
      <group ref={meshScalerRef} scale={BASE_SCALE}>
        <mesh
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          castShadow
          receiveShadow
        >
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.3}
            metalness={0.05}
            toneMapped={false}
          />
        </mesh>

        <mesh position={[0, 0, -0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <meshStandardMaterial color="#fcfaff" roughness={0.5} />
        </mesh>

        <mesh position={[0, 0, -0.0008]}>
          <planeGeometry args={[CARD_WIDTH * 0.99, CARD_HEIGHT * 0.99]} />
          <meshStandardMaterial
            color="#ffffff"
            side={DoubleSide}
            roughness={1}
            metalness={0}
          />
        </mesh>
        
        {children}
      </group>
    </group>
  );
}