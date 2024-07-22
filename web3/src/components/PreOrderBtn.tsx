import { useProgress } from "@react-three/drei";

export const PreOrderBtn = () => {
	const { progress } = useProgress();
	const showComponents = progress === 100;

	const handleMouseUp = () => {
		setTimeout(() => {
			window.open("https://buy.stripe.com/28oaF245b0nB1q0288", "_blank");
		}, 100);
	};

	return (
		showComponents && (
			<div
				className="absolute top-4 right-4 button w-32 h-12 bg-peach cursor-pointer select-none
        active:translate-y-2  active:[box-shadow:0_0px_0_0_#cc8a33,0_0px_0_0_#ffbd6691]
        active:border-b-[0px]
        transition-all duration-100 [box-shadow:0_10px_0_0_#cc8a33,0_15px_0_0_#ffbd6691]
        rounded-full  border-[1px] border-peach-light
      "
				onMouseUp={handleMouseUp}
				role="button"
				tabIndex={0}
			>
				<span className="flex flex-col justify-center items-center h-full text-white font-bold">
					Pre-Order
				</span>
			</div>
		)
	);
};
