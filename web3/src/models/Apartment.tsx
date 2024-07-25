import { Html, useGLTF } from "@react-three/drei";
import { useScreenContentCtx } from "../contexts/ScreenContentCtx.tsx";
import { useRef, useState } from "react";
import { Box3, Sphere, Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";

export function Apartment(
	props: JSX.IntrinsicElements["group"] & {
		showiFrame: boolean;
	},
) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const { nodes, materials } = useGLTF("https://r2.getpeachpod.com/apartment.glb") as any;
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
		<>
			<group {...props} dispose={null}>
				<mesh
					geometry={nodes.Fridge_Low.geometry}
					material={materials.Fridge}
					position={[-3.499, 0.818, -3.559]}
				/>
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
				<mesh
					geometry={nodes.Endtable.geometry}
					material={materials.EndTable}
					position={[-0.427, 0.224, -1.587]}
				/>
				<group position={[-2.82, 1.018, -3.885]}>
					<mesh geometry={nodes.Cube031.geometry} material={materials.Metal} />
					<mesh geometry={nodes.Cube031_1.geometry} material={materials.GreyWood} />
					<mesh geometry={nodes.Cube031_2.geometry} material={materials.Marble} />
					<mesh geometry={nodes.Cube031_3.geometry} material={materials.Ceramic} />
				</group>
				<mesh
					geometry={nodes.Toilet.geometry}
					material={materials.Toilet}
					position={[0.416, 0.451, -3.712]}
				/>
				<mesh
					geometry={nodes.Bed_Low.geometry}
					material={materials.Bed}
					position={[0.483, 0.935, -0.681]}
				/>
				<group position={[-0.409, 2.148, -3.998]}>
					<mesh geometry={nodes.Cube020.geometry} material={materials.LightGradient} />
					<mesh geometry={nodes.Cube020_1.geometry} material={materials.Metal} />
					<mesh geometry={nodes.Cube020_2.geometry} material={materials.LightGradient2} />
					<mesh geometry={nodes.Cube020_3.geometry} material={materials.Ceramic} />
					<mesh geometry={nodes.Cube020_4.geometry} material={materials.Marble} />
					<mesh geometry={nodes.Cube020_5.geometry} material={materials.Wood} />
					<mesh geometry={nodes.Cube020_6.geometry} material={materials.Ceiling} />
					<mesh geometry={nodes.Cube020_7.geometry} material={materials.WoodFloor} />
					<mesh geometry={nodes.Cube020_8.geometry} material={materials.Walls} />
					<mesh geometry={nodes.Cube020_9.geometry} material={materials.TileFloor} />
					<mesh geometry={nodes.Cube020_10.geometry} material={materials.TileWall} />
					<mesh geometry={nodes.Cube020_11.geometry} material={materials.Outlet} />
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
				<group position={[-3.595, 2.385, 1.719]}>
					<mesh geometry={nodes.Cylinder.geometry} material={materials.Metal} />
					<mesh geometry={nodes.Cylinder_1.geometry} material={materials.Curtain} />
				</group>
				<group position={[0.015, 2.385, 1.719]}>
					<mesh geometry={nodes.Cylinder001.geometry} material={materials.Metal} />
					<mesh geometry={nodes.Cylinder001_1.geometry} material={materials.Curtain} />
				</group>
				<mesh
					geometry={nodes.Glass.geometry}
					material={materials.Glass}
					position={[0.012, 1.317, 1.993]}
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
				<group position={[-4.832, 1.198, 1.342]}>
					<mesh geometry={nodes.Cube043.geometry} material={materials["Metal.001"]} />
					<mesh geometry={nodes.Cube043_1.geometry} material={materials.Lamp} />
				</group>
				<group position={[1.348, 1.198, -1.446]}>
					<mesh geometry={nodes.Cube045.geometry} material={materials["Metal.001"]} />
					<mesh geometry={nodes.Cube045_1.geometry} material={materials.Lamp} />
				</group>
				<mesh
					geometry={nodes.Outlet002.geometry}
					material={materials.Outlet}
					position={[-3.014, 1.089, -3.997]}
					rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
					scale={0.757}
				/>
				<mesh
					geometry={nodes.Outlet005.geometry}
					material={materials.Outlet}
					position={[0.002, 0.18, 1.796]}
				/>
				<mesh
					geometry={nodes.Outlet009.geometry}
					material={materials.Outlet}
					position={[-2.104, 0.176, -0.292]}
				/>
				<mesh
					geometry={nodes.Mug001.geometry}
					material={materials.Mug}
					position={[-3.08, 0.984, -3.578]}
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
					geometry={nodes.ThrowPillow_Low.geometry}
					material={materials.ThrowPillow}
					position={[-4.585, 0.714, 0.588]}
				/>
				<mesh
					geometry={nodes.ThrowPillow_Low001.geometry}
					material={materials.ThrowPillow}
					position={[-4.655, 0.691, -1.304]}
				/>
				<mesh
					geometry={nodes.ThrowPillow_Low002.geometry}
					material={materials.ThrowPillow}
					position={[-4.637, 0.708, 0.237]}
				/>
				<mesh
					geometry={nodes.ThrowPillow_Low003.geometry}
					material={materials.ThrowPillow}
					position={[0.605, 0.644, -1.415]}
				/>
				<mesh
					geometry={nodes.Cables002.geometry}
					material={materials.CableWhite}
					position={[-5.084, 0.196, 0.935]}
				/>
				<mesh
					geometry={nodes.Lamp002.geometry}
					material={materials["Lamp.001"]}
					position={[-0.462, 0.581, -1.579]}
				/>
				<mesh
					geometry={nodes.Basket001.geometry}
					material={materials.Plastic}
					position={[-2.327, 0.464, -0.332]}
				/>
				<mesh
					geometry={nodes.Cables001.geometry}
					material={materials.CableBlack}
					position={[-1.649, 1.087, -3.98]}
				/>
				<mesh
					geometry={nodes.Shower001.geometry}
					material={materials["Glass.001"]}
					position={[1.202, 0.047, -2.875]}
				/>
				<mesh
					geometry={nodes.Shower002.geometry}
					material={materials.Mirror}
					position={[1.202, 0.047, -2.875]}
				/>
				<group
					ref={screenRef}
					position={[-2.336, 0.675, -0.266]}
					rotation={[-1.559, -1.241, -1.558]}
				>
					<mesh geometry={nodes.Cube001.geometry} material={materials["Plastic_black glossy"]} />
					<mesh geometry={nodes.Cube001_1.geometry} material={materials.Screen} />
					<mesh geometry={nodes.Cube001_2.geometry} material={materials.Metal_aluminum} />
				</group>
				{/* Render HTML content */}
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
		</>
	);
}

useGLTF.preload("/apartment.glb");
