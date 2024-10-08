import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import WeatherPage from "./pages/weather";
import WouldyouratherPage from "./pages/wouldyourather";
import GenerateImagePage from "./pages/generate_image";
import RecordingPage from "./pages/recording";
import ProcessingPage from "./pages/processing";
import PlaybackPage from "./pages/playback";
import Root from "./Root.tsx";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Root />,
		children: [
			{
				path: "/",
				element: <App />,
			},
			{
				path: "/would-you-rather",
				element: <WouldyouratherPage />,
			},
			{
				path: "/weather",
				element: <WeatherPage />,
			},
			{
				path: "/generate_image",
				element: <GenerateImagePage />,
			},
			{
				path: "/recording",
				element: <RecordingPage />,
			},
			{
				path: "/processing",
				element: <ProcessingPage />,
			},
			{
				path: "/playback",
				element: <PlaybackPage />,
			},
		],
	},
]);

const root = document.getElementById("root");
// biome-ignore lint/style/noNonNullAssertion: <explanation>
ReactDOM.createRoot(root!).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>,
);
