import { Screen } from "./Screen.tsx";
import { Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

const CameraController = () => {
	const { camera } = useThree();
	const mouseRef = useRef({ x: 0, y: 0 });

	useEffect(() => {
		const handleMouseMove = (event) => {
			mouseRef.current = {
				x: (event.clientX / window.innerWidth) * 2 - 1,
				y: -(event.clientY / window.innerHeight) * 2 + 1,
			};
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	useFrame(() => {
		camera.position.x += (mouseRef.current.x * 0.2 - camera.position.x) * 0.05;
		camera.position.y += (mouseRef.current.y * 0.2 - camera.position.y) * 0.05;
		camera.lookAt(0, 0, 0);
	});

	return null;
};

export const ModelsWrapper = () => {
	return (
		<Canvas
			camera={{
				fov: 50,
				near: 0.1,
				far: 2000,
				position: [0, 0, 3],
			}}
		>
			<CameraController />
			<Screen />
			<Environment preset="sunset" background />
		</Canvas>
	);
};
