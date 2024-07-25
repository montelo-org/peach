import { type FC, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MOBILE_ZOOMED_X, MOBILE_ZOOMED_Y, MOBILE_ZOOMED_Z, ZOOMED_X, ZOOMED_Y, ZOOMED_Z, } from "./constants";
import { useMedia } from "react-use";

export const CameraController: FC = () => {
	const { camera } = useThree();
	const isMobile = useMedia("(max-width: 768px)");
	const targetPosition = useRef(new THREE.Vector3());
	const initialPosition = useRef(new THREE.Vector3());
	const animationStartTime = useRef(0);
	const animationDuration = 4000;
	const delayDuration = 1500;
	const hasStarted = useRef(false);

	useEffect(() => {
		initialPosition.current.copy(camera.position);
		// Set the animation start time to 1.5 seconds in the future
		animationStartTime.current = Date.now() + delayDuration;

		// Set the target position based on whether it's mobile or not
		if (isMobile) {
			targetPosition.current.set(MOBILE_ZOOMED_X, MOBILE_ZOOMED_Y, MOBILE_ZOOMED_Z);
		} else {
			targetPosition.current.set(ZOOMED_X, ZOOMED_Y, ZOOMED_Z);
		}
	}, [camera, isMobile]);

	useFrame(() => {
		const currentTime = Date.now();

		// Check if we've reached the animation start time
		if (currentTime < animationStartTime.current) {
			return; // Do nothing during the delay period
		}

		if (!hasStarted.current) {
			hasStarted.current = true;
			initialPosition.current.copy(camera.position);
		}

		const elapsedTime = currentTime - animationStartTime.current;
		const progress = Math.min(elapsedTime / animationDuration, 1);

		// Use an easing function for smooth animation
		const easedProgress = easeInOutCubic(progress);

		camera.position.lerpVectors(initialPosition.current, targetPosition.current, easedProgress);

		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();
	});

	return null;
};

function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
