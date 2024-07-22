import { PreOrderBtn } from "./components/PreOrderBtn.tsx";
import { Recorder } from "./recorder/Recorder.tsx";
import { toast, Toaster } from "react-hot-toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient.ts";
import { useProgress } from "@react-three/drei";
import { useEffect } from "react";
import { useLocalStorage } from "react-use";
import { ScreenContentProvider } from "./contexts/ScreenContentCtx.tsx";
import { ModelsWrapper } from "./models/ModelsWrapper.tsx";

function App() {
	// three progress
	const { progress } = useProgress();
	const showComponents = progress === 100;

	const [toastLastShown, setToastLastShown] = useLocalStorage("toast-last-shown", "");

	useEffect(() => {
		if (showComponents) {
			const now = new Date().getTime();
			const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes in milliseconds

			if (!toastLastShown || Number.parseInt(toastLastShown) < fiveMinutesAgo) {
				toast("We're running on limited GPUs. Sorry if things get slow or delayed.", {
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
			<ScreenContentProvider>
				<main className="w-[100vw] h-[100vh] relative">
					<ModelsWrapper />
					<PreOrderBtn />
					<Recorder />
					<Toaster />
				</main>
			</ScreenContentProvider>
		</QueryClientProvider>
	);
}

export default App;
