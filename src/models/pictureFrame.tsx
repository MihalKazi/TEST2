import { useThree } from "@react-three/fiber";
import type { ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { useTexture, useGLTF } from "@react-three/drei";
import {
  Box3,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
  DoubleSide,
} from "three";

// Configuration for Draco
const DRACO_URL = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

type PictureFrameProps = ThreeElements["group"] & {
  image: string;
  imageScale?: number | [number, number];
  imageOffset?: [number, number, number];
  imageInset?: number;
};

const DEFAULT_IMAGE_SCALE: [number, number] = [0.82, 0.82];

export function PictureFrame({
  image,
  imageScale = DEFAULT_IMAGE_SCALE,
  imageOffset,
  imageInset = 0.01,
  children,
  ...groupProps
}: PictureFrameProps) {
  const { gl } = useThree();
  
  // 1. Load the Draco compressed frame
  const { scene } = useGLTF("/picture_frame.glb", DRACO_URL);
  
  // 2. Load the birthday photo texture
  const pictureTexture = useTexture(image);

  // Setup texture quality
  pictureTexture.colorSpace = SRGBColorSpace;
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
  pictureTexture.anisotropy = maxAnisotropy;

  // Clone the scene for multiple frame instances
  const frameScene = useMemo(() => scene.clone(true), [scene]);

  // Calculate the bounds of the frame to position the photo correctly
  const { frameSize, frameCenter } = useMemo(() => {
    const box = new Box3().setFromObject(frameScene);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { frameSize: size, frameCenter: center };
  }, [frameScene]);

  const scaledImage = useMemo<[number, number]>(() => {
    if (Array.isArray(imageScale)) return imageScale;
    return [imageScale, imageScale];
  }, [imageScale]);

  const [imageScaleX, imageScaleY] = scaledImage;
  const imageWidth = frameSize.x * imageScaleX;
  const imageHeight = frameSize.y * imageScaleY;

  // Adjust these if the photo isn't sitting right in the frame
  const [offsetX, offsetY, offsetZ] = imageOffset ?? [0, 0.05, -0.27];

  const imagePosition: [number, number, number] = [
    frameCenter.x + offsetX,
    frameCenter.y + offsetY,
    frameCenter.z + offsetZ,
  ];

  const pictureMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: pictureTexture,
        roughness: 0.1, // Slight gloss for the "glass" look
        metalness: 0,
        side: DoubleSide,
      }),
    [pictureTexture]
  );

  useEffect(() => {
    return () => {
      pictureMaterial.dispose();
    };
  }, [pictureMaterial]);

  return (
    <group {...groupProps} dispose={null}>
      {/* Grouping for the slight tilt of the frame on the table */}
      <group rotation={[0.04, 0, 0]}>
        <primitive object={frameScene} />
        <mesh 
          position={imagePosition} 
          rotation={[0.435, Math.PI, 0]} 
          material={pictureMaterial}
          castShadow
        >
          <planeGeometry args={[imageWidth, imageHeight]} />
        </mesh>
        {children}
      </group>
    </group>
  );
}

// Preload assets for a smooth transition
useGLTF.preload("/picture_frame.glb", DRACO_URL);