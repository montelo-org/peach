import { type EffectCallback, useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { toast, Toaster } from "react-hot-toast";
import { useEffectOnce, useLocalStorage } from "react-use";
import { PreOrderBtn } from "./components/PreOrderBtn.tsx";
import { Recorder } from "./recorder/Recorder.tsx";
import { queryClient } from "./queryClient.ts";
import { ScreenContentProvider } from "./contexts/ScreenContentCtx.tsx";
import { Loader } from "./components/Loader.tsx";
import { ModelsWrapper } from "./models/ModelsWrapper.tsx";
import { LOADING_TIMER_DURATION } from "./constants.ts";

function App() {
	const [isLoadingModel, setIsLoadingModel] = useState(true);
	const [isTimerRunning, setIsTimerRunning] = useState(true);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [toastLastShown, setToastLastShown] = useLocalStorage("toast-last-shown", "");
	const isLoading = isLoadingModel || isTimerRunning;
	const showiFrame = !isTransitioning && !isLoading;

	const startTimer: EffectCallback = () => {
		const timer = setTimeout(() => {
			setIsTimerRunning(false);
		}, LOADING_TIMER_DURATION);

		return () => clearTimeout(timer);
	};
	useEffectOnce(startTimer);

	const showToast: EffectCallback = () => {
		if (!isLoading) {
			const now = new Date().getTime();
			const thirtyMinutesAgo = now - 30 * 60 * 1000;

			if (!toastLastShown || Number.parseInt(toastLastShown) < thirtyMinutesAgo) {
				toast("We're running on limited GPUs. Sorry if things get slow or delayed.", {
					id: "1",
					duration: 4000,
					position: "top-left",
					icon: "🐢",
				});
				setToastLastShown(now.toString());
			}
		}
	};
	useEffect(showToast, [isLoading, toastLastShown, setToastLastShown]);

	useEffect(() => {
		if (!isLoading && !isTransitioning) {
			setIsTransitioning(true);
			// Wait for the fade-out transition of the loader to complete
			setTimeout(() => setIsTransitioning(false), 500);
		}
	}, [isLoading]);

	return (
		<QueryClientProvider client={queryClient}>
			<ScreenContentProvider>
				<main className="w-[100dvw] h-[100dvh] relative">
					<ModelsWrapper showiFrame={showiFrame} setIsLoading={setIsLoadingModel} />
					<div
						className={`transition-opacity duration-700 ${isLoading || isTransitioning ? "opacity-100" : "opacity-0 pointer-events-none"}`}
					>
						<Loader />
					</div>
					<div
						className={`transition-opacity duration-700 ${!isLoading && !isTransitioning ? "opacity-100" : "opacity-0 pointer-events-none"}`}
					>
						<PreOrderBtn />
						<Recorder />
					</div>
					<Toaster />
				</main>
			</ScreenContentProvider>
		</QueryClientProvider>
	);
}

export default App;
