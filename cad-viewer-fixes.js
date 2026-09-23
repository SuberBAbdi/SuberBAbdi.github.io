/* Portfolio + CAD stabilization layer.
 * Keeps the native Three.js OrbitControls and native Fusion-style ViewCube
 * from index.html. No second cube and no TrackballControls replacement.
 */
(function(){
  'use strict';
  const STYLE_ID='cad-final-css';
  const states=new WeakMap();
  const tweens=new WeakMap();
  let siteFrame=0;

  const icon={
    layers:'<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
    expand:'<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/><path d="m3 8 5-5M16 3l5 5M3 16l5 5M21 16l-5 5"/></svg>',
    shrink:'<svg viewBox="0 0 24 24"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M21 15h-6v6"/></svg>',
    mouse:'<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v6a6 6 0 0 0 12 0V9a6 6 0 0 0-6-6Z"/><path d="M12 3v7M9 7h6"/></svg>'
  };

  function addCss(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      #leftSidebar,#leftProfileContent{min-width:0!important;box-sizing:border-box;}
      #leftProfileContent>p{white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;line-height:1.45!important;max-width:100%!important;padding-right:0!important;}
      .modal-body{padding-bottom:30px!important}.modal-body>:last-child{margin-bottom:8px!important}.modal-section:last-child{padding-bottom:8px!important}
      @media(min-width:1024px){
        #centerColumn.project-detail-expanded{width:100%!important;min-width:0!important;max-width:none!important}
        #rightSidebar.project-detail-hidden{display:none!important;width:0!important;min-width:0!important;padding:0!important;margin:0!important}
        #leftSidebar.is-collapsed #leftToggleBtn{display:none!important;visibility:hidden!important}
        #leftSidebar.is-collapsed #leftCollapsedIndicator{display:flex!important;visibility:visible!important;opacity:1!important}
      }
      [id$="ViewerContainer"]{position:relative;overflow:hidden;background:#f3f3f2}
      [id$="ViewerContainer"]>canvas{display:block!important;width:100%!important;height:100%!important;max-width:none!important;touch-action:none!important}
      [id$="ViewerContainer"]:fullscreen,[id$="ViewerContainer"].cad-force-fullscreen{background:#f3f3f2!important}
      .cad-final-ui{position:absolute;inset:0;z-index:200;pointer-events:none;font-family:Arial,Helvetica,sans-serif}
      .cad-final-toolbar{position:absolute;top:10px;right:10px;display:flex;gap:6px;z-index:220;pointer-events:auto}
      .cad-final-toolbar button{width:34px;height:34px;padding:0;border:1px solid #c6c6c4;background:rgba(255,255,255,.97);color:#161616;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.16)}
      .cad-final-toolbar button:hover{background:#fff;border-color:#777}.cad-final-toolbar svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .cad-final-layers{position:absolute;top:50px;right:calc(112px + 24px);width:240px;max-width:calc(100% - 150px);max-height:min(420px,calc(100% - 62px));overflow:auto;padding:7px;background:#101012;border:1px solid #3a3a3c;box-shadow:0 12px 28px rgba(0,0,0,.35);display:none;z-index:230;pointer-events:auto}
      .cad-final-layers.open{display:block}.cad-final-layers-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:5px 6px 7px;border-bottom:1px solid #28282a;margin-bottom:3px}
      .cad-final-layers label{display:flex;align-items:center;gap:8px;padding:7px;font-size:11px;color:#bbb;cursor:pointer}.cad-final-layers label:hover{background:#19191b;color:#fff}.cad-final-layers input{accent-color:#111}
      .cad-final-shield{position:absolute;inset:0;z-index:150;display:flex;align-items:flex-end;justify-content:flex-start;padding:12px;pointer-events:auto;background:transparent}.cad-final-shield.hidden{display:none}
      .cad-final-shield span{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(80,80,80,.35);background:rgba(255,255,255,.94);color:#555;font:10px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 1px 3px rgba(0,0,0,.12);cursor:pointer}.cad-final-shield svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      /* Four navigation arrows surround the native ViewCube. The old large
         cad-arrow-h/cad-arrow-v controls are intentionally gone. */
      .cad-final-arrows{position:absolute;top:42px;right:2px;width:156px;height:156px;z-index:205;pointer-events:none}
      .cad-final-arrows button{position:absolute;width:24px;height:24px;border:0;background:rgba(255,255,255,.72);padding:0;pointer-events:auto;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:2px}
      .cad-final-arrows button:hover{background:#fff}.cad-final-arrows svg{width:18px;height:18px;overflow:visible}.cad-final-arrows path{fill:none;stroke:#777;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.cad-final-arrows button:hover path{stroke:#222}
      .cad-arrow-l{left:0;top:66px}.cad-arrow-r{right:0;top:66px}.cad-arrow-u{left:66px;top:0}.cad-arrow-d{left:66px;bottom:0}
      .cad-roll-arrows{position:absolute;right:-3px;top:-31px;width:54px;height:26px;display:flex;gap:3px;pointer-events:none;z-index:220}
      .cad-roll-arrows button{width:25px;height:25px;border:1px solid #c6c6c4;background:rgba(255,255,255,.97);color:#70706e;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;padding:0;box-shadow:0 1px 3px rgba(0,0,0,.16)}
      .cad-roll-arrows button:hover{color:#111;background:#fff}.cad-roll-arrows svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      [id$="ViewerContainer"]:fullscreen .cad-final-toolbar{top:14px;right:14px}[id$="ViewerContainer"]:fullscreen .cad-final-layers{top:54px;right:calc(112px + 28px)}
      @media(max-width:700px){.cad-final-toolbar button{width:32px;height:32px}.cad-final-layers{width:220px;max-width:calc(100% - 20px);right:10px!important}.cad-final-arrows{transform:scale(.9);transform-origin:top right}}
    `;document.head.appendChild(s);
  }

  function cameraOf(c){return c.__cadCamera||window.__lastCadCamera||null}
  function controlsOf(c){return c.__cadControls||window.__lastCadControls||null}
  function rendererOf(c){return c.__cadRenderer||window.__lastCadRenderer||null}

  function resize(c){
    const camera=cameraOf(c),renderer=rendererOf(c);if(!camera)return;
    const r=c.getBoundingClientRect();if(r.width<2||r.height<2)return;
    if('aspect' in camera){camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
    if(renderer?.setSize){renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(Math.round(r.width),Math.round(r.height),false)}
    const controls=controlsOf(c);controls?.handleResize?.();
  }

  function registry(c){
    try{return typeof viewer3DInstances!=='undefined'?viewer3DInstances[c.id]:null}catch(_){return null}
  }

  function fitOrbitTarget(c){
    if(c.dataset.cadTargetFitted==='1')return true;
    const controls=controlsOf(c),camera=cameraOf(c),inst=registry(c);if(!controls||!camera||!inst?.bodies)return false;
    const box=new THREE.Box3();let found=false;
    Object.values(inst.bodies).forEach(obj=>{if(obj?.visible){const b=new THREE.Box3().setFromObject(obj);if(!b.isEmpty()){box.union(b);found=true}}});
    if(!found)return false;
    const target=box.getCenter(new THREE.Vector3());
    const oldTarget=controls.target?.clone()||new THREE.Vector3();
    const delta=target.clone().sub(oldTarget);
    camera.position.add(delta);
    controls.target.copy(target);
    camera.userData.modelCenter=target.clone();
    controls.update?.();
    c.dataset.cadTargetFitted='1';
    return true;
  }

  function stabilize(c){
    const camera=cameraOf(c),controls=controlsOf(c);if(!camera||!controls)return false;
    c.__cadCamera=camera;c.__cadControls=controls;
    controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;
    if('enableDamping' in controls){controls.enableDamping=true;controls.dampingFactor=.075}
    controls.rotateSpeed=.9;controls.zoomSpeed=.95;controls.panSpeed=.8;controls.screenSpacePanning=false;
    if('minPolarAngle' in controls){controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI;controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.minDistance=.001;controls.maxDistance=Infinity}
    if('autoRotate' in controls)controls.autoRotate=false;
    controls.update?.();resize(c);fitOrbitTarget(c);return true;
  }

  function animateSpherical(c,thetaDelta,phiDelta){
    const camera=cameraOf(c),controls=controlsOf(c);if(!camera||!controls||!window.THREE)return;
    const target=controls.target.clone();
    const offset=camera.position.clone().sub(target);
    const start=new THREE.Spherical().setFromVector3(offset);
    const end=new THREE.Spherical(start.radius,
      THREE.MathUtils.clamp(start.phi+phiDelta,.000001,Math.PI-.000001),
      start.theta+thetaDelta);
    const begin=performance.now(),old=tweens.get(c);if(old)cancelAnimationFrame(old);
    const duration=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:360;
    const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    controls.enabled=false;
    const tick=now=>{
      const p=Math.min(1,(now-begin)/duration),e=ease(p);
      const s=new THREE.Spherical(start.radius,start.phi+(end.phi-start.phi)*e,start.theta+(end.theta-start.theta)*e);
      camera.position.setFromSpherical(s).add(target);
      controls.target.copy(target);controls.update?.();
      if(p<1)tweens.set(c,requestAnimationFrame(tick));
      else{tweens.delete(c);controls.enabled=true;controls.target.copy(target);controls.update?.()}
    };
    tweens.set(c,requestAnimationFrame(tick));
  }

  function roll(c,dir){
    const camera=cameraOf(c),controls=controlsOf(c);if(!camera||!controls)return;
    const target=controls.target.clone();
    const axis=camera.getWorldDirection(new THREE.Vector3()).normalize();
    const fromUp=camera.up.clone();
    const toUp=fromUp.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis,dir*Math.PI/2)).normalize();
    const begin=performance.now(),duration=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:360,old=tweens.get(c);if(old)cancelAnimationFrame(old);
    controls.enabled=false;
    const startUp=fromUp.clone();
    const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const tick=now=>{
      const p=Math.min(1,(now-begin)/duration),e=ease(p);
      camera.up.lerpVectors(startUp,toUp,e).normalize();camera.lookAt(target);controls.target.copy(target);controls.update?.();
      if(p<1)tweens.set(c,requestAnimationFrame(tick));else{camera.up.copy(toUp);camera.lookAt(target);controls.enabled=true;controls.update?.();tweens.delete(c)}
    };
    tweens.set(c,requestAnimationFrame(tick));
  }

  function buildLayerRows(c,content){
    const inst=registry(c);if(!inst?.bodiesConfig?.length)return false;
    content.innerHTML='';
    inst.bodiesConfig.forEach((b,index)=>{
      const row=document.createElement('label');
      const cb=document.createElement('input');cb.type='checkbox';cb.checked=b.visible!==false;cb.setAttribute('aria-label','Toggle '+(b.name||('Body '+(index+1))));
      const name=document.createElement('span');name.textContent=b.name||b.path?.split('/').pop()||('Body '+(index+1));name.style.fontFamily='Arial,Helvetica,sans-serif';
      row.append(cb,name);content.appendChild(row);
      cb.addEventListener('change',()=>{
        b.visible=cb.checked;const obj=inst.bodies[b.id];if(obj)obj.visible=cb.checked;
        c.dataset.cadTargetFitted='';fitOrbitTarget(c);fitOrbitTarget(c);
      });
    });
    return true;
  }

  function refreshLayers(c){
    const state=states.get(c);if(!state)return false;
    const source=document.getElementById('layerDropdown-'+c.id);
    if(source && !state.menu.contains(source)){
      source.classList.remove('hidden');source.style.cssText='display:block;position:static;width:100%;margin:0;box-shadow:none;background:transparent;border:0;padding:0;';
      state.content.appendChild(source);
    }
    if(buildLayerRows(c,state.content))return true;
    if(source && source.children.length)return true;
    return false;
  }

  async function fullscreen(c,button){
    try{
      const fs=document.fullscreenElement||document.webkitFullscreenElement;
      if(fs===c){if(document.exitFullscreen)await document.exitFullscreen();else document.webkitExitFullscreen?.()}
      else if(c.requestFullscreen)await c.requestFullscreen({navigationUI:'hide'});
      else if(c.webkitRequestFullscreen)c.webkitRequestFullscreen();
      else c.classList.toggle('cad-force-fullscreen');
    }catch(_){c.classList.toggle('cad-force-fullscreen')}
    setTimeout(()=>{resize(c);syncFullscreen(c,button)},80);
  }
  function syncFullscreen(c,button){
    if(!button)return;const active=document.fullscreenElement===c||document.webkitFullscreenElement===c||c.classList.contains('cad-force-fullscreen');button.innerHTML=icon[active?'shrink':'expand'];button.title=active?'Exit fullscreen':'Fullscreen';
  }

  function buildViewerUi(c){
    if(c.querySelector('.cad-final-ui'))return;
    const ui=document.createElement('div');ui.className='cad-final-ui';
    const toolbar=document.createElement('div');toolbar.className='cad-final-toolbar';
    const filter=document.createElement('button');filter.type='button';filter.title='Model layers';filter.setAttribute('aria-label','Model layers');filter.innerHTML=icon.layers;
    const full=document.createElement('button');full.type='button';full.title='Fullscreen';full.setAttribute('aria-label','Fullscreen');full.innerHTML=icon.expand;toolbar.append(filter,full);
    const menu=document.createElement('div');menu.className='cad-final-layers';menu.innerHTML='<div class="cad-final-layers-title">Model layers</div><div class="cad-final-layer-content"></div>';
    ui.append(toolbar,menu);c.appendChild(ui);
    const content=menu.querySelector('.cad-final-layer-content');
    const source=document.getElementById('layerDropdown-'+c.id);
    if(source){source.classList.remove('hidden');source.style.cssText='display:block;position:static;width:100%;margin:0;box-shadow:none;background:transparent;border:0;padding:0;';content.appendChild(source)}
    const shield=document.createElement('div');shield.className='cad-final-shield';shield.innerHTML='<span>'+icon.mouse+' Click to Interact</span>';c.appendChild(shield);
    shield.addEventListener('click',e=>{e.stopPropagation();shield.classList.add('hidden')});
    c.addEventListener('pointerdown',()=>shield.classList.add('hidden'),{passive:true});
    filter.addEventListener('click',e=>{e.stopPropagation();shield.classList.add('hidden');menu.classList.toggle('open');refreshLayers(c)});
    full.addEventListener('click',e=>{e.stopPropagation();shield.classList.add('hidden');fullscreen(c,full)});
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!filter.contains(e.target))menu.classList.remove('open')},{passive:true});
    document.addEventListener('fullscreenchange',()=>{syncFullscreen(c,full);resize(c)});
    document.addEventListener('webkitfullscreenchange',()=>{syncFullscreen(c,full);resize(c)});
    states.set(c,{ui:true,shield,menu,filter,full,content});
  }

  function nativeCube(c){return c.querySelector('div[style*="width: 104px"]')||c.querySelector('div.absolute.top-2.right-2')||null}

  function addNavigationArrows(c,cube){
    if(!cube||cube.querySelector('.cad-final-arrows'))return;
    cube.style.position='absolute';cube.style.top='58px';cube.style.right='12px';cube.style.zIndex='180';
    const wrap=document.createElement('div');wrap.className='cad-final-arrows';
    wrap.innerHTML=`
      <button class="cad-arrow-l" aria-label="Orbit left" title="Orbit left"><svg viewBox="0 0 24 24"><path d="m14 5-7 7 7 7"/></svg></button>
      <button class="cad-arrow-r" aria-label="Orbit right" title="Orbit right"><svg viewBox="0 0 24 24"><path d="m10 5 7 7-7 7"/></svg></button>
      <button class="cad-arrow-u" aria-label="Orbit up" title="Orbit up"><svg viewBox="0 0 24 24"><path d="m5 14 7-7 7 7"/></svg></button>
      <button class="cad-arrow-d" aria-label="Orbit down" title="Orbit down"><svg viewBox="0 0 24 24"><path d="m5 10 7 7 7-7"/></svg></button>`;
    cube.appendChild(wrap);
    wrap.querySelector('.cad-arrow-l').onclick=e=>{e.stopPropagation();animateSpherical(c,Math.PI/2,0)};
    wrap.querySelector('.cad-arrow-r').onclick=e=>{e.stopPropagation();animateSpherical(c,-Math.PI/2,0)};
    wrap.querySelector('.cad-arrow-u').onclick=e=>{e.stopPropagation();animateSpherical(c,0,-Math.PI/6)};
    wrap.querySelector('.cad-arrow-d').onclick=e=>{e.stopPropagation();animateSpherical(c,0,Math.PI/6)};

    if(!cube.querySelector('.cad-roll-arrows')){
      const rollWrap=document.createElement('div');rollWrap.className='cad-roll-arrows';
      rollWrap.innerHTML=`<button class="cad-ccw" aria-label="Roll counter-clockwise" title="Roll counter-clockwise"><svg viewBox="0 0 24 24"><path d="M19 8a8 8 0 1 0 1 6"/><path d="M19 3v5h-5"/></svg></button><button class="cad-cw" aria-label="Roll clockwise" title="Roll clockwise"><svg viewBox="0 0 24 24"><path d="M5 8a8 8 0 1 1-1 6"/><path d="M5 3v5h5"/></svg></button>`;
      cube.appendChild(rollWrap);
      rollWrap.querySelector('.cad-ccw').onclick=e=>{e.stopPropagation();roll(c,-1)};
      rollWrap.querySelector('.cad-cw').onclick=e=>{e.stopPropagation();roll(c,1)};
    }
  }

  function viewerScan(c){
    if(!c)return;
    buildViewerUi(c);stabilize(c);
    const cube=nativeCube(c);if(cube)addNavigationArrows(c,cube);
    refreshLayers(c);
    [120,350,800,1500].forEach(ms=>setTimeout(()=>{if(document.body.contains(c)){stabilize(c);refreshLayers(c)}},ms));
  }

  function sortToolchain(){
    const box=document.getElementById('toolchain-container');if(!box)return;
    const items=[...box.children].filter(x=>x.matches('span'));
    const sorted=[...items].sort((a,b)=>a.textContent.trim().localeCompare(b.textContent.trim(),undefined,{sensitivity:'base'}));
    if(sorted.some((x,i)=>x!==items[i]))sorted.forEach(x=>box.appendChild(x));
  }
  function renameTimeline(){document.querySelectorAll('#experienceTimelineSidebar p').forEach(p=>{if(p.textContent.trim()==='Experience Timeline')p.textContent='Career Timeline'})}
  function syncSidebar(){
    const left=document.getElementById('leftSidebar');if(!left)return;const collapsed=left.classList.contains('is-collapsed');
    const profile=document.getElementById('leftProfileContent'),indicator=document.getElementById('leftCollapsedIndicator'),button=document.getElementById('leftToggleBtn');
    if(collapsed){profile?.classList.add('opacity-0','pointer-events-none','-translate-x-2');profile?.setAttribute('aria-hidden','true');indicator?.classList.remove('hidden');indicator?.classList.add('visible');button&&(button.style.display='none')}
    else{profile?.classList.remove('opacity-0','pointer-events-none','-translate-x-2');profile?.setAttribute('aria-hidden','false');indicator?.classList.add('hidden');indicator?.classList.remove('visible');button&&(button.style.display='flex')}
  }
  function projectLayout(){
    const detail=document.getElementById('projectDetailView'),center=document.getElementById('centerColumn'),right=document.getElementById('rightSidebar'),left=document.getElementById('leftSidebar');if(!detail||!center)return;
    const open=detail.classList.contains('open')&&!detail.classList.contains('closing');
    if(open){
      if(!detail.dataset.cadAutoCollapsed){detail.dataset.cadAutoCollapsed='1';if(left&&!left.classList.contains('is-collapsed'))left.classList.add('is-collapsed')}
      center.classList.add('project-detail-expanded');center.classList.remove('lg:col-span-6','lg:col-span-8','lg:col-span-9');center.style.width='100%';center.style.maxWidth='none';
      if(window.innerWidth>=1024)center.style.gridColumn=left?.classList.contains('is-collapsed')?'span 11':'span 9';
      if(right){right.classList.add('project-detail-hidden');right.style.setProperty('display','none','important')}
      detail.style.display='block';
    }else{
      delete detail.dataset.cadAutoCollapsed;center.classList.remove('project-detail-expanded');center.style.gridColumn='';center.style.width='';center.style.maxWidth='';
      if(right){right.classList.remove('project-detail-hidden');right.style.removeProperty('display')}
    }
    syncSidebar();
  }
  function alignTimeline(){
    const timeline=document.getElementById('experienceTimelineSidebar'),head=document.querySelector('#experienceSection .experience-section-head .scan-header'),home=document.getElementById('homelabSidebarSection');if(!timeline||!head||window.innerWidth<768)return;
    if(home)home.style.paddingBottom='18px';timeline.style.marginTop='0';timeline.style.transform='translateY(0)';
    const delta=head.getBoundingClientRect().bottom-timeline.getBoundingClientRect().top;timeline.style.transform=`translateY(${delta}px)`;
  }
  function sitePass(){
    if(siteFrame)return;siteFrame=requestAnimationFrame(()=>{siteFrame=0;sortToolchain();renameTimeline();projectLayout();alignTimeline();document.querySelectorAll('[id$="ViewerContainer"]').forEach(viewerScan)})
  }

  addCss();sitePass();
  document.addEventListener('DOMContentLoaded',sitePass,{once:true});
  window.addEventListener('load',()=>{sitePass();setTimeout(sitePass,250);setTimeout(sitePass,900)},{passive:true});
  window.addEventListener('resize',sitePass,{passive:true});
  window.addEventListener('cadviewer:refresh',sitePass,{passive:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('#leftCollapsedIndicator'))setTimeout(syncSidebar,80)},{passive:true});
  let observerTimer=0;
  new MutationObserver(mutations=>{
    let relevant=false;
    for(const m of mutations){
      if(m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1&&((n.id||'').endsWith('ViewerContainer')||n.querySelector?.('[id$="ViewerContainer"]')))){relevant=true;break}
      if(m.type==='attributes'&&m.target.id==='projectDetailView'&&m.attributeName==='class'){relevant=true;break}
    }
    if(relevant){clearTimeout(observerTimer);observerTimer=setTimeout(sitePass,40)}
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
