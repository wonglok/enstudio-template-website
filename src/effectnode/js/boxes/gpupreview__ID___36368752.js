import {
  BufferAttribute,
  BufferGeometry,
  CylinderBufferGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { Geometry } from "three/examples/jsm/deprecated/Geometry.js";

class NoodleGeo {
  constructor({
    count = 24 * 24,
    numSides = 4,
    subdivisions = 50,
    openEnded = false,
    thickness = 1.0,
  }) {
    const radius = 1;
    const length = 1;

    const cylinderBufferGeo = new CylinderBufferGeometry(
      radius,
      radius,
      length,
      numSides,
      subdivisions,
      openEnded
    );

    let baseGeometry = new Geometry();
    baseGeometry = baseGeometry.fromBufferGeometry(cylinderBufferGeo);

    baseGeometry.rotateZ(Math.PI / 2);

    // compute the radial angle for each position for later extrusion
    const tmpVec = new Vector2();
    const xPositions = [];
    const angles = [];
    const uvs = [];
    const vertices = baseGeometry.vertices;
    const faceVertexUvs = baseGeometry.faceVertexUvs[0];
    const oPositions = [];

    // Now go through each face and un-index the geometry.
    baseGeometry.faces.forEach((face, i) => {
      const { a, b, c } = face;
      const v0 = vertices[a];
      const v1 = vertices[b];
      const v2 = vertices[c];
      const verts = [v0, v1, v2];
      const faceUvs = faceVertexUvs[i];

      // For each vertex in this face...
      verts.forEach((v, j) => {
        tmpVec.set(v.y, v.z).normalize();

        // the radial angle around the tube
        const angle = Math.atan2(tmpVec.y, tmpVec.x);
        angles.push(angle);

        // "arc length" in range [-0.5 .. 0.5]
        xPositions.push(v.x);
        oPositions.push(v.x, v.y, v.z);

        // copy over the UV for this vertex
        uvs.push(faceUvs[j].toArray());
      });
    });

    // build typed arrays for our attributes
    const posArray = new Float32Array(xPositions);
    const angleArray = new Float32Array(angles);
    const uvArray = new Float32Array(uvs.length * 2);

    const origPosArray = new Float32Array(oPositions);

    // unroll UVs
    for (let i = 0; i < posArray.length; i++) {
      const [u, v] = uvs[i];
      uvArray[i * 2 + 0] = u;
      uvArray[i * 2 + 1] = v;
    }

    const lineGeo = new InstancedBufferGeometry();
    lineGeo.instanceCount = count;

    lineGeo.setAttribute("position", new BufferAttribute(origPosArray, 3));
    lineGeo.setAttribute("newPosition", new BufferAttribute(posArray, 1));
    lineGeo.setAttribute("angle", new BufferAttribute(angleArray, 1));
    lineGeo.setAttribute("uv", new BufferAttribute(uvArray, 2));

    let offset = [];
    let ddxyz = Math.floor(Math.pow(count, 1 / 3));
    for (let z = 0; z < ddxyz; z++) {
      for (let y = 0; y < ddxyz; y++) {
        for (let x = 0; x < ddxyz; x++) {
          offset.push(
            (x / ddxyz) * 2.0 - 1.0,
            (y / ddxyz) * 2.0 - 1.0,
            (z / ddxyz) * 2.0 - 1.0
          );
        }
      }
    }

    // let ddxyz = Math.floor(Math.pow(count, 1 / 2));
    // for (let y = 0; y < ddxyz; y++) {
    //   for (let x = 0; x < ddxyz; x++) {
    //     offset.push(0.0, (x / ddxyz) * 2.0 - 1.0, (y / ddxyz) * 2.0 - 1.0);
    //   }
    // }

    lineGeo.setAttribute(
      "offset",
      new InstancedBufferAttribute(new Float32Array(offset), 3)
    );

    return {
      geometry: lineGeo,
      subdivisions,
      thickness,
    };
  }
}

let getRollGLSL = ({ name = "CONTROL_POINTS", ctrlPts = 50 }) => {
  let floatval = `${Number(ctrlPts).toFixed(1)}`;

  let res = /* glsl */ `

  vec3 catmullRom (vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
      vec3 v0 = (p2 - p0) * 0.5;
      vec3 v1 = (p3 - p1) * 0.5;
      float t2 = t * t;
      float t3 = t * t * t;
      return vec3((2.0 * p1 - 2.0 * p2 + v0 + v1) * t3 + (-3.0 * p1 + 3.0 * p2 - 2.0 * v0 - v1) * t2 + v0 * t + p1);
  }

  float limitVal (float tt) {

    if (tt > 1.0) {
      tt = 1.0;
    } else if (tt < 0.0) {
      tt = 0.0;
    } else {

    }
    return tt;
  }

  vec3 getPointAt (float t) {
    bool closed = false;
    float ll = ${floatval};
    float minusOne = 1.0;
    if (closed) {
      minusOne = 0.0;
    }
    float p = (ll - minusOne) * t;
    // float intPoint = floor(p);
    float intPoint = (p);
    float weight = p - intPoint;
    float idx0 = intPoint + -1.0;
    float idx1 = intPoint + -0.0;
    float idx2 = intPoint +  1.0;
    float idx3 = intPoint +  2.0;

    // vec3 pt0 = pointIDX_${name}(idx0);
    // vec3 pt1 = pointIDX_${name}(idx1);
    // vec3 pt2 = pointIDX_${name}(idx2);
    // vec3 pt3 = pointIDX_${name}(idx3);

    vec3 pt0 = texture2D(positionTextureCurrent, vec2(limitVal(idx0 / ll), 0.5)).xyz;
    vec3 pt1 = texture2D(positionTextureCurrent, vec2(limitVal(idx1 / ll), 0.5)).xyz;
    vec3 pt2 = texture2D(positionTextureCurrent, vec2(limitVal(idx2 / ll), 0.5)).xyz;
    vec3 pt3 = texture2D(positionTextureCurrent, vec2(limitVal(idx3 / ll), 0.5)).xyz;

    vec3 pointoutput = catmullRom(pt0, pt1, pt2, pt3, weight);
    return pointoutput;
  }
  `;
  // console.log(res);
  return res;
};

// let fbmNoise = `

// const mat2 m = mat2(0.80,  0.60, -0.60,  0.80);

// float noise(in vec2 p) {
//   return sin(p.x)*sin(p.y);
// }

// float fbm4( vec2 p ) {
//     float f = 0.0;
//     f += 0.5000 * noise( p ); p = m * p * 2.02;
//     f += 0.2500 * noise( p ); p = m * p * 2.03;
//     f += 0.1250 * noise( p ); p = m * p * 2.01;
//     f += 0.0625 * noise( p );
//     return f / 0.9375;
// }

// float fbm6( vec2 p ) {
//     float f = 0.0;
//     f += 0.500000*(0.5+0.5 * noise( p )); p = m*p*2.02;
//     f += 0.250000*(0.5+0.5 * noise( p )); p = m*p*2.03;
//     f += 0.125000*(0.5+0.5 * noise( p )); p = m*p*2.01;
//     f += 0.062500*(0.5+0.5 * noise( p )); p = m*p*2.04;
//     f += 0.031250*(0.5+0.5 * noise( p )); p = m*p*2.01;
//     f += 0.015625*(0.5+0.5 * noise( p ));
//     return f/0.96875;
// }

// float pattern (vec2 p, float time) {
//   float vout = fbm4( p + time + fbm6( p + fbm4( p + time )) );
//   return (vout);
// }
// `;

/* "gpu-preview" */
export const box = async (relay) => {
  let state = await relay.Resources.get("systemThree");
  let { gpu } = await relay.waitFor(0);
  let onFrame = await relay.Resources.get("onFrame");

  let { geometry, subdivisions, thickness } = new NoodleGeo({
    thickness: 0.2,
    count: 2 * 2 * 2,
    subdivisions: gpu.INSTANCE_COUNT,
  });
  geometry.instanceCount = 2 * 2 * 2;

  let lookupAttr = gpu.getLookUpAttr();
  geometry.setAttribute(lookupAttr.name, lookupAttr.attr);

  // let posAttr = gpu.getPosAttr();
  // geometry.setAttribute(posAttr.name, posAttr.attr);

  let previewer = new Mesh(
    geometry,
    new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        positionTextureCurrent: { value: null },
        velocityTextureCurrent: { value: null },
      },
      vertexShader: /* glsl */ `


      #include <common>
      #define lengthSegments ${subdivisions.toFixed(1)}

      attribute vec3 offset;

      attribute float angle;
      attribute float newPosition;
      uniform float time;

      uniform sampler2D positionTextureCurrent;
      ${lookupAttr.attrHeader}

      ${getRollGLSL({ name: "PTS", ctrlPts: gpu.INSTANCE_COUNT })}

      mat4 rotationX( in float angle ) {
        return mat4(	1.0,		0,			0,			0,
                0, 	cos(angle),	-sin(angle),		0,
                0, 	sin(angle),	 cos(angle),		0,
                0, 			0,			  0, 		1);
      }

      mat4 rotationY( in float angle ) {
        return mat4(	cos(angle),		0,		sin(angle),	0,
                    0,		1.0,			 0,	0,
                -sin(angle),	0,		cos(angle),	0,
                    0, 		0,				0,	1);
      }

      mat4 rotationZ( in float angle ) {
        return mat4(	cos(angle),		-sin(angle),	0,	0,
                sin(angle),		cos(angle),		0,	0,
                    0,				0,		1,	0,
                    0,				0,		0,	1);
      }

      mat4 rotationMatrix (vec3 axis, float angle) {
          axis = normalize(axis);
          float s = sin(angle);
          float c = cos(angle);
          float oc = 1.0 - c;

          return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                      0.0,                                0.0,                                0.0,                                1.0);
      }

      vec3 rotate(vec3 v, vec3 axis, float angle) {
        mat4 m = rotationMatrix(axis, angle);
        return (m * vec4(v, 1.0)).xyz;
      }

      vec3 sampleFnc (float t) {
        vec3 pt;

        pt += getPointAt(t);// + vec3(vec4(getPointAt(t * 0.1), 1.0) * rotationZ(time));
        pt += offset * 5.0;
        pt = rotate(pt, normalize(pt), time);
        return pt;
      }

      // vec3 catmullRom (vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
      //   vec3 v0 = (p2 - p0) * 0.5;
      //   vec3 v1 = (p3 - p1) * 0.5;
      //   float t2 = t * t;
      //   float t3 = t * t * t;

      //   return vec3((2.0 * p1 - 2.0 * p2 + v0 + v1) * t3 + (-3.0 * p1 + 3.0 * p2 - 2.0 * v0 - v1) * t2 + v0 * t + p1);
      // }

      // vec3 sampleFnc (float t) {

      // // return getPointAt(t);
      // vec3 p0 = texture2D(positionTextureCurrent, vec2(0.25, 0.0)).xyz;
      // vec3 p1 = texture2D(positionTextureCurrent, vec2(0.5, 0.0)).xyz;
      // vec3 p2 = texture2D(positionTextureCurrent, vec2(0.75, 0.0)).xyz;
      // vec3 p3 = texture2D(positionTextureCurrent, vec2(1.0, 0.0)).xyz;

      // return catmullRom(p0, p1, p2, p3, t);
      // }

      void createTube (float t, vec2 volume, out vec3 pos, out vec3 normal) {
        // find next sample along curve
        float nextT = t + (1.0 / lengthSegments);

        // sample the curve in two places
        vec3 cur = sampleFnc(t);
        vec3 next = sampleFnc(nextT);

        // compute the Frenet-Serret frame
        vec3 T = normalize(next - cur);
        vec3 B = normalize(cross(T, next + cur));
        vec3 N = -normalize(cross(B, T));

        // extrude outward to create a tube
        float tubeAngle = angle;
        float circX = cos(tubeAngle);
        float circY = sin(tubeAngle);

        // compute position and normal
        normal.xyz = normalize(B * circX + N * circY);
        pos.xyz = cur + B * volume.x * circX + N * volume.y * circY;
      }

      void makeGeo (out vec3 transformed, out vec3 objectNormal) {
        float thickness = 1.0 * ${thickness.toFixed(7)};
        float t = (newPosition * 2.0) * 0.5 + 0.5;

        vec2 volume = vec2(thickness);
        createTube(t, volume, transformed, objectNormal);
      }

        void main (void) {

          vec3 transformed;

          // vec3 objectNormalNoodle;// = vec3( normal );
          vec3 transformedNormal = vec3(normal);

          makeGeo(transformed, transformedNormal);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);

          // gl_PointSize = 5.0;
        }
      `,
      fragmentShader: `
        void main (void) {
          gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
        }
      `,
    })
  );

  previewer.frustumCulled = false;

  onFrame(() => {
    let { mouse, viewport, clock } = state;
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

    previewer.material.uniforms.time.value = clock.getElapsedTime();
    previewer.material.uniforms.positionTextureCurrent.value = positionTextureCurrent;
    previewer.material.uniforms.velocityTextureCurrent.value = velocityTextureCurrent;

    // if (!previewer.visible && ii >= gpu.INSTANCE_COUNT) {
    //   previewer.visible = true;
    // }
    // ii++;
  });

  relay.pulse({
    type: "add",
    item: previewer,
  });
};
