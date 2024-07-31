import { type ChangeEvent, useState } from "react";
import { InputPlaceholders } from "./InputPlaceholders";
import { supabase } from "./supabase";

const WaitlistSection = () => {
	const [email, setEmail] = useState<string>("");
	const [showThanks, setShowThanks] = useState<boolean>(false);

	const onChange = (e: ChangeEvent<HTMLInputElement>) => {
		setEmail(e.target.value);
	};

	const onSubmit = async () => {
		setShowThanks(true);
		await supabase.from("users").insert({ email });
	};

	return (
		<section
			id="waitlist"
			className="h-[40vh] sm:h-[50vh] w-full flex flex-col justify-start items-center relative overflow-hidden p-4"
		>
			<p className="text-5xl sm:text-8xl font-semibold text-center mb-8">Waitlist</p>

			<p className="text-2xl sm:text-4xl text-center mb-8">
				Be the first to experience Peach <br /> by joining our waitlist
			</p>

			<InputPlaceholders
				placeholders={showThanks ? ["Thank you"] : ["Enter your email"]}
				onChange={onChange}
				onSubmit={onSubmit}
			/>
		</section>
	);
};

export default WaitlistSection;
