import { motion } from "framer-motion";

const HeroSection = () => {
	return (
		<section
			id="hero"
			className="w-full h-[100vh] max-h-screen flex flex-col justify-center items-center space-y-4 relative overflow-hidden mb-16"
		>
			<motion.div
				className="relative z-10 w-full h-full"
				initial={{ opacity: 0, scale: 1 }}
				animate={{ opacity: 1, scale: 0.95 }}
				transition={{ duration: 1.2, ease: "easeOut" }}
			>
				<img
					src="/hero.png"
					alt="Hero"
					className="w-full h-full object-cover rounded-xl brightness-80"
				/>
				<div className="absolute inset-0 flex flex-col justify-center items-center gap-2">
					<motion.p
						className="text-6xl font-semibold text-white z-20"
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
					>
						Peach Pod
					</motion.p>
					<motion.p
						className="text-4xl text-center font-medium text-white z-20"
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.4 }}
					>
						A Better Home Experience
					</motion.p>
				</div>
			</motion.div>
		</section>
	);
};

export default HeroSection;
