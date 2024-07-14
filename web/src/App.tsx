import { useEffect, useState } from "react";

import { useAppStateActions } from "./lib/appState";
import { UIStates } from "@/types";
import { useAudioSourceContextSetters } from "@/context/audioSource";

const App = () => {
  const { noteCanvasInteraction } = useAppStateActions();
  const { setAudioSource } = useAudioSourceContextSetters();
  const [serverState, setServerState] = useState<UIStates>(UIStates.IDLING);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const showImage = !!(serverState.startsWith(UIStates.IMAGE) && imageUrl);
  
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
  
  const cssMap: Record<UIStates, string> = {
    [UIStates.IDLING]: "bg-red-950",
    [UIStates.RECORDING]: "animate-recording-pulse",
    [UIStates.PROCESSING]: "animate-spin border-4 border-transparent border-t-red-500 border-b-red-500",
    [UIStates.IMAGE]: "",
    [UIStates.PLAYBACK]: "bg-red-950",
  };
  
  return (
    <main className="h-[100vh] w-[100vw] bg-black flex justify-center items-center">
      {
        showImage ? (
          <img
            alt={""}
            src={imageUrl}
            width={"65%"}
            height={"65%"}
          />
        ) : (
          <div className="flex flex-col gap-8 w-[40%] items-center">
            <div className={`w-16 h-16 rounded-full ${cssMap[serverState]}`}></div>
            <img
              alt={""}
              src={"/peach.png"}
              width={"100%"}
              height={"100%"}
            />
          </div>
        )
      }
    </main>
  );
  
  // return (
  //   <main className="relative h-[100dvh] w-[100dvw] bg-black">
  //     {serverState.startsWith(UIStates.IMAGE) && imageUrl ?
  //       <div className={"flex justify-center"}>
  //         <img alt="Some image" src={imageUrl} width="50%" height="50%"/>
  //       </div> : (
  //         <>
  //           <div
  //             className="absolute h-[100dvh] w-[100dvw]"
  //             onMouseDown={noteCanvasInteraction}
  //             onTouchStart={noteCanvasInteraction}
  //           >
  //             <Suspense fallback={<span>loading...</span>}>
  //               <Visual3DCanvas/>
  //             </Suspense>
  //           </div>
  //           <div className="pointer-events-none absolute h-[100dvh] w-[100dvw]">
  //             <Suspense fallback={<span>loading...</span>}>
  //               <AudioAnalyzer/>
  //             </Suspense>
  //           </div>
  //         </>
  //       )}
  //     <ControlsPanel/>
  //   </main>
  // );
};

export default App;
