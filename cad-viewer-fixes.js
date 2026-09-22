/* Fusion-style CAD viewer integration for the portfolio.
 * Keeps the existing model/layer loader, but fixes navigation/UI around it.
 */
(function () {
  'use strict';

  const TRACKBALL_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TrackballControls.js';
  let trackballPromise = null;

  const css = `
    .cad-ui-root{position:absolute;inset:0;z-index:40;pointer-events:none;font-family:Arial,Helvetica,sans-serif}
    .cad-toolbar{position:absolute;top:10px;right:10px;display:flex;align-items:center;gap:6px;pointer-events:auto;z-index:60}
    .cad-toolbar button{width:32px;height:32px;border:1px solid #c9c9c7;background:rgba(255,255,255,.96);color:#171717;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.14)}
    .cad-toolbar button:hover{background:#fff;border-color:#8f8f8d}
    .cad-toolbar button svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .cad-layer-menu{position:absolute;top:38px;right:38px;width:220px;background:#101012;border:1px solid #3a3a3c;color:#ddd;padding:6px;display:none;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:70;pointer-events:auto}
    .cad-layer-menu.open{display:block}
    .cad-layer-menu .cad-layer-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:6px 7px;border-bottom:1px solid #28282a;margin-bottom:3px}
    .cad-layer-menu label{display:flex;align-items:center;gap:8px;padding:7px;font-size:11px;color:#bbb;cursor:pointer}
    .cad-layer-menu label:hover{background:#19191b;color:#fff}
    .cad-layer-menu input{accent-color:#111}
    .cad-interact-shield{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;pointer-events:auto;background:transparent;cursor:default}
    .cad-interact-shield.hidden{display:none}
    .cad-interact-label{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(80,80,80,.28);background:rgba(255,255,255,.9);color:#555;font:10px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 1px 3px rgba(0,0,0,.12)}
    .cad-cube-arrows{position:absolute;inset:-34px;z-index:50;pointer-events:none}
    .cad-cube-arrow{position:absolute;border:0;background:transparent;padding:0;pointer-events:auto;cursor:pointer;opacity:.82;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))}
    .cad-cube-arrow svg{width:100%;height:100%;overflow:visible}
    .cad-cube-arrow path{fill:none;stroke:#a9aaa8;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .cad-cube-arrow:hover path{stroke:#555654}
    .cad-cube-arrow-top{width:62px;height:38px;right:7px;top:-11px}
    .cad-cube-arrow-right{width:38px;height:62px;right:-12px;top:11px}
    .cad-cube-nudge{position:absolute;width:20px;height:20px;border:0;background:transparent;pointer-events:auto;cursor:pointer;padding:0;opacity:.75}
    .cad-cube-nudge svg{width:100%;height:100%}
    .cad-cube-nudge path{fill:#8f908e}
    .cad-cube-nudge:hover path{fill:#555654}
    .cad-cube-nudge-left{left:-5px;top:50%;transform:translate(-100%,-50%)}
    .cad-cube-nudge-right{right:-5px;top:50%;transform:translate(100%,-50%)}
    .cad-cube-nudge-up{left:50%;top:-5px;transform:translate(-50%,-100%)}
    .cad-cube-nudge-down{left:50%;bottom:-5px;transform:translate(-50%,100%)}
    .cad-viewer-fullscreen{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:#f3f3f2!important;z-index:99999!important}
    .cad-viewer-fullscreen .cad-toolbar{top:14px;right:14px}
    .cad-viewer-fullscreen .cad-interact-shield{inset:0}
  `;

  function ensureCss(){
    if(document.getElementById('cad-fusion-ui-css')) return;
    const s=document.createElement('style'); s.id='cad-fusion-ui-css'; s.textContent=css; document.head.appendChild(s);
  }

  function loadTrackball(){
    if(window.THREE && THREE.TrackballControls) return Promise.resolve();
    if(trackballPromise) return trackballPromise;
    trackballPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src=TRACKBALL_URL; s.async=true;
      s.onload=()=>resolve(); s.onerror=reject; document.head.appendChild(s);
    });
    return trackballPromise;
  }

  function icon(name){
    const icons={
      layers:'<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
      expand:'<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/><path d="m3 8 5-5M16 3l5 5M3 16l5 5M21 16l-5 5"/></svg>',
      shrink:'<svg viewBox="0 0 24 24"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M21 15h-6v6"/></svg>',
      mouse:'<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v6a6 6 0 0 0 12 0V9a6 6 0 0 0-6-6Z"/><path d="M12 3v7M9 7h6"/></svg>'
    }; return icons[name]||'';
  }

  function ease(t){ return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

  function animateCamera(camera,controls,destination,target,duration=500){
    const startPos=camera.position.clone();
    const startTarget=controls?.target?.clone() || target.clone();
    const start=performance.now();
    controls && (controls.enabled=false);
    function frame(now){
      const p=Math.min(1,(now-start)/duration), e=ease(p);
      camera.position.lerpVectors(startPos,destination,e);
      const t=startTarget.clone().lerp(target,e);
      camera.lookAt(t);
      if(controls?.target) controls.target.copy(t);
      if(p<1){requestAnimationFrame(frame)}else{
        camera.position.copy(destination); camera.lookAt(target);
        if(controls?.target) controls.target.copy(target);
        if(controls){controls.enabled=true; controls.update?.();}
      }
    }
    requestAnimationFrame(frame);
  }

  function orbitCamera(camera,controls,axis,angle){
    const target=controls?.target?.clone() || camera.userData?.modelCenter?.clone() || new THREE.Vector3();
    const offset=camera.position.clone().sub(target);
    if(axis==='y') offset.applyAxisAngle(new THREE.Vector3(0,1,0),angle);
    else {
      const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).normalize();
      offset.applyAxisAngle(right,angle);
    }
    animateCamera(camera,controls,target.clone().add(offset),target,500);
  }

  function makeArrows(cubeWrap,camera,controls){
    if(cubeWrap.querySelector('.cad-cube-arrows')) return;
    const root=document.createElement('div'); root.className='cad-cube-arrows';
    root.innerHTML=`
      <button class="cad-cube-arrow cad-cube-arrow-top" aria-label="Rotate clockwise"><svg viewBox="0 0 62 38"><path d="M7 27 C15 9 31 3 46 8 C52 10 56 14 58 20"/><path d="m58 20-8-1m8 1-3-7"/></svg></button>
      <button class="cad-cube-arrow cad-cube-arrow-right" aria-label="Rotate clockwise vertically"><svg viewBox="0 0 38 62"><path d="M10 7 C29 14 34 30 28 45 C26 51 21 55 16 58"/><path d="m16 58 1-8m-1 8 7-3"/></svg></button>
      <button class="cad-cube-nudge cad-cube-nudge-left" aria-label="Rotate left"><svg viewBox="0 0 20 20"><path d="M3 10 14 2v16L3 10Z"/></svg></button>
      <button class="cad-cube-nudge cad-cube-nudge-right" aria-label="Rotate right"><svg viewBox="0 0 20 20"><path d="m17 10-11 8V2l11 8Z"/></svg></button>
      <button class="cad-cube-nudge cad-cube-nudge-up" aria-label="Rotate up"><svg viewBox="0 0 20 20"><path d="m10 3 8 11H2L10 3Z"/></svg></button>
      <button class="cad-cube-nudge cad-cube-nudge-down" aria-label="Rotate down"><svg viewBox="0 0 20 20"><path d="M10 17 2 6h16l-8 11Z"/></svg></button>`;
    cubeWrap.appendChild(root);
    root.querySelector('.cad-cube-arrow-top').onclick=e=>{e.stopPropagation();orbitCamera(camera,controls,'y',-Math.PI/2)};
    root.querySelector('.cad-cube-arrow-right').onclick=e=>{e.stopPropagation();orbitCamera(camera,controls,'x',-Math.PI/2)};
    root.querySelector('.cad-cube-nudge-left').onclick=e=>{e.stopPropagation();orbitCamera(camera,controls,'y',Math.PI/2)};
    root.querySelector('.cad-cube-nudge-right').onclick=e=>{e.stopPropagation();orbitCamera(camera,controls,'y',-Math.PI/2)};
    root.querySelector('.cad-cube-nudge-up').onclick=e=>{e.stopPropagation();orbitCamera(camera,controls,'x',Math.PI/2)};
    root.querySelector('.cad-cube-nudge-down').onclick=e=>{e.stopPropagation();orbitCamera(camera,controls,'x',-Math.PI/2)};
  }

  function setupToolbar(container){
    let root=container.querySelector(':scope > .cad-ui-root');
    if(root){
      const existingMenu=container.querySelector('[id^="layerDropdown-"]');
      const body=root.querySelector('.cad-layer-body');
      if(existingMenu && body && !body.contains(existingMenu)){
        existingMenu.classList.remove('hidden');
        existingMenu.style.display='block';
        existingMenu.style.position='static'; existingMenu.style.width='100%';
        existingMenu.style.margin='0'; existingMenu.style.boxShadow='none'; existingMenu.style.background='transparent'; existingMenu.style.border='0'; existingMenu.style.padding='0';
        body.appendChild(existingMenu);
      }
      return root;
    }
    root=document.createElement('div'); root.className='cad-ui-root';
    const toolbar=document.createElement('div'); toolbar.className='cad-toolbar';
    const filter=document.createElement('button'); filter.type='button'; filter.title='Model layers'; filter.setAttribute('aria-label','Model layers'); filter.innerHTML=icon('layers');
    const full=document.createElement('button'); full.type='button'; full.title='Fullscreen'; full.setAttribute('aria-label','Fullscreen'); full.innerHTML=icon('expand');
    toolbar.append(filter,full);
    const menu=document.createElement('div'); menu.className='cad-layer-menu'; menu.innerHTML='<div class="cad-layer-title">Model layers</div><div class="cad-layer-body"></div>';
    toolbar.appendChild(menu); root.appendChild(toolbar); container.appendChild(root);

    const existingMenu=container.querySelector('[id^="layerDropdown-"]');
    filter.onclick=e=>{ e.stopPropagation(); menu.classList.toggle('open'); };
    if(existingMenu){
      existingMenu.classList.remove('hidden');
      existingMenu.style.display='block';
      existingMenu.style.position='static'; existingMenu.style.width='100%'; existingMenu.style.margin='0'; existingMenu.style.boxShadow='none'; existingMenu.style.background='transparent'; existingMenu.style.border='0'; existingMenu.style.padding='0';
      menu.querySelector('.cad-layer-body').appendChild(existingMenu);
    }
    document.addEventListener('click',()=>menu.classList.remove('open'),{passive:true});

    async function enterFullscreen(){
      try{
        if(!document.fullscreenElement){ await container.requestFullscreen?.(); }
        else if(document.exitFullscreen) await document.exitFullscreen();
      }catch(err){ container.classList.toggle('cad-viewer-fullscreen'); }
    }
    full.onclick=e=>{e.stopPropagation();enterFullscreen();};
    function sync(){
      const active=document.fullscreenElement===container || container.classList.contains('cad-viewer-fullscreen');
      full.innerHTML=icon(active?'shrink':'expand'); full.title=active?'Exit fullscreen':'Fullscreen'; full.setAttribute('aria-label',active?'Exit fullscreen':'Fullscreen');
      setTimeout(()=>window.dispatchEvent(new Event('resize')),50);
    }
    document.addEventListener('fullscreenchange',sync);
    return root;
  }

  function addInteractionShield(container){
    if(container.querySelector('.cad-interact-shield')) return;
    const shield=document.createElement('div'); shield.className='cad-interact-shield';
    shield.innerHTML='<span class="cad-interact-label">'+icon('mouse')+' Click to Interact</span>';
    container.appendChild(shield);
    shield.addEventListener('click',e=>{e.stopPropagation();shield.classList.add('hidden');},{once:true});
    shield.addEventListener('wheel',()=>{}, {passive:true});
  }

  function patchControls(controls,camera){
    if(!controls) return controls;
    controls.rotateSpeed=2.2;
    controls.zoomSpeed=1.1;
    controls.panSpeed=.8;
    controls.staticMoving=false;
    controls.dynamicDampingFactor=.12;
    controls.noRotate=false;
    controls.noZoom=false;
    controls.noPan=false;
    controls.minDistance=Math.max(0.01,controls.minDistance||0.01);
    controls.maxDistance=Infinity;
    if(controls.target) camera.userData.modelCenter=controls.target.clone();
    return controls;
  }

  function install(){
    if(!window.THREE || !THREE.TrackballControls) return;
    if(window.__cadFusionInstalled) return;
    const Trackball=THREE.TrackballControls;
    function CadOrbitControls(camera,domElement){
      const controls=new Trackball(camera,domElement);
      patchControls(controls,camera);
      domElement.__cadControls=controls;
      domElement.__cadCamera=camera;
      const container=domElement.closest('[id$="ViewerContainer"]');
      if(container){ container.__cadControls=controls; container.__cadCamera=camera; }
      return controls;
    }
    CadOrbitControls.prototype=Trackball.prototype;
    THREE.OrbitControls=CadOrbitControls;
    window.__cadFusionInstalled=true;
    ensureCss();
  }

  function enhanceExistingViewers(){
    document.querySelectorAll('[id$="ViewerContainer"]').forEach(container=>{
      setupToolbar(container);
      addInteractionShield(container);
      const cube=container.querySelector('div[style*="width: 104px"]');
      const camera=container.__cadCamera || window.__lastCadCamera;
      const controls=container.__cadControls || window.__lastCadControls;
      if(cube && camera && controls) makeArrows(cube,camera,controls);
    });
  }

  loadTrackball().then(()=>{
    install();
    [50,250,700,1500].forEach(ms=>setTimeout(enhanceExistingViewers,ms));
  }).catch(err=>console.warn('CAD TrackballControls failed to load',err));

  new MutationObserver(()=>enhanceExistingViewers()).observe(document.body,{childList:true,subtree:true});
})();
