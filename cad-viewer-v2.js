/* Fusion-style CAD viewer v2 override. Loaded after cad-viewer-fixes.js. */
(function () {
  'use strict';

  const STYLE_ID = 'cad-fusion-v2-css';
  const CUBE_SIZE = 112;
  const CUBE_TOP = 58;
  const CUBE_RIGHT = 12;
  const instances = new WeakMap();

  function css() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      [id$="ViewerContainer"] .cad-final-toolbar{top:10px!important;right:10px!important;gap:6px!important;z-index:1000!important;}
      [id$="ViewerContainer"] .cad-final-toolbar button{position:relative;z-index:1001;}
      [id$="ViewerContainer"] .cad-final-layers{top:50px!important;right:calc(${CUBE_SIZE}px + 24px)!important;width:240px!important;max-width:min(240px,calc(100% - ${CUBE_SIZE + 42}px))!important;z-index:1100!important;}
      .cad-fusion-v2-cube{position:absolute!important;top:${CUBE_TOP}px!important;right:${CUBE_RIGHT}px!important;width:${CUBE_SIZE}px!important;height:${CUBE_SIZE}px!important;z-index:900!important;pointer-events:auto!important;}
      .cad-fusion-v2-cube canvas{display:block!important;width:100%!important;height:100%!important;}
      .cad-fusion-v2-home{position:absolute;left:-3px;top:-3px;width:25px;height:25px;border:1px solid #b9b9b7;background:#fff;color:#343434;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.18);z-index:3;}
      .cad-fusion-v2-home:hover{background:#f5f5f5;}
      .cad-fusion-v2-home svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
      .cad-fusion-v2-arrows{position:absolute;right:-3px;top:-3px;width:58px;height:58px;pointer-events:none;z-index:3;}
      .cad-fusion-v2-arrows button{position:absolute;border:0;background:transparent;padding:0;width:28px;height:28px;pointer-events:auto;cursor:pointer;color:#7f7f7d;}
      .cad-fusion-v2-arrows button:hover{color:#202020;}
      .cad-fusion-v2-arrows svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
      .cad-fusion-v2-arrows .ccw{left:0;top:0}.cad-fusion-v2-arrows .cw{right:0;top:0}
      @media(max-width:700px){.cad-fusion-v2-cube{transform:scale(.9);transform-origin:top right;}[id$="ViewerContainer"] .cad-final-layers{right:12px!important;top:50px!important;max-width:calc(100% - 24px)!important;}}
    `;
    document.head.appendChild(s);
  }

  function getCamera(c) { return c.__cadCamera || null; }
  function getControls(c) { return c.__cadControls || null; }
  function getCenter(c) { const controls=getControls(c), camera=getCamera(c); if(controls?.target) return controls.target.clone(); if(camera?.userData.modelCenter) return camera.userData.modelCenter.clone(); return new THREE.Vector3(); }
  function stopTween(c) { const st=instances.get(c); if(st?.raf) cancelAnimationFrame(st.raf); if(st) st.raf=null; }

  function animateCamera(c, position, up, target, duration=500) {
    const camera=getCamera(c), controls=getControls(c); if(!camera) return; stopTween(c);
    const startPos=camera.position.clone(), startUp=camera.up.clone(), startTarget=controls?controls.target.clone():target.clone();
    const ms=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:duration, start=performance.now();
    if(controls) controls.enabled=false;
    const st=instances.get(c)||{}; const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const tick=now=>{const raw=Math.min(1,(now-start)/ms),t=ease(raw); camera.position.lerpVectors(startPos,position,t); camera.up.lerpVectors(startUp,up,t).normalize(); const nextTarget=startTarget.clone().lerp(target,t); camera.lookAt(nextTarget); if(controls){controls.target.copy(nextTarget);controls.update();} if(raw<1)st.raf=requestAnimationFrame(tick);else{st.raf=null;camera.position.copy(position);camera.up.copy(up).normalize();camera.lookAt(target);if(controls){controls.target.copy(target);controls.enabled=true;controls.update();}}};
    instances.set(c,st); st.raf=requestAnimationFrame(tick);
  }

  function fitDistance(c) { const camera=getCamera(c), center=getCenter(c); return camera?.userData.homePosition ? camera.userData.homePosition.distanceTo(center) : Math.max(camera?.position.distanceTo(center)||10,1); }
  const views={
    FRONT:{dir:new THREE.Vector3(0,0,1),up:new THREE.Vector3(0,1,0)},
    BACK:{dir:new THREE.Vector3(0,0,-1),up:new THREE.Vector3(0,1,0)},
    RIGHT:{dir:new THREE.Vector3(1,0,0),up:new THREE.Vector3(0,1,0)},
    LEFT:{dir:new THREE.Vector3(-1,0,0),up:new THREE.Vector3(0,1,0)},
    TOP:{dir:new THREE.Vector3(0,1,0),up:new THREE.Vector3(0,0,-1)},
    BOTTOM:{dir:new THREE.Vector3(0,-1,0),up:new THREE.Vector3(0,0,1)}
  };
  function view(c,name){const v=views[name];if(!v)return;const target=getCenter(c),d=fitDistance(c);animateCamera(c,target.clone().add(v.dir.clone().multiplyScalar(d)),v.up,target);}
  function home(c){const camera=getCamera(c);if(!camera)return;const target=camera.userData.homeTarget?.clone()||getCenter(c),position=camera.userData.homePosition?.clone();if(!position)return view(c,'FRONT');animateCamera(c,position,camera.userData.homeUp?.clone()||new THREE.Vector3(0,1,0),target);}
  function roll(c,direction){const camera=getCamera(c),controls=getControls(c);if(!camera)return;const target=controls?.target?.clone()||getCenter(c),axis=camera.getWorldDirection(new THREE.Vector3()),q=new THREE.Quaternion().setFromAxisAngle(axis,direction*Math.PI/2);camera.up.copy(camera.up.clone().applyQuaternion(q).normalize());camera.lookAt(target);if(controls)controls.update();}

  function makeTexture(label,active=false){const cv=document.createElement('canvas');cv.width=cv.height=160;const x=cv.getContext('2d');x.fillStyle=active?'#dcecff':'#e7e7e5';x.fillRect(0,0,160,160);x.strokeStyle='#a8a8a6';x.lineWidth=3;x.strokeRect(2,2,156,156);x.fillStyle='#4c4c4a';x.font='700 18px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(label,80,80);return new THREE.CanvasTexture(cv);}

  function createCube(c){
    if(!window.THREE||!getCamera(c))return;
    c.querySelectorAll('div[style*="width: 104px"]').forEach(el=>{el.style.display='none';});
    const old=c.querySelector('.cad-fusion-v2-cube');if(old)old.remove();
    const wrap=document.createElement('div');wrap.className='cad-fusion-v2-cube';c.appendChild(wrap);
    const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera(-2.15,2.15,2.15,-2.15,.1,20);camera.position.set(0,0,6);
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(CUBE_SIZE,CUBE_SIZE,false);renderer.domElement.style.cursor='pointer';wrap.appendChild(renderer.domElement);
    const labels=['RIGHT','LEFT','TOP','BOTTOM','FRONT','BACK'],mats=labels.map(x=>new THREE.MeshBasicMaterial({map:makeTexture(x)}));
    const cube=new THREE.Mesh(new THREE.BoxGeometry(2.3,2.3,2.3),mats);scene.add(cube);scene.add(new THREE.AmbientLight(0xffffff,1));
    const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let hover=-1;
    function pick(e){const r=renderer.domElement.getBoundingClientRect();ndc.x=((e.clientX-r.left)/r.width)*2-1;ndc.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(ndc,camera);const hit=ray.intersectObject(cube)[0];return hit?hit.face.materialIndex:-1;}
    function setHover(i){hover=i;for(let j=0;j<mats.length;j++){if(mats[j].map)mats[j].map.dispose();mats[j].map=makeTexture(labels[j],j===hover);mats[j].needsUpdate=true;}}
    renderer.domElement.addEventListener('pointermove',e=>setHover(pick(e)));renderer.domElement.addEventListener('pointerleave',()=>setHover(-1));renderer.domElement.addEventListener('click',e=>{const i=pick(e);if(i>=0)view(c,labels[i]);});
    const homeBtn=document.createElement('button');homeBtn.className='cad-fusion-v2-home';homeBtn.title='Home view';homeBtn.setAttribute('aria-label','Home view');homeBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></svg>';homeBtn.onclick=e=>{e.stopPropagation();home(c);};wrap.appendChild(homeBtn);
    const arrows=document.createElement('div');arrows.className='cad-fusion-v2-arrows';arrows.innerHTML='<button class="ccw" title="Roll counter-clockwise" aria-label="Roll counter-clockwise"><svg viewBox="0 0 28 28"><path d="M23 15a9 9 0 1 1-5-8"/><path d="m17 3 1 4-4-1"/></svg></button><button class="cw" title="Roll clockwise" aria-label="Roll clockwise"><svg viewBox="0 0 28 28"><path d="M5 15a9 9 0 1 0 5-8"/><path d="m11 3-1 4 4-1"/></svg></button>';wrap.appendChild(arrows);arrows.querySelector('.ccw').onclick=e=>{e.stopPropagation();roll(c,-1);};arrows.querySelector('.cw').onclick=e=>{e.stopPropagation();roll(c,1);};
    const st={wrap,scene,camera,renderer,cube,raf:null};instances.set(c,st);
    const render=()=>{st.raf=requestAnimationFrame(render);const main=getCamera(c);if(!main)return;cube.quaternion.copy(main.quaternion).invert();renderer.render(scene,camera);};render();
  }

  function hardenControls(c){const camera=getCamera(c),controls=getControls(c);if(!camera||!controls)return;controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;controls.enableDamping=true;controls.dampingFactor=.08;controls.rotateSpeed=.75;controls.zoomSpeed=.9;controls.panSpeed=.8;controls.screenSpacePanning=false;controls.minPolarAngle=.000001;controls.maxPolarAngle=Math.PI-.000001;controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.minDistance=Math.max(controls.minDistance||.001,.001);controls.maxDistance=Infinity;camera.userData.homeUp=camera.userData.homeUp||camera.up.clone();controls.update();}
  function setupShield(c){const shield=c.querySelector('.cad-final-shield');if(!shield)return;shield.onclick=e=>{e.stopPropagation();shield.classList.add('hidden');};shield.onwheel=null;const toolbar=c.querySelector('.cad-final-toolbar');if(toolbar)toolbar.querySelectorAll('button').forEach(b=>b.addEventListener('click',e=>e.stopPropagation(),true));}
  function scan(c){if(!c||!getCamera(c)||!getControls(c))return;hardenControls(c);setupShield(c);createCube(c);}
  function scanAll(){document.querySelectorAll('[id$="ViewerContainer"]').forEach(scan);}
  css();scanAll();window.addEventListener('load',()=>{scanAll();setTimeout(scanAll,250);setTimeout(scanAll,1000);});window.addEventListener('resize',scanAll,{passive:true});new MutationObserver(()=>scanAll()).observe(document.body,{childList:true,subtree:true});
})();
