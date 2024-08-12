import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/types.ts";

const supabase = createClient<Database>(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_KEY,
);

const Root: React.FC = () => {
	const navigate = useNavigate();
	
	const stateMap: Record<string, (state: string) => void> = {
		idling: () => navigate("/"),
		recording: () => navigate("/recording"),
		processing: () => navigate("/processing"),
		image: (state) => {
			const [, url] = state.split(" ");
			navigate(`/generate_image?imageUrl=${encodeURIComponent(url)}`);
		},
		get_weather: (state) => {
			const [_, ...restArr] = state.split(" ");
			const rest = restArr.join(" ");
			console.log(rest);
			const parsed = JSON.parse(rest) as { response: string; temperature: number; image_url: string };
			navigate(`/weather?temperature=${encodeURIComponent(parsed.temperature)}&imageUrl=${encodeURIComponent(parsed.image_url)}`);
		},
		would_you_rather: (state) => {
			const [, url] = state.split(" ");
			navigate(`/would_you_rather?wouldYouRatherUrl=${encodeURIComponent(url)}`);
		},
	};

	supabase
		.channel("on-update-channel")
		.on("postgres_changes", { event: "UPDATE", schema: "public", table: "events" }, (payload) => {
			console.log(payload);
			const newState = payload.new.state;
			const [stateKey] = newState.split(" ");
			const handler = stateMap[stateKey];
			if (handler) {
				handler(newState);
			}
		})
		.subscribe();

	return <Outlet />;
};

export default Root;
