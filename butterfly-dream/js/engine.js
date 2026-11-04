'use strict';
/* 栩栩 · 粒子动态分镜 —— WebGL2 渲染核心 + 粒子系统
   世界坐标：默认 2D 机位下 z=0 平面可见 x∈[-8,8]、y∈[-4.5,4.5]（1 单位 ≈ 80px@720p） */
const XU = window.XU = {};
(() => {
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hsl(h, s, l) { // h 0..360, s,l 0..1 → [r,g,b]
  h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
Object.assign(XU, { TAU, clamp, lerp, ss, ease, mulberry, hsl, hex });

/* ---------- 矩阵 ---------- */
function persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]; }
function lookAt(e, c, u) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
}
function mul(a, b) { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
const FOV2D = 2 * Math.atan(.45);
XU.cam = { eye: [0, 0, 10], at: [0, 0, 0], up: [0, 1, 0], fov: FOV2D };
XU.cam2D = (roll = 0) => { XU.cam = { eye: [0, 0, 10], at: [0, 0, 0], up: [Math.sin(roll), Math.cos(roll), 0], fov: FOV2D }; };

/* ---------- 粒子系统（CPU 求目标，GPU 画光点） ---------- */
const mobile = matchMedia('(max-width: 700px)').matches;
const N = XU.N = mobile ? 26000 : 40000;
const P = new Float32Array(N * 3), T = new Float32Array(N * 3), C = new Float32Array(N * 4), TC = new Float32Array(N * 4);
const S = new Float32Array(N * 2), TS = new Float32Array(N * 2), K = new Float32Array(N), RND = new Float32Array(N * 4);
const BUF = new Float32Array(N * 9);
{ const r = mulberry(2024); for (let i = 0; i < N; i++) { for (let k = 0; k < 4; k++) RND[i * 4 + k] = r(); const a = r() * TAU, b = r() * 2 - 1, d = 3 + r() * 9; P[i * 3] = Math.cos(a) * d; P[i * 3 + 1] = b * 5; P[i * 3 + 2] = Math.sin(a) * d - 4; S[i * 2] = .02; } }
const PS = XU.PS = {
  N, P, RND, i: 0, k: 20, swirl: 0, drift: [0, .06, 0],
  begin() { this.i = 0; this.k = 20; this.swirl = 0; this.drift = [0, .06, 0]; },
  /* 指定下一个粒子的目标：位置、颜色(0..1)、强度 a、尺寸 s(世界单位)、遮挡 occ(0=纯发光 1=不透明) */
  put(x, y, z, r, g, b, a, s, occ = 0) {
    const i = this.i++; if (i >= N) return -1;
    const i3 = i * 3, i4 = i * 4, i2 = i * 2;
    T[i3] = x; T[i3 + 1] = y; T[i3 + 2] = z; TC[i4] = r; TC[i4 + 1] = g; TC[i4 + 2] = b; TC[i4 + 3] = a; TS[i2] = s; TS[i2 + 1] = occ; K[i] = this.k;
    return i;
  },
  rnd(i, k = 0) { return RND[((i < 0 ? this.i : i) % N) * 4 + k]; },
  end() {
    const [dx, dy, dz] = this.drift;
    for (let i = this.i; i < N; i++) { const i3 = i * 3; T[i3] = P[i3] + dx * (RND[i * 4 + 1] - .3); T[i3 + 1] = P[i3 + 1] + dy * RND[i * 4 + 2]; T[i3 + 2] = P[i3 + 2] + dz; TC[i * 4 + 3] = 0; K[i] = 2.2; }
  },
  update(dt, snap, t) {
    const sw = this.swirl;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3, i4 = i * 4, i2 = i * 2, r0 = RND[i4];
      const a = snap ? 1 : 1 - Math.exp(-K[i] * (.55 + r0 * .9) * dt);
      let dx = T[i3] - P[i3], dy = T[i3 + 1] - P[i3 + 1], dz = T[i3 + 2] - P[i3 + 2];
      P[i3] += dx * a; P[i3 + 1] += dy * a; P[i3 + 2] += dz * a;
      if (sw > 0 && !snap) { const d = Math.abs(dx) + Math.abs(dy) + Math.abs(dz), f = Math.min(d, 3) * sw * dt; P[i3] += Math.sin(P[i3 + 1] * 1.7 + t * 1.3 + RND[i4 + 1] * 6) * f; P[i3 + 1] += Math.sin(P[i3 + 2] * 1.3 + P[i3] * .9 + t + RND[i4 + 2] * 6) * f; P[i3 + 2] += Math.sin(P[i3] * 1.1 + t * .9) * f; }
      const ac = snap ? 1 : Math.min(1, a * 1.4);
      C[i4] += (TC[i4] - C[i4]) * ac; C[i4 + 1] += (TC[i4 + 1] - C[i4 + 1]) * ac; C[i4 + 2] += (TC[i4 + 2] - C[i4 + 2]) * ac; C[i4 + 3] += (TC[i4 + 3] - C[i4 + 3]) * ac;
      S[i2] += (TS[i2] - S[i2]) * ac; S[i2 + 1] += (TS[i2 + 1] - S[i2 + 1]) * ac;
      const o = i * 9; BUF[o] = P[i3]; BUF[o + 1] = P[i3 + 1]; BUF[o + 2] = P[i3 + 2]; BUF[o + 3] = C[i4]; BUF[o + 4] = C[i4 + 1]; BUF[o + 5] = C[i4 + 2]; BUF[o + 6] = C[i4 + 3]; BUF[o + 7] = S[i2]; BUF[o + 8] = S[i2 + 1];
    }
  }
};
/* 线（雨丝） */
const LMAX = 7000, LBUF = new Float32Array(LMAX * 2 * 7);
const LS = XU.LS = {
  n: 0,
  add(x1, y1, z1, x2, y2, z2, r, g, b, a1, a2 = a1) {
    if (this.n >= LMAX) return; const o = this.n++ * 14;
    LBUF[o] = x1; LBUF[o + 1] = y1; LBUF[o + 2] = z1; LBUF[o + 3] = r; LBUF[o + 4] = g; LBUF[o + 5] = b; LBUF[o + 6] = a1;
    LBUF[o + 7] = x2; LBUF[o + 8] = y2; LBUF[o + 9] = z2; LBUF[o + 10] = r; LBUF[o + 11] = g; LBUF[o + 12] = b; LBUF[o + 13] = a2;
  }
};

/* ---------- 后期参数（每帧由场景设置） ---------- */
const DEF = () => ({ bg: ['#1b1b1d', '#26262a', '#26262a', '#141416'], hz: .5, split: 0, sdir: [1, 0], soff: 0, sbg: ['#000', '#000'], sun: [.5, .5, .1, 0], sunCol: '#fff4d6', bloom: .5, thresh: .35, grain: .1, vig: .6, fade: 0, fadeCol: '#000', mask: [1, 1], focus: 10, dof: 0, sizeMul: 1 });
XU.post = DEF(); XU.resetPost = () => { XU.post = DEF(); };

/* ---------- WebGL ---------- */
const canvas = document.getElementById('stage');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
XU.gl = gl;
if (!gl) { XU.noGL = true; return; }
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function prog(vs, fs) { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); } return { p, u }; }
const H = '#version 300 es\nprecision highp float;\n';
const pPart = prog(H + `layout(location=0) in vec3 aPos; layout(location=1) in vec4 aCol; layout(location=2) in vec2 aSO;
uniform mat4 uPV; uniform float uProj, uFocus, uDof, uPxMax, uSizeMul;
out vec4 vCol; out float vSoft; out float vOcc;
void main(){
  vec4 p = uPV*vec4(aPos,1.); gl_Position = p;
  float w = max(p.w, 1e-3);
  float s = aSO.x*uSizeMul*uProj/w;
  float coc = uDof*abs(w-uFocus)/w*uProj*.02;
  float fs = clamp(s+coc, 1., uPxMax);
  float e = s*s/(fs*fs);
  vCol = vec4(aCol.rgb, aCol.a*max(e, .07*min(s*s,1.))*step(0.,p.w));
  vSoft = clamp(coc/fs, 0., 1.); vOcc = aSO.y; gl_PointSize = fs;
}`, H + `in vec4 vCol; in float vSoft; in float vOcc; out vec4 o;
void main(){
  vec2 c = gl_PointCoord*2.-1.; float d = dot(c,c); if(d>1.) discard;
  float f = mix(exp(-d*3.2), smoothstep(1.,.72,d)*(.5+.5*d), vSoft);
  float a = vCol.a*f; o = vec4(vCol.rgb*a, a*vOcc);
}`);
const pLine = prog(H + `layout(location=0) in vec3 aPos; layout(location=1) in vec4 aCol; uniform mat4 uPV; out vec4 vCol; void main(){ gl_Position=uPV*vec4(aPos,1.); vCol=aCol; }`,
  H + `in vec4 vCol; out vec4 o; void main(){ o = vec4(vCol.rgb*vCol.a, vCol.a*.25); }`);
const VQ = H + `out vec2 vUv; void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
const pBright = prog(VQ, H + `in vec2 vUv; uniform sampler2D uT; uniform vec2 uPx; uniform float uTh; out vec4 o;
void main(){ vec3 c = (texture(uT,vUv+uPx*vec2(-.5,-.5)).rgb+texture(uT,vUv+uPx*vec2(.5,-.5)).rgb+texture(uT,vUv+uPx*vec2(-.5,.5)).rgb+texture(uT,vUv+uPx*vec2(.5,.5)).rgb)*.25;
  float l = max(c.r,max(c.g,c.b)); o = vec4(c*smoothstep(uTh, uTh+.45, l), 1.); }`);
const pDown = prog(VQ, H + `in vec2 vUv; uniform sampler2D uT; uniform vec2 uPx; out vec4 o;
void main(){ o = vec4((texture(uT,vUv+uPx*vec2(-1,-1)).rgb+texture(uT,vUv+uPx*vec2(1,-1)).rgb+texture(uT,vUv+uPx*vec2(-1,1)).rgb+texture(uT,vUv+uPx*vec2(1,1)).rgb)*.25, 1.); }`);
const pBlur = prog(VQ, H + `in vec2 vUv; uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
void main(){ vec3 c = texture(uT,vUv).rgb*.227;
  c += (texture(uT,vUv+uDir*1.385).rgb+texture(uT,vUv-uDir*1.385).rgb)*.316;
  c += (texture(uT,vUv+uDir*3.231).rgb+texture(uT,vUv-uDir*3.231).rgb)*.07; o = vec4(c,1.); }`);
const pComp = prog(VQ, H + `in vec2 vUv; uniform sampler2D uScene, uBloom;
uniform vec3 uBg0,uBg1,uBg2,uBg3,uS0,uS1,uSunCol,uFadeCol; uniform float uHz,uSplit,uSOff,uBloomK,uGrain,uVig,uTime,uFade,uAsp;
uniform vec2 uSDir, uMask; uniform vec4 uSun; out vec4 o;
void main(){
  float v = vUv.y;
  vec3 bg = v>uHz ? mix(uBg1,uBg0,(v-uHz)/max(1.-uHz,1e-3)) : mix(uBg3,uBg2,v/max(uHz,1e-3));
  vec2 q = vUv-.5;
  if(uSplit>.5){ float sd = dot(q*vec2(uAsp,1.), uSDir)-uSOff; if(sd>0.) bg = mix(uS0,uS1,clamp(sd/.7,0.,1.)); }
  float d = length((vUv-uSun.xy)*vec2(uAsp,1.));
  bg += uSunCol*uSun.w*(exp(-d/max(uSun.z,1e-3))*.9 + exp(-d/max(uSun.z*5.,1e-3))*.35);
  vec4 sc = texture(uScene,vUv);
  vec3 col = bg*(1.-sc.a) + sc.rgb + texture(uBloom,vUv).rgb*uBloomK;
  col = 1.-exp(-col*1.25) + col*.08;
  col *= 1.-uVig*dot(q,q)*1.5;
  float n = fract(sin(dot(gl_FragCoord.xy+fract(uTime)*317.,vec2(12.9898,78.233)))*43758.5453);
  col += (n-.5)*uGrain;
  col = mix(col, uFadeCol, uFade);
  vec2 m = abs(q)*2.; if(m.x>uMask.x || m.y>uMask.y) col = vec3(0.);
  o = vec4(col,1.);
}`);

const vbo = gl.createBuffer(), vao = gl.createVertexArray();
gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, BUF.byteLength, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 36, 12);
gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 36, 28);
const lvbo = gl.createBuffer(), lvao = gl.createVertexArray();
gl.bindVertexArray(lvao); gl.bindBuffer(gl.ARRAY_BUFFER, lvbo); gl.bufferData(gl.ARRAY_BUFFER, LBUF.byteLength, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
const qvao = gl.createVertexArray();
gl.bindVertexArray(null);

function fbo(w, h) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; }
let F = null, cw = 0, ch = 0;
XU.resize = () => {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(320, Math.min(1920, Math.round(r.width * dpr))), h = Math.round(w * 9 / 16);
  if (w === cw && h === ch) return; cw = w; ch = h; canvas.width = w; canvas.height = h;
  if (F) for (const k in F) { gl.deleteTexture(F[k].t); gl.deleteFramebuffer(F[k].f); }
  const hw = w >> 1, hh = h >> 1, qw = w >> 2, qh = h >> 2;
  F = { full: fbo(w, h), half: fbo(hw, hh), q1: fbo(qw, qh), q2: fbo(qw, qh) };
};
const c3 = (u, c) => { const v = typeof c === 'string' ? hex(c) : c; gl.uniform3f(u, v[0], v[1], v[2]); };
function pass(p, target, tex, setU) { gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null); gl.viewport(0, 0, target ? target.w : cw, target ? target.h : ch); gl.useProgram(p.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); if (p.u.uT) gl.uniform1i(p.u.uT, 0); setU && setU(p.u); gl.bindVertexArray(qvao); gl.drawArrays(gl.TRIANGLES, 0, 3); }

XU.render = (t) => {
  const po = XU.post, cam = XU.cam;
  const pv = mul(persp(cam.fov, 16 / 9, .05, 500), lookAt(cam.eye, cam.at, cam.up));
  gl.disable(gl.DEPTH_TEST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, F.full.f); gl.viewport(0, 0, cw, ch);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  if (LS.n) { gl.useProgram(pLine.p); gl.uniformMatrix4fv(pLine.u.uPV, false, pv); gl.bindVertexArray(lvao); gl.bindBuffer(gl.ARRAY_BUFFER, lvbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, LBUF, 0, LS.n * 14); gl.drawArrays(gl.LINES, 0, LS.n * 2); }
  gl.useProgram(pPart.p); const u = pPart.u;
  gl.uniformMatrix4fv(u.uPV, false, pv); gl.uniform1f(u.uProj, ch / (2 * Math.tan(cam.fov / 2))); gl.uniform1f(u.uFocus, po.focus); gl.uniform1f(u.uDof, po.dof); gl.uniform1f(u.uPxMax, 90 * ch / 720); gl.uniform1f(u.uSizeMul, po.sizeMul);
  gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, BUF);
  gl.drawArrays(gl.POINTS, 0, N);
  gl.disable(gl.BLEND);
  pass(pBright, F.half, F.full.t, u => { gl.uniform2f(u.uPx, 1 / cw, 1 / ch); gl.uniform1f(u.uTh, po.thresh); });
  pass(pDown, F.q1, F.half.t, u => gl.uniform2f(u.uPx, 1 / F.half.w, 1 / F.half.h));
  for (const k of [1.2, 2.4]) {
    pass(pBlur, F.q2, F.q1.t, u => gl.uniform2f(u.uDir, k / F.q1.w, 0));
    pass(pBlur, F.q1, F.q2.t, u => gl.uniform2f(u.uDir, 0, k / F.q1.h));
  }
  pass(pComp, null, F.full.t, u => {
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, F.q1.t);
    gl.uniform1i(u.uScene, 0); gl.uniform1i(u.uBloom, 1);
    c3(u.uBg0, po.bg[0]); c3(u.uBg1, po.bg[1]); c3(u.uBg2, po.bg[2]); c3(u.uBg3, po.bg[3]); gl.uniform1f(u.uHz, po.hz);
    gl.uniform1f(u.uSplit, po.split); gl.uniform2f(u.uSDir, po.sdir[0], po.sdir[1]); gl.uniform1f(u.uSOff, po.soff); c3(u.uS0, po.sbg[0]); c3(u.uS1, po.sbg[1]);
    gl.uniform4f(u.uSun, po.sun[0], po.sun[1], po.sun[2], po.sun[3]); c3(u.uSunCol, po.sunCol);
    gl.uniform1f(u.uBloomK, po.bloom); gl.uniform1f(u.uGrain, po.grain); gl.uniform1f(u.uVig, po.vig); gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uFade, po.fade); c3(u.uFadeCol, po.fadeCol); gl.uniform2f(u.uMask, po.mask[0], po.mask[1]); gl.uniform1f(u.uAsp, 16 / 9);
    gl.activeTexture(gl.TEXTURE0);
  });
};
XU.resize();
})();
