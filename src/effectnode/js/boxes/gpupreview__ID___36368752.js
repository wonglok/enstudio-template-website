import {
  InstancedBufferGeometry,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";

/* "gpu-preview" */
export const box = async (relay) => {
  let state = await relay.Resources.get("systemThree");
  let { gpu } = await relay.waitFor(0);
  let onFrame = await relay.Resources.get("onFrame");
  let geometry = new InstancedBufferGeometry();
  geometry.instanceCount = gpu.INSTANCE_COUNT;

  let lookupAttr = gpu.getLookUpAttr();
  let posAttr = gpu.getPosAttr();
  geometry.setAttribute(lookupAttr.name, lookupAttr.attr);
  geometry.setAttribute(posAttr.name, posAttr.attr);

  let previewer = new Points(
    geometry,
    new ShaderMaterial({
      uniforms: {
        positionTextureCurrent: { value: null },
        velocityTextureCurrent: { value: null },
      },
      vertexShader: `
        uniform sampler2D positionTextureCurrent;
        ${lookupAttr.attrHeader}

        void main (void) {
          vec3 myPos = texture2D(positionTextureCurrent, lookUp.xy).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(myPos, 1.0);

          gl_PointSize = 5.0;
        }
      `,
      fragmentShader: `
        void main (void) {
          gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
        }
      `,
    })
  );

  /*
  let vp = state.viewport();
  mouse.x = state.mouse.x * -1 * vp.width * 0.5;
  mouse.y = state.mouse.y * 1 * vp.height * 0.5;
  mouse.z = 0.0;
  */

  //
  previewer.frustumCulled = false;

  // const visibleHeightAtZDepth = (depth, camera) => {
  //   // compensate for cameras not positioned at z=0
  //   const cameraOffset = camera.position.z;
  //   if (depth < cameraOffset) depth -= cameraOffset;
  //   else depth += cameraOffset;

  //   // vertical fov in radians
  //   const vFOV = (camera.fov * Math.PI) / 180;

  //   // Math.abs to ensure the result is always positive
  //   return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
  // };

  // const visibleWidthAtZDepth = (depth, camera) => {
  //   const height = visibleHeightAtZDepth(depth, camera);
  //   return height * camera.aspect;
  // };

  onFrame(() => {
    let { mouse, viewport } = state;
    let vp = viewport();

    mouse = new Vector3(
      ((mouse.x * vp.width) / 2) * -1,
      (mouse.y * vp.height) / 2,
      0.0
    );

    gpu.render({ mouse });

    let {
      positionTextureCurrent,
      velocityTextureCurrent,
    } = gpu.getTextureAfterCompute();

    previewer.material.uniforms.positionTextureCurrent.value = positionTextureCurrent;
    previewer.material.uniforms.velocityTextureCurrent.value = velocityTextureCurrent;
  });

  relay.pulse({
    type: "add",
    item: previewer,
  });
};
