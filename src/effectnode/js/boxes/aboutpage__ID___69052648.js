/* "about-page" */
import { OrbitControls } from "@react-three/drei";
import React, { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "react-three-fiber";
import { Color, sRGBEncoding } from "three";

function EachInput({ relay, idx }) {
  const [compo, setCompo] = useState(<group></group>);
  useEffect(() => {
    return relay.stream(idx, ({ type, Component }) => {
      if (type === "mount") {
        setCompo(
          <Component
            key={`_` + Math.floor(Math.random() * 10000000)}
          ></Component>
        );
      }
    });
  });
  return compo;
}

function InputObject3D({ relay }) {
  let items = relay.box.inputs.map((e, idx) => {
    return <EachInput key={e._id} idx={idx} relay={relay}></EachInput>;
  });
  return <group>{items}</group>;
}

function BgEnv() {
  let { scene } = useThree();
  scene.background = new Color("#121212");

  return <group></group>;
}

function SetGlobal({ relay }) {
  let tsk = useMemo(() => {
    return [];
  }, []);
  let stuff = useThree();
  relay.Resources.set("systemThree", stuff);
  relay.Resources.set("onFrame", (v) => {
    tsk.push(v);
  });

  useFrame((state, delta) => {
    tsk.forEach((t) => t(state, delta));
  });
  return <group></group>;
}

export const box = (relay) => {
  relay.pulse({
    type: "page",
    href: "/about",
    Component: () => {
      return (
        <Canvas
          colorManagement={true}
          pixelRatio={window.devicePixelRatio || 1.0}
          camera={{ position: [0, 0, -50] }}
          onCreated={({ gl }) => {
            gl.outputEncoding = sRGBEncoding;
          }}
        >
          <SetGlobal relay={relay}></SetGlobal>
          <BgEnv></BgEnv>
          <InputObject3D relay={relay}></InputObject3D>
          <OrbitControls enableRotate={false} />
          <ambientLight intensity={1.0} />
        </Canvas>
      );
    },
  });
};
