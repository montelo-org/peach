import { PreOrderBtn } from "./components/PreOrderBtn.tsx";
import { Recorder } from "./recorder/Recorder.tsx";
import { toast, Toaster } from "react-hot-toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient.ts";
import { Environment, OrbitControls, useProgress } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useEffect } from "react";
import { useLocalStorage } from "react-use";

function App() {
	// three progress
	const { progress } = useProgress();
	const showComponents = progress === 100;

	const [toastLastShown, setToastLastShown] = useLocalStorage("toast-last-shown", "");

	const Table = () => {
		const { scene } = useLoader(GLTFLoader, "/table.glb");
		return (
			<primitive
				object={scene}
				position={[-0.1, -0.9, 0]}
				rotation={[0, Math.PI / 2, 0]}
				scale={4}
			/>
		);
	};

	useEffect(() => {
		if (showComponents) {
			const now = new Date().getTime();
			const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes in milliseconds

			if (!toastLastShown || Number.parseInt(toastLastShown) < fiveMinutesAgo) {
				toast("We're running on limited GPUs. Expect cold starts & delays.", {
					id: "1", // prevents duplicate toasts
					duration: 4000,
					position: "top-center",
					icon: "🐢",
				});
				setToastLastShown(now.toString());
			}
		}
	}, [showComponents, toastLastShown, setToastLastShown]);

	return (
		<QueryClientProvider client={queryClient}>
			<main className="w-[100vw] h-[100vh] relative">
				<Canvas>
					<Table />
					<Environment preset="apartment" background />
					<OrbitControls
					// minPolarAngle={Math.PI / 2.5}
					// maxPolarAngle={Math.PI / 2.5}
					/>
				</Canvas>
				<PreOrderBtn />
				<Recorder />
				<Toaster />
			</main>
		</QueryClientProvider>
	);
}

export default App;
