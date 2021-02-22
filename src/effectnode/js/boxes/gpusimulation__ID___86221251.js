/* "gpu-simulation" */

import { BufferAttribute, HalfFloatType, RepeatWrapping, Vector3 } from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer";

export class GPUSimulation {
  constructor({ renderer, relay }) {
    this.now = 0;
    this.last = 0;
    this.relay = relay;

    this.BLOOM_SCENE = 3;

    this.SPACE_BBOUND = 100;
    this.SPAC_BOUND_HALF = this.SPACE_BBOUND / 2;
    this.WIDTH = 50;
    this.HEIGHT = 1;
    this.INSTANCE_COUNT = this.WIDTH * this.HEIGHT;
    this.renderer = renderer;

    this.initComputeRenderer();
  }

  initComputeRenderer() {
    this.gpuCompute = new GPUComputationRenderer(
      this.WIDTH,
      this.HEIGHT,
      this.renderer
    );

    // if (this.isSafari()) {
    //   this.gpuCompute.setDataType(HalfFloatType);
    // }

    this.gpuCompute.setDataType(HalfFloatType);

    const dtPosition = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();
    const lookUpTexture = this.gpuCompute.createTexture();
    this.fillPositionTexture(dtPosition);
    this.fillVelocityTexture(dtVelocity);
    this.fillLookupTexture(lookUpTexture);

    this.velocityVariable = this.gpuCompute.addVariable(
      "textureVelocity",
      GPUSimulation.velocityShader(),
      dtVelocity
    );

    this.positionVariable = this.gpuCompute.addVariable(
      "texturePosition",
      GPUSimulation.positionShader(),
      dtPosition
    );

    this.gpuCompute.setVariableDependencies(this.velocityVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);
    this.gpuCompute.setVariableDependencies(this.positionVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);

    this.positionUniforms = this.positionVariable.material.uniforms;
    this.velocityUniforms = this.velocityVariable.material.uniforms;

    this.positionUniforms["lookup"] = { value: lookUpTexture };
    this.positionUniforms["time"] = { value: 0.0 };
    this.positionUniforms["delta"] = { value: 0.0 };
    this.positionUniforms["mouse"] = { value: new Vector3(0, 0, 0) };

    this.velocityUniforms["lookup"] = { value: lookUpTexture };
    this.velocityUniforms["time"] = { value: 1.0 };
    this.velocityUniforms["delta"] = { value: 0.0 };
    this.velocityUniforms["mouse"] = { value: new Vector3(0, 0, 0) };

    this.velocityVariable.material.defines.SPACE_BBOUND = this.SPACE_BBOUND.toFixed(
      2
    );
    this.velocityVariable.material.defines.WIDTH = this.WIDTH.toFixed(2);
    this.velocityVariable.material.defines.HEIGHT = this.HEIGHT.toFixed(2);
    this.velocityVariable.material.defines.INSTANCE_COUNT = this.INSTANCE_COUNT.toFixed(
      2
    );

    this.velocityVariable.wrapS = RepeatWrapping;
    this.velocityVariable.wrapT = RepeatWrapping;
    this.positionVariable.wrapS = RepeatWrapping;
    this.positionVariable.wrapT = RepeatWrapping;

    const error = this.gpuCompute.init();

    if (error !== null) {
      console.error(error);
    }
  }

  fillVelocityTexture(texture) {
    const theArray = texture.image.data;

    for (let k = 0, kl = theArray.length; k < kl; k += 4) {
      const x = Math.random() - 0.5;
      const y = Math.random() - 0.5;
      const z = Math.random() - 0.5;

      theArray[k + 0] = x * 10;
      theArray[k + 1] = y * 10;
      theArray[k + 2] = z * 10;
      theArray[k + 3] = 1;
    }
  }

  fillPositionTexture(texture) {
    let i = 0;
    const theArray = texture.image.data;

    for (let y = 0; y < this.HEIGHT; y++) {
      for (let x = 0; x < this.WIDTH; x++) {
        theArray[i++] = 0.0;
        theArray[i++] = 0.0;
        theArray[i++] = 0.0;
        theArray[i++] = 0.0;
      }
    }

    //

    // for (let k = 0, kl = theArray.length; k < kl; k += 4) {
    //   const x = Math.random() * this.SPACE_BBOUND - this.SPAC_BOUND_HALF;
    //   const y = Math.random() * this.SPACE_BBOUND - this.SPAC_BOUND_HALF;
    //   const z = Math.random() * this.SPACE_BBOUND - this.SPAC_BOUND_HALF;

    //   theArray[k + 0] = x;
    //   theArray[k + 1] = y;
    //   theArray[k + 2] = z;
    //   theArray[k + 3] = 1;
    // }
  }

  fillLookupTexture(texture) {
    let i = 0;
    const theArray = texture.image.data;
    let items = [];

    for (let y = 0; y < this.HEIGHT; y++) {
      for (let x = 0; x < this.WIDTH; x++) {
        let lastOneInArray = items[items.length - 1] || [0, 0];
        theArray[i++] = lastOneInArray[0];
        theArray[i++] = lastOneInArray[1];
        theArray[i++] = 0.0;
        theArray[i++] = 0.0;
        items.push([x / this.WIDTH, y / this.HEIGHT]);
      }
    }

    //

    // for (let k = 0, kl = theArray.length; k < kl; k += 4) {
    //   const x = Math.random() * this.SPACE_BBOUND - this.SPAC_BOUND_HALF;
    //   const y = Math.random() * this.SPACE_BBOUND - this.SPAC_BOUND_HALF;
    //   const z = Math.random() * this.SPACE_BBOUND - this.SPAC_BOUND_HALF;

    //   theArray[k + 0] = x;
    //   theArray[k + 1] = y;
    //   theArray[k + 2] = z;
    //   theArray[k + 3] = 1;
    // }
  }

  render({ mouse }) {
    // const vp = viewport();
    // console.log(viewport());
    const now = performance.now();
    let delta = (now - this.last) / 1000;

    if (delta > 1) {
      delta = 1;
    } // safety cap on large deltas
    this.last = now;

    this.positionUniforms["time"].value = now;
    this.positionUniforms["delta"].value = delta;

    if (this.positionUniforms["mouse"]) {
      this.positionUniforms["mouse"].value.set(
        mouse.x, // * vp.width,
        mouse.y, // * vp.height,
        0
      );
      // console.log(this.positionUniforms["mouse"].value);
    }

    this.velocityUniforms["time"].value = now;
    this.velocityUniforms["delta"].value = delta;

    if (this.velocityUniforms["mouse"]) {
      this.velocityUniforms["mouse"].value.set(
        mouse.x, // * vp.width,
        mouse.y, // * vp.height,
        0
      );
    }

    this.gpuCompute.compute();
  }

  getTextureAfterCompute() {
    return {
      positionTextureCurrent: this.gpuCompute.getCurrentRenderTarget(
        this.positionVariable
      ).texture,
      velocityTextureCurrent: this.gpuCompute.getCurrentRenderTarget(
        this.velocityVariable
      ).texture,
    };
  }

  getLookUpAttr() {
    let lookupData = [];
    for (let y = 0; y < this.WIDTH; y++) {
      for (let x = 0; x < this.WIDTH; x++) {
        lookupData.push(x / this.WIDTH, y / this.WIDTH, 0, 0);
      }
    }

    return {
      name: "lookUp",
      attr: new BufferAttribute(new Float32Array(lookupData), 4),
      attrHeader: `
        attribute vec4 lookUp;
      `,
      varyingHedader: `
        varying vec4 lookUpV;
      `,
      varyingSetter: `
        lookUpV = lookUp;
      `,
    };
  }

  static positionShader() {
    return /* glsl */ `
      float rand (vec2 co){
				return fract( sin( dot( co.xy, vec2(12.9898,78.233) ) ) * 43758.5453 );
			}

      uniform float time;
			uniform float delta;
      uniform vec3 mouse;
      uniform sampler2D lookup;

			void main()	{
				// vec4 tmpPos = texture2D( texturePosition, uv );
				// vec3 position = tmpPos.xyz;

				// gl_FragColor = vec4( position + velocity * 0.015 * delta, 1.0 );

        const float width = resolution.x;
        const float height = resolution.y;
        float xID = floor(gl_FragCoord.x);
        float yID = floor(gl_FragCoord.y);
        vec2 uvHead = vec2(gl_FragCoord.x, gl_FragCoord.y) / resolution.xy;
        vec4 positionHead = texture2D( texturePosition, uvHead );

        vec4 idxInfo = texture2D(lookup, uvHead);
        vec2 nextUV = idxInfo.xy;
        float currentIDX = floor(gl_FragCoord.x * gl_FragCoord.y);

        if (floor(currentIDX) == 0.0) {
          gl_FragColor = vec4(mouse, 1.0);
        } else {
          vec3 positionChain = texture2D( texturePosition, nextUV ).xyz;
          // vec3 velocityChain = texture2D( textureVelocity, nextUV ).xyz;
          gl_FragColor = vec4(positionChain, 1.0);
        }

        if (positionHead.w == 0.0) {
          gl_FragColor = vec4(vec3(0.0), 1.0);
        }
			}
    `;
  }

  static velocityShader() {
    return /* glsl */ `
      uniform float time;
			uniform float delta; // about 0.016
			uniform vec3 mouse; // about 0.016

			const float PI = 3.141592653589793;
			const float PI_2 = PI * 2.0;

			float rand (vec2 co){
				return fract( sin( dot( co.xy, vec2(12.9898,78.233) ) ) * 43758.5453 );
			}

      float constrain(float val, float min, float max) {
          if (val < min) {
              return min;
          } else if (val > max) {
              return max;
          } else {
              return val;
          }
      }

      vec3 getDiff (in vec3 lastPos, in vec3 mousePos) {
        vec3 diff = lastPos.xyz - mousePos;
        float distance = constrain(length(diff), 10.5, 15000.0);
        float strength = 1.0 / (pow(distance, 1.6));

        diff = normalize(diff);
        // delta
        diff = diff * strength * -2.0;
        // diff = diff * strength * (-20.83) * (1.0 / delta) * 0.0183;

        return diff;
      }

			void main() {

        //
        // const float width = resolution.x;
        // const float height = resolution.y;

        // for (float y = 0.0; y < height; y++ ) {
        //   if (y == floor(gl_FragCoord.y)) {
        //     for (float x = 0.0; x < width; x++ ) {

        //       if (x == width - 1.0) {
        //         gl_FragColor = vec4(mouse * 100.0, 1.0);
        //       } else {
        //         // vec2 ref = vec2(0.0, y) / resolution.xy;
        //         // vec3 oldVelocity = texture2D( textureVelocity, ref ).xyz;
        //         // gl_FragColor = vec4(vec3(0.0), 1.0);
        //       }

        //       // vec2 ref = vec2(x, y) / resolution.xy;
        //       // birdPosition = texture2D( texturePosition, ref ).xyz;
        //       // birdVelocity = texture2D( textureVelocity, ref ).xyz;

        //       // vec3 diff2 = getDiff(selfPosition, birdPosition);
        //       // outputVelocity += diff2;
        //     }
        //   }
        // }


        vec3 birdPosition, birdVelocity;
        vec2 uv = gl_FragCoord.xy / resolution.xy;

				vec3 selfPosition = texture2D( texturePosition, uv ).xyz;
				vec3 selfVelocity = texture2D( textureVelocity, uv ).xyz;

        vec3 outputVelocity = vec3(selfVelocity);

        const float width = resolution.x;
        const float height = resolution.y;
        float xID = floor(gl_FragCoord.x);
        float yID = floor(gl_FragCoord.y);

        // for (float y = 0.0; y < height; y++ ) {
				// 	for (float x = 0.0; x < width; x++ ) {
        //     vec2 ref = vec2(x, y) / resolution.xy;
				// 		birdPosition = texture2D( texturePosition, ref ).xyz;
				// 		birdVelocity = texture2D( textureVelocity, ref ).xyz;

        //     vec3 diff2 = getDiff(selfPosition, birdPosition);
        //     outputVelocity += diff2 * 0.001;
        //   }
        // }

        vec3 diff1 = getDiff(selfPosition, mouse);
        outputVelocity += diff1;// * (uv.x);

        gl_FragColor = vec4(outputVelocity, 1.0);
			}
    `;
  }
}

export const box = async (relay) => {
  let state = await relay.Resources.get("systemThree");
  let gpu = new GPUSimulation({ renderer: state.gl, relay });

  relay.pulse({
    type: "gpu",
    gpu,
  });
};
