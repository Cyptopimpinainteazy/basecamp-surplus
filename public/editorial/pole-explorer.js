/** Generic educational scene. Geometry is illustrative, never a measured product or fit claim. */
export function mountPoleExplorer(host, THREE, onFailure = () => {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch { return mountCssPoleExplorer(host); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x142820, 1);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive generic pole assembly. Drag horizontally to rotate, or use the controls below. Not an actual listed product.');
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  camera.position.set(0, 2.8, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xf1f0d9, 0x142c21, 3));
  const key = new THREE.DirectionalLight(0xffffff, 4); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8c3d, 3); rim.position.set(-3, 2, -3); scene.add(rim);
  const rig = new THREE.Group(); rig.rotation.set(-.14, -.22, -.16); scene.add(rig);
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x93a28b, metalness: .82, roughness: .26 }),
    new THREE.MeshStandardMaterial({ color: 0xdddcd1, metalness: .85, roughness: .2 }),
    new THREE.MeshStandardMaterial({ color: 0x151a17, metalness: .15, roughness: .7 }),
    new THREE.MeshStandardMaterial({ color: 0xee7729, roughness: .5 }),
  ];
  const geometries = [];
  function cylinder(radius, length, material, x) {
    const geo = new THREE.CylinderGeometry(radius, radius, length, 36); geometries.push(geo);
    const mesh = new THREE.Mesh(geo, material); mesh.rotation.z = -Math.PI / 2; mesh.position.x = x; return mesh;
  }
  const pieces = [];
  for (let i = 0; i < 3; i++) {
    const part = new THREE.Group();
    part.add(cylinder(.16, 2.15, materials[0], 0));
    part.add(cylinder(.126, .43, materials[1], 1.22));
    part.add(cylinder(.169, .045, materials[3], -.99));
    part.position.x = (i - 1) * 2.2;
    rig.add(part); pieces.push(part);
  }
  const leftTip = cylinder(.095, .48, materials[2], -3.55);
  const rightTip = cylinder(.095, .48, materials[2], 3.75);
  rig.add(leftTip, rightTip);
  const cord = cylinder(.019, 9.3, materials[3], 0); cord.position.y = -.48; rig.add(cord);
  let disposed = false, visible = true, auto = false, frame = 0, previousTime = 0, drag = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function render(time = 0) {
    frame = 0;
    if (disposed) return;
    if (auto && visible && !document.hidden && !reduced.matches && !drag) rig.rotation.y += Math.min((time - previousTime) / 1000 || 0, .05) * .25;
    previousTime = time;
    renderer.render(scene, camera);
    if (auto && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(render);
  }
  function draw() { if (!frame && !disposed) frame = requestAnimationFrame(render); }
  function resize() { const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = Math.max(12, 6 / (camera.aspect * Math.tan(Math.PI / 10))); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); draw(); }
  const ro = new ResizeObserver(resize); ro.observe(host);
  const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; } else draw(); }); io.observe(host);
  function down(e) { if (e.button !== 0) return; drag = { id: e.pointerId, x: e.clientX }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; }
  function move(e) { if (!drag || drag.id !== e.pointerId) return; rig.rotation.y += (e.clientX - drag.x) * .008; drag.x = e.clientX; draw(); }
  function up() { drag = null; canvas.style.cursor = 'grab'; draw(); }
  function lost(e) { e.preventDefault(); onFailure(); }
  const visibility = () => { if (frame) { cancelAnimationFrame(frame); frame = 0; } if (!document.hidden) draw(); };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility); reduced.addEventListener('change', draw);
  resize();
  return {
    setExplode(value) { const gap = Math.max(0, Math.min(1, value)) * .85; pieces.forEach((p, i) => p.position.x = (i - 1) * (2.2 + gap)); leftTip.position.x = -3.55 - gap * 1.5; rightTip.position.x = 3.75 + gap * 1.5; draw(); },
    setAuto(value) { auto = Boolean(value); draw(); },
    rotate(delta) { rig.rotation.y += delta; draw(); },
    reset() { rig.rotation.set(-.14, -.22, -.16); draw(); },
    dispose() { disposed = true; if (frame) cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', draw); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('webglcontextlost', lost); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); canvas.remove(); },
  };
}


/** DOM/CSS 3D fallback keeps the same controls usable without a WebGL device. */
function mountCssPoleExplorer(host) {
  const shell = document.createElement('div');
  shell.style.cssText = 'position:absolute;inset:0;overflow:hidden;perspective:850px;background:radial-gradient(ellipse at 55% 40%,#365143,#12271d 80%);touch-action:pan-y;cursor:grab';
  shell.setAttribute('role','img');
  shell.setAttribute('aria-label','Rotatable generic pole assembly rendered in CSS 3D. Educational illustration, not to scale.');
  const scaler = document.createElement('div'); scaler.style.cssText = 'position:absolute;left:50%;top:48%;width:0;height:0;transform-style:preserve-3d';
  const rig = document.createElement('div');rig.style.cssText='position:absolute;transform-style:preserve-3d';
  shell.append(scaler);scaler.append(rig);host.append(shell);
  function tube(width,radius,color) {
    const mesh=document.createElement('div');mesh.style.cssText='position:absolute;transform-style:preserve-3d';
    for(let i=0;i<16;i++){
      const face=document.createElement('div');const light=45+Math.cos(i/16*Math.PI*2)*25;
      face.style.cssText=`position:absolute;width:${width}px;height:${2*Math.PI*radius/16+.4}px;background:${color==='silver'?`hsl(45 9% ${light+16}%)`:`hsl(100 12% ${light}%)`};transform:translateY(-2px) rotateX(${i*22.5}deg) translateZ(${radius}px);backface-visibility:hidden`;
      mesh.append(face);
    }
    return mesh;
  }
  const pieces=[];
  for(let i=0;i<3;i++){
    const part=document.createElement('div');part.style.cssText='position:absolute;transform-style:preserve-3d';
    part.append(tube(150,10,'green'));
    const connector=tube(31,8,'silver');connector.style.left='145px';part.append(connector);
    const band=document.createElement('div');band.style.cssText='position:absolute;left:7px;top:-11px;width:4px;height:22px;background:#f6782d;transform:translateZ(11px)';part.append(band);
    rig.append(part);pieces.push(part);
  }
  const left=tube(25,6,'silver'),right=tube(25,6,'silver');rig.append(left,right);
  const cord=document.createElement('div');cord.style.cssText='position:absolute;left:-285px;top:50px;width:570px;height:3px;background:#ed7836;box-shadow:0 4px 6px #0005;transform:translateZ(-5px)';rig.append(cord);
  const shadow=document.createElement('div');shadow.style.cssText='position:absolute;left:-270px;top:65px;width:540px;height:45px;border-radius:50%;background:#0005;filter:blur(20px);transform:rotateX(70deg) translateZ(-50px)';rig.append(shadow);
  let yaw=-18, gap=0, auto=false, visible=true, disposed=false, frame=0, last=0, drag=null;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  function paint(time=0){frame=0;if(disposed)return;if(auto&&visible&&!document.hidden&&!reduce.matches&&!drag)yaw+=Math.min((time-last)/1000||0,.05)*12;last=time;rig.style.transform=`rotateX(-16deg) rotateY(${yaw}deg) rotateZ(-8deg)`;pieces.forEach((p,i)=>p.style.transform=`translateX(${(i-1)*(153+gap)-75}px)`);left.style.transform=`translateX(${-253-gap*1.5}px)`;right.style.transform=`translateX(${247+gap*1.5}px)`;if(auto&&visible&&!document.hidden&&!reduce.matches)frame=requestAnimationFrame(paint);}
  function draw(){if(!frame&&!disposed)frame=requestAnimationFrame(paint);}
  const resize=()=>{scaler.style.transform=`scale(${Math.min((host.clientWidth-25)/760,(host.clientHeight-30)/250,1.1)})`;draw();};
  const ro=new ResizeObserver(resize);ro.observe(host);
  const io=new IntersectionObserver(e=>{visible=e[0].isIntersecting;if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}else draw();});io.observe(host);
  const down=e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX};shell.setPointerCapture(e.pointerId);};
  const move=e=>{if(!drag||e.pointerId!==drag.id)return;yaw+=(e.clientX-drag.x)*.4;drag.x=e.clientX;draw();};
  const up=()=>{drag=null;draw();};
  const visibility=()=>{if(frame){cancelAnimationFrame(frame);frame=0;}if(!document.hidden)draw();};
  shell.addEventListener('pointerdown',down);shell.addEventListener('pointermove',move);shell.addEventListener('pointerup',up);shell.addEventListener('pointercancel',up);document.addEventListener('visibilitychange',visibility);reduce.addEventListener('change',draw);resize();
  return {setExplode(v){gap=Math.max(0,Math.min(1,v))*45;draw();},setAuto(v){auto=Boolean(v);draw();},rotate(delta){yaw+=delta*180/Math.PI;draw();},reset(){yaw=-18;draw();},dispose(){disposed=true;if(frame)cancelAnimationFrame(frame);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',draw);shell.remove();}};
}
