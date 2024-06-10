import { useEffect, useState } from "react";

function App() {
  const [isTalking, setIsTalking] = useState(true);
  const [backgroundAngle, setBackgroundAngle] = useState(45);

  useEffect(() => {
    if (isTalking) {
      const interval = setInterval(() => {
        setBackgroundAngle((prev) => (prev + 5) % 360);
      }, 10);
      return () => clearInterval(interval);
    } else {
      setBackgroundAngle(backgroundAngle);
    }
  }, [isTalking, backgroundAngle]);

  return (
    <div
      className="w-full h-screen"
      style={{
        background: `linear-gradient(${backgroundAngle}deg, #ED4264, #FFEDBC)`,
      }}
      onClick={() => setIsTalking(!isTalking)}
    >
      <header className="App-header p-4">
        <h1 className="text-2xl text-white pacifico">Peach</h1>
      </header>
    </div>
  );
}

export default App;
