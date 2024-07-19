import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import WeatherPage from "./pages/weather";
import WouldyouratherPage from "./pages/wouldyourather";
import GenerateImagePage from "./pages/generate_image";

const router = createBrowserRouter([
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
]);

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>,
);
