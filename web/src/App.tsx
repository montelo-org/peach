import { Suspense, useEffect, useState } from "react";
import AudioAnalyzer from "@/components/analyzers/audioAnalyzer";
import Visual3DCanvas from "@/components/canvas/Visual3D";
import ControlsPanel from "@/components/controls/main";

import { useAppStateActions } from "./lib/appState";
import { UIStates } from "@/types";

const App = () => {
  const { noteCanvasInteraction } = useAppStateActions();
  const [serverState, setServerState] = useState<UIStates>(UIStates.IDLING);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3006/state');
        const state = await response.text() as UIStates;
        setServerState(state);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    const intervalId = setInterval(fetchData, 100);
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <main className="relative h-[100dvh] w-[100dvw] bg-black">
      <div
        className="absolute h-[100dvh] w-[100dvw]"
        onMouseDown={noteCanvasInteraction}
        onTouchStart={noteCanvasInteraction}
      >
        <Suspense fallback={<span>loading...</span>}>
          <Visual3DCanvas/>
        </Suspense>
      </div>
      <div className="pointer-events-none absolute h-[100dvh] w-[100dvw]">
        <Suspense fallback={<span>loading...</span>}>
          <AudioAnalyzer/>
        </Suspense>
      </div>
      <ControlsPanel serverState={serverState}/>
    </main>
  );
};

export default App;
