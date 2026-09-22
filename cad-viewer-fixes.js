/* Portfolio/CAD final stabilization layer.
 * Keeps the existing Three.js model loader and Fusion-style ViewCube, but owns
 * viewer chrome/layout per container so project navigation cannot cross-wire
 * viewers or leave stale controls behind.
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
      /* ===== Portfolio fixes ===== */
      #leftSidebar,#leftProfileContent{min-width:0!important;box-sizing:border-box;}
      #leftProfileContent>p{white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;line-height:1.45!important;max-width:100%!important;padding-right:0!important;}
      .modal-body{padding-bottom:30px!important;}
      .modal-body>:last-child{margin-bottom:8px!important;}
      .modal-section:last-child{padding-bottom:8px!important;}
      @media(min-width:1024px){
        #centerColumn.project-detail-expanded{width:100%!important;min-width:0!important;max-width:none!important;}
        #rightSidebar.project-detail-hidden{display:none!important;width:0!important;min-width:0!important;padding:0!important;margin:0!important;}
        #leftSidebar.is-collapsed #leftToggleBtn{display:none!important;visibility:hidden!important;}
        #leftSidebar.is-collapsed #leftCollapsedIndicator{display:flex!important;visibility:visible!important;opacity:1!important;}
      }
      /* ===== CAD viewer fixes ===== */
      [id$="ViewerContainer"]{position:relative;overflow:hidden;background:#f3f3f2;}
      [id$="ViewerContainer"]>canvas{display:block!important;width:100%!important;height:100%!important;max-width:none!important;touch-action:none!important;}
      [id$="ViewerContainer"]:fullscreen,[id$="ViewerContainer"].cad-force-fullscreen{background:#f3f3f2!important;}
      .cad-final-ui{position:absolute;inset:0;z-index:200;pointer-events:none;font-family:Arial,Helvetica,sans-serif;}
      .cad-final-toolbar{position:absolute;top:10px;right:10px;display:flex;gap:6px;z-index:220;pointer-events:auto;}
      .cad-final-toolbar button{width:34px;height:34px;padding:0;border:1px solid #c6c6c4;background:rgba(255,255,255,.97);color:#161616;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.16);}
      .cad-final-toolbar button:hover{background:#fff;border-color:#777;}
      .cad-final-toolbar svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
      .cad-final-layers{position:absolute;top:50px;right:10px;width:230px;max-width:calc(100% - 20px);max-height:min(420px,calc(100% - 62px));overflow:auto;padding:7px;background:#101012;border:1px solid #3a3a3c;box-shadow:0 12px 28px rgba(0,0,0,.35);display:none;z-index:230;pointer-events:auto;}
      .cad-final-layers.open{display:block;}
      .cad-final-layers-title{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:5px 6px 7px;border-bottom:1px solid #28282a;margin-bottom:3px;}
      .cad-final-layers label{display:flex;align-items:center;gap:8px;padding:7px;font-size:11px;color:#bbb;cursor:pointer;}
      .cad-final-layers label:hover{background:#19191b;color:#fff;}
      .cad-final-layers input{accent-color:#111;}
      .cad-final-shield{position:absolute;inset:0;z-index:150;display:flex;align-items:flex-end;justify-content:flex-start;padding:12px;pointer-events:auto;background:transparent;}
      .cad-final-shield.hidden{display:none;}
      .cad-final-shield span{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(80,80,80,.35);background:rgba(255,255,255,.94);color:#555;font:10px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 1px 3px rgba(0,0,0,.12);cursor:pointer;}
      .cad-final-shield svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
      .cad-final-arrows{position:absolute;top:42px;right:2px;width:156px;height:156px;z-index:205;pointer-events:none;}
      .cad-final-arrows button{position:absolute;border:0;background:transparent;padding:0;pointer-events:auto;cursor:pointer;}
      .cad-final-arrows svg{width:100%;height:100%;overflow:visible;}
      .cad-final-arrows path{fill:none;stroke:#8f8f8c;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
      .cad-final-arrows button:hover path{stroke:#333;}
      .cad-arrow-h{right:8px;top:0;width:72px;height:44px;}
      .cad-arrow-v{right:0;bottom:4px;width:44px;height:72px;}
      .cad-arrow-l,.cad-arrow-r,.cad-arrow-u,.cad-arrow-d{width:20px;height:20px;}
      .cad-arrow-l{left:4px;top:70px}.cad-arrow-r{right:4px;top:70px}.cad-arrow-u{left:70px;top:4px}.cad-arrow-d{left:70px;bottom:4px}
      [id$="ViewerContainer"]:fullscreen .cad-final-toolbar{top:14px;right:14px;}
      [id$="ViewerContainer"]:fullscreen .cad-final-layers{top:54px;right:14px;}
      @media(max-width:700px){
        .cad-final-toolbar button{width:32px;height:32px;}
        .cad-final-layers{width:min(220px,calc(100% - 20px));}
      }
    `;document.head.appendChild(s);
  }

  function cameraOf(c){return c.__cadCamera||window.__lastCadCamera||null;}
  function controlsOf(c){return c.__cadControls||window.__lastCadControls||null;}
  function resize(c){
    const camera=cameraOf(c),renderer=c.__cadRenderer||window.__lastCadRenderer;if(!camera)return;
    const r=c.getBoundingClientRect();if(r.width<2||r.height<2)return;
    if('aspect' in camera){camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
    if(renderer&&renderer.setSize){renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(Math.round(r.width),Math.round(r.height),false);}
  }
  function stabilize(c){
    const camera=cameraOf(c),controls=controlsOf(c);if(!camera||!controls)return false;
    c.__cadCamera=camera;c.__cadControls=controls;
    controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;controls.enableDamping=true;controls.dampingFactor=.075;
    controls.rotateSpeed=.85;controls.zoomSpeed=.9;controls.panSpeed=.8;
    // World-space panning + unrestricted azimuth avoids the old vertical/side lock.
    controls.screenSpacePanning=false;
    controls.minPolarAngle=.000001;controls.maxPolarAngle=Math.PI-.000001;
    controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;
    controls.minDistance=.001;controls.maxDistance=Infinity;controls.autoRotate=false;
    if(!controls.target||!Number.isFinite(controls.target.x)||!Number.isFinite(controls.target.y)||!Number.isFinite(controls.target.z))controls.target.set(0,0,0);
    camera.userData.modelCenter=controls.target.clone();
    controls.update();resize(c);return true;
  }

  function moveCamera(c,theta,phi){
    const camera=cameraOf(c),controls=controlsOf(c);if(!camera||!controls||!window.THREE)return;
    const target=controls.target.clone(),offset=camera.position.clone().sub(target),start=new THREE.Spherical().setFromVector3(offset);
    const end=new THREE.Spherical(start.radius,Math.max(.000001,Math.min(Math.PI-.000001,phi)),theta);
    const begin=performance.now(),old=tweens.get(c);if(old)cancelAnimationFrame(old);
    const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const tick=now=>{const p=Math.min(1,(now-begin)/(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?1:520)),e=ease(p),s=new THREE.Spherical(start.radius,start.phi+(end.phi-start.phi)*e,start.theta+(end.theta-start.theta)*e);camera.position.setFromSpherical(s).add(target);controls.target.copy(target);controls.update();if(p<1)tweens.set(c,requestAnimationFrame(tick));else tweens.delete(c);};
    tweens.set(c,requestAnimationFrame(tick));
  }
  function addArrows(c,cube){
    if(!cube||cube.querySelector('.cad-final-arrows'))return;
    const wrap=document.createElement('div');wrap.className='cad-final-arrows';wrap.innerHTML=`
      <button class="cad-arrow-h" aria-label="Rotate horizontally"><svg viewBox="0 0 72 44"><path d="M5 31C13 9 37 2 56 9c8 3 12 8 14 15"/><path d="m70 24-9-1m9 1-3-8"/></svg></button>
      <button class="cad-arrow-v" aria-label="Rotate vertically"><svg viewBox="0 0 44 72"><path d="M10 6c22 8 30 28 23 48-3 8-8 13-15 16"/><path d="m18 70 1-9m-1 9 8-4"/></svg></button>
      <button class="cad-arrow-l" aria-label="Rotate left"><svg viewBox="0 0 20 20"><path d="M3 10 14 2v16L3 10Z"/></svg></button>
      <button class="cad-arrow-r" aria-label="Rotate right"><svg viewBox="0 0 20 20"><path d="m17 10-11 8V2l11 8Z"/></svg></button>
      <button class="cad-arrow-u" aria-label="Rotate up"><svg viewBox="0 0 20 20"><path d="m10 3 8 11H2L10 3Z"/></svg></button>
      <button class="cad-arrow-d" aria-label="Rotate down"><svg viewBox="0 0 20 20"><path d="M10 17 2 6h16l-8 11Z"/></svg></button>`;
    cube.appendChild(wrap);
    const spherical=()=>{const controls=controlsOf(c),camera=cameraOf(c),target=controls?controls.target.clone():new THREE.Vector3();return new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));};
    wrap.querySelector('.cad-arrow-l').onclick=e=>{e.stopPropagation();const s=spherical();moveCamera(c,s.theta+Math.PI/2,s.phi);};
    wrap.querySelector('.cad-arrow-r').onclick=e=>{e.stopPropagation();const s=spherical();moveCamera(c,s.theta-Math.PI/2,s.phi);};
    wrap.querySelector('.cad-arrow-u').onclick=e=>{e.stopPropagation();const s=spherical();moveCamera(c,s.theta,Math.max(.000001,s.phi-Math.PI/3));};
    wrap.querySelector('.cad-arrow-d').onclick=e=>{e.stopPropagation();const s=spherical();moveCamera(c,s.theta,Math.min(Math.PI-.000001,s.phi+Math.PI/3));};
    wrap.querySelector('.cad-arrow-h').onclick=e=>{e.stopPropagation();const s=spherical();moveCamera(c,s.theta-Math.PI/2,s.phi);};
    wrap.querySelector('.cad-arrow-v').onclick=e=>{e.stopPropagation();const s=spherical();moveCamera(c,s.theta,s.phi-Math.PI/3);};
  }

  async function fullscreen(c,button){
    try{
      const fs=document.fullscreenElement||document.webkitFullscreenElement;
      if(fs===c){if(document.exitFullscreen)await document.exitFullscreen();else if(document.webkitExitFullscreen)document.webkitExitFullscreen();}
      else if(c.requestFullscreen)await c.requestFullscreen({navigationUI:'hide'});
      else if(c.webkitRequestFullscreen)c.webkitRequestFullscreen();
      else c.classList.toggle('cad-force-fullscreen');
    }catch(_){c.classList.toggle('cad-force-fullscreen');}
    setTimeout(()=>{resize(c);if(button){const active=document.fullscreenElement===c||document.webkitFullscreenElement===c||c.classList.contains('cad-force-fullscreen');button.innerHTML=icon[active?'shrink':'expand'];button.title=active?'Exit fullscreen':'Fullscreen';}},80);
  }

  function buildViewerUi(c){
    if(c.querySelector('.cad-final-ui'))return;
    c.querySelectorAll('.cad-stable-ui,.cad-stable-shield,.cad-stable-cube-arrows').forEach(x=>x.remove());
    const headerFull=document.getElementById('fullscreenBtn-'+c.id);if(headerFull)headerFull.style.display='none';
    const headerLayer=document.getElementById('layerToggleBtn-'+c.id);if(headerLayer)headerLayer.style.display='none';
    const ui=document.createElement('div');ui.className='cad-final-ui';
    const toolbar=document.createElement('div');toolbar.className='cad-final-toolbar';
    const filter=document.createElement('button');filter.type='button';filter.title='Model layers';filter.setAttribute('aria-label','Model layers');filter.innerHTML=icon.layers;
    const full=document.createElement('button');full.type='button';full.title='Fullscreen';full.setAttribute('aria-label','Fullscreen');full.innerHTML=icon.expand;toolbar.append(filter,full);
    const menu=document.createElement('div');menu.className='cad-final-layers';menu.innerHTML='<div class="cad-final-layers-title">Model layers</div><div class="cad-final-layer-content"></div>';
    ui.append(toolbar,menu);c.appendChild(ui);
    const source=document.getElementById('layerDropdown-'+c.id);
    if(source){source.classList.remove('hidden');source.style.cssText='display:block;position:static;width:100%;margin:0;box-shadow:none;background:transparent;border:0;padding:0;';menu.querySelector('.cad-final-layer-content').appendChild(source);}
    const shield=document.createElement('div');shield.className='cad-final-shield';shield.innerHTML='<span>'+icon.mouse+' Click to Interact</span>';c.appendChild(shield);
    shield.addEventListener('click',e=>{e.stopPropagation();shield.classList.add('hidden');});
    shield.addEventListener('wheel',e=>{e.preventDefault();window.scrollBy({left:e.deltaX||0,top:e.deltaY||0});},{passive:false});
    c.addEventListener('pointerdown',()=>shield.classList.add('hidden'),{passive:true});
    filter.addEventListener('click',e=>{e.stopPropagation();shield.classList.add('hidden');menu.classList.toggle('open');});
    full.addEventListener('click',e=>{e.stopPropagation();shield.classList.add('hidden');fullscreen(c,full);});
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==filter)menu.classList.remove('open');},{passive:true});
    const sync=()=>{const active=document.fullscreenElement===c||document.webkitFullscreenElement===c||c.classList.contains('cad-force-fullscreen');full.innerHTML=icon[active?'shrink':'expand'];full.title=active?'Exit fullscreen':'Fullscreen';resize(c);};
    document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);
    states.set(c,{ui:true,shield,menu,filter,full});
  }

  function positionCube(c){
    const cube=c.querySelector('div[style*="width: 104px"]');if(!cube)return;
    cube.style.position='absolute';cube.style.top='58px';cube.style.right='12px';cube.style.zIndex='180';cube.style.width='104px';cube.style.height='104px';
    addArrows(c,cube);
  }

  function viewerScan(c){
    if(!c)return;
    buildViewerUi(c);
    stabilize(c);
    positionCube(c);
    if(!c.dataset.cadObservers){
      c.dataset.cadObservers='1';
      if(window.ResizeObserver){const ro=new ResizeObserver(()=>{requestAnimationFrame(()=>{resize(c);positionCube(c);});});ro.observe(c);states.get(c).resizeObserver=ro;}
      const canvas=c.querySelector('canvas');if(canvas){canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();c.dataset.cadContextLost='1';},{passive:false});canvas.addEventListener('webglcontextrestored',()=>{delete c.dataset.cadContextLost;stabilize(c);resize(c);});}
    }
  }

  function sortToolchain(){
    const box=document.getElementById('toolchain-container');if(!box)return;
    const items=[...box.children].filter(x=>x.matches('span'));
    const sorted=[...items].sort((a,b)=>a.textContent.trim().localeCompare(b.textContent.trim(),undefined,{sensitivity:'base'}));
    if(sorted.some((x,i)=>x!==items[i]))sorted.forEach(x=>box.appendChild(x));
  }
  function renameTimeline(){
    document.querySelectorAll('#experienceTimelineSidebar p').forEach(p=>{if(p.textContent.trim()==='Experience Timeline')p.textContent='Career Timeline';});
  }
  function syncSidebar(){
    const left=document.getElementById('leftSidebar');if(!left)return;
    const collapsed=left.classList.contains('is-collapsed');
    const profile=document.getElementById('leftProfileContent');const indicator=document.getElementById('leftCollapsedIndicator');const button=document.getElementById('leftToggleBtn');
    if(collapsed){profile?.classList.add('opacity-0','pointer-events-none','-translate-x-2');profile?.setAttribute('aria-hidden','true');indicator?.classList.remove('hidden');indicator?.classList.add('visible');button&&(button.style.display='none');}
    else{profile?.classList.remove('opacity-0','pointer-events-none','-translate-x-2');profile?.setAttribute('aria-hidden','false');indicator?.classList.add('hidden');indicator?.classList.remove('visible');button&&(button.style.display='flex');}
  }
  function projectLayout(){
    const detail=document.getElementById('projectDetailView'),center=document.getElementById('centerColumn'),right=document.getElementById('rightSidebar'),left=document.getElementById('leftSidebar');if(!detail||!center)return;
    const open=detail.classList.contains('open')&&!detail.classList.contains('closing');
    if(open){
      if(!detail.dataset.cadAutoCollapsed){detail.dataset.cadAutoCollapsed='1';if(left&&!left.classList.contains('is-collapsed'))left.classList.add('is-collapsed');}
      center.classList.add('project-detail-expanded');center.classList.remove('lg:col-span-6','lg:col-span-8','lg:col-span-9');center.style.width='100%';center.style.maxWidth='none';if(window.innerWidth>=1024)center.style.gridColumn=left?.classList.contains('is-collapsed')?'span 11':'span 9';
      if(right){right.classList.add('project-detail-hidden');right.style.setProperty('display','none','important');}
      detail.style.display='block';
    }else{
      delete detail.dataset.cadAutoCollapsed;center.classList.remove('project-detail-expanded');center.style.gridColumn='';center.style.width='';center.style.maxWidth='';if(right){right.classList.remove('project-detail-hidden');right.style.removeProperty('display');}
    }
    syncSidebar();
  }
  function alignTimeline(){
    const timeline=document.getElementById('experienceTimelineSidebar'),head=document.querySelector('#experienceSection .experience-section-head .scan-header'),home=document.getElementById('homelabSidebarSection');if(!timeline||!head||window.innerWidth<768)return;
    if(home)home.style.paddingBottom='18px';
    timeline.style.marginTop='0';timeline.style.transform='translateY(0)';
    const delta=head.getBoundingClientRect().bottom-timeline.getBoundingClientRect().top;
    timeline.style.transform=`translateY(${delta}px)`;
  }
  function sitePass(){
    if(siteFrame)return;siteFrame=requestAnimationFrame(()=>{siteFrame=0;sortToolchain();renameTimeline();projectLayout();alignTimeline();document.querySelectorAll('[id$="ViewerContainer"]').forEach(viewerScan);});
  }

  addCss();sitePass();
  document.addEventListener('DOMContentLoaded',sitePass,{once:true});
  window.addEventListener('load',()=>{sitePass();setTimeout(sitePass,300);setTimeout(sitePass,1000);},{passive:true});
  window.addEventListener('resize',sitePass,{passive:true});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#leftCollapsedIndicator'))setTimeout(syncSidebar,80);
    if(e.target.closest?.('[id^="layerToggleBtn-"]'))document.querySelectorAll('.cad-final-shield').forEach(x=>x.classList.add('hidden'));
  },{passive:true});
  new MutationObserver(mutations=>{
    let relevant=false;
    for(const m of mutations){
      if(m.type==='childList')relevant=true;
      if(m.type==='attributes'&&m.attributeName==='class')relevant=true;
    }
    if(relevant)sitePass();
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
