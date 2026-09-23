/* CAD viewer v3 - stable navigation layer. Avoids global MutationObserver loops. */
(function () {
  'use strict';
  const STYLE_ID='cad-fusion-v3-css', CUBE_SIZE=112, CUBE_TOP=58, CUBE_RIGHT=12;
  const instances=new WeakMap();

  function addCss(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=`
      [id$="ViewerContainer"] .cad-final-toolbar{top:10px!important;right:10px!important;z-index:1000!important}
      [id$="ViewerContainer"] .cad-final-layers{top:50px!important;right:calc(${CUBE_SIZE}px + 24px)!important;width:240px!important;max-width:min(240px,calc(100% - ${CUBE_SIZE+42}px))!important;z-index:1100!important}
      [id$="ViewerContainer"] .cad-final-shield{background:rgba(0,0,0,.68)!important;align-items:center!important;justify-content:center!important;padding:0!important}
      [id$="ViewerContainer"] .cad-final-shield span{background:#111!important;border:1px solid #555!important;color:#eee!important;padding:10px 14px!important;box-shadow:0 8px 30px rgba(0,0,0,.5)!important}
      .cad-fusion-v3-cube{position:absolute!important;top:${CUBE_TOP}px!important;right:${CUBE_RIGHT}px!important;width:${CUBE_SIZE}px!important;height:${CUBE_SIZE}px!important;z-index:900!important;pointer-events:auto!important}
      .cad-fusion-v3-cube canvas{display:block!important;width:100%!important;height:100%!important}
      .cad-fusion-v3-home{position:absolute;left:-3px;top:-3px;width:25px;height:25px;border:1px solid #aaa;background:#fff;color:#222;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.2);z-index:5}
      .cad-fusion-v3-home svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .cad-fusion-v3-arrows{position:absolute;right:-8px;top:-8px;width:64px;height:64px;pointer-events:none;z-index:6}
      .cad-fusion-v3-arrows button{position:absolute;width:30px;height:30px;border:0;background:transparent;color:#70706e;padding:0;pointer-events:auto;cursor:pointer}
      .cad-fusion-v3-arrows button:hover{color:#111}.cad-fusion-v3-arrows svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .cad-fusion-v3-arrows .ccw{left:0;top:0}.cad-fusion-v3-arrows .cw{right:0;top:0}
      [id$="ViewerContainer"]:fullscreen .cad-final-toolbar{top:14px!important;right:14px!important}
      [id$="ViewerContainer"]:fullscreen .cad-final-layers{top:54px!important;right:calc(${CUBE_SIZE}px + 28px)!important}
      @media(max-width:700px){[id$="ViewerContainer"] .cad-final-layers{right:12px!important;top:50px!important;max-width:calc(100% - 24px)!important}.cad-fusion-v3-cube{transform:scale(.9);transform-origin:top right}}
    `;
    document.head.appendChild(s);
  }

  function cam(c){return c.__cadCamera||null}
  function ctl(c){return c.__cadControls||null}
  function center(c){const q=ctl(c),a=cam(c);if(q?.target)return q.target.clone();if(a?.userData?.modelCenter)return a.userData.modelCenter.clone();return new THREE.Vector3()}

  function expose(){
    if(!window.THREE||!THREE.OrbitControls||THREE.OrbitControls.__cadWrapped)return;
    const Original=THREE.OrbitControls;
    function Wrapped(camera,dom){const controls=new Original(camera,dom),c=dom?.closest?.('[id$="ViewerContainer"]');if(c){c.__cadCamera=camera;c.__cadControls=controls}return controls}
    Wrapped.__cadWrapped=true; THREE.OrbitControls=Wrapped;
  }

  function loadTrackball(){
    if(!window.THREE||THREE.TrackballControls||document.getElementById('cad-trackball-script'))return;
    const s=document.createElement('script'); s.id='cad-trackball-script';
    s.src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TrackballControls.js';
    s.onload=()=>{
      if(!THREE.TrackballControls||THREE.OrbitControls?.__cadTrackballWrapped)return;
      function CadControls(camera,dom){
        const controls=new THREE.TrackballControls(camera,dom),c=dom?.closest?.('[id$="ViewerContainer"]');
        controls.rotateSpeed=2;controls.zoomSpeed=1.15;controls.panSpeed=.8;controls.dynamicDampingFactor=.12;controls.staticMoving=false;
        if(c){c.__cadCamera=camera;c.__cadControls=controls}return controls;
      }
      CadControls.__cadWrapped=true;CadControls.__cadTrackballWrapped=true;THREE.OrbitControls=CadControls;
    };
    document.head.appendChild(s);
  }

  function resize(c){const a=cam(c);if(!a)return;const r=c.getBoundingClientRect();if(r.width<2||r.height<2)return;a.aspect=r.width/r.height;a.updateProjectionMatrix()}
  function harden(c){
    const a=cam(c),q=ctl(c);if(!a||!q)return false;c.__cadCamera=a;c.__cadControls=q;
    if('staticMoving' in q){q.staticMoving=false;q.dynamicDampingFactor=.12;q.rotateSpeed=2;q.zoomSpeed=1.15;q.panSpeed=.8}
    else{q.enableRotate=true;q.enablePan=true;q.enableZoom=true;q.enableDamping=true;q.dampingFactor=.075;q.rotateSpeed=.85;q.zoomSpeed=.9;q.panSpeed=.8;q.screenSpacePanning=false;q.minPolarAngle=0;q.maxPolarAngle=Math.PI;q.minAzimuthAngle=-Infinity;q.maxAzimuthAngle=Infinity;q.minDistance=.001;q.maxDistance=Infinity}
    if(!q.target)q.target=center(c);a.userData.modelCenter=a.userData.modelCenter||q.target.clone();a.userData.homePosition=a.userData.homePosition||a.position.clone();a.userData.homeTarget=a.userData.homeTarget||q.target.clone();q.update?.();resize(c);return true;
  }

  const views={FRONT:{dir:new THREE.Vector3(0,0,1),up:new THREE.Vector3(0,1,0)},BACK:{dir:new THREE.Vector3(0,0,-1),up:new THREE.Vector3(0,1,0)},RIGHT:{dir:new THREE.Vector3(1,0,0),up:new THREE.Vector3(0,1,0)},LEFT:{dir:new THREE.Vector3(-1,0,0),up:new THREE.Vector3(0,1,0)},TOP:{dir:new THREE.Vector3(0,1,0),up:new THREE.Vector3(0,0,-1)},BOTTOM:{dir:new THREE.Vector3(0,-1,0),up:new THREE.Vector3(0,0,1)}};
  function stop(c){const s=instances.get(c);if(s?.tween)cancelAnimationFrame(s.tween);if(s)s.tween=null}
  function tween(c,pos,up,target,duration=520){
    const a=cam(c),q=ctl(c);if(!a)return;stop(c);const s=instances.get(c)||{};instances.set(c,s);const sp=a.position.clone(),su=a.up.clone(),st=q?.target?.clone()||target.clone(),ms=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:duration,start=performance.now();if(q)q.enabled=false;
    const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const tick=now=>{const raw=Math.min(1,(now-start)/ms),e=ease(raw);a.position.lerpVectors(sp,pos,e);a.up.lerpVectors(su,up,e).normalize();const nt=st.clone().lerp(target,e);a.lookAt(nt);if(q){q.target.copy(nt);q.update?.()}if(raw<1)s.tween=requestAnimationFrame(tick);else{s.tween=null;a.position.copy(pos);a.up.copy(up).normalize();a.lookAt(target);if(q){q.target.copy(target);q.enabled=true;q.update?.()}}};
    s.tween=requestAnimationFrame(tick);
  }
  function distance(c){const a=cam(c),t=center(c);return Math.max(a?.userData?.homePosition?.distanceTo(t)||a?.position.distanceTo(t)||10,.01)}
  function view(c,name){const v=views[name];if(!v)return;const t=center(c),d=distance(c);tween(c,t.clone().add(v.dir.clone().multiplyScalar(d)),v.up,t)}
  function home(c){const a=cam(c);if(!a)return;const t=a.userData.homeTarget?.clone()||center(c),p=a.userData.homePosition?.clone();p?tween(c,p,a.userData.homeUp?.clone()||new THREE.Vector3(0,1,0),t):view(c,'FRONT')}
  function roll(c,dir){const a=cam(c),q=ctl(c);if(!a)return;const t=q?.target?.clone()||center(c),axis=a.getWorldDirection(new THREE.Vector3()),rot=new THREE.Quaternion().setFromAxisAngle(axis,dir*Math.PI/2),up=a.up.clone().applyQuaternion(rot).normalize();tween(c,a.position.clone(),up,t,360)}
  function texture(label,active){const cv=document.createElement('canvas');cv.width=cv.height=160;const x=cv.getContext('2d');x.fillStyle=active?'#d9e9fb':'#e7e7e5';x.fillRect(0,0,160,160);x.strokeStyle='#999997';x.lineWidth=3;x.strokeRect(2,2,156,156);x.fillStyle='#343432';x.font='700 18px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(label,80,80);return new THREE.CanvasTexture(cv)}

  function cube(c){
    if(!cam(c)||c.querySelector('.cad-fusion-v3-cube'))return;
    const wrap=document.createElement('div');wrap.className='cad-fusion-v3-cube';c.appendChild(wrap);
    const scene=new THREE.Scene(),cc=new THREE.OrthographicCamera(-2.15,2.15,2.15,-2.15,.1,20);cc.position.set(0,0,6);
    const r=new THREE.WebGLRenderer({alpha:true,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.setSize(CUBE_SIZE,CUBE_SIZE,false);r.domElement.style.cursor='pointer';wrap.appendChild(r.domElement);
    const labels=['RIGHT','LEFT','TOP','BOTTOM','FRONT','BACK'],m=labels.map(x=>new THREE.MeshBasicMaterial({map:texture(x,false)})),mesh=new THREE.Mesh(new THREE.BoxGeometry(2.3,2.3,2.3),m);scene.add(mesh);scene.add(new THREE.AmbientLight(0xffffff,1.2));
    const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
    const pick=e=>{const b=r.domElement.getBoundingClientRect();ndc.x=((e.clientX-b.left)/b.width)*2-1;ndc.y=-((e.clientY-b.top)/b.height)*2+1;ray.setFromCamera(ndc,cc);const hit=ray.intersectObject(mesh)[0];return hit?hit.face.materialIndex:-1};
    const repaint=i=>m.forEach((x,j)=>{if(x.map)x.map.dispose();x.map=texture(labels[j],j===i);x.needsUpdate=true});
    r.domElement.addEventListener('pointermove',e=>repaint(pick(e)));r.domElement.addEventListener('pointerleave',()=>repaint(-1));r.domElement.addEventListener('click',e=>{const i=pick(e);if(i>=0)view(c,labels[i])});
    const hb=document.createElement('button');hb.className='cad-fusion-v3-home';hb.title='Home view';hb.setAttribute('aria-label','Home view');hb.innerHTML='<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></svg>';hb.onclick=e=>{e.stopPropagation();home(c)};wrap.appendChild(hb);
    const ar=document.createElement('div');ar.className='cad-fusion-v3-arrows';ar.innerHTML='<button class="ccw" title="Roll counter-clockwise" aria-label="Roll counter-clockwise"><svg viewBox="0 0 30 30"><path d="M24 16a10 10 0 1 1-6-9"/><path d="m18 4 1 5-5-1"/></svg></button><button class="cw" title="Roll clockwise" aria-label="Roll clockwise"><svg viewBox="0 0 30 30"><path d="M6 16a10 10 0 1 0 6-9"/><path d="m12 4-1 5 5-1"/></svg></button>';wrap.appendChild(ar);ar.querySelector('.ccw').onclick=e=>{e.stopPropagation();roll(c,-1)};ar.querySelector('.cw').onclick=e=>{e.stopPropagation();roll(c,1)};
    const st=instances.get(c)||{};instances.set(c,st);const draw=()=>{const main=cam(c);if(!main)return;mesh.quaternion.copy(main.quaternion).invert();r.render(scene,cc);st.cubeFrame=requestAnimationFrame(draw)};draw();
  }
  function shield(c){const s=c.querySelector('.cad-final-shield');if(!s||s.dataset.v3)return;s.dataset.v3='1';s.onclick=e=>{e.stopPropagation();s.classList.add('hidden')};s.onwheel=e=>e.stopPropagation();document.addEventListener('pointerdown',e=>{if(!c.contains(e.target))s.classList.remove('hidden')},{passive:true})}
  function scan(c){if(!c)return;harden(c);shield(c);cube(c);resize(c)}

  function navigation(){
    const detail=document.getElementById('projectDetailView'),feed=document.getElementById('feedView'),btn=document.getElementById('projectDetailBackProjectList');
    if(btn&&(!detail||!detail.classList.contains('open')))btn.style.display='none';
    if(!window.__cadOpenProjectWrapped&&typeof window.openProject==='function'){
      const original=window.openProject;
      window.openProject=function(){
        const shell=document.getElementById('projectDetailView');if(shell){shell.classList.remove('closing');shell.innerHTML=''}
        const result=original.apply(this,arguments);
        setTimeout(()=>document.querySelectorAll('[id$="ViewerContainer"]').forEach(scan),50);
        return result;
      };window.__cadOpenProjectWrapped=true;
    }
    if(!window.__cadCloseProjectWrapped&&typeof window.closeProject==='function'){
      const original=window.closeProject;window.closeProject=function(){const result=original.apply(this,arguments);setTimeout(()=>{const b=document.getElementById('projectDetailBackProjectList'),d=document.getElementById('projectDetailView');if(b&&(!d||!d.classList.contains('open')))b.style.display='none'},50);return result};window.__cadCloseProjectWrapped=true;
    }
    if(!window.__cadHomelabWrapped&&typeof window.openHomelabPage==='function'){
      const original=window.openHomelabPage;window.openHomelabPage=function(){const result=original.apply(this,arguments);setTimeout(()=>document.getElementById('projectDetailBackProjectList')?.style.setProperty('display','none','important'),0);return result};window.__cadHomelabWrapped=true;
    }
    if(feed&&getComputedStyle(feed).display!=='none')document.getElementById('projectDetailBackProjectList')?.style.setProperty('display','none','important');
  }
  function sortTools(){const box=document.getElementById('toolchain-container');if(!box)return;[...box.children].sort((a,b)=>a.textContent.trim().localeCompare(b.textContent.trim(),undefined,{sensitivity:'base'})).forEach(x=>box.appendChild(x))}
  function alignCareer(){const tl=document.getElementById('experienceTimelineSidebar'),head=document.querySelector('#experienceSection .experience-section-head .scan-header'),homeEl=document.getElementById('homelabSidebarSection');if(!tl||!head||innerWidth<768)return;if(homeEl)homeEl.style.paddingBottom='18px';tl.style.marginTop=`${head.getBoundingClientRect().bottom-tl.getBoundingClientRect().top}px`}
  function rename(){document.querySelectorAll('#experienceTimelineSidebar p').forEach(p=>{if(p.textContent.trim()==='Experience Timeline')p.textContent='Career Timeline'})}
  function pass(){if(window.THREE){expose();loadTrackball();document.querySelectorAll('[id$="ViewerContainer"]').forEach(scan)}sortTools();rename();alignCareer();navigation()}

  addCss();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pass,{once:true});else pass();
  window.addEventListener('load',()=>{pass();setTimeout(pass,300);setTimeout(pass,1000)},{passive:true});
  window.addEventListener('resize',()=>{document.querySelectorAll('[id$="ViewerContainer"]').forEach(resize);alignCareer()},{passive:true});
})();
