import type { Dispatch, FC, SetStateAction } from "react";
import { useState } from "react";
import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { LoadingManager } from "./LoadingManager.tsx";
import { Apartment } from "./Apartment.tsx";
import { INITIAL_X, INITIAL_Y, INITIAL_Z, } from "./constants.ts";
import { CameraController } from "./CameraController.tsx";

type ModelsWrapperProps = {
	showiFrame: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export const SceneContainer: FC<ModelsWrapperProps> = ({ showiFrame, setIsLoading }) => {
	const [isZoomedIn, setIsZoomedIn] = useState(false);

	return (
		<Canvas
			camera={{
				fov: 60,
				near: 0.1,
				far: 100,
				rotation: [0.1, -1.58, 0.12],
			}}
		>
			<pointLight position={[INITIAL_X, INITIAL_Y, INITIAL_Z]} color={"#fcf3dc"} intensity={4} />
			<Environment preset={"dawn"} />
			<LoadingManager setIsLoading={setIsLoading} />
			<Apartment showiFrame={showiFrame} isZoomedIn={isZoomedIn} />
			<CameraController isZoomedIn={isZoomedIn} setIsZoomedIn={setIsZoomedIn} />
		</Canvas>
	);
};
