import { useRef, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx.tsx";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Sphere, Vector3 } from "three";

export function Apartment(
	props: JSX.IntrinsicElements["group"] & {
		showiFrame: boolean;
	},
) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const { nodes, materials } = useGLTF("https://r2.getpeachpod.com/min2-apartment.glb") as any;
	const { url } = useScreenContentCtx();
	const [htmlPosition, setHtmlPosition] = useState({
		top: 0,
		left: 0,
		width: 0,
		height: 0,
		radius: 0,
	});
	const { camera, size } = useThree();

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const screenRef = useRef<any>();

	useFrame(() => {
		if (screenRef.current) {
			const screenMesh = screenRef.current.children.find(
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				(child: any) => child.geometry === nodes.Cube001_1.geometry,
			);
			if (screenMesh) {
				const box = new Box3().setFromObject(screenMesh);
				const sphere = new Sphere();
				box.getBoundingSphere(sphere);

				const corners = [
					new Vector3(box.min.x, box.min.y, box.min.z),
					new Vector3(box.max.x, box.max.y, box.max.z),
				];

				const screenCorners = corners.map((corner) => {
					const screenPosition = corner.clone().project(camera);
					return new Vector3(
						((screenPosition.x + 0.99) * size.width) / 2,
						((-screenPosition.y + 0.98) * size.height) / 2,
						0,
					);
				});

				const [min, max] = screenCorners;
				const left = Math.min(min.x, max.x);
				const top = Math.min(min.y, max.y);
				const width = Math.abs(max.x - min.x);
				const height = Math.abs(max.y - min.y);

				// Calculate the radius in screen space
				const centerWorld = sphere.center.clone();
				const edgeWorld = centerWorld.clone().add(new Vector3(sphere.radius, 0, 0));
				const centerScreen = centerWorld.project(camera);
				const edgeScreen = edgeWorld.project(camera);
				const radiusScreen = Math.abs(((edgeScreen.x - centerScreen.x) * size.width) / 2);

				setHtmlPosition({ left, top, width, height, radius: radiusScreen });
			}
		}
	});
	return (
		<group {...props} dispose={null}>
			<mesh
				geometry={nodes.Sofa.geometry}
				material={materials.Couch}
				position={[-4.281, 0.485, -1.125]}
			/>
			<group position={[-2.298, 0.377, -0.273]}>
				<mesh geometry={nodes.Cube034.geometry} material={materials.DarkWood} />
				<mesh geometry={nodes.Cube034_1.geometry} material={materials.Metal} />
			</group>
			<mesh
				geometry={nodes.Table.geometry}
				material={materials.DarkWood}
				position={[-3.674, 0.31, 0.229]}
			/>
			<group position={[-3.574, 0.599, 0.628]}>
				<mesh geometry={nodes.Cylinder005.geometry} material={materials.Leaf} />
				<mesh geometry={nodes.Cylinder005_1.geometry} material={materials.PottedPlant} />
			</group>
			<mesh
				geometry={nodes.Mug.geometry}
				material={materials.Mug}
				position={[-3.807, 0.512, 0.183]}
			/>
			<mesh
				geometry={nodes.Book001.geometry}
				material={materials.Book}
				position={[-3.762, 0.483, -0.049]}
			/>
			<mesh
				geometry={nodes.Basket001.geometry}
				material={materials.Plastic}
				position={[-2.327, 0.464, -0.332]}
			/>
			<group ref={screenRef} position={[-2.336, 0.675, -0.266]} rotation={[-1.559, -1.241, -1.558]}>
				<mesh geometry={nodes.Cube001.geometry} material={materials["Plastic_black glossy"]} />
				<mesh geometry={nodes.Cube001_1.geometry} material={materials.Screen} />
				<mesh geometry={nodes.Cube001_2.geometry} material={materials.Metal_aluminum} />
			</group>
			<Html fullscreen>
				<div
					style={{
						position: "absolute",
						left: `${htmlPosition.left}px`,
						top: `${htmlPosition.top}px`,
						width: `${htmlPosition.width}px`,
						height: `${htmlPosition.height}px`,
						overflow: "hidden",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						transform: "perspective(1000px) rotateY(-10deg)",
					}}
				>
					<div
						style={{
							width: "100%",
							height: "96%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{props.showiFrame ? (
							<iframe
								src={url}
								title="Screen content"
								style={{ width: "100%", height: "100%", border: "none", borderRadius: "50%" }}
							/>
						) : null}
					</div>
				</div>
			</Html>
			<group position={[-2.336, 0.591, -0.266]} rotation={[0, -1.567, 0]}>
				<mesh
					geometry={nodes.Cylinder004.geometry}
					material={materials["Plastic_black textured"]}
				/>
				<mesh
					geometry={nodes.Cylinder004_1.geometry}
					material={materials["Plastic_black glossy"]}
				/>
				<mesh
					geometry={nodes.Cylinder004_2.geometry}
					material={materials["Braided cable_PBR_glb"]}
				/>
			</group>
			<mesh
				geometry={nodes["3"].geometry}
				material={materials.Metal_Chrome}
				position={[-2.336, 0.588, -0.279]}
				rotation={[0, -1.567, 0]}
			/>
		</group>
	);
}

useGLTF.preload("https://r2.getpeachpod.com/min2-apartment.glb");
