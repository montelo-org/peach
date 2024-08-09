import "./index.css";
import { useEffect, useRef } from "react";

export default function App() {
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.code === "Space") {
				if (audioRef.current) {
					audioRef.current.currentTime = 0; // Reset to start
					audioRef.current.play();
				}
			}
		};

		window.addEventListener("keydown", handleKeyPress);

		return () => {
			window.removeEventListener("keydown", handleKeyPress);
		};
	}, []);

	return (
		<main className="w-screen h-screen bg-black flex items-center justify-center">
			<div className="flex items-center justify-center">
				<img src="/peach.png" alt="Peach" width={"50%"} />
			</div>
			<audio ref={audioRef} src="/sample.mp3" />
		</main>
	);
}
