/* Suber Abdi portfolio — contained CAD viewer.
 * Uses the site's existing Three.js r128 build so it does not fight the rest of the portfolio.
 * The controller owns its canvas, controls, ViewCube, layer UI and fullscreen state.
 */
(function () {
  'use strict';

  if (!window.THREE || !THREE.OrbitControls || !THREE.GLTFLoader) return;

  const MODEL_URLS = {
    assembly: 'https://raw.githubusercontent.com/SuberBAbdi/DAC-using-PIC16F877A-Temperature-Scanner/main/3D%20and%202D%20Models%20/3D%20Model%20of%20PCB/Temperature%20Checker%20with%20a%20DAC.glb',
    cover: 'https://raw.githubusercontent.com/SuberBAbdi/DAC-using-PIC16F877A-Temperature-Scanner/main/3D%20and%202D%20Models%20/3D%20Model%20of%20PCB/Cover%20Body.glb',
    lower: 'https://raw.githubusercontent.com/SuberBAbdi/DAC-using-PIC16F877A-Temperature-Scanner/main/3D%20and%202D%20Models%20/3D%20Model%20of%20PCB/Lower%20Body.glb'
  };

  const INSTANCES = new WeakMap();
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ICON = {
    layers: '<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
    expand: '<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/><path d="m3 8 5-5M16 3l5 5M3 16l5 5M21 16l-5 5"/></svg>',
    shrink: '<svg viewBox="0 0 24 24"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M21 15h-6v6"/></svg>',
    mouse: '<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v6a6 6 0 0 0 12 0V9a6 6 0 0 0-6-6Z"/><path d="M12 3v7M9 7h6"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>'
  };

  function css() {
    if (document.getElementById('contained-cad-viewer-css')) return;
    const s = document.createElement('style');
    s.id = 'contained-cad-viewer-css';
    s.textContent = `
      .cadx-root{position:absolute!important;inset:0!important;z-index:50!important;overflow:hidden;background:#e8e9e7;font-family:Arial,Helvetica,sans-serif}
      .cadx-canvas{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab}
      .cadx-canvas:active{cursor:grabbing}.cadx-canvas canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block}
      .cadx-toolbar{position:absolute;right:12px;top:12px;display:flex;gap:6px;z-index:80}
      .cadx-btn{width:34px;height:34px;padding:0;border:1px solid #b9bab8;background:rgba(255,255,255,.96);color:#222;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.18)}
      .cadx-btn:hover{background:#fff;border-color:#777}.cadx-btn svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .cadx-layers{position:absolute;right:206px;top:54px;width:238px;max-height:min(420px,calc(100% - 72px));overflow:auto;padding:8px;background:#111214;border:1px solid #3d3f41;box-shadow:0 12px 30px rgba(0,0,0,.35);z-index:90;color:#c8c9c9;display:none}
      .cadx-layers.open{display:block}.cadx-layer-title{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#85878a;padding:5px 6px 9px;border-bottom:1px solid #292b2d;margin-bottom:3px}
      .cadx-layer{display:flex;align-items:center;gap:8px;padding:8px 6px;font-size:11px;cursor:pointer}.cadx-layer:hover{background:#1a1b1d;color:#fff}.cadx-layer input{accent-color:#ddd}.cadx-empty{font-size:11px;color:#777;padding:10px 6px}
      .cadx-shield{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;color:#fff}.cadx-shield.hidden{display:none}.cadx-shield button{border:1px solid #777;background:#111;color:#fff;padding:10px 14px;font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;display:flex;gap:8px;align-items:center;cursor:pointer}.cadx-shield svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .cadx-nav{position:absolute;right:7px;top:54px;width:204px;height:230px;z-index:75;pointer-events:none}
      .cadx-cube{position:absolute;left:43px;top:54px;width:118px;height:118px;pointer-events:auto;filter:drop-shadow(0 2px 3px rgba(0,0,0,.22))}
      .cadx-cube canvas{width:118px!important;height:118px!important;display:block;cursor:pointer}
      .cadx-arrow,.cadx-roll,.cadx-home{position:absolute;width:30px;height:30px;border:1px solid #b9bab8;background:rgba(255,255,255,.96);color:#555;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;pointer-events:auto;box-shadow:0 1px 3px rgba(0,0,0,.16);font:20px Arial,sans-serif}
      .cadx-arrow:hover,.cadx-roll:hover,.cadx-home:hover{color:#111;background:#fff;border-color:#777}.cadx-arrow{font-size:22px}
      .cadx-toolbar .cadx-home{position:static;width:34px;height:34px;font-size:inherit;box-shadow:0 1px 4px rgba(0,0,0,.18)}
      .cadx-left{left:1px;top:101px}.cadx-right{right:1px;top:101px}.cadx-up{left:87px;top:32px}.cadx-down{left:87px;bottom:1px}
      .cadx-roll-left{left:22px;top:25px}.cadx-roll-right{right:22px;top:25px}
      .cadx-roll svg,.cadx-home svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .cadx-status{position:absolute;left:12px;bottom:12px;z-index:70;padding:7px 9px;background:rgba(255,255,255,.88);border:1px solid #c8c9c7;color:#555;font-size:10px;letter-spacing:.06em;text-transform:uppercase;display:none}.cadx-status.show{display:block}
      .cadx-progress{position:absolute;left:12px;right:12px;bottom:0;height:3px;background:#c9cac8;z-index:71;overflow:hidden;display:none}.cadx-progress.show{display:block}.cadx-progress i{display:block;width:0;height:100%;background:#555;transition:width .12s linear}
      .cadx-root:fullscreen{background:#e8e9e7}.cadx-root:fullscreen .cadx-toolbar{right:16px;top:16px}.cadx-root:fullscreen .cadx-nav{right:12px;top:64px}
      @media(max-width:700px){.cadx-nav{transform:scale(.9);transform-origin:top right}.cadx-layers{right:84px;width:215px}.cadx-toolbar{right:8px;top:8px}.cadx-btn{width:32px;height:32px}.cadx-toolbar .cadx-home{width:32px;height:32px}}
    `;
    document.head.appendChild(s);
  }

  function dispose(root) {
    if (!root) return;
    root.traverse?.(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (m.map) m.map.dispose(); if (m.normalMap) m.normalMap.dispose(); if (m.roughnessMap) m.roughnessMap.dispose(); if (m.metalnessMap) m.metalnessMap.dispose(); m.dispose();
      });
    });
  }

  function labelTexture(text) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const x = c.getContext('2d'); x.clearRect(0,0,c.width,c.height); x.fillStyle='#202124'; x.font='bold 34px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(text,c.width/2,c.height/2);
    const t = new THREE.CanvasTexture(c); t.needsUpdate=true; return t;
  }

  class CadViewer {
    constructor(container) {
      this.container = container; this.models = {}; this.center = new THREE.Vector3(); this.radius = 1; this.distance = 5; this.active = false; this.cubeQuaternion = new THREE.Quaternion(); this.anim = null; this.cubeAnim = null; this.destroyed = false;
      this.init();
    }

    init() {
      css(); this.removeLegacyChrome(); this.stopOldViewer();
      this.container.style.position='relative'; this.container.style.overflow='hidden';
      this.root=document.createElement('div'); this.root.className='cadx-root';
      this.canvasWrap=document.createElement('div'); this.canvasWrap.className='cadx-canvas';
      this.root.appendChild(this.canvasWrap);
      this.status=document.createElement('div'); this.status.className='cadx-status'; this.root.appendChild(this.status);
      this.progress=document.createElement('div'); this.progress.className='cadx-progress'; this.progress.innerHTML='<i></i>'; this.root.appendChild(this.progress);
      this.container.innerHTML=''; this.container.appendChild(this.root); this.buildToolbar(); this.buildNav(); this.buildShield();

      this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); this.renderer.setClearColor(0xe8e9e7,1); this.renderer.outputEncoding=THREE.sRGBEncoding;
      this.canvasWrap.appendChild(this.renderer.domElement);
      this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.setStatus('WebGL paused — restoring…');});
      this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.setStatus('Restored');this.resize();this.loadAll();});

      this.scene=new THREE.Scene(); this.scene.background=new THREE.Color(0xe8e9e7);
      this.camera=new THREE.PerspectiveCamera(35,1,.01,100000); this.camera.position.set(4,4,4);
      this.controls=new THREE.OrbitControls(this.camera,this.renderer.domElement); this.controls.enableDamping=true; this.controls.dampingFactor=.075; this.controls.enablePan=true; this.controls.screenSpacePanning=true; this.controls.minPolarAngle=.0001; this.controls.maxPolarAngle=Math.PI-.0001; this.controls.rotateSpeed=.75; this.controls.zoomSpeed=.85; this.controls.panSpeed=.8;
      this.scene.add(new THREE.HemisphereLight(0xffffff,0x6d7378,1.35)); const key=new THREE.DirectionalLight(0xffffff,1.25); key.position.set(5,8,6); this.scene.add(key); const fill=new THREE.DirectionalLight(0xbcc7d2,.65); fill.position.set(-5,3,-4); this.scene.add(fill);
      this.modelRoot=new THREE.Group(); this.scene.add(this.modelRoot);
      this.buildCube(); this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(this.container); window.addEventListener('resize',this.onResize=()=>this.resize());
      this.loadAll(); this.loop(); this.activateShield();
    }

    stopOldViewer(){
      try{const reg=window.viewer3DInstances||{};Object.keys(reg).forEach(k=>{try{reg[k]?.dispose?.()}catch(_){}});}catch(_){ }
      this.container.querySelectorAll('canvas').forEach(c=>c.remove());
      this.container.querySelectorAll('[class*="viewer"],[class*="Viewer"]').forEach(el=>{if(el!==this.container&&!el.closest('.cadx-root')){try{el.remove()}catch(_){}}});
    }

    removeLegacyChrome(){
      const all=[...document.querySelectorAll('body *')];
      all.forEach(el=>{if(el.closest('#stlViewerContainer'))return;const text=(el.textContent||'').replace(/\s+/g,' ').trim();if(text==='3D GLB View'||text==='3D GLB Viewer'){const parent=el.parentElement;if(parent&&parent!==document.body){parent.style.display='none';}}});
    }

    buildToolbar(){
      const bar=document.createElement('div');bar.className='cadx-toolbar';this.toolbar=bar;
      this.filterBtn=this.button(ICON.layers,'Model layers');this.fullBtn=this.button(ICON.expand,'Fullscreen');
      this.homeBtn=this.button(ICON.home,'Home / fit');this.homeBtn.classList.add('cadx-home');
      bar.append(this.filterBtn,this.fullBtn,this.homeBtn);this.root.appendChild(bar);
      this.layerPanel=document.createElement('div');this.layerPanel.className='cadx-layers';this.layerPanel.innerHTML='<div class="cadx-layer-title">Model layers</div><div class="cadx-layer-list"></div>';this.root.appendChild(this.layerPanel);this.layerList=this.layerPanel.querySelector('.cadx-layer-list');
      this.filterBtn.onclick=e=>{e.stopPropagation();this.layerPanel.classList.toggle('open');this.renderLayers();};this.fullBtn.onclick=e=>{e.stopPropagation();this.toggleFullscreen();};this.homeBtn.onclick=e=>{e.stopPropagation();this.home();};
    }

    button(html,label){const b=document.createElement('button');b.type='button';b.className='cadx-btn';b.innerHTML=html;b.title=label;b.setAttribute('aria-label',label);return b;}

    buildShield(){
      this.shield=document.createElement('div');this.shield.className='cadx-shield';this.shield.innerHTML='<button type="button">'+ICON.mouse+' Click to Interact</button>';this.canvasWrap.appendChild(this.shield);
      this.shield.querySelector('button').onclick=e=>{e.stopPropagation();this.activate();};
      this.outside = e => { if (this.destroyed) return; if (!this.root.contains(e.target)) this.activateShield(); }; document.addEventListener('pointerdown', this.outside);
    }

    activateShield(){this.shield?.classList.remove('hidden');this.active=false;}
    activate(){this.shield?.classList.add('hidden');this.active=true;this.canvasWrap.focus?.();}

    buildNav(){
      this.nav=document.createElement('div');this.nav.className='cadx-nav';
      const mk=(cls,html,label)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.innerHTML=html;b.title=label;b.setAttribute('aria-label',label);return b;};
      this.nav.append(
        mk('cadx-arrow cadx-left','‹','Rotate cube left'), mk('cadx-arrow cadx-right','›','Rotate cube right'),
        mk('cadx-arrow cadx-up','⌃','Rotate cube up'), mk('cadx-arrow cadx-down','⌄','Rotate cube down'),
        mk('cadx-roll cadx-roll-left','↺','Roll counter-clockwise'), mk('cadx-roll cadx-roll-right','↻','Roll clockwise')
      ); this.root.appendChild(this.nav);
      this.nav.querySelector('.cadx-left').onclick=e=>{e.stopPropagation();this.rotateCube(0,Math.PI/8);};
      this.nav.querySelector('.cadx-right').onclick=e=>{e.stopPropagation();this.rotateCube(0,-Math.PI/8);};
      this.nav.querySelector('.cadx-up').onclick=e=>{e.stopPropagation();this.rotateCube(Math.PI/8,0);};
      this.nav.querySelector('.cadx-down').onclick=e=>{e.stopPropagation();this.rotateCube(-Math.PI/8,0);};
      this.nav.querySelector('.cadx-roll-left').onclick=e=>{e.stopPropagation();this.roll(-Math.PI/4);};
      this.nav.querySelector('.cadx-roll-right').onclick=e=>{e.stopPropagation();this.roll(Math.PI/4);};
    }

    buildCube(){
      this.cubeWrap=document.createElement('div');this.cubeWrap.className='cadx-cube';this.nav.appendChild(this.cubeWrap);
      this.cubeRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true});this.cubeRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.cubeRenderer.setSize(118,118,false);this.cubeWrap.appendChild(this.cubeRenderer.domElement);
      this.cubeScene=new THREE.Scene();this.cubeCamera=new THREE.OrthographicCamera(-1.75,1.75,1.75,-1.75,.1,20);this.cubeCamera.position.set(0,0,5);
      this.cubeRoot=new THREE.Group();this.cubeScene.add(this.cubeRoot);this.cubeScene.add(new THREE.AmbientLight(0xffffff,1.5));
      const mats=['FRONT','BACK','TOP','BOTTOM','RIGHT','LEFT'].map(()=>new THREE.MeshLambertMaterial({color:0xe5e6e4,transparent:false}));
      const cube=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),mats);this.cubeRoot.add(cube);
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry),new THREE.LineBasicMaterial({color:0x383a3c,linewidth:1}));this.cubeRoot.add(edges);
      const cornerGeo=new THREE.SphereGeometry(.075,10,10);for(let x of [-1,1])for(let y of [-1,1])for(let z of [-1,1]){const s=new THREE.Mesh(cornerGeo,new THREE.MeshBasicMaterial({color:0x55585b}));s.position.set(x,y,z);this.cubeRoot.add(s);}
      const edgeGeo=new THREE.BoxGeometry(.055,.055,2.04);for(let x of [-1,1])for(let y of [-1,1]){const e=new THREE.Mesh(edgeGeo,new THREE.MeshBasicMaterial({color:0x4b4e51}));e.position.set(x,y,0);this.cubeRoot.add(e);}for(let x of [-1,1])for(let z of [-1,1]){const e=new THREE.Mesh(edgeGeo,new THREE.MeshBasicMaterial({color:0x4b4e51}));e.rotation.z=Math.PI/2;e.position.set(x,0,z);this.cubeRoot.add(e);}for(let y of [-1,1])for(let z of [-1,1]){const e=new THREE.Mesh(edgeGeo,new THREE.MeshBasicMaterial({color:0x4b4e51}));e.rotation.y=Math.PI/2;e.position.set(0,y,z);this.cubeRoot.add(e);}
      const labels=[['FRONT',new THREE.Vector3(0,0,1.03)],['BACK',new THREE.Vector3(0,0,-1.03)],['TOP',new THREE.Vector3(0,1.03,0)],['BOTTOM',new THREE.Vector3(0,-1.03,0)],['RIGHT',new THREE.Vector3(1.03,0,0)],['LEFT',new THREE.Vector3(-1.03,0,0)]];
      labels.forEach(([t,p])=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(t),transparent:true,depthTest:false}));sp.position.copy(p);sp.scale.set(.82,.31,1);this.cubeRoot.add(sp);});
      const hitMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});this.cubeHits=[];
      const addHit=(kind,dir,pos,size)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),hitMat);m.position.copy(pos);m.userData={kind,localDir:dir.clone().normalize()};this.cubeRoot.add(m);this.cubeHits.push(m);};
      addHit('face',new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,1.01),new THREE.Vector3(1.5,1.5,.08));addHit('face',new THREE.Vector3(0,0,-1),new THREE.Vector3(0,0,-1.01),new THREE.Vector3(1.5,1.5,.08));addHit('face',new THREE.Vector3(0,1,0),new THREE.Vector3(0,1.01,0),new THREE.Vector3(1.5,.08,1.5));addHit('face',new THREE.Vector3(0,-1,0),new THREE.Vector3(0,-1.01,0),new THREE.Vector3(1.5,.08,1.5));addHit('face',new THREE.Vector3(1,0,0),new THREE.Vector3(1.01,0,0),new THREE.Vector3(.08,1.5,1.5));addHit('face',new THREE.Vector3(-1,0,0),new THREE.Vector3(-1.01,0,0),new THREE.Vector3(.08,1.5,1.5));
      const edge=.18;for(let y of [-1,1])for(let z of [-1,1])addHit('edge',new THREE.Vector3(0,y,z),new THREE.Vector3(0,y*.91,z*.91),new THREE.Vector3(1.7,edge,edge));for(let x of [-1,1])for(let z of [-1,1])addHit('edge',new THREE.Vector3(x,0,z),new THREE.Vector3(x*.91,0,z*.91),new THREE.Vector3(edge,1.7,edge));for(let x of [-1,1])for(let y of [-1,1])addHit('edge',new THREE.Vector3(x,y,0),new THREE.Vector3(x*.91,y*.91,0),new THREE.Vector3(edge,edge,1.7));for(let x of [-1,1])for(let y of [-1,1])for(let z of [-1,1])addHit('corner',new THREE.Vector3(x,y,z),new THREE.Vector3(x*.91,y*.91,z*.91),new THREE.Vector3(.34,.34,.34));
      this.cubeRay=new THREE.Raycaster();this.cubePointer=new THREE.Vector2();this.cubeRenderer.domElement.addEventListener('click',e=>this.pickCube(e));
    }

    pickCube(e){
      const r=this.cubeRenderer.domElement.getBoundingClientRect();this.cubePointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);this.cubeRay.setFromCamera(this.cubePointer,this.cubeCamera);const hit=this.cubeRay.intersectObjects(this.cubeHits,false)[0];if(!hit)return;const worldDir=hit.object.userData.localDir.clone().applyQuaternion(this.cubeRoot.quaternion).normalize();this.viewDirection(worldDir);this.active=true;
    }

    viewDirection(direction){
      const d=direction.clone().normalize(),up=this.upright(d),distance=this.distance;this.tweenCamera(this.center.clone().add(d.multiplyScalar(distance)),this.center.clone(),up);
    }

    upright(dir){let up=new THREE.Vector3(0,1,0);if(Math.abs(dir.dot(up))>.94)up.set(0,0,-1);up.sub(dir.clone().multiplyScalar(up.dot(dir))).normalize();return up;}

    tweenCamera(pos,target,up){
      if(this.anim)cancelAnimationFrame(this.anim);const a=this.camera.position.clone(),b=this.controls.target.clone(),u=this.camera.up.clone(),start=performance.now(),duration=reducedMotion()?1:500;this.controls.enabled=false;
      const tick=now=>{const p=Math.min(1,(now-start)/duration),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;this.camera.position.lerpVectors(a,pos,e);this.controls.target.lerpVectors(b,target,e);this.camera.up.lerpVectors(u,up,e).normalize();this.camera.lookAt(this.controls.target);this.controls.update();if(p<1)this.anim=requestAnimationFrame(tick);else{this.camera.position.copy(pos);this.controls.target.copy(target);this.camera.up.copy(up);this.camera.lookAt(target);this.controls.enabled=true;this.controls.update();this.anim=null;this.syncCube();}};this.anim=requestAnimationFrame(tick);
    }

    rotateCube(pitch,yaw){
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'XYZ'));const dest=this.cubeRoot.quaternion.clone().multiply(q);this.cubeQuaternion.copy(dest);const dir=new THREE.Vector3(0,0,1).applyQuaternion(dest).normalize();const up=new THREE.Vector3(0,1,0).applyQuaternion(dest).normalize();this.tweenCamera(this.center.clone().add(dir.multiplyScalar(this.distance)),this.center.clone(),up);
    }

    roll(angle){const axis=this.camera.getWorldDirection(new THREE.Vector3()).normalize();const up=this.camera.up.clone().applyAxisAngle(axis,angle).normalize();this.tweenCamera(this.camera.position.clone(),this.controls.target.clone(),up);}

    home(){this.fit(true);}

    fit(animated){
      if(!this.radius)return;const dir=new THREE.Vector3(1,1,1).normalize(),distance=this.radius/Math.sin(THREE.MathUtils.degToRad(this.camera.fov*.5))*1.18;this.distance=Math.max(distance,this.radius*1.8);this.controls.minDistance=Math.max(this.radius*.12,.01);this.controls.maxDistance=Math.max(this.radius*30,10);this.camera.near=Math.max(this.radius*.0005,.001);this.camera.far=Math.max(this.radius*1000,100);this.camera.updateProjectionMatrix();const pos=this.center.clone().add(dir.multiplyScalar(this.distance));if(animated)this.tweenCamera(pos,this.center.clone(),this.upright(dir));else{this.camera.position.copy(pos);this.controls.target.copy(this.center);this.controls.update();}this.syncCube();
    }

    syncCube(){this.cubeRoot.quaternion.copy(this.camera.quaternion).invert();this.cubeQuaternion.copy(this.cubeRoot.quaternion);}

    async loadAll(){
      Object.values(this.models).forEach(m=>dispose(m.root));this.models={};this.modelRoot.clear();this.setStatus('Loading CAD…',true);this.progress.classList.add('show');
      const loader=new THREE.GLTFLoader();const entries=[['assembly','Full Assembly'],['cover','Cover Body'],['lower','Lower Body']];let done=0;
      await Promise.all(entries.map(([key,label])=>new Promise(resolve=>loader.load(MODEL_URLS[key],g=>{const root=g.scene;root.visible=key==='assembly';this.models[key]={root,label,visible:root.visible};this.modelRoot.add(root);done++;this.progress.querySelector('i').style.width=(done/entries.length*100)+'%';resolve();},xhr=>{if(xhr.total)this.progress.querySelector('i').style.width=Math.max(done/entries.length*100,xhr.loaded/xhr.total*100/entries.length)+'%';},()=>{done++;resolve();}))));
      this.recenter();this.renderLayers();this.progress.classList.remove('show');this.setStatus('');
    }

    recenter(){
      this.modelRoot.position.set(0,0,0);
      const box=new THREE.Box3(),tmp=new THREE.Box3();let any=false;Object.values(this.models).forEach(m=>{if(m.root.visible){tmp.setFromObject(m.root);if(!tmp.isEmpty()){box.union(tmp);any=true;}}});if(!any)return;box.getCenter(this.center);const size=box.getSize(new THREE.Vector3());this.radius=Math.max(size.x,size.y,size.z)*.5;this.modelRoot.position.sub(this.center);this.center.set(0,0,0);this.fit(false);
    }

    renderLayers(){if(!this.layerList)return;this.layerList.innerHTML='';const keys=Object.keys(this.models);if(!keys.length){this.layerList.innerHTML='<div class="cadx-empty">Waiting for model data…</div>';return;}keys.forEach(k=>{const m=this.models[k],label=document.createElement('label');label.className='cadx-layer';const cb=document.createElement('input');cb.type='checkbox';cb.checked=m.root.visible;cb.onchange=()=>{m.root.visible=cb.checked;m.visible=cb.checked;this.recenter();};label.append(cb,document.createTextNode(m.label));this.layerList.appendChild(label);});}

    setStatus(text,show){this.status.textContent=text||'';this.status.classList.toggle('show',!!show&&!!text);}

    async toggleFullscreen(){try{if(document.fullscreenElement===this.root){await document.exitFullscreen();}else if(this.root.requestFullscreen){await this.root.requestFullscreen({navigationUI:'hide');}else{this.root.classList.toggle('viewer-force-fullscreen');}}catch(_){this.root.classList.toggle('viewer-force-fullscreen');}this.updateFullscreenIcon();}
    updateFullscreenIcon(){const active=document.fullscreenElement===this.root;this.fullBtn.innerHTML=active?ICON.shrink:ICON.expand;this.fullBtn.title=active?'Exit fullscreen':'Fullscreen';this.fullBtn.setAttribute('aria-label',this.fullBtn.title);setTimeout(()=>this.resize(),60);}

    resize(){if(!this.renderer||this.destroyed)return;const w=Math.max(1,this.container.clientWidth),h=Math.max(1,this.container.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.cubeRenderer?.setSize(118,118,false);}

    loop(){if(this.destroyed)return;if(!this.container.isConnected){this.destroy();return;}requestAnimationFrame(()=>this.loop());if(this.active){this.controls.update();this.renderer.render(this.scene,this.camera);}this.syncCube();this.cubeRenderer.render(this.cubeScene,this.cubeCamera);}

    destroy(){this.destroyed=true;this.resizeObserver?.disconnect();window.removeEventListener('resize',this.onResize);if(this.outside)document.removeEventListener('pointerdown',this.outside);Object.values(this.models).forEach(m=>dispose(m.root));this.renderer?.dispose();this.cubeRenderer?.dispose();this.anim&&cancelAnimationFrame(this.anim);this.root?.remove();}
  }

  function findContainer(){return document.getElementById('stlViewerContainer');}
  function boot(){const c=findContainer();if(!c||INSTANCES.has(c))return;if(c.clientWidth===0||c.clientHeight===0){setTimeout(boot,150);return;}INSTANCES.set(c,new CadViewer(c));}
  const observer=new MutationObserver(()=>boot());observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
