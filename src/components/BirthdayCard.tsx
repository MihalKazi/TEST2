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
const CARD_WIDTH = 4;
const CARD_HEIGHT = 3;
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
  const isMobile = size.width < 768;
  const isTablet = size.width >= 768 && size.width < 1100;
  
  const dynamicDistance = isMobile ? 0.6 : (isTablet ? 0.85 : 1.2);
  const activeScaleFactor = isMobile ? 2.2 : (isTablet ? 1.35 : 1.1);

  // --- PINCH TO ZOOM LOGIC ---
  const userScaleRef = useRef(1); // Keeps track of how much the user has pinched

  useEffect(() => {
    // If the card isn't popped up, reset the scale and don't listen for pinches
    if (!isActive) {
      userScaleRef.current = 1;
      return;
    }

    let initialDistance = 0;
    let initialScale = 1;

    // Helper function to measure distance between two fingers
    const getDistance = (touches: TouchList) => {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) { // 2 fingers detected
        initialDistance = getDistance(e.touches);
        initialScale = userScaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        // Stop the whole screen from scrolling/zooming natively
        if (e.cancelable) e.preventDefault(); 
        
        const currentDistance = getDistance(e.touches);
        const factor = currentDistance / initialDistance;
        
        // Calculate new scale and clamp it (Min: 0.5x smaller, Max: 4x larger)
        const newScale = Math.max(0.5, Math.min(initialScale * factor, 4.0));
        userScaleRef.current = newScale;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance = 0;
      }
    };

    // Attach listeners to the window so the user can pinch anywhere on the screen
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    // Cleanup listeners when card closes
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isActive]);
  // ---------------------------

  useCursor(isHovered || isActive, "pointer");

  const texture = useTexture(image);
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
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

    // --- SMOOTH SCALING MULTIPLIED BY USER PINCH ---
    const targetScale = isActive 
        ? BASE_SCALE * activeScaleFactor * userScaleRef.current // Multiply by user's pinch scale
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