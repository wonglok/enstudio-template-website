import {
  BufferAttribute,
  CylinderBufferGeometry,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";

import { Geometry } from "three/examples/jsm/deprecated/Geometry";

class NoodleGeometry {
  constructor() {
    let count = 100;
    let numSides = 4;
    let subdivisions = 100;
    let openEnded = false;
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

    const lineGeometry = new InstancedBufferGeometry();
    lineGeometry.instanceCount = count;

    lineGeometry.setAttribute("position", new BufferAttribute(origPosArray, 3));
    lineGeometry.setAttribute("newPosition", new BufferAttribute(posArray, 1));
    lineGeometry.setAttribute("angle", new BufferAttribute(angleArray, 1));
    lineGeometry.setAttribute("uv", new BufferAttribute(uvArray, 2));

    return {
      count,
      lineGeometry,
      subdivisions,
    };
  }
}

let getRollGLSL = ({ name = "CONTROL_POINTS", ctrlPts = 8 }) => {
  let ifthenelse = ``;

  // let intval = `${Number(pts.length).toFixed(0)}`
  let floatval = `${Number(ctrlPts).toFixed(1)}`;

  for (let idx = 0; idx < ctrlPts; idx++) {
    ifthenelse += `
    else if (index == ${idx.toFixed(1)}) {
      result = controlPoint${idx.toFixed(0)};
    }
    `;
  }

  let attrs = ``;
  for (let idx = 0; idx < ctrlPts; idx++) {
    attrs += `
    uniform vec3 controlPoint${idx};
    `;
  }

  let res = `
  ${attrs}
  vec3 pointIDX_${name} (float index) {
    vec3 result = controlPoint0;
    if (false) {
    } ${ifthenelse}
    return result;
  }
  vec3 catmullRom (vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
      vec3 v0 = (p2 - p0) * 0.5;
      vec3 v1 = (p3 - p1) * 0.5;
      float t2 = t * t;
      float t3 = t * t * t;
      return vec3((2.0 * p1 - 2.0 * p2 + v0 + v1) * t3 + (-3.0 * p1 + 3.0 * p2 - 2.0 * v0 - v1) * t2 + v0 * t + p1);
  }
  vec3 getPointAt (float t) {
    bool closed = false;
    float ll = ${floatval};
    float minusOne = 1.0;
    if (closed) {
      minusOne = 0.0;
    }
    float p = (ll - minusOne) * t;
    float intPoint = floor(p);
    float weight = p - intPoint;
    float idx0 = intPoint + -1.0;
    float idx1 = intPoint +  0.0;
    float idx2 = intPoint +  1.0;
    float idx3 = intPoint +  2.0;
    vec3 pt0 = pointIDX_${name}(idx0);
    vec3 pt1 = pointIDX_${name}(idx1);
    vec3 pt2 = pointIDX_${name}(idx2);
    vec3 pt3 = pointIDX_${name}(idx3);
    // pt0 = controlPoint0;
    // pt1 = controlPoint1;
    // pt2 = controlPoint2;
    // pt3 = controlPoint3;
    vec3 pointoutput = catmullRom(pt0, pt1, pt2, pt3, weight);
    return pointoutput;
  }
  `;

  console.log(res);
  return res;
};

/* "mouse-trail" */
export const box = async (relay) => {
  let onFrame = await relay.Resources.get("onFrame");

  let { lineGeometry, subdivisions } = new NoodleGeometry();

  let shaderMaterial = new ShaderMaterial({
    defines: {
      lengthSegments: `${subdivisions.toFixed(1)}`,
    },
    uniforms: {
      controlPoint0: { value: new Vector3() },
      controlPoint1: { value: new Vector3() },
      controlPoint2: { value: new Vector3() },
      controlPoint3: { value: new Vector3() },
      controlPoint4: { value: new Vector3() },
      controlPoint5: { value: new Vector3() },
      controlPoint6: { value: new Vector3() },
      controlPoint7: { value: new Vector3() },

      time: { value: 0 },
    },
    vertexShader: `
#include <common>

attribute float angle;
attribute float newPosition;

uniform float time;

${getRollGLSL({ name: "CONTROL_POINTS", ctrlPts: 8 })}

vec3 makeLine (float t) {
  vec3 coord = getPointAt(1.0 - t);
  return coord;
}

vec3 sampleFnc (float t) {
  return makeLine(t);
}

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
  float thickness = 1.0 * ${(0.5).toFixed(5)};
  float t = (newPosition * 2.0) * 0.5 + 0.5;

  vec2 volume = vec2(thickness);
  createTube(t, volume, transformed, objectNormal);
}

void main (void) {
  vec3 transformed = vec3(0.0);
  vec3 objectNormal = vec3(0.0);
  makeGeo(transformed, objectNormal);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
    `,
    fragmentShader: `
void main (void) {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
    `,
  });
  let item = new Mesh(lineGeometry, shaderMaterial);

  let points = [];
  for (let i = 0; i < 8; i++) {
    points.push(new Vector3());
  }

  let mouse = new Vector3();
  onFrame((state, delta) => {
    // state
    shaderMaterial.uniforms.time.value += delta;

    let vp = state.viewport();
    mouse.x = state.mouse.x * -1 * vp.width * 0.5;
    mouse.y = state.mouse.y * 1 * vp.height * 0.5;
    mouse.z = 0.0;

    let idx = points.length - 1;
    for (let i = idx; i >= 0; i--) {
      if (!i) {
        points[i].lerp(mouse, 1.0);
      } else {
        points[i].lerp(points[i - 1], 0.3);
      }
    }

    shaderMaterial.uniforms.controlPoint0.value.lerp(points[0], 1.0);
    shaderMaterial.uniforms.controlPoint1.value.lerp(points[1], 1.0);
    shaderMaterial.uniforms.controlPoint2.value.lerp(points[2], 1.0);
    shaderMaterial.uniforms.controlPoint3.value.lerp(points[3], 1.0);
    shaderMaterial.uniforms.controlPoint4.value.lerp(points[4], 1.0);
    shaderMaterial.uniforms.controlPoint5.value.lerp(points[5], 1.0);
    shaderMaterial.uniforms.controlPoint6.value.lerp(points[6], 1.0);
    shaderMaterial.uniforms.controlPoint7.value.lerp(points[7], 1.0);
  });

  relay.pulse({
    type: "add",
    item: item,
  });
};
