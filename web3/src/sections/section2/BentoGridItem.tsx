import { cn } from "./utils";

export const BentoGridItem = ({
	className,
	header,
}: {
	className?: string;
	description?: string | React.ReactNode;
	header?: React.ReactNode;
}) => {
	return (
		<div
			className={cn(
				"rounded-xl group/bento sm:hover:shadow-xl transition-all duration-200 shadow-input p-4 bg-white justify-between flex flex-col space-y-4 text-neutral-800 sm:hover:translate-x-2",
				className,
			)}
		>
			{header}
		</div>
	);
};
