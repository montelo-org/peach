import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import { APPLICATION_MODE, type ApplicationMode } from "@/lib/applicationModes";

export interface ModeConfig {
  mode: ApplicationMode;
  showUI: boolean;
}

export const ModeContext = createContext<{
  config: ModeConfig;
  setters: {
    setMode: Dispatch<SetStateAction<ApplicationMode>>;
    setShowUI: Dispatch<SetStateAction<boolean>>;
  };
} | null>(null);

export const ModeContextProvider = ({ children }: PropsWithChildren) => {
  const [mode, setMode] = useState<ApplicationMode>(APPLICATION_MODE.AUDIO);
  const [showUI, setShowUI] = useState<boolean>(false);

  return (
    <ModeContext.Provider
      value={{
        config: {
          mode,
          showUI,
        },
        setters: {
          setMode,
          setShowUI,
        },
      }}
    >
      {children}
    </ModeContext.Provider>
  );
};

export function useModeContext() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useModeContext must be used within a ModeContextProvider");
  }
  return context.config;
}

export function useModeContextSetters() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useModeContext must be used within a ModeContextProvider");
  }
  return context.setters;
}
