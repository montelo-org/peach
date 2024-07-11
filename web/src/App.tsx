import { Suspense, useEffect, useRef } from "react";
import AudioAnalyzer from "@/components/analyzers/audioAnalyzer";
import Visual3DCanvas from "@/components/canvas/Visual3D";
import ControlsPanel from "@/components/controls/main";

import { useAppStateActions } from "./lib/appState";

const App = () => {
  const { noteCanvasInteraction } = useAppStateActions();
  
  const websocketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    // Initialize WebSocket only if it's not already existing or closed
    if (!websocketRef.current || websocketRef.current.readyState === WebSocket.CLOSED) {
      const ws = new WebSocket('ws://localhost:3006/ws');
      
      ws.onopen = () => {
        console.log('WebSocket is connected.');
      };
      
      ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
      };
      
      ws.onclose = () => {
        console.log('WebSocket is closed now.');
      };
      
      websocketRef.current = ws;
    }
    
    return () => {
      // Check if the WebSocket is not already closed before trying to close it
      if (websocketRef.current && websocketRef.current.readyState !== WebSocket.CLOSED) {
        websocketRef.current.close();
        console.log('WebSocket connection closed by cleanup.');
      }
    };
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
      <ControlsPanel/>
    </main>
  );
};

export default App;
