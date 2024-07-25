import type { Dispatch, FC, SetStateAction } from "react";
import { useState } from "react";
import { Environment, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { LoadingManager } from "./LoadingManager.tsx";
import { Apartment } from "./Apartment.tsx";
import { INITIAL_X, INITIAL_Y, INITIAL_Z, MOBILE_INITIAL_X, MOBILE_INITIAL_Y, MOBILE_INITIAL_Z, } from "./constants.ts";
import { CameraController } from "./CameraController.tsx";
import { useMedia } from "react-use";

type ModelsWrapperProps = {
	showiFrame: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export const SceneContainer: FC<ModelsWrapperProps> = ({ showiFrame, setIsLoading }) => {
	const isMobile = useMedia("(max-width: 768px)");
	const [isZoomingIn, setIsZoomingIn] = useState<boolean>(false);

	return (
		<Canvas
			camera={{
				fov: isMobile ? 90 : 60,
				near: 0.1,
				far: 1000,
				position: [
					isMobile ? MOBILE_INITIAL_X : INITIAL_X,
					isMobile ? MOBILE_INITIAL_Y : INITIAL_Y,
					isMobile ? MOBILE_INITIAL_Z : INITIAL_Z,
				],
			}}
		>
			<color attach="background" args={["#000000"]} />
			<Stars />
			<Environment preset="dawn" />
			<LoadingManager setIsLoading={setIsLoading} />
			<Apartment showiFrame={showiFrame && !isZoomingIn} />
			<CameraController setIsZoomingIn={setIsZoomingIn} />
		</Canvas>
	);
};
