import { createContext, useContext, useState } from "react";

export const ScreenContentCtx = createContext({});

export const ScreenContentProvider = ({ children }) => {
	const [url, setUrl] = useState(import.meta.env.VITE_SCREEN_BASE_URL);
	
	return (
		<ScreenContentCtx.Provider value={{ url, setUrl }}>
			{children}
		</ScreenContentCtx.Provider>
	);
};

export const useScreenContentCtx = () => {
	const context = useContext(ScreenContentCtx);

	if (!context) {
		throw new Error("useScreenContentCtx must be used inside the ScreenContentProvider");
	}

	return context;
};
