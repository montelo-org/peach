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

export const ModelsWrapper: FC<ModelsWrapperProps> = ({ showiFrame, setIsLoading }) => {
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
			}}
		>
			<pointLight position={[INITIAL_X, INITIAL_Y, INITIAL_Z]} color={"#fcf3dc"} intensity={5} />
			<Environment preset={"dawn"} />
			<LoadingManager setIsLoading={setIsLoading} />
			<Apartment />
			<CameraController />
			<Html
				transform
				wrapperClass={"laptop"}
				distanceFactor={isMobile ? 0.373 : 0.373}
				position={isMobile ? [-2, 0.494, -0.163] : [-2, 0.491, -0.164]}
				rotation={[0, Math.PI / 2, 0]}
			>
				{showiFrame && <iframe src={url} title={"Screen base url"} />}
			</Html>
		</Canvas>
	);
};
