/* CAD viewer stabilization layer.
 * Uses Three.js OrbitControls (not TrackballControls) so the camera orbits a
 * fixed CAD pivot without roll/tumbling, and keeps the viewer UI inside the
 * actual viewer bounds at every size/fullscreen state.
 */
(function(){
  'use strict';
  const STYLE_ID='cad-viewer-stable-css';
  const installed=new WeakSet();
  const animations=new WeakMap();
  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=`
      [id$="ViewerContainer"]{position:relative;overflow:hidden;}
      [id$="ViewerContainer"] > canvas{display:block;max-width:none!important;}
      .cad-stable-ui{position:absolute;inset:0;z-index:100;pointer-events:none;font-family:Arial,Helvetica,sans-serif;}
      .cad-stable-toolbar{position:absolute;top:10px;right:10px;display:flex;gap:6px;z-index:120;pointer-events:auto;}
      .cad-stable-toolbar button{width:34px;height:34px;border:1px solid #c8c8c6;background:rgba(255,255,255,.97);color:#151515;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.16);}
      .cad-stable-toolbar button:hover{background:#fff;border-color:#777;}
      .cad-stable-toolbar svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
      .cad-stable-layers{position:absolute;top:50px;right:10px;width:230px;max-width:calc(100% - 20px);background:#101012;border:1px solid #3a3a3c;color:#ddd;padding:7px;display:none;box-shadow:0 12px 28px rgba(0,0,0,.35);z-index:130;pointer-events:auto;}
      .cad-stable-layers.open{display:block;}
      .cad-stable-layers .cad-layer-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:5px 6px 7px;border-bottom:1px solid #28282a;margin-bottom:3px;}
      .cad-stable-layers label{display:flex;align-items:center;gap:8px;padding:7px;font-size:11px;color:#bbb;cursor:pointer;}
      .cad-stable-layers label:hover{background:#19191b;color:#fff;}
      .cad-stable-layers input{accent-color:#111;}
      .cad-stable-shield{position:absolute;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;pointer-events:auto;background:transparent;}
      .cad-stable-shield.hidden{display:none;}
      .cad-stable-shield span{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(80,80,80,.3);background:rgba(255,255,255,.92);color:#555;font:10px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 1px 3px rgba(0,0,0,.12);}
      .cad-stable-shield svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
      .cad-stable-cube-arrows{position:absolute;left:-38px;top:-38px;width:180px;height:180px;pointer-events:none;z-index:10;}
      .cad-stable-cube-arrows button{position:absolute;border:0;background:transparent;padding:0;pointer-events:auto;cursor:pointer;}
      .cad-stable-cube-arrows svg{width:100%;height:100%;overflow:visible;}
      .cad-stable-cube-arrows path{fill:none;stroke:#9a9a98;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
      .cad-stable-cube-arrows button:hover path{stroke:#4e4e4c;}
      .cad-arrow-rotate-h{right:1px;top:1px;width:76px;height:46px;}
      .cad-arrow-rotate-v{right:0;bottom:0;width:46px;height:76px;}
      .cad-arrow-nudge{width:20px;height:20px;}
      .cad-arrow-left{left:0;top:80px;}.cad-arrow-right{right:0;top:80px;}.cad-arrow-up{left:80px;top:0;}.cad-arrow-down{left:80px;bottom:0;}
      .cad-stable-fullscreen{position:fixed!important;left:0!important;top:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100vh!important;z-index:99999!important;background:#f3f3f2!important;}
      .cad-stable-fullscreen .cad-stable-toolbar{top:14px;right:14px;}.cad-stable-fullscreen .cad-stable-layers{top:54px;right:14px;}
    `;
    document.head.appendChild(s);
  }
  function icon(type){
    const m={
      layers:'<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
      expand:'<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/><path d="m3 8 5-5M16 3l5 5M3 16l5 5M21 16l-5 5"/></svg>',
      shrink:'<svg viewBox="0 0 24 24"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M21 15h-6v6"/></svg>',
      mouse:'<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v6a6 6 0 0 0 12 0V9a6 6 0 0 0-6-6Z"/><path d="M12 3v7M9 7h6"/></svg>'
    }; return m[type]||'';
  }
  function getCamera(c){return c.__cadCamera||window.__lastCadCamera||null;}
  function getControls(c){return c.__cadControls||window.__lastCadControls||null;}
  function fitCanvas(c,camera){
    if(!camera)return; const r=c.getBoundingClientRect(); if(r.width<2||r.height<2)return;
    if('aspect' in camera){camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
    const canvas=c.querySelector('canvas'); if(canvas){canvas.style.width='100%';canvas.style.height='100%';canvas.style.display='block';}
    const renderer=c.__cadRenderer||window.__lastCadRenderer;
    if(renderer&&renderer.setSize){renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(Math.max(1,Math.round(r.width)),Math.max(1,Math.round(r.height)),false);}
  }
  function stabilize(c){
    const controls=getControls(c),camera=getCamera(c); if(!controls||!camera)return;
    c.__cadControls=controls;c.__cadCamera=camera;
    controls.enableRotate=true;controls.enableZoom=true;controls.enablePan=true;controls.enableDamping=true;
    controls.dampingFactor=.075;controls.rotateSpeed=.85;controls.zoomSpeed=.9;controls.panSpeed=.8;controls.screenSpacePanning=true;
    controls.minPolarAngle=.001;controls.maxPolarAngle=Math.PI-.001;controls.minDistance=.01;controls.maxDistance=Infinity;
    if(controls.target)camera.userData.modelCenter=controls.target.clone(); controls.update(); fitCanvas(c,camera);
  }
  function replaceTrackball(c){
    const old=getControls(c),camera=getCamera(c); if(!old||!camera||!window.THREE||!THREE.OrbitControls)return;
    const name=old.constructor&&old.constructor.name||'';
    if(name==='TrackballControls'||old.__cadTrackball){
      const dom=old.domElement||c.querySelector('canvas'),target=old.target?old.target.clone():new THREE.Vector3(),pos=camera.position.clone();
      try{old.dispose();}catch(e){}
      const next=new THREE.OrbitControls(camera,dom);next.target.copy(target);camera.position.copy(pos);next.update();
      c.__cadControls=next;window.__lastCadControls=next;return next;
    }
    return old;
  }
  function makeOrbitIntercept(){
    if(!window.THREE||!THREE.OrbitControls||window.__cadOrbitStableWrapped)return;
    const Native=THREE.OrbitControls;
    function StableOrbit(camera,dom){const x=new Native(camera,dom);x.enableDamping=true;x.dampingFactor=.075;x.minPolarAngle=.001;x.maxPolarAngle=Math.PI-.001;x.screenSpacePanning=true;x.rotateSpeed=.85;x.zoomSpeed=.9;x.panSpeed=.8;x.minDistance=.01;x.maxDistance=Infinity;return x;}
    StableOrbit.prototype=Native.prototype;THREE.OrbitControls=StableOrbit;window.__cadOrbitStableWrapped=true;
  }
  function positionCube(cube){cube.style.position='absolute';cube.style.top='12px';cube.style.right='12px';cube.style.zIndex='110';cube.style.width='104px';cube.style.height='104px';}
  function animateOrbit(c,az,el){
    const camera=getCamera(c),controls=getControls(c);if(!camera||!controls)return;const target=controls.target.clone();const off=camera.position.clone().sub(target);const s0=new THREE.Spherical().setFromVector3(off);const s1=new THREE.Spherical(s0.radius,Math.max(.001,Math.min(Math.PI-.001,el==null?s0.phi:el)),az==null?s0.theta:az);const start=performance.now();
    const prev=animations.get(c);if(prev)cancelAnimationFrame(prev);function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}function tick(now){const p=Math.min(1,(now-start)/520),e=ease(p),s=new THREE.Spherical(s0.radius,s0.phi+(s1.phi-s0.phi)*e,s0.theta+(s1.theta-s0.theta)*e);camera.position.setFromSpherical(s).add(target);controls.target.copy(target);controls.update();if(p<1)animations.set(c,requestAnimationFrame(tick));else animations.delete(c);}animations.set(c,requestAnimationFrame(tick));
  }
  function addCubeArrows(cube,c){
    if(cube.querySelector('.cad-stable-cube-arrows'))return;positionCube(cube);const root=document.createElement('div');root.className='cad-stable-cube-arrows';root.innerHTML=`<button class="cad-arrow-rotate-h" aria-label="Rotate clockwise"><svg viewBox="0 0 76 46"><path d="M7 33C15 10 39 2 58 10c8 3 12 8 14 15"/><path d="m72 25-9-1m9 1-3-8"/></svg></button><button class="cad-arrow-rotate-v" aria-label="Rotate vertically"><svg viewBox="0 0 46 76"><path d="M12 7c24 9 32 31 23 51-3 7-8 12-15 16"/><path d="m20 74 1-9m-1 9 8-4"/></svg></button><button class="cad-arrow-nudge cad-arrow-left" aria-label="Rotate left"><svg viewBox="0 0 20 20"><path d="M3 10 14 2v16L3 10Z"/></svg></button><button class="cad-arrow-nudge cad-arrow-right" aria-label="Rotate right"><svg viewBox="0 0 20 20"><path d="m17 10-11 8V2l11 8Z"/></svg></button><button class="cad-arrow-nudge cad-arrow-up" aria-label="Rotate up"><svg viewBox="0 0 20 20"><path d="m10 3 8 11H2L10 3Z"/></svg></button><button class="cad-arrow-nudge cad-arrow-down" aria-label="Rotate down"><svg viewBox="0 0 20 20"><path d="M10 17 2 6h16l-8 11Z"/></svg></button>`;cube.appendChild(root);
    const getS=()=>{const controls=getControls(c),camera=getCamera(c),target=controls?controls.target.clone():new THREE.Vector3();return new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));};
    root.querySelector('.cad-arrow-left').onclick=e=>{e.stopPropagation();const s=getS();animateOrbit(c,s.theta+Math.PI/2,s.phi);};
    root.querySelector('.cad-arrow-right').onclick=e=>{e.stopPropagation();const s=getS();animateOrbit(c,s.theta-Math.PI/2,s.phi);};
    root.querySelector('.cad-arrow-up').onclick=e=>{e.stopPropagation();const s=getS();animateOrbit(c,s.theta,Math.max(.001,s.phi-Math.PI/2));};
    root.querySelector('.cad-arrow-down').onclick=e=>{e.stopPropagation();const s=getS();animateOrbit(c,s.theta,Math.min(Math.PI-.001,s.phi+Math.PI/2));};
    root.querySelector('.cad-arrow-rotate-h').onclick=e=>{e.stopPropagation();const s=getS();animateOrbit(c,s.theta-Math.PI/2,s.phi);};
    root.querySelector('.cad-arrow-rotate-v').onclick=e=>{e.stopPropagation();const s=getS();animateOrbit(c,s.theta,Math.max(.001,s.phi-Math.PI/2));};
  }
  function setup(c){
    if(!c||installed.has(c))return;installed.add(c);addStyle();
    c.querySelectorAll('button[id^="layerToggleBtn-"]').forEach(b=>b.style.display='none');
    c.querySelectorAll('button[onclick*="toggle3DViewerFullscreen"],button[title="Fullscreen"]').forEach(b=>{if(!b.closest('.cad-stable-ui'))b.style.display='none';});
    c.querySelectorAll('.click-to-interact-overlay').forEach(x=>x.remove());
    c.querySelectorAll('.cad-ui-root,.cad-cube-arrows,.cad-cube-nudge').forEach(x=>x.remove());
    const ui=document.createElement('div');ui.className='cad-stable-ui';const toolbar=document.createElement('div');toolbar.className='cad-stable-toolbar';
    const layers=document.createElement('button');layers.type='button';layers.title='Model layers';layers.setAttribute('aria-label','Model layers');layers.innerHTML=icon('layers');
    const full=document.createElement('button');full.type='button';full.title='Fullscreen';full.setAttribute('aria-label','Fullscreen');full.innerHTML=icon('expand');toolbar.append(layers,full);
    const menu=document.createElement('div');menu.className='cad-stable-layers';menu.innerHTML='<div class="cad-layer-title">Model layers</div><div class="cad-layer-body"></div>';ui.append(toolbar,menu);c.appendChild(ui);
    const oldLayer=c.querySelector('[id^="layerDropdown-"]');if(oldLayer){oldLayer.classList.remove('hidden');oldLayer.style.cssText='display:block;position:static;width:100%;margin:0;box-shadow:none;background:transparent;border:0;padding:0;';menu.querySelector('.cad-layer-body').appendChild(oldLayer);}
    layers.addEventListener('click',e=>{e.stopPropagation();menu.classList.toggle('open');});document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==layers)menu.classList.remove('open');},{passive:true});
    const shield=document.createElement('div');shield.className='cad-stable-shield';shield.innerHTML='<span>'+icon('mouse')+' Click to Interact</span>';c.appendChild(shield);shield.addEventListener('click',e=>{e.stopPropagation();shield.classList.add('hidden');},{once:true});
    async function toggleFullscreen(){try{if(document.fullscreenElement===c)await document.exitFullscreen();else if(document.fullscreenElement){await document.exitFullscreen();await c.requestFullscreen();}else if(c.requestFullscreen)await c.requestFullscreen();else c.classList.toggle('cad-stable-fullscreen');}catch(e){c.classList.toggle('cad-stable-fullscreen');}setTimeout(()=>fitCanvas(c,getCamera(c)),60);}
    full.addEventListener('click',e=>{e.stopPropagation();toggleFullscreen();});
    document.addEventListener('fullscreenchange',()=>{const active=document.fullscreenElement===c||c.classList.contains('cad-stable-fullscreen');full.innerHTML=icon(active?'shrink':'expand');full.title=active?'Exit fullscreen':'Fullscreen';full.setAttribute('aria-label',full.title);setTimeout(()=>fitCanvas(c,getCamera(c)),80);});
    const cube=c.querySelector('div[style*="width: 104px"]');if(cube){positionCube(cube);addCubeArrows(cube,c);}
    replaceTrackball(c);stabilize(c);
    if(window.ResizeObserver){const ro=new ResizeObserver(()=>requestAnimationFrame(()=>{fitCanvas(c,getCamera(c));const q=c.querySelector('div[style*="width: 104px"]');if(q)positionCube(q);}));ro.observe(c);c.__cadResizeObserver=ro;}
    let tries=0;const wait=setInterval(()=>{tries++;replaceTrackball(c);stabilize(c);const q=c.querySelector('div[style*="width: 104px"]');if(q){positionCube(q);if(!q.querySelector('.cad-stable-cube-arrows'))addCubeArrows(q,c);}if((getControls(c)&&getCamera(c))||tries>80)clearInterval(wait);},100);
  }
  function scan(){if(!window.THREE)return;makeOrbitIntercept();document.querySelectorAll('[id$="ViewerContainer"]').forEach(setup);}
  addStyle();scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('resize',scan,{passive:true});
})();
