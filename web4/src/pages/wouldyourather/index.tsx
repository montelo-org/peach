import { useSearchParams } from "react-router-dom";

export default function WouldyouratherPage() {
	const [searchParams] = useSearchParams();

	const option1 = searchParams.get("option1");
	const option2 = searchParams.get("option2");

	if (!option1 || !option2) {
		return <p>No options found</p>;
	}

	return (
		<main className="w-screen h-screen flex flex-col relative">
			<div className="flex-1 bg-blue-500 flex items-center justify-center">
				<p className="text-white text-4xl text-center px-4">{option1}</p>
			</div>
			<div className="flex-1 bg-red-500 flex items-center justify-center">
				<p className="text-white text-4xl text-center px-4">{option2}</p>
			</div>
			<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
				<div className="bg-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg">
					<p className="text-black text-3xl font-bold">OR</p>
				</div>
			</div>
		</main>
	);
}
