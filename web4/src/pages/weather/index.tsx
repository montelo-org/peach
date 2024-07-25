import { useSearchParams } from "react-router-dom";

export default function WeatherPage() {
	const [searchParams] = useSearchParams();

	const imageUrl = searchParams.get("imageUrl");
	const temperature = searchParams.get("temperature");

	if (!temperature || !imageUrl) {
		return <p>You forgot to add search params</p>;
	}

	return (
		<main className="w-screen h-screen bg-black flex items-center justify-center">
			<div className="relative">
				<img src={imageUrl} alt="Weather" className="max-w-full max-h-screen"/>
				<div className="absolute inset-0 flex items-center justify-center">
					<p className="text-white text-6xl font-bold bg-black bg-opacity-50 p-4 rounded">
						{temperature}°
					</p>
				</div>
			</div>
		</main>
	);
}
