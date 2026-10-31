"use client";

import { useEffect, useRef } from "react";

// A live topographic map: contour lines of a slowly drifting noise field, drawn
// in a fragment shader. It starts after the page is idle, pauses off-screen and
// in background tabs, draws a single still frame for reduced motion, and leaves
// the static topo pattern underneath if WebGL isn't available.

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision mediump float;
uniform vec2 res;uniform float t;uniform vec3 line;uniform vec3 glow;uniform vec2 sun;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/res.y;
  float e=fbm(uv*2.2+vec2(t*.012,t*.006))+.35*fbm(uv*5.+vec2(-t*.02,t*.01));
  float k=e*14.;
  float d=abs(fract(k)-.5)/fwidth(k);
  float c=1.-clamp(d-.6,0.,1.);
  float k5=k/5.;
  float major=1.-clamp(abs(fract(k5)-.5)/fwidth(k5)-.8,0.,1.);
  float s=smoothstep(.9,.0,distance(gl_FragCoord.xy/res,sun));
  vec3 col=mix(line,glow,s);
  float a=c*.11+major*.2;
  gl_FragColor=vec4(col*a,a);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

const hex = (v: string) => {
  const m = v.trim().replace("#", "");
  return [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
};

export function TopoCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let cleanup = () => {};

    const start = () => {
      if (disposed) return;
      const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
      if (!gl || !gl.getExtension("OES_standard_derivatives")) return; // keep the static pattern
      let prog: WebGLProgram;
      try {
        prog = gl.createProgram()!;
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, "#extension GL_OES_standard_derivatives : enable\n" + FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      } catch {
        return;
      }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const u = (name: string) => gl.getUniformLocation(prog, name);
      const uRes = u("res"), uT = u("t"), uLine = u("line"), uGlow = u("glow"), uSun = u("sun");
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      canvas.dataset.live = "";

      const colors = () => {
        const dark = getComputedStyle(document.documentElement).colorScheme === "dark";
        gl.uniform3fv(uLine, dark ? hex("#6ff0b4") : hex("#eef3f4"));
        gl.uniform3fv(uGlow, hex("#ffb35c"));
      };
      const size = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform2f(uSun, window.innerWidth < 640 ? 0.75 : 0.62, 0.42);
      };
      colors();
      size();

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const t0 = performance.now() - 40_000;
      const frame = (now: number) => {
        gl.uniform1f(uT, (now - t0) / 1000);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!still && visible && !document.hidden) raf = requestAnimationFrame(frame);
        else raf = 0;
      };
      const kick = () => {
        if (!raf && !still && visible && !document.hidden) raf = requestAnimationFrame(frame);
      };
      frame(performance.now());

      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        kick();
      });
      io.observe(canvas);
      const ro = new ResizeObserver(() => {
        size();
        if (still || !raf) frame(performance.now());
      });
      ro.observe(canvas);
      const themeObs = new MutationObserver(() => {
        colors();
        if (still || !raf) frame(performance.now());
      });
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      document.addEventListener("visibilitychange", kick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        themeObs.disconnect();
        document.removeEventListener("visibilitychange", kick);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    };

    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const handle = idle ? idle(start, { timeout: 1500 }) : window.setTimeout(start, 400);
    return () => {
      disposed = true;
      if (!idle) clearTimeout(handle);
      cleanup();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
