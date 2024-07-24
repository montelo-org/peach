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
	MOBILE_ZOOMED_Z,
	ZOOMED_X,
	ZOOMED_Y,
	ZOOMED_Z,
} from "./constants.ts";
import { useMedia } from "react-use";

export const CameraController: FC = () => {
	const { camera, size } = useThree();
	const [isZoomedIn, setIsZoomedIn] = useState(false);
	const isMobile = useMedia("(max-width: 768px)");
	const initialPosition = useRef(new THREE.Vector3());
	const initialRotation = useRef(new THREE.Euler());
	const offsetPosition = useRef(new THREE.Vector3());
	const offsetRotation = useRef(new THREE.Euler());
	const mousePosition = useRef({ x: 0, y: 0 });
	const isDragging = useRef(false);
	const dragStart = useRef({ x: 0, y: 0 });
	const dragDelta = useRef({ x: 0, y: 0 });
	const currentVelocity = useRef(new THREE.Vector2(0, 0));
	const mouseOffset = useRef(new THREE.Vector3());
	const dragThreshold = 5; // pixels
	const maxRotation = Math.PI / 8; // 22.5 degrees in radians
	const mouseSensitivity = 0.3; // Adjust this value to control overall sensitivity (0-1)
	const deadZoneRadius = 0.1; // Radius of the dead zone in the center of the screen (0-1)
	const smoothingFactor = 0.05; // Adjust this for smoother transitions (0-1)

	const updateCameraPosition = useCallback(() => {
		const zoomLerp = 0.1;
		const dragLerp = 0.01;
		const velocityDecay = 0.95;

		// Zoom-based movement
		const targetPosition = new THREE.Vector3(
			isZoomedIn
				? isMobile
					? MOBILE_ZOOMED_X
					: ZOOMED_X
				: isMobile
					? MOBILE_INITIAL_X
					: INITIAL_X,
			isZoomedIn
				? isMobile
					? MOBILE_ZOOMED_Y
					: ZOOMED_Y
				: isMobile
					? MOBILE_INITIAL_Y
					: INITIAL_Y,
			isZoomedIn
				? isMobile
					? MOBILE_ZOOMED_Z
					: ZOOMED_Z
				: isMobile
					? MOBILE_INITIAL_Z
					: INITIAL_Z,
		);
		offsetPosition.current.lerp(targetPosition.sub(initialPosition.current), zoomLerp);

		// Mouse-based movement with reduced effect
		if (!isDragging.current) {
			const mouseX = (mousePosition.current.x / size.width) * 2 - 1;
			const mouseY = -(mousePosition.current.y / size.height) * 2 + 1;

			// Apply dead zone
			const distanceFromCenter = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
			if (distanceFromCenter > deadZoneRadius) {
				const multiplier = isZoomedIn ? 0.02 : 0.2;
				const adjustedMultiplier = multiplier * mouseSensitivity;

				const movementX = mouseX * adjustedMultiplier;
				const movementY = mouseY * adjustedMultiplier;

				const targetOffset = new THREE.Vector3(movementX, movementY, 0);
				targetOffset.applyQuaternion(camera.quaternion);

				// Apply smooth transition
				mouseOffset.current.lerp(targetOffset, smoothingFactor);
			} else {
				// Inside dead zone, gradually move back to center
				mouseOffset.current.lerp(new THREE.Vector3(0, 0, 0), smoothingFactor);
			}
		}

		// Drag-based rotation with inertia
		if (isDragging.current) {
			const targetVelocityX = dragDelta.current.x * 0.0005; // Reduced from 0.002 to 0.0005
			const targetVelocityY = dragDelta.current.y * 0.0005; // Reduced from 0.002 to 0.0005

			currentVelocity.current.x += (targetVelocityX - currentVelocity.current.x) * dragLerp;
			currentVelocity.current.y += (targetVelocityY - currentVelocity.current.y) * dragLerp;
		} else {
			currentVelocity.current.x *= velocityDecay;
			currentVelocity.current.y *= velocityDecay;
		}

		const rotationX = THREE.MathUtils.clamp(currentVelocity.current.y, -maxRotation, maxRotation);
		const rotationY = THREE.MathUtils.clamp(currentVelocity.current.x, -maxRotation, maxRotation);

		offsetRotation.current.x = THREE.MathUtils.clamp(
			offsetRotation.current.x + rotationX,
			-maxRotation,
			maxRotation,
		);
		offsetRotation.current.y = THREE.MathUtils.clamp(
			offsetRotation.current.y + rotationY,
			-maxRotation,
			maxRotation,
		);

		// Apply offsets to camera
		camera.position
			.copy(initialPosition.current)
			.add(offsetPosition.current)
			.add(mouseOffset.current);
		camera.rotation.copy(initialRotation.current);
		camera.rotateX(offsetRotation.current.x);
		camera.rotateY(offsetRotation.current.y);

		// Snap back to original rotation
		if (!isDragging.current) {
			offsetRotation.current.x *= velocityDecay;
			offsetRotation.current.y *= velocityDecay;
		}

		camera.updateProjectionMatrix();
	}, [camera, size, isZoomedIn, isMobile]);

	useFrame(updateCameraPosition);

	useEffect(() => {
		const handleClick = (event: MouseEvent) => {
			const dragDistance = Math.sqrt(
				(event.clientX - dragStart.current.x) ** 2 + (event.clientY - dragStart.current.y) ** 2,
			);

			if (dragDistance < dragThreshold) {
				setIsZoomedIn((prev) => !prev);
			}
		};

		const handleMouseMove = (event: MouseEvent) => {
			mousePosition.current = { x: event.clientX, y: event.clientY };
			if (isDragging.current) {
				dragDelta.current = {
					x: event.clientX - dragStart.current.x,
					y: event.clientY - dragStart.current.y,
				};
			}
		};

		const handleMouseDown = (event: MouseEvent) => {
			isDragging.current = true;
			dragStart.current = { x: event.clientX, y: event.clientY };
			currentVelocity.current.set(0, 0);
		};

		const handleMouseUp = () => {
			isDragging.current = false;
			dragDelta.current = { x: 0, y: 0 };
		};

		window.addEventListener("click", handleClick);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("click", handleClick);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	useEffect(() => {
		initialPosition.current.copy(camera.position);
		initialRotation.current.copy(camera.rotation);
	}, [camera]);

	return null;
};
