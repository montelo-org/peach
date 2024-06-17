import { AudioViz } from "./AudioViz";
import { useEffect, useState } from "react";
import { UIStates } from "./constants.ts";

function App() {
  const [state, setState] = useState<UIStates>(UIStates.IDLING);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const fetchFileData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000');
      const data = await response.text() as UIStates;
      setState(data);
    } catch (error) {
      console.error('Failed to fetch file data:', error);
    }
  };
  
  useEffect(() => {
    const interval = setInterval(fetchFileData, 100);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const split = state.split(" ");
    if (split.length === 2) {
      setImageUrl(split[1])
    }
  }, [state]);
  
  
  return (
    <div className={"w-screen h-screen bg-gradient-to-b from-amber-500 to-pink-500 text-center p-16 flex flex-col"}>
      <div className={"mt-16"}>
        <h1 className="text-8xl font-['Pacifico'] text-[#FFAC40]">
          🍑 Peach
        </h1>
      </div>
      <div className="flex-grow flex justify-center items-center">
        {state === UIStates.IDLING && imageUrl ? <img src={imageUrl} height={400} width={400} alt={"Image"}/> :
          <AudioViz state={state}/>}
      </div>
    </div>
  );
}

export default App;
