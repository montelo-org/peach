import React, { useRef, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx.tsx";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Sphere, Vector3 } from "three";

export function Apartment(props: JSX.IntrinsicElements["group"]) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const { nodes, materials } = useGLTF("https://r2.getpeachpod.com/min-apartment.glb") as any;
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
			<group position={[-3.5, 1.997, -3.637]}>
				<mesh geometry={nodes.Cube029.geometry} material={materials.Metal} />
				<mesh geometry={nodes.Cube029_1.geometry} material={materials.DarkWood} />
				<mesh geometry={nodes.Cube029_2.geometry} material={materials.Marble} />
			</group>
			<mesh
				geometry={nodes.Toaster_Low.geometry}
				material={materials.Toaster}
				position={[-1.771, 1.03, -3.797]}
			/>
			<mesh
				geometry={nodes.Microwave_Low.geometry}
				material={materials.Microwave}
				position={[-1.318, 1.105, -3.75]}
			/>
			<mesh
				geometry={nodes.Stove.geometry}
				material={materials.Stovetop}
				position={[-2.125, 0.936, -3.676]}
			/>
			<mesh
				geometry={nodes.Oven.geometry}
				material={materials.Oven}
				position={[-2.124, 0.464, -3.47]}
			/>
			<group position={[-0.409, 2.148, -3.998]}>
				<mesh geometry={nodes.Cube020.geometry} material={materials.Metal} />
				<mesh geometry={nodes.Cube020_1.geometry} material={materials.LightGradient2} />
				<mesh geometry={nodes.Cube020_2.geometry} material={materials.Marble} />
				<mesh geometry={nodes.Cube020_3.geometry} material={materials.Wood} />
				<mesh geometry={nodes.Cube020_4.geometry} material={materials.Ceiling} />
				<mesh geometry={nodes.Cube020_5.geometry} material={materials.WoodFloor} />
				<mesh geometry={nodes.Cube020_6.geometry} material={materials.Walls} />
				<mesh geometry={nodes.Cube020_7.geometry} material={materials.TileFloor} />
				<mesh geometry={nodes.Cube020_8.geometry} material={materials.TileWall} />
				<mesh geometry={nodes.Cube020_9.geometry} material={materials.Outlet} />
			</group>
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
			<mesh
				geometry={nodes.Glass001.geometry}
				material={materials.Glass}
				position={[-3.601, 1.317, 1.993]}
			/>
			<group position={[-2.046, 0.924, 1.379]}>
				<mesh geometry={nodes.Cube044.geometry} material={materials.Wood} />
				<mesh geometry={nodes.Cube044_1.geometry} material={materials.Metal} />
			</group>
			<group position={[-3.574, 0.599, 0.628]}>
				<mesh geometry={nodes.Cylinder005.geometry} material={materials.Leaf} />
				<mesh geometry={nodes.Cylinder005_1.geometry} material={materials.PottedPlant} />
			</group>
			<mesh
				geometry={nodes.Plane002.geometry}
				material={nodes.Plane002.material}
				position={[-4.979, 2.844, -1.141]}
			/>
			<mesh
				geometry={nodes.Plane003.geometry}
				material={nodes.Plane003.material}
				position={[-1.829, 3.011, 1.432]}
			/>
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
			<group position={[-2.336, 0.675, -0.266]} rotation={[-1.559, -1.241, -1.558]}>
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
							width: "100%", // Slightly smaller to fit within the circular bound
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

useGLTF.preload("https://r2.getpeachpod.com/min-apartment.glb");
