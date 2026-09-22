/* CAD viewer v3 — isolated Fusion-style navigation layer.
 * Loaded after index.html so it replaces the old DAC GLB viewer without
 * changing the portfolio layout or the project data.
 */
(function(){
  'use strict';
  if(!window.THREE || !THREE.GLTFLoader || !THREE.OrbitControls) return;

  const instances = new WeakMap();
  const STYLE='cad-viewer-v3-style';

  function addStyle(){
    if(document.getElementById(STYLE)) return;
    const s=document.createElement('style'); s.id=STYLE;
    s.textContent=`
      .cad-v3{position:relative!important;overflow:hidden!important;background:#f3f3f2!important;isolation:isolate}
      .cad-v3>canvas.cad-v3-canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;max-width:none!important;z-index:0}
      .cad-v3-ui{position:absolute;inset:0;z-index:30;pointer-events:none;font-family:Arial,Helvetica,sans-serif}
      .cad-v3-toolbar{position:absolute;right:10px;top:10px;display:flex;gap:6px;pointer-events:auto}
      .cad-v3-btn{width:34px;height:34px;border:1px solid #c6c7c5;background:rgba(255,255,255,.97);color:#151515;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.18)}
      .cad-v3-btn:hover{background:#fff;border-color:#777}.cad-v3-btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .cad-v3-layers{position:absolute;right:10px;top:50px;width:230px;max-width:calc(100% - 20px);display:none;padding:7px;background:#101012;border:1px solid #3a3a3c;color:#ddd;box-shadow:0 12px 28px rgba(0,0,0,.35);pointer-events:auto}
      .cad-v3-layers.open{display:block}.cad-v3-layers h4{font:10px Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:5px 6px 8px;margin:0;border-bottom:1px solid #28282a}.cad-v3-layers label{display:flex;align-items:center;gap:8px;padding:7px;font-size:11px;color:#bbb;cursor:pointer}.cad-v3-layers label:hover{background:#19191b;color:#fff}
      .cad-v3-activate{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;background:rgba(12,12,13,.16);transition:opacity .15s}.cad-v3-activate.hidden{opacity:0;pointer-events:none}.cad-v3-activate span{padding:7px 11px;background:rgba(255,255,255,.93);border:1px solid #bfc0bd;color:#555;font:10px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 1px 3px rgba(0,0,0,.12)}
      .cad-v3-cube{position:absolute;right:12px;top:12px;width:122px;height:122px;pointer-events:auto}.cad-v3-box{position:absolute;left:23px;top:23px;width:76px;height:76px;transform-style:preserve-3d;transition:transform .08s linear}.cad-v3-face{position:absolute;width:76px;height:76px;display:flex;align-items:center;justify-content:center;padding:0;background:linear-gradient(#ececeb,#d7d7d5);border:1px solid #a9aaa8;box-sizing:border-box;color:#555;font:700 10px Arial,sans-serif;backface-visibility:hidden;cursor:pointer}.cad-v3-front{transform:translateZ(38px)}.cad-v3-back{transform:rotateY(180deg) translateZ(38px)}.cad-v3-right{transform:rotateY(90deg) translateZ(38px)}.cad-v3-left{transform:rotateY(-90deg) translateZ(38px)}.cad-v3-top{transform:rotateX(90deg) translateZ(38px)}.cad-v3-bottom{transform:rotateX(-90deg) translateZ(38px)}
      .cad-v3-arrow{position:absolute;border:0;background:transparent;color:#999;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}.cad-v3-arrow:hover{color:#555}.cad-v3-arrow svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.cad-v3-a-up{left:45px;top:-2px;width:30px;height:22px}.cad-v3-a-down{left:45px;bottom:-2px;width:30px;height:22px}.cad-v3-a-left{left:-3px;top:45px;width:22px;height:30px}.cad-v3-a-right{right:-3px;top:45px;width:22px;height:30px}.cad-v3-a-cw{right:-1px;top:-11px;width:39px;height:28px}.cad-v3-a-ccw{left:-5px;top:-11px;width:39px;height:28px}
      .cad-v3-home{position:absolute;left:0;top:0;width:22px;height:22px;border:1px solid #c9c9c7;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;cursor:pointer}.cad-v3-home svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
      .cad-v3-load{position:absolute;inset:0;z-index:15;display:flex;align-items:center;justify-content:center;background:rgba(243,243,242,.76);color:#555;font:10px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;pointer-events:none}.cad-v3-load i{position:absolute;left:50%;top:calc(50% + 22px);transform:translateX(-50%);width:min(280px,55%);height:2px;background:#d0d0ce}.cad-v3-load i b{display:block;height:100%;width:0;background:#555}
      .cad-v3-error{position:absolute;inset:0;z-index:16;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:#f3f3f2;color:#555;font:11px Arial,sans-serif}.cad-v3-error button{border:1px solid #aaa;background:#fff;padding:7px 12px;cursor:pointer}
      :fullscreen.cad-v3{background:#f3f3f2!important}:fullscreen.cad-v3 .cad-v3-toolbar{top:14px;right:14px}:fullscreen.cad-v3 .cad-v3-cube{top:18px;right:18px}:fullscreen.cad-v3 .cad-v3-layers{top:58px;right:14px}
    `;
    document.head.appendChild(s);
  }

  const SVG={
    layers:'<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
    expand:'<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/><path d="m3 8 5-5M16 3l5 5M3 16l5 5M21 16l-5 5"/></svg>',
    shrink:'<svg viewBox="0 0 24 24"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M21 15h-6v6"/></svg>',
    home:'<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
    up:'<svg viewBox="0 0 24 24"><path d="m4 15 8-8 8 8"/></svg>',down:'<svg viewBox="0 0 24 24"><path d="m4 9 8 8 8-8"/></svg>',left:'<svg viewBox="0 0 24 24"><path d="m15 4-8 8 8 8"/></svg>',right:'<svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8"/></svg>',
    cw:'<svg viewBox="0 0 48 30"><path d="M6 20C12 5 28 2 40 10c3 2 5 5 6 9"/><path d="m46 19-8-1m8 1-2-7"/></svg>',ccw:'<svg viewBox="0 0 48 30"><path d="M42 20C36 5 20 2 8 10c-3 2-5 5-6 9"/><path d="m2 19 8-1m-8 1 2-7"/></svg>'
  };
  function ico(n){return SVG[n]||''}
  function dispose(root){root?.traverse?.(o=>{o.geometry?.dispose();const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>{x.map?.dispose();x.normalMap?.dispose();x.dispose?.()})})}
  function resize(v){if(!v.renderer)return;const r=v.container.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));v.camera.aspect=w/h;v.camera.updateProjectionMatrix();v.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));v.renderer.setSize(w,h,false)}
  function tween(v,dir,duration=500){
    const target=v.controls.target.clone(),radius=v.camera.position.distanceTo(target);dir=dir.clone().normalize();const start=v.camera.position.clone(),end=target.clone().add(dir.multiplyScalar(radius));cancelAnimationFrame(v.tween||0);v.controls.enabled=false;const t0=performance.now();const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    function step(now){const p=Math.min(1,(now-t0)/duration),e=ease(p);v.camera.position.lerpVectors(start,end,e);v.camera.lookAt(target);v.controls.target.copy(target);if(p<1)v.tween=requestAnimationFrame(step);else{v.tween=0;v.controls.enabled=true;v.controls.update()}}v.tween=requestAnimationFrame(step)
  }
  function orbit(v,theta,phi){const target=v.controls.target.clone(),s=new THREE.Spherical().setFromVector3(v.camera.position.clone().sub(target));s.theta+=theta;s.phi=Math.max(.002,Math.min(Math.PI-.002,s.phi+phi));tween(v,new THREE.Vector3().setFromSpherical(s),420)}
  function cubeSync(v){const q=v.camera.quaternion.clone().invert(),e=new THREE.Euler().setFromQuaternion(q,'XYZ');v.cubeBox.style.transform=`rotateX(${THREE.MathUtils.radToDeg(e.x)}deg) rotateY(${THREE.MathUtils.radToDeg(e.y)}deg) rotateZ(${THREE.MathUtils.radToDeg(e.z)}deg)`}
  function buildCube(v){
    const w=document.createElement('div');w.className='cad-v3-cube';const box=document.createElement('div');box.className='cad-v3-box';
    [['front','FRONT'],['back','BACK'],['right','RIGHT'],['left','LEFT'],['top','TOP'],['bottom','BOTTOM']].forEach(([n,t])=>{const b=document.createElement('button');b.type='button';b.className='cad-v3-face cad-v3-'+n;b.textContent=t;b.onclick=e=>{e.stopPropagation();const d={front:[0,0,1],back:[0,0,-1],right:[1,0,0],left:[-1,0,0],top:[0,1,0],bottom:[0,-1,0]}[n];tween(v,new THREE.Vector3(...d))};box.appendChild(b)});w.appendChild(box);
    const add=(cls,svg,label,fn)=>{const b=document.createElement('button');b.type='button';b.className='cad-v3-arrow '+cls;b.innerHTML=ico(svg);b.title=label;b.setAttribute('aria-label',label);b.onclick=e=>{e.stopPropagation();fn()};w.appendChild(b)};
    add('cad-v3-a-up','up','Rotate up',()=>orbit(v,0,-Math.PI/2));add('cad-v3-a-down','down','Rotate down',()=>orbit(v,0,Math.PI/2));add('cad-v3-a-left','left','Rotate left',()=>orbit(v,Math.PI/2,0));add('cad-v3-a-right','right','Rotate right',()=>orbit(v,-Math.PI/2,0));add('cad-v3-a-cw','cw','Rotate clockwise',()=>orbit(v,-Math.PI/2,0));add('cad-v3-a-ccw','ccw','Rotate counterclockwise',()=>orbit(v,Math.PI/2,0));
    const h=document.createElement('button');h.type='button';h.className='cad-v3-home';h.innerHTML=ico('home');h.title='Home / fit';h.setAttribute('aria-label','Home / fit');h.onclick=e=>{e.stopPropagation();tween(v,v.homePosition.clone().sub(v.homeTarget))};w.appendChild(h);
    v.cubeBox=box;v.container.appendChild(w)
  }
  function buildUI(v){
    const ui=document.createElement('div');ui.className='cad-v3-ui';const tb=document.createElement('div');tb.className='cad-v3-toolbar';
    const lb=document.createElement('button');lb.type='button';lb.className='cad-v3-btn';lb.innerHTML=ico('layers');lb.title='Model layers';lb.setAttribute('aria-label','Model layers');
    const fb=document.createElement('button');fb.type='button';fb.className='cad-v3-btn';fb.innerHTML=ico('expand');fb.title='Fullscreen';fb.setAttribute('aria-label','Fullscreen');tb.append(lb,fb);ui.appendChild(tb);
    const menu=document.createElement('div');menu.className='cad-v3-layers';menu.innerHTML='<h4>Model layers</h4>';
    v.cfg.forEach(c=>{const l=document.createElement('label'),i=document.createElement('input');i.type='checkbox';i.checked=c.visible!==false;i.onchange=()=>{c.visible=i.checked;if(v.bodies[c.id])v.bodies[c.id].visible=i.checked};l.append(i,document.createTextNode(c.name||String(c.path).split('/').pop().replace(/\.glb$/i,'')));menu.appendChild(l)});ui.appendChild(menu);
    lb.onclick=e=>{e.stopPropagation();menu.classList.toggle('open')};document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!lb.contains(e.target))menu.classList.remove('open')});
    fb.onclick=e=>{e.stopPropagation();full(v)};v.full=fb;
    const a=document.createElement('div');a.className='cad-v3-activate';a.innerHTML='<span>Click to Interact</span>';a.onclick=e=>{e.stopPropagation();a.classList.add('hidden');v.controls.enabled=true};ui.appendChild(a);v.activate=a;
    v.container.appendChild(ui);buildCube(v)
  }
  async function full(v){try{if(document.fullscreenElement===v.container)await document.exitFullscreen?.();else if(v.container.requestFullscreen)await v.container.requestFullscreen();else v.container.classList.toggle('cad-v3-force-fullscreen')}catch(e){v.container.classList.toggle('cad-v3-force-fullscreen')}setTimeout(()=>resize(v),100)}
  function appearance(root,cfg){const n=String(cfg.name||'').toLowerCase();root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const on=String(o.name||'').toLowerCase(),mn=String(o.material?.name||'').toLowerCase();if(on.includes('silk')||mn.includes('silk')){o.material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.72});return}if(o.material?.clone)o.material=o.material.clone();const m=o.material;if(!m?.color)return;const white=m.color.r>.94&&m.color.g>.94&&m.color.b>.94;if(white){if(n.includes('cover'))m.color.setHex(0x6d7379);else if(n.includes('lower'))m.color.setHex(0x898e93);else if(on.includes('pcb')||on.includes('board')||mn.includes('pcb'))m.color.setHex(0x1f6b45);else m.color.setHex(0x555b61)}if('roughness'in m)m.roughness=.48;if('metalness'in m)m.metalness=.03})}
  function fit(v){v.group.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(v.group);b.getCenter(v.center);b.getSize(v.size);const max=Math.max(v.size.x,v.size.y,v.size.z,.001),dist=Math.max((max*.5)/Math.tan(THREE.MathUtils.degToRad(v.camera.fov)*.5)*1.03,max*.72,.1);v.camera.position.set(v.center.x,v.center.y+dist,v.center.z);v.camera.up.set(0,0,-1);v.camera.lookAt(v.center);v.homePosition=v.camera.position.clone();v.homeTarget=v.center.clone();v.controls.target.copy(v.center);v.controls.minDistance=max*.035;v.controls.maxDistance=max*20;v.camera.near=Math.max(max/10000,.001);v.camera.far=Math.max(max*1000,1000);v.camera.updateProjectionMatrix();v.controls.update()}
  function initGLBViewer(id,bodies){
    addStyle();const c=document.getElementById(id);if(!c||!Array.isArray(bodies)||!bodies.length)return;const old=instances.get(c);if(old)destroy(old);c.innerHTML='';c.classList.add('cad-v3');
    const w=c.clientWidth||800,h=c.clientHeight||576,scene=new THREE.Scene();scene.background=new THREE.Color(0xf3f3f2);const camera=new THREE.PerspectiveCamera(45,w/h,.001,10000);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.outputEncoding=THREE.sRGBEncoding;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(w,h,false);renderer.domElement.className='cad-v3-canvas';c.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x74787c,1.75));const key=new THREE.DirectionalLight(0xffffff,1.35);key.position.set(5,8,7);scene.add(key);const fill=new THREE.DirectionalLight(0xdfe3e7,.65);fill.position.set(-5,3,-4);scene.add(fill);
    const group=new THREE.Group();group.rotation.x=-Math.PI/2;scene.add(group);const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.enableRotate=true;controls.enableZoom=true;controls.enablePan=true;controls.screenSpacePanning=false;controls.rotateSpeed=.78;controls.zoomSpeed=.9;controls.panSpeed=.72;controls.minPolarAngle=.002;controls.maxPolarAngle=Math.PI-.002;controls.minDistance=.01;controls.maxDistance=10000;
    const v={container:c,scene,camera,renderer,controls,group,cfg:bodies.map(x=>({...x})),bodies:{},center:new THREE.Vector3(),size:new THREE.Vector3(),visible:true,tween:0,frame:0};instances.set(c,v);buildUI(v);
    const load=document.createElement('div');load.className='cad-v3-load';load.innerHTML='LOADING 3D CAD MODEL<i><b></b></i>';c.appendChild(load);const bar=load.querySelector('b');let done=0,good=0;const loader=new THREE.GLTFLoader();loader.crossOrigin='anonymous';
    const finish=()=>{done++;bar.style.width=(done/v.cfg.length*100)+'%';if(done<v.cfg.length)return;if(!good){load.className='cad-v3-error';load.innerHTML='3D CAD MODEL COULD NOT BE LOADED<button>Retry</button>';load.querySelector('button').onclick=()=>initGLBViewer(id,bodies);return}fit(v);load.remove();resize(v)};
    v.cfg.forEach(cfg=>{const ok=g=>{const root=g.scene;root.name=cfg.name||cfg.id;root.visible=cfg.visible!==false;appearance(root,cfg);v.bodies[cfg.id]=root;group.add(root);good++;finish()};const fail=()=>{if(cfg.fallbackUrl&&cfg.fallbackUrl!==cfg.path)loader.load(cfg.fallbackUrl,ok,undefined,finish);else finish()};loader.load(cfg.path,ok,p=>{if(p.total)bar.style.width=Math.max(parseFloat(bar.style.width)||0,(p.loaded/p.total*100)/v.cfg.length)+'%'},fail)});
    buildObservers(v);animate(v)
  }
  function buildObservers(v){const ro=new ResizeObserver(()=>requestAnimationFrame(()=>resize(v)));ro.observe(v.container);v.ro=ro;v.io=new IntersectionObserver(es=>{v.visible=es.some(e=>e.isIntersecting)},{threshold:0});v.io.observe(v.container);v.onfs=()=>{resize(v);v.full.innerHTML=ico(document.fullscreenElement===v.container?'shrink':'expand')};document.addEventListener('fullscreenchange',v.onfs);v.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault()},false);v.renderer.domElement.addEventListener('webglcontextrestored',()=>resize(v),false)}
  function animate(v){if(!instances.has(v.container))return;v.frame=requestAnimationFrame(()=>animate(v));if(v.visible!==false){v.controls.update();v.renderer.render(v.scene,v.camera);cubeSync(v)}}
  function destroy(v){cancelAnimationFrame(v.frame);cancelAnimationFrame(v.tween);v.ro?.disconnect();v.io?.disconnect();document.removeEventListener('fullscreenchange',v.onfs);Object.values(v.bodies).forEach(dispose);v.renderer?.dispose();v.container.innerHTML='';instances.delete(v.container)}
  window.initGLBViewer=initGLBViewer;
  window.__cadViewerV3={get:c=>instances.get(c),destroy};
})();