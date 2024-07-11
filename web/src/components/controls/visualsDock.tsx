import { type HTMLAttributes } from "react";

import { Dock, DockNav } from "./dock";
import { AudioSourceSelect } from "@/components/controls/mode/common";
import { UIStates } from "@/types";

export const VisualsDock = ({ ...props }: HTMLAttributes<HTMLDivElement> & { serverState: UIStates }) => {
  return (
    <Dock {...props}>
      <DockNav>
        <AudioSourceSelect serverState={props.serverState}/>
      </DockNav>
    </Dock>
  );
};

export default VisualsDock;
