/* Canonical CAD viewer controller for the portfolio.
 * One implementation only: GLB/STL loading, orbit camera, ViewCube,
 * arrows, layers, click-to-interact shield, fullscreen, resize and cleanup.
 * Designed to sit on top of the existing classic Three.js globals.
 */
(function () {
  'use strict';
  if (!window.THREE || !THREE.OrbitControls) return;

  const states = new Map();
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getRegistry = () => (typeof viewer3DInstances !== 'undefined' ? viewer3DInstances : (window.viewer3DInstances || {}));
  const ICON = {
    layers:'<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
    expand:'<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/><path d="m3 8 5-5M16 3l5 5M3 16l5 5M21 16l-5 5"/></svg>',
    shrink:'<svg viewBox="0 0 24 24"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M21 15h-6v6"/></svg>',
    mouse:'<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v6a6 6 0 0 0 12 0V9a6 6 0 0 0-6-6Z"/><path d="M12 3v7M9 7h6"/></svg>'
  };

  function injectCss(){
    if(document.getElementById('canonical-cad-viewer-css')) return;
    const s=document.createElement('style'); s.id='canonical-cad-viewer-css';
    s.textContent=`
      .cadv-root{position:absolute!important;inset:0!important;z-index:100!important;font-family:Arial,Helvetica,sans-serif;pointer-events:none}
      .cadv-toolbar{position:absolute;right:10px;top:10px;display:flex;gap:6px;z-index:400;pointer-events:auto}
      .cadv-btn{width:34px;height:34px;padding:0;border:1px solid #c7c7c5;background:rgba(255,255,255,.97);color:#181818;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.16)}
      .cadv-btn:hover{background:#fff;border-color:#777}.cadv-btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .cadv-layers{position:absolute;right:94px;top:50px;width:230px;max-height:min(420px,calc(100% - 70px));overflow:auto;padding:7px;background:#101012;border:1px solid #3b3b3d;box-shadow:0 14px 32px rgba(0,0,0,.42);display:none;z-index:410;pointer-events:auto;color:#bbb}
      .cadv-layers.open{display:block}.cadv-layer-title{font:10px Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:5px 6px 8px;border-bottom:1px solid #29292b;margin-bottom:3px}
      .cadv-layers label{display:flex;align-items:center;gap:8px;padding:7px 6px;font-size:11px;cursor:pointer}.cadv-layers label:hover{background:#19191b;color:#fff}.cadv-layers input{accent-color:#111}
      .cadv-shield{position:absolute;inset:0;z-index:300;pointer-events:auto;background:rgba(0,0,0,.86);display:flex;align-items:center;justify-content:center;color:#fff}
      .cadv-shield.hidden{display:none}.cadv-shield button{border:1px solid #666;background:#111;color:#fff;padding:10px 14px;font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;display:flex;gap:8px;align-items:center;cursor:pointer}.cadv-shield button:hover{background:#1b1b1b;border-color:#aaa}.cadv-shield svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .cadv-nav{position:absolute;right:7px;top:58px;width:190px;height:190px;z-index:350;pointer-events:none}
      .cadv-cube{position:absolute;left:39px;top:39px;width:112px;height:112px;pointer-events:auto;filter:drop-shadow(0 2px 3px rgba(0,0,0,.16))}
      .cadv-cube canvas{display:block;width:112px;height:112px;cursor:pointer}
      .cadv-arrow{position:absolute;width:28px;height:28px;border:1px solid #c7c7c5;background:rgba(255,255,255,.94);color:#666;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;pointer-events:auto;box-shadow:0 1px 3px rgba(0,0,0,.12);font:20px Arial,sans-serif}
      .cadv-arrow:hover{color:#111;background:#fff;border-color:#777}.cadv-arrow svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .cadv-l{left:0;top:81px}.cadv-r{right:0;top:81px}.cadv-u{left:81px;top:0}.cadv-d{left:81px;bottom:0}
      .cadv-roll{position:absolute;left:7px;top:7px;width:28px;height:28px}.cadv-roll-r{right:7px;top:7px;left:auto}.cadv-roll button{width:28px;height:28px}
      [id$="ViewerContainer"]:fullscreen{background:#f3f3f2!important}[id$="ViewerContainer"]:fullscreen .cadv-toolbar{top:14px;right:14px}[id$="ViewerContainer"]:fullscreen .cadv-nav{right:11px;top:66px}
      [id$="ViewerContainer"]>canvas{touch-action:none!important}
      @media(max-width:700px){.cadv-nav{transform:scale(.88);transform-origin:top right}.cadv-layers{right:84px;width:215px}.cadv-btn{width:32px;height:32px}}
    `;
    document.head.appendChild(s);
  }

  function disposeObject(root){
    if(!root) return;
    root.traverse?.(o=>{
      o.geometry?.dispose?.();
      if(o.material){
        const mats=Array.isArray(o.material)?o.material:[o.material];
        mats.forEach(m=>{m.map?.dispose?.();m.normalMap?.dispose?.();m.roughnessMap?.dispose?.();m.metalnessMap?.dispose?.();m.dispose?.()});
      }
    });
  }

  function modelBounds(state){
    const box=new THREE.Box3(); let found=false;
    Object.values(state.bodies||{}).forEach(o=>{if(o?.visible){const b=new THREE.Box3().setFromObject(o);if(!b.isEmpty()){box.union(b);found=true}}});
    return found?box:null;
  }

  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function tweenCamera(state,destination,target,up){
    const {camera,controls}=state;if(!camera||!controls)return;
    if(state.tween)cancelAnimationFrame(state.tween);
    const startPos=camera.position.clone(),startTarget=controls.target.clone(),startUp=camera.up.clone();
    const duration=reduced()?1:480,start=performance.now();controls.enabled=false;
    const tick=now=>{const p=Math.min(1,(now-start)/duration),e=ease(p);camera.position.lerpVectors(startPos,destination,e);controls.target.lerpVectors(startTarget,target,e);camera.up.lerpVectors(startUp,up,e).normalize();camera.lookAt(controls.target);controls.update();if(p<1)state.tween=requestAnimationFrame(tick);else{camera.position.copy(destination);controls.target.copy(target);camera.up.copy(up).normalize();camera.lookAt(target);controls.enabled=true;controls.update();state.tween=null}};
    state.tween=requestAnimationFrame(tick);
  }

  function uprightForDirection(dir){
    const d=dir.clone().normalize();let up=new THREE.Vector3(0,1,0);
    if(Math.abs(d.dot(up))>.94) up.set(0,0,-1);
    up.sub(d.clone().multiplyScalar(up.dot(d))).normalize();return up;
  }

  function goDirection(state,dir,rollUp){
    const target=state.target.clone();const distance=Math.max(state.camera.position.distanceTo(target),state.homeDistance||1);const d=dir.clone().normalize();
    tweenCamera(state,target.clone().add(d.multiplyScalar(distance)),target,rollUp||uprightForDirection(d));
  }

  function orbitStep(state,theta,phi){
    const {camera,controls}=state;if(!camera||!controls)return;const target=controls.target.clone();const sph=new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    sph.theta+=theta;sph.phi=THREE.MathUtils.clamp(sph.phi+phi,.00001,Math.PI-.00001);
    const destination=new THREE.Vector3().setFromSpherical(sph).add(target);tweenCamera(state,destination,target,camera.up.clone());
  }

  function rollStep(state,angle){
    const {camera,controls}=state;if(!camera||!controls)return;const axis=camera.getWorldDirection(new THREE.Vector3()).normalize();
    const up=camera.up.clone().applyAxisAngle(axis,angle).normalize();tweenCamera(state,camera.position.clone(),controls.target.clone(),up);
  }

  function makeCube(state){
    const wrap=document.createElement('div');wrap.className='cadv-cube';
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(112,112,false);wrap.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),cam=new THREE.OrthographicCamera(-1.8,1.8,1.8,-1.8,.1,10);cam.position.set(0,0,4);scene.add(new THREE.AmbientLight(0xffffff,1.2));
    const cube=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),[0,1,2,3,4,5].map(()=>new THREE.MeshBasicMaterial({color:0xe7e7e5})));
    scene.add(cube);
    const dirs=[new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)];
    const hits=[];const addHit=(dir,size,pos,kind)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));m.position.copy(pos);m.userData.dir=dir.clone().normalize();m.userData.kind=kind;scene.add(m);hits.push(m)};
    const edge=.34,long=1.55,inset=.91;
    [-1,1].forEach(y=>[-1,1].forEach(z=>addHit(new THREE.Vector3(0,y,z),[long,edge,edge],new THREE.Vector3(0,y*inset,z*inset),'edge')));
    [-1,1].forEach(x=>[-1,1].forEach(z=>addHit(new THREE.Vector3(x,0,z),[edge,long,edge],new THREE.Vector3(x*inset,0,z*inset),'edge')));
    [-1,1].forEach(x=>[-1,1].forEach(y=>addHit(new THREE.Vector3(x,y,0),[edge,edge,long],new THREE.Vector3(x*inset,y*inset,0),'edge')));
    [-1,1].forEach(x=>[-1,1].forEach(y=>[-1,1].forEach(z=>addHit(new THREE.Vector3(x,y,z),[.44,.44,.44],new THREE.Vector3(x*inset,y*inset,z*inset),'corner'))));
    const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
    const pick=e=>{const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,cam);const ex=ray.intersectObjects(hits,false)[0];if(ex)return ex.object;const f=ray.intersectObject(cube,false)[0];if(f)return {userData:{dir:dirs[f.face.materialIndex]}};return null};
    renderer.domElement.addEventListener('click',e=>{const h=pick(e);if(h)goDirection(state,h.userData.dir.clone(),uprightForDirection(h.userData.dir))});
    state.cubeRenderer=renderer;state.cubeScene=scene;state.cubeCamera=cam;state.renderCube=()=>{scene.quaternion.copy(state.camera.quaternion).invert();renderer.render(scene,cam)};
    return wrap;
  }

  function buildUi(state){
    const c=state.container;if(c.querySelector('.cadv-root'))return;
    const root=document.createElement('div');root.className='cadv-root';
    const toolbar=document.createElement('div');toolbar.className='cadv-toolbar';
    const filter=document.createElement('button');filter.className='cadv-btn';filter.type='button';filter.title='Model layers';filter.setAttribute('aria-label','Model layers');filter.innerHTML=ICON.layers;
    const full=document.createElement('button');full.className='cadv-btn';full.type='button';full.title='Fullscreen';full.setAttribute('aria-label','Fullscreen');full.innerHTML=ICON.expand;toolbar.append(filter,full);
    const menu=document.createElement('div');menu.className='cadv-layers';menu.innerHTML='<div class="cadv-layer-title">Model layers</div><div class="cadv-layer-content"></div>';
    const shield=document.createElement('div');shield.className='cadv-shield';shield.innerHTML='<button type="button">'+ICON.mouse+' Click to Interact</button>';
    const nav=document.createElement('div');nav.className='cadv-nav';
    nav.innerHTML='<button class="cadv-arrow cadv-l" aria-label="Orbit left">‹</button><button class="cadv-arrow cadv-r" aria-label="Orbit right">›</button><button class="cadv-arrow cadv-u" aria-label="Orbit up">⌃</button><button class="cadv-arrow cadv-d" aria-label="Orbit down">⌄</button><div class="cadv-roll cadv-roll-l"><button class="cadv-arrow" aria-label="Roll counter-clockwise">↺</button></div><div class="cadv-roll cadv-roll-r"><button class="cadv-arrow" aria-label="Roll clockwise">↻</button></div>';
    root.append(toolbar,menu,nav,shield);c.appendChild(root);state.ui={root,filter,full,menu,shield,nav,layerContent:menu.querySelector('.cadv-layer-content')};
    filter.addEventListener('click',e=>{e.stopPropagation();menu.classList.toggle('open');renderLayers(state)});
    full.addEventListener('click',e=>{e.stopPropagation();toggleFullscreen(state)});
    shield.querySelector('button').addEventListener('click',e=>{e.stopPropagation();activate(state)});
    nav.querySelector('.cadv-l').onclick=e=>{e.stopPropagation();orbitStep(state,Math.PI/8,0)};
    nav.querySelector('.cadv-r').onclick=e=>{e.stopPropagation();orbitStep(state,-Math.PI/8,0)};
    nav.querySelector('.cadv-u').onclick=e=>{e.stopPropagation();orbitStep(state,0,-Math.PI/12)};
    nav.querySelector('.cadv-d').onclick=e=>{e.stopPropagation();orbitStep(state,0,Math.PI/12)};
    nav.querySelector('.cadv-roll-l button').onclick=e=>{e.stopPropagation();rollStep(state,-Math.PI/4)};
    nav.querySelector('.cadv-roll-r button').onclick=e=>{e.stopPropagation();rollStep(state,Math.PI/4)};
    document.addEventListener('click',e=>{if(menu.classList.contains('open')&&!menu.contains(e.target)&&!filter.contains(e.target))menu.classList.remove('open')},{passive:true});
    document.addEventListener('fullscreenchange',()=>syncFullscreen(state));document.addEventListener('webkitfullscreenchange',()=>syncFullscreen(state));
    nav.appendChild(makeCube(state));
    activate(state);
  }

  function activate(state){states.forEach(s=>{if(s.ui?.shield)s.ui.shield.classList.remove('hidden')});state.ui.shield.classList.add('hidden')}
  function syncFullscreen(state){if(!state.ui)return;const active=document.fullscreenElement===state.container||document.webkitFullscreenElement===state.container;state.ui.full.innerHTML=active?ICON.shrink:ICON.expand;state.ui.full.title=active?'Exit fullscreen':'Fullscreen';setTimeout(()=>resize(state),80)}
  async function toggleFullscreen(state){try{const active=document.fullscreenElement||document.webkitFullscreenElement;if(active===state.container){await(document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?.())}else if(state.container.requestFullscreen){await state.container.requestFullscreen({navigationUI:'hide'})}else if(state.container.webkitRequestFullscreen)state.container.webkitRequestFullscreen();else state.container.classList.toggle('viewer-force-fullscreen')}catch(_){state.container.classList.toggle('viewer-force-fullscreen')}setTimeout(()=>resize(state),100)}

  function renderLayers(state){
    const content=state.ui.layerContent;content.innerHTML='';
    state.config.forEach((cfg,i)=>{const label=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=cfg.visible!==false;const name=document.createElement('span');name.textContent=cfg.name||cfg.path?.split('/').pop()||`Body ${i+1}`;label.append(cb,name);content.append(label);cb.addEventListener('change',()=>{cfg.visible=cb.checked;const o=state.bodies[cfg.id];if(o)o.visible=cb.checked;frameToVisible(state)})});
  }

  function frameToVisible(state){const box=modelBounds(state);if(!box)return;const target=box.getCenter(new THREE.Vector3());state.target.copy(target);state.controls.target.copy(target);state.camera.userData.modelCenter=target.clone();state.controls.update()}
  function resize(state){if(!state?.container||!state.renderer)return;const w=Math.max(2,state.container.clientWidth),h=Math.max(2,state.container.clientHeight);state.camera.aspect=w/h;state.camera.updateProjectionMatrix();state.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));state.renderer.setSize(w,h,false)}

  function setupCommon(state){
    const c=state.container;c.innerHTML='';c.style.background='#f3f3f2';const w=c.clientWidth||800,h=c.clientHeight||576;
    state.scene=new THREE.Scene();state.scene.background=new THREE.Color(0xf3f3f2);state.camera=new THREE.PerspectiveCamera(45,w/h,.001,100000);state.camera.position.set(0,0,10);state.camera.up.set(0,1,0);
    state.renderer=new THREE.WebGLRenderer({antialias:true});state.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));state.renderer.setSize(w,h,false);state.renderer.outputEncoding=THREE.sRGBEncoding;c.appendChild(state.renderer.domElement);
    state.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();state.contextLost=true},{passive:false});state.renderer.domElement.addEventListener('webglcontextrestored',()=>{state.contextLost=false;state.renderer.render(state.scene,state.camera)});
    state.scene.add(new THREE.HemisphereLight(0xffffff,0x555a60,1.6));const key=new THREE.DirectionalLight(0xffffff,1.5);key.position.set(4,7,8);state.scene.add(key);const fill=new THREE.DirectionalLight(0xd8dde3,.65);fill.position.set(-5,3,-4);state.scene.add(fill);
    state.controls=new THREE.OrbitControls(state.camera,state.renderer.domElement);Object.assign(state.controls,{enableDamping:true,dampingFactor:.075,enableRotate:true,enablePan:true,enableZoom:true,screenSpacePanning:true,rotateSpeed:.85,zoomSpeed:.9,panSpeed:.8,minPolarAngle:0,maxPolarAngle:Math.PI,minAzimuthAngle:-Infinity,maxAzimuthAngle:Infinity,minDistance:.0001,maxDistance:Infinity});
    state.controls.addEventListener('start',()=>{if(state.tween){cancelAnimationFrame(state.tween);state.tween=null;state.controls.enabled=true}});
    state.group=new THREE.Group();state.scene.add(state.group);state.bodies={};state.target=new THREE.Vector3();state.homeDistance=10;buildUi(state);
  }

  function finishFraming(state){
    const box=modelBounds(state);if(!box)return;state.group.updateMatrixWorld(true);const display=new THREE.Box3().setFromObject(state.group);const size=display.getSize(new THREE.Vector3());const center=display.getCenter(new THREE.Vector3());const maxDim=Math.max(size.x,size.y,size.z,.001);const fov=THREE.MathUtils.degToRad(state.camera.fov);const dist=Math.max((maxDim*.5)/Math.tan(fov*.5)*.82,maxDim*.55,.5);
    state.target.copy(center);state.homeDistance=dist;state.camera.position.copy(center).add(new THREE.Vector3(0,dist,0));state.camera.up.set(0,0,-1);state.camera.lookAt(center);state.controls.target.copy(center);state.controls.minDistance=Math.max(maxDim*.015,.001);state.controls.maxDistance=Math.max(maxDim*20,dist*10);state.camera.userData.modelCenter=center.clone();state.camera.userData.homePosition=state.camera.position.clone();state.camera.userData.homeTarget=center.clone();state.controls.update();state.renderCube?.();
  }

  function applyMaterialPolicy(root,cfg){
    const n=String(cfg.name||'').toLowerCase(),isCover=n.includes('cover'),isLower=n.includes('lower');
    root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.map(m=>{const x=m.clone?m.clone():m;const mn=String(x.name||'').toLowerCase(),on=String(o.name||'').toLowerCase();if(on.includes('silk')||mn.includes('silk')||on.includes('silkscreen')||mn.includes('silkscreen')){x.color?.set(0xffffff);x.roughness=.7;x.metalness=0;return x}if(x.color&&(isCover||isLower)&&x.color.r>.94&&x.color.g>.94&&x.color.b>.94)x.color.setHex(isCover?0x6b7280:0x858b92);return x});if(o.material.length===1)o.material=o.material[0]});
  }

  function loadGLB(state){
    const loader=new THREE.GLTFLoader();loader.crossOrigin='anonymous';let done=0;
    const complete=()=>{done++;if(done===state.config.length)finishFraming(state)};
    state.config.forEach(cfg=>{const loaded=g=>{const root=g.scene||g.scenes?.[0];if(!root)return complete();root.name=cfg.name||cfg.id;root.visible=cfg.visible!==false;applyMaterialPolicy(root,cfg);state.bodies[cfg.id]=root;state.group.add(root);complete()};const fail=()=>{if(cfg.fallbackUrl&&cfg.fallbackUrl!==cfg.path)loader.load(cfg.fallbackUrl,loaded,undefined,complete);else complete()};loader.load(cfg.path,loaded,undefined,fail)});
  }

  function loadSTL(state){
    const loader=new THREE.STLLoader();let done=0;const material=new THREE.MeshStandardMaterial({color:0x6b7280,roughness:.48,metalness:.04});
    state.config.forEach(cfg=>loader.load(cfg.path,geo=>{geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material.clone());mesh.visible=cfg.visible!==false;mesh.name=cfg.name||cfg.id;state.bodies[cfg.id]=mesh;state.group.add(mesh);done++;if(done===state.config.length)finishFraming(state)},undefined,()=>{done++;if(done===state.config.length)finishFraming(state)}));
  }

  function destroyState(state){if(!state)return;cancelAnimationFrame(state.raf);if(state.tween)cancelAnimationFrame(state.tween);state.resizeObserver?.disconnect();disposeObject(state.group);state.cubeRenderer?.dispose?.();state.renderer?.dispose?.();states.delete(state.container)}

  function mount(containerId,config,isGLB){
    const c=document.getElementById(containerId);if(!c||!Array.isArray(config)||!config.length)return;destroyState(states.get(c));
    const state={container:c,config:config.map(x=>({...x,visible:x.visible!==false})),isGLB};states.set(c,state);setupCommon(state);if(isGLB)loadGLB(state);else loadSTL(state);
    state.resizeObserver=new ResizeObserver(()=>resize(state));state.resizeObserver.observe(c);
    const loop=()=>{if(!states.has(c))return;state.raf=requestAnimationFrame(loop);if(!state.contextLost){state.controls.update();state.renderer.render(state.scene,state.camera);state.renderCube?.()}};loop();
  }

  window.initGLBViewer=(id,bodies)=>mount(id,bodies,true);
  window.init3DViewer=(id,bodies)=>mount(id,bodies,false);
  window.toggle3DViewerFullscreen=id=>{const s=states.get(document.getElementById(id));if(s)toggleFullscreen(s)};
  window.toggleLayerDropdown=(e,id)=>{e?.stopPropagation();const s=states.get(document.getElementById(id));if(s)s.ui.menu.classList.toggle('open')};
  window.toggle3DBody=(id,bodyId,visible)=>{const s=states.get(document.getElementById(id));if(!s)return;const cfg=s.config.find(x=>x.id===bodyId);if(cfg)cfg.visible=visible;const o=s.bodies[bodyId];if(o)o.visible=visible;frameToVisible(s)};
  window.__canonicalCadViewerStates=states;
  injectCss();
})();
