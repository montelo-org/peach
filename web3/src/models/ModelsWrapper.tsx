import type { Dispatch, FC, SetStateAction } from "react";
import { Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene.tsx";
import { LoadingManager } from "./LoadingManager.tsx";
import { CameraController } from "./CameraController.tsx";
import { INITIAL_X, INITIAL_Y, INITIAL_Z, MOBILE_INITIAL_X, MOBILE_INITIAL_Y, MOBILE_INITIAL_Z, } from "./constants.ts";
import { useMedia } from "react-use";

type ModelsWrapperProps = {
	showiFrame: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export const ModelsWrapper: FC<ModelsWrapperProps> = ({ showiFrame, setIsLoading }) => {
	const isMobile = useMedia("(max-width: 768px)");

	return (
		<Canvas
			camera={{
				fov: 60,
				near: 0.1,
				far: 100,
				position: [
					isMobile ? MOBILE_INITIAL_X : INITIAL_X,
					isMobile ? MOBILE_INITIAL_Y : INITIAL_Y,
					isMobile ? MOBILE_INITIAL_Z : INITIAL_Z,
				],
				rotation: [0, Math.PI / 2, 0],
			}}
		>
			<pointLight position={[0, 3, 1.2]} intensity={25} color={"#faf1dc"} />
			<pointLight position={[0, 3, -1.4]} intensity={25} color={"#faf1dc"} />
			<Sky />
			<LoadingManager setIsLoading={setIsLoading} />
			<CameraController />
			<Scene />
		</Canvas>
	);
};
