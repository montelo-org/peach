import { useSearchParams } from "react-router-dom";

export default function WeatherPage() {
	const [searchParams] = useSearchParams();

	const imageUrl = searchParams.get("imageUrl");
	const temperature = searchParams.get("temperature");

	if (!temperature || imageUrl) {
		return <p>You forgot to add search params</p>;
	}

	return (
		<main className="w-screen h-screen bg-black flex items-center justify-center">
			<div className="flex items-center justify-center">
				{imageUrl ? (
					<img src={imageUrl} alt="Imag" width={"50%"} />
				) : (
					<p className={"text-white"}>No image found</p>
				)}
			</div>
		</main>
	);
}
