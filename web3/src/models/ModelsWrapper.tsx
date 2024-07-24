import { type Dispatch, type FC, type SetStateAction, useEffect } from "react";
import { Sky, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene.tsx";

const LoadingManager: FC<{ setIsLoading: Dispatch<SetStateAction<boolean>> }> = ({
	setIsLoading,
}) => {
	const { progress } = useProgress();

	useEffect(() => {
		setIsLoading(progress !== 100);
	}, [progress, setIsLoading]);

	return null;
};

type ModelsWrapperProps = {
	showiFrame: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export const ModelsWrapper: FC<ModelsWrapperProps> = ({ showiFrame, setIsLoading }) => {
	return (
		<Canvas
			camera={{
				fov: 60,
				near: 0.1,
				far: 100,
				position: [-0.4, 0.6, -0.16],
				rotation: [0, Math.PI / 2, 0],
			}}
		>
			<pointLight position={[0.8, 2, 0]} intensity={40} color={"#faf1dc"} />
			<Sky />
			<LoadingManager setIsLoading={setIsLoading} />
			<Scene />
		</Canvas>
	);
};
