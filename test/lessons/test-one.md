Title: Article One
Description: Test Article
TOC: First Article

This is a test

```html
<div>test<div>
```

<pre class="prettyprint other"><code>
{{#escapehtml}}<div>
  <div>test</div>
</div>{{/escapehtml}}
</code></pre>


In any case if we compute the cross product of our <span class="z-axis">`zAxis`</span> and
<span style="color: gray;">`up`</span> we'll get the <span class="x-axis">xAxis</span> for the camera.

And now that we have the <span class="x-axis">`xAxis`</span> we can cross the <span class="z-axis">`zAxis`</span> and the <span class="x-axis">`xAxis`</span>
which will give us the camera's <span class="y-axis">`yAxis`</span>

Now all we have to do is plug the 3 axes into a matrix. That gives us a
matrix that will orient something that points at the `target` from the
`cameraPosition`. We just need to add in the `position`

<div class="webgl_math_center"><pre class="webgl_math">
+----+----+----+----+
| <span class="x-axis">Xx</span> | <span class="x-axis">Xy</span> | <span class="x-axis">Xz</span> |  0 |  <- <span class="x-axis">x axis</span>
+----+----+----+----+
| <span class="y-axis">Yx</span> | <span class="y-axis">Yy</span> | <span class="y-axis">Yz</span> |  0 |  <- <span class="y-axis">y axis</span>
+----+----+----+----+
| <span class="z-axis">Zx</span> | <span class="z-axis">Zy</span> | <span class="z-axis">Zz</span> |  0 |  <- <span class="z-axis">z axis</span>
+----+----+----+----+
| Tx | Ty | Tz |  1 |  <- camera position
+----+----+----+----+
</pre></div>

Here's the code to compute the cross product of 2 vectors.

```js
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
}
```

Here's the code to subtract two vectors.

---

## Let's compare WebGL to WebGPU

### Shaders

Here is a shader that draws textured, lit, triangles. One in GLSL and the other
in WGSL.

<div class="webgpu_center compare"><div><div>GLSL</div><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const vSrc = `
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;

attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;

varying vec2 v_texCoord;
varying vec3 v_normal;

void main() {
  gl_Position = u_worldViewProjection * a_position;
  v_texCoord = a_texcoord;
  v_normal = (u_worldInverseTranspose * vec4(a_normal, 0)).xyz;
}
`;

const fSrc = `
precision highp float;

varying vec2 v_texCoord;
varying vec3 v_normal;

uniform sampler2D u_diffuse;
uniform vec3 u_lightDirection;

void main() {
  vec4 diffuseColor = texture2D(u_diffuse, v_texCoord);
  vec3 a_normal = normalize(v_normal);
  float l = dot(a_normal, u_lightDirection) * 0.5 + 0.5;
  gl_FragColor = vec4(diffuseColor.rgb * l, diffuseColor.a);
}
`;
{{/escapehtml}}</code></pre>
</div><div>
<div>WGSL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
const shaderSrc = `
struct VSUniforms {
  worldViewProjection: mat4x4<f32>,
  worldInverseTranspose: mat4x4<f32>,
};
@group(0) binding(0) var<uniform> vsUniforms: VSUniforms;

struct MyVSInput {
    @location(0) position: vec4<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) texcoord: vec2<f32>,
};

struct MyVSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) texcoord: vec2<f32>,
};

@vertex
fn myVSMain(v: MyVSInput) -> MyVSOutput {
  var vsOut: MyVSOutput;
  vsOut.position = vsUniforms.worldViewProjection * v.position;
  vsOut.normal = (vsUniforms.worldInverseTranspose * vec4<f32>(v.normal, 0.0)).xyz;
  vsOut.texcoord = v.texcoord;
  return vsOut;
}

struct FSUniforms {
  lightDirection: vec3<f32>,
};

@group(0) binding(1) var<uniform> fsUniforms: FSUniforms;
@group(0) binding(2) var diffuseSampler: sampler;
@group(0) binding(3) var diffuseTexture: texture_2d<f32>;

@fragment
fn myFSMain(v: MyVSOutput) -> @location(0) vec4<f32> {
  var diffuseColor = textureSample(diffuseTexture, diffuseSampler, v.texcoord);
  var a_normal = normalize(v.normal);
  var l = dot(a_normal, fsUniforms.lightDirection) * 0.5 + 0.5;
  return vec4<f32>(diffuseColor.rgb * l, diffuseColor.a);
}
`;
{{/escapehtml}}</code></pre></div></div>

Notice in many ways they aren't all that different. The core parts of each
function are very similar. `vec4` in GLSL becomes `vec4<f32>` in WGSL, `mat4`
becomes `mat4x4<f32>`.

GLSL is C/C++ like. WGSL is Rust like. One difference is
types go on the left in GLSL and on the right in WGSL.

<div class="webgpu_center compare"><div><div>GLSL</div><pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// declare a variable of type vec4
vec4 v;

// declare a function of type mat4 that takes a vec3 parameter
mat4 someFunction(vec3 p) { ... }

// declare a struct
struct Foo {  vec4: field; }
{{/escapehtml}}</code></pre>
</div><div>
<div>WGSL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
// declare a variable of type vec4<f32>
var v: vec4<f32>;

// declare a function of type mat4x4<f32> that takes a vec3<f32> parameter
fn someFunction(p: vec3<f32>) => mat4x4<f32> { ... }

// declare a struct
struct Foo {  field: vec4<f32>; }
{{/escapehtml}}</code></pre></div></div>

WGSL has the concept that if you do not specify the type of variable it will
be deduced from the type of the expression on the right whereas GLSL required you to
always specify the type. In other words in GLSL


### Getting the API

<div class="webgpu_center compare">
  <div>
    <div>WebGL</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
function main() {
  const gl = document.querySelector('canvas').getContext('webgl');
  if (!gl) {
    fail('need webgl');
    return;
  }
}

main();
{{/escapehtml}}</code></pre>
  </div>
  <div>
    <div>WebGPU</div>
<pre class="prettyprint lang-javascript"><code>{{#escapehtml}}
async function main() {
  const gpu = navigator.gpu;
  if (!gpu) {
    fail('this browser does not support webgpu');
    return;
  }

  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    fail('this browser appears to support WebGPU but it\'s disabled');
    return;
  }
  const device = await adapter.requestDevice();

...
}

main();
{{/escapehtml}}</code></pre>
  </div>
</div>

Here, `adapter` represents the GPU itself whereas `device` represents
an instance of the API on that GPU.
