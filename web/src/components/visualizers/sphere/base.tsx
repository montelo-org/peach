import { useEffect, useMemo, useRef } from "react";
import { usePalette } from "@/lib/appState";
import {
  COORDINATE_TYPE,
  TWO_PI,
  type ICoordinateMapper,
} from "@/lib/mappers/coordinateMappers/common";
import { ColorPalette } from "@/lib/palettes";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Matrix4,
  MeshBasicMaterial,
  type InstancedMesh,
} from "three";

const BaseSphere = ({
                      coordinateMapper,
                      radius = 2,
                      nPoints = 800,
                      cubeSideLength = 0.05,
                    }: {
  coordinateMapper: ICoordinateMapper;
  radius?: number;
  nPoints?: number;
  cubeSideLength?: number;
}) => {
  const palette = usePalette();
  const meshRef = useRef<InstancedMesh>(null!);
  const tmpMatrix = useMemo(() => new Matrix4(), []);
  const lut = ColorPalette.getPalette(palette).buildLut();
  
  useEffect(() => {
    for (let i = 0; i < nPoints; i++) {
      meshRef.current.setColorAt(i, lut.getColor(i / nPoints));
    }
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [lut, meshRef, nPoints]);
  
  useFrame(({ clock }) => {
    const elapsedTimeSec = clock.getElapsedTime();
    let k, phi, theta, x, y, z, effectiveRadius;
    
    for (let i = 0; i < nPoints; i++) {
      k = i + 0.5;
      phi = Math.acos(1 - (2 * k) / nPoints) % Math.PI;
      theta = (Math.PI * (1 + Math.sqrt(5)) * k) % TWO_PI;
      
      const waveOffset = Math.sin(elapsedTimeSec + phi * 2) * 0.1;
      x = Math.cos(theta + waveOffset) * Math.sin(phi + waveOffset);
      y = Math.sin(theta + waveOffset) * Math.sin(phi + waveOffset);
      z = Math.cos(phi + waveOffset);
      
      effectiveRadius =
        radius +
        0.25 *
        radius *
        coordinateMapper.map(
          COORDINATE_TYPE.POLAR,
          theta / TWO_PI,
          phi / Math.PI,
          0,
          elapsedTimeSec,
        ) +
        Math.sin(elapsedTimeSec * 2 + phi * 5) * 0.1;
      
      meshRef.current.setMatrixAt(
        i,
        tmpMatrix.setPosition(
          x * effectiveRadius,
          y * effectiveRadius,
          z * effectiveRadius,
        ),
      );
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh
      ref={meshRef}
      castShadow={true}
      receiveShadow={true}
      args={[new BoxGeometry(), new MeshBasicMaterial(), nPoints]}
    >
      <boxGeometry
        attach="geometry"
        args={[cubeSideLength, cubeSideLength, cubeSideLength, 1]}
      />
      <meshBasicMaterial attach="material" color={"white"} toneMapped={false} />
    </instancedMesh>
  );
};

export default BaseSphere;
