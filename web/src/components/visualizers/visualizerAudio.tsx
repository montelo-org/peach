import { useFFTAnalyzerContext } from "@/context/fftAnalyzer";
import { useVisualSourceDataX } from "@/lib/appState";
import { CoordinateMapper_Data } from "@/lib/mappers/coordinateMappers/data";
import { Suspense } from "react";
import SphereVisual from "@/components/visualizers/sphere/reactive";

const AudioVisual = () => {
  const freqData = useVisualSourceDataX();
  const { amplitude } = useFFTAnalyzerContext();
  
  const coordinateMapper = new CoordinateMapper_Data(amplitude, freqData);
  
  return (
    <Suspense fallback={null}>
      {/*<CubeVisual coordinateMapper={coordinateMapper} />*/}
      <SphereVisual coordinateMapper={coordinateMapper}/>
    </Suspense>
  );
};

export default AudioVisual;
