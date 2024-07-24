import type { Dispatch, FC, SetStateAction } from "react";
import { useEffect } from "react";
import { useProgress } from "@react-three/drei";

export const LoadingManager: FC<{ setIsLoading: Dispatch<SetStateAction<boolean>> }> = ({
	setIsLoading,
}) => {
	const { progress } = useProgress();

	useEffect(() => {
		setIsLoading(progress !== 100);
	}, [progress, setIsLoading]);

	return null;
};
