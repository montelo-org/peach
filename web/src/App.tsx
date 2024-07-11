import { Suspense, useEffect, useState } from "react";
import AudioAnalyzer from "@/components/analyzers/audioAnalyzer";
import Visual3DCanvas from "@/components/canvas/Visual3D";
import ControlsPanel from "@/components/controls/main";

import { useAppStateActions } from "./lib/appState";
import { UIStates } from "@/types";
import { useAudioSourceContextSetters } from "@/context/audioSource";

const App = () => {
  const { noteCanvasInteraction } = useAppStateActions();
  const { setAudioSource } = useAudioSourceContextSetters();
  const [serverState, setServerState] = useState<UIStates>(UIStates.IDLING);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
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
  
  useEffect(() => {
    console.log("serverState: ", serverState);
    switch (true) {
      case serverState === UIStates.IDLING:
      case serverState === UIStates.PROCESSING:
        setAudioSource("FILE_UPLOAD");
        setImageUrl(null);
        break;
      case serverState === UIStates.RECORDING:
      case serverState === UIStates.PLAYBACK:
        setAudioSource("MICROPHONE");
        setImageUrl(null);
        break;
      case serverState.startsWith(UIStates.IMAGE):
        const imageUrl = serverState.split(" ")[1];
        setAudioSource("FILE_UPLOAD");
        setImageUrl(imageUrl);
        break;
    }
  }, [serverState]);
  
  return (
    <main className="relative h-[100dvh] w-[100dvw] bg-black">
      {serverState.startsWith(UIStates.IMAGE) && imageUrl ?
        <div className={"flex justify-center"}>
          <img alt="Some image" src={imageUrl} width="50%" height="50%"/>
        </div> : (
          <>
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
          </>
        )}
      <ControlsPanel serverState={serverState}/>
    </main>
  );
};

export default App;
