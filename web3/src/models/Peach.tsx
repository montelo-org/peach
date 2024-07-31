import { Html, useGLTF } from "@react-three/drei";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx";

export function Peach(props: JSX.IntrinsicElements["group"]) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const { nodes, materials } = useGLTF("/peach.glb") as any;

	const { url } = useScreenContentCtx();

	const size = "512px";

	return (
		<group {...props} dispose={null} position={[0, -0.06, 0]}>
			<mesh
				geometry={nodes["3"].geometry}
				material={materials.Metal_Chrome}
				position={[-0.013, -0.003, 0]}
			/>
			<group position={[0, 0.084, 0]} rotation={[-0.33, 0, 0]}>
				<mesh geometry={nodes.Cube002.geometry} material={materials["Plastic_black glossy"]} />
				<mesh geometry={nodes.Cube002_1.geometry} material={materials.Screen} />
				<Html transform distanceFactor={0.115} position={[0, 0.2, 0.05]}>
					<iframe
						src={url}
						title="Screen content"
						style={{
							width: size,
							height: size,
							border: "none",
							borderRadius: "50%",
						}}
					/>
				</Html>
				<mesh geometry={nodes.Cube002_2.geometry} material={materials.Metal_aluminum} />
			</group>
			<mesh geometry={nodes.Cylinder004.geometry} material={materials["Plastic_black textured"]} />
			<mesh geometry={nodes.Cylinder004_1.geometry} material={materials["Plastic_black glossy"]} />
			<mesh geometry={nodes.Cylinder004_2.geometry} material={materials["Braided cable_PBR_glb"]} />
		</group>
	);
}

useGLTF.preload("/peach.glb");
