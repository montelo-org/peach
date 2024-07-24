import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
	INITIAL_X,
	INITIAL_Y,
	INITIAL_Z,
	MOBILE_INITIAL_X,
	MOBILE_INITIAL_Y,
	MOBILE_INITIAL_Z,
	MOBILE_ZOOMED_X,
	MOBILE_ZOOMED_Y,
	ZOOMED_X,
	ZOOMED_Y,
} from "./constants.ts";
import { useMedia } from "react-use";

export const CameraController: FC = () => {
	const { camera, size } = useThree();
	const [isZoomedIn, setIsZoomedIn] = useState(false);
	const isMobile = useMedia("(max-width: 768px)");
	const targetPosition = useRef(
		new THREE.Vector3(
			isMobile ? MOBILE_INITIAL_X : INITIAL_X,
			isMobile ? MOBILE_INITIAL_Y : INITIAL_Y,
			isMobile ? MOBILE_INITIAL_Z : INITIAL_Z,
		),
	);
	const mousePosition = useRef({ x: 0, y: 0 });

	const updateCameraPosition = useCallback(() => {
		const zoomLerp = 0.1;
		const mouseLerp = 0.05;

		// Zoom-based movement
		camera.position.lerp(targetPosition.current, zoomLerp);

		// Mouse-based movement
		const mouseX = (mousePosition.current.x / size.width) * 2 - 1;
		const mouseY = -(mousePosition.current.y / size.height) * 2 + 1;

		// Calculate offsets based on camera's current rotation
		const multiplier = isZoomedIn ? 0.01 : 0.1;
		const movementX = mouseX * multiplier;
		const movementY = mouseY * multiplier;

		// Create a direction vector based on the camera's current rotation
		const direction = new THREE.Vector3(movementX, movementY, 0);
		direction.applyQuaternion(camera.quaternion);

		// Apply mouse-based offset
		camera.position.add(direction.multiplyScalar(mouseLerp));

		camera.updateProjectionMatrix();
	}, [camera, size, isZoomedIn]);

	useFrame(updateCameraPosition);

	useEffect(() => {
		const handleClick = () => {
			setIsZoomedIn((prev) => !prev);
		};

		const handleMouseMove = (event: MouseEvent) => {
			mousePosition.current = { x: event.clientX, y: event.clientY };
		};

		window.addEventListener("click", handleClick);
		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("click", handleClick);
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	useEffect(() => {
		if (isZoomedIn) {
			targetPosition.current.set(
				isMobile ? MOBILE_ZOOMED_X : ZOOMED_X,
				isMobile ? MOBILE_ZOOMED_Y : ZOOMED_Y,
				isMobile ? MOBILE_INITIAL_Z : INITIAL_Z,
			);
		} else {
			targetPosition.current.set(
				isMobile ? MOBILE_INITIAL_X : INITIAL_X,
				isMobile ? MOBILE_INITIAL_Y : INITIAL_Y,
				isMobile ? MOBILE_INITIAL_Z : INITIAL_Z,
			);
		}
	}, [isZoomedIn, isMobile]);

	return null;
};
