import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function WouldyouratherPage() {
	const [searchParams] = useSearchParams();

	const option1 = searchParams.get("option1");
	const option2 = searchParams.get("option2");

	if (!option1 || !option2) {
		return <p>No options found</p>;
	}

	const navigate = useNavigate();

	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.code === "Space") {
				navigate(`/generate_image?imageUrl=${encodeURIComponent("blob:https://app.prodia.com/ec5f7ad3-40c0-407a-af9c-fe2768990049")}`);
			}
		};

		window.addEventListener("keydown", handleKeyPress);

		return () => {
			window.removeEventListener("keydown", handleKeyPress);
		};
	}, [navigate]);

	return (
		<main className="w-screen h-screen flex flex-col relative">
			<div className="flex-1 bg-blue-500 flex items-center justify-center">
				<p className="text-white text-center px-4 font-medium leading-none text-3xl w-[90%]">{option1}</p>
			</div>
			<div className="flex-1 bg-red-500 flex items-center justify-center">
				<p className="text-white text-center px-4 font-medium leading-none text-3xl w-[90%]">{option2}</p>
			</div>
		</main>
	);
}
