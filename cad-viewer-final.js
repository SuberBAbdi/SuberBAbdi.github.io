/* Final CAD viewer correction layer. Loaded after cad-viewer-fixes.js. */
(function(){
  'use strict';
  const STYLE='cad-viewer-final-correction-css';
  const patched=new WeakSet();
  const activeTweens=new WeakMap();

  function css(){
    if(document.getElementById(STYLE)) return;
    const s=document.createElement('style'); s.id=STYLE;
    s.textContent=`
      #cad-arrow-h,#cad-arrow-v,.cad-arrow-h,.cad-arrow-v,[data-cad-arrow="h"],[data-cad-arrow="v"]{display:none!important;}
      [id$="ViewerContainer"]{position:relative!important;isolation:isolate!important;}
      [id$="ViewerContainer"] .cad-final-ui{position:absolute!important;inset:0!important;pointer-events:none!important;}
      [id$="ViewerContainer"] .cad-final-toolbar{position:absolute!important;top:10px!important;right:10px!important;z-index:500!important;}
      [id$="ViewerContainer"] .cad-final-arrows{position:absolute!important;top:74px!important;right:14px!important;width:190px!important;height:190px!important;z-index:490!important;pointer-events:none!important;}
      [id$="ViewerContainer"] .cad-final-arrows button{z-index:492!important;}
      [id$="ViewerContainer"] .cad-arrow-l{left:0!important;top:83px!important;}
      [id$="ViewerContainer"] .cad-arrow-r{right:0!important;top:83px!important;}
      [id$="ViewerContainer"] .cad-arrow-u{left:83px!important;top:0!important;}
      [id$="ViewerContainer"] .cad-arrow-d{left:83px!important;bottom:0!important;}
      [id$="ViewerContainer"] .cad-roll-arrows{position:absolute!important;right:31px!important;top:43px!important;width:128px!important;height:28px!important;display:block!important;pointer-events:none!important;z-index:510!important;}
      [id$="ViewerContainer"] .cad-roll-arrows button{position:absolute!important;}
      [id$="ViewerContainer"] .cad-roll-arrows button:first-child{left:0!important;top:0!important;}
      [id$="ViewerContainer"] .cad-roll-arrows button:last-child{right:0!important;top:0!important;}
      [id$="ViewerContainer"] .cad-final-layers{top:50px!important;right:220px!important;z-index:520!important;}
      [id$="ViewerContainer"] .cad-native-cube-anchor{position:absolute!important;width:104px!important;height:104px!important;left:43px!important;top:43px!important;z-index:495!important;transform-origin:50% 50%!important;}
      [id$="ViewerContainer"] .cad-native-cube-anchor canvas,[id$="ViewerContainer"] .cad-native-cube-anchor svg{max-width:none!important;}
      [id$="ViewerContainer"] .cad-final-shield{z-index:150!important;}
      [id$="ViewerContainer"] .cad-final-shield.hidden{display:none!important;}
      [id$="ViewerContainer"] .cad-final-ui .cad-final-toolbar,[id$="ViewerContainer"] .cad-final-ui .cad-final-layers,[id$="ViewerContainer"] .cad-final-ui .cad-final-arrows,[id$="ViewerContainer"] .cad-roll-arrows{pointer-events:auto!important;}
    `;
    document.head.appendChild(s);
  }
  function containers(){return [...document.querySelectorAll('[id$="ViewerContainer"]')];}
  function inst(c){try{return typeof viewer3DInstances!=='undefined' ? viewer3DInstances[c.id] : null;}catch(_){return null;}}
  function controls(c){return c.__cadControls || window.__lastCadControls || null;}
  function camera(c){return c.__cadCamera || window.__lastCadCamera || null;}
  function findCube(c){
    const known=['.view-cube','.viewcube','.viewCube','.view-cube-container','.viewcube-container','[class*="viewcube"]','[class*="view-cube"]','[id*="viewcube"]','[id*="viewCube"]','[id*="view-cube"]','[data-viewcube]','[data-view-cube]'];
    for(const sel of known){const el=c.querySelector(sel);if(el&&el!==c)return el;}
    const candidates=[...c.querySelectorAll('div,section,aside,canvas,svg')];
    for(const el of candidates){const r=el.getBoundingClientRect();if(r.width<180&&r.height<180&&r.width>45&&r.height>45){const t=(el.textContent||'').toLowerCase();if((t.includes('front')&&t.includes('back'))||(t.includes('top')&&t.includes('bottom')&&t.includes('left')))return el;}}
    return null;
  }
  function centreCube(c){const cube=findCube(c);if(!cube)return;cube.classList.add('cad-native-cube-anchor');cube.style.setProperty('left','43px','important');cube.style.setProperty('top','43px','important');cube.style.setProperty('right','auto','important');cube.style.setProperty('bottom','auto','important');}
  function freeOrbit(c){const ctl=controls(c),cam=camera(c);if(!ctl||!cam)return false;ctl.enableRotate=true;ctl.enablePan=true;ctl.enableZoom=true;if('minPolarAngle'in ctl)ctl.minPolarAngle=0;if('maxPolarAngle'in ctl)ctl.maxPolarAngle=Math.PI;if('minAzimuthAngle'in ctl)ctl.minAzimuthAngle=-Infinity;if('maxAzimuthAngle'in ctl)ctl.maxAzimuthAngle=Infinity;if('minDistance'in ctl)ctl.minDistance=.000001;if('maxDistance'in ctl)ctl.maxDistance=Infinity;if('enableDamping'in ctl){ctl.enableDamping=true;ctl.dampingFactor=.075;}ctl.rotateSpeed=.9;ctl.screenSpacePanning=false;if('autoRotate'in ctl)ctl.autoRotate=false;if(window.THREE&&cam.up.lengthSq()<.99)cam.up.set(0,1,0);return true;}
  function modelCenter(c){const ctl=controls(c),I=inst(c);if(!ctl||!I)return new THREE.Vector3();const box=new THREE.Box3();let found=false;Object.values(I.bodies||{}).forEach(o=>{if(o&&o.visible!==false){const b=new THREE.Box3().setFromObject(o);if(!b.isEmpty()){box.union(b);found=true;}}});return found?box.getCenter(new THREE.Vector3()):ctl.target.clone();}
  function tweenCamera(c,endPos,endTarget){const ctl=controls(c),cam=camera(c);if(!ctl||!cam)return;const old=activeTweens.get(c);if(old)cancelAnimationFrame(old);const startPos=cam.position.clone(),startTarget=ctl.target.clone(),startUp=cam.up.clone(),duration=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:500,t0=performance.now();ctl.enabled=false;const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;const tick=now=>{const p=Math.min(1,(now-t0)/duration),e=ease(p);cam.position.lerpVectors(startPos,endPos,e);ctl.target.lerpVectors(startTarget,endTarget,e);cam.up.lerpVectors(startUp,cam.up,e).normalize();cam.lookAt(ctl.target);ctl.update?.();if(p<1)activeTweens.set(c,requestAnimationFrame(tick));else{ctl.target.copy(endTarget);cam.position.copy(endPos);cam.lookAt(endTarget);ctl.enabled=true;ctl.update?.();activeTweens.delete(c);}};activeTweens.set(c,requestAnimationFrame(tick));}
  function standardView(c,name){const ctl=controls(c),cam=camera(c);if(!ctl||!cam||!window.THREE)return;const target=modelCenter(c),radius=Math.max(cam.position.clone().sub(ctl.target).length(),1),dirs={front:new THREE.Vector3(0,0,1),back:new THREE.Vector3(0,0,-1),right:new THREE.Vector3(1,0,0),left:new THREE.Vector3(-1,0,0),top:new THREE.Vector3(0,1,0),bottom:new THREE.Vector3(0,-1,0)},d=dirs[name];if(!d)return;cam.up.set(0,1,0);if(name==='top'||name==='bottom')cam.up.set(0,0,-1);tweenCamera(c,target.clone().add(d.multiplyScalar(radius)),target);}
  function arrow(c,which){freeOrbit(c);const delta={l:[-Math.PI/6,0],r:[Math.PI/6,0],u:[0,-Math.PI/6],d:[0,Math.PI/6]}[which],ctl=controls(c),cam=camera(c);if(!delta||!ctl||!cam||!window.THREE)return;const target=ctl.target.clone(),sph=new THREE.Spherical().setFromVector3(cam.position.clone().sub(target));sph.theta+=delta[0];sph.phi=THREE.MathUtils.clamp(sph.phi+delta[1],.00001,Math.PI-.00001);tweenCamera(c,new THREE.Vector3().setFromSpherical(sph).add(target),target);}
  function wire(c){if(patched.has(c))return;const ctl=controls(c);if(!ctl)return;patched.add(c);const root=c.querySelector('.cad-final-ui')||c;root.querySelector('.cad-arrow-l')?.addEventListener('click',()=>arrow(c,'l'));root.querySelector('.cad-arrow-r')?.addEventListener('click',()=>arrow(c,'r'));root.querySelector('.cad-arrow-u')?.addEventListener('click',()=>arrow(c,'u'));root.querySelector('.cad-arrow-d')?.addEventListener('click',()=>arrow(c,'d'));c.addEventListener('pointerdown',e=>{const el=e.target.closest?.('[data-view-face],[data-viewcube-face],.viewcube-face,.view-cube-face,.cube-face');if(!el)return;const label=((el.getAttribute('data-view-face')||el.getAttribute('data-viewcube-face')||el.textContent||'')+'').trim().toLowerCase(),hit=['front','back','top','bottom','left','right'].find(n=>label===n||label.includes(n));if(hit)setTimeout(()=>standardView(c,hit),0);},true);}
  function loop(){containers().forEach(c=>{freeOrbit(c);centreCube(c);wire(c);});requestAnimationFrame(loop);}
  css();loop();
})();
