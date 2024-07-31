import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Peach } from "./Peach.tsx";

export const SceneContainer = () => {
	return (
		<Canvas
			camera={{
				fov: 60,
				near: 0.1,
				far: 100,
				position: [0, 0.05, 0.23],
			}}
		>
			<Environment preset="city" />
			<Peach />
			<OrbitControls
				enableZoom={false}
				enablePan={false}
				minPolarAngle={-Math.PI / 2}
				maxPolarAngle={Math.PI / 2}
				minAzimuthAngle={-Math.PI / 1.9}
				maxAzimuthAngle={Math.PI / 1.9}
			/>
		</Canvas>
	);
};
