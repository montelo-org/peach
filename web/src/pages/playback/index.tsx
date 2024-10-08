import { type MutableRefObject, useEffect, useRef } from "react";

const colorSets = [
	[
		{ start: "#8A2BE2", end: "#FF69B4" },
		{ start: "#9400D3", end: "#FF1493" },
		{ start: "#9370DB", end: "#FFB6C1" },
	],
	[
		{ start: "#00CED1", end: "#00FF7F" },
		{ start: "#20B2AA", end: "#7FFF00" },
		{ start: "#48D1CC", end: "#ADFF2F" },
	],
	[
		{ start: "#FF4500", end: "#FFD700" },
		{ start: "#FF6347", end: "#FFA500" },
		{ start: "#FF7F50", end: "#FFFF00" },
	],
	[
		{ start: "#4B0082", end: "#8B008B" },
		{ start: "#800080", end: "#BA55D3" },
		{ start: "#9932CC", end: "#DDA0DD" },
	],
];

const useWaveformAnimation = (canvasRef: MutableRefObject<HTMLCanvasElement | null>) => {
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let animationFrameId: number;
		let lastTime = 0;
		let currentColorSetIndex = 0;
		let nextColorSetIndex = 1;
		let transitionProgress = 0;
		const transitionDuration = 750; // Drastically reduced from 1500 to 750

		const lerpColor = (color1: string, color2: string, factor: number) => {
			const r1 = Number.parseInt(color1.slice(1, 3), 16);
			const g1 = Number.parseInt(color1.slice(3, 5), 16);
			const b1 = Number.parseInt(color1.slice(5, 7), 16);
			const r2 = Number.parseInt(color2.slice(1, 3), 16);
			const g2 = Number.parseInt(color2.slice(3, 5), 16);
			const b2 = Number.parseInt(color2.slice(5, 7), 16);

			const r = Math.round(r1 + factor * (r2 - r1));
			const g = Math.round(g1 + factor * (g2 - g1));
			const b = Math.round(b1 + factor * (b2 - b1));

			return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
		};

		const getInterpolatedColors = (progress: number) => {
			const currentColors = colorSets[currentColorSetIndex];
			const nextColors = colorSets[nextColorSetIndex];
			return currentColors.map((color, index) => ({
				start: lerpColor(color.start, nextColors[index].start, progress),
				end: lerpColor(color.end, nextColors[index].end, progress),
			}));
		};

		const drawShape = (time: number) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const interpolatedColors = getInterpolatedColors(transitionProgress);

			interpolatedColors.forEach((color, index) => {
				ctx.beginPath();
				ctx.moveTo(0, canvas.height / 2);

				const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
				gradient.addColorStop(0, color.start);
				gradient.addColorStop(1, color.end);

				const amplitude = 20 - index * 20; // Increased amplitude and difference between waves
				const frequency = 0.03 + index * 0.015; // Significantly increased frequency

				for (let i = 0; i <= 100; i++) {
					const x = (i / 100) * canvas.width;
					const y =
						canvas.height / 2 +
						Math.sin(x * frequency + time / 200) * amplitude * Math.sin((Math.PI * i) / 100);

					if (i === 0) {
						ctx.moveTo(x, y);
					} else if (i % 2 === 0) {
						// Changed from 3 to 2 for more frequent curve points
						const prevX = ((i - 1) / 100) * canvas.width;
						const prevY =
							canvas.height / 2 +
							Math.sin(prevX * frequency + time / 200) *
								amplitude *
								Math.sin((Math.PI * (i - 1)) / 100);
						ctx.quadraticCurveTo(prevX, prevY, x, y);
					}
				}

				ctx.lineTo(canvas.width, canvas.height / 2);
				ctx.fillStyle = gradient;
				ctx.fill();
			});
		};

		const animate = (time: number) => {
			const deltaTime = time - lastTime;
			lastTime = time;

			transitionProgress += deltaTime / transitionDuration;
			if (transitionProgress >= 1) {
				transitionProgress = 0;
				currentColorSetIndex = nextColorSetIndex;
				nextColorSetIndex = (nextColorSetIndex + 1) % colorSets.length;
			}

			drawShape(time);
			animationFrameId = requestAnimationFrame(animate);
		};

		animate(0);

		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}, []);
};

export default function PlaybackPage() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	useWaveformAnimation(canvasRef);

	return (
		<main className="w-screen h-screen flex flex-col items-center justify-center bg-black">
			<canvas ref={canvasRef} width={400} height={200} className="rounded-[50px] mb-1" />
		</main>
	);
}
