import { FC } from "react";
import { PreorderBtn } from "./PreorderBtn.tsx";

type HeaderProps = {
  showPreorder: boolean;
  togglePreorder: () => void;
}

export const Header: FC<HeaderProps> = ({ showPreorder, togglePreorder }) => {
  return (
    <section id={"nav-bar"} className={"sticky top-8 z-40 bg-red-500 h-16 flex items-center justify-between px-2 py-4 shadow"}>
      <p className={"text-2xl font-medium font-pacifico text-peach"}>🍑 Peach</p>
      <PreorderBtn showPreorder={showPreorder} togglePreorder={togglePreorder}/>
    </section>
  )
}