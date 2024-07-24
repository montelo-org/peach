import type { Dispatch, FC, SetStateAction } from "react";
import { Environment, Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { LoadingManager } from "./LoadingManager.tsx";
import { useMedia } from "react-use";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx.tsx";
import { Apartment } from "./Apartment.tsx";
import { INITIAL_X, INITIAL_Y, INITIAL_Z, MOBILE_INITIAL_X, MOBILE_INITIAL_Y, MOBILE_INITIAL_Z, } from "./constants.ts";
import { CameraController } from "./CameraController.tsx";
import { useState } from "react";

type ModelsWrapperProps = {
	showiFrame: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export const SceneContainer: FC<ModelsWrapperProps> = ({ showiFrame, setIsLoading }) => {
	const { url } = useScreenContentCtx();
	const isMobile = useMedia("(max-width: 768px)");
	const [isZoomedIn, setIsZoomedIn] = useState(false);

	return (
		<Canvas
			camera={{
				fov: isMobile ? 100 : 60,
				near: 0.1,
				far: 1000,
				position: [
					isMobile ? MOBILE_INITIAL_X : INITIAL_X,
					isMobile ? MOBILE_INITIAL_Y : INITIAL_Y,
					isMobile ? MOBILE_INITIAL_Z : INITIAL_Z,
				],
				rotation: [0.1, -1.6, 0.12],
			}}
		>
			<pointLight position={[INITIAL_X, INITIAL_Y, INITIAL_Z]} color={"#fcf3dc"} intensity={4} />
			<Environment preset={"dawn"} />
			<LoadingManager setIsLoading={setIsLoading} />
			<Apartment />
			<CameraController isZoomedIn={isZoomedIn} setIsZoomedIn={setIsZoomedIn} />
			<Html
				transform
				wrapperClass={"laptop"}
				distanceFactor={isMobile ? isZoomedIn ? 0.8 : 0.4 : 0.44}
				position={isMobile ? [-2, 0.977, -0.43] : [-2.336, 0.672, -0.266]}
				rotation={[0, -Math.PI / 2, 0]}
			>
				{showiFrame && <iframe src={url} title={"Screen base url"} />}
			</Html>
		</Canvas>
	);
};
