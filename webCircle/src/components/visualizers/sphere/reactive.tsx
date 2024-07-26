import Ground from "@/components/visualizers/ground";
import { useSphereVisualConfigContext } from "@/context/visualConfig/sphere";
import { Vector3 } from "three";

import BaseSphere from "./base";
import { type ICoordinateMapper } from "@/lib/mappers/coordinateMappers/common";

const SphereVisual = ({ coordinateMapper }: { coordinateMapper: ICoordinateMapper }) => {
  const { radius, nPoints, unitSideLength } = useSphereVisualConfigContext();
  
  return (
    <>
      <BaseSphere
        coordinateMapper={coordinateMapper}
        radius={radius}
        nPoints={nPoints}
        cubeSideLength={unitSideLength}
      />
      <Ground
        position={
          new Vector3(0, 0, -radius * (1 + 0.25 * coordinateMapper.amplitude))
        }
      />
    </>
  );
};

export default SphereVisual;
