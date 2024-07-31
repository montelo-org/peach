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
			className="h-[50vh] w-full flex flex-col justify-start items-center relative overflow-hidden mb-8 p-4"
		>
			<p className="text-5xl sm:text-8xl font-semibold text-center mb-16">Waitlist</p>

			<p className="text-2xl sm:text-4xl font-semibold text-center mb-8">Get on the waitlist</p>

			<InputPlaceholders
				placeholders={showThanks ? ["Thank you"] : ["Enter your email"]}
				onChange={onChange}
				onSubmit={onSubmit}
			/>
		</section>
	);
};

export default WaitlistSection;
