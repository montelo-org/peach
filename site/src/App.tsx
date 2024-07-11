import { useState } from "react";
import { Banner } from "./Banner.tsx";
import { Header } from "./Header.tsx";
import { MainContent } from "./MainContent.tsx";
import { Preorder } from "./Preorder.tsx";

function App() {
  const [showPreorder, setShowPreorder] = useState<boolean>(false);
  
  const togglePreorder = () => setShowPreorder((prev) => !prev)
  
  return (
    <main id={"root-container"} className={"w-screen h-screen"}>
      <Banner/>
      <Header showPreorder={showPreorder} togglePreorder={togglePreorder}/>
      {showPreorder ? <Preorder/> : <MainContent/>}
    </main>
  );
}

export default App;
