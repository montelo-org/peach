import { BentoGridItem } from "./BentoGridItem";

const Section2 = () => {
	return (
		<section
			id="section2"
			className="w-full flex flex-col justify-start items-center relative overflow-hidden mb-16 p-4"
		>
			<p className="text-5xl sm:text-6xl font-semibold text-center mb-8 text-stone-800">
				Introducing
			</p>

			<p className="text-7xl sm:text-8xl font-semibold text-center mb-4">🍑 Peach Pod</p>

			<div className="grid grid-cols-2 sm:grid-cols-12 sm:grid-rows-12 gap-4 w-full justify-center items-center sm:h-[95vh]">
				<BentoGridItem
					className="col-span-2 sm:col-span-3 sm:row-span-6 h-full w-full min-h-96 sm:min-h-fit"
					header={
						<div className="flex flex-col items-center text-center h-full divide-y-2 justify-between py-4">
							<div className="flex justify-center items-center h-full">
								<p className="text-2xl font-bold">
									<span className="bg-gradient-to-r from-orange-400 to-orange-600 text-transparent bg-clip-text">
										Hey Peach
									</span>
									, give me a spicy would you rather question
								</p>
							</div>
							<div className="flex justify-center items-center h-full">
								<p className="text-2xl font-bold">
									<span className="bg-gradient-to-r from-orange-400 to-orange-600 text-transparent bg-clip-text">
										Hey Peach
									</span>
									, where should I take my date?
								</p>
							</div>
							<div className="flex justify-center items-center h-full">
								<p className="text-2xl font-bold">
									<span className="bg-gradient-to-r from-orange-400 to-orange-600 text-transparent bg-clip-text">
										Hey Peach
									</span>
									, what's a substitute for lime?
								</p>
							</div>
						</div>
					}
				/>
				<BentoGridItem
					className="col-span-1 sm:col-span-3 sm:row-span-3 h-full w-full bg-stone-50"
					header={
						<div className="flex flex-col justify-center items-center h-full gap-2">
							<img src="uncensored.png" alt="Uncensored" className="w-full h-1/2 object-contain" />
							<p className="text-2xl font-bold">
								Ask 🍑{" "}
								<span className="italic underline underline-offset-8 decoration-4">anything</span>
							</p>
						</div>
					}
				/>
				<BentoGridItem
					className="col-span-1 sm:col-span-3 sm:row-span-3 h-full w-full relative"
					header={
						<div className="flex flex-col justify-center items-center h-full w-full">
							<img
								src="art.png"
								alt="Art"
								className="absolute inset-0 w-full h-full object-cover rounded-xl brightness-80"
							/>
							<p className="text-2xl font-medium relative z-10 text-white text-center">
								Display art that{" "}
								<span className="italic underline underline-offset-8 decoration-4 font-bold">
									you
								</span>{" "}
								create
							</p>
						</div>
					}
				/>
				<BentoGridItem
					className="col-span-2 sm:col-span-3 sm:row-span-6 h-full w-full bg-gradient-to-br from-stone-50 from-20% via-stone-300 to-stone-50"
					header={
						<div className="flex items-center h-full">
							<p className="text-5xl font-bold flex flex-col bg-gradient-to-b from-stone-800 to-stone-600 text-transparent bg-clip-text">
								<span>Your data</span>
								<span>is stored</span>
								<span className="underline underline-offset-8 decoration-stone-600 decoration-8">
									on device.
								</span>
								<span className="mt-4">Not on</span>
								<span>our servers.</span>
							</p>
						</div>
					}
				/>
				<BentoGridItem
					className="col-span-2 sm:col-span-6 sm:row-span-6 h-full w-full"
					header={
						<div className="h-full flex justify-center items-center">
							<img
								src="peach_render.png"
								alt="Peach render"
								className="w-full h-full object-contain transition-transform duration-300 group-hover/bento:scale-105"
							/>
						</div>
					}
				/>
				<BentoGridItem
					className="col-span-2 sm:col-span-3 sm:row-span-3 h-full w-full bg-stone-50 py-8"
					header={
						<div className="flex flex-col gap-1 justify-center items-center h-full">
							<p className="text-3xl text-center font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
								Play Your Favorite Games
							</p>
							<div className="flex flex-row w-full h-full justify-center items-center">
								<p className="text-xl bg-gradient-to-r from-stone-500 to-stone-600 text-transparent bg-clip-text flex-1 text-center">
									Trivia
								</p>
								<p className="text-xl bg-gradient-to-r from-stone-500 to-stone-600 text-transparent bg-clip-text flex-1 text-center">
									True or False
								</p>
								<p className="text-xl bg-gradient-to-r from-stone-500 to-stone-600 text-transparent bg-clip-text flex-1 text-center">
									Song Quiz
								</p>
							</div>
						</div>
					}
				/>
				<BentoGridItem
					className="col-span-2 sm:col-span-3 sm:row-span-6 h-full w-full"
					header={
						<div className="flex flex-col gap-8 justify-center items-center h-full">
							<p className="text-3xl font-medium text-center">
								🍑 is the first fun and entertaining AI for your home
							</p>
							<p className="text-3xl font-medium text-center">Built on open models</p>
						</div>
					}
				/>
				<BentoGridItem
					className="col-span-2 sm:col-span-6 sm:row-span-3 h-full w-full relative min-h-64 sm:min-h-fit"
					header={
						<div className="flex flex-col justify-center items-center h-full w-full">
							<img
								src="companion.png"
								alt="Art"
								className="absolute inset-0 w-full h-full object-cover rounded-xl brightness-80"
							/>
							<p className="text-3xl font-medium relative z-10 text-white text-center">
								More than an assistant
							</p>
							<p className="text-3xl font-medium relative z-10 text-white text-center">
								Peach is a{" "}
								<span className="underline underline-offset-8 decoration-4">companion</span>
							</p>
						</div>
					}
				/>
				<BentoGridItem
					className="sm:col-span-3 sm:row-span-3 h-full w-full bg-stone-50 hidden sm:flex"
					header={
						<div className="h-full w-full flex justify-center items-center">
							<p className="text-4xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
								Premium Design
							</p>
						</div>
					}
				/>
			</div>
		</section>
	);
};

export default Section2;
