import { Hero } from "./Hero.tsx";

export const MainContent = () => {
  return (
    <div className={"flex flex-col"}>
      <Hero/>
      <div className={"bg-blue-500"}>
        <p className={"text-4xl"}>Some text</p>
        <img src={"/render.png"} width={"100%"} height={"100%"}/>
      </div>
      <div className={"bg-yellow-500"}>
        <p className={"text-4xl"}>Some text</p>
        <img src={"/render.png"} width={"100%"} height={"100%"}/>
      </div>
      <div className={"bg-orange-500"}>
        <p className={"text-4xl"}>Follow us</p>
        <img src={"/render.png"} width={"100%"} height={"100%"}/>
      </div>
    </div>
  );
}