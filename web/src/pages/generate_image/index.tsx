import { useSearchParams } from "react-router-dom";

export default function GenerateImagePage() {
	const [searchParams] = useSearchParams();

	const imageUrl = searchParams.get("imageUrl");

	return (
		<main className="w-screen h-screen flex items-center justify-center bg-black">
			{imageUrl ? (
				<img src={imageUrl} alt="Generated" className="w-full h-full object-contain" />
			) : (
				<p className="text-white">No image found</p>
			)}
		</main>
	);
}
