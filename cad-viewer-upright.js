/* Final ViewCube roll correction: preserve face/edge/corner direction but restore an upright screen orientation. */
(function(){
  'use strict';
  const seen=new WeakSet();
  function controls(c){return c.__cadControls||window.__lastCadControls||null;}
  function camera(c){return c.__cadCamera||window.__lastCadCamera||null;}
  function cube(c){return c.querySelector('.cad-native-cube-anchor,.view-cube,.viewcube,.viewCube,[class*="viewcube"],[class*="view-cube"],[id*="viewcube"],[id*="viewCube"],[id*="view-cube"]');}
  function upright(c){
    const ctl=controls(c),cam=camera(c); if(!ctl||!cam||!window.THREE)return;
    const target=ctl.target.clone();
    const direction=target.clone().sub(cam.position).normalize();
    let worldUp=new THREE.Vector3(0,1,0);
    if(Math.abs(direction.dot(worldUp))>.985) worldUp.set(0,0,-1);
    worldUp.sub(direction.clone().multiplyScalar(worldUp.dot(direction))).normalize();
    cam.up.copy(worldUp); cam.lookAt(target); ctl.update?.();
  }
  function attach(c){
    if(seen.has(c))return; seen.add(c);
    c.addEventListener('pointerup',e=>{
      const q=cube(c); if(q&&q.contains(e.target)) setTimeout(()=>upright(c),90);
    },true);
  }
  function tick(){document.querySelectorAll('[id$="ViewerContainer"]').forEach(attach);requestAnimationFrame(tick);}
  tick();
})();
