import VisualsDock from "@/components/controls/visualsDock";
import { FC } from "react";
import { UIStates } from "@/types";

const ControlsPanel = () => {
  return (
    <div className="pointer-events-none absolute bottom-0 flex w-full items-end justify-center gap-4 p-4">
      <VisualsDock className="sm:max-w-[60%]"/>
    </div>
  );
};

export default ControlsPanel;
