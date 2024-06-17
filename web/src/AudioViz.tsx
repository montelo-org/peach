import { FC, useEffect, useRef, useState } from "react";
import { UIStates } from "./constants";

export const AudioViz: FC<{ state: UIStates }> = ({ state }) => {
  const [randomHeights, setRandomHeights] = useState([50, 50, 50, 50]);
  const animationFrameId = useRef<number>();
  const loaderIndex = useRef(0);
  const growing = useRef(true);
  
  useEffect(() => {
    const animate = () => {
      setRandomHeights((currentHeights) =>
        currentHeights.map((height, index) => {
          if (state === UIStates.RECORDING || state === UIStates.PLAYBACK) {
            // Introduce a damping factor and more realistic variation
            const damping = 0.05; // Low damping factor for smoother transition
            const maxVariation = 300; // Maximum random variation
            const variation = Math.random() * maxVariation;
            return height + damping * (variation - height);
          } else if (state !== UIStates.IDLING) {
            // Create a pulsing effect
            if (index === loaderIndex.current) {
              let newHeight = growing.current ? height + 20 : height - 20;
              // Ensure the height pulsates between 50 and 200
              if (newHeight >= 200) {
                growing.current = false;
                newHeight = 200;
              } else if (newHeight <= 50) {
                growing.current = true;
                newHeight = 50;
                // Move to the next bar only after it shrinks
                loaderIndex.current = (loaderIndex.current + 1) % 4;
              }
              return newHeight;
            }
            return 50; // Other bars at minimum height
          }
          return 50; // Consistent minimal height for IDLING
        })
      );
      
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    // Reset the animation settings when the state changes
    if (state !== UIStates.PROCESSING) {
      loaderIndex.current = 0;
      growing.current = true;
    }
    
    // Start the animation
    animate();
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [state]); // Depend on `state` to restart the animation when it changes
  
  const idxMap: Record<number, number> = {
    0: 1,
    1: 0,
    2: 3,
    3: 2,
  };
  
  return (
    <div className={"flex justify-center items-center h-[70vh]"}>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          style={{
            height: `${randomHeights[idxMap[i]]}px`,
            width: '50px',
            borderRadius: '25px',
            margin: '5px',
            backgroundColor: "white",
            transition: 'height 0.4s ease, width 0.4s ease',
            position: 'relative',
            transform: 'translateY(-50%)',
          }}
        />
      ))}
    </div>
  );
};
