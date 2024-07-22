import type { Dispatch, FC, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useState } from "react";

interface ScreenContentContextType {
	url: string;
	setUrl: Dispatch<SetStateAction<string>>;
}

export const ScreenContentCtx = createContext<ScreenContentContextType | undefined>(undefined);

interface ScreenContentProviderProps {
	children: ReactNode;
}

export const ScreenContentProvider: FC<ScreenContentProviderProps> = ({ children }) => {
	const [url, setUrl] = useState<string>(import.meta.env.VITE_SCREEN_BASE_URL);

	return <ScreenContentCtx.Provider value={{ url, setUrl }}>{children}</ScreenContentCtx.Provider>;
};

export const useScreenContentCtx = (): ScreenContentContextType => {
	const context = useContext(ScreenContentCtx);

	if (!context) {
		throw new Error("useScreenContentCtx must be used inside the ScreenContentProvider");
	}

	return context;
};
