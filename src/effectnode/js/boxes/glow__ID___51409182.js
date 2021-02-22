/* "glow" */
import React, { useRef, useEffect } from "react";
import { extend, useThree, useFrame } from "react-three-fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass";

extend({
  EffectComposer,
  ShaderPass,
  RenderPass,
  UnrealBloomPass,
  FilmPass,
  AfterimagePass,
});

export default function Effects({ relay }) {
  const composer = useRef();
  const { scene, gl, size, camera } = useThree();

  const unreal = useRef();
  useEffect(() => {
    composer.current.setPixelRatio(gl.getPixelRatio());
    composer.current.setSize(size.width, size.height);
  }, [size]);

  useFrame(() => composer.current.render(), 1);

  useEffect(() => {
    return relay.onUserData(({ threshold, radius, strength }) => {
      unreal.current.threshold = (threshold / 100) * 1.0;
      unreal.current.radius = (radius / 100) * 3;
      unreal.current.strength = (strength / 100) * 3;
    });
  }, []);

  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <unrealBloomPass
        ref={unreal}
        attachArray="passes"
        args={[undefined, 1.0, 0.6, 0.55]}
      />
      {/* <afterimagePass attachArray="passes" damp={0.1}></afterimagePass> */}
      {/* <filmPass attachArray="passes"></filmPass> */}
    </effectComposer>
  );
}

export const box = async ({ ...relay }) => {
  relay.pulse({
    type: "mount",
    Component: () => {
      return <Effects key={"effects"} relay={relay}></Effects>;
    },
  });
};
