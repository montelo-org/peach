import { useProgress } from "@react-three/drei";
import { InfoIcon } from "lucide-react";
import type { MouseEventHandler } from "react";
import { useEffect, useRef, useState } from "react";

const PreOrderBtn = ({
	children,
	onClick,
	className,
}: { children: React.ReactNode; onClick: MouseEventHandler; className?: string }) => (
	<div
		className={`w-32 h-12 bg-peach cursor-pointer select-none
      active:translate-y-2  active:[box-shadow:0_0px_0_0_#cc8a33,0_0px_0_0_#ffbd6691]
      active:border-b-[0px]
      transition-all duration-100 [box-shadow:0_10px_0_0_#cc8a33,0_15px_0_0_#ffbd6691]
      rounded-full border-[1px] border-orange-200 ${className}`}
		onClick={onClick}
		role="button"
		tabIndex={0}
	>
		<span className="flex flex-col justify-center items-center h-full text-white font-semibold">
			{children}
		</span>
	</div>
);

const HelpBtn = ({
	children,
	onClick,
	className,
}: { children: React.ReactNode; onClick: MouseEventHandler; className?: string }) => (
	<div
		className={`w-12 h-12 bg-blue-500 cursor-pointer select-none
      active:translate-y-2  active:[box-shadow:0_0px_0_0_#1d4ed8,0_0px_0_0_#93c5fd91]
      active:border-b-[0px]
      transition-all duration-100 [box-shadow:0_10px_0_0_#1d4ed8,0_15px_0_0_#93c5fd91]
      rounded-full border-[1px] border-blue-400 ${className}`}
		onClick={onClick}
		role="button"
		tabIndex={0}
	>
		<span className="flex flex-col justify-center items-center h-full text-white font-semibold">
			{children}
		</span>
	</div>
);

const Modal = ({
	isOpen,
	onClose,
	children,
}: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
	const modalRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4"
			style={{ zIndex: "20000000" }}
		>
			<div
				ref={modalRef}
				className="bg-white rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow"
			>
				<div className="flex justify-between items-start mb-4">
					<h2 className="text-xl font-semibold">What is Peach?</h2>
					<button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
						✕
					</button>
				</div>
				<div>{children}</div>
			</div>
		</div>
	);
};

export const ButtonGroup = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { progress } = useProgress();
	const showComponents = progress === 100;

	const handlePreOrderClick: MouseEventHandler = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setTimeout(() => {
			window.open("https://buy.stripe.com/28oaF245b0nB1q0288", "_blank");
		}, 100);
	};

	const handleLeftButtonClick: MouseEventHandler = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsModalOpen(true);
	};

	return (
		showComponents && (
			<>
				<div className="absolute top-4 right-4 flex gap-4" style={{ zIndex: "19999999" }}>
					<HelpBtn onClick={handleLeftButtonClick}>
						<InfoIcon />
					</HelpBtn>
					<PreOrderBtn onClick={handlePreOrderClick}>Pre-Order</PreOrderBtn>
				</div>
				<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
					<div className={"flex flex-col gap-2"}>
						<p className="font-medium text-lg">Peach is a fun, capable and private home device.</p>
						<div>
							<h3 className="font-medium text-md mb-1">Fun</h3>
							<ul className="list-disc list-inside ml-4">
								<li>Plays interactive games</li>
								<li>Engages in witty conversations</li>
								<li>Has a personality and can cuss!</li>
							</ul>
						</div>
						<div>
							<h3 className="font-medium text-md mb-1">Capable</h3>
							<ul className="list-disc list-inside ml-4">
								<li>Controls smart home devices</li>
								<li>Answers questions and offers information</li>
							</ul>
						</div>
						<div>
							<h3 className="font-medium text-md mb-1">Private</h3>
							<ul className="list-disc list-inside ml-4">
								<li>All data is stored on device</li>
								<li>Processing is done on a private cloud</li>
							</ul>
						</div>
					</div>
				</Modal>
			</>
		)
	);
};
