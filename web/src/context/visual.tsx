import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { APPLICATION_MODE } from "@/lib/applicationModes";

import { useModeContext } from "./mode";
import { CubeVisualConfigContextProvider } from "./visualConfig/cube";
import { RingVisualConfigContextProvider } from "./visualConfig/diffusedRing";
import { DnaVisualConfigContextProvider } from "./visualConfig/dna";
import { GridVisualConfigContextProvider } from "./visualConfig/grid";
import { RibbonsVisualConfigContextProvider } from "./visualConfig/ribbons";
import { SphereVisualConfigContextProvider } from "./visualConfig/sphere";

interface VisualConfig {
  colorBackground: boolean;
  
  paletteTrackEnergy: boolean;
}

export const VisualContext = createContext<{
  config: VisualConfig;
  setters: {
    setColorBackground: Dispatch<SetStateAction<boolean>>;
    setPaletteTrackEnergy: Dispatch<SetStateAction<boolean>>;
  };
} | null>(null);

export const VisualContextProvider = ({
                                        initial,
                                        children,
                                      }: PropsWithChildren<{
  initial?: Partial<VisualConfig>;
}>) => {
  const { mode } = useModeContext();
  const [colorBackground, setColorBackground] = useState<boolean>(
    initial?.colorBackground ?? false,
  );
  const [paletteTrackEnergy, setPaletteTrackEnergy] = useState<boolean>(
    initial?.paletteTrackEnergy ?? false,
  );
  
  // Reset paletteTrackEnergy whenever the mode changes
  useEffect(() => {
    switch (mode) {
      case APPLICATION_MODE.WAVE_FORM:
      case APPLICATION_MODE.NOISE:
      case APPLICATION_MODE.AUDIO_SCOPE:
      case APPLICATION_MODE.PARTICLE_NOISE:
        setPaletteTrackEnergy(false);
        break;
      case APPLICATION_MODE.AUDIO:
        setPaletteTrackEnergy(true);
        break;
      default:
        return mode satisfies never;
    }
  }, [mode, setPaletteTrackEnergy]);
  return (
    <VisualContext.Provider
      value={{
        config: {
          colorBackground,
          paletteTrackEnergy,
        },
        setters: {
          setColorBackground,
          setPaletteTrackEnergy,
        },
      }}
    >
      <CubeVisualConfigContextProvider>
        <GridVisualConfigContextProvider>
          <RingVisualConfigContextProvider>
            <DnaVisualConfigContextProvider>
              <SphereVisualConfigContextProvider>
                <RibbonsVisualConfigContextProvider>
                  {children}
                </RibbonsVisualConfigContextProvider>
              </SphereVisualConfigContextProvider>
            </DnaVisualConfigContextProvider>
          </RingVisualConfigContextProvider>
        </GridVisualConfigContextProvider>
      </CubeVisualConfigContextProvider>
    </VisualContext.Provider>
  );
};

export function useVisualContext() {
  const context = useContext(VisualContext);
  if (!context) {
    throw new Error(
      "useVisualContext must be used within a VisualContextProvider",
    );
  }
  return context.config;
}

export function useVisualContextSetters() {
  const context = useContext(VisualContext);
  if (!context) {
    throw new Error(
      "useVisualContext must be used within a VisualContextProvider",
    );
  }
  return context.setters;
}
