import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const TiredOfSection = () => {
	const [ref1, inView1] = useInView({ triggerOnce: true, threshold: 0.45 });
	const [ref2, inView2] = useInView({ triggerOnce: true, threshold: 0.45 });
	const [ref3, inView3] = useInView({ triggerOnce: true, threshold: 0.45 });
	const [ref4, inView4] = useInView({ triggerOnce: true, threshold: 0.45 });

	const animationVariants = {
		hidden: { opacity: 0, y: 50 },
		visible: { opacity: 1, y: 0 },
	};

	return (
		<section
			id="tiredof"
			className="w-full flex flex-col justify-start items-center relative overflow-hidden gap-8 mb-16 px-8"
		>
			<motion.p
				ref={ref1}
				initial="hidden"
				animate={inView1 ? "visible" : "hidden"}
				variants={animationVariants}
				transition={{ duration: 0.5 }}
				className="text-5xl sm:text-8xl font-semibold text-center"
			>
				We're tired of
			</motion.p>
			<motion.div
				ref={ref2}
				initial="hidden"
				animate={inView2 ? "visible" : "hidden"}
				variants={animationVariants}
				transition={{ duration: 0.5 }}
				className="flex justify-center items-center h-[30vh] gap-2 sm:gap-8"
			>
				<p className="text-3xl sm:text-6xl font-medium max-w-[40rem]">AIs that don't work</p>
				<img src="/homepod_mini.png" alt="Homepod mini" className="h-28 sm:h-48" />
			</motion.div>
			<motion.div
				ref={ref3}
				initial="hidden"
				animate={inView3 ? "visible" : "hidden"}
				variants={animationVariants}
				transition={{ duration: 0.5 }}
				className="flex justify-center items-center h-[30vh] gap-2 sm:gap-8"
			>
				<img src="/amazon_echo.jpg" alt="Amazon echo" className="h-32 sm:h-52" />
				<p className="text-3xl sm:text-6xl font-medium max-w-[40rem]">Devices that spy on us</p>
			</motion.div>
			<motion.div
				ref={ref4}
				initial="hidden"
				animate={inView4 ? "visible" : "hidden"}
				variants={animationVariants}
				transition={{ duration: 0.5 }}
				className="flex justify-center items-center h-[30vh] gap-2 sm:gap-8"
			>
				<p className="text-3xl sm:text-6xl font-medium max-w-[40rem]">
					Companies that push ideologies
				</p>
				<img src="/google_nest_mini.jpg" alt="Google nest mini" className="h-32 sm:h-52" />
			</motion.div>
		</section>
	);
};

export default TiredOfSection;
