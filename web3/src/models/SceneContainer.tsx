import type { Dispatch, FC, SetStateAction } from "react";
import { Environment, Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { LoadingManager } from "./LoadingManager.tsx";
import { useMedia } from "react-use";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx.tsx";
import { Apartment } from "./Apartment.tsx";
import { INITIAL_X, INITIAL_Y, INITIAL_Z, MOBILE_INITIAL_X, MOBILE_INITIAL_Y, MOBILE_INITIAL_Z, } from "./constants.ts";
import { CameraController } from "./CameraController.tsx";

type ModelsWrapperProps = {
	showiFrame: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export const SceneContainer: FC<ModelsWrapperProps> = ({ showiFrame, setIsLoading }) => {
	const { url } = useScreenContentCtx();
	const isMobile = useMedia("(max-width: 768px)");

	return (
		<Canvas
			camera={{
				fov: isMobile ? 100 : 60,
				near: 0.1,
				far: 100,
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
			<CameraController />
			<Html
				transform
				wrapperClass={"laptop"}
				distanceFactor={isMobile ? 0.373 : 0.44}
				position={isMobile ? [-2, 0.65, -0.26] : [-2, 0.64, -0.258]}
				rotation={[0, -Math.PI / 2, 0]}
			>
				{showiFrame && <iframe src={url} title={"Screen base url"} />}
			</Html>
		</Canvas>
	);
};
