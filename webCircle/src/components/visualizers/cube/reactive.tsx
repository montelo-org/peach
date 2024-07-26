import Ground from "@/components/visualizers/ground";
import { useCubeVisualConfigContext } from "@/context/visualConfig/cube";
import { Vector3 } from "three";

import BaseCube from "./base";
import { type ICoordinateMapper } from "@/lib/mappers/coordinateMappers/common";

const CubeVisual = ({ coordinateMapper }: { coordinateMapper: ICoordinateMapper }) => {
  const { nPerSide, unitSideLength, unitSpacingScalar, volume } =
    useCubeVisualConfigContext();
  
  return (
    <>
      <BaseCube
        coordinateMapper={coordinateMapper}
        nPerSide={nPerSide}
        cubeSideLength={unitSideLength}
        cubeSpacingScalar={unitSpacingScalar}
        volume={volume}
      />
      <Ground
        position={
          new Vector3(
            0,
            0,
            -0.75 * nPerSide * (1 + unitSpacingScalar) * unitSideLength,
          )
        }
      />
    </>
  );
};

export default CubeVisual;
