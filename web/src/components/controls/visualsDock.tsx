import { type HTMLAttributes } from "react";

import { Dock, DockNav } from "./dock";
import { AudioSourceSelect } from "@/components/controls/mode/common";

export const VisualsDock = ({ ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <Dock {...props}>
      <DockNav>
        <AudioSourceSelect/>
      </DockNav>
    </Dock>
  );
};

export default VisualsDock;
