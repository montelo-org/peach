import { Html, useGLTF } from "@react-three/drei";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx.tsx";

export const Screen = () => {
	const { url } = useScreenContentCtx();
	const { scene } = useGLTF("peach.glb");
	
	return (
		<primitive
			object={scene}
			position={[0, -0.5, 0]}
			rotation={[0.05, 0, 0]}
			scale={10}
		>
			<Html
				transform
				wrapperClass={"laptop"}
				distanceFactor={0.42}
				position={[0, 0.085, 0]}
				rotation={[-0.3, 0, 0]}
			>
				<iframe src={url} title={"Screen base url"} />
			</Html>
		</primitive>
	);
};
