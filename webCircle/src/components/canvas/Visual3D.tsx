import AudioVisual from "@/components/visualizers/visualizerAudio";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

const Visual3DCanvas = () => {
  return (
    <Canvas
      camera={{
        fov: 45,
        near: 1,
        far: 1000,
        position: [-17, -6, 6.5],
        up: [0, 0, 1],
      }}
      linear={true}
    >
      <AudioVisual/>
      <OrbitControls makeDefault/>
    </Canvas>
  );
};

export default Visual3DCanvas;
