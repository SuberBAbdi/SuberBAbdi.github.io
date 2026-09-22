/* Fusion-style CAD navigation fixes for Suber Abdi portfolio.
 * Loaded after index.html so it can safely override the legacy r128 viewer
 * without requiring a risky rewrite of the 300kB page shell.
 */
(function () {
  'use strict';

  const TRACKBALL_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TrackballControls.js';
  let readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });

  function loadTrackball() {
    if (window.THREE && THREE.TrackballControls) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TRACKBALL_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animateCamera(camera, controls, destination, target, duration) {
    const start = camera.position.clone();
    const startTarget = controls && controls.target ? controls.target.clone() : target.clone();
    const started = performance.now();
    if (controls) controls.enabled = false;
    function tick(now) {
      const p = Math.min(1, (now - started) / duration);
      const t = ease(p);
      camera.position.lerpVectors(start, destination, t);
      camera.lookAt(startTarget.clone().lerp(target, t));
      if (controls && controls.target) {
        controls.target.copy(startTarget.clone().lerp(target, t));
        if (controls.update) controls.update();
      }
      if (p < 1) requestAnimationFrame(tick);
      else {
        camera.position.copy(destination);
        camera.lookAt(target);
        if (controls) {
          controls.target.copy(target);
          controls.enabled = true;
          if (controls.update) controls.update();
        }
      }
    }
    requestAnimationFrame(tick);
  }

  function addRotationArrows(cubeWrap, camera, controls) {
    if (cubeWrap.querySelector('.cad-rotate-arrows')) return;
    const root = document.createElement('div');
    root.className = 'cad-rotate-arrows';
    root.style.cssText = 'position:absolute;inset:-28px;pointer-events:none;z-index:5;';
    root.innerHTML = `
      <button class="cad-arrow cad-arrow-left" aria-label="Rotate view left" title="Rotate left">
        <svg viewBox="0 0 48 28" aria-hidden="true"><path d="M43 5 C31 2 18 3 9 10 C6 12 4 15 4 18"/><path d="M4 18 L9 12 M4 18 L11 19"/></svg>
      </button>
      <button class="cad-arrow cad-arrow-right" aria-label="Rotate view right" title="Rotate right">
        <svg viewBox="0 0 48 28" aria-hidden="true"><path d="M5 5 C17 2 30 3 39 10 C42 12 44 15 44 18"/><path d="M44 18 L37 12 M44 18 L37 19"/></svg>
      </button>
      <button class="cad-arrow cad-arrow-up" aria-label="Rotate view up" title="Rotate up">
        <svg viewBox="0 0 28 48" aria-hidden="true"><path d="M5 43 C2 31 3 18 10 9 C12 6 15 4 18 4"/><path d="M18 4 L12 11 M18 4 L19 11"/></svg>
      </button>
      <button class="cad-arrow cad-arrow-down" aria-label="Rotate view down" title="Rotate down">
        <svg viewBox="0 0 28 48" aria-hidden="true"><path d="M5 5 C2 17 3 30 10 39 C12 42 15 44 18 44"/><path d="M18 44 L12 37 M18 44 L19 37"/></svg>
      </button>`;

    const style = document.createElement('style');
    style.textContent = `
      .cad-arrow{position:absolute;width:30px;height:24px;border:0;background:transparent;padding:0;pointer-events:auto;cursor:pointer;opacity:.82;filter:drop-shadow(0 1px 1px rgba(0,0,0,.22));}
      .cad-arrow svg{width:100%;height:100%;overflow:visible;}
      .cad-arrow path{fill:none;stroke:#b7b7b5;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}
      .cad-arrow:hover path{stroke:#555553;}
      .cad-arrow-left{left:-10px;top:50%;transform:translate(-100%,-50%);}
      .cad-arrow-right{right:-10px;top:50%;transform:translate(100%,-50%);}
      .cad-arrow-up{left:50%;top:-10px;transform:translate(-50%,-100%);}
      .cad-arrow-down{left:50%;bottom:-10px;transform:translate(-50%,100%);}
      .cad-arrow:focus-visible{outline:2px solid #3b82f6;outline-offset:2px;}
    `;
    cubeWrap.appendChild(style);
    cubeWrap.appendChild(root);

    function rotateAroundScreenAxis(axis, angle) {
      const target = controls && controls.target ? controls.target.clone() : (camera.userData.modelCenter || new THREE.Vector3());
      const offset = camera.position.clone().sub(target);
      if (axis === 'horizontal') {
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      } else {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
        offset.applyAxisAngle(right, angle);
      }
      animateCamera(camera, controls, target.clone().add(offset), target, 420);
    }

    root.querySelector('.cad-arrow-left').onclick = e => { e.stopPropagation(); rotateAroundScreenAxis('horizontal', Math.PI / 2); };
    root.querySelector('.cad-arrow-right').onclick = e => { e.stopPropagation(); rotateAroundScreenAxis('horizontal', -Math.PI / 2); };
    root.querySelector('.cad-arrow-up').onclick = e => { e.stopPropagation(); rotateAroundScreenAxis('vertical', Math.PI / 2); };
    root.querySelector('.cad-arrow-down').onclick = e => { e.stopPropagation(); rotateAroundScreenAxis('vertical', -Math.PI / 2); };
  }

  function installViewCubeOverride() {
    if (!window.THREE || !window.initViewCube || window.__cadViewCubeFixed) return;
    const original = window.initViewCube;
    window.initViewCube = function (camera, controls, container) {
      const render = original(camera, controls, container);
      const cubeWrap = container.querySelector('div[style*="width: 104px"]') || container.lastElementChild;
      if (cubeWrap) addRotationArrows(cubeWrap, camera, controls);
      return render;
    };
    window.__cadViewCubeFixed = true;
  }

  function installControlsOverride() {
    if (!window.THREE || !THREE.TrackballControls || window.__cadControlsFixed) return;
    THREE.OrbitControls = THREE.TrackballControls;
    window.__cadControlsFixed = true;
  }

  function wrapViewer(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__cadWrapped) return;
    function wrapped() {
      const args = arguments;
      return ready.then(() => original.apply(this, args));
    }
    wrapped.__cadWrapped = true;
    window[name] = wrapped;
  }

  loadTrackball().then(() => {
    installControlsOverride();
    installViewCubeOverride();
    readyResolve();
  }).catch(err => {
    console.warn('CAD navigation enhancement could not load TrackballControls:', err);
    installViewCubeOverride();
    readyResolve();
  });

  wrapViewer('initGLBViewer');
  wrapViewer('init3DViewer');

  document.addEventListener('fullscreenchange', () => {
    setTimeout(() => {
      document.querySelectorAll('[id$="ViewerContainer"]').forEach(el => {
        const inst = window.viewer3DInstances && window.viewer3DInstances[el.id];
        if (inst && inst.resize) inst.resize();
      });
    }, 80);
  });
})();
