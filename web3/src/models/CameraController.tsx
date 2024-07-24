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
	const interactionPosition = useRef({ x: 0, y: 0 });
	const isInteracting = useRef(false);
	const interactionStart = useRef({ x: 0, y: 0 });
	const interactionDelta = useRef({ x: 0, y: 0 });
	const currentVelocity = useRef(new THREE.Vector2(0, 0));
	const interactionOffset = useRef(new THREE.Vector3());
	const interactionThreshold = isMobile ? 10 : 5; // pixels, increased for mobile
	const maxRotation = Math.PI / 8; // 22.5 degrees in radians
	const sensitivity = isMobile ? 0.1 : 0.3; // Reduced sensitivity for mobile
	const deadZoneRadius = isMobile ? 0.2 : 0.1; // Increased dead zone for mobile
	const smoothingFactor = isMobile ? 0.03 : 0.05; // Reduced smoothing for mobile

	const updateCameraPosition = useCallback(() => {
		const zoomLerp = isMobile ? 0.05 : 0.1; // Slower zoom for mobile
		const interactionLerp = isMobile ? 0.005 : 0.01; // Slower interaction for mobile
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

		// Interaction-based movement
		if (!isInteracting.current) {
			const interactionX = (interactionPosition.current.x / size.width) * 2 - 1;
			const interactionY = -(interactionPosition.current.y / size.height) * 2 + 1;

			const distanceFromCenter = Math.sqrt(
				interactionX * interactionX + interactionY * interactionY,
			);
			if (distanceFromCenter > deadZoneRadius) {
				const multiplier = isZoomedIn ? 0.02 : 0.2;
				const adjustedMultiplier = multiplier * sensitivity;

				const movementX = interactionX * adjustedMultiplier;
				const movementY = interactionY * adjustedMultiplier;

				const targetOffset = new THREE.Vector3(movementX, movementY, 0);
				targetOffset.applyQuaternion(camera.quaternion);

				interactionOffset.current.lerp(targetOffset, smoothingFactor);
			} else {
				interactionOffset.current.lerp(new THREE.Vector3(0, 0, 0), smoothingFactor);
			}
		}

		// Interaction-based rotation with inertia
		if (isInteracting.current) {
			const targetVelocityX = interactionDelta.current.x * 0.0002; // Further reduced for mobile
			const targetVelocityY = interactionDelta.current.y * 0.0002;

			currentVelocity.current.x += (targetVelocityX - currentVelocity.current.x) * interactionLerp;
			currentVelocity.current.y += (targetVelocityY - currentVelocity.current.y) * interactionLerp;
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
			.add(interactionOffset.current);
		camera.rotation.copy(initialRotation.current);
		camera.rotateX(offsetRotation.current.x);
		camera.rotateY(offsetRotation.current.y);

		// Snap back to original rotation
		if (!isInteracting.current) {
			offsetRotation.current.x *= velocityDecay;
			offsetRotation.current.y *= velocityDecay;
		}

		camera.updateProjectionMatrix();
	}, [camera, size, isZoomedIn, isMobile]);

	useFrame(updateCameraPosition);

	useEffect(() => {
		const handleInteractionStart = (event: MouseEvent | TouchEvent) => {
			isInteracting.current = true;
			const { clientX, clientY } = "touches" in event ? event.touches[0] : event;
			interactionStart.current = { x: clientX, y: clientY };
			currentVelocity.current.set(0, 0);
		};

		const handleInteractionMove = (event: MouseEvent | TouchEvent) => {
			const { clientX, clientY } = "touches" in event ? event.touches[0] : event;
			interactionPosition.current = { x: clientX, y: clientY };
			if (isInteracting.current) {
				interactionDelta.current = {
					x: clientX - interactionStart.current.x,
					y: clientY - interactionStart.current.y,
				};
			}
		};

		const handleInteractionEnd = (event: MouseEvent | TouchEvent) => {
			const { clientX, clientY } = "changedTouches" in event ? event.changedTouches[0] : event;
			const interactionDistance = Math.sqrt(
				(clientX - interactionStart.current.x) ** 2 + (clientY - interactionStart.current.y) ** 2,
			);

			if (interactionDistance < interactionThreshold) {
				setIsZoomedIn((prev) => !prev);
			}

			isInteracting.current = false;
			interactionDelta.current = { x: 0, y: 0 };
		};

		window.addEventListener("mousedown", handleInteractionStart);
		window.addEventListener("mousemove", handleInteractionMove);
		window.addEventListener("mouseup", handleInteractionEnd);
		window.addEventListener("touchstart", handleInteractionStart);
		window.addEventListener("touchmove", handleInteractionMove);
		window.addEventListener("touchend", handleInteractionEnd);

		return () => {
			window.removeEventListener("mousedown", handleInteractionStart);
			window.removeEventListener("mousemove", handleInteractionMove);
			window.removeEventListener("mouseup", handleInteractionEnd);
			window.removeEventListener("touchstart", handleInteractionStart);
			window.removeEventListener("touchmove", handleInteractionMove);
			window.removeEventListener("touchend", handleInteractionEnd);
		};
	}, []);

	useEffect(() => {
		initialPosition.current.copy(camera.position);
		initialRotation.current.copy(camera.rotation);
	}, [camera]);

	return null;
};
