import { useProgress } from "@react-three/drei";

export const PreOrderBtn = () => {
	// three progress
	const { progress } = useProgress();
	const showComponents = progress === 100;
	
	return showComponents && (
		<a href={"https://buy.stripe.com/28oaF245b0nB1q0288"} target={"_blank"} rel={"noreferrer"}>
			<div
				className="absolute top-4 right-4 button w-40 h-16 bg-peach cursor-pointer select-none
    active:translate-y-2  active:[box-shadow:0_0px_0_0_#cc8a33,0_0px_0_0_#ffbd6691]
    active:border-b-[0px]
    transition-all duration-100 [box-shadow:0_10px_0_0_#cc8a33,0_15px_0_0_#ffbd6691]
    rounded-full  border-[1px] border-peach-light
  "
			>
				<span className="flex flex-col justify-center items-center h-full text-white font-bold text-lg ">
					Pre-Order
				</span>
			</div>
		</a>
	);
};
