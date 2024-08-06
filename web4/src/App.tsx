import "./index.css";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
	const navigate = useNavigate();

	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.code === "Space") {
				navigate(`/would-you-rather?option1=${encodeURIComponent("Have passionate sex in an exotic location")}&option2=${encodeURIComponent("Have a cozy night in with your partner")}`);
			}
		};

		window.addEventListener("keydown", handleKeyPress);

		return () => {
			window.removeEventListener("keydown", handleKeyPress);
		};
	}, [navigate]);

	return (
		<main className="w-screen h-screen bg-black flex items-center justify-center">
			<div className="flex items-center justify-center">
				<img src="/peach.png" alt="Peach" width={"50%"} />
			</div>
		</main>
	);
}
