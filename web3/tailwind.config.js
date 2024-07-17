/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			animation: {
				shimmer: "shimmer 2s linear infinite",
			},
			keyframes: {
				shimmer: {
					from: {
						backgroundPosition: "0 0",
					},
					to: {
						backgroundPosition: "-200% 0",
					},
				},
			},
			backgroundImage: {
				noise: "url('/noise.png')",
			},
			colors: {
				"peach-light": "#ffbd66",
				peach: "#FFAC40",
				"peach-dark": "#cc8a33",
			},
			fontFamily: {
				pacifico: ["Pacifico", "system-ui"],
			},
		},
	},
	plugins: [],
};
