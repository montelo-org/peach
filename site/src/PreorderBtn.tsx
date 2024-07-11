import { FC } from "react";
import { BackIcon } from "./icons/Back.tsx";

type PreorderBtnProps = {
  showPreorder: boolean;
  togglePreorder: () => void;
}

export const PreorderBtn: FC<PreorderBtnProps> = ({ showPreorder, togglePreorder }) => {
  const ButtonContent = () => {
    return showPreorder ? (
      <div className={"flex gap-2"}>
        <BackIcon/>
        <p>Back</p>
      </div>
    ) : "Preorder"
  }
  
  return (
    <button
      className={"bg-orange-500 hover:opacity-75 focus:opacity-100 text-white font-bold py-2 px-4 rounded-xl uppercase"}
      onClick={togglePreorder}
    >
      <ButtonContent/>
    </button>
  )
}