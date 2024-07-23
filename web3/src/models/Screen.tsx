import { Html, useGLTF } from "@react-three/drei";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx.tsx";
import { useMedia } from "react-use";
import type { FC } from "react";

export const Screen: FC<{
	showiFrame: boolean;
}> = ({ showiFrame }) => {
	const { url } = useScreenContentCtx();
	const { scene } = useGLTF("peach.glb");
	const isMobile = useMedia("(max-width: 768px)");
	
	return (
		<primitive
			object={scene}
			position={[0, -0.5, 0]}
			rotation={[0.05, 0, 0]}
			scale={isMobile ? 4 : 10}
		>
			<Html
				transform
				wrapperClass={"laptop"}
				distanceFactor={isMobile ? 0.4 : 0.42}
				position={isMobile ? [0, 0.17, 0] : [0, 0.085, 0]}
				rotation={[-0.3, 0, 0]}
			>
				{showiFrame && <iframe src={url} title={"Screen base url"} />}
			</Html>
		</primitive>
	);
};
