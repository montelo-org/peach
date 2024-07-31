import { QueryClientProvider } from "@tanstack/react-query";
import { ScreenContentProvider } from "./contexts/ScreenContentCtx.tsx";
import { queryClient } from "./queryClient.ts";
import FooterSection from "./sections/footer/FooterSection.tsx";
import HeroSection from "./sections/hero/HeroSection.tsx";
import Section2 from "./sections/section2/Section2.tsx";
import TiredOfSection from "./sections/tiredof/TiredOfSection.tsx";
import WaitlistSection from "./sections/waitlist/WaitlistSection.tsx";

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ScreenContentProvider>
				<main className="flex flex-col items-center w-full">
					<HeroSection />
					<TiredOfSection />
					<Section2 />
					<WaitlistSection />
					<FooterSection />
				</main>
			</ScreenContentProvider>
		</QueryClientProvider>
	);
}

export default App;
