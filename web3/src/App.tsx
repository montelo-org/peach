import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { SocialIcon } from "react-social-icons";
import { FC } from "react";

function App() {
  function Table() {
    const { scene } = useGLTF('/table.glb');
    return <primitive object={scene} position={[-0.1, -0.9, 0]} rotation={[0, Math.PI / 2, 0]} scale={4}/>
  }
  
  const Social: FC<{ url: string }> = ({ url }) =>
    <SocialIcon url={url} target={"_blank"} bgColor="black" style={{ height: 28, width: 28 }}/>;
  
  return (
    <main>
      <section
        id={"header"}
        className={"bg-noise bg-blue-600 h-16 flex justify-between items-center px-8 shadow"}
      >
        <p className={"font-pacifico text-peach text-lg"}>🍑 Peach</p>
        <a
          className={"text-white hover:opacity-75"}
          href={"https://buy.stripe.com/28oaF245b0nB1q0288"}
          target={"_blank"}
          rel={"noreferrer"}
        >
          Pre-Order
        </a>
      </section>
      <section
        id={"content"}
        className={"flex flex-col items-center"}
      >
        <section id={"canvas"} className={"w-full h-96"}>
          <Canvas camera={{ position: [5, 5, -5], fov: 25 }}>
            <ambientLight intensity={0.1}/>
            <Table/>
            <Environment preset="city"/>
            <OrbitControls minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 2.5}/>
          </Canvas>
        </section>
        <section id={"bento"}
                 className={"flex flex-col shadow-xl bg-noise bg-neutral-100 items-center gap-4 py-4"}>
          <div className={"flex flex-col items-center"}>
            <p className={"font-medium text-xl"}>A New Home Device</p>
          </div>
          <div className={"w-[90%] grid grid-cols-10 grid-rows-12 gap-1"}>
            <div className={"bg-purple-400 col-span-4 row-span-12 rounded-2xl p-4 flex flex-col gap-2"}>
              <p className={"text-purple-950 font-semibold text-2xl"}>Fun</p>
              {/*<img src={"/fun.png"} alt={"Fun"}/>*/}
              <p className={"text-purple-950 font-medium"}>Fun, interactive experiences</p>
            </div>
            <div
              className={"bg-pink-400 col-span-6 row-span-6 rounded-2xl p-4 flex flex-col-reverse gap-2"}>
              <p className={"text-pink-950 font-semibold text-2xl"}>Capable</p>
              {/*<img src={"/capable.png"} alt={"Capable"}/>*/}
              <p className={"text-pink-950 font-medium"}>Ask Peach anything</p>
            </div>
            <div className={"bg-green-400 col-span-3 row-span-6 rounded-2xl p-4 flex flex-col-reverse gap-2"}>
              <p className={"text-green-950 font-semibold text-lg"}>Decorative</p>
              {/*<img src={"/decorative.png"} alt={"Decorative"}/>*/}
            </div>
            <div className={"bg-yellow-400 col-span-3 row-span-6 rounded-2xl p-4 flex flex-col gap-2"}>
              <p className={"text-yellow-950 font-semibold text-lg"}>Private</p>
              {/*<img src={"/private.png"} alt={"Private"}/>*/}
            </div>
          </div>
        </section>
        <section
          id={"tutorial"}
          className={"w-full bg-noise bg-red-500 justify-center flex flex-col items-center py-8"}>
          <p className={"text-white text-xl"}>Say "Hey Peach"</p>
          <p className={"text-white text-xl"}>Then ask it anything!</p>
          
          <div
            x-data="{}"
            x-init="$nextTick(() => {
        let ul = $refs.logos;
        ul.insertAdjacentHTML('afterend', ul.outerHTML);
        ul.nextSibling.setAttribute('aria-hidden', 'true');
    })"
            className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]"
          >
            <ul x-ref="logos"
                className="flex items-center justify-center md:justify-start [&_li]:mx-8 [&_img]:max-w-none animate-infinite-scroll">
              <li>
                <p>1</p>
              </li>
              <li>
                <p>2</p>
              </li>
              <li>
                <p>1</p>
              </li>
              <li>
                <p>1</p>
              </li>
              <li>
                <p>1</p>
              </li>
              <li>
                <p>1</p>
              </li>
              <li>
                <p>1</p>
              </li>
            </ul>
          </div>
        
        </section>
        <section
          id={"footer"}
          className={"w-full h-12 bg-black justify-center flex items-center gap-4 py-2"}
        >
          <Social url="https://x.com/getpeachpod"/>
          <Social url="https://www.tiktok.com/@getpeachpod"/>
          <Social url="https://www.youtube.com/@getpeachpod"/>
          <Social url="https://www.threads.net/@getpeachpod"/>
          <Social url="https://www.instagram.com/getpeachpod/"/>
        </section>
      </section>
    </main>
  )
}

export default App
