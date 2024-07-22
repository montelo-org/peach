import { type Dispatch, type FC, type SetStateAction, useEffect, useRef } from "react";
import { Screen } from "./Screen.tsx";
import { Environment, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

interface MousePosition {
	x: number;
	y: number;
}

const CameraController = () => {
	const { camera } = useThree();
	const mouseRef = useRef<MousePosition>({ x: 0, y: 0 });

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
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

const LoadingManager = ({ setIsLoading }) => {
	const { progress } = useProgress();

	useEffect(() => {
		setIsLoading(progress !== 100);
	}, [progress, setIsLoading]);

	return null;
};

type ModelsWrapperProps = {
	showiFrame: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export const ModelsWrapper: FC<ModelsWrapperProps> = ({ showiFrame, setIsLoading }) => {
	return (
		<Canvas
			camera={{
				fov: 50,
				near: 0.1,
				far: 2000,
				position: [0, 0, 3],
			}}
		>
			<LoadingManager setIsLoading={setIsLoading} />
			<CameraController />
			<Screen showiFrame={showiFrame} />
			<Environment preset="sunset" background />
		</Canvas>
	);
};
